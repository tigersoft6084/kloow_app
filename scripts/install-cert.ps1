## PowerShell script to install root certificate located next to this script
## This script is intended to run from the MSI install context where it will
## be located in the application's `resources` folder.

$certPath = Join-Path -Path $PSScriptRoot -ChildPath 'cert.crt'
$logPath = Join-Path -Path $PSScriptRoot -ChildPath 'cert-install.log'

function Log {
    param([string]$msg)
    $time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $entry = "[$time] $msg"
    Add-Content -Path $logPath -Value $entry -Encoding UTF8
}

Log "----- Certificate install started -----"
Log "Script path: $PSScriptRoot"

if (-not (Test-Path -Path $certPath)) {
    Log "Certificate not found at $certPath. Skipping installation."
    Log "----- Certificate install finished (skipped) -----"
    exit 0
}

try {
    Log "Attempting to install certificate: $certPath"
    # Run certutil and capture output
    $output = & certutil -addstore -f Root $certPath 2>&1
    $exitCode = $LASTEXITCODE
    if ($output) {
        foreach ($line in $output) { Log $line }
    }
    Log "certutil exit code: $exitCode"

    if ($exitCode -eq 0) {
        Log "Certificate installed successfully."
        Log "----- Certificate install finished (success) -----"
        exit 0
    } else {
        Log "Certificate installation failed with exit code $exitCode."
        Log "----- Certificate install finished (failure) -----"
        exit $exitCode
    }
} catch {
    Log "Exception during installation: $_"
    Log "----- Certificate install finished (exception) -----"
    exit 1
}
