from pathlib import Path

LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
}

def detect_language(file_path: Path) -> str:
    return LANGUAGE_MAP[file_path.suffix]