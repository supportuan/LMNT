#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log() {
  echo "[deploy] $*"
}

node_major() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    return 0
  fi
  return 1
}

ensure_node() {
  if [ "$(node_major)" -ge 20 ]; then
    log "Using Node $(node -v)"
    return
  fi

  log "Node $(node -v 2>/dev/null || echo 'missing') is too old for Next.js 15."

  if ! load_nvm; then
    log "Installing nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    load_nvm
  fi

  log "Installing Node 22 via nvm..."
  nvm install 22
  nvm use 22
  nvm alias default 22

  if [ "$(node_major)" -lt 20 ]; then
    echo "ERROR: Could not activate Node 22."
    echo "Run: source ~/.nvm/nvm.sh && nvm use 22 && bash scripts/deploy.sh"
    exit 1
  fi

  log "Now using Node $(node -v) at $(command -v node)"
}

ensure_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return
  fi
  log "Installing PM2 globally for Node $(node -v)..."
  npm install -g pm2
}

ensure_node
load_nvm && nvm use 22 >/dev/null 2>&1 || true
ensure_pm2

if [ ! -f .env ]; then
  echo "ERROR: .env missing in $ROOT"
  echo "From your Mac (use the EC2 public IP from AWS console):"
  echo "  scp .env ubuntu@EC2_PUBLIC_IP:~/LMNT/.env"
  exit 1
fi

export PM2_INTERPRETER="$(command -v node)"

log "Node $(node -v) | npm $(npm -v) | pm2 $(pm2 -v)"
log "Installing dependencies..."
npm ci

log "Building..."
npm run build

log "Checking RDS..."
npm run db:check-rds

log "Running migrations..."
npm run db:migrate:prod

log "Starting PM2..."
if pm2 describe lmnt >/dev/null 2>&1; then
  pm2 restart lmnt --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
log "Deploy complete."
log "Health check: curl -s http://localhost:3000/api/health"
log "Logs: pm2 logs lmnt --lines 50"
