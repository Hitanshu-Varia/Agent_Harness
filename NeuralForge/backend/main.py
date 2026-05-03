import asyncio
import json
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine
from routers import auth, projects, agents, tasks, memory, providers, system

from services.memory_manager import MemoryManager
from services.api_manager import APIManager
from services.ws_manager import WebSocketManager
from services.session_manager import ProjectSessionManager
from services.hardware_evaluator import HardwareEvaluator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize singletons
    api_manager = APIManager()
    app.state.api_manager = api_manager
    app.state.memory_manager = MemoryManager(api_manager=api_manager)
    app.state.ws_manager = WebSocketManager()
    app.state.session_manager = ProjectSessionManager()
    app.state.hardware_evaluator = HardwareEvaluator()
    app.state.active_orchestrators = {}

    yield

    # Cleanup
    for project_id, conns in app.state.ws_manager.connections.items():
        for client_id in list(conns.keys()):
            await app.state.ws_manager.disconnect(project_id, client_id)

    await app.state.ws_manager.disconnect_redis()
    await app.state.session_manager.disconnect_redis()
    await engine.dispose()

app = FastAPI(title="NeuralForge API", lifespan=lifespan)
app.include_router(auth.router, prefix="/auth")
app.include_router(projects.router, prefix="/projects")
app.include_router(agents.router, prefix="/agents")
app.include_router(tasks.router, prefix="/tasks")
app.include_router(memory.router)
app.include_router(providers.router, prefix="/providers")
app.include_router(system.router, prefix="/system")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to NeuralForge API"}


@app.websocket("/ws/projects/{project_id}")
async def project_websocket_endpoint(websocket: WebSocket, project_id: str):
    client_id = str(uuid.uuid4())
    ws_manager: WebSocketManager = websocket.app.state.ws_manager
    session_manager: ProjectSessionManager = websocket.app.state.session_manager

    await ws_manager.connect(websocket, project_id, client_id)

    try:
        # Replay last 50 events from redis stream
        await ws_manager.connect_redis()
        if ws_manager.redis_pool:
            try:
                stream_key = f"project:{project_id}:stream"
                # get all available events (we set maxlen=50 when adding)
                messages = await ws_manager.redis_pool.xrange(stream_key, min="-", max="+")
                for msg_id, fields in messages:
                    if "event" in fields:
                        event_data = json.loads(fields["event"])
                        await ws_manager.send_personal(client_id, project_id, event_data)
            except Exception as e:
                print(f"Failed to replay stream: {e}")

        while True:
            # Wait for messages with a timeout to allow ping/pong checks
            try:
                data_text = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                data = json.loads(data_text)

                if data.get("type") == "ping":
                    await ws_manager.send_personal(client_id, project_id, {"type": "pong"})
                elif data.get("type") == "stop":
                    # Call stop logic
                    if hasattr(websocket.app.state, 'active_orchestrators') and project_id in websocket.app.state.active_orchestrators:
                        orchestrator = websocket.app.state.active_orchestrators[project_id]
                        await orchestrator.terminate_all()
                        del websocket.app.state.active_orchestrators[project_id]
                # User message logic to start runs might be better handled by HTTP POST /run,
                # but if we want to handle user_message via WS:
                elif data.get("type") == "user_message":
                    pass # Often HTTP is easier for complex requests, but we can handle basic ones here if needed

            except asyncio.TimeoutError:
                # Send a ping to client to check if alive
                try:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                except Exception:
                    break # Connection dead

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS error: {e}")
    finally:
        await ws_manager.disconnect(project_id, client_id)
