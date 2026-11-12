"""Idempotent seed: admin + demo user, labs and equipment. Run: cd /app/backend && python seed.py"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")
from lib.auth import hash_password
from lib.db import db, ensure_indexes

def _admin_user() -> tuple:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "")
    name = os.environ.get("ADMIN_NAME", "Administrador")
    if not email or not password:
        sys.exit("Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed.")
    return (name, email, password, "admin", "tecnico")


USERS = [_admin_user()]
# Accounts from the old single-domain setup (no longer valid institutional domains).
LEGACY_EMAILS = ["admin@ufpa.tucurui.br", "aluno@ufpa.tucurui.br"]

LABS = [
    ("Laboratório de Informática 01", "Bloco A, Sala 101", 30, 35, "Laboratório de uso geral para aulas de programação.", "Intel i5 12ª ger, 16GB RAM, SSD 256GB"),
    ("Laboratório de Redes", "Bloco A, Sala 104", 20, 25, "Equipado com switches, roteadores e racks para práticas de redes.", "Intel i7, 16GB RAM, Cisco Packet Tracer"),
    ("Laboratório de Hardware e Eletrônica", "Bloco B, Sala 203", 12, 20, "Bancadas para montagem e manutenção de computadores.", "Bancadas antiestáticas, osciloscópios"),
    ("Laboratório de Computação Gráfica", "Bloco C, Sala 302", 18, 20, "Estações de alto desempenho para modelagem 3D e IA.", "Ryzen 9, 32GB RAM, RTX 4070"),
]

EQUIPMENT = [
    ("Notebook Dell Latitude", "Notebook", 15, "Notebooks para empréstimo acadêmico.", "i5, 8GB RAM, SSD 256GB"),
    ("Kit Arduino Uno", "Microcontrolador", 25, "Kit com Arduino Uno, protoboard e sensores.", "ATmega328P"),
    ("Raspberry Pi 4", "Microcomputador", 10, "Placa para projetos de IoT e sistemas embarcados.", "4GB RAM"),
    ("Projetor Epson", "Multimídia", 6, "Projetor para apresentações.", "3500 lumens, HDMI"),
    ("Monitor 24\" LG", "Periférico", 12, "Monitor Full HD extra.", "1920x1080, IPS"),
    ("Kit de Ferramentas de Manutenção", "Ferramentas", 8, "Chaves, pulseira antiestática e multímetro.", "32 peças"),
]


async def main() -> None:
    await ensure_indexes()
    now = datetime.now(timezone.utc)
    await db.users.delete_many({"email": {"$in": LEGACY_EMAILS}})
    for name, email, pw, role, utype in USERS:
        await db.users.update_one(
            {"email": email},
            {
                "$set": {"name": name, "password_hash": hash_password(pw), "role": role, "user_type": utype},
                "$setOnInsert": {"id": str(uuid.uuid4()), "email": email, "created_at": now},
            },
            upsert=True,
        )
    for name, loc, comps, cap, desc, specs in LABS:
        await db.labs.update_one(
            {"name": name},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "name": name, "location": loc, "computers": comps,
                              "capacity": cap, "description": desc, "specs": specs, "active": True}},
            upsert=True,
        )
    for name, cat, qty, desc, specs in EQUIPMENT:
        await db.equipment.update_one(
            {"name": name},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "name": name, "category": cat, "quantity": qty,
                              "description": desc, "specs": specs, "active": True}},
            upsert=True,
        )
    print("seed ok")


if __name__ == "__main__":
    asyncio.run(main())
