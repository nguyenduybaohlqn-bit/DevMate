from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Optional
from typing import TypeVar, Type

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

from app.llm.schemas import LLMConfig, Message


class BaseLLM(ABC):
    """Interface chung mà mọi provider (Gemini, Qwen, ...) phải implement.
    ChatService chỉ biết đến interface này, không biết provider cụ thể là gì.
    """

    @abstractmethod
    def stream(
        self, messages: List[Message], config: Optional[LLMConfig] = None
    ) -> AsyncGenerator[str, None]:
        """Stream từng đoạn text trả lời."""
        raise NotImplementedError

    @abstractmethod
    async def generate(
        self, messages: List[Message], config: Optional[LLMConfig] = None
    ) -> str:
        """Trả lời đầy đủ (không stream)."""
        raise NotImplementedError

    @abstractmethod
    async def generate_title(self, message: str) -> str:
        """Sinh tiêu đề ngắn gọn cho một conversation dựa trên tin nhắn đầu tiên."""
        raise NotImplementedError

    async def generate_structured(
        self,
        messages: list[Message],
        schema: Type[T],
        config: LLMConfig | None = None,
    ) -> T:
        raise NotImplementedError