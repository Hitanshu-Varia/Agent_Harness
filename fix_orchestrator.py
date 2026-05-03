with open('NeuralForge/backend/services/orchestrator.py', 'r') as f:
    content = f.read()

if "def __init__(self, project_id: str, capacity_report: CapacityReport, api_manager: Any, memory_manager: Any, ws_manager: Any):" in content:
    content = content.replace(
        "def __init__(self, project_id: str, capacity_report: CapacityReport, api_manager: Any, memory_manager: Any, ws_manager: Any):",
        "def __init__(self, project_id: str, capacity_report: 'CapacityReport', api_manager: Any, memory_manager: Any = None, ws_manager: Any = None):"
    )

with open('NeuralForge/backend/services/orchestrator.py', 'w') as f:
    f.write(content)
