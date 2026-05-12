from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.logging import logger

router = APIRouter(prefix="/ws", tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[user_id] = ws

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)

    async def send(self, user_id: str, payload: dict) -> None:
        ws = self._connections.get(user_id)
        if ws:
            await ws.send_json(payload)


manager = ConnectionManager()


@router.websocket("/{user_id}")
async def websocket_endpoint(ws: WebSocket, user_id: str):
    await manager.connect(user_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)