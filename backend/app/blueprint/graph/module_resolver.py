"""
graph_builder.module_resolver
================================

Giải quyết specifier import ("./components/Card") thành path file thật
trong project ("src/components/Card.tsx").

Tài liệu thiết kế gọi đây là phần quan trọng nhất: extractor chỉ biết
chuỗi module, graph_builder mới biết file nào tương ứng với chuỗi đó.
"""

from __future__ import annotations

import posixpath

DEFAULT_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"]


def _index_candidates(base: str, extensions: list[str]) -> list[str]:
    return [posixpath.join(base, f"index{ext}") for ext in extensions]


def resolve_module(
    source: str,
    module: str,
    known_paths: set[str],
    extensions: list[str] | None = None,
) -> str | None:
    """
    Trả về path đã resolve nếu tìm thấy trong `known_paths`, ngược lại
    trả về None — thường có nghĩa đây là external package (react,
    lodash, ...) hoặc file chưa được scan.

    - source: path của file đang chứa câu import (vd "src/App.tsx")
    - module: chuỗi specifier trong import (vd "./components/Card")
    - known_paths: tập hợp path của TẤT CẢ file đã scan được trong repo
    """
    extensions = extensions or DEFAULT_EXTENSIONS

    if is_external_package(module):
        return None

    if module.startswith("/"):
        raw_target = posixpath.normpath(module.lstrip("/"))
    else:
        source_dir = posixpath.dirname(source)
        raw_target = posixpath.normpath(posixpath.join(source_dir, module))

    candidates = [raw_target]
    candidates += [raw_target + ext for ext in extensions]
    candidates += _index_candidates(raw_target, extensions)

    for candidate in candidates:
        normalized = posixpath.normpath(candidate)

        if normalized in known_paths:
            return normalized

    return None


def is_external_package(module: str) -> bool:
    """True nếu specifier không phải path tương đối/tuyệt đối trong repo
    (vd "react", "lodash/debounce", "@scope/pkg", "node:fs")."""
    return not (module.startswith(".") or module.startswith("/"))


def package_node_id(module: str) -> str:
    """
    Chuẩn hoá id cho package node, gộp các subpath của cùng 1 package
    thành một node duy nhất trên graph.

        "lodash/debounce" và "lodash" -> cùng node "pkg:lodash"
        "@scope/pkg/sub"              -> node "pkg:@scope/pkg"
    """
    parts = module.split("/")

    if module.startswith("@") and len(parts) >= 2:
        package_name = "/".join(parts[:2])
    else:
        package_name = parts[0]

    return f"pkg:{package_name}"