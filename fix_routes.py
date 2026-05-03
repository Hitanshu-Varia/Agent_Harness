with open('NeuralForge/backend/routers/memory.py', 'r') as f:
    content = f.read()

content = content.replace("router.get('/{project_id}/episodes')", "router.get('/{project_id}/memory/episodes')")
content = content.replace("router.get('/{project_id}/knowledge')", "router.get('/{project_id}/memory/knowledge')")
content = content.replace("router.post('/{project_id}/knowledge')", "router.post('/{project_id}/memory/knowledge')")
content = content.replace("router.delete('/{project_id}/knowledge/{item_id}')", "router.delete('/{project_id}/memory/knowledge/{item_id}')")
content = content.replace("router.post('/{project_id}/search')", "router.post('/{project_id}/memory/search')")
content = content.replace("router.post('/{project_id}/compress')", "router.post('/{project_id}/memory/compress')")
content = content.replace("router.delete('/{project_id}/clear')", "router.delete('/{project_id}/memory/clear')")

with open('NeuralForge/backend/routers/memory.py', 'w') as f:
    f.write(content)
