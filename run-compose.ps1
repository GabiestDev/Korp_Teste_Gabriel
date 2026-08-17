# Run the docker-compose stack using .env if present
# Usage (PowerShell):
#   ./run-compose.ps1    # uses .env if present, otherwise uses defaults

$envFile = Join-Path (Get-Location) ".env"
if (Test-Path $envFile) {
    Write-Host "Using .env file for docker compose"
    docker compose --env-file .env up --build -d
} else {
    Write-Host "No .env file found — using docker-compose defaults"
    docker compose up --build -d
}
