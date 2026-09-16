[CmdletBinding()]
param(
    [string]$Model = "sonnet"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$promptPath = Join-Path $repoRoot "EXECUTION\CLAUDE_CODE_TRANSFER_PROMPT.md"

Push-Location $repoRoot
try {
    $dirty = git status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect Git state."
    }
    if ($dirty) {
        throw "Refusing to launch Claude Code from a dirty worktree. Preserve or commit existing work first."
    }

    python scripts/execution_loop.py status
    if ($LASTEXITCODE -ne 0) {
        throw "Execution state is unavailable or invalid."
    }

    $prompt = Get-Content -Raw -LiteralPath $promptPath
    & claude --model $Model --permission-mode auto $prompt
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
