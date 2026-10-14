$ErrorActionPreference = 'Stop'
$taskAdminEmail = $null
$taskAdminPassword = $null
$taskPayload = $null
$taskLogin = $null
try {
    $taskAdminEmail = & docker compose exec -T backend printenv SEATOUR_ADMIN_EMAIL
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer la identidad ADMIN del contenedor.' }
    $taskAdminPassword = & docker compose exec -T backend printenv SEATOUR_ADMIN_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer la credencial ADMIN del contenedor.' }
    if ($taskAdminEmail -isnot [string] -or $taskAdminPassword -isnot [string]) { throw 'Formato de credenciales no compatible con la verificacion.' }
    $taskPort = & docker compose port frontend 80
    if ($LASTEXITCODE -ne 0 -or $taskPort -notmatch '^127\.0\.0\.1:([0-9]+)$') { throw 'No se pudo identificar el acceso local del frontend.' }
    $taskBase = 'http://127.0.0.1:' + $Matches[1]
    $taskPayload = @{ correo = $taskAdminEmail.Trim().ToLowerInvariant(); password = $taskAdminPassword } | ConvertTo-Json -Compress
    $taskLogin = Invoke-RestMethod -Uri ($taskBase + '/api/auth/login') -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($taskPayload)) -TimeoutSec 15
    if ($taskLogin.rol -ne 'ADMIN' -or [string]::IsNullOrWhiteSpace($taskLogin.token)) { throw 'La autenticacion no devolvio rol ADMIN.' }
    $taskMe = Invoke-RestMethod -Uri ($taskBase + '/api/auth/me') -Headers @{ Authorization = 'Bearer ' + $taskLogin.token } -TimeoutSec 15
    if ($taskMe.rol -ne 'ADMIN' -or $taskMe.id -ne $taskLogin.id) { throw 'No se pudo validar la sesion ADMIN.' }
    Write-Output 'ADMIN_LOGIN_VERIFIED: HTTP 200, rol ADMIN y sesion autenticada con la credencial del entorno.'
} catch {
    Write-Output 'ADMIN_LOGIN_VERIFICATION_FAILED: no se muestran credenciales, tokens ni contenido de la respuesta.'
    exit 1
} finally {
    $taskAdminPassword = $null
    $taskAdminEmail = $null
    $taskPayload = $null
    $taskLogin = $null
    $taskMe = $null
}
