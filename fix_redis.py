import re

with open('NeuralForge/backend/services/ws_manager.py', 'r') as f:
    content = f.read()

# Add connect_redis and disconnect_redis methods
connect_methods = """
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
"""

content = re.sub(r'    async def connect\(self, websocket: WebSocket, project_id: str, client_id: str\):\n', connect_methods, content, flags=re.DOTALL)

with open('NeuralForge/backend/services/ws_manager.py', 'w') as f:
    f.write(content)
