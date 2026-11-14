# Smoke de chamados. Requer o servidor rodando. O painel não tem senha.
# Uso: npm run smoke:tickets   (BASE padrão http://localhost:3000)
$ErrorActionPreference = "Stop"
$base = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }

$s = Invoke-RestMethod "$base/api/session" -Method Post -ContentType "application/json" -Body '{"pointId":"entrada-principal"}'
Write-Host "sessão: $($s.sessionId)"

# Chamado sem foto
$r = curl.exe -s -F "sessionId=$($s.sessionId)" -F "text=perdi meu carro no estacionamento" "$base/api/tickets" | ConvertFrom-Json
Write-Host "criado: $($r.ticketId) (eta $($r.etaMinutes) min)"

# Chamado com foto (PNG 1x1)
$png = [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
$tmp = Join-Path $env:TEMP "smoke.png"
[IO.File]::WriteAllBytes($tmp, $png)
$r2 = curl.exe -s -F "sessionId=$($s.sessionId)" -F "text=com foto" -F "photo=@$tmp;type=image/png" "$base/api/tickets" | ConvertFrom-Json
Write-Host "criado com foto: $($r2.ticketId)"

$list = Invoke-RestMethod "$base/api/panel/tickets?status=novo"
Write-Host "novos no painel: $($list.tickets.Count)"

Invoke-RestMethod "$base/api/panel/tickets/$($r.ticketId)" -Method Patch -ContentType "application/json" -Body '{"action":"assumir","staffName":"Marcos"}' | Out-Null
$pub = Invoke-RestMethod "$base/api/tickets/$($r.ticketId)?sessionId=$($s.sessionId)"
if ($pub.status -ne "assumido" -or $pub.assignedTo -ne "Marcos") { throw "status inesperado: $($pub | ConvertTo-Json)" }
Write-Host "OK: $($pub.id) assumido por $($pub.assignedTo)"
