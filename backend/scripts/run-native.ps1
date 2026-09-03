#Requires -Version 5.1
<#
.SYNOPSIS
  Runs the entire PeerVault backend (Mongo, Redis, Kafka, Vault, Eureka, Config Server, API Gateway,
  and all 7 business services, share-service included) as native Windows processes - no Docker.

.DESCRIPTION
  This is the no-Docker counterpart to `docker compose up`. Infra binaries (MongoDB, Redis, Kafka,
  Vault) are downloaded once into C:\pv-native - deliberately OUTSIDE this repo's (OneDrive-synced,
  space-containing) path, because:
    - Kafka's Windows .bat launcher enumerates every jar on its classpath onto one command line, and
      a long/spaced path pushes that over cmd.exe's ~8191-char limit ("The input line is too long").
    - OneDrive trying to live-sync thousands of small Kafka/Mongo/Redis data files is a bad time.
  Everything under C:\pv-native (binaries, data, logs, pids) is disposable/regenerable - delete the
  whole folder and re-run this script to start fresh.

  Every fix baked into this script (KAFKA_HEAP_OPTS to dodge a wmic dependency Windows 11 removed,
  spring.profiles.active=composite, the Vault X-Config-Token header, the retry max-interval bug, the
  absolute CONFIG_REPO_LOCATION override) was hit and diagnosed by actually running this stack
  end-to-end natively - see backend/pom.xml and the seven client application.yml files for the
  corresponding source-level fixes this script's environment variables depend on.

.PARAMETER Build
  Force a fresh `mvn package -DskipTests` even if jars already exist under */target/*.jar.

.PARAMETER SkipInfra
  Skip starting Mongo/Redis/Kafka/Vault (use when they're already running from a previous invocation).

.EXAMPLE
  .\scripts\run-native.ps1
  First run: downloads infra, builds jars, starts everything.

.EXAMPLE
  .\scripts\run-native.ps1 -SkipInfra
  Infra already running (e.g. from an earlier call) - just (re)start the Java services.
#>
param(
    [switch]$Build,
    [switch]$SkipInfra
)

$ErrorActionPreference = 'Stop'
$Backend = Split-Path -Parent $PSScriptRoot
$Native = 'C:\pv-native'
$Logs = Join-Path $Native 'logs'
$PidsFile = Join-Path $Native 'pids\services.txt'

# -- helpers --------------------------------------------------------------------------------------

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor DarkGray }

# Reads KEY=VALUE pairs from backend/.env (same file `docker compose` reads) so native mode is
# driven by the same real config instead of the hardcoded localhost defaults below. Blank/missing
# file just yields an empty table - every lookup against it then falls through to those defaults.
function Get-DotEnv([string]$Path) {
    $table = @{}
    if (-not (Test-Path $Path)) { return $table }
    foreach ($line in Get-Content $Path) {
        if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
        $key, $value = $line -split '=', 2
        $table[$key.Trim()] = $value.Trim()
    }
    return $table
}

function Test-Port([int]$Port, [string]$TargetHost = '127.0.0.1') {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect($TargetHost, $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(300)
        if ($ok -and $client.Connected) { $client.Close(); return $true }
        $client.Close()
        return $false
    } catch { return $false }
}

function Wait-Port([int]$Port, [string]$Name, [int]$TimeoutSec = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port -Port $Port) { Write-Ok "$Name is listening on port $Port"; return }
        Start-Sleep -Milliseconds 800
    }
    throw "$Name did not open port $Port within $TimeoutSec s - check $Logs\$Name.log"
}

function Wait-LogPattern([string]$LogFile, [string]$Pattern, [string]$Name, [int]$TimeoutSec = 120) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if ((Test-Path $LogFile) -and (Select-String -Path $LogFile -Pattern $Pattern -Quiet -ErrorAction SilentlyContinue)) {
            if (Select-String -Path $LogFile -Pattern 'ERROR|APPLICATION FAILED TO START' -Quiet -ErrorAction SilentlyContinue) {
                throw "$Name failed to start - see $LogFile"
            }
            Write-Ok "$Name started"
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "$Name did not start within $TimeoutSec s - check $LogFile"
}

# Self-healing cleanup for a very real failure mode: if a previous run of this script never went
# through stop-native.ps1 (Ctrl+C, a closed terminal, or the run itself throwing partway through -
# e.g. exactly the "Cannot remove item ...eureka-server.log ... being used by another process" crash
# this function exists to prevent), its java.exe processes are still alive and orphaned. Left alone
# they (a) keep old log files open, so Start-Tracked's own Remove-Item on the same filename fails
# outright, and (b) keep old ports bound, so Wait-Port/Wait-LogPattern below end up watching the OLD
# process's output instead of the new one this run just started. This has been observed to compound
# across repeated runs - TWO full stale generations of every service (including two Kafka brokers
# racing for the same port) were found running simultaneously with an empty PID ledger (so
# stop-native.ps1 had nothing to go on) after a couple of interrupted runs.
#
# Deliberately NOT ledger-based (the ledger is exactly what's unreliable in this scenario - it gets
# reset by the very next run, and an even-older orphan may predate it entirely). Instead this matches
# live java.exe processes by the literal jar filename on their command line - precise enough to never
# touch an unrelated java process elsewhere on the machine, and it catches every orphan regardless of
# which run started it or whether the ledger remembers it.
#
# Kafka gets different treatment than the rest: eureka-server/config-server/the business services/
# the gateway are *always* killed-and-restarted fresh by this script on every single invocation (no
# Test-Port guard for them, by deliberate design - "re-run to pick up new code"), so a live copy from
# a previous run is unconditionally stale and safe to kill here. Kafka is infra, like mongod/redis/
# vault - a single healthy instance is meant to keep running across invocations (see the Test-Port
# 9092 check below), so it's only touched here if there's a genuine *duplicate* (>1 kafka.Kafka
# process) - the actual bug this function exists for, not the normal "one instance, left alone" case.
function Stop-OrphanedJavaServices {
    $alwaysRestartJars = @(
        'eureka-server.jar', 'config-server.jar', 'api-gateway.jar', 'auth-service.jar', 'device-service.jar',
        'file-service.jar', 'transfer-service.jar', 'security-service.jar', 'notification-service.jar',
        'share-service.jar'
    )
    $allJava = Get-CimInstance Win32_Process -Filter "Name='java.exe'" -ErrorAction SilentlyContinue
    $toKill = @($allJava | Where-Object { $cmd = $_.CommandLine; $cmd -and ($alwaysRestartJars | Where-Object { $cmd -like "*$_*" }) })

    $kafkaProcs = @($allJava | Where-Object { $_.CommandLine -like '*kafka.Kafka*' })
    if ($kafkaProcs.Count -gt 1) { $toKill += $kafkaProcs }

    if (-not $toKill) { return }
    Write-Step 'Stopping PeerVault Java processes left running from a previous run'
    foreach ($p in $toKill) {
        # Every java.exe launched via the bare `java` command on this machine actually starts as a
        # parent/child pair (a "javapath" launcher stub that re-execs the real JDK's java.exe as a
        # child) - both ends independently match $toKill's jar-name filter above. `/T` below already
        # tree-kills the child along with its parent, so by the time this loop reaches the child's
        # own entry it may already be gone - `Get-Process` skips the now-redundant taskkill call for
        # it, and the try/catch is a second line of defense for the same race (also covers a process
        # that exits on its own between the filter above and this line). Without both, a "process not
        # found" from taskkill here would otherwise crash the whole script: PowerShell 5.1 promotes a
        # redirected native-command stderr line into a terminating error under this script's own
        # $ErrorActionPreference = 'Stop' - this was hit for real, not just theorized.
        if (-not (Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue)) { continue }
        try {
            taskkill /PID $p.ProcessId /T /F 2>&1 | Out-Null
        } catch {
            continue
        }
        Write-Info "Stopped orphaned java.exe (pid $($p.ProcessId))"
    }
    Start-Sleep -Seconds 2  # give Windows a moment to actually release the file handles/ports
}

function Start-Tracked([string]$Name, [string]$FilePath, [string[]]$ArgumentList, [hashtable]$Env = @{}, [string]$WorkingDirectory = $null) {
    $logFile = Join-Path $Logs "$Name.log"
    if (Test-Path $logFile) {
        try {
            Remove-Item $logFile -Force -ErrorAction Stop
        } catch {
            # Belt-and-suspenders: Stop-OrphanedJavaServices below should already have killed
            # whatever previously held this file open, so this is normally a no-op. If something
            # outside this script's own tracking still has it open (a log viewer, a process that
            # somehow survived taskkill), don't let that hard-crash the whole run over one log file
            # - RedirectStandardOutput just needs a writable path, not this exact handle gone first.
            Write-Host "    WARN: could not remove old $logFile ($($_.Exception.Message)) - leaving it, new output will append" -ForegroundColor Yellow
        }
    }
    foreach ($key in $Env.Keys) { Set-Item -Path "env:$key" -Value $Env[$key] }
    # Start-Process's ArgumentList does NOT auto-quote elements containing spaces (this repo's path
    # does: "New folder (2)") -- each element needs its own embedded quotes or the process sees it
    # split into several arguments (java then fails with "Unable to access jarfile C:\...\New").
    $quotedArgs = $ArgumentList | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }
    $params = @{
        FilePath              = $FilePath
        ArgumentList          = $quotedArgs
        WindowStyle           = 'Hidden'
        PassThru              = $true
        RedirectStandardOutput = $logFile
        RedirectStandardError  = "$logFile.err"
    }
    if ($WorkingDirectory) { $params['WorkingDirectory'] = $WorkingDirectory }
    $p = Start-Process @params
    foreach ($key in $Env.Keys) { Remove-Item -Path "env:$key" -ErrorAction SilentlyContinue }
    Add-Content -Path $PidsFile -Value "$Name=$($p.Id)"
    return $p
}

# -- layout ---------------------------------------------------------------------------------------

New-Item -ItemType Directory -Force -Path $Native, $Logs, "$Native\pids", "$Native\data\mongo", "$Native\data\kafka" | Out-Null

Stop-OrphanedJavaServices

if (-not $SkipInfra) { '' | Set-Content -Path $PidsFile }  # fresh PID ledger unless we're layering onto a running infra

$DotEnv = Get-DotEnv (Join-Path $Backend '.env')
if ($DotEnv.Count -gt 0) { Write-Info "Loaded backend\.env ($($DotEnv.Keys -join ', '))" }

$MongoDir = Join-Path $Native 'mongodb'
$RedisDir = Join-Path $Native 'redis'
$VaultDir = Join-Path $Native 'vault'
$KafkaDir = Join-Path $Native 'kafka'

# -- ensure infra binaries are present (idempotent - skips whatever's already extracted) ------------

function Ensure-Infra {
    if (-not (Test-Path "$MongoDir\bin\mongod.exe")) {
        Write-Step 'Downloading MongoDB (Windows, ~600MB, one-time)'
        $zip = Join-Path $Native 'mongodb.zip'
        Invoke-WebRequest -Uri 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14.zip' -OutFile $zip
        $tmp = Join-Path $Native 'mongodb_tmp'
        Expand-Archive -Path $zip -DestinationPath $tmp -Force
        $inner = Get-ChildItem $tmp | Select-Object -First 1
        Move-Item -Path "$($inner.FullName)\*" -Destination $MongoDir -Force
        Remove-Item $tmp, $zip -Recurse -Force
        Write-Ok 'MongoDB staged'
    }
    if (-not (Test-Path "$RedisDir\redis-server.exe")) {
        Write-Step 'Downloading Redis (Windows port, ~13MB, one-time)'
        $zip = Join-Path $Native 'redis.zip'
        Invoke-WebRequest -Uri 'https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip' -OutFile $zip
        Expand-Archive -Path $zip -DestinationPath $RedisDir -Force
        Remove-Item $zip -Force
        Write-Ok 'Redis staged'
    }
    if (-not (Test-Path "$VaultDir\vault.exe")) {
        Write-Step 'Downloading Vault (~150MB, one-time)'
        $zip = Join-Path $Native 'vault.zip'
        Invoke-WebRequest -Uri 'https://releases.hashicorp.com/vault/1.17.6/vault_1.17.6_windows_amd64.zip' -OutFile $zip
        Expand-Archive -Path $zip -DestinationPath $VaultDir -Force
        Remove-Item $zip -Force
        Write-Ok 'Vault staged'
    }
    if (-not (Test-Path "$KafkaDir\bin\windows\kafka-server-start.bat")) {
        Write-Step 'Downloading Kafka (~120MB, one-time)'
        $tgz = Join-Path $Native 'kafka.tgz'
        Invoke-WebRequest -Uri 'https://archive.apache.org/dist/kafka/3.8.0/kafka_2.13-3.8.0.tgz' -OutFile $tgz
        New-Item -ItemType Directory -Force -Path $KafkaDir | Out-Null
        tar -xzf $tgz -C $KafkaDir --strip-components=1
        Remove-Item $tgz -Force
        $serverProps = @"
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
inter.broker.listener.name=PLAINTEXT
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SSL:SSL,SASL_PLAINTEXT:SASL_PLAINTEXT,SASL_SSL:SASL_SSL
num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
log.dirs=$($Native -replace '\\','/')/data/kafka
num.partitions=1
num.recovery.threads.per.data.dir=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1
auto.create.topics.enable=true
group.initial.rebalance.delay.ms=0
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000
"@
        Set-Content -Path "$KafkaDir\config\kraft\server-native.properties" -Value $serverProps
        Write-Ok 'Kafka staged'
    }
    if (-not (Test-Path "$Native\data\kafka\meta.properties")) {
        Write-Step 'Formatting Kafka KRaft storage (one-time)'
        Push-Location $KafkaDir
        & bin\windows\kafka-storage.bat format -t cGVlcnZhdWx0LWtSYWZ0LTE= -c config\kraft\server-native.properties
        Pop-Location
        Write-Ok 'Kafka storage formatted'
    }
}

# -- infra ----------------------------------------------------------------------------------------

if (-not $SkipInfra) {
    Ensure-Infra

    Write-Step 'Starting MongoDB, Redis, Vault, Kafka'
    if (-not (Test-Port 27017)) {
        Start-Tracked -Name 'mongod' -FilePath "$MongoDir\bin\mongod.exe" `
            -ArgumentList @('--dbpath', "$Native\data\mongo", '--port', '27017', '--bind_ip', '127.0.0.1') | Out-Null
    } else { Write-Info 'MongoDB already listening on 27017, leaving it be' }

    if (-not (Test-Port 6379)) {
        Start-Tracked -Name 'redis' -FilePath "$RedisDir\redis-server.exe" `
            -ArgumentList @('--port', '6379', '--dir', "$Native\data") | Out-Null
    } else { Write-Info 'Redis already listening on 6379, leaving it be' }

    if (-not (Test-Port 8200)) {
        Start-Tracked -Name 'vault' -FilePath "$VaultDir\vault.exe" `
            -ArgumentList @('server', '-dev', '-dev-root-token-id=peervault-dev-root-token', '-dev-listen-address=0.0.0.0:8200') `
            -Env @{ VAULT_ADDR = 'http://127.0.0.1:8200' } | Out-Null
    } else { Write-Info 'Vault already listening on 8200, leaving it be' }

    if (-not (Test-Port 9092)) {
        # WorkingDirectory matters here: the config path argument is relative to it, and
        # KAFKA_HEAP_OPTS being pre-set skips kafka-server-start.bat's wmic-based OS-arch probe -
        # wmic was removed in recent Windows 11 builds, so without this the script dies immediately.
        Start-Tracked -Name 'kafka' -FilePath "$KafkaDir\bin\windows\kafka-server-start.bat" `
            -ArgumentList @('config\kraft\server-native.properties') `
            -Env @{ KAFKA_HEAP_OPTS = '-Xmx1G -Xms1G' } -WorkingDirectory $KafkaDir | Out-Null
    } else { Write-Info 'Kafka already listening on 9092, leaving it be' }

    Wait-Port -Port 27017 -Name 'MongoDB'
    Wait-Port -Port 6379 -Name 'Redis'
    Wait-Port -Port 8200 -Name 'Vault'
    Wait-Port -Port 9092 -Name 'Kafka' -TimeoutSec 60

    Write-Step 'Seeding Vault JWT secret (idempotent)'
    $env:VAULT_ADDR = 'http://127.0.0.1:8200'
    $env:VAULT_TOKEN = 'peervault-dev-root-token'
    # Same optional-override behavior docker/vault-init.sh documents for JWT_SECRET: use .env's
    # value if set, otherwise fall back to this baked-in dev default.
    $jwtSecret = if ($DotEnv.JWT_SECRET) { $DotEnv.JWT_SECRET } else { 'cGVlcnZhdWx0LWRldi1zdXBlci1zZWNyZXQtc2lnbmluZy1rZXktcGxlYXNlLXJvdGF0ZS0zMmI=' }
    & "$VaultDir\vault.exe" kv put secret/application jwt.secret="$jwtSecret" | Out-Null
    Remove-Item Env:\VAULT_ADDR, Env:\VAULT_TOKEN -ErrorAction SilentlyContinue
    Write-Ok 'Vault seeded'
}

# -- build jars (only if missing, unless -Build forces it) ------------------------------------------

$needBuild = $Build.IsPresent
if (-not $needBuild) {
    foreach ($m in 'eureka-server', 'config-server', 'api-gateway', 'auth-service', 'device-service', 'file-service', 'transfer-service', 'security-service', 'notification-service', 'share-service') {
        if (-not (Test-Path "$Backend\$m\target\$m.jar")) { $needBuild = $true }
    }
}
if ($needBuild) {
    Write-Step 'Building all modules (mvn package -DskipTests)'
    Push-Location $Backend
    & mvn -q package -DskipTests
    if ($LASTEXITCODE -ne 0) { throw 'Maven build failed' }
    Pop-Location
    Write-Ok 'Build complete'
} else {
    Write-Info 'Jars already present, skipping build (pass -Build to force)'
}

# -- discovery + config ---------------------------------------------------------------------------

Write-Step 'Starting Eureka Server'
Start-Tracked -Name 'eureka-server' -FilePath 'java' -ArgumentList @('-jar', "$Backend\eureka-server\target\eureka-server.jar") | Out-Null
Wait-LogPattern -LogFile "$Logs\eureka-server.log" -Pattern 'Started EurekaServerApplication' -Name 'eureka-server'

Write-Step 'Starting Config Server'
$configRepoUri = "file:///" + ($Backend -replace '\\', '/') + "/config-repo/"
Start-Tracked -Name 'config-server' -FilePath 'java' -ArgumentList @('-jar', "$Backend\config-server\target\config-server.jar") `
    -Env @{ CONFIG_REPO_LOCATION = $configRepoUri } | Out-Null
Wait-LogPattern -LogFile "$Logs\config-server.log" -Pattern 'Started ConfigServerApplication' -Name 'config-server'

# -- business services + gateway (share the same env - mirrors docker-compose's x-common-env) ------

$commonEnv = @{
    EUREKA_URI       = 'http://localhost:8761/eureka/'
    CONFIG_SERVER_URI = 'http://localhost:8888'
    KAFKA_BOOTSTRAP  = 'localhost:9092'
    REDIS_HOST       = 'localhost'
    REDIS_PORT       = '6379'
    # backend\.env's MONGODB_URI wins when set (e.g. a real Atlas URI) - same override docker
    # compose gives it - otherwise the bundled local mongod started above.
    MONGODB_URI      = if ($DotEnv.MONGODB_URI) { $DotEnv.MONGODB_URI } else { 'mongodb://localhost:27017' }
    # Same override pattern as MONGODB_URI above. Needed for cross-device testing (e.g. QR pairing
    # scanned from a phone on the same Wi-Fi): the gateway's CORS check compares this against the
    # browser's actual Origin header, so a frontend loaded from a LAN IP - not "localhost" - needs
    # this set to that same "http://<LAN-IP>:3000" in backend\.env, or every request from that
    # device gets rejected by CORS before it ever reaches a service. See frontend/README.md's
    # "Cross-device / LAN setup" section.
    FRONTEND_ORIGIN  = if ($DotEnv.FRONTEND_ORIGIN) { $DotEnv.FRONTEND_ORIGIN } else { 'http://localhost:3000' }
}

Write-Step 'Starting business services (auth, device, file, transfer, security, notification, share)'
foreach ($svc in 'auth-service', 'device-service', 'file-service', 'transfer-service', 'security-service', 'notification-service', 'share-service') {
    Start-Tracked -Name $svc -FilePath 'java' -ArgumentList @('-jar', "$Backend\$svc\target\$svc.jar") -Env $commonEnv | Out-Null
}
foreach ($svc in 'auth-service', 'device-service', 'file-service', 'transfer-service', 'security-service', 'notification-service', 'share-service') {
    $pascal = ($svc -split '-' | ForEach-Object { $_.Substring(0,1).ToUpper() + $_.Substring(1) }) -join ''
    Wait-LogPattern -LogFile "$Logs\$svc.log" -Pattern "Started ${pascal}Application" -Name $svc -TimeoutSec 90
}

Write-Step 'Starting API Gateway'
Start-Tracked -Name 'api-gateway' -FilePath 'java' -ArgumentList @('-jar', "$Backend\api-gateway\target\api-gateway.jar") -Env $commonEnv | Out-Null
Wait-LogPattern -LogFile "$Logs\api-gateway.log" -Pattern 'Started ApiGatewayApplication' -Name 'api-gateway'

# -- summary --------------------------------------------------------------------------------------

Write-Host "`n=========================================================" -ForegroundColor Green
Write-Host " PeerVault backend is up (native, no Docker)" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host " Gateway         http://localhost:8080"
Write-Host " Eureka          http://localhost:8761"
Write-Host " Config Server   http://localhost:8888"
Write-Host " Logs            $Logs\<service>.log"
Write-Host " Stop everything  .\scripts\stop-native.ps1"
Write-Host "=========================================================`n"
