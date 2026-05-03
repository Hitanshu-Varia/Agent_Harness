import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from routers import auth, projects, agents, tasks, memory, providers, system

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize things here
    # e.g., connect to database
    yield
    # Cleanup things here
    await engine.dispose()

app = FastAPI(title="NeuralForge API", lifespan=lifespan)
app.include_router(auth.router, prefix="/auth")
app.include_router(projects.router, prefix="/projects")
app.include_router(agents.router, prefix="/agents")
app.include_router(tasks.router, prefix="/tasks")
app.include_router(memory.router, prefix="/memory")
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
