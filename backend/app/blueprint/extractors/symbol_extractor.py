from dataclasses import dataclass
from tree_sitter import Node
from .source_location import SourceLocation

@dataclass
class Symbol:
    name: str
    kind: str
    location: SourceLocation
def extract_symbols(tree) -> list[Symbol]:
    symbols = []

    def traverse(node: Node):
        if node.type in {
            "function_definition",
            "class_definition",
            "method_definition",
        }:
            name = node.child_by_field_name("name")

            if name:
                symbols.append(
                    Symbol(
                        name=name.text.decode(),
                        kind=node.type,
                        location=SourceLocation(
                            start_line=node.start_point[0] + 1,
                            end_line=node.end_point[0] + 1
                        )
                    )
                )

        for child in node.children:
            traverse(child)

    traverse(tree.root_node)

    return symbols