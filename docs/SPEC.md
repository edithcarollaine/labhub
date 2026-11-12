# LabHub · UFPA Tucuruí — Especificação

Aplicação (pt-BR, tema escuro) para a UFPA Tucuruí: reservar laboratórios de informática por horário, alugar
equipamentos de hardware e mostrar quantos computadores cada laboratório possui.

## Autenticação e perfis
- Login institucional com o Google (Google Identity Services). O frontend obtém um ID token (`credential`) e o
  envia para `POST /api/auth/google`. O backend valida o token no Google, confere o Client ID, e aceita apenas o
  domínio exato: `@ufpa.br` → professor, `@tucurui.ufpa.br` → aluno (`PROFESSOR_DOMAIN` / `STUDENT_DOMAIN`
  no `.env`); outros domínios recebem 403. O usuário é criado automaticamente no primeiro acesso.
- `/primeiro-acesso`: explica os passos, traz o botão de login com o Google e o link da página de conta da UFPA.
- Login por senha apenas para administradores ("Acesso do administrador" em `/login`). Nos dois fluxos, a sessão
  é um JWT próprio em cookie httpOnly `session`.
- Perfis: `user` (user_type aluno/professor) e `admin` (criado pelo seed, com `ADMIN_EMAIL` e `ADMIN_PASSWORD`).

## Modelo de dados (Mongo, `id` string uuid)
- users {id, name, email, password_hash, role, user_type}
- labs {id, name, location, computers, capacity, description, specs, active}
- equipment {id, name, category, quantity, description, specs, active}
- reservations {id, kind: lab|equipment, resource_id, resource_name, user_id, user_name, user_email, start, end
  ("AAAA-MM-DDTHH:MM", horário local do campus, APP_TZ=America/Belem), quantity, purpose,
  status: confirmed|cancelled, created_at}

## Regras de negócio
- Reservas confirmadas automaticamente. Laboratório: 409 se houver reserva confirmada sobreposta. Equipamento:
  409 se a quantidade pedida > total − pico de reservas simultâneas no intervalo. Início no passado → 422;
  fim <= início → 422.
- O usuário cancela as próprias reservas (de outros → 404, sem motivo); o admin cancela qualquer uma. Quando o
  admin cancela a reserva de outra pessoa, o motivo (≥ 3 caracteres) é OBRIGATÓRIO (422 caso contrário); fica
  em `cancel_reason` / `cancelled_by="admin"` e gera uma notificação interna para o solicitante. Excluir um
  laboratório ou equipamento cancela as reservas confirmadas dele com motivo automático e notifica os donos.
- Notificações: sino na barra lateral / cabeçalho mobile (contador de não lidas, consulta a cada 30 s),
  `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` (restritas ao dono).

## API (/api)
- auth: `POST /auth/google {credential}`, `POST /auth/login` (somente admin), `POST /auth/logout`, `GET /auth/me`
- `GET /labs`, `POST/PUT/DELETE /labs[/{id}]` (admin), `GET /labs/{id}/schedule?date=AAAA-MM-DD&days=1..31`
- `GET /equipment`, `POST/PUT/DELETE /equipment[/{id}]` (admin), `GET /equipment/{id}/availability?start=&end=`
- `POST /reservations`, `GET /reservations/mine`, `GET /reservations` (admin), `POST /reservations/{id}/cancel`
- `GET /stats` (totais + `now` do servidor)

## Rotas do frontend
`/login`, `/primeiro-acesso`, `/painel`, `/laboratorios`, `/laboratorios/:labId/agenda` (grade semanal
seg–dom, 07–22 h; clicar em um horário livre abre o diálogo de reserva), `/equipamentos`, `/reservas`,
`/admin` (somente admin).

## Seed (`python seed.py`)
Administrador (lido do `.env`), 4 laboratórios (30, 20, 12 e 18 computadores = 80) e 6 equipamentos
(Notebook Dell Latitude ×15, Kit Arduino Uno ×25, Raspberry Pi 4 ×10, Projetor Epson ×6, Monitor 24" LG ×12,
Kit de Ferramentas ×8).