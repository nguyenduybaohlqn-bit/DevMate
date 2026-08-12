import os
from typing import AsyncGenerator, List, Optional

from google import genai
from google.genai import errors, types

from app.config import settings

from .base import BaseLLM
from .schemas import LLMConfig, Message


class StreamBuffer:
    """Gom text lại theo câu (hoặc theo kích thước) để tránh yield từng token nhỏ lẻ.
    Tách riêng ra khỏi GeminiLLM để không trộn lẫn với logic gọi model / fallback.
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


class GeminiLLM(BaseLLM):
    """Adapter cho Gemini. Toàn bộ chi tiết SDK (types.Content, GenerateContentConfig,
    ServerError 503, fallback model...) nằm gọn trong class này.
    """

    def __init__(
        self,
        primary_model: str = "gemini-2.5-flash",
        fallback_model: str = "gemini-2.5-flash-lite",
        title_models: Optional[List[str]] = None,
    ):
        if not settings.GEMINI_API_KEY:
            raise ValueError("LỖI: Chưa có GEMINI_API_KEY. Vui lòng kiểm tra lại file .env")

        os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
        self._client = genai.Client()
        self.primary_model = primary_model
        self.fallback_model = fallback_model
        self.title_models = title_models or ["gemini-2.5-flash-lite", "gemini-2.5-flash"]

    # ---------- helpers: convert format trung gian -> Gemini SDK ----------

    @staticmethod
    def _to_contents(messages: List[Message]) -> List[types.Content]:
        contents = []
        for m in messages:
            role = "user" if m.role == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=m.content)]))
        return contents

    @staticmethod
    def _to_gen_config(config: Optional[LLMConfig]) -> Optional[types.GenerateContentConfig]:
        if config is None:
            return None
        return types.GenerateContentConfig(
            system_instruction=config.system_instruction,
            temperature=config.temperature,
        )

    def _call_stream(self, model: str, contents, gen_config):
        return self._client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=gen_config,
        )

    # ---------- BaseLLM API ----------

    async def stream(
        self, messages: List[Message], config: Optional[LLMConfig] = None
    ) -> AsyncGenerator[str, None]:
        contents = self._to_contents(messages)
        gen_config = self._to_gen_config(config)
        buffer = StreamBuffer()

        try:
            response_stream = self._call_stream(self.primary_model, contents, gen_config)
            for chunk in response_stream:
                if chunk.text:
                    piece = buffer.push(chunk.text)
                    if piece:
                        yield piece
            tail = buffer.flush()
            if tail:
                yield tail

        except errors.ServerError as e:
            if e.code != 503:
                raise
            print(
                f"[WARNING] Model '{self.primary_model}' đang quá tải (503). "
                f"Tự động chuyển sang model dự phòng: '{self.fallback_model}'..."
            )
            response_stream = self._call_stream(self.fallback_model, contents, gen_config)
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

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
        gen_config = types.GenerateContentConfig(system_instruction=prompt, temperature=0.5)

        for model in self.title_models:
            try:
                print(f"[DEBUG] Gọi {model} tạo tiêu đề...")
                response = self._client.models.generate_content(
                    model=model, contents=message, config=gen_config
                )
                return response.text.strip()
            except errors.ServerError as e:
                if e.code == 503:
                    print(f"[WARNING] {model} quá tải (503), thử model tiếp theo...")
                    continue
                raise

        print("[WARNING] Tất cả model đều quá tải, dùng message làm tiêu đề.")
        return message[:50].strip()