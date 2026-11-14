# Smoke de chamados. Requer o servidor rodando com PANEL_PASSWORD definida.
# Uso: $env:PANEL_PASSWORD="minha-senha"; npm run smoke:tickets   (BASE padrão http://localhost:3000)
$ErrorActionPreference = "Stop"
$base = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }
$pass = $env:PANEL_PASSWORD
if (-not $pass) { throw "Defina PANEL_PASSWORD" }

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

# Sem login deve ser 401
try { Invoke-RestMethod "$base/api/panel/tickets" | Out-Null; throw "painel público!" } catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw }
}

# Cookie é Secure em produção; em HTTP puro o cliente não o reenvia, então repassamos à mão.
$login = Invoke-WebRequest "$base/api/panel/login" -Method Post -UseBasicParsing -ContentType "application/json" -Body (@{ password = $pass } | ConvertTo-Json)
$value = (($login.Headers["Set-Cookie"] -split ";")[0] -split "=", 2)[1]
$web = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$web.Cookies.Add((New-Object System.Net.Cookie("capibot_staff", $value, "/", ([Uri]$base).Host)))
$list = Invoke-RestMethod "$base/api/panel/tickets?status=novo" -WebSession $web
Write-Host "novos no painel: $($list.tickets.Count)"

Invoke-RestMethod "$base/api/panel/tickets/$($r.ticketId)" -Method Patch -ContentType "application/json" -Body '{"action":"assumir","staffName":"Marcos"}' -WebSession $web | Out-Null
$pub = Invoke-RestMethod "$base/api/tickets/$($r.ticketId)?sessionId=$($s.sessionId)"
if ($pub.status -ne "assumido" -or $pub.assignedTo -ne "Marcos") { throw "status inesperado: $($pub | ConvertTo-Json)" }
Write-Host "OK: $($pub.id) assumido por $($pub.assignedTo)"
