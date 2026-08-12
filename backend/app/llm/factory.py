import os
from functools import lru_cache

from .base import BaseLLM
from .gemini import GeminiLLM


@lru_cache
def get_llm() -> BaseLLM:
    """Trả về instance LLM theo LLM_PROVIDER trong env (mặc định: gemini).
    Dùng lru_cache để tái sử dụng client thay vì tạo mới mỗi request.
    """
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()

    if provider == "gemini":
        return GeminiLLM()
    if provider == "ollama":
        from .ollama import QwenLLM
        return QwenLLM()
    # Khi có Qwen, chỉ cần thêm 1 nhánh ở đây, không sửa gì ở ChatService:
    # if provider == "qwen":
    #     from .qwen import QwenLLM
    #     return QwenLLM()

    raise ValueError(f"LLM_PROVIDER không được hỗ trợ: '{provider}'")