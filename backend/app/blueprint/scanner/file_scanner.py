from pathlib import Path

IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".idea",
    ".vscode",
}

SUPPORTED_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
}

def scan_files_in_directory(directory_path: str):
    root = Path(directory_path)
    for file_path in root.rglob("*"):
        if not file_path.is_file():
            continue

        if any(part in IGNORED_DIRS for part in file_path.parts):
            continue

        if file_path.suffix not in SUPPORTED_EXTENSIONS:
            continue
        yield file_path