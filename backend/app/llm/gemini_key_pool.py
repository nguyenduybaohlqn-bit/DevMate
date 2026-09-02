from google import genai

from app.config import settings


class GeminiKeyPool:

    def __init__(self):
        self._clients = [
            genai.Client(api_key=api_key)
            for api_key in settings.GEMINI_API_KEYS
        ]

        if not self._clients:
            raise ValueError(
                "Không có GEMINI API key nào được cấu hình."
            )

    @property
    def clients(self):
        return self._clients