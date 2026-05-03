with open('NeuralForge/backend/routers/memory.py', 'r') as f:
    content = f.read()

content = content.replace("router.get('/{project_id}/memory/episodes')", "router.get('/api/projects/{project_id}/memory/episodes')")
content = content.replace("router.get('/{project_id}/memory/knowledge')", "router.get('/api/projects/{project_id}/memory/knowledge')")
content = content.replace("router.post('/{project_id}/memory/knowledge')", "router.post('/api/projects/{project_id}/memory/knowledge')")
content = content.replace("router.delete('/{project_id}/memory/knowledge/{item_id}')", "router.delete('/api/projects/{project_id}/memory/knowledge/{item_id}')")
content = content.replace("router.post('/{project_id}/memory/search')", "router.post('/api/projects/{project_id}/memory/search')")
content = content.replace("router.post('/{project_id}/memory/compress')", "router.post('/api/projects/{project_id}/memory/compress')")
content = content.replace("router.delete('/{project_id}/memory/clear')", "router.delete('/api/projects/{project_id}/memory/clear')")

with open('NeuralForge/backend/routers/memory.py', 'w') as f:
    f.write(content)
