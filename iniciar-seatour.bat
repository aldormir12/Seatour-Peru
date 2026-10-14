@echo off
title SeaTour Launcher
cd /d "%~dp0"
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
if (Test-Path $out) { Remove-Item -LiteralPath $out -Force }; ^
if (Test-Path $err) { Remove-Item -LiteralPath $err -Force }; ^
Write-Host 'Iniciando Cloudflare...' -ForegroundColor Cyan; ^
$p = Start-Process cloudflared -ArgumentList 'tunnel','--url','http://localhost:8088' -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru; ^
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
    Write-Host 'LINK PARA EL IPHONE' -ForegroundColor Cyan; ^
    Write-Host $url -ForegroundColor Green; ^
    try { Set-Clipboard -Value $url } catch { Write-Host 'Copia el enlace anterior.' }; ^
    Write-Host 'Abre este enlace en Safari. NO CIERRES ESTA VENTANA.'; ^
    Wait-Process -Id $p.Id -ErrorAction SilentlyContinue; ^
    Write-Host 'El tunel se ha cerrado. Ejecuta el launcher para abrir otro enlace.' ^
} else { ^
    Write-Host 'Cloudflare se cerro antes de generar el enlace.' -ForegroundColor Red; ^
    if (Test-Path $err) { Get-Content $err } ^
}"
echo App local: http://localhost:8088
echo Revisa la ventana SEATOUR IPHONE - COPIAR LINK.
pause
