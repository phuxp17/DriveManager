$ErrorActionPreference = 'Stop'
# Import only known datasource keys. Never evaluate .env as PowerShell code.
$taskEnvPath = Join-Path $PSScriptRoot '../.env'
$taskKeys = @('POSTGRES_PASSWORD', 'USE_EXTERNAL_TEST_DATABASE', 'TEST_DATABASE_URL', 'TEST_DATABASE_USERNAME', 'TEST_DATABASE_PASSWORD')
foreach ($taskLine in [System.IO.File]::ReadAllLines($taskEnvPath)) {
    if ($taskLine -match '^([A-Z_]+)=(.*)$' -and $matches[1] -in $taskKeys) {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
Push-Location $PSScriptRoot
try {
    rtk mvn verify
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
