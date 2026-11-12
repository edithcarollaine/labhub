import os
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response

from lib.auth import (
    clear_session_cookie, get_current_user, institutional_user_type, set_session_cookie, verify_password,
)
from lib.db import db
from models.schemas import GoogleLoginIn, LoginIn, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _public(user: dict) -> UserPublic:
    return UserPublic(**{k: user[k] for k in ("id", "name", "email", "role", "user_type")})


@router.post("/google", response_model=UserPublic)
async def google_login(body: GoogleLoginIn, response: Response):
    """Valida o ID token do Google e cria nossa sessão (somente contas institucionais)."""
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(GOOGLE_TOKENINFO_URL, params={"id_token": body.credential})
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Falha ao contatar o serviço de autenticação do Google")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Credencial do Google inválida ou expirada")
    data = r.json()
    if (
        data.get("aud") != os.environ["GOOGLE_CLIENT_ID"]
        or data.get("iss") not in GOOGLE_ISSUERS
        or str(data.get("email_verified")).lower() != "true"
    ):
        raise HTTPException(status_code=401, detail="Credencial do Google inválida")

    email = str(data.get("email", "")).lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    user_type = institutional_user_type(email)
    if not user_type and not (existing and existing.get("role") == "admin"):
        raise HTTPException(
            status_code=403,
            detail=f"A conta {email or 'informada'} não é institucional. Use @{os.environ['PROFESSOR_DOMAIN']} "
                   f"(professores) ou @{os.environ['STUDENT_DOMAIN']} (alunos).",
        )
    name = data.get("name") or email.split("@")[0]
    if existing:
        updates = {"name": name, "picture": data.get("picture", "")}
        if user_type and existing.get("role") != "admin":
            updates["user_type"] = user_type
        await db.users.update_one({"id": existing["id"]}, {"$set": updates})
        user = {**existing, **updates}
    else:
        user = {
            "id": str(uuid.uuid4()), "name": name, "email": email, "picture": data.get("picture", ""),
            "role": "user", "user_type": user_type, "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(dict(user))
    set_session_cookie(response, user["id"])
    return _public(user)


@router.post("/login", response_model=UserPublic)
async def admin_login(body: LoginIn, response: Response):
    """Password login is reserved for administrators; everyone else uses the institutional login."""
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or user.get("role") != "admin" or not user.get("password_hash"):
        if institutional_user_type(email):
            raise HTTPException(status_code=400, detail="Professores e alunos entram pelo acesso institucional UFPA")
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    set_session_cookie(response, user["id"])
    return _public(user)


@router.post("/logout")
async def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return _public(user)
