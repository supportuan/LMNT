#!/bin/bash
set -euo pipefail

DOMAIN="${1:-testing.lmnt.fit}"
EMAIL="${2:-support@lmnt.fit}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Setting up nginx for $DOMAIN (app must be running on :3000)"

sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

sudo cp "$ROOT/deploy/nginx/lmnt.conf" /etc/nginx/sites-available/lmnt
sudo sed -i "s/testing.lmnt.fit/${DOMAIN}/g" /etc/nginx/sites-available/lmnt
sudo ln -sf /etc/nginx/sites-available/lmnt /etc/nginx/sites-enabled/lmnt
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

echo "Requesting TLS certificate..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "Done. Open https://${DOMAIN}"
echo "Ensure APP_URL=https://${DOMAIN} in .env and run: pm2 restart lmnt --update-env"
