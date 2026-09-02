<#
.SYNOPSIS
  Stops everything started by run-native.ps1 (reads C:\pv-native\pids\services.txt).

.PARAMETER KeepInfra
  Leave MongoDB/Redis/Vault/Kafka running (handy when you're about to re-run run-native.ps1 -SkipInfra
  to iterate on the Java services only).
#>
param(
    [switch]$KeepInfra
)

$PidsFile = 'C:\pv-native\pids\services.txt'
$infraNames = @('mongod', 'redis', 'vault', 'kafka')

if (-not (Test-Path $PidsFile)) {
    Write-Host "No $PidsFile found — nothing tracked to stop." -ForegroundColor Yellow
    exit 0
}

Get-Content $PidsFile | Where-Object { $_ -match '=' } | ForEach-Object {
    $name, $procId = $_ -split '=', 2
    if ($KeepInfra -and ($infraNames -contains $name)) {
        Write-Host "Keeping $name (pid $procId) running (-KeepInfra)" -ForegroundColor DarkGray
        return
    }
    if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
        # taskkill /T kills the whole process tree — needed for kafka-server-start.bat, which is a
        # cmd.exe wrapper around a child java.exe that Stop-Process alone would leave orphaned.
        taskkill /PID $procId /T /F 2>&1 | Out-Null
        Write-Host "Stopped $name (pid $procId)" -ForegroundColor Green
    } else {
        Write-Host "$name (pid $procId) already gone" -ForegroundColor DarkGray
    }
}

if (-not $KeepInfra) {
    Remove-Item $PidsFile -Force -ErrorAction SilentlyContinue
    Write-Host "`nEverything stopped." -ForegroundColor Green
} else {
    (Get-Content $PidsFile) | Where-Object { ($_ -split '=', 2)[0] -in $infraNames } | Set-Content $PidsFile
    Write-Host "`nJava services stopped, infra left running." -ForegroundColor Green
}
