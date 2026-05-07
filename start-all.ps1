$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$serverDir = Join-Path $projectRoot "server"
$aiDir = Join-Path $projectRoot "ai-module"
$clientDir = Join-Path $projectRoot "client"

if (-not (Test-Path $serverDir)) {
  throw "Missing server directory at $serverDir"
}

if (-not (Test-Path $aiDir)) {
  throw "Missing ai-module directory at $aiDir"
}

if (-not (Test-Path $clientDir)) {
  throw "Missing client directory at $clientDir"
}

$serverCommand = "Set-Location '$serverDir'; npm run dev"
$clientCommand = "Set-Location '$clientDir'; npm run dev"

if (Test-Path (Join-Path $aiDir ".venv\Scripts\Activate.ps1")) {
  $aiCommand = "Set-Location '$aiDir'; .\.venv\Scripts\Activate.ps1; python -m src.app"
} else {
  $aiCommand = "Set-Location '$aiDir'; python -m src.app"
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverCommand
Start-Process powershell -ArgumentList "-NoExit", "-Command", $aiCommand
Start-Process powershell -ArgumentList "-NoExit", "-Command", $clientCommand

Write-Host "Started server, ai-module, and client in separate terminals."
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5000"
Write-Host "AI API:   http://127.0.0.1:5001"
