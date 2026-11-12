"""Labs, equipment, reservations and dashboard stats."""

from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from lib.auth import get_current_user, require_admin
from lib.dates import now_local_iso
from lib.db import db
from lib.notify import cancel_resource_reservations, notify_cancellation
from models.schemas import (
    AvailabilityOut, CancelIn, Equipment, EquipmentIn, Lab, LabIn, Reservation, ReservationIn, StatsOut,
)

router = APIRouter(tags=["resources"])


# ---------- helpers ----------
def _overlap_filter(kind: str, resource_id: str, start: str, end: str) -> dict:
    # Times are fixed-width "YYYY-MM-DDTHH:MM" strings, so lexical comparison == chronological.
    return {
        "kind": kind, "resource_id": resource_id, "status": "confirmed",
        "start": {"$lt": end}, "end": {"$gt": start},
    }


async def _equipment_in_use(equipment_id: str, start: str, end: str) -> int:
    """Max concurrent quantity reserved in [start, end) — sweep over overlapping reservations."""
    docs = await db.reservations.find(
        _overlap_filter("equipment", equipment_id, start, end), {"_id": 0, "start": 1, "end": 1, "quantity": 1}
    ).to_list(5000)
    events: list[tuple[str, int]] = []
    for d in docs:
        events.append((max(d["start"], start), d["quantity"]))
        events.append((min(d["end"], end), -d["quantity"]))
    events.sort(key=lambda e: (e[0], e[1]))  # releases (-) before acquisitions at the same instant
    cur = peak = 0
    for _, delta in events:
        cur += delta
        peak = max(peak, cur)
    return peak


def _valid_range(start: str, end: str) -> None:
    if len(start) != 16 or len(end) != 16 or start[10] != "T" or end[10] != "T":
        raise HTTPException(status_code=422, detail="Formato de data/hora inválido (AAAA-MM-DDTHH:MM)")
    if end <= start:
        raise HTTPException(status_code=422, detail="O horário de término deve ser após o início")
    if start < now_local_iso():
        raise HTTPException(status_code=422, detail="Não é possível reservar no passado")


# ---------- Labs ----------
@router.get("/labs", response_model=List[Lab])
async def list_labs(_: dict = Depends(get_current_user)):
    now = now_local_iso()
    labs = await db.labs.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    busy = set(await db.reservations.distinct(
        "resource_id", {"kind": "lab", "status": "confirmed", "start": {"$lte": now}, "end": {"$gt": now}}
    ))
    return [Lab(**{**lab, "in_use_now": lab["id"] in busy}) for lab in labs]


@router.post("/labs", response_model=Lab)
async def create_lab(body: LabIn, _: dict = Depends(require_admin)):
    lab = Lab(**body.model_dump())
    await db.labs.insert_one(lab.model_dump(exclude={"in_use_now"}))
    return lab


@router.put("/labs/{lab_id}", response_model=Lab)
async def update_lab(lab_id: str, body: LabIn, _: dict = Depends(require_admin)):
    res = await db.labs.update_one({"id": lab_id}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Laboratório não encontrado")
    await db.reservations.update_many({"kind": "lab", "resource_id": lab_id}, {"$set": {"resource_name": body.name}})
    return Lab(id=lab_id, **body.model_dump())


@router.delete("/labs/{lab_id}")
async def delete_lab(lab_id: str, _: dict = Depends(require_admin)):
    res = await db.labs.delete_one({"id": lab_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Laboratório não encontrado")
    await cancel_resource_reservations("lab", lab_id, "O laboratório foi removido do sistema pelo administrador.")
    return {"ok": True}


@router.get("/labs/{lab_id}/schedule", response_model=List[Reservation])
async def lab_schedule(lab_id: str, date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
                       days: int = Query(1, ge=1, le=31),
                       _: dict = Depends(get_current_user)):
    """Confirmed bookings overlapping `days` days starting at `date` (1 = single day, 7 = a week)."""
    from datetime import date as _date, timedelta
    try:
        last = _date.fromisoformat(date) + timedelta(days=days - 1)
    except ValueError:
        raise HTTPException(status_code=422, detail="Data inválida")
    day_start, day_end = f"{date}T00:00", f"{last.isoformat()}T23:59"
    docs = await db.reservations.find(
        _overlap_filter("lab", lab_id, day_start, day_end), {"_id": 0}
    ).sort("start", 1).to_list(200)
    # Show who booked without exposing e-mails to other users.
    return [Reservation(**{**d, "user_email": ""}) for d in docs]


# ---------- Equipment ----------
@router.get("/equipment", response_model=List[Equipment])
async def list_equipment(_: dict = Depends(get_current_user)):
    now = now_local_iso()
    items = await db.equipment.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    pipeline = [
        {"$match": {"kind": "equipment", "status": "confirmed", "start": {"$lte": now}, "end": {"$gt": now}}},
        {"$group": {"_id": "$resource_id", "qty": {"$sum": "$quantity"}}},
    ]
    used = {d["_id"]: d["qty"] async for d in db.reservations.aggregate(pipeline)}
    return [Equipment(**{**it, "available_now": max(it["quantity"] - used.get(it["id"], 0), 0)}) for it in items]


@router.post("/equipment", response_model=Equipment)
async def create_equipment(body: EquipmentIn, _: dict = Depends(require_admin)):
    item = Equipment(**body.model_dump(), available_now=body.quantity)
    await db.equipment.insert_one(item.model_dump(exclude={"available_now"}))
    return item


@router.put("/equipment/{item_id}", response_model=Equipment)
async def update_equipment(item_id: str, body: EquipmentIn, _: dict = Depends(require_admin)):
    res = await db.equipment.update_one({"id": item_id}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    await db.reservations.update_many(
        {"kind": "equipment", "resource_id": item_id}, {"$set": {"resource_name": body.name}}
    )
    return Equipment(id=item_id, **body.model_dump(), available_now=body.quantity)


@router.delete("/equipment/{item_id}")
async def delete_equipment(item_id: str, _: dict = Depends(require_admin)):
    res = await db.equipment.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    await cancel_resource_reservations("equipment", item_id, "O equipamento foi removido do sistema pelo administrador.")
    return {"ok": True}


@router.get("/equipment/{item_id}/availability", response_model=AvailabilityOut)
async def equipment_availability(item_id: str, start: str, end: str, _: dict = Depends(get_current_user)):
    item = await db.equipment.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    in_use = await _equipment_in_use(item_id, start, end) if end > start else 0
    return AvailabilityOut(available=max(item["quantity"] - in_use, 0), total=item["quantity"])


# ---------- Reservations ----------
@router.post("/reservations", response_model=Reservation)
async def create_reservation(body: ReservationIn, user: dict = Depends(get_current_user)):
    _valid_range(body.start, body.end)
    if body.kind == "lab":
        lab = await db.labs.find_one({"id": body.resource_id}, {"_id": 0})
        if not lab:
            raise HTTPException(status_code=404, detail="Laboratório não encontrado")
        if not lab.get("active", True):
            raise HTTPException(status_code=409, detail="Laboratório indisponível no momento")
        if await db.reservations.find_one(_overlap_filter("lab", lab["id"], body.start, body.end)):
            raise HTTPException(status_code=409, detail="Conflito de horário: o laboratório já está reservado nesse período")
        name, qty = lab["name"], 1
    else:
        item = await db.equipment.find_one({"id": body.resource_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Equipamento não encontrado")
        if not item.get("active", True):
            raise HTTPException(status_code=409, detail="Equipamento indisponível no momento")
        in_use = await _equipment_in_use(item["id"], body.start, body.end)
        available = item["quantity"] - in_use
        if body.quantity > available:
            raise HTTPException(
                status_code=409,
                detail=f"Quantidade indisponível: apenas {max(available, 0)} unidade(s) livre(s) nesse período",
            )
        name, qty = item["name"], body.quantity

    reservation = Reservation(
        kind=body.kind, resource_id=body.resource_id, resource_name=name,
        user_id=user["id"], user_name=user["name"], user_email=user["email"],
        start=body.start, end=body.end, quantity=qty, purpose=body.purpose.strip(),
    )
    await db.reservations.insert_one(reservation.model_dump())
    return reservation


@router.get("/reservations/mine", response_model=List[Reservation])
async def my_reservations(user: dict = Depends(get_current_user)):
    docs = await db.reservations.find({"user_id": user["id"]}, {"_id": 0}).sort("start", -1).to_list(1000)
    return [Reservation(**d) for d in docs]


@router.get("/reservations", response_model=List[Reservation])
async def all_reservations(status: Optional[str] = None, _: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    docs = await db.reservations.find(q, {"_id": 0}).sort("start", -1).to_list(2000)
    return [Reservation(**d) for d in docs]


@router.post("/reservations/{reservation_id}/cancel", response_model=Reservation)
async def cancel_reservation(reservation_id: str, body: Optional[CancelIn] = Body(None),
                             user: dict = Depends(get_current_user)):
    q: dict = {"id": reservation_id}
    if user["role"] != "admin":
        q["user_id"] = user["id"]  # owners only; others get 404
    doc = await db.reservations.find_one(q, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
    if doc["status"] == "cancelled":
        raise HTTPException(status_code=409, detail="Reserva já cancelada")
    reason = (body.reason if body else "").strip()
    by_admin_for_other = user["role"] == "admin" and doc["user_id"] != user["id"]
    if by_admin_for_other and len(reason) < 3:
        raise HTTPException(status_code=422, detail="Informe o motivo do cancelamento")
    updates = {"status": "cancelled", "cancel_reason": reason, "cancelled_by": "admin" if by_admin_for_other else "user"}
    await db.reservations.update_one({"id": reservation_id}, {"$set": updates})
    if by_admin_for_other:
        await notify_cancellation(doc, reason)
    return Reservation(**{**doc, **updates})


# ---------- Stats ----------
@router.get("/stats", response_model=StatsOut)
async def stats(user: dict = Depends(get_current_user)):
    labs = await list_labs(user)
    equipment = await list_equipment(user)
    now = now_local_iso()
    mine = await db.reservations.count_documents(
        {"user_id": user["id"], "status": "confirmed", "end": {"$gt": now}}
    )
    return StatsOut(
        total_labs=len(labs),
        total_computers=sum(l.computers for l in labs),
        labs_in_use_now=sum(1 for l in labs if l.in_use_now),
        equipment_total=sum(e.quantity for e in equipment),
        equipment_available=sum(e.available_now for e in equipment),
        my_active_reservations=mine,
        now=now,
    )

