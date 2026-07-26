# deploy.ps1
#
# Windows PowerShell equivalent of deploy.sh, for setting up or updating a
# real, standalone Node-RED production instance on Windows (not just a
# dev/git checkout for testing). Pulls the latest from GitHub, checks
# prerequisites (including OpenSSL, which Windows doesn't ship by
# default and which certificate generation depends on), installs,
# builds, and reinstalls into your Node-RED user directory.
#
# Usage (run from an elevated or normal PowerShell prompt, from inside
# your cloned repo directory):
#   .\deploy.ps1
#
# Re-run any time there's an update on GitHub.

$ErrorActionPreference = "Stop"

$RepoDir = $PSScriptRoot
$Branch = "rebrand/node-red-contrib-opcua-compact-server"
$NodeRedDir = Join-Path $env:USERPROFILE ".node-red"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

# --- 1/8: Check prerequisites ---
Write-Step "1/8: Checking prerequisites"

function Test-CommandExists($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-CommandExists "node")) {
    Write-Error "Node.js is not installed or not on PATH. Install it from https://nodejs.org/ (LTS recommended) and re-run."
    exit 1
}
if (-not (Test-CommandExists "npm")) {
    Write-Error "npm is not on PATH (usually ships with Node.js). Re-install Node.js and re-run."
    exit 1
}
if (-not (Test-CommandExists "git")) {
    Write-Error "git is not installed or not on PATH. Install it from https://gitforwindows.org/ and re-run."
    exit 1
}

# OpenSSL check - Windows does not ship this by default, unlike most
# Linux distributions. Certificate generation (create_certificates.js)
# depends on it being callable. Checking here gives a clear, actionable
# message up front instead of a cryptic failure buried in npm install's
# postinstall output later.
if (-not (Test-CommandExists "openssl")) {
    Write-Host ""
    Write-Host "ERROR: 'openssl' was not found on your PATH." -ForegroundColor Red
    Write-Host "This is required to generate certificates on first install." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install one of:"
    Write-Host "  - Git for Windows (bundles a usable openssl.exe): https://gitforwindows.org/"
    Write-Host "  - A dedicated build: https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host "  - Via a package manager: choco install openssl"
    Write-Host "                           winget install ShiningLight.OpenSSL"
    Write-Host ""
    Write-Host "After installing, make sure openssl.exe's folder is on your PATH,"
    Write-Host "open a NEW PowerShell window (so PATH changes are picked up), and re-run this script."
    exit 1
}

if (-not (Test-CommandExists "node-red")) {
    Write-Host "node-red command not found globally - will install it." -ForegroundColor Yellow
    npm install -g node-red
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install node-red globally. Try running this prompt as Administrator."
        exit 1
    }
}

Write-Host "All prerequisites present: node, npm, git, openssl, node-red." -ForegroundColor Green

# --- 2/8: Pull latest from GitHub ---
Write-Step "2/8: Pulling latest from GitHub"
Set-Location $RepoDir
git fetch origin
git checkout $Branch
git reset --hard "origin/$Branch"

# --- 3/8: Install dependencies ---
Write-Step "3/8: Installing dependencies"
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }
if (Test-Path "certificates") { Remove-Item -Recurse -Force "certificates" }
npm install --unsafe-perm --build-from-source
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed. Check the output above - if it mentions openssl or certificate generation, re-check the OpenSSL install step."
    exit 1
}

# --- 4/8: Run test suite ---
Write-Step "4/8: Running test suite"
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tests failed. Review the output above before deploying a potentially broken build."
    exit 1
}

# --- 5/8: Build package ---
Write-Step "5/8: Building package"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed."
    exit 1
}

# --- 6/8: Check port 1880 isn't already in use ---
Write-Step "6/8: Checking port 1880 is free"
$existing = Get-NetTCPConnection -LocalPort 1880 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    $pid1880 = $existing[0].OwningProcess
    $procName = (Get-Process -Id $pid1880 -ErrorAction SilentlyContinue).ProcessName
    Write-Host "Port 1880 is currently in use by PID $pid1880 ($procName)." -ForegroundColor Yellow
    $answer = Read-Host "Stop this process now? (y/N)"
    if ($answer -eq "y") {
        Stop-Process -Id $pid1880 -Force
        Start-Sleep -Seconds 2
        Write-Host "Stopped." -ForegroundColor Green
    } else {
        Write-Host "Leaving it running - Node-RED may fail to start if the port stays in use." -ForegroundColor Yellow
    }
} else {
    Write-Host "Port 1880 is free." -ForegroundColor Green
}

# --- 7/8: Reinstall into Node-RED ---
Write-Step "7/8: Reinstalling into Node-RED"
if (-not (Test-Path $NodeRedDir)) {
    New-Item -ItemType Directory -Path $NodeRedDir | Out-Null
    Write-Host "Created $NodeRedDir (first-time setup)." -ForegroundColor Yellow
}
Set-Location $NodeRedDir
npm uninstall node-red-contrib-opcua-compact-server 2>$null
npm install $RepoDir --unsafe-perm --build-from-source
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install the package into $NodeRedDir."
    exit 1
}

# --- 8/8: Start Node-RED ---
Write-Step "8/8: Deploy complete. Starting Node-RED with verbose logging."
Write-Host "Press Ctrl+C once you've confirmed it started cleanly (all server" -ForegroundColor Yellow
Write-Host "nodes showing 'OPC UA Server LIVE'), then start it normally for" -ForegroundColor Yellow
Write-Host "ongoing use (e.g. as a Windows service, or just 'node-red' in its" -ForegroundColor Yellow
Write-Host "own window if this is a simple single-machine setup)." -ForegroundColor Yellow
Write-Host ""
node-red -v
