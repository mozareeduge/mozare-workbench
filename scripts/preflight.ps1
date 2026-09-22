# scripts/preflight.ps1 -- TASK-P09-01 preflight for START_MOZARE.cmd / start-mozare.ps1.
#
# Contract (TEST-017, ORACLE-023):
#   - required runtime (node >= 22 < 26, npm, package.json, node_modules) and canonical
#     project truth (seed/example-project/PROJECT.md) are BLOCKING when missing
#     -- the launcher stops with actionable guidance;
#   - optional adapters (qmd, claude, codex, hermes) are ADVISORY: their absence
#     never blocks (the server degrades truthfully at runtime too, SCN-LOC-02);
#   - output is honest JSON with -Json, human-readable otherwise.
#
# Usage:
#   powershell -File scripts/preflight.ps1              # human-readable
#   powershell -File scripts/preflight.ps1 -Json        # machine-readable
#   powershell -File scripts/preflight.ps1 -Json -Root C:\path\to\root
#
# Exit codes: 0 all required checks passed; 1 at least one required check failed
# (nothing launched).

param(
  [switch]$Json,
  [string]$Root
)

$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }

$blocking = New-Object System.Collections.Generic.List[string]
$advisories = New-Object System.Collections.Generic.List[string]
$repair = New-Object System.Collections.Generic.List[string]

# --- required: node ---------------------------------------------------------
$nodeInfo = $null
try {
  $nodeOutput = & node --version 2>$null
  if ($LASTEXITCODE -eq 0 -and "$nodeOutput" -match 'v?(\d+)\.(\d+)\.(\d+)') {
    $nodeInfo = @{ major = [int]$Matches[1]; minor = [int]$Matches[2]; patch = [int]$Matches[3] }
  }
} catch { $nodeInfo = $null }

$nodePresent = ($null -ne $nodeInfo)
$nodeOk = $nodePresent -and ($nodeInfo.major -ge 22) -and ($nodeInfo.major -lt 26)
if (-not $nodePresent) {
  $blocking.Add('node: missing (required runtime)') | Out-Null
  $repair.Add('node: install the Node.js LTS (22.x) from https://nodejs.org, then re-run START_MOZARE.cmd') | Out-Null
} elseif (-not $nodeOk) {
  $nodeVersionText = "$($nodeInfo.major).$($nodeInfo.minor).$($nodeInfo.patch)"
  $blocking.Add("node: version $nodeVersionText outside required range >=22 <26") | Out-Null
  $repair.Add('node: install Node.js 22.x LTS from https://nodejs.org') | Out-Null
}

# --- required: npm ----------------------------------------------------------
$npmPresent = $false
try {
  $null = & npm --version 2>$null
  $npmPresent = ($LASTEXITCODE -eq 0)
} catch { $npmPresent = $false }
if (-not $npmPresent) {
  $blocking.Add('npm: missing (required runtime)') | Out-Null
  $repair.Add('npm: ships with Node.js; reinstall the Node.js LTS from https://nodejs.org') | Out-Null
}

# --- required: package.json ---------------------------------------------------
$packageJsonPath = Join-Path $Root 'package.json'
$packageJsonPresent = Test-Path $packageJsonPath
if (-not $packageJsonPresent) {
  $blocking.Add('package.json: missing (required)') | Out-Null
  $repair.Add('package.json: restore the repository (git clone https://github.com/mozareeduge/mozare-workbench, or restore from a known-good copy)') | Out-Null
}

# --- required: node_modules ---------------------------------------------------
$nodeModulesPath = Join-Path $Root 'node_modules'
$nodeModulesPresent = Test-Path $nodeModulesPath
if (-not $nodeModulesPresent) {
  $blocking.Add('node_modules: missing (required)') | Out-Null
  $repair.Add('node_modules: open a terminal in this folder and run: npm install') | Out-Null
}

# --- required: git ------------------------------------------------------------
$gitPresent = $false
try {
  $gitPresent = ($null -ne (Get-Command git -ErrorAction SilentlyContinue))
} catch { $gitPresent = $false }
if (-not $gitPresent) {
  $blocking.Add('git: missing (required for repository and diagnostics operations)') | Out-Null
  $repair.Add('git: install Git for Windows from https://git-scm.com, then re-run START_MOZARE.cmd') | Out-Null
}

# --- required: canonical project truth ---------------------------------------
$canonicalDir = Join-Path (Join-Path $Root 'seed') 'example-project'
$canonicalMd = Join-Path $canonicalDir 'PROJECT.md'
$canonicalPresent = Test-Path $canonicalMd
if (-not $canonicalPresent) {
  $blocking.Add('canonical: seed/example-project/PROJECT.md missing (canonical project truth)') | Out-Null
  $repair.Add('canonical: restore the canonical seed records (git checkout -- seed/example-project, or re-clone the repository)') | Out-Null
}
$canonical = [ordered]@{ present = $canonicalPresent; project_md = $canonicalMd }

# --- optional capabilities (advisory, TEST-017 / ORACLE-023) -------------------
# Presence check via Get-Command: works for .exe and .ps1 shims alike (qmd ships
# as a PowerShell shim on Windows, so a native-exit-code probe is unreliable).
$capabilities = [ordered]@{}
foreach ($tool in @('qmd', 'claude', 'codex', 'hermes')) {
  $available = $false
  try {
    $available = ($null -ne (Get-Command $tool -ErrorAction SilentlyContinue))
  } catch { $available = $false }
  $capabilities[$tool] = $available
  if (-not $available) {
    $advisories.Add("optional:$tool unavailable; $tool-dependent flows degrade truthfully (core canonical reading/review/manual workflows stay usable)") | Out-Null
  }
}

# --- result -------------------------------------------------------------------
$ok = ($blocking.Count -eq 0)
$nodeVersionText = if ($nodePresent) { "$($nodeInfo.major).$($nodeInfo.minor).$($nodeInfo.patch)" } else { $null }
$report = [ordered]@{
  ok           = $ok
  root         = $Root
  blocking     = $blocking
  node         = [ordered]@{ present = $nodePresent; major = $nodeInfo.major; ok = $nodeOk }
  npm          = [ordered]@{ present = $npmPresent }
  node_modules = [ordered]@{ present = $nodeModulesPresent }
  package_json = [ordered]@{ present = $packageJsonPresent }
  canonical    = $canonical
  capabilities = $capabilities
  advisories   = $advisories
  repair       = $repair
}

if ($Json) {
  $report | ConvertTo-Json -Depth 4
} else {
  Write-Host "[mozare] Preflight for $Root"
  if ($nodePresent) {
    Write-Host "  node >=22 <26 : v$nodeVersionText"
  } else {
    Write-Host '  node >=22 <26 : missing'
  }
  Write-Host "  npm           : $(if ($npmPresent) { 'present' } else { 'missing' })"
  Write-Host "  package.json  : $(if ($packageJsonPresent) { 'present' } else { 'missing' })"
  Write-Host "  node_modules  : $(if ($nodeModulesPresent) { 'present' } else { 'missing' })"
  Write-Host "  canonical     : $(if ($canonicalPresent) { 'present' } else { 'missing' })"
  foreach ($k in $capabilities.Keys) {
    $state = if ($capabilities[$k]) { 'available' } else { 'missing' }
    Write-Host "  optional:$k    : $state"
  }
  foreach ($a in $advisories) { Write-Host "  advisory: $a" -ForegroundColor Yellow }
  foreach ($b in $blocking) { Write-Host "  blocking: $b" -ForegroundColor Red }
  if ($ok) {
    Write-Host '[mozare] Preflight passed.'
  } else {
    Write-Host '[mozare] Preflight FAILED; nothing was launched. Fix the blocking items (see guidance above) and re-run START_MOZARE.' -ForegroundColor Red
  }
}
if ($ok) { exit 0 } else { exit 1 }
