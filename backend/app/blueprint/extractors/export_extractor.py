from dataclasses import dataclass


@dataclass
class Export:
    name: str
    export_type: str
    source: str | None
    exported_name: str
    start_line: int
    end_line: int


def extract_exports(tree) -> list[Export]:
    exports: list[Export] = []

    def get_text(node) -> str:
        return node.text.decode("utf-8")

    def get_source(node) -> str | None:
        source_node = node.child_by_field_name("source")

        if source_node:
            return get_text(source_node).strip("\"'")

        return None

    def add_export(
        node,
        name: str,
        export_type: str,
        source: str | None = None,
        exported_name: str | None = None,
    ):
        exports.append(
            Export(
                name=name,
                export_type=export_type,
                source=source,
                exported_name=exported_name or name,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
            )
        )

    def parse_export_statement(node):
        source = get_source(node)

        # ==================================================
        # export default ...
        # ==================================================

        is_default = any(
            child.type == "default"
            for child in node.children
        )

        if is_default:
            for child in node.named_children:

                # export default function foo() {}
                if child.type in (
                    "function_declaration",
                    "generator_function_declaration",
                ):
                    name_node = child.child_by_field_name("name")

                    if name_node:
                        add_export(
                            node=child,
                            name=get_text(name_node),
                            export_type="default",
                            exported_name="default",
                        )
                    else:
                        add_export(
                            node=child,
                            name="default",
                            export_type="default",
                            exported_name="default",
                        )

                    return

                # export default class Foo {}
                if child.type == "class_declaration":
                    name_node = child.child_by_field_name("name")

                    if name_node:
                        add_export(
                            node=child,
                            name=get_text(name_node),
                            export_type="default",
                            exported_name="default",
                        )
                    else:
                        add_export(
                            node=child,
                            name="default",
                            export_type="default",
                            exported_name="default",
                        )

                    return

                # export default identifier/expression
                if child.type not in ("default",):
                    if child.type == "identifier":
                        name = get_text(child)
                    else:
                        name = "default"

                    add_export(
                        node=node,
                        name=name,
                        export_type="default",
                        exported_name="default",
                    )

                    return

            return

        # ==================================================
        # export * from "./utils"
        # ==================================================

        for child in node.named_children:
            if child.type == "namespace_export":
                name_node = child.child_by_field_name("name")

                if name_node:
                    add_export(
                        node=child,
                        name=get_text(name_node),
                        export_type="namespace",
                        source=source,
                        exported_name=get_text(name_node),
                    )
                else:
                    add_export(
                        node=child,
                        name="*",
                        export_type="namespace",
                        source=source,
                        exported_name="*",
                    )

                return

        # ==================================================
        # export { foo, bar }
        # export { foo as bar }
        # export { foo } from "./utils"
        # ==================================================

        for child in node.named_children:

            if child.type == "export_clause":

                for specifier in child.named_children:

                    if specifier.type != "export_specifier":
                        continue

                    name_node = specifier.child_by_field_name("name")
                    alias_node = specifier.child_by_field_name("alias")

                    if not name_node:
                        continue

                    original_name = get_text(name_node)

                    if alias_node:
                        exported_name = get_text(alias_node)
                    else:
                        exported_name = original_name

                    export_type = (
                        "re-export"
                        if source
                        else "named"
                    )

                    add_export(
                        node=specifier,
                        name=original_name,
                        export_type=export_type,
                        source=source,
                        exported_name=exported_name,
                    )

                return

        # ==================================================
        # export const foo = ...
        # export let foo = ...
        # export var foo = ...
        # ==================================================

        for child in node.named_children:

            if child.type == "lexical_declaration":
                for declaration in child.named_children:

                    if declaration.type != "variable_declarator":
                        continue

                    name_node = declaration.child_by_field_name("name")

                    if not name_node:
                        continue

                    # Simple:
                    # export const foo = 1
                    if name_node.type == "identifier":
                        add_export(
                            node=declaration,
                            name=get_text(name_node),
                            export_type="named",
                            exported_name=get_text(name_node),
                        )

                    # Destructuring:
                    # export const { foo, bar } = obj
                    elif name_node.type in (
                        "object_pattern",
                        "array_pattern",
                    ):
                        extract_pattern_exports(
                            name_node,
                            node,
                        )

                return

            # ==================================================
            # export function foo() {}
            # ==================================================

            if child.type in (
                "function_declaration",
                "generator_function_declaration",
            ):
                name_node = child.child_by_field_name("name")

                if name_node:
                    add_export(
                        node=child,
                        name=get_text(name_node),
                        export_type="named",
                        exported_name=get_text(name_node),
                    )

                return

            # ==================================================
            # export class Foo {}
            # ==================================================

            if child.type == "class_declaration":
                name_node = child.child_by_field_name("name")

                if name_node:
                    add_export(
                        node=child,
                        name=get_text(name_node),
                        export_type="named",
                        exported_name=get_text(name_node),
                    )

                return

    def extract_pattern_exports(pattern, export_node):
        """
        Handle:

            export const { foo, bar } = obj
            export const [foo, bar] = arr
        """

        for child in pattern.named_children:

            if child.type == "shorthand_property_identifier_pattern":
                name = get_text(child)

                add_export(
                    node=export_node,
                    name=name,
                    export_type="named",
                    exported_name=name,
                )

            elif child.type == "pair_pattern":
                key_node = child.child_by_field_name("key")
                value_node = child.child_by_field_name("value")

                if value_node:
                    exported_name = get_text(
                        key_node
                    ) if key_node else get_text(value_node)

                    name = get_text(value_node)

                    add_export(
                        node=export_node,
                        name=name,
                        export_type="named",
                        exported_name=exported_name,
                    )

            elif child.type in (
                "object_pattern",
                "array_pattern",
            ):
                extract_pattern_exports(
                    child,
                    export_node,
                )

    def traverse(node):
        if node.type == "export_statement":
            parse_export_statement(node)

        for child in node.named_children:
            traverse(child)

    traverse(tree.root_node)

    return exports