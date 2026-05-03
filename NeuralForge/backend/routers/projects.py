from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()

# Dependency or mock state for now. In main.py we will add singletons to app.state
def get_session_manager(request: Request):
    return request.app.state.session_manager

def get_orchestrator(request: Request):
    # Depending on how the system is wired, we might need a factory or we create one per run.
    # For now, let's assume we import AgentOrchestrator and instantiate it.
    from services.orchestrator import AgentOrchestrator
    # We will need capacity report, we can mock or get from app.state
    # Let's just create a basic dummy orchestrator setup.
    from services.hardware_evaluator import HardwareEvaluator

    # We will need to initialize this properly
    # This is complex because orchestrator takes many arguments. Let's simplify for the endpoint.
    return None

class RunRequest(BaseModel):
    user_task: str
    model_overrides: Optional[Dict[str, str]] = None
    max_agents: Optional[int] = None

@router.post('')
async def create_project(name: str, description: Optional[str] = None):
    # Mock create
    return {"id": "proj-123", "name": name, "description": description}

@router.get('')
async def list_projects():
    # Mock list
    return [{"id": "proj-123", "name": "Test Project"}]

@router.get('/{id}')
async def get_project(id: str):
    # Mock get
    return {"id": id, "name": "Test Project"}

@router.delete('/{id}')
async def delete_project(id: str):
    return {"status": "deleted"}

@router.post('/{id}/run')
async def start_run(id: str, request_data: RunRequest, request: Request, background_tasks: BackgroundTasks):
    session_manager = get_session_manager(request)

    # 1. Create session
    session = await session_manager.create_session(id, request_data.user_task)

    # Imports inside to avoid circular dependencies if needed
    from services.orchestrator import AgentOrchestrator

    # Access singletons from app state
    ws_manager = request.app.state.ws_manager
    memory_manager = request.app.state.memory_manager
    api_manager = getattr(request.app.state, 'api_manager', None) # Or import it
    hardware_evaluator = request.app.state.hardware_evaluator

    # 2. Validate capacity
    capacity_report = hardware_evaluator.evaluate()
    if request_data.max_agents:
        capacity_report.max_agents = min(capacity_report.max_agents, request_data.max_agents)

    orchestrator = AgentOrchestrator(
        project_id=id,
        capacity_report=capacity_report,
        api_manager=api_manager,
        memory_manager=memory_manager,
        ws_manager=ws_manager
    )

    # 3. Decompose task -> broadcasts task_plan event inside decompose_task optionally
    # But orchestrator.decompose_task might not broadcast directly, we might need to.
    task_plan = await orchestrator.decompose_task(request_data.user_task)
    if not task_plan:
        raise HTTPException(status_code=500, detail="Failed to decompose task")

    await session_manager.update_session(session.session_id, {"task_plan": task_plan.model_dump()})

    # 4. Spawn orchestrator run in background
    background_tasks.add_task(orchestrator.run_task_plan, task_plan, context={"user_task": request_data.user_task})

    # Store orchestrator in app state so we can stop it later
    if not hasattr(request.app.state, 'active_orchestrators'):
        request.app.state.active_orchestrators = {}
    request.app.state.active_orchestrators[id] = orchestrator

    return {
        "session_id": session.session_id,
        "estimated_agents": task_plan.estimated_agents_needed,
        "task_plan": task_plan.model_dump()
    }

@router.post('/{id}/stop')
async def stop_run(id: str, request: Request):
    if hasattr(request.app.state, 'active_orchestrators') and id in request.app.state.active_orchestrators:
        orchestrator = request.app.state.active_orchestrators[id]
        await orchestrator.terminate_all()
        del request.app.state.active_orchestrators[id]
        return {"status": "stopped"}
    return {"status": "not running"}

@router.get('/{id}/sessions')
async def list_sessions(id: str, request: Request):
    session_manager = get_session_manager(request)
    return await session_manager.list_sessions(id)
