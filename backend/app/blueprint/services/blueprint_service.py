from app.blueprint.scanner.file_scanner import scan_files_in_directory
from app.blueprint.scanner.language_detector import detect_language
from app.blueprint.parsers.tree_sitter_parser import parse_file
from app.blueprint.extractors.symbol_extractor import extract_symbols
from app.blueprint.extractors.import_extractor import extract_imports
from app.blueprint.extractors.export_extractor import extract_exports


def convert_codebase_to_graph(directory_path: str):

    for file_path in scan_files_in_directory(directory_path):
        language = detect_language(file_path)
        ast = parse_file(file_path, language)
        symbols = extract_symbols(ast)
        imports = extract_imports(ast)
        exports = extract_exports(ast)
        
