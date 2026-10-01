@echo off
echo Iniciando SeaTour...
echo.

start "SeaTour Backend" cmd /k "cd /d ""%~dp0"" && call mvnw.cmd spring-boot:run"

start "SeaTour Frontend" cmd /k "cd /d ""%~dp0seatour-frontend-angular"" && npm start"

exit