from dataclasses import dataclass

@dataclass
class SourceLocation:
    start_line: int
    end_line: int