#!/bin/sh
set -e

echo "[entrypoint] Discovering packages..."
php artisan package:discover --ansi

echo "[entrypoint] Caching config and routes..."
php artisan config:cache
php artisan route:cache

echo "[entrypoint] Running migrations..."
php artisan migrate --force

echo "[entrypoint] Starting PHP-FPM..."
exec "$@"
