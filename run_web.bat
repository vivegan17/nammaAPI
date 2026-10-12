@echo off
setlocal
cd /d "%~dp0"
set PYTHON_EXE=C:\Users\vivegan\AppData\Local\Programs\Python\Python312\python.exe

echo Starting nammaAPI Web Server...
if exist "%PYTHON_EXE%" (
    start http://localhost:5000
    "%PYTHON_EXE%" server.py
) else (
    start http://localhost:5000
    python server.py
)
pause
