from fastapi import APIRouter
from app.blueprint.services.blueprint_service import build_codebase_graph


router = APIRouter()

@router.post("/blueprint/graph")
def create_graph(request: str):
    graph = build_codebase_graph(request)
    return graph.to_dict()