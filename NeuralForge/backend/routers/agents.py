from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, Any, List
import json
import uuid

# Dummy dependencies, adjust to real ones when running
# from core.dependencies import get_db, get_current_user

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Dict[project_id, List[WebSocket]]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            # Create a list of tasks to send messages concurrently
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to connection: {e}")
                    # Might want to remove connection if it's dead

manager = ConnectionManager()

# Global orchestrator mock for now, in reality you'd probably attach this to app state
# or a dependency injected singleton
ORCHESTRATORS: Dict[str, Any] = {}

@router.get('/api/agents')
async def list_agents(project_id: str):
    """List active agents for current project."""
    if project_id not in ORCHESTRATORS:
        return []
    orchestrator = ORCHESTRATORS[project_id]
    return [agent.model_dump() for agent in orchestrator.active_agents.values()]

@router.post('/api/agents/spawn')
async def spawn_agent(project_id: str, agent_type: str, model: str = "gpt-4o", provider: str = "openai"):
    """Manually spawn an agent."""
    if project_id not in ORCHESTRATORS:
        raise HTTPException(status_code=404, detail="Project orchestrator not found")

    orchestrator = ORCHESTRATORS[project_id]
    try:
        agent = await orchestrator.spawn_agent(agent_type=agent_type, model=model, provider=provider)
        return {"status": "success", "agent": agent.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete('/api/agents/{agent_id}')
async def terminate_agent(project_id: str, agent_id: str):
    """Terminate an agent."""
    if project_id not in ORCHESTRATORS:
        raise HTTPException(status_code=404, detail="Project orchestrator not found")

    orchestrator = ORCHESTRATORS[project_id]
    if agent_id in orchestrator.active_agents:
        agent = orchestrator.active_agents[agent_id]
        agent.status = "idle"  # Or "terminated"
        # Not fully deleting to keep logs, or delete based on requirement
        return {"status": "success", "message": f"Agent {agent_id} terminated"}
    raise HTTPException(status_code=404, detail="Agent not found")

@router.get('/api/agents/{agent_id}/log')
async def get_agent_log(project_id: str, agent_id: str):
    """Get full output log."""
    if project_id not in ORCHESTRATORS:
        raise HTTPException(status_code=404, detail="Project orchestrator not found")

    orchestrator = ORCHESTRATORS[project_id]
    if agent_id in orchestrator.active_agents:
        agent = orchestrator.active_agents[agent_id]
        return {"log": agent.output_log}
    raise HTTPException(status_code=404, detail="Agent not found")

@router.websocket('/ws/agents/{project_id}')
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            # We don't necessarily expect clients to send much here, mostly receiving
            data = await websocket.receive_text()
            # Handle any incoming WS commands if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
