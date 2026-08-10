import os
import traceback
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from google.genai import errors

from app.config import settings
from app.database import SessionLocal
from app.repositories import conversation_repository
from urllib.parse import quote, unquote

if not settings.GEMINI_API_KEY:
    raise ValueError("LỖI: Chưa có GEMINI_API_KEY. Vui lòng kiểm tra lại file .env")

os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

client = genai.Client()

async def stream_generator(primary_model: str, fallback_model: str, contents, config=None):
    FLUSH_CHARS = {".", "!", "?", "\n"}  # flush khi gặp dấu kết câu
    BUFFER_SIZE = 80                      # hoặc flush khi buffer đủ lớn

    try:
        response_stream = client.models.generate_content_stream(
            model=primary_model,
            contents=contents,
            config=config
        )
        buffer = ""
        for chunk in response_stream:
            if chunk.text:
                buffer += chunk.text
                # Flush khi gặp dấu kết câu hoặc buffer đủ lớn
                if any(c in buffer for c in FLUSH_CHARS) or len(buffer) >= BUFFER_SIZE:
                    yield buffer
                    buffer = ""

        if buffer:  # flush phần còn lại
            yield buffer

    except errors.ServerError as e:
        if e.code == 503:
            print(f"[WARNING] Model '{primary_model}' đang quá tải (503).")
            print(f"[WARNING] Tự động chuyển sang model dự phòng: '{fallback_model}'...")
            response_stream = client.models.generate_content_stream(
                model=fallback_model,
                contents=contents,
                config=config
            )
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        else:
            raise


async def collect_full_response(primary_model: str, fallback_model: str, contents, config=None) -> str:
    chunks = []
    async for text in stream_generator(primary_model, fallback_model, contents, config):
        chunks.append(text)
    return "".join(chunks)


def build_gemini_contents(history: list) -> list:
    """Chuyển đổi lịch sử từ DB sang định dạng Gemini Content."""
    contents = []
    for msg in history:
        role = "user" if msg.role == "user" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part(text=msg.content)]
            )
        )
    return contents


async def chat(user_id: str, message: str, conversation_id: int | None = None) -> StreamingResponse:
    db = SessionLocal()
    try:
        print(f"[DEBUG] user_id={user_id}, conversation_id={conversation_id}")

        if conversation_id is None:
            print("[DEBUG] Tạo conversation mới...")
            new_title = set_title_from_message(message)
            conversation = conversation_repository.create_conversation(db, user_id, title=new_title)
            conversation_id = conversation.id
            conversation_title = conversation.title
            print(f"[DEBUG] conversation_id mới = {conversation_id}")
        else:
            conv = conversation_repository.get_conversation(db, conversation_id)
            conversation_title = conv.title if conv else ""

        print("[DEBUG] Lưu user message...")
        conversation_repository.save_message(db, conversation_id=conversation_id, role="user", content=message)

        history = conversation_repository.get_messages(db, conversation_id)
        contents = build_gemini_contents(history)

        async def streaming_with_save():
            try:
                chunks = []
                async for text in stream_generator(
                    primary_model='gemini-2.5-flash',
                    fallback_model='gemini-2.5-flash-lite',
                    contents=contents
                ):
                    chunks.append(text)
                    yield text

                full_text = "".join(chunks)
                conversation_repository.save_message(
                    db,
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_text
                )
            finally:
                db.close()

        response = StreamingResponse(streaming_with_save(), media_type="text/plain")
        response.headers["X-Conversation-Id"] = str(conversation_id)
        response.headers["X-Conversation-Title"] = quote(conversation_title or "")
        response.headers["Access-Control-Expose-Headers"] = "X-Conversation-Id, X-Conversation-Title"
        return response

    except Exception as e:
        db.close()
        traceback.print_exc()
        print(f"[ERROR] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def set_title_from_message(message: str) -> str:
    set_title_prompt = (
        "Dựa trên nội dung tin nhắn sau, hãy tạo một tiêu đề ngắn gọn "
        "(tốt nhất là khoảng 5 - 6 từ, tối đa 10 từ) phù hợp để đặt tên "
        "cho cuộc trò chuyện này, không viết các kí tự đặc biệt nếu không cần thiết\n\n"
    )

    config = types.GenerateContentConfig(
        system_instruction=set_title_prompt,
        temperature=0.5
    )

    # Thử primary model trước
    for model in ['gemini-2.5-flash-lite', 'gemini-2.5-flash']:
        try:
            print(f"[DEBUG] Gọi {model} tạo tiêu đề...")
            response = client.models.generate_content(
                model=model,
                contents=message,
                config=config
            )
            return response.text.strip()

        except errors.ServerError as e:
            if e.code == 503:
                print(f"[WARNING] {model} quá tải (503), thử model tiếp theo...")
                continue  # thử model kế tiếp trong list
            raise  # lỗi khác thì throw luôn

    # Cả 2 model đều 503 → dùng luôn tin nhắn đầu làm tiêu đề
    print("[WARNING] Tất cả model đều quá tải, dùng message làm tiêu đề.")
    return message[:50].strip()