$ErrorActionPreference = 'Stop'
$cfgLive = @{}
Get-Content -LiteralPath (Join-Path (Get-Location) '.env') | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)$') { $cfgLive[$Matches[1]] = $Matches[2].Trim().Trim([char]34, [char]39) }
}
if (-not $cfgLive['LIVEKIT_URL'] -or -not $cfgLive['LIVEKIT_API_KEY'] -or -not $cfgLive['LIVEKIT_API_SECRET']) { Write-Output 'LiveKit: configuración incompleta'; exit 1 }
function To-Base64Url([byte[]]$valor) { [Convert]::ToBase64String($valor).TrimEnd('=').Replace('+','-').Replace('/','_') }
$ahoraLive = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$claimsLive = @{ iss=$cfgLive['LIVEKIT_API_KEY']; sub='seatour-verificacion-lectura'; nbf=$ahoraLive; exp=($ahoraLive+60); video=@{ roomList=$true } } | ConvertTo-Json -Compress
$cabeceraLive = To-Base64Url ([Text.Encoding]::UTF8.GetBytes('{"alg":"HS256","typ":"JWT"}'))
$payloadLive = To-Base64Url ([Text.Encoding]::UTF8.GetBytes($claimsLive))
$datosLive = $cabeceraLive + '.' + $payloadLive
$hmacLive = New-Object Security.Cryptography.HMACSHA256
$hmacLive.Key = [Text.Encoding]::UTF8.GetBytes($cfgLive['LIVEKIT_API_SECRET'])
$tokenLive = $datosLive + '.' + (To-Base64Url ($hmacLive.ComputeHash([Text.Encoding]::UTF8.GetBytes($datosLive))))
$hmacLive.Dispose()
$urlLive = $cfgLive['LIVEKIT_URL'] -replace '^wss://','https://' -replace '^ws://','http://'
try {
    $respuestaLive = Invoke-WebRequest -UseBasicParsing -Uri ($urlLive.TrimEnd('/') + '/twirp/livekit.RoomService/ListRooms') -Method Post -ContentType 'application/json' -Body '{}' -Headers @{ Authorization=('Bearer '+$tokenLive) } -TimeoutSec 15
    Write-Output ('LiveKit ListRooms (solo lectura): HTTP ' + [int]$respuestaLive.StatusCode)
} catch {
    if ($_.Exception.Response) { Write-Output ('LiveKit ListRooms: HTTP '+[int]$_.Exception.Response.StatusCode) }
    else { Write-Output 'LiveKit: no se pudo completar la conexión HTTPS' }
    exit 1
}
