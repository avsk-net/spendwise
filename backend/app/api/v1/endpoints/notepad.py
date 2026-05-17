import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notepad_entry import NotepadEntry
from app.models.user import User
from app.schemas.notepad_entry import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(prefix="/notepad", tags=["notepad"])


@router.get("", response_model=list[NoteResponse])
async def list_notes(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotepadEntry)
        .where(NotepadEntry.user_id == user.id)
        .order_by(NotepadEntry.is_pinned.desc(), NotepadEntry.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = NotepadEntry(user_id=user.id, **data.model_dump())
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: uuid.UUID,
    data: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotepadEntry).where(
            NotepadEntry.id == note_id,
            NotepadEntry.user_id == user.id,
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Note not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(note, field, value)
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotepadEntry).where(
            NotepadEntry.id == note_id,
            NotepadEntry.user_id == user.id,
        )
    )
    note = result.scalar_one_or_none()
    if note:
        await db.delete(note)
        await db.commit()
