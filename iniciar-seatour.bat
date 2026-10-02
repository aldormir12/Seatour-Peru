@echo off
title SeaTour Launcher

cd /d "%~dp0"

echo ==========================================
echo            INICIANDO SEATOUR
echo ==========================================
echo.

echo [1/4] Backend Spring Boot...
start "SeaTour Backend - 8080" cmd /k "cd /d "%~dp0" && mvnw.cmd spring-boot:run"

timeout /t 3 /nobreak >nul

echo [2/4] Frontend Laptop...
start "SeaTour Laptop - 4200" cmd /k "cd /d "%~dp0seatour-frontend-angular" && npm start"

timeout /t 3 /nobreak >nul

echo [3/4] Frontend Mobile...
start "SeaTour Mobile - 4300" cmd /k "cd /d "%~dp0seatour-frontend-angular" && npm run start:tunnel -- --port 4300"

timeout /t 5 /nobreak >nul

echo [4/4] Cloudflare Tunnel...

start "SEATOUR IPHONE - COPIAR LINK" powershell -NoExit -ExecutionPolicy Bypass -Command ^
"$out = Join-Path (Get-Location) 'cloudflare-out.log'; ^
$err = Join-Path (Get-Location) 'cloudflare-err.log'; ^
if (Test-Path $out) { Remove-Item $out -Force }; ^
if (Test-Path $err) { Remove-Item $err -Force }; ^
Write-Host ''; ^
Write-Host 'Iniciando Cloudflare...' -ForegroundColor Cyan; ^
$p = Start-Process cloudflared -ArgumentList 'tunnel','--url','http://localhost:4300' -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru; ^
Write-Host 'Esperando enlace para el iPhone...' -ForegroundColor Yellow; ^
$url = $null; ^
while (-not $url -and -not $p.HasExited) { ^
    $contenido = ''; ^
    if (Test-Path $out) { $contenido += Get-Content $out -Raw -ErrorAction SilentlyContinue }; ^
    if (Test-Path $err) { $contenido += Get-Content $err -Raw -ErrorAction SilentlyContinue }; ^
    $match = [regex]::Match($contenido, 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com'); ^
    if ($match.Success) { $url = $match.Value }; ^
    if (-not $url) { Start-Sleep -Milliseconds 500 } ^
}; ^
if ($url) { ^
    Clear-Host; ^
    Write-Host '========================================================' -ForegroundColor Cyan; ^
    Write-Host '                LINK PARA EL IPHONE' -ForegroundColor Yellow; ^
    Write-Host '========================================================' -ForegroundColor Cyan; ^
    Write-Host ''; ^
    Write-Host $url -ForegroundColor Green; ^
    Write-Host ''; ^
    Set-Clipboard -Value $url; ^
    Write-Host 'Copiado automaticamente al portapapeles.' -ForegroundColor White; ^
    Write-Host 'Abre este enlace en Safari.' -ForegroundColor White; ^
    Write-Host ''; ^
    Write-Host 'NO CIERRES ESTA VENTANA.' -ForegroundColor Red; ^
    Write-Host ''; ^
    Wait-Process -Id $p.Id ^
} else { ^
    Write-Host ''; ^
    Write-Host 'Cloudflare se cerro antes de generar el enlace.' -ForegroundColor Red; ^
    Write-Host ''; ^
    Write-Host 'Salida:'; ^
    if (Test-Path $out) { Get-Content $out }; ^
    Write-Host ''; ^
    Write-Host 'Errores:'; ^
    if (Test-Path $err) { Get-Content $err } ^
}"

echo.
echo ==========================================
echo            SEATOUR INICIADO
echo ==========================================
echo.
echo Laptop:
echo http://localhost:4200
echo.
echo Revisa la ventana:
echo SEATOUR IPHONE - COPIAR LINK
echo.
pause