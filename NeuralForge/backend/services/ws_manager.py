import asyncio
import json
import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket

from config import settings
import redis.asyncio as redis

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        # connections[project_id][client_id] = websocket
        self.connections: Dict[str, Dict[str, WebSocket]] = {}
        self._main_listener_task: Optional[asyncio.Task] = None
        self.redis_pool: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None



    async def connect_redis(self):
        if not self.redis_pool:
            self.redis_pool = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.pubsub = self.redis_pool.pubsub()

    async def disconnect_redis(self):
        if self.pubsub:
            await self.pubsub.close()
        if self.redis_pool:
            await self.redis_pool.aclose()

    async def connect(self, websocket: WebSocket, project_id: str, client_id: str):
        await websocket.accept()

        if project_id not in self.connections:
            self.connections[project_id] = {}

            # Subscribe to redis channel for this project
            await self.connect_redis()
            await self.pubsub.subscribe(f"project:{project_id}:events")

            if not self._main_listener_task:
                self._main_listener_task = asyncio.create_task(self._listen_to_redis())

        self.connections[project_id][client_id] = websocket


    async def disconnect(self, project_id: str, client_id: str):
        if project_id in self.connections and client_id in self.connections[project_id]:
            del self.connections[project_id][client_id]

            if len(self.connections[project_id]) == 0:
                del self.connections[project_id]

                # Unsubscribe
                if self.pubsub:
                    await self.pubsub.unsubscribe(f"project:{project_id}:events")

                if len(self.connections) == 0 and self._main_listener_task:
                    self._main_listener_task.cancel()
                    self._main_listener_task = None


    async def _listen_to_redis(self):
        try:
            while True:
                message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message['type'] == 'message':
                    channel = message['channel']
                    if channel.startswith("project:") and channel.endswith(":events"):
                        project_id = channel.split(":")[1]
                        try:
                            event_data = json.loads(message['data'])
                            # Ensure we don't double process if worker ID matches (if we added it), but we can just use Redis as single source of truth for broadcast to local clients.
                            # So in broadcast() we publish, and in listener we dispatch.

                            if project_id in self.connections:
                                dead_clients = []
                                for client_id, ws in self.connections[project_id].items():
                                    try:
                                        await ws.send_json(event_data)
                                    except Exception as e:
                                        logger.warning(f"Failed to send to client {client_id}: {e}")
                                        dead_clients.append(client_id)

                                for client_id in dead_clients:
                                    await self.disconnect(project_id, client_id)
                        except json.JSONDecodeError:
                            logger.error("Failed to decode redis message")
                await asyncio.sleep(0.01)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis listener error: {e}")


    async def broadcast(self, project_id: str, event: dict):
        # We store event in a stream "project:{project_id}:stream"
        await self.connect_redis()
        if self.redis_pool:
            # Add to redis stream
            try:
                await self.redis_pool.xadd(f"project:{project_id}:stream", {"event": json.dumps(event)}, maxlen=50)
            except Exception as e:
                logger.error(f"Failed to add to redis stream: {e}")

            # Publish to redis for all workers. The listener task will pick it up and forward to local clients.
            # This avoids double sending since we don't send directly to local clients here.
            await self.redis_pool.publish(f"project:{project_id}:events", json.dumps(event))

    async def broadcast_agent_token(self, project_id: str, agent_id: str, token: str):
        event = {
            "type": "agent_token",
            "agent_id": agent_id,
            "token": token
        }
        await self.broadcast(project_id, event)

    async def send_personal(self, client_id: str, project_id: str, event: dict):
        if project_id in self.connections and client_id in self.connections[project_id]:
            ws = self.connections[project_id][client_id]
            try:
                await ws.send_json(event)
            except Exception as e:
                 logger.warning(f"Failed to send personal to {client_id}: {e}")
                 await self.disconnect(project_id, client_id)

    async def get_connection_count(self, project_id: str) -> int:
        return len(self.connections.get(project_id, {}))
