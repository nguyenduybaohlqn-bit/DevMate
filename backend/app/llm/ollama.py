from pyexpat.errors import messages
from typing import AsyncGenerator, List, Optional, Type, TypeVar

import httpx
from openai import APIStatusError, AsyncOpenAI
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)
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
        self._native_base_url = base_url[: -len("/v1")] if base_url.endswith("/v1") else base_url
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

    async def generate_structured(
    self,
    messages: List[Message],
    schema: Type[T],
    config: Optional[LLMConfig] = None,
) -> T:

        system_instruction = config.system_instruction if config else None
        schema_json = schema.model_json_schema()

    # Nhắc lại rõ ràng các field bắt buộc — model nhỏ dễ bịa cấu trúc nếu không nhấn mạnh
        required_fields = schema_json.get("required", [])
        reinforcement = (
        f"\n\nQUAN TRỌNG: Trả lời CHỈ bằng một object JSON DUY NHẤT ở cấp cao nhất, "
        f"với đúng các field bắt buộc: {required_fields}. "
        f"KHÔNG bọc trong bất kỳ key nào khác (ví dụ không được trả về "
        f'{{"execution_plan": {{...}}}}), không thêm giải thích, không thêm text ngoài JSON.'
    )
        full_system = (system_instruction or "") + reinforcement

        chat_messages = self._to_messages(messages, full_system)

        payload = {
        "model": self.primary_model,
        "messages": chat_messages,
        "stream": False,
        "format": schema_json,
        "think": False,  # tắt chế độ suy luận của qwen3 để nó không lẫn <think> vào JSON
        "options": {
            "temperature": (
                config.temperature
                if config and config.temperature is not None
                else 0.0
            )
        },
    }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
            f"{self._native_base_url}/api/chat",
            json=payload,
        )
            response.raise_for_status()
            data = response.json()

        content = data["message"]["content"]

        print("[DEBUG] Qwen structured raw output:")
        print(content)

        try:
         return schema.model_validate_json(content)
        except Exception as first_error:
        # Model nhỏ đôi khi bọc thừa 1 lớp key, ví dụ {"execution_plan": {...}}
            try:
                import json
                parsed = json.loads(content)
                if isinstance(parsed, dict) and len(parsed) == 1:
                    inner = next(iter(parsed.values()))
                    if isinstance(inner, dict):
                        print("[WARNING] Output bị bọc thừa 1 lớp, đang thử unwrap...")
                        return schema.model_validate(inner)
            except Exception:
                 pass

            print("[ERROR] Structured output does not match schema:")
            print(content)
            raise first_error