#!/bin/sh
set -e

echo "[entrypoint] Caching config, routes and views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "[entrypoint] Running migrations..."
php artisan migrate --force

echo "[entrypoint] Starting PHP-FPM..."
exec "$@"
