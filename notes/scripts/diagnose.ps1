param(
    [string]$TabbyExe
)

$ErrorActionPreference = 'Continue'

function Find-TabbyExecutable {
    param([string]$ExplicitPath)

    if ($ExplicitPath) {
        if (Test-Path $ExplicitPath) {
            return (Resolve-Path $ExplicitPath).Path
        }
        Write-Warning "Tabby executable not found at explicit path: $ExplicitPath"
    }

    $running = Get-Process Tabby -ErrorAction SilentlyContinue |
        Where-Object { $_.Path } |
        Select-Object -First 1
    if ($running -and (Test-Path $running.Path)) {
        return $running.Path
    }

    $uninstallRoots = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    $entries = Get-ItemProperty $uninstallRoots -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -like '*Tabby*' }
    foreach ($entry in $entries) {
        if ($entry.DisplayIcon) {
            $icon = ($entry.DisplayIcon -replace ',\d+$', '').Trim('"')
            if (Test-Path $icon) {
                return $icon
            }
        }
        if ($entry.InstallLocation) {
            $candidate = Join-Path $entry.InstallLocation 'Tabby.exe'
            if (Test-Path $candidate) {
                return $candidate
            }
        }
    }

    $common = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Tabby\Tabby.exe'),
        (Join-Path $env:ProgramFiles 'Tabby\Tabby.exe')
    )
    if (${env:ProgramFiles(x86)}) {
        $common += (Join-Path ${env:ProgramFiles(x86)} 'Tabby\Tabby.exe')
    }
    foreach ($candidate in $common) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

$exe = Find-TabbyExecutable -ExplicitPath $TabbyExe
$configPath = Join-Path $env:APPDATA 'tabby\config.yaml'
$logPath = Join-Path $env:APPDATA 'tabby\log.txt'
$pluginPath = Join-Path $env:APPDATA 'tabby\plugins\node_modules\tabby-ssh-notes'

Write-Host '=== Tabby SSH Notes diagnostics ==='
if ($exe) {
    $version = (Get-Item $exe).VersionInfo
    Write-Host "Tabby: $exe"
    Write-Host "Tabby version: $($version.ProductVersion)"
} else {
    Write-Host 'Tabby: executable not found in known locations (use -TabbyExe "<path>" if installed elsewhere)'
}
Write-Host "Config: $configPath"
Write-Host "Log: $logPath"
Write-Host "Plugin path: $pluginPath"

if (Test-Path $pluginPath) {
    $item = Get-Item $pluginPath -Force
    Write-Host "Plugin link type: $($item.LinkType)"
    Write-Host "Plugin target: $($item.Target -join ', ')"
    $packagePath = Join-Path $pluginPath 'package.json'
    if (Test-Path $packagePath) {
        $package = Get-Content $packagePath -Raw | ConvertFrom-Json
        Write-Host "Plugin package: $($package.name) $($package.version)"
    }
    Write-Host "Built bundle: $(Test-Path (Join-Path $pluginPath 'dist\index.js'))"
} else {
    Write-Host 'Plugin is not installed at the standard user plugin path.'
}

if (Test-Path $configPath) {
    Write-Host ''
    Write-Host '--- SSH Notes config presence ---'
    $lines = Get-Content $configPath
    $index = ($lines | Select-String -Pattern '^sshNotes:' | Select-Object -First 1).LineNumber
    if ($index) {
        $lines[($index - 1)..([Math]::Min($lines.Length - 1, $index + 18))] | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host 'No sshNotes section found. The plugin has not saved data yet.'
    }
} else {
    Write-Host 'Config file not found.'
}

if (Test-Path $logPath) {
    Write-Host ''
    Write-Host '--- Relevant log lines (last 300) ---'
    Get-Content $logPath -Tail 300 | Select-String -Pattern 'ssh-notes|SSH Notes|Could not load|Angular bootstrapping|Safe mode|Loading .*notes' | Select-Object -Last 40 | ForEach-Object { Write-Host $_.Line }
}

Write-Host ''
Write-Host 'If Tabby fails to start after installing the plugin:'
Write-Host '1. Start Tabby in safe mode when prompted.'
Write-Host '2. Open Settings -> Plugins and disable "SSH Notes".'
Write-Host '3. Check the log lines above for the load error.'
Write-Host '4. Reinstall the matching build for this Tabby version.'
Write-Host 'Your notes are stored in config.yaml under sshNotes and are not deleted by disabling the plugin.'
