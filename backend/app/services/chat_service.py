import asyncio
import json
import traceback
import time
from urllib.parse import quote

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.database import SessionLocal
from app.repositories import conversation_repository

from app.llm.factory import get_llm
from app.llm.schemas import Message
from .title_service import generate_conversation_title


def build_messages(history: list) -> list[Message]:
    """Chuyển lịch sử từ DB sang format trung gian, không phụ thuộc SDK của provider nào."""
    return [
        Message(role="user" if msg.role == "user" else "assistant", content=msg.content)
        for msg in history
    ]


async def chat(user_id: str, message: str, conversation_id: int | None = None) -> StreamingResponse:
    db = SessionLocal()
    llm = get_llm()
    try:
        print(f"[DEBUG] user_id={user_id}, conversation_id={conversation_id}")
        title_task = None
        if conversation_id is None:
            print("[DEBUG] Tạo conversation mới...")
            title_task = asyncio.create_task(generate_conversation_title(llm, message))
            new_title = "New Chat"
            conversation = conversation_repository.create_conversation(db, user_id, title=new_title)
            conversation_id = conversation.id
            conversation_title = conversation.title
            print(f"[DEBUG] conversation_id mới = {conversation_id}")
        else:
            conv = conversation_repository.get_conversation(db, conversation_id)
            conversation_title = conv.title if conv else ""

        print("[DEBUG] Lưu user message...")
        conversation_repository.save_message(
            db, conversation_id=conversation_id, role="user", content=message
        )

        history = conversation_repository.get_messages(db, conversation_id)
        messages = build_messages(history)

        async def streaming_with_save():
            print("[DEBUG] Bắt đầu stream response từ LLM...")
            try:
                chunks = []
                async for text in llm.stream(messages):
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
                full_text = "".join(chunks)
                conversation_repository.save_message(
                    db,
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_text,
                )
                yield (json.dumps(
                        {
                            "type": "done",
                            "conversationId": conversation_id,
                            "title": conversation_title,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
            except Exception as e:
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
        async def update_title_background():
          title = await title_task
          conversation_repository.update_conversation_title(db, conversation_id, title)
        if title_task:
          asyncio.create_task(update_title_background())
        response = StreamingResponse(streaming_with_save(), media_type="application/x-ndjson")
        response.headers["X-Conversation-Id"] = str(conversation_id)
        response.headers["X-Conversation-Title"] = quote(conversation_title or "")
        response.headers["Access-Control-Expose-Headers"] = "X-Conversation-Id, X-Conversation-Title"
        return response
    except Exception as e:
        db.close()
        traceback.print_exc()
        print(f"[ERROR] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))