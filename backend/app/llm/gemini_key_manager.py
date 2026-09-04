import asyncio
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class ModelKeyState:
    cooldown_until: float = 0.0
    failures: int = 0
    last_error: Optional[str] = None

    @property
    def available(self) -> bool:
        return time.monotonic() >= self.cooldown_until


class GeminiKeyManager:
    def __init__(self, api_keys: list[str]):
        self.api_keys = api_keys

        # key_index -> model -> state
        self._states: dict[int, dict[str, ModelKeyState]] = {}

        self._lock = asyncio.Lock()

    def _get_state(self, key_index: int, model: str) -> ModelKeyState:
        if key_index not in self._states:
            self._states[key_index] = {}

        if model not in self._states[key_index]:
            self._states[key_index][model] = ModelKeyState()

        return self._states[key_index][model]

    async def get_available_keys(self, model: str) -> list[tuple[int, str]]:
        """
        Trả về các API key hiện đang có thể sử dụng cho model.

        Kết quả:
            [(key_index, api_key), ...]
        """
        async with self._lock:
            result = []

            for index, api_key in enumerate(self.api_keys):
                state = self._get_state(index, model)

                if state.available:
                    result.append((index, api_key))

            return result

    async def mark_rate_limited(
        self,
        key_index: int,
        model: str,
        cooldown_seconds: float = 60.0,
        error: str = "rate_limited",
    ):
        async with self._lock:
            state = self._get_state(key_index, model)

            state.cooldown_until = (
                time.monotonic() + cooldown_seconds
            )
            state.failures += 1
            state.last_error = error

    async def mark_failed(
        self,
        key_index: int,
        model: str,
        error: str,
    ):
        async with self._lock:
            state = self._get_state(key_index, model)

            state.failures += 1
            state.last_error = error

    async def mark_success(
        self,
        key_index: int,
        model: str,
    ):
        async with self._lock:
            state = self._get_state(key_index, model)

            state.failures = 0
            state.last_error = None
            state.cooldown_until = 0.0

    async def get_state(
        self,
        key_index: int,
        model: str,
    ) -> ModelKeyState:
        async with self._lock:
            return self._get_state(key_index, model)

from app.config import settings

gemini_key_manager = GeminiKeyManager(
    settings.GEMINI_API_KEYS
)