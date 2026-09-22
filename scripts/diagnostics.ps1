# scripts/diagnostics.ps1 -- TASK-P09-01 recovery diagnostics for the Mozare Workbench.
#
# Contract (SCN-LOC-01, ORACLE-001, TEST-017):
#   - canonical project truth (seed/example-project/PROJECT.md) missing  -> BLOCKING
#     with a recovery route (ORACLE-001 negative branch);
#   - derived cache (.mozare/cache) missing -> non-blocking: reported as
#     reconstructable from canonical records (SCN-LOC-01);
#   - optional capabilities (qmd, claude, codex, hermes) reported truthfully per
#     machine, absence is advisory (ORACLE-023);
#   - server reachability probed without starting anything; unreachable is a
#     truthful non-blocking status (SCN-LOC-02 style degradation).
#
# Usage:
#   powershell -File scripts/diagnostics.ps1          # human-readable report
#   powershell -File scripts/diagnostics.ps1 -Json    # machine-readable JSON
#   powershell -File scripts/diagnostics.ps1 -Json -Root C:\path\to\root
#
# Exit codes: 0 report produced and no blocking condition (or only advisory ones);
# 1 report produced but a blocking condition exists; 2 the report could not be produced.

param(
  [switch]$Json,
  [string]$Root
)

$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }

$blocking = New-Object System.Collections.Generic.List[string]
$recovery = New-Object System.Collections.Generic.List[string]
$advisories = New-Object System.Collections.Generic.List[string]

# --- git head ---------------------------------------------------------------
$head = $null
try {
  $head = (& git -C $Root 'rev-parse' 'HEAD' 2>$null | Select-Object -First 1)
  if ($LASTEXITCODE -ne 0) { $head = $null }
} catch { $head = $null }

# --- tool availability ------------------------------------------------------
function Test-ToolAvailable([string]$Name) {
  try { return ($null -ne (Get-Command $Name -ErrorAction SilentlyContinue)) } catch { return $false }
}
$nodeAvailable = Test-ToolAvailable 'node'
$npmAvailable = Test-ToolAvailable 'npm'
$tsxPath = Join-Path (Join-Path (Join-Path (Join-Path $Root 'node_modules') 'tsx') 'dist') 'cli.mjs'
$tsxAvailable = ($nodeAvailable -and (Test-Path $tsxPath))

$capabilities = [ordered]@{}
foreach ($tool in @('qmd', 'claude', 'codex', 'hermes')) {
  $available = Test-ToolAvailable $tool
  $capabilities[$tool] = $available
  if (-not $available) {
    $advisories.Add("optional:$tool unavailable; $tool-dependent flows degrade truthfully") | Out-Null
  }
}

# --- canonical truth vs derived cache (ORACLE-001 / SCN-LOC-01) ---------------
$canonicalMd = Join-Path (Join-Path (Join-Path $Root 'seed') 'example-project') 'PROJECT.md'
$canonicalPresent = Test-Path $canonicalMd
if (-not $canonicalPresent) {
  $blocking.Add('canonical: seed/example-project/PROJECT.md missing (canonical project truth)') | Out-Null
  $recovery.Add('canonical: restore canonical records via git checkout -- seed/example-project or re-clone the repository') | Out-Null
}

$derivedCacheDir = Join-Path (Join-Path $Root '.mozare') 'cache'
$derivedCachePresent = Test-Path $derivedCacheDir
# Derived cache is disposable by definition: always reconstructable from canonical records.
$derivedCache = [ordered]@{
  present         = $derivedCachePresent
  reconstructable = $canonicalPresent
}
if (-not $derivedCachePresent -and $canonicalPresent) {
  $recovery.Add('derived_cache: absent but rebuildable -- the context compiler reconstructs it from canonical records on next run (no action required)') | Out-Null
}

# --- server reachability (probe only; never starts the server) ----------------
$serverPort = if ($env:MOZARE_SERVER_PORT) { [int]$env:MOZARE_SERVER_PORT } else { 5174 }
$serverHealth = 'unreachable'
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$serverPort/health" -TimeoutSec 3
  if ($response.StatusCode -eq 200) { $serverHealth = 'ok' }
} catch {
  $serverHealth = 'unreachable'
}
$server = [ordered]@{
  url    = "http://127.0.0.1:$serverPort"
  health = $serverHealth
}
if ($serverHealth -eq 'unreachable') {
  $advisories.Add("server: optional context/evidence API unreachable at http://127.0.0.1:$serverPort; core web app stays usable (truthful degradation)") | Out-Null
}

# --- listener checks ----------------------------------------------------------
function Test-PortListening([int]$Port) {
  try {
    $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    return ($null -ne $conn)
  } catch { return $false }
}
$webPort = if ($env:MOZARE_PORT) { [int]$env:MOZARE_PORT } else { 5173 }
$portListens = [ordered]@{
  web    = (Test-PortListening $webPort)
  server = (Test-PortListening $serverPort)
}

# --- hint ---------------------------------------------------------------------
$hint = $null
if (-not $nodeAvailable) {
  $hint = 'Install the Node.js LTS (22.x) from https://nodejs.org, then re-run START_MOZARE.cmd.'
} elseif (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  $hint = 'Run npm install in this folder, then re-run START_MOZARE.cmd.'
} elseif ($blocking.Count -gt 0) {
  $hint = 'Canonical project truth is missing; restore seed records (git checkout -- seed/example-project) before launching.'
} elseif (-not $portListens.web) {
  $hint = "The web app is not listening on 127.0.0.1:$webPort; run START_MOZARE.cmd to launch it."
} elseif (-not $portListens.server) {
  $hint = "The web app is up; the optional context/evidence server is not listening on 127.0.0.1:$serverPort (fine for core use)."
} else {
  $hint = "Both components are listening: http://127.0.0.1:$webPort (web) and http://127.0.0.1:$serverPort (server)."
}

# --- result -------------------------------------------------------------------
$ok = ($blocking.Count -eq 0)
$report = [ordered]@{
  ok            = $ok
  root          = $Root
  head          = $head
  node_available = $nodeAvailable
  npm_available = $npmAvailable
  tsx_available = $tsxAvailable
  canonical     = [ordered]@{ present = $canonicalPresent; project_md = $canonicalMd }
  derived_cache = $derivedCache
  capabilities  = $capabilities
  server        = $server
  port_listens  = $portListens
  blocking      = $blocking
  advisories    = $advisories
  recovery      = $recovery
  hint          = $hint
}

if ($Json) {
  $report | ConvertTo-Json -Depth 5
} else {
  Write-Host "Mozare Workbench diagnostics ($Root)"
  Write-Host "  head:             $head"
  Write-Host "  node available:   $nodeAvailable"
  Write-Host "  npm available:    $npmAvailable"
  Write-Host "  tsx available:    $tsxAvailable (optional context/evidence server)"
  Write-Host "  canonical truth:  $(if ($canonicalPresent) { 'present' } else { 'MISSING' })"
  Write-Host "  derived cache:    $(if ($derivedCachePresent) { 'present' } else { 'absent (rebuildable from canonical records)' })"
  foreach ($k in $capabilities.Keys) {
    $state = if ($capabilities[$k]) { 'available' } else { 'missing' }
    Write-Host "  optional:$k       : $state"
  }
  Write-Host "  server health:    $serverHealth (127.0.0.1:$serverPort, optional)"
  Write-Host "  web listening:    $($portListens.web) (127.0.0.1:$webPort)"
  Write-Host "  hint:             $hint"
  foreach ($b in $blocking) { Write-Host "  blocking: $b" -ForegroundColor Red }
  foreach ($r in $recovery) { Write-Host "  recovery: $r" }
}
if ($blocking.Count -eq 0) { exit 0 } else { exit 1 }
