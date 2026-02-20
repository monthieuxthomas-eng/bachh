@echo off
setlocal

echo Stopping Baccha Festival services...

set "FRONT_PID="
for /f %%a in ('powershell -NoProfile -Command "$p=Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue ^| Select-Object -First 1 -ExpandProperty OwningProcess; if($p){$p}"') do set "FRONT_PID=%%a"
if defined FRONT_PID (
  taskkill /PID %FRONT_PID% /F >nul 2>&1
  echo Frontend stopped - PID %FRONT_PID%
) else (
  echo Frontend was not running on port 3000
)

set "BACK_PID="
for /f %%a in ('powershell -NoProfile -Command "$p=Get-NetTCPConnection -State Listen -LocalPort 5000 -ErrorAction SilentlyContinue ^| Select-Object -First 1 -ExpandProperty OwningProcess; if($p){$p}"') do set "BACK_PID=%%a"
if defined BACK_PID (
  taskkill /PID %BACK_PID% /F >nul 2>&1
  echo Backend stopped - PID %BACK_PID%
) else (
  echo Backend was not running on port 5000
)

echo Done.
endlocal
