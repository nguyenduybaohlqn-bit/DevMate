from tree_sitter import Parser
from tree_sitter_language_pack import get_language



def parse_file(file_path, language : str):
    parser = Parser()
    parser.language = get_language(language)
    code = file_path.read_bytes()
    return parser.parse(code)