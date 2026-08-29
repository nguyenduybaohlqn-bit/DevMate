"""
graph_builder.builder
========================

Triển khai `build_graph` theo đúng 5 bước trong tài liệu thiết kế:

    add_file_nodes
    add_symbol_nodes
    resolve_import_edges
    resolve_export_edges
    resolve_symbol_relationships   (stub cho Level 2)

MVP tập trung vào Level 1 — File Graph: file node, symbol node
(CONTAINS), IMPORTS edge, EXPORTS edge. Level 2 — Symbol Graph (USES,
CALLS, EXTENDS, IMPLEMENTS, REFERENCES) nên làm SAU khi import/export
resolution đã ổn định, đúng khuyến nghị của tài liệu thiết kế.
"""

from __future__ import annotations

from .file_analysis import FileAnalysis
from .models import CodeGraph, GraphNode
from .module_resolver import is_external_package, package_node_id, resolve_module


def build_graph(files: list[FileAnalysis]) -> CodeGraph:
    graph = CodeGraph()
    known_paths = {f.path for f in files}

    add_file_nodes(graph, files)
    add_symbol_nodes(graph, files)
    resolve_import_edges(graph, files, known_paths)
    resolve_export_edges(graph, files, known_paths)
    resolve_symbol_relationships(graph, files)

    return graph


def add_file_nodes(graph: CodeGraph, files: list[FileAnalysis]) -> None:
    for file in files:
        graph.add_node(
            GraphNode(
                id=file.path,
                type="file",
                label=file.path.rsplit("/", 1)[-1],
                metadata={"path": file.path, "language": file.language},
            )
        )


def add_symbol_nodes(graph: CodeGraph, files: list[FileAnalysis]) -> None:
    for file in files:
        for symbol in file.symbols:
            symbol_id = f"{file.path}:{symbol.name}"

            graph.add_node(
                GraphNode(
                    id=symbol_id,
                    type="symbol",
                    label=symbol.name,
                    metadata={"kind": symbol.kind, "file": file.path},
                )
            )

            graph.add_edge(file.path, symbol_id, type="CONTAINS")


def resolve_import_edges(
    graph: CodeGraph,
    files: list[FileAnalysis],
    known_paths: set[str],
) -> None:
    for file in files:
        for imp in file.imports:

            if is_external_package(imp.module):
                pkg_id = package_node_id(imp.module)

                graph.add_node(
                    GraphNode(id=pkg_id, type="package", label=pkg_id.removeprefix("pkg:"))
                )

                graph.add_edge(
                    file.path,
                    pkg_id,
                    type="IMPORTS_PACKAGE",
                    metadata={
                        "module": imp.module,
                        "imported_names": imp.imported_names,
                        "import_type": imp.import_type,
                    },
                )
                continue

            target = resolve_module(source=file.path, module=imp.module, known_paths=known_paths)

            if target is None:
                # Trỏ tới 1 path trong repo nhưng chưa scan được (bị
                # .gitignore, lỗi parse, ...) — bỏ qua, không tạo
                # dangling edge.
                continue

            graph.add_edge(
                file.path,
                target,
                type="IMPORTS",
                metadata={
                    "module": imp.module,
                    "imported_names": imp.imported_names,
                    "aliases": imp.aliases,
                    "import_type": imp.import_type,
                },
            )


def resolve_export_edges(
    graph: CodeGraph,
    files: list[FileAnalysis],
    known_paths: set[str],
) -> None:
    for file in files:
        for exp in file.exports:

            # ----------------------------------------------------------
            # export { foo } from "./utils"  /  export * from "./utils"
            # -> re-export, mục tiêu là FILE khác chứ không phải symbol
            #    trong chính file này.
            # ----------------------------------------------------------
            if exp.source:
                target = resolve_module(source=file.path, module=exp.source, known_paths=known_paths)

                if target is None:
                    continue

                graph.add_edge(
                    file.path,
                    target,
                    type="RE_EXPORTS",
                    metadata={
                        "name": exp.name,
                        "exported_name": exp.exported_name,
                        "export_type": exp.export_type,
                    },
                )
                continue

            # ----------------------------------------------------------
            # export local: cố match với symbol đã extract được trong
            # cùng file (theo tên gốc, chưa alias).
            # ----------------------------------------------------------
            symbol_id = f"{file.path}:{exp.name}"

            if not graph.has_node(symbol_id):
                # Không có symbol node tương ứng — vd export default một
                # expression ẩn danh, hoặc re-export 1 identifier được
                # import từ nơi khác. Tạo symbol node tạm để Blueprint UI
                # vẫn có điểm để render, đánh dấu rõ đây là suy luận.
                graph.add_node(
                    GraphNode(
                        id=symbol_id,
                        type="symbol",
                        label=exp.name,
                        metadata={"file": file.path, "inferred": True},
                    )
                )
                graph.add_edge(file.path, symbol_id, type="CONTAINS")

            graph.add_edge(
                file.path,
                symbol_id,
                type="EXPORTS",
                metadata={"exported_name": exp.exported_name, "export_type": exp.export_type},
            )


def resolve_symbol_relationships(graph: CodeGraph, files: list[FileAnalysis]) -> None:
    """
    Level 2 — Symbol Graph (USES, CALLS, EXTENDS, IMPLEMENTS, REFERENCES).

    Cố tình để trống ở MVP: theo tài liệu thiết kế, bước này chỉ nên làm
    SAU KHI resolve_import_edges / resolve_export_edges đã ổn định, vì
    nó cần thêm một usage extractor (theo dõi JSX tag, call expression,
    class heritage clause, ...) mà hiện repo chưa có.

    Khi có usage extractor, chỉ cần bổ sung logic ở đây — không cần đụng
    tới 4 bước phía trên.
    """
    return None