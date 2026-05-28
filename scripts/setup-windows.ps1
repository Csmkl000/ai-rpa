# AI-RPA Windows Setup Script
# Usage: .\scripts\setup-windows.ps1

$ErrorActionPreference = "Stop"
$REPO_URL = "https://github.com/Csmkl000/ai-rpa.git"
$INSTALL_DIR = "$env:USERPROFILE\ai-rpa"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI-RPA - Windows Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: Check / Install Bun ----
function Install-Bun {
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        Write-Host "[OK] Bun found: $(bun --version)" -ForegroundColor Green
        return
    }
    Write-Host "[...] Installing Bun ..." -ForegroundColor Yellow
    powershell -c "irm bun.sh/install.ps1 | iex"
    $env:BUN_INSTALL = "$env:USERPROFILE\.bun"
    $env:PATH = "$env:BUN_INSTALL\bin;$env:PATH"
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Write-Host "[FAIL] Bun install failed. Install manually: https://bun.sh" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Bun installed: $(bun --version)" -ForegroundColor Green
}

# ---- Step 2: Check / Install Rust ----
function Install-Rust {
    if (Get-Command rustc -ErrorAction SilentlyContinue) {
        Write-Host "[OK] Rust found: $(rustc --version)" -ForegroundColor Green
        return
    }
    Write-Host "[...] Downloading Rust installer ..." -ForegroundColor Yellow
    $rustupPath = "$env:TEMP\rustup-init.exe"
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustupPath
    Write-Host "[...] Installing Rust (silent) ..." -ForegroundColor Yellow
    Start-Process -FilePath $rustupPath -ArgumentList "-y" -Wait -NoNewWindow
    $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
    if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
        Write-Host "[FAIL] Rust install failed. Install manually: https://rustup.rs" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Rust installed: $(rustc --version)" -ForegroundColor Green
}

# ---- Step 3: Check VS Build Tools ----
function Check-BuildTools {
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        $installPath = & $vsWhere -latest -property installationPath
        if ($installPath) {
            Write-Host "[OK] Visual Studio Build Tools found" -ForegroundColor Green
            return
        }
    }
    if (Get-Command cl -ErrorAction SilentlyContinue) {
        Write-Host "[OK] C++ compiler available" -ForegroundColor Green
        return
    }
    Write-Host "[WARN] Visual Studio Build Tools not detected" -ForegroundColor Yellow
    Write-Host "  Tauri requires C++ build tools. Install from:" -ForegroundColor Yellow
    Write-Host "  https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
    Write-Host "  Check 'Desktop development with C++' during install" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Already installed or will install later? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# ---- Step 4: Check WebView2 ----
function Check-WebView2 {
    $regPath = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BEE-13A6279B00D5}"
    $wv2 = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
    $wv2Dir = Join-Path ${env:ProgramFiles(x86)} "Microsoft\EdgeWebView"
    if ($wv2 -or (Test-Path $wv2Dir)) {
        Write-Host "[OK] WebView2 found" -ForegroundColor Green
        return
    }
    Write-Host "[WARN] WebView2 not detected, installing ..." -ForegroundColor Yellow
    try {
        winget install Microsoft.EdgeWebView2 --silent --accept-source-agreements
        Write-Host "[OK] WebView2 installed" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Auto-install failed. Install manually:" -ForegroundColor Yellow
        Write-Host "  https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor Yellow
    }
}

# ---- Step 5: Clone project ----
function Clone-Repo {
    if (Test-Path (Join-Path $INSTALL_DIR ".git")) {
        Write-Host "[OK] Project dir exists: $INSTALL_DIR" -ForegroundColor Green
        Set-Location $INSTALL_DIR
        git pull
        return
    }
    Write-Host "[...] Cloning project ..." -ForegroundColor Yellow
    git clone $REPO_URL $INSTALL_DIR
    Set-Location $INSTALL_DIR
    Write-Host "[OK] Project cloned" -ForegroundColor Green
}

# ---- Step 6: Install dependencies ----
function Install-Dependencies {
    Write-Host "[...] Installing frontend dependencies ..." -ForegroundColor Yellow
    bun install
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
}

# ---- Step 7: Prepare sidecar binary ----
function Prepare-Sidecar {
    $binDir = Join-Path "src-tauri" "binaries"
    if (-not (Test-Path $binDir)) {
        New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    }

    $targetName = "bun-x86_64-pc-windows-msvc.exe"
    $targetPath = Join-Path $binDir $targetName

    if (Test-Path $targetPath) {
        Write-Host "[OK] Sidecar binary ready" -ForegroundColor Green
        return
    }

    $bunCmd = Get-Command bun -ErrorAction SilentlyContinue
    if ($bunCmd) {
        $bunPath = $bunCmd.Source
    } else {
        $bunPath = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"
    }

    if (Test-Path $bunPath) {
        Copy-Item $bunPath $targetPath -Force
        Write-Host "[OK] Sidecar binary copied" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Cannot find bun executable. Copy it manually to:" -ForegroundColor Red
        Write-Host "  $targetPath" -ForegroundColor Red
        exit 1
    }
}

# ---- Run all steps ----
Write-Host ""
Write-Host "[1/7] Checking Bun ..." -ForegroundColor Cyan
Install-Bun

Write-Host ""
Write-Host "[2/7] Checking Rust ..." -ForegroundColor Cyan
Install-Rust

Write-Host ""
Write-Host "[3/7] Checking Build Tools ..." -ForegroundColor Cyan
Check-BuildTools

Write-Host ""
Write-Host "[4/7] Checking WebView2 ..." -ForegroundColor Cyan
Check-WebView2

Write-Host ""
Write-Host "[5/7] Cloning project ..." -ForegroundColor Cyan
Clone-Repo

Write-Host ""
Write-Host "[6/7] Installing dependencies ..." -ForegroundColor Cyan
Install-Dependencies

Write-Host ""
Write-Host "[7/7] Preparing sidecar ..." -ForegroundColor Cyan
Prepare-Sidecar

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start dev mode:" -ForegroundColor White
Write-Host "  cd $INSTALL_DIR" -ForegroundColor White
Write-Host "  bun run tauri dev" -ForegroundColor White
Write-Host ""
$start = Read-Host "Start now? (y/n)"
if ($start -eq 'y') {
    bun run tauri dev
}
