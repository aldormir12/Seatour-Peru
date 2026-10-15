@echo off
setlocal
cd /d "%~dp0"

rem Cargar la clave JWT local requerida por el backend.
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="SEATOUR_JWT_SECRET" set "SEATOUR_JWT_SECRET=%%B"
    )
)

start "SEATOUR - Backend" /D "%~dp0" cmd /k "mvnw.cmd spring-boot:run"
start "SEATOUR - Frontend" /D "%~dp0seatour-frontend-angular" cmd /k "npm.cmd start -- --port 4200"

echo Esperando 15 segundos antes de abrir SEATOUR...
timeout /t 15 /nobreak >nul
start "" "http://localhost:4200"
endlocal
