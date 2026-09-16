# LMNT Fitness Club — Coach OS

Local modular monolith for multi-branch gym operations with PostgreSQL and server-enforced RBAC.

## Stack

- Next.js 15 (App Router)
- PostgreSQL 16
- Drizzle ORM
- JWT session cookies

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (Homebrew) and set DATABASE_URL in .env

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

**Local — Homebrew Postgres**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb lmnt_coach_os
# create user lmnt / password lmnt_dev, then grant schema access
# DATABASE_URL=postgresql://lmnt:lmnt_dev@127.0.0.1:5432/lmnt_coach_os
```

**Production — AWS RDS** (see `.env.example` for `RDS_HOST`, `POSTGRES_*`, `APP_URL`)

Fresh production databases should use `npm run db:migrate` instead of `db:push`. Existing local databases can keep using `db:push`.

## Production (EC2 + PM2)

Use `t3.small` or larger in `ap-south-1` (same region as RDS). On Ubuntu EC2:

1. Security groups: EC2 inbound **22** and **80/443**. RDS inbound **5432** from the EC2 security group.
2. Copy `.env` to the server (never commit it). From your Mac:

```bash
scp .env ubuntu@YOUR_EC2_IP:~/LMNT/.env
```

`APP_URL` must match the public URL (`https://testing.lmnt.fit`).

3. Deploy (`scripts/deploy.sh` auto-installs Node 22 via nvm if the system Node is old):

```bash
cd ~/LMNT
git pull origin main
bash scripts/deploy.sh
pm2 startup   # run the command it prints once
```

4. Put nginx or Caddy in front of port **3000** for HTTPS on your domain.

Redeploy after code changes:

```bash
git pull origin main
npm run deploy
```

Do not run `db:seed` in production.
