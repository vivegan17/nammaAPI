@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo          Deploying nammaAPI to Netlify
echo ========================================================
echo.
echo If this is your first time, it will prompt you to log in to Netlify.
echo.
call npx netlify deploy --prod
echo.
pause
