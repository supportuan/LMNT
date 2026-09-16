# LMNT Fitness Club — Coach OS

Local modular monolith for multi-branch gym operations with PostgreSQL and server-enforced RBAC.

## Stack

- Next.js 15 (App Router)
- PostgreSQL 16 (Docker)
- Drizzle ORM
- JWT session cookies

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres
docker compose up -d

# 3. Create tables and seed demo data
npm run db:setup

# 4. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Login with an account you create. The login screen does not ship demo credentials.

## Local seed (development only)

`npm run db:setup` loads sample gym data for local work. Do not use these accounts in production.

Password for seeded local accounts: `password123`

| Email | Role | Branch |
|---|---|---|
| admin@lmnt.local | Admin | All |
| manager.indiranagar@lmnt.local | Centre Manager | Indiranagar |
| trainer.indiranagar@lmnt.local | Trainer | Indiranagar |
| client.indiranagar@lmnt.local | Client | Indiranagar |
| manager.koramangala@lmnt.local | Centre Manager | Koramangala |

## Tenancy model

- `organisations` — tenant (LMNT Fitness Club)
- `centres` — branches under an organisation
- Every operational record carries `organisation_id`
- Branch-scoped records also carry `centre_id`
- Access is granted via `role_assignments`, not a role column on `users`

## Roles

- **admin** — organisation-wide
- **centre_manager** — assigned branch(es)
- **trainer** — own clients and delivery at assigned branch
- **client** — own records only

## Scripts

- `npm run dev` — start Next.js
- `npm run db:push` — apply schema to an existing database (local)
- `npm run db:generate` — create a new SQL migration from schema changes
- `npm run db:migrate` — apply committed migrations (fresh / production databases)
- `npm run db:seed` — seed demo organisation and users (blocked in production)
- `npm run db:setup` — push + seed for local development

## Database

Postgres is bound to `127.0.0.1:5432` in Docker so it is not published on the LAN. Override `POSTGRES_PASSWORD` in the environment instead of using the compose default on a shared host.

**Option A — Docker (local)**

```bash
docker compose up -d
# DATABASE_URL=postgresql://lmnt:lmnt_dev@127.0.0.1:5432/lmnt_coach_os
```

**Option B — local Homebrew Postgres**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb lmnt_coach_os
# create user lmnt / password lmnt_dev, then grant schema access
# uses port 5432 (see .env.local)
```

Fresh production databases should use `npm run db:migrate` instead of `db:push`. Existing local databases can keep using `db:push`.

## Production (EC2 + Docker)

Use `t3.small` or larger in `ap-south-1` (same region as RDS). `t3.micro` will OOM during `next build`.

1. Security groups: EC2 inbound 22 and 80. RDS inbound 5432 from the EC2 security group only.
2. On Ubuntu EC2, install Docker, clone the repo, create `.env` (never commit it):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker
```
3. `APP_URL` must be the public URL users open (`http://EC2_PUBLIC_IP` or `https://your-domain`).
4. Start:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

That runs migrations against RDS, then serves the app on port 80. Do not run `db:seed` in production. Put HTTPS (Caddy, nginx, or an ALB) in front when you have a domain.
