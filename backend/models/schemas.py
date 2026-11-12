import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

Role = Literal["user", "admin"]
UserType = Literal["aluno", "professor", "tecnico"]
ReservationKind = Literal["lab", "equipment"]
ReservationStatus = Literal["confirmed", "cancelled"]


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Users / auth ----------
class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    user_type: UserType


class GoogleLoginIn(BaseModel):
    credential: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: str
    password: str


# ---------- Labs ----------
class LabIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=1, max_length=150)
    computers: int = Field(ge=0, le=1000)
    capacity: int = Field(ge=1, le=1000)
    description: str = ""
    specs: str = ""
    active: bool = True


class Lab(LabIn):
    id: str = Field(default_factory=_uuid)
    in_use_now: bool = False


# ---------- Equipment ----------
class EquipmentIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    category: str = Field(min_length=1, max_length=60)
    quantity: int = Field(ge=0, le=10000)
    description: str = ""
    specs: str = ""
    active: bool = True


class Equipment(EquipmentIn):
    id: str = Field(default_factory=_uuid)
    available_now: int = 0


class AvailabilityOut(BaseModel):
    available: int
    total: int


# ---------- Reservations ----------
class ReservationIn(BaseModel):
    kind: ReservationKind
    resource_id: str
    start: str  # "YYYY-MM-DDTHH:MM" local campus time
    end: str
    quantity: int = Field(default=1, ge=1, le=1000)
    purpose: str = Field(default="", max_length=300)


class Reservation(BaseModel):
    id: str = Field(default_factory=_uuid)
    kind: ReservationKind
    resource_id: str
    resource_name: str
    user_id: str
    user_name: str
    user_email: str
    start: str
    end: str
    quantity: int = 1
    purpose: str = ""
    status: ReservationStatus = "confirmed"
    cancel_reason: str = ""
    cancelled_by: str = ""  # "" | "user" | "admin"
    created_at: datetime = Field(default_factory=_now)


class CancelIn(BaseModel):
    reason: str = Field(default="", max_length=500)


class Notification(BaseModel):
    id: str
    user_id: str
    reservation_id: str = ""
    title: str
    message: str
    reason: str = ""
    read: bool = False
    created_at: datetime


# ---------- Stats ----------
class StatsOut(BaseModel):
    total_labs: int
    total_computers: int
    labs_in_use_now: int
    equipment_total: int
    equipment_available: int
    my_active_reservations: int
    now: str
