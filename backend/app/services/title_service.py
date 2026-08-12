from app.llm.base import BaseLLM


async def generate_conversation_title(llm: BaseLLM, message: str) -> str:
    """Đặt tên cho conversation dựa trên tin nhắn đầu tiên của người dùng."""
    return await llm.generate_title(message)