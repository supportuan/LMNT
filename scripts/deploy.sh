#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node 20+ required (you have $(node -v))."
  echo "Install Node 22:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
  echo "  sudo apt install -y nodejs"
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: .env missing in $(pwd)"
  echo "From your Mac: scp .env ubuntu@YOUR_EC2_IP:~/LMNT/.env"
  exit 1
fi

echo "Node $(node -v) | npm $(npm -v)"
npm ci
npm run build
npm run db:check-rds
npm run db:migrate:prod

if pm2 describe lmnt >/dev/null 2>&1; then
  pm2 restart lmnt --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
echo "Deploy complete. Health: curl -s http://localhost:3000/api/health"
