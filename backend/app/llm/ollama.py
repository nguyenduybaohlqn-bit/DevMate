from typing import AsyncGenerator, List, Optional

from openai import APIStatusError, AsyncOpenAI

from app.config import settings

from .base import BaseLLM
from .schemas import LLMConfig, Message


class StreamBuffer:
    """Gom text lại theo câu (hoặc theo kích thước) để tránh yield từng token nhỏ lẻ.
    Tách riêng ra khỏi QwenLLM để không trộn lẫn với logic gọi model / fallback.
    """

    FLUSH_CHARS = {".", "!", "?", "\n"}
    BUFFER_SIZE = 80

    def __init__(self):
        self._buffer = ""

    def push(self, text: str) -> Optional[str]:
        self._buffer += text
        if any(c in self._buffer for c in self.FLUSH_CHARS) or len(self._buffer) >= self.BUFFER_SIZE:
            out, self._buffer = self._buffer, ""
            return out
        return None

    def flush(self) -> Optional[str]:
        if self._buffer:
            out, self._buffer = self._buffer, ""
            return out
        return None


class QwenLLM(BaseLLM):

    DEFAULT_BASE_URL = "http://127.0.0.1:11434/v1"

    def __init__(
        self,
        primary_model: str = "qwen3:4b-instruct",
        fallback_model: str = "qwen-turbo",
        title_models: Optional[List[str]] = None,
    ):
        if not settings.OLLAMA_API_KEY:
            raise ValueError("LỖI: Chưa có OLLAMA_API_KEY. Vui lòng kiểm tra lại file .env")

        base_url = getattr(settings, "OLLAMA_BASE_URL", None) or self.DEFAULT_BASE_URL
        self._client = AsyncOpenAI(api_key=settings.OLLAMA_API_KEY, base_url=base_url)
        self.primary_model = primary_model
        self.fallback_model = fallback_model
        self.title_models = title_models or [primary_model, fallback_model]

    # ---------- helpers: convert format trung gian -> Qwen (OpenAI-compatible) SDK ----------

    @staticmethod
    def _to_messages(messages: List[Message], system_instruction: Optional[str] = None) -> List[dict]:
        payload = []
        if system_instruction:
            payload.append({"role": "system", "content": system_instruction})
        for m in messages:
            role = "user" if m.role == "user" else "assistant"
            payload.append({"role": role, "content": m.content})
        return payload

    @staticmethod
    def _extract_kwargs(config: Optional[LLMConfig]) -> dict:
        if config is None:
            return {}
        kwargs = {}
        if config.temperature is not None:
            kwargs["temperature"] = config.temperature
        return kwargs

    async def _call_stream(self, model: str, messages: List[dict], gen_kwargs: dict):
        return await self._client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            **gen_kwargs,
        )

    @staticmethod
    def _is_overloaded(e: APIStatusError) -> bool:
        return e.status_code in (429, 503)

    # ---------- BaseLLM API ----------

    async def stream(
        self, messages: List[Message], config: Optional[LLMConfig] = None
    ) -> AsyncGenerator[str, None]:
        system_instruction = config.system_instruction if config else None
        chat_messages = self._to_messages(messages, system_instruction)
        gen_kwargs = self._extract_kwargs(config)
        buffer = StreamBuffer()

        try:
            response_stream = await self._call_stream(self.primary_model, chat_messages, gen_kwargs)
            async for chunk in response_stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    piece = buffer.push(delta)
                    if piece:
                        yield piece
            tail = buffer.flush()
            if tail:
                yield tail

        except APIStatusError as e:
            if not self._is_overloaded(e):
                raise
            print(
                f"[WARNING] Model '{self.primary_model}' đang quá tải ({e.status_code}). "
                f"Tự động chuyển sang model dự phòng: '{self.fallback_model}'..."
            )
            response_stream = await self._call_stream(self.fallback_model, chat_messages, gen_kwargs)
            async for chunk in response_stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta

    async def generate(
        self, messages: List[Message], config: Optional[LLMConfig] = None
    ) -> str:
        chunks = []
        async for text in self.stream(messages, config):
            chunks.append(text)
        return "".join(chunks)

    async def generate_title(self, message: str) -> str:
        prompt = (
            "Dựa trên nội dung tin nhắn sau, hãy tạo một tiêu đề ngắn gọn "
            "(tốt nhất là khoảng 5 - 6 từ, tối đa 10 từ) phù hợp để đặt tên "
            "cho cuộc trò chuyện này, không viết các kí tự đặc biệt nếu không cần thiết\n\n"
        )
        chat_messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": message},
        ]

        for model in self.title_models:
            try:
                print(f"[DEBUG] Gọi {model} tạo tiêu đề...")
                response = await self._client.chat.completions.create(
                    model=model,
                    messages=chat_messages,
                    temperature=0.5,
                )
                return response.choices[0].message.content.strip()
                
            except APIStatusError as e:
                if self._is_overloaded(e):
                    print(f"[WARNING] {model} quá tải ({e.status_code}), thử model tiếp theo...")
                    continue
                raise

        print("[WARNING] Tất cả model đều quá tải, dùng message làm tiêu đề.")
        return message[:50].strip()