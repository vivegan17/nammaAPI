@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo          Deploying nammaAPI to Vercel
echo ========================================================
echo.
echo If this is your first time, it will prompt you to log in to Vercel.
echo Press Enter on the default prompts to deploy!
echo.
call npx vercel
echo.
pause
