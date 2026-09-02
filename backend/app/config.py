import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent

dotenv_path = BASE_DIR / ".env"

if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path, override=True)
    print(
        f"[THÀNH CÔNG] Đã tìm thấy và nạp file .env tại: "
        f"{dotenv_path}"
    )
else:
    print(
        f"[CẢNH BÁO] Không tìm thấy file .env tại vị trí kỳ vọng: "
        f"{dotenv_path}"
    )


class Settings:

    DATABASE_URL: str = os.getenv("DATABASE_URL")

    OLLAMA_API_KEY: str = os.getenv("OLLAMA_API_KEY")

    GEMINI_API_KEYS: list[str] = [
        key
        for key in (
            os.getenv("GEMINI_API_KEY_1"),
            os.getenv("GEMINI_API_KEY_2"),
            os.getenv("GEMINI_API_KEY_3"),
            os.getenv("GEMINI_API_KEY_4"),
            os.getenv("GEMINI_API_KEY_5"),
        )
        if key
    ]


settings = Settings()