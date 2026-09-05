from http import client
from importlib.resources import contents
from logging import config
import os
from typing import AsyncGenerator, List, Optional, Type, TypeVar
from xml.parsers.expat import model
from certifi import contents

from google import genai
from google.genai import errors, types
from openai import api_key
from pydantic import BaseModel

from app.config import settings

from .base import BaseLLM
from app.llm.gemini_key_manager import gemini_key_manager
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
        
        self.model = primary_model
        self.fallback_model = fallback_model

    # ==========================================================
    # Gemini SDK helpers
    # ==========================================================

    def _create_client(self, api_key: str):
                return genai.Client(api_key=api_key)
    
    async def _get_client(self, model: str):
                candidates = await gemini_key_manager.get_available_keys(model)
    
                if not candidates:
                    raise RuntimeError(
                    f"No available Gemini API key for model: {model}"
                )
    
                key_index, api_key = candidates[0]
                print(
    f"[Gemini] selected key #{key_index} "
    f"for model={model}"
)
    
                return (
                    self._create_client(api_key),
                    key_index,
                )

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

    async def _call_stream_with_key_retry(
    self,
    model: str,
    contents,
    gen_config,
):
        candidates = await gemini_key_manager.get_available_keys(model)

        if not candidates:
            raise RuntimeError(
                f"No available Gemini API key for model: {model}"
            )

        last_error = None

        for key_index, api_key in candidates:
            client = self._create_client(api_key)
            started = False

            print(
                f"[Gemini] Trying key #{key_index} "
                f"for stream model '{model}'"
            )

            try:
                response_stream = client.models.generate_content_stream(
                    model=model,
                    contents=contents,
                    config=gen_config,
                )

                for chunk in response_stream:
                    started = True
                    yield chunk

                await gemini_key_manager.mark_success(key_index, model)
                return

            except errors.ClientError as e:
                last_error = e

                if e.code != 429:
                    raise

                if started:
                    print(
                        f"[Gemini] Key #{key_index} bị 429 SAU KHI đã "
                        f"stream một phần nội dung cho model '{model}'. "
                        f"Không retry để tránh trùng lặp — raise thẳng."
                    )
                    raise

                print(
                    f"[Gemini] Key #{key_index} rate limited "
                    f"TRƯỚC khi stream chunk nào cho model '{model}'"
                )

                await gemini_key_manager.mark_rate_limited(
                    key_index=key_index,
                    model=model,
                    cooldown_seconds=60,
                    error=str(e),
                )

        raise RuntimeError(
            f"All Gemini API keys exhausted for streaming model: {model}"
        ) from last_error

    async def stream(
    self,
    messages: List[Message],
    config: Optional[LLMConfig] = None,
) -> AsyncGenerator[str, None]:

        contents = self._to_contents(messages)
        gen_config = self._to_gen_config(config)

        buffer = StreamBuffer()

        try:

            async for chunk in self._call_stream_with_key_retry(
                self.model,
                contents,
                gen_config,
            ):

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

            fallback_buffer = StreamBuffer()

            async for chunk in self._call_stream_with_key_retry(
                self.fallback_model,
                contents,
                gen_config,
            ):
                if not chunk.text:
                    continue
                
                piece = fallback_buffer.push(chunk.text)
        
                if piece:
                    yield piece
        
            tail = fallback_buffer.flush()
        
            if tail:
                yield tail

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

            client, key_index = await self._get_client(self.model)

            print(
    f"[Gemini] Structured output using key #{key_index} "
    f"for model '{self.model}'"
)

            response = await self._call_with_key_retry(
    model=self.model,
    contents=contents,
    gen_config=config,
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

            client, key_index = await self._get_client(self.fallback_model)

            print(
    f"[Gemini] Structured fallback using key #{key_index} "
    f"for model '{self.fallback_model}'"
)

            response = await self._call_with_key_retry(
    model=self.fallback_model,
    contents=contents,
    gen_config=config,
)
            return response_schema.model_validate_json(response.text)

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

            client, key_index = await self._get_client(self.model)
            print(f"[Gemini] Title generation using key #{key_index} "
                    f"for model '{self.model}'"
                )
            response = await self._call_with_key_retry(
    model=self.model,
    contents=message,
    gen_config=config,
)
            return response.text.strip()

        except errors.ServerError as e:

            if e.code == 503 and self.fallback_model:

                print(
                    f"[WARNING] {self.model} quá tải. "
                    f"Title fallback → {self.fallback_model}"
                )

                client, key_index = await self._get_client(self.fallback_model)
                print(f"[Gemini] Title fallback using key #{key_index} "
                    f"for model '{self.fallback_model}'"
                )
                response = await self._call_with_key_retry(
    model=self.fallback_model,
    contents=message,
    gen_config=config,
)
                return response.text.strip()
        

            raise

    async def _call_with_key_retry(
    self,
    model: str,
    contents,
    gen_config,
):
        candidates = await gemini_key_manager.get_available_keys(model)

        if not candidates:
            raise RuntimeError(
                f"No available Gemini API key for model: {model}"
            )

        last_error = None

        for key_index, api_key in candidates:
            client = self._create_client(api_key)

            print(
            f"[Gemini] Trying key #{key_index} "
            f"for model '{model}'"
            )

            try:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=gen_config,
                )

                await gemini_key_manager.mark_success(
                    key_index,
                    model,
                )

                return response

            except errors.ClientError as e:
                last_error = e

                if e.code != 429:
                    raise

            print(
                f"[Gemini] Key #{key_index} rate limited "
                f"for model '{model}'"
            )

            await gemini_key_manager.mark_rate_limited(
                key_index=key_index,
                model=model,
                cooldown_seconds=60,
                error=str(e),
            )

        raise RuntimeError(
        f"All Gemini API keys exhausted for model: {model}"
    ) from last_error