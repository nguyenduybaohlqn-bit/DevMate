"""
graph_builder.file_analysis
=============================

`FileAnalysis` là input chuẩn hoá cho `build_graph`, gộp kết quả của
3 extractor: symbol, import, export — đúng theo tài liệu thiết kế:

    Scanner -> AST -> Extractors -> Graph Builder -> Code Graph -> Blueprint UI

Graph Builder không quan tâm extractor thật trả về class cụ thể nào,
miễn có đúng các thuộc tính bên dưới (duck typing qua Protocol). Nhờ
vậy graph_builder không bị ràng buộc cứng vào đường dẫn package thật
của Symbol/Import/Export trong project — chỉ cần khớp field.

Nếu muốn strict-typing, chỉ cần thay 3 Protocol này bằng import trực
tiếp từ extractors thật, ví dụ:

    from extractors.symbol import Symbol
    from extractors.export import Export
    from extractors.import_extractor import Import
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@runtime_checkable
class SymbolLike(Protocol):
    name: str
    kind: str


@runtime_checkable
class ImportLike(Protocol):
    module: str
    imported_names: list[str]
    aliases: dict[str, str]
    import_type: str


@runtime_checkable
class ExportLike(Protocol):
    name: str
    export_type: str
    source: str | None
    exported_name: str


@dataclass
class FileAnalysis:
    path: str
    language: str
    symbols: list[SymbolLike] = field(default_factory=list)
    imports: list[ImportLike] = field(default_factory=list)
    exports: list[ExportLike] = field(default_factory=list)