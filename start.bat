@echo off
setlocal

set "ROOT=%~dp0"
set "LOG_DIR=%ROOT%logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo Starting Baccha Festival in background...

set "BACK_PID="
for /f %%a in ('powershell -NoProfile -Command "$p=Get-NetTCPConnection -State Listen -LocalPort 5000 -ErrorAction SilentlyContinue ^| Select-Object -First 1 -ExpandProperty OwningProcess; if($p){$p}"') do set "BACK_PID=%%a"
if defined BACK_PID (
	echo Backend already running on http://localhost:5000 - PID %BACK_PID%
) else (
	start "Baccha Backend" /min cmd /c "cd /d "%ROOT%" && node server.js >> "%LOG_DIR%\backend.log" 2>&1"
	echo Backend started on http://localhost:5000
)

set "FRONT_PID="
for /f %%a in ('powershell -NoProfile -Command "$p=Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue ^| Select-Object -First 1 -ExpandProperty OwningProcess; if($p){$p}"') do set "FRONT_PID=%%a"
if defined FRONT_PID (
	echo Frontend already running on http://localhost:3000 - PID %FRONT_PID%
) else (
	start "Baccha Frontend" /min cmd /c "cd /d "%ROOT%" && set BROWSER=none && npm start >> "%LOG_DIR%\frontend.log" 2>&1"
	echo Frontend started on http://localhost:3000
)

echo.
echo Done. You can close this terminal.
echo Frontend: http://localhost:3000
echo Backend : http://localhost:5000
echo Logs    : %LOG_DIR%

endlocal
