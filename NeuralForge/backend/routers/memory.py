from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# The manager will be attached to app.state or accessible via dependency
def get_memory_manager(request: Request):
    manager = getattr(request.app.state, "memory_manager", None)
    if not manager:
        raise HTTPException(status_code=500, detail="MemoryManager not initialized")
    return manager

@router.get('/api/projects/{project_id}/memory/episodes')
async def list_episodes(
    project_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    manager = Depends(get_memory_manager)
):
    try:
        collection_name = manager._get_episodes_collection_name(project_id)
        collection = await manager.chroma.get_collection(collection_name)
    except Exception:
        return {"items": [], "total": 0, "page": page, "pages": 0}

    # Simplistic pagination, fetch a large chunk and sort.
    # In a real system, we might need a better DB or specific Chroma techniques.
    res = await collection.get()

    items = []
    if res and res["ids"]:
        for i in range(len(res["ids"])):
            items.append({
                "id": res["ids"][i],
                "content": res["documents"][i],
                "metadata": res["metadatas"][i] if res["metadatas"] else {}
            })

    # Sort by timestamp descending
    items.sort(key=lambda x: x["metadata"].get("timestamp", 0), reverse=True)

    total = len(items)
    start = (page - 1) * limit
    end = start + limit

    paginated_items = items[start:end]

    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get('/api/projects/{project_id}/memory/knowledge')
async def list_knowledge(
    project_id: str,
    manager = Depends(get_memory_manager)
):
    try:
        collection_name = manager._get_knowledge_collection_name(project_id)
        collection = await manager.chroma.get_collection(collection_name)
    except Exception:
        return {"items": []}

    res = await collection.get()

    items = []
    if res and res["ids"]:
        for i in range(len(res["ids"])):
            items.append({
                "id": res["ids"][i],
                "content": res["documents"][i],
                "metadata": res["metadatas"][i] if res["metadatas"] else {}
            })

    # Sort by timestamp descending
    items.sort(key=lambda x: x["metadata"].get("timestamp", 0), reverse=True)

    return {"items": items}

class KnowledgeCreate(BaseModel):
    content: str
    source: str = "manual"
    tags: List[str] = []

@router.post('/api/projects/{project_id}/memory/knowledge')
async def create_knowledge(
    project_id: str,
    knowledge: KnowledgeCreate,
    manager = Depends(get_memory_manager)
):
    await manager.add_knowledge(
        project_id=project_id,
        content=knowledge.content,
        source=knowledge.source,
        tags=knowledge.tags
    )
    return {"message": "Knowledge added successfully"}

@router.delete('/api/projects/{project_id}/memory/knowledge/{item_id}')
async def delete_knowledge(
    project_id: str,
    item_id: str,
    manager = Depends(get_memory_manager)
):
    try:
        collection_name = manager._get_knowledge_collection_name(project_id)
        collection = await manager.chroma.get_collection(collection_name)
        await collection.delete(ids=[item_id])
        return {"message": "Knowledge deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5
    memory_type: str = "all"

@router.post('/api/projects/{project_id}/memory/search')
async def search_memory(
    project_id: str,
    search: SearchRequest,
    manager = Depends(get_memory_manager)
):
    results = await manager.retrieve_relevant(
        project_id=project_id,
        query=search.query,
        n_results=search.n_results,
        memory_type=search.memory_type
    )
    return {"items": [item.to_dict() for item in results]}

@router.post('/api/projects/{project_id}/memory/compress')
async def compress_memory(
    project_id: str,
    manager = Depends(get_memory_manager)
):
    await manager.compress_memory(project_id)
    return {"message": "Memory compression triggered"}

class ClearMemoryRequest(BaseModel):
    tier: str = "working"

@router.delete('/api/projects/{project_id}/memory/clear')
async def clear_memory(
    project_id: str,
    req: ClearMemoryRequest,
    manager = Depends(get_memory_manager)
):
    await manager.clear_project_memory(project_id, req.tier)
    return {"message": f"{req.tier} memory cleared successfully"}
