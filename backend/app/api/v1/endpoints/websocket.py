from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.logging import logger
from app.core.security import decode_access_token
from app.services.ws_manager import manager

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    try:
        user_id = decode_access_token(token)
    except JWTError:
        await ws.close(code=4001, reason="Invalid token")
        return

    await manager.connect(user_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)
