import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# Chỉ định chính xác vị trí file .env nằm ở gốc thư mục backend
dotenv_path = BASE_DIR / ".env"

# Ép hệ thống nạp file .env từ đường dẫn tuyệt đối vừa tìm được
if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path, override=True)
    print(f"[THÀNH CÔNG] Đã tìm thấy và nạp file .env tại: {dotenv_path}")
else:
    print(f"[CẢNH BÁO] Không tìm thấy file .env tại vị trí kỳ vọng: {dotenv_path}")

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    OLLAMA_API_KEY: str = os.getenv("OLLAMA_API_KEY")

settings = Settings()