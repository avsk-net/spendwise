from fastapi import WebSocket

from app.core.logging import logger


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[user_id] = ws
        logger.info("WS connected: user=%s active=%d", user_id, len(self._connections))

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)
        logger.info("WS disconnected: user=%s active=%d", user_id, len(self._connections))

    async def send(self, user_id: str, payload: dict) -> None:
        ws = self._connections.get(user_id)
        if not ws:
            return
        try:
            await ws.send_json(payload)
        except Exception as exc:
            logger.warning("WS send failed for user=%s: %s", user_id, exc)
            self.disconnect(user_id)


manager = ConnectionManager()
