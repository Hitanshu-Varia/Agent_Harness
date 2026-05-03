import re

with open('NeuralForge/backend/services/ws_manager.py', 'r') as f:
    content = f.read()

# Fix concurrency issue: use a single listener task instead of one per project
content = content.replace(
"""        # Tasks listening to redis channels per project
        self._listener_tasks: Dict[str, asyncio.Task] = {}""",
"""        self._main_listener_task: Optional[asyncio.Task] = None"""
)

# Start single listener task if not already started
connect_code = """
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
"""
content = re.sub(r'    async def connect.*?        self\.connections\[project_id\]\[client_id\] = websocket\n', connect_code, content, flags=re.DOTALL)

disconnect_code = """
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
"""
content = re.sub(r'    async def disconnect.*?                    if self\.pubsub:\n                        await self\.pubsub\.unsubscribe\(f"project:\{project_id\}:events"\)\n', disconnect_code, content, flags=re.DOTALL)


listen_code = """
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
"""
content = re.sub(r'    async def _listen_to_redis.*?logger\.error\(f"Redis listener error for project \{project_id\}: \{e\}"\)\n', listen_code, content, flags=re.DOTALL)


broadcast_code = """
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
"""
content = re.sub(r'    async def broadcast.*?await self\.redis_pool\.publish\(f"project:\{project_id\}:events", json\.dumps\(event\)\)\n', broadcast_code, content, flags=re.DOTALL)


with open('NeuralForge/backend/services/ws_manager.py', 'w') as f:
    f.write(content)
