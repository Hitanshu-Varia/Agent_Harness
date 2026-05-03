with open('NeuralForge/backend/main.py', 'r') as f:
    content = f.read()

# Since memory.py router now has /api/projects/... in the paths, we should be careful about how it's included.
# app.include_router(memory.router, prefix="/memory") would make it /memory/api/projects/... which is wrong.
# If memory endpoints are meant to be under /projects/{id}/memory, and we included it with prefix "/memory",
# that's already wrong. Let's fix main.py so it's included correctly.

content = content.replace('app.include_router(memory.router, prefix="/memory")', 'app.include_router(memory.router)')

with open('NeuralForge/backend/main.py', 'w') as f:
    f.write(content)
