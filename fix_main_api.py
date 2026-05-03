with open('NeuralForge/backend/main.py', 'r') as f:
    content = f.read()

content = content.replace("app.state.memory_manager = MemoryManager()", "app.state.memory_manager = MemoryManager(api_manager=api_manager)")

with open('NeuralForge/backend/main.py', 'w') as f:
    f.write(content)
