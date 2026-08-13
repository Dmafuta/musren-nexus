#!/bin/bash
# deploy.sh — run on the VPS to pull latest and restart containers
set -e

REPO_DIR="/srv/musren-nexus"

echo "▶ Pulling latest code..."
cd "$REPO_DIR"
git pull origin master

echo "▶ Building and restarting containers..."
docker compose up -d --build --remove-orphans

echo "▶ Waiting for backend to be healthy..."
docker compose exec -T backend sh -c 'until php-fpm -t 2>/dev/null; do sleep 2; done'

echo "▶ Running migrations..."
docker compose exec -T backend php artisan migrate --force

echo "▶ Caching config and routes..."
docker compose exec -T backend php artisan config:cache
docker compose exec -T backend php artisan route:cache

echo "✓ Deployment complete."
docker compose ps
