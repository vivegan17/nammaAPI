$pythonExe = "C:\Users\vivegan\AppData\Local\Programs\Python\Python312\python.exe"

if (Test-Path $pythonExe) {
    & $pythonExe "$PSScriptRoot\cli.py" @args
} else {
    python "$PSScriptRoot\cli.py" @args
}
