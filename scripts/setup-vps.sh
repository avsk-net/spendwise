#!/usr/bin/env bash
# One-time VPS setup for SpendWise on 51.91.18.120
# Run as root, then hand off to the deploy user.
set -euo pipefail

DOMAIN="finance.lalonhobekotodine.sbs"
APP_DIR="/opt/spendwise"
DEPLOY_USER="deploy"

# ── 1. System packages ────────────────────────────────────────────────────────
apt-get update -q
apt-get install -y -q curl git ufw

# ── 2. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# ── 3. deploy user ────────────────────────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

# Add your CI SSH public key here (from the VPS_SSH_KEY GitHub secret)
# Replace the placeholder with the actual public key:
AUTHORIZED_KEY="ssh-ed25519 AAAA...your-public-key... deploy@spendwise"
mkdir -p /home/${DEPLOY_USER}/.ssh
echo "$AUTHORIZED_KEY" >> /home/${DEPLOY_USER}/.ssh/authorized_keys
chmod 700 /home/${DEPLOY_USER}/.ssh
chmod 600 /home/${DEPLOY_USER}/.ssh/authorized_keys
chown -R ${DEPLOY_USER}:${DEPLOY_USER} /home/${DEPLOY_USER}/.ssh

# ── 4. Firewall ───────────────────────────────────────────────────────────────
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirects to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw --force enable

# ── 5. App directory ──────────────────────────────────────────────────────────
mkdir -p "${APP_DIR}/nginx/certbot/conf"
mkdir -p "${APP_DIR}/nginx/certbot/www"
chown -R ${DEPLOY_USER}:${DEPLOY_USER} "${APP_DIR}"

echo ""
echo "──────────────────────────────────────────────────────────"
echo " Next steps (run as the deploy user from ${APP_DIR}):"
echo ""
echo " 1. Copy docker-compose.yml and nginx/nginx.conf to ${APP_DIR}"
echo ""
echo " 2. Create ${APP_DIR}/.env from .env.example and fill in secrets:"
echo "      cp .env.example .env && nano .env"
echo ""
echo " 3. Issue the TLS certificate (run once):"
echo "      docker run --rm -v ${APP_DIR}/nginx/certbot/conf:/etc/letsencrypt \\"
echo "                       -v ${APP_DIR}/nginx/certbot/www:/var/www/certbot \\"
echo "                       -p 80:80 \\"
echo "                       certbot/certbot certonly --standalone \\"
echo "                       -d ${DOMAIN} --agree-tos --no-eff-email \\"
echo "                       -m your@email.com"
echo ""
echo " 4. Start the stack:"
echo "      docker compose pull"
echo "      docker compose up -d"
echo "      docker compose ps"
echo "──────────────────────────────────────────────────────────"
