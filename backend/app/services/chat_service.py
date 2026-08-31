import asyncio
import json
import traceback
from urllib.parse import quote

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.database import SessionLocal
from app.repositories import conversation_repository

from app.llm.factory import get_fast_llm
from app.llm.schemas import Message

from app.intent.service import IntentService
from app.intent.schemas import Intent

from app.agents.planner import NexusPlanner
from app.agents.executor import NexusExecutor

from .title_service import generate_conversation_title


intent_service = IntentService()
nexus_planner = NexusPlanner()
nexus_executor = NexusExecutor()


def build_messages(history: list) -> list[Message]:
    """Chuyển lịch sử DB sang format trung gian."""
    return [
        Message(
            role="user" if msg.role == "user" else "assistant",
            content=msg.content,
        )
        for msg in history
    ]


async def chat(
    user_id: str,
    message: str,
    conversation_id: int | None = None,
) -> StreamingResponse:

    db = SessionLocal()

    try:
        print(
            f"[DEBUG] user_id={user_id}, "
            f"conversation_id={conversation_id}"
        )

        # ==========================================================
        # 1. INTENT CLASSIFICATION
        # ==========================================================

        print("[DEBUG] Classifying intent...")

        intent_result = await intent_service.classify(message)

        print(
            f"[DEBUG] intent={intent_result.intent} "
            f"confidence={intent_result.confidence} "
            f"complexity={intent_result.complexity}"
        )

        # ==========================================================
        # 2. ROUTING
        # ==========================================================

        execution_plan = None

        if intent_result.intent == Intent.CHAT:

            print("[DEBUG] Intent CHAT -> Gemini Fast")

            response_llm = get_fast_llm()

        elif intent_result.intent == Intent.CODE:

            print("[DEBUG] Intent CODE -> Nexus Planner")

            execution_plan = await nexus_planner.plan(
                message=message,
                intent=intent_result.intent.value,
            )

            print(
                f"[DEBUG] strategy={execution_plan.strategy}"
            )

            for agent in execution_plan.agents:
                print(
                    f"[DEBUG] agent={agent.role} "
                    f"model={agent.model} "
                    f"temperature={agent.temperature} "
                    f"thinking={agent.thinking_level}"
                )

            # CODE sẽ được xử lý bởi NexusExecutor
            response_llm = None

        else:

            raise ValueError(
                f"Intent chưa được hỗ trợ: "
                f"{intent_result.intent}"
            )

        # ==========================================================
        # 3. CREATE / GET CONVERSATION
        # ==========================================================

        title_task = None

        if conversation_id is None:

            print("[DEBUG] Tạo conversation mới...")

            # Title luôn dùng fast LLM.
            # Không phụ thuộc intent hoặc execution plan.
            title_llm = get_fast_llm()

            title_task = asyncio.create_task(
                generate_conversation_title(
                    title_llm,
                    message,
                )
            )

            new_title = "New Chat"

            conversation = (
                conversation_repository.create_conversation(
                    db,
                    user_id,
                    title=new_title,
                )
            )

            conversation_id = conversation.id
            conversation_title = conversation.title

            print(
                f"[DEBUG] conversation_id mới = "
                f"{conversation_id}"
            )

        else:

            conv = conversation_repository.get_conversation(
                db,
                conversation_id,
            )

            conversation_title = (
                conv.title if conv else ""
            )

        # ==========================================================
        # 4. SAVE USER MESSAGE
        # ==========================================================

        print("[DEBUG] Lưu user message...")

        conversation_repository.save_message(
            db,
            conversation_id=conversation_id,
            role="user",
            content=message,
        )

        # ==========================================================
        # 5. BUILD HISTORY
        # ==========================================================
        print("[DEBUG] build history...")
        history = conversation_repository.get_messages(
            db,
            conversation_id,
        )

        messages = build_messages(history)
        print("[DEBUG] Done building history...")

        # ==========================================================
        # 6. STREAM RESPONSE
        # ==========================================================

        async def streaming_with_save():

            print("[DEBUG] Bắt đầu stream response...")

            try:

                chunks = []

                # --------------------------------------------------
                # CHAT
                # --------------------------------------------------

                if intent_result.intent == Intent.CHAT:

                    print(
                        "[DEBUG] Streaming trực tiếp từ Gemini Fast..."
                    )

                    async for text in response_llm.stream(
                        messages
                    ):
                        chunks.append(text)

                        yield (
                            json.dumps(
                                {
                                    "type": "chunk",
                                    "content": text,
                                },
                                ensure_ascii=False,
                            )
                            + "\n"
                        )

                # --------------------------------------------------
                # CODE
                # --------------------------------------------------

                elif intent_result.intent == Intent.CODE:

                    print(
                        "[DEBUG] Streaming qua Nexus Executor..."
                    )

                    async for text in nexus_executor.stream(
                        plan=execution_plan,
                        messages=messages,
                    ):
                        chunks.append(text)

                        yield (
                            json.dumps(
                                {
                                    "type": "chunk",
                                    "content": text,
                                },
                                ensure_ascii=False,
                            )
                            + "\n"
                        )

                # --------------------------------------------------
                # SAVE ASSISTANT RESPONSE
                # --------------------------------------------------

                full_text = "".join(chunks)

                conversation_repository.save_message(
                    db,
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_text,
                )

                # --------------------------------------------------
                # DONE
                # --------------------------------------------------

                yield (
                    json.dumps(
                        {
                            "type": "done",
                            "conversationId": conversation_id,
                            "title": conversation_title,
                            "intent": intent_result.intent,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )

            except Exception as e:

                traceback.print_exc()

                yield (
                    json.dumps(
                        {
                            "type": "error",
                            "message": str(e),
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )

            finally:

                db.close()

        # ==========================================================
        # 7. BACKGROUND TITLE
        # ==========================================================

        async def update_title_background():

            if title_task is None:
                return

            title = await title_task

            update_db = SessionLocal()

            try:

                conversation_repository.update_conversation_title(
                    update_db,
                    conversation_id,
                    title,
                )

            finally:

                update_db.close()

        if title_task:

            asyncio.create_task(
                update_title_background()
            )

        # ==========================================================
        # 8. RESPONSE
        # ==========================================================

        response = StreamingResponse(
            streaming_with_save(),
            media_type="application/x-ndjson",
        )

        response.headers["X-Conversation-Id"] = str(
            conversation_id
        )

        response.headers["X-Conversation-Title"] = quote(
            conversation_title or ""
        )

        response.headers["X-Intent"] = (
            intent_result.intent.value
        )

        response.headers[
            "Access-Control-Expose-Headers"
        ] = (
            "X-Conversation-Id, "
            "X-Conversation-Title, "
            "X-Intent"
        )

        return response

    except Exception as e:

        db.close()

        traceback.print_exc()

        print(
            f"[ERROR] {type(e).__name__}: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )