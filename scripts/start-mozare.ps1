# scripts/start-mozare.ps1 -- TASK-P09-01 Windows launcher for the Mozare Workbench web app.
#
# Behavior:
#   1. Runs scripts/preflight.ps1. Failures stop the launch with actionable guidance.
#   2. Starts the web app (Vite) on 127.0.0.1 (TEST-013 / ORACLE-019: loopback only).
#   3. Starts the optional context/evidence API server (src/server/index.ts) when Node
#      tooling is available; if that env probe fails, the launcher continues and the
#      missing component is reported honestly (TEST-017: truthful degradation).
#   4. Opens the default browser at the web app URL (SCN-ORI-01: project entry opens
#      Focus -- the web app is the Focus surface; never a blank chat/transcript).
#
# Exit codes: 0 launched (either component); 1 preflight failed; 2 environment probe
# failed for both components (nothing launched); 130 interrupted by the user (Ctrl+C).
#
# Env: MOZARE_PORT (web app port, default 5173); MOZARE_SERVER_PORT (API server port,
# default 5174).

param(
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-MozareStep([string]$Message) {
  Write-Host "[mozare] $Message"
}

# ---------------------------------------------------------------------------
# 1. Preflight
# ---------------------------------------------------------------------------
& (Join-Path $PSScriptRoot 'preflight.ps1')
if ($LASTEXITCODE -ne 0) {
  exit 1
}
if ($CheckOnly) {
  Write-MozareStep 'CheckOnly: preflight passed; nothing launched.'
  exit 0
}

# ---------------------------------------------------------------------------
# 2. Environment probe
# ---------------------------------------------------------------------------
$probeJson = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'diagnostics.ps1') -Json
$probe = $probeJson | ConvertFrom-Json
$launchWeb = ($probe.node_available -eq $true)
$launchServer = ($probe.tsx_available -eq $true -and $probe.node_available -eq $true)

if (-not $launchWeb -and -not $launchServer) {
  Write-Host '[mozare] Environment probe failed for both components; nothing launched.' -ForegroundColor Red
  Write-Host '[mozare] Fix Node.js first: https://nodejs.org (LTS). Then re-run START_MOZARE.cmd.'
  exit 2
}
if (-not $launchServer) {
  Write-Host '[mozare] tsx unavailable: the context/evidence server is OPTIONAL and will not start; the web app is fully usable without it.' -ForegroundColor Yellow
}

$webPort = if ($env:MOZARE_PORT) { $env:MOZARE_PORT } else { '5173' }
$serverPort = if ($env:MOZARE_SERVER_PORT) { $env:MOZARE_SERVER_PORT } else { '5174' }

# ---------------------------------------------------------------------------
# 3. Launch (argv-safe: Start-Process with an argument list, never string interpolation)
# ---------------------------------------------------------------------------
$jobs = @()

if ($launchServer) {
  Write-MozareStep "Starting context/evidence server on 127.0.0.1:$serverPort (optional component)..."
  $previousPort = $env:MOZARE_PORT
  $env:MOZARE_PORT = $serverPort
  $jobs += Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/s', '/c', 'npx tsx src/server/index.ts' -WorkingDirectory $Root -WindowStyle Minimized -PassThru
  $env:MOZARE_PORT = $previousPort
}

Write-MozareStep "Starting web app on 127.0.0.1:$webPort (Focus surface)..."
$jobs += Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/s', '/c', 'npm', 'run', 'dev:web', '--', "--port $webPort" -WorkingDirectory $Root -WindowStyle Minimized -PassThru

# Give Vite a moment, then open the browser on the web app URL.
Start-Sleep -Seconds 3
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$webPort" -TimeoutSec 10
  if ($response.StatusCode -eq 200) {
    Write-MozareStep "Web app is up on http://127.0.0.1:$webPort - opening your browser."
    if (-not $env:MOZARE_NO_BROWSER) { Start-Process "http://127.0.0.1:$webPort" }
  } else {
    Write-Host "[mozare] Web app responded with status $($response.StatusCode); open http://127.0.0.1:$webPort manually." -ForegroundColor Yellow
  }
} catch {
  Write-Host "[mozare] Could not reach http://127.0.0.1:$webPort yet ($($_.Exception.Message)); open it manually once the dev server finishes starting." -ForegroundColor Yellow
}

Write-MozareStep 'Launched. Close the spawned npm windows (or run scripts/diagnostics.ps1) to inspect state.'
exit 0
