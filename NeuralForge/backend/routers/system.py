from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.hardware_evaluator import HardwareEvaluator
import asyncio

router = APIRouter()

@router.get('/hardware')
async def get_hardware_info():
    hardware = await HardwareEvaluator.get_system_info()
    return hardware

@router.get('/capacity')
async def get_capacity():
    hardware = await HardwareEvaluator.get_system_info()
    capacity = await HardwareEvaluator.evaluate_capacity(hardware)
    return capacity

@router.get('/resources')
async def get_resources():
    resources = await HardwareEvaluator.monitor_resources()
    return resources

@router.websocket('/monitor')
async def websocket_monitor(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            resources = await HardwareEvaluator.monitor_resources()
            await websocket.send_json(resources.dict())
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
