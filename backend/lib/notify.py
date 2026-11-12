"""In-app notifications for reservation cancellations."""

import uuid
from datetime import datetime, timezone

from lib.db import db
from lib.dates import now_local_iso


def _fmt(iso: str) -> str:
    # "YYYY-MM-DDTHH:MM" -> "DD/MM/YYYY HH:MM"
    return f"{iso[8:10]}/{iso[5:7]}/{iso[0:4]} {iso[11:16]}"


async def notify_cancellation(reservation: dict, reason: str) -> None:
    what = "laboratório" if reservation["kind"] == "lab" else "equipamento"
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": reservation["user_id"],
        "reservation_id": reservation["id"],
        "title": f"Reserva cancelada: {reservation['resource_name']}",
        "message": f"Sua reserva de {what} para {_fmt(reservation['start'])} – {_fmt(reservation['end'])} "
                   f"foi cancelada pelo administrador.",
        "reason": reason,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })


async def cancel_resource_reservations(kind: str, resource_id: str, reason: str) -> None:
    """Cancel every confirmed reservation of a removed resource; notify owners of the ones not yet finished."""
    now = now_local_iso()
    q = {"kind": kind, "resource_id": resource_id, "status": "confirmed"}
    docs = await db.reservations.find(q, {"_id": 0}).to_list(5000)
    await db.reservations.update_many(
        q, {"$set": {"status": "cancelled", "cancel_reason": reason, "cancelled_by": "admin"}}
    )
    for d in docs:
        if d["end"] > now:
            await notify_cancellation(d, reason)
