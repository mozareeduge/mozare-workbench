param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Mozare Workbench implementation handoff" -ForegroundColor Cyan
Write-Host "Root: $Root"

& "$PSScriptRoot\check-tools.ps1"

Write-Host ""
Write-Host "Validating handoff package..."
python "$PSScriptRoot\qa_package.py"

if ($CheckOnly) {
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Package is an implementation handoff, not the finished application yet."
Write-Host "Open START_HERE_PROMPT.md and hand it to Claude Code, Codex, or Hermes from the project root."
