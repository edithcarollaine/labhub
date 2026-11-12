# LabHub · UFPA Tucuruí

Sistema web para reserva de laboratórios e aluguel de equipamentos de hardware, com login institucional
via Google (professores @ufpa.br, alunos @tucurui.ufpa.br) e acesso do administrador por e-mail e senha.

## Pré-requisitos

- Python 3.11+
- Node.js 20+ e Yarn (`npm install -g yarn`)
- MongoDB 6+ rodando em `mongodb://localhost:27017` (ou outro endereço em `MONGO_URL`)
- Um **Client ID do Google** (veja a seção "Configurar o login com Google")

## Configurar o login com Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie (ou escolha) um projeto.
2. Vá em **APIs e serviços → Tela de consentimento OAuth** e configure o app.
3. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, tipo **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, adicione `http://localhost:3000` (e o domínio real, em produção).
5. Copie o Client ID gerado. Ele será usado no backend e no frontend.

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

Edite o `backend/.env`:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="labhub"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="<gere um valor aleatório, veja abaixo>"
APP_TZ=America/Belem
PROFESSOR_DOMAIN=ufpa.br
STUDENT_DOMAIN=tucurui.ufpa.br
GOOGLE_CLIENT_ID=<seu-client-id>.apps.googleusercontent.com
ADMIN_NAME="Administrador (Admin)"
ADMIN_EMAIL=<e-mail do administrador>
ADMIN_PASSWORD=<senha forte>
```

Para gerar o `JWT_SECRET` e uma senha forte:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Depois, crie os dados iniciais e suba a API:

```bash
python seed.py                # cria o administrador, os laboratórios e os equipamentos
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

> O `requirements-local.txt` contém só o necessário para rodar localmente. O `requirements.txt` é o ambiente
> completo, com muitos pacotes que o sistema não usa.

## 2. Frontend (React + Vite)

```bash
cd frontend
yarn install
```

Crie o arquivo `frontend/.env` com o **mesmo** Client ID do backend:

```
VITE_GOOGLE_CLIENT_ID=<seu-client-id>.apps.googleusercontent.com
```

Suba o servidor de desenvolvimento:

```bash
yarn dev                      # http://localhost:3000 (as chamadas /api vão para a porta 8001)
```

> O Vite só lê o `.env` ao iniciar. Se alterar o arquivo, pare o `yarn dev` (Ctrl+C) e rode de novo.

## 3. Acesso

- **Administrador:** em `/login`, abra "Acesso do administrador" e entre com o `ADMIN_EMAIL` e a
  `ADMIN_PASSWORD` definidos no `backend/.env`. Para trocar a senha, altere o `.env` e rode `python seed.py`
  novamente.
- **Professores e alunos:** em `/login` ou `/primeiro-acesso`, clique em **Entrar com o Google** e escolha a conta
  institucional. O backend valida o token do Google e só aceita e-mails dos domínios `PROFESSOR_DOMAIN` e
  `STUDENT_DOMAIN`. O perfil (Professor ou Aluno) é definido pelo domínio no primeiro acesso.
- **Sessão de teste (sem Google):** para testar sem passar pelo login do Google, gere um token e grave-o como
  cookie `session` no navegador (DevTools → Application → Cookies → `http://localhost:3000`):

  ```bash
  cd backend
  python make_test_session.py prof.teste@ufpa.br "Prof Teste"
  ```

## Solução de problemas

- **Botão do Google não aparece:** confira o `VITE_GOOGLE_CLIENT_ID` no `frontend/.env` e reinicie o `yarn dev`.
- **Erro "origin_mismatch" do Google:** a origem `http://localhost:3000` precisa estar em "Origens JavaScript
  autorizadas" no Google Cloud Console.
- **Erro 500 ao entrar com o Google:** falta `GOOGLE_CLIENT_ID` no `backend/.env`.
- **`seed.py` pede ADMIN_EMAIL e ADMIN_PASSWORD:** defina as duas variáveis no `backend/.env`.
- **Conexão recusada no MongoDB:** confirme que o MongoDB está rodando e que `MONGO_URL` está correto.

## Estrutura

- `backend/` — API (`server.py`, `routers/`, `models/`, `lib/`) e `seed.py`
- `frontend/src/` — páginas (`pages/`), componentes (`components/`), tipos e chamadas à API (`lib/`)

## Antes de publicar

- Defina `CORS_ORIGINS` com as origens reais, sem usar `*`.
- Use `JWT_SECRET` e `ADMIN_PASSWORD` fortes e únicos.
- Ative o cookie seguro (`COOKIE_SECURE=true`), se tiver adotado essa opção em `lib/auth.py`, e sirva tudo em https.
- Cadastre o domínio de produção em "Origens JavaScript autorizadas" no Google Cloud Console.
- Não versione os arquivos `.env`.