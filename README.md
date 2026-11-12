# LabHub · UFPA Tucuruí

Web system for booking laboratories and renting hardware equipment, with institutional login via Google
(professors @ufpa.br, students @tucurui.ufpa.br) and administrator access by e-mail and password.

## Prerequisites

- Python 3.11+
- Node.js 20+ and Yarn (`npm install -g yarn`)
- MongoDB 6+ running at `mongodb://localhost:27017` (or another address set in `MONGO_URL`)
- A **Google Client ID** (see "Setting up Google login")

## Setting up Google login

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create (or choose) a project.
2. Go to **APIs & Services → OAuth consent screen** and configure the app.
3. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
4. Under **Authorized JavaScript origins**, add `http://localhost:3000` (and your real domain in production).
5. Copy the generated Client ID. It is used by both the backend and the frontend.

## 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows (PowerShell): .venv\Scripts\activate
# Windows (Git Bash):   source .venv/Scripts/activate
# Linux/macOS:          source .venv/bin/activate
pip install -r requirements-local.txt
cp .env.example .env
```

Edit `backend/.env`:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="labhub"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="<generate a random value, see below>"
APP_TZ=America/Belem
PROFESSOR_DOMAIN=ufpa.br
STUDENT_DOMAIN=tucurui.ufpa.br
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
ADMIN_NAME="Administrador (Admin)"
ADMIN_EMAIL=<administrator e-mail>
ADMIN_PASSWORD=<strong password>
```

To generate the `JWT_SECRET` and a strong password:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Then create the initial data and start the API:

```bash
python seed.py                # creates the administrator, the labs and the equipment
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

> `requirements-local.txt` contains only what is needed to run locally. `requirements.txt` is the full
> environment, with many packages the system does not use.

## 2. Frontend (React + Vite)

```bash
cd frontend
yarn install
```

Create the file `frontend/.env` with the **same** Client ID used in the backend:

```
VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
```

Start the development server:

```bash
yarn dev                      # http://localhost:3000 (/api calls are proxied to port 8001)
```

> Vite only reads `.env` at startup. If you change the file, stop `yarn dev` (Ctrl+C) and run it again.

## 3. Access

- **Administrator:** at `/login`, open "Administrator access" and sign in with the `ADMIN_EMAIL` and
  `ADMIN_PASSWORD` defined in `backend/.env`. To change the password, edit the `.env` and run `python seed.py`
  again.
- **Professors and students:** at `/login` or `/primeiro-acesso`, click **Sign in with Google** and choose your
  institutional account. The backend validates the Google token and only accepts e-mails from the
  `PROFESSOR_DOMAIN` and `STUDENT_DOMAIN` domains. The profile (Professor or Student) is set by the domain on
  first access.
- **Test session (without Google):** to test without going through Google login, generate a token and store it
  as the `session` cookie in the browser (DevTools → Application → Cookies → `http://localhost:3000`):

  ```bash
  cd backend
  python make_test_session.py prof.teste@ufpa.br "Prof Teste"
  ```

## Troubleshooting

- **Google button does not appear:** check `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` and restart `yarn dev`.
- **Google "origin_mismatch" error:** the origin `http://localhost:3000` must be listed under "Authorized
  JavaScript origins" in the Google Cloud Console.
- **500 error when signing in with Google:** `GOOGLE_CLIENT_ID` is missing from `backend/.env`.
- **`seed.py` asks for ADMIN_EMAIL and ADMIN_PASSWORD:** set both variables in