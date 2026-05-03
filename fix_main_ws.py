import re

with open('NeuralForge/backend/main.py', 'r') as f:
    content = f.read()

# Add stream replay logic to websocket
ws_code = """
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
"""
content = re.sub(r'@app\.websocket\("/ws/projects/\{project_id\}"\).*?        while True:\n', ws_code, content, flags=re.DOTALL)

with open('NeuralForge/backend/main.py', 'w') as f:
    f.write(content)
