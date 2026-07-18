@echo off
cd /d "%~dp0"
echo SKHPS local-dev server starting on http://localhost:5501/
echo Core and QR will prefer the v3 dev worktrees when they exist.
echo.
echo QR v3 backend:
echo http://localhost:5501/skhps-qr-signin/qr-signin-backend.html?skhpsRuntime=local-dev^&qrV3=1
echo.
echo Close this window to stop the server.
node dev-server.js
pause
