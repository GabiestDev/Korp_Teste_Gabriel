Param(
    [string]$Source
)

# If no source provided, try to read from .env FRONTEND_CONTEXT
if (-not $Source -and (Test-Path ".env")) {
    $lines = Get-Content .env | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
    foreach ($line in $lines) {
        if ($line -match '^\s*FRONTEND_CONTEXT\s*=\s*(.+)$') { $Source = $Matches[1].Trim() }
    }
}

if (-not $Source) {
    $Source = Read-Host "Informe o caminho completo da pasta do frontend (ex: D:\\repos\\Korp_Teste_Gabriel\\Korp-Frontend-Gabriel)"
}

$Source = $Source.Trim('"')
$Target = Join-Path (Get-Location) "Korp-Frontend-Gabriel"

if (-not (Test-Path $Source)) {
    Write-Error "Source path '$Source' não encontrado. Aborting."
    exit 1
}

# If source is same as target, do nothing
try { $resolvedSource = (Resolve-Path -Path $Source).ProviderPath } catch { $resolvedSource = $Source }
try { $resolvedTarget = (Resolve-Path -Path $Target -ErrorAction SilentlyContinue).ProviderPath } catch { $resolvedTarget = $null }

if ($resolvedSource -eq $resolvedTarget) {
    Write-Host "Source and target are the same; nothing to do."
    exit 0
}

# Ensure target exists
if (-not (Test-Path $Target)) { New-Item -ItemType Directory -Path $Target | Out-Null }

# Exclude common heavy or VCS folders
$excludes = @("node_modules", ".git", ".angular", "dist", ".cache")

Write-Host "Copying frontend from '$Source' to '$Target' (excluding: $($excludes -join ', '))"

# Use robocopy for robust copying on Windows
$robocopyArgs = @($Source, $Target, "/MIR")
$robocopyArgs += "/XD"
$robocopyArgs += $excludes

Write-Host "Running robocopy $($robocopyArgs -join ' ')"

& robocopy @robocopyArgs | Out-Null

$rc = $LASTEXITCODE
# robocopy returns codes where 0..3 are success
if ($rc -le 3) {
    Write-Host "Frontend imported successfully to $Target"
    exit 0
} else {
    Write-Error "robocopy failed with exit code $rc"
    exit $rc
}
