from logging import config
import os
from typing import AsyncGenerator, List, Optional, Type, TypeVar

from google import genai
from google.genai import errors, types
from pydantic import BaseModel

from app.config import settings

from .base import BaseLLM
from .schemas import LLMConfig, Message


T = TypeVar("T", bound=BaseModel)


class StreamBuffer:
    """Gom text lại theo câu hoặc kích thước để tránh yield quá nhỏ."""

    FLUSH_CHARS = {".", "!", "?", "\n"}
    BUFFER_SIZE = 80

    def __init__(self):
        self._buffer = ""

    def push(self, text: str) -> Optional[str]:
        self._buffer += text

        if (
            any(c in self._buffer for c in self.FLUSH_CHARS)
            or len(self._buffer) >= self.BUFFER_SIZE
        ):
            out = self._buffer
            self._buffer = ""
            return out

        return None

    def flush(self) -> Optional[str]:
        if self._buffer:
            out = self._buffer
            self._buffer = ""
            return out

        return None


class GeminiLLM(BaseLLM):

    def __init__(
        self,
        primary_model: str,
        fallback_model: Optional[str],
    ):
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "LỖI: Chưa có GEMINI_API_KEY. "
                "Vui lòng kiểm tra lại file .env"
            )

        os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

        self._client = genai.Client()

        self.model = primary_model
        self.fallback_model = fallback_model

    # ==========================================================
    # Gemini SDK helpers
    # ==========================================================

    @staticmethod
    def _to_contents(
        messages: List[Message],
    ) -> List[types.Content]:

        contents = []

        for m in messages:

            role = "user" if m.role == "user" else "model"

            contents.append(
                types.Content(
                    role=role,
                    parts=[
                        types.Part(text=m.content)
                    ],
                )
            )

        return contents

    @staticmethod
    def _to_gen_config(
        config: Optional[LLMConfig],
    ) -> Optional[types.GenerateContentConfig]:

        if config is None:
            return None
        thinking_config = None
        if config.thinking_level:
            thinking_config = types.ThinkingConfig(
            thinking_level=config.thinking_level
        )

        return types.GenerateContentConfig(
            system_instruction=config.system_instruction,
            temperature=config.temperature,
            thinking_config=thinking_config,
        )

    # ==========================================================
    # Streaming
    # ==========================================================

    def _call_stream(
        self,
        model: str,
        contents,
        gen_config,
    ):
        return self._client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=gen_config,
        )

    async def stream(
        self,
        messages: List[Message],
        config: Optional[LLMConfig] = None,
    ) -> AsyncGenerator[str, None]:

        contents = self._to_contents(messages)
        gen_config = self._to_gen_config(config)

        buffer = StreamBuffer()

        try:

            response_stream = self._call_stream(
                self.model,
                contents,
                gen_config,
            )

            for chunk in response_stream:

                if not chunk.text:
                    continue

                piece = buffer.push(chunk.text)

                if piece:
                    yield piece

            tail = buffer.flush()

            if tail:
                yield tail

        except errors.ServerError as e:

            if e.code != 503:
                raise

            if not self.fallback_model:
                raise

            print(
                f"[WARNING] Model '{self.model}' quá tải (503). "
                f"Fallback → '{self.fallback_model}'"
            )

            response_stream = self._call_stream(
                self.fallback_model,
                contents,
                gen_config,
            )

            for chunk in response_stream:

                if chunk.text:
                    yield chunk.text

    # ==========================================================
    # Generate
    # ==========================================================

    async def generate(
        self,
        messages: List[Message],
        config: Optional[LLMConfig] = None,
    ) -> str:

        chunks = []

        async for text in self.stream(
            messages,
            config,
        ):
            chunks.append(text)

        return "".join(chunks)

    # ==========================================================
    # Structured output
    # ==========================================================

    async def generate_structured(
        self,
        messages: List[Message],
        response_schema: Type[T],
        temperature: float = 0,
    ) -> T:

        contents = self._to_contents(messages)

        config = types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json",
            response_schema=response_schema,
        )

        try:

            response = self._client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )

            return response_schema.model_validate_json(
                response.text
            )

        except errors.ServerError as e:

            if e.code != 503 or not self.fallback_model:
                raise

            print(
                f"[WARNING] Model '{self.model}' quá tải (503). "
                f"Structured fallback → '{self.fallback_model}'"
            )

            response = self._client.models.generate_content(
                model=self.fallback_model,
                contents=contents,
                config=config,
            )

            return response_schema.model_validate_json(
                response.text
            )

    # ==========================================================
    # Title
    # ==========================================================

    async def generate_title(
        self,
        message: str,
    ) -> str:

        prompt = (
            "Dựa trên nội dung tin nhắn sau, hãy tạo một tiêu đề "
            "ngắn gọn, tốt nhất khoảng 5-6 từ, tối đa 10 từ. "
            "Tiêu đề phải phù hợp để đặt tên cuộc trò chuyện. "
            "Không viết ký tự đặc biệt nếu không cần thiết."
        )

        config = types.GenerateContentConfig(
            system_instruction=prompt,
            temperature=0.5,
        )

        try:

            response = self._client.models.generate_content(
                model=self.model,
                contents=message,
                config=config,
            )

            return response.text.strip()

        except errors.ServerError as e:

            if e.code == 503 and self.fallback_model:

                print(
                    f"[WARNING] {self.model} quá tải. "
                    f"Title fallback → {self.fallback_model}"
                )

                response = self._client.models.generate_content(
                    model=self.fallback_model,
                    contents=message,
                    config=config,
                )

                return response.text.strip()

            raise