import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from routers import auth, projects, agents, tasks, memory, providers, system

from services.memory_manager import MemoryManager
from services.api_manager import api_manager # assuming it exists or initialized elsewhere, will import or init basic API manager later if needed

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize MemoryManager as a singleton
    # We will initialize a basic APIManager if it's imported, or just leave it None for now
    # based on what we have. Let's assume api_manager is available or we pass None.
    # We pass None here because AgentOrchestrator uses it anyway, but we should make sure MemoryManager has it if needed.
    # Actually, we can just instantiate it.
    app.state.memory_manager = MemoryManager(api_manager=api_manager)

    yield
    # Cleanup things here
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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")
