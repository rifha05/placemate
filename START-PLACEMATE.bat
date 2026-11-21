@echo off
cd /d "%~dp0"
title Placemate Server

netstat -ano | findstr /C:":3000" | findstr /C:"LISTENING" >nul

if %errorlevel%==0 (
    echo Placemate is already running!
    start http://localhost:3000
) else (
    start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
    call npm.cmd start
)

pause