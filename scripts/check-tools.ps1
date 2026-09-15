$ErrorActionPreference = "SilentlyContinue"

$tools = @(
  @{ Name = "git"; Command = "git"; Args = @("--version") },
  @{ Name = "node"; Command = "node"; Args = @("--version") },
  @{ Name = "npm"; Command = "npm"; Args = @("--version") },
  @{ Name = "python"; Command = "python"; Args = @("--version") },
  @{ Name = "qmd"; Command = "qmd"; Args = @("--version") },
  @{ Name = "claude"; Command = "claude"; Args = @("--version") },
  @{ Name = "codex"; Command = "codex"; Args = @("--version") },
  @{ Name = "hermes"; Command = "hermes"; Args = @("--version") }
)

$result = @()
foreach ($tool in $tools) {
  $cmd = Get-Command $tool.Command -ErrorAction SilentlyContinue
  if ($null -eq $cmd) {
    $result += [PSCustomObject]@{ Tool = $tool.Name; Available = $false; Version = "" }
    continue
  }
  $output = & $tool.Command @($tool.Args) 2>&1 | Select-Object -First 1
  $result += [PSCustomObject]@{ Tool = $tool.Name; Available = $true; Version = [string]$output }
}

$result | Format-Table -AutoSize
