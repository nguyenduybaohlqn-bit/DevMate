"""
graph_builder.models
=====================

Các kiểu dữ liệu trung gian cho Code Knowledge Graph.

Theo đúng tinh thần tài liệu thiết kế Nexus Blueprint:
- Graph Builder KHÔNG phụ thuộc trực tiếp vào UI.
- `CodeGraph` là model trung gian, chỉ cần serialize (to_dict / to_json)
  là Blueprint UI có thể nhận và render.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GraphNode:
    id: str
    type: str  # "file" | "symbol" | "package"
    label: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdge:
    source: str
    target: str
    type: str  # "CONTAINS" | "IMPORTS" | "EXPORTS" | "RE_EXPORTS" | "IMPORTS_PACKAGE" | "USES" | ...
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CodeGraph:
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)

    # Index nội bộ để chống trùng — không xuất hiện trong to_dict()/to_json()
    _node_index: dict[str, int] = field(default_factory=dict, repr=False, compare=False)
    _edge_seen: set[tuple[str, str, str]] = field(default_factory=set, repr=False, compare=False)

    def has_node(self, node_id: str) -> bool:
        return node_id in self._node_index

    def get_node(self, node_id: str) -> GraphNode | None:
        idx = self._node_index.get(node_id)
        return self.nodes[idx] if idx is not None else None

    def add_node(self, node: GraphNode) -> GraphNode:
        """
        Thêm node vào graph. Nếu id đã tồn tại thì merge metadata thay vì
        tạo bản ghi trùng — một file hoặc một symbol chỉ nên có đúng 1 node,
        kể cả khi nhiều bước (CONTAINS, EXPORTS, IMPORTS, ...) cùng đụng tới nó.
        """
        existing = self.get_node(node.id)

        if existing is not None:
            existing.metadata.update(node.metadata)
            return existing

        self._node_index[node.id] = len(self.nodes)
        self.nodes.append(node)
        return node

    def add_edge(
        self,
        source: str,
        target: str,
        type: str,
        metadata: dict[str, Any] | None = None,
    ) -> GraphEdge | None:
        """
        Thêm edge. Bỏ qua (trả None) nếu source/target chưa tồn tại như
        node — tránh dangling edge làm hỏng render phía UI — và chống
        trùng edge cùng (source, target, type).
        """
        if not self.has_node(source) or not self.has_node(target):
            return None

        key = (source, target, type)

        if key in self._edge_seen:
            return None

        self._edge_seen.add(key)
        edge = GraphEdge(source=source, target=target, type=type, metadata=metadata or {})
        self.edges.append(edge)
        return edge

    def to_dict(self) -> dict[str, Any]:
        return {
            "nodes": [
                {"id": n.id, "type": n.type, "label": n.label, "metadata": n.metadata}
                for n in self.nodes
            ],
            "edges": [
                {"source": e.source, "target": e.target, "type": e.type, "metadata": e.metadata}
                for e in self.edges
            ],
            "statistics": {
                "nodeCount": len(self.nodes),
                "edgeCount": len(self.edges),
                "fileCount": sum(1 for n in self.nodes if n.type == "file"),
                "symbolCount": sum(1 for n in self.nodes if n.type == "symbol"),
                "packageCount": sum(1 for n in self.nodes if n.type == "package"),
            },
        }

    def to_json(self, **kwargs: Any) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, **kwargs)