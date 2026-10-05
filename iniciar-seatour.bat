@echo off
title SeaTour Launcher

cd /d "%~dp0"

echo ==========================================
echo            INICIANDO SEATOUR
echo ==========================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo No se encontro Docker. Instala y abre Docker Desktop.
    pause
    exit /b 1
)

where cloudflared >nul 2>&1
if errorlevel 1 (
    echo No se encontro cloudflared. Instalalo y agregalo al PATH.
    pause
    exit /b 1
)

echo [1/3] Iniciando Docker Compose...
docker compose up -d
if errorlevel 1 (
    echo No se pudo iniciar SeaTour. Revisa Docker Desktop y el mensaje anterior.
    pause
    exit /b 1
)

echo [2/3] Esperando unos segundos...
timeout /t 5 /nobreak >nul
echo App local: http://localhost:8088
start "" "http://localhost:8088"

echo [3/3] Iniciando Cloudflare...

start "SEATOUR IPHONE - COPIAR LINK" powershell -NoExit -ExecutionPolicy Bypass -Command ^
"$out = Join-Path (Get-Location) 'cloudflare-out.log'; ^
$err = Join-Path (Get-Location) 'cloudflare-err.log'; ^
if (Test-Path $out) { Remove-Item $out -Force }; ^
if (Test-Path $err) { Remove-Item $err -Force }; ^
Write-Host ''; ^
Write-Host 'Iniciando Cloudflare...' -ForegroundColor Cyan; ^
$p = Start-Process cloudflared -ArgumentList 'tunnel','--url','http://localhost:8088' -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru; ^
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
    try { Set-Clipboard -Value $url -ErrorAction Stop; Write-Host 'Copiado automaticamente al portapapeles.' -ForegroundColor White } catch { Write-Host 'No se pudo copiar. Copia el enlace de arriba.' -ForegroundColor Yellow }; ^
    Write-Host 'Abre este enlace en Safari.' -ForegroundColor White; ^
    Write-Host ''; ^
    Write-Host 'NO CIERRES ESTA VENTANA.' -ForegroundColor Red; ^
    Write-Host ''; ^
    Wait-Process -Id $p.Id -ErrorAction SilentlyContinue; ^
    Write-Host 'El tunel se ha cerrado. Ejecuta el launcher para abrir otro enlace.' -ForegroundColor Yellow ^
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
echo App local:
echo http://localhost:8088
echo.
echo Revisa la ventana:
echo SEATOUR IPHONE - COPIAR LINK
echo.
pause
