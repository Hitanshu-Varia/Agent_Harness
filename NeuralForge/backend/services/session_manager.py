import json
import uuid
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import redis.asyncio as redis

from config import settings

class Session(BaseModel):
    session_id: str
    project_id: str
    user_task: str
    status: str
    task_plan: Optional[dict] = None
    agents: Optional[dict] = None
    started_at: str

class ProjectSessionManager:
    def __init__(self):
        self.redis_pool: Optional[redis.Redis] = None

    async def connect_redis(self):
        if not self.redis_pool:
            self.redis_pool = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def disconnect_redis(self):
        if self.redis_pool:
            await self.redis_pool.aclose()

    async def create_session(self, project_id: str, user_task: str) -> Session:
        await self.connect_redis()
        session_id = str(uuid.uuid4())
        session = Session(
            session_id=session_id,
            project_id=project_id,
            user_task=user_task,
            status="starting",
            started_at=datetime.utcnow().isoformat()
        )

        # Store in Redis with TTL 24h
        session_key = f"session:{session_id}"
        await self.redis_pool.setex(
            session_key,
            86400, # 24h in seconds
            session.model_dump_json()
        )

        # Add to project's list of sessions
        await self.redis_pool.lpush(f"project:{project_id}:sessions", session_id)
        # Keep only the last 50 sessions per project in redis list (optional cleanup)
        await self.redis_pool.ltrim(f"project:{project_id}:sessions", 0, 49)

        return session

    async def get_session(self, session_id: str) -> Optional[Session]:
        await self.connect_redis()
        session_data = await self.redis_pool.get(f"session:{session_id}")
        if session_data:
            return Session.model_validate_json(session_data)
        return None

    async def update_session(self, session_id: str, updates: dict):
        await self.connect_redis()
        session_key = f"session:{session_id}"
        session_data = await self.redis_pool.get(session_key)
        if session_data:
            session = Session.model_validate_json(session_data)
            session_dict = session.model_dump()
            session_dict.update(updates)
            updated_session = Session(**session_dict)

            # Keep the remaining TTL instead of resetting to 24h
            ttl = await self.redis_pool.ttl(session_key)
            if ttl > 0:
                await self.redis_pool.setex(
                    session_key,
                    ttl,
                    updated_session.model_dump_json()
                )

    async def end_session(self, session_id: str, final_summary: str):
        await self.update_session(session_id, {"status": "completed", "final_summary": final_summary})
        # Could also persist to DB here if we had a persistent session table

    async def list_sessions(self, project_id: str) -> List[Session]:
        await self.connect_redis()
        session_ids = await self.redis_pool.lrange(f"project:{project_id}:sessions", 0, -1)
        sessions = []
        for sid in session_ids:
            session_data = await self.redis_pool.get(f"session:{sid}")
            if session_data:
                sessions.append(Session.model_validate_json(session_data))
        return sessions

    async def restore_session(self, session_id: str) -> Optional[Session]:
        # Essentially just get_session for now, but could include more logic
        # to rehydrate active state if needed
        return await self.get_session(session_id)
