#!/bin/bash
# scripts/bootstrap-server.sh
# Run once on the VPS as root to prepare it for CI/CD deployments.
# Usage: bash bootstrap-server.sh
set -e

REPO_URL="https://github.com/Dmafuta/musren-nexus.git"
REPO_DIR="/srv/musren-nexus"
DEPLOY_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF4dnjMjiysZLPfshrOVYoJ5i3Um5AGfi4EeYGhcAa0I musren-deploy"

echo "========================================"
echo " Musren Connect — Server Bootstrap"
echo "========================================"

# ── 1. System update ─────────────────────────────────────────────────────────
echo ""
echo "[1/7] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Install Docker ─────────────────────────────────────────────────────────
echo ""
echo "[2/7] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed."
else
  echo "Docker already installed: $(docker --version)"
fi

# ── 3. Install Git ────────────────────────────────────────────────────────────
echo ""
echo "[3/7] Installing Git..."
apt-get install -y -qq git

# ── 4. Authorize deploy key ───────────────────────────────────────────────────
echo ""
echo "[4/7] Adding GitHub Actions deploy key to authorized_keys..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh
if ! grep -q "musren-deploy" ~/.ssh/authorized_keys 2>/dev/null; then
  echo "$DEPLOY_KEY" >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  echo "Deploy key added."
else
  echo "Deploy key already present."
fi

# ── 5. Clone repository ───────────────────────────────────────────────────────
echo ""
echo "[5/7] Cloning repository to $REPO_DIR..."
if [ ! -d "$REPO_DIR/.git" ]; then
  mkdir -p "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
  echo "Repository cloned."
else
  echo "Repository already exists. Pulling latest..."
  cd "$REPO_DIR" && git pull origin master
fi

# ── 6. Create .env file ───────────────────────────────────────────────────────
echo ""
echo "[6/7] Setting up .env file..."
ENV_FILE="$REPO_DIR/musren-nexus-backend/api/.env"
ENV_EXAMPLE="$REPO_DIR/musren-nexus-backend/api/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo ""
  echo "  .env created from .env.example."
  echo "  You MUST fill in the following values in $ENV_FILE:"
  echo ""
  echo "    APP_KEY           — run inside the container: docker compose exec backend php artisan key:generate --show"
  echo "    DB_PASSWORD       — PostgreSQL password"
  echo "    SUPABASE_JWT_SECRET"
  echo "    SUPABASE_SERVICE_ROLE_KEY"
  echo "    MPESA_CONSUMER_KEY"
  echo "    MPESA_CONSUMER_SECRET"
  echo "    MPESA_SHORTCODE"
  echo "    MPESA_PASSKEY"
  echo "    MPESA_INITIATOR_NAME"
  echo "    MPESA_SECURITY_CREDENTIAL"
  echo "    AT_USERNAME"
  echo "    AT_API_KEY"
  echo "    MAIL_PASSWORD"
  echo ""
  echo "  Edit now with: nano $ENV_FILE"
else
  echo ".env already exists — skipping."
fi

# ── 7. Open firewall ports ────────────────────────────────────────────────────
echo ""
echo "[7/7] Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP (Cloudflare proxy)
  ufw allow 443/tcp  # HTTPS
  ufw --force enable
  echo "UFW configured."
else
  echo "UFW not found — configure firewall manually."
fi

echo ""
echo "========================================"
echo " Bootstrap complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Fill in credentials: nano $ENV_FILE"
echo "  2. Generate APP_KEY:"
echo "       cd $REPO_DIR && docker compose up -d --build"
echo "       docker compose exec backend php artisan key:generate"
echo "       # Copy the output into .env as APP_KEY=..."
echo "  3. Start services: docker compose up -d"
echo "  4. Point DNS for musren.quantumconnect.africa → $(curl -s ifconfig.me)"
echo "  5. Push a commit to master — GitHub Actions will handle all future deploys."
echo ""
