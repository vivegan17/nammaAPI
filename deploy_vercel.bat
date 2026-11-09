@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo          Deploying nammaAPI to Vercel (Production)
echo ========================================================
echo.
call npx.cmd vercel --prod --yes
echo.
pause
