from app.blueprint.scanner.file_scanner import scan_files_in_directory
from app.blueprint.scanner.language_detector import detect_language
from app.blueprint.parsers.tree_sitter_parser import parse_file
from app.blueprint.extractors.symbol_extractor import extract_symbols
from app.blueprint.extractors.import_extractor import extract_imports
from app.blueprint.extractors.export_extractor import extract_exports
from app.blueprint.graph.file_analysis import FileAnalysis
from app.blueprint.graph.graph_builder  import build_graph
from app.blueprint.graph.models import CodeGraph


def build_codebase_graph(directory_path: str) -> CodeGraph:
    analyses: list[FileAnalysis] = []

    for file_path in scan_files_in_directory(directory_path):
        language = detect_language(file_path)

        ast = parse_file(file_path, language)

        symbols = extract_symbols(ast)
        imports = extract_imports(ast)
        exports = extract_exports(ast)

        analyses.append(
            FileAnalysis(
                path=str(file_path),
                language=language,
                symbols=symbols,
                imports=imports,
                exports=exports,
            )
        )

    graph = build_graph(analyses)

    return graph