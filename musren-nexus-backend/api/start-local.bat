@echo off
REM ─── Musren Connect — Laravel local dev starter ───────────────────────────
REM Run this from the api\ directory after setting DB_PASSWORD in .env

set PHP=C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe

echo [1/3] Running migrations...
"%PHP%" artisan migrate --force
if %ERRORLEVEL% neq 0 (
    echo Migration failed. Check DB_PASSWORD in .env
    pause
    exit /b 1
)

echo [2/3] Clearing config cache...
"%PHP%" artisan config:clear

echo [3/3] Starting Laravel dev server on http://localhost:8081 ...
"%PHP%" artisan serve --host=127.0.0.1 --port=8081
