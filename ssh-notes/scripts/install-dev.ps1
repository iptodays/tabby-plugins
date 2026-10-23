param(
    [string]$PluginsDirectory = (Join-Path $env:APPDATA 'tabby\plugins'),
    [switch]$Build
)

$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nodeModules = Join-Path $PluginsDirectory 'node_modules'
$target = Join-Path $nodeModules 'tabby-ssh-notes'

if ($Build) {
    Push-Location $project
    try {
        npm run build
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path (Join-Path $project 'dist\index.js'))) {
    throw "dist/index.js not found. Run 'npm run build' first."
}

New-Item -ItemType Directory -Force -Path $nodeModules | Out-Null

$existing = Get-Item $target -Force -ErrorAction SilentlyContinue
if ($existing) {
    if ($existing.LinkType -eq 'Junction' -and (@($existing.Target) -contains $project)) {
        Write-Host "Development plugin is already linked: $target"
        return
    }
    throw "Refusing to replace an existing non-matching plugin at $target. Remove it manually after checking it."
}

New-Item -ItemType Junction -Path $target -Target $project | Out-Null
Write-Host "Linked $target -> $project"
Write-Host ""
Write-Host "Restart Tabby, then open Settings -> SSH Notes."
Write-Host "For DevTools, start Tabby with --debug."
Write-Host "Logs: $env:APPDATA\tabby\log.txt"
Write-Host ""
Write-Host "Note: TABBY_PLUGINS uses ':' as a separator and is unreliable for Windows absolute paths. This junction avoids that issue."
