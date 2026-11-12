from typing import List

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user
from lib.db import db
from models.schemas import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[Notification])
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [Notification(**d) for d in docs]


@router.post("/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    res = await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"updated": res.modified_count}


@router.post("/{notification_id}/read", response_model=Notification)
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    q = {"id": notification_id, "user_id": user["id"]}  # owner-scoped; others get 404
    doc = await db.notifications.find_one(q, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    await db.notifications.update_one(q, {"$set": {"read": True}})
    return Notification(**{**doc, "read": True})
