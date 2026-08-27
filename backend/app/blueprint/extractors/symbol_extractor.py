from dataclasses import dataclass

from tree_sitter import Node

from .source_location import SourceLocation


@dataclass
class Symbol:
    name: str
    kind: str
    location: SourceLocation


def extract_symbols(tree) -> list[Symbol]:
    symbols: list[Symbol] = []

    def add_symbol(node: Node, name_node: Node, kind: str):
        symbols.append(
            Symbol(
                name=name_node.text.decode("utf-8"),
                kind=kind,
                location=SourceLocation(
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                ),
            )
        )

    def traverse(node: Node):

        # ==================================================
        # Function
        # ==================================================

        if node.type in {
            "function_declaration",
            "generator_function_declaration",
        }:
            name = node.child_by_field_name("name")

            if name:
                add_symbol(
                    node=node,
                    name_node=name,
                    kind="function",
                )

        # ==================================================
        # Class
        # ==================================================

        elif node.type == "class_declaration":
            name = node.child_by_field_name("name")

            if name:
                add_symbol(
                    node=node,
                    name_node=name,
                    kind="class",
                )

        # ==================================================
        # Method
        # ==================================================

        elif node.type in {
            "method_definition",
            "method_signature",
        }:
            name = node.child_by_field_name("name")

            if name:
                add_symbol(
                    node=node,
                    name_node=name,
                    kind="method",
                )

        # ==================================================
        # Interface
        # ==================================================

        elif node.type == "interface_declaration":
            name = node.child_by_field_name("name")

            if name:
                add_symbol(
                    node=node,
                    name_node=name,
                    kind="interface",
                )

        # ==================================================
        # Type alias
        #
        # type User = {...}
        # ==================================================

        elif node.type == "type_alias_declaration":
            name = node.child_by_field_name("name")

            if name:
                add_symbol(
                    node=node,
                    name_node=name,
                    kind="type",
                )

        # ==================================================
        # Enum
        # ==================================================

        elif node.type == "enum_declaration":
            name = node.child_by_field_name("name")

            if name:
                add_symbol(
                    node=node,
                    name_node=name,
                    kind="enum",
                )

        # ==================================================
        # Variables
        #
        # const foo = ...
        # let bar = ...
        # var baz = ...
        #
        # We only extract identifiers, not expressions.
        # ==================================================

        elif node.type == "lexical_declaration":

            for declaration in node.named_children:

                if declaration.type != "variable_declarator":
                    continue

                name = declaration.child_by_field_name("name")

                if not name:
                    continue

                if name.type == "identifier":
                    add_symbol(
                        node=declaration,
                        name_node=name,
                        kind="variable",
                    )

        # ==================================================
        # Variable declaration
        #
        # var foo = ...
        # ==================================================

        elif node.type == "variable_declaration":

            for declaration in node.named_children:

                if declaration.type != "variable_declarator":
                    continue

                name = declaration.child_by_field_name("name")

                if not name:
                    continue

                if name.type == "identifier":
                    add_symbol(
                        node=declaration,
                        name_node=name,
                        kind="variable",
                    )

        # ==================================================
        # Continue traversal
        # ==================================================

        for child in node.named_children:
            traverse(child)

    traverse(tree.root_node)

    return symbols