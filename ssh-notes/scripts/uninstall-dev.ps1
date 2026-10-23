param(
    [string]$PluginsDirectory = (Join-Path $env:APPDATA 'tabby\plugins')
)

$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$target = Join-Path (Join-Path $PluginsDirectory 'node_modules') 'tabby-ssh-notes'

if (-not (Test-Path $target)) {
    Write-Host "No development plugin found at $target"
    return
}

$item = Get-Item $target -Force
if ($item.LinkType -ne 'Junction' -or -not (@($item.Target) -contains $project)) {
    throw "Refusing to remove $target because it is not the junction for $project."
}

# PowerShell 5.1 can throw NullReferenceException when Remove-Item is used on a junction.
# cmd's rmdir removes the reparse point without touching the target directory.
& cmd.exe /c rmdir "$target"
if (Test-Path $target) {
    throw "Could not remove junction: $target"
}
Write-Host "Removed development plugin link: $target"
Write-Host "SSH Notes data was not deleted. It remains in $env:APPDATA\tabby\config.yaml under sshNotes."
