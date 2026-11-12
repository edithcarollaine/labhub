"""Testing helper: upsert an institutional user and print a session cookie value (bypasses Google).
Usage: cd /app/backend && python make_test_session.py prof.teste@ufpa.br "Prof Teste"
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from lib.auth import JWT_ALG, institutional_user_type
from lib.db import db


async def main(email: str, name: str) -> None:
    utype = institutional_user_type(email)
    if not utype:
        sys.exit("e-mail não institucional")
    await db.users.update_one(
        {"email": email},
        {"$set": {"name": name, "user_type": utype},
         "$setOnInsert": {"id": str(uuid.uuid4()), "email": email, "role": "user", "auth_provider": "google",
                          "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    user = await db.users.find_one({"email": email})
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    print(jwt.encode({"sub": user["id"], "exp": exp}, os.environ["JWT_SECRET"], algorithm=JWT_ALG))


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "Usuário Teste"))
