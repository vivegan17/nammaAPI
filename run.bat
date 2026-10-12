@echo off
setlocal
cd /d "%~dp0"
set PYTHON_EXE=C:\Users\vivegan\AppData\Local\Programs\Python\Python312\python.exe

if exist "%PYTHON_EXE%" (
    "%PYTHON_EXE%" cli.py %*
) else (
    python cli.py %*
)
pause
