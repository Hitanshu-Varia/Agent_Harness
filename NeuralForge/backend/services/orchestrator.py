import uuid
import asyncio
from datetime import datetime
from typing import List, Dict, Optional, Any, Literal
from pydantic import BaseModel, Field

from services.base_agent import (
    BaseAgent,
    CoordinatorAgent,
    ArchitectAgent,
    BuilderAgent,
    ReviewerAgent,
    TesterAgent,
    SecurityAgent,
    ResearcherAgent,
    DebuggerAgent
)

AGENT_TYPES = {
    "coordinator": CoordinatorAgent,
    "architect": ArchitectAgent,
    "builder": BuilderAgent,
    "reviewer": ReviewerAgent,
    "tester": TesterAgent,
    "security": SecurityAgent,
    "researcher": ResearcherAgent,
    "debugger": DebuggerAgent,
}

AgentStatus = Literal["idle", "thinking", "working", "waiting", "done", "error"]

class AgentInstance(BaseModel):
    agent_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: str
    name: str
    status: AgentStatus = "idle"
    current_task_id: Optional[str] = None
    assigned_model: str
    assigned_provider: str
    assigned_api_key_alias: str = ""
    messages: List[Dict[str, str]] = Field(default_factory=list)
    memory_context: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tokens_used: int = 0
    output_log: List[str] = Field(default_factory=list)

class SubTask(BaseModel):
    id: str
    title: str
    agent_type: str
    depends_on: List[str] = Field(default_factory=list)
    priority: int = 1

class TaskPlan(BaseModel):
    subtasks: List[SubTask]
    estimated_agents_needed: int
    rationale: str

class TaskResult(BaseModel):
    task_id: str
    status: Literal["success", "error"]
    result: Any
    error_message: Optional[str] = None

class CapacityReport:
    def __init__(self, max_agents: int = 4):
        self.max_agents = max_agents

class AgentOrchestrator:
    def __init__(self, project_id: str, capacity_report: CapacityReport, api_manager: Any, memory_manager: Any, ws_manager: Any):
        self.project_id = project_id
        self.capacity_report = capacity_report
        self.api_manager = api_manager
        self.memory_manager = memory_manager
        self.ws_manager = ws_manager
        self.active_agents: Dict[str, AgentInstance] = {}
        self.running_tasks: List[asyncio.Task] = []
        self._shutdown_event = asyncio.Event()

    async def decompose_task(self, user_task: str) -> Optional[TaskPlan]:
        coordinator = CoordinatorAgent()
        messages = coordinator.build_messages(task=user_task)

        # This assumes self.api_manager.call_llm can be used like this
        # Using a dummy db session as it's typically required, but we might not have it here
        # We will need to adapt based on how api_manager is exactly called
        try:
            # We will use the orchestrator to call a basic model for coordination
            response_chunks = []
            async for chunk in self.api_manager.call_llm(
                db=None,  # We might need to pass db session here if api_manager strictly requires it
                provider="openai",  # Defaulting, or should come from config
                model="gpt-4o",    # Defaulting
                messages=messages,
                system_prompt=coordinator.system_prompt,
                stream=False # For decomposition, we can just wait for full
            ):
                if isinstance(chunk, str):
                   response_chunks.append(chunk)
                elif isinstance(chunk, dict) and "content" in chunk:
                   response_chunks.append(chunk["content"])

            full_response = "".join(response_chunks)
            parsed_plan = coordinator.parse_structured_output(full_response)

            if parsed_plan:
                plan = TaskPlan(**parsed_plan)
                if plan.estimated_agents_needed > self.capacity_report.max_agents:
                    # In a real app, we might handle this differently, but for now we cap it
                    plan.estimated_agents_needed = self.capacity_report.max_agents
                return plan
            return None
        except Exception as e:
            print(f"Error decomposing task: {e}")
            return None

    async def spawn_agent(self, agent_type: str, model: str, provider: str, db=None) -> AgentInstance:
        active_count = sum(1 for a in self.active_agents.values() if a.status not in ("done", "error"))
        if active_count >= self.capacity_report.max_agents:
            raise Exception("Capacity limit reached")

        count = sum(1 for a in self.active_agents.values() if a.agent_type == agent_type)
        name = f"{agent_type.capitalize()}-{count + 1}"

        # Get active key
        api_key_alias = "default-key"
        if hasattr(self.api_manager, "get_active_key"):
            try:
                key_obj = await self.api_manager.get_active_key(db, provider)
                if key_obj:
                    api_key_alias = getattr(key_obj, "alias", api_key_alias)
            except Exception:
                pass

        agent = AgentInstance(
            agent_type=agent_type,
            name=name,
            assigned_model=model,
            assigned_provider=provider,
            assigned_api_key_alias=api_key_alias
        )
        self.active_agents[agent.agent_id] = agent

        await self.ws_manager.broadcast(self.project_id, {
            "type": "agent_spawned",
            "agent": agent.model_dump(mode='json')
        })
        return agent

    async def run_task_plan(self, task_plan: TaskPlan, context: dict, db=None):
        await self.ws_manager.broadcast(self.project_id, {
            "type": "task_plan",
            "plan": task_plan.model_dump(mode='json')
        })

        results: Dict[str, TaskResult] = {}

        # Helper to get independent tasks
        def get_ready_tasks():
            ready = []
            for t in task_plan.subtasks:
                if t.id not in results and all(dep in results and results[dep].status == "success" for dep in t.depends_on):
                    ready.append(t)
            return ready

        # Topological sort execution
        while len(results) < len(task_plan.subtasks) and not self._shutdown_event.is_set():
            ready_tasks = get_ready_tasks()
            if not ready_tasks:
                # Might be circular dependency or failed dependencies
                # If we have tasks left but none ready, some dependency failed
                break

            # Limit to max agents
            tasks_to_run = ready_tasks[:self.capacity_report.max_agents]

            async def execute_and_record(subtask):
                try:
                    # Default model/provider for now
                    agent = await self.spawn_agent(subtask.agent_type, "gpt-4o", "openai", db=db)
                    result = await self.run_agent_task(agent, subtask, context, results, db=db)
                    results[subtask.id] = result
                    return result
                except Exception as e:
                    res = TaskResult(task_id=subtask.id, status="error", result=None, error_message=str(e))
                    results[subtask.id] = res
                    return res

            execution_tasks = [asyncio.create_task(execute_and_record(t)) for t in tasks_to_run]
            self.running_tasks.extend(execution_tasks)

            await asyncio.gather(*execution_tasks)

            # Clean up finished tasks from tracking
            for t in execution_tasks:
                if t in self.running_tasks:
                    self.running_tasks.remove(t)

    async def run_agent_task(self, agent: AgentInstance, subtask: SubTask, context: dict, previous_results: dict, db=None) -> TaskResult:
        agent.status = "working"
        agent.current_task_id = subtask.id
        agent.updated_at = datetime.utcnow()
        await self._broadcast_status(agent)

        await self.ws_manager.broadcast(self.project_id, {
            "type": "task_started",
            "task_id": subtask.id,
            "agent_id": agent.agent_id
        })

        agent_class = AGENT_TYPES.get(agent.agent_type, BaseAgent)
        agent_impl = agent_class() if agent_class != BaseAgent else BaseAgent(agent.agent_type)

        # Prepare context from dependencies
        dep_context = {dep: previous_results[dep].result for dep in subtask.depends_on if dep in previous_results}
        merged_context = {**context, **dep_context}

        messages = agent_impl.build_messages(
            task=subtask.title,
            context=merged_context,
            memory_context=agent.memory_context,
            history=agent.messages
        )

        full_output = ""
        try:
            async for chunk in self.api_manager.call_llm(
                db=db,
                provider=agent.assigned_provider,
                model=agent.assigned_model,
                messages=messages,
                system_prompt=agent_impl.system_prompt,
                stream=True,
                agent_id=agent.agent_id
            ):
                if self._shutdown_event.is_set():
                    break

                token = chunk
                if isinstance(chunk, dict) and "content" in chunk:
                    token = chunk["content"]

                if token:
                    full_output += token
                    agent.output_log.append(token)
                    await self.ws_manager.broadcast(self.project_id, {
                        "type": "agent_token",
                        "agent_id": agent.agent_id,
                        "token": token
                    })

            agent.messages.append({"role": "assistant", "content": full_output})
            parsed_result = agent_impl.parse_structured_output(full_output)
            final_result = parsed_result if parsed_result else full_output

            agent.status = "done"
            agent.updated_at = datetime.utcnow()
            agent.current_task_id = None
            await self._broadcast_status(agent)

            await self.ws_manager.broadcast(self.project_id, {
                "type": "agent_done",
                "agent_id": agent.agent_id,
                "result_preview": str(final_result)[:200]
            })

            await self.ws_manager.broadcast(self.project_id, {
                "type": "task_complete",
                "task_id": subtask.id,
                "status": "success"
            })

            return TaskResult(task_id=subtask.id, status="success", result=final_result)

        except Exception as e:
            agent.status = "error"
            agent.updated_at = datetime.utcnow()
            agent.current_task_id = None
            await self._broadcast_status(agent)

            await self.ws_manager.broadcast(self.project_id, {
                "type": "task_complete",
                "task_id": subtask.id,
                "status": "error"
            })
            return TaskResult(task_id=subtask.id, status="error", result=None, error_message=str(e))

    async def _broadcast_status(self, agent: AgentInstance):
        await self.ws_manager.broadcast(self.project_id, {
            "type": "agent_status",
            "agent_id": agent.agent_id,
            "status": agent.status
        })

    async def terminate_all(self):
        self._shutdown_event.set()
        for task in self.running_tasks:
            if not task.done():
                task.cancel()

        for agent in self.active_agents.values():
            agent.status = "idle"
            agent.current_task_id = None
            agent.updated_at = datetime.utcnow()
            # Try to broadcast but ignore if it fails during shutdown
            try:
                await self._broadcast_status(agent)
            except Exception:
                pass
