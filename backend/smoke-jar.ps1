$ErrorActionPreference = 'Stop'
# Uses the isolated-test database settings, never the application's existing schema.
$taskSettings = @{}
foreach ($taskLine in [System.IO.File]::ReadAllLines((Join-Path $PSScriptRoot '../.env'))) {
    if ($taskLine -match '^(TEST_DATABASE_URL|TEST_DATABASE_USERNAME|TEST_DATABASE_PASSWORD)=(.*)$') {
        $taskSettings[$matches[1]] = $matches[2]
    }
}
foreach ($taskKey in @('TEST_DATABASE_URL', 'TEST_DATABASE_USERNAME', 'TEST_DATABASE_PASSWORD')) {
    if ([string]::IsNullOrWhiteSpace($taskSettings[$taskKey])) { throw "Missing local setting: $taskKey" }
}
if ($taskSettings.TEST_DATABASE_URL -match '(?i)currentschema=') { throw 'Smoke URL must not specify an existing schema.' }
$taskRunId = [Guid]::NewGuid().ToString('N')
$taskSchema = 'smoke_' + $taskRunId
$taskSeparator = if ($taskSettings.TEST_DATABASE_URL.Contains('?')) { '&' } else { '?' }
$env:JDBC_DATABASE_URL = $taskSettings.TEST_DATABASE_URL + $taskSeparator + 'currentSchema=' + $taskSchema
$env:POSTGRES_USER = $taskSettings.TEST_DATABASE_USERNAME
$env:POSTGRES_PASSWORD = $taskSettings.TEST_DATABASE_PASSWORD
$env:SPRING_FLYWAY_SCHEMAS = $taskSchema
$env:SPRING_FLYWAY_DEFAULT_SCHEMA = $taskSchema
$env:SPRING_FLYWAY_CREATE_SCHEMAS = 'true'
$env:SERVER_PORT = '0'
$env:SERVER_ADDRESS = '127.0.0.1'
$taskJava = Join-Path $env:JAVA_HOME 'bin/java.exe'
$taskJar = Join-Path $PSScriptRoot 'target/storage-hub-backend-0.0.1-SNAPSHOT.jar'
$taskOut = Join-Path $PSScriptRoot ('target/smoke-' + $taskRunId + '.out.log')
$taskErr = Join-Path $PSScriptRoot ('target/smoke-' + $taskRunId + '.err.log')
if (!(Test-Path -LiteralPath $taskJava) -or !(Test-Path -LiteralPath $taskJar)) { throw 'Build the JAR and configure JAVA_HOME first.' }
$taskProcess = Start-Process -FilePath $taskJava -ArgumentList @('-jar', ('"' + $taskJar + '"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput $taskOut -RedirectStandardError $taskErr
try {
    $taskDeadline = [DateTime]::UtcNow.AddSeconds(55)
    while ([DateTime]::UtcNow -lt $taskDeadline) {
        if ($taskProcess.HasExited) { throw 'JAR exited before ready; inspect the smoke logs in backend/target.' }
        $taskStream = [System.IO.File]::Open($taskOut, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $taskReader = [System.IO.StreamReader]::new($taskStream)
        try { $taskLog = $taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
        if ($taskLog -match 'Tomcat started on port (\d+)') {
            $taskPort = $matches[1]
            $taskResponse = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $taskPort + '/actuator/health') -TimeoutSec 5
            if ($taskResponse.status -ne 'UP') { throw 'JAR health did not return UP.' }
            Write-Output 'Executable JAR startup and real HTTP health: PASS (isolated database schema).'
            exit 0
        }
        Start-Sleep -Milliseconds 500
    }
    throw 'JAR startup timeout; inspect the smoke logs in backend/target.'
} finally {
    if (!$taskProcess.HasExited) { Stop-Process -Id $taskProcess.Id }
}
