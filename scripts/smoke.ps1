param([string]$Base = "http://localhost:3000")
$ErrorActionPreference = "Stop"

function Post($path, $body) {
  Invoke-RestMethod -Method Post -Uri "$Base$path" -ContentType "application/json" -Body ($body | ConvertTo-Json)
}

$s = Post "/api/session" @{ pointId = "entrada-principal" }
Write-Host "sessao: $($s.sessionId) em $($s.point.name)"
$id = $s.sessionId
$steps = @(
  @{ sessionId = $id },
  @{ sessionId = $id; quickReplyId = "banheiros" },
  @{ sessionId = $id; quickReplyId = "alimentacao" },
  @{ sessionId = $id; quickReplyId = "lojas" },
  @{ sessionId = $id; message = "Pernambucanas" },
  @{ sessionId = $id; quickReplyId = "servicos" },
  @{ sessionId = $id; message = "tem estacionamento?" }
)
foreach ($st in $steps) {
  $r = Post "/api/chat" $st
  Write-Host ("-> " + ($st | ConvertTo-Json -Compress))
  foreach ($m in $r.messages) {
    $tag = ""
    if ($m.map) { $tag = " [mapa]" }
    Write-Host ("   bot: " + $m.text + $tag)
  }
}
Write-Host "OK"
