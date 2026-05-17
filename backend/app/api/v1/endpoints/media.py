import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter()


@router.get("/media/{path:path}")
async def serve_media(path: str):
    file_path = os.path.realpath(os.path.join(settings.MEDIA_DIR, path))
    media_root = os.path.realpath(settings.MEDIA_DIR)
    if not file_path.startswith(media_root + os.sep):
        raise HTTPException(status_code=403)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404)
    return FileResponse(file_path)
