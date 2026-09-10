$ErrorActionPreference = 'Stop'
$taskEnvPath = Join-Path $PSScriptRoot '../.env'
$taskKeys = @(
    'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_PORT', 'JDBC_DATABASE_URL',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
    'RESEND_API_KEY', 'RESEND_FROM', 'APP_BASE_URL', 'FRONTEND_URL'
)
foreach ($taskLine in [System.IO.File]::ReadAllLines($taskEnvPath)) {
    if ($taskLine -match '^([A-Z_]+)=(.*)$' -and $matches[1] -in $taskKeys) {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
if ([string]::IsNullOrWhiteSpace($env:POSTGRES_PASSWORD)) {
    throw 'Set POSTGRES_PASSWORD in the ignored .env file before starting.'
}
Push-Location $PSScriptRoot
try {
    rtk mvn spring-boot:run '-Dspring-boot.run.profiles=local'
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
