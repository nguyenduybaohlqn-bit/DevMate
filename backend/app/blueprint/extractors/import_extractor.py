from dataclasses import dataclass
from .source_location import SourceLocation

@dataclass
class Import:
    module: str
    imported_names: list[str]
    aliases: dict[str, str]
    import_type: str
    location: SourceLocation

def extract_imports(tree) -> list[Import]:
    imports = []

    def traverse(node):
        if node.type == "import_statement":
            imports.append(parse_import(node))

        for child in node.children:
            traverse(child)

    traverse(tree.root_node)

    return imports

def parse_import(node) -> Import:
    source = None
    imported_names = []
    aliases = {}
    import_type = "unknown"

    for child in node.children:
        # import "react"
        if child.type == "string":
            source = child.text.decode("utf-8").strip("\"'")

        # import ...
        elif child.type == "import_clause":
            for item in child.children:

                # import React from "react"
                if item.type == "identifier":
                    imported_names.append("default")
                    aliases["default"] = item.text.decode("utf-8")
                    import_type = "default"

                # import * as React from "react"
                elif item.type == "namespace_import":
                    name = item.child_by_field_name("name")

                    if name:
                        local_name = name.text.decode("utf-8")
                        imported_names.append("*")
                        aliases["*"] = local_name

                    import_type = "namespace"

                # import { User, User as UserModel }
                elif item.type == "named_imports":
                    import_type = "named"

                    for named in item.children:
                        if named.type != "import_specifier":
                            continue

                        imported = named.child_by_field_name("name")
                        alias = named.child_by_field_name("alias")

                        if imported:
                            imported_name = imported.text.decode("utf-8")
                            imported_names.append(imported_name)

                            if alias:
                                local_name = alias.text.decode("utf-8")
                                aliases[imported_name] = local_name

    
    if source and not imported_names:
        import_type = "side_effect"

    return Import(
        module=source,
        imported_names=imported_names,
        aliases=aliases,
        import_type=import_type,
        location =SourceLocation(
            start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
        )
    )