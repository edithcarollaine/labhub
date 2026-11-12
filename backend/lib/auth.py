"""Auth helpers: bcrypt hashing, JWT in an httpOnly cookie, and FastAPI dependencies."""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response

from lib.db import db

COOKIE_NAME = "session"
JWT_ALG = "HS256"
SESSION_DAYS = 7


def institutional_user_type(email: str) -> str | None:
    """'professor' for @PROFESSOR_DOMAIN, 'aluno' for @STUDENT_DOMAIN, None otherwise (exact domain match)."""
    domain = email.lower().strip().rsplit("@", 1)[-1] if "@" in email else ""
    if domain == os.environ["PROFESSOR_DOMAIN"].lower():
        return "professor"
    if domain == os.environ["STUDENT_DOMAIN"].lower():
        return "aluno"
    return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def set_session_cookie(response: Response, user_id: str) -> None:
    exp = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    token = jwt.encode({"sub": user_id, "exp": exp}, os.environ["JWT_SECRET"], algorithm=JWT_ALG)
    response.set_cookie(
        COOKIE_NAME, token, httponly=True, samesite="lax", secure=False,
        max_age=SESSION_DAYS * 86400, path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    # Re-read the user every request so role changes take effect immediately.
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user
