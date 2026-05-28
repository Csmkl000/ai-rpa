# AI-RPA Windows 一键部署脚本
# 用法: 以管理员权限运行 PowerShell，执行: .\scripts\setup-windows.ps1

$ErrorActionPreference = "Stop"
$REPO_URL = "https://github.com/Csmkl000/ai-rpa.git"
$INSTALL_DIR = "$env:USERPROFILE\ai-rpa"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI-RPA 语义化自动化助手 - Windows 部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: 检查并安装 Bun ----
function Install-Bun {
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        Write-Host "[OK] Bun 已安装: $(bun --version)" -ForegroundColor Green
        return
    }
    Write-Host "[...] 正在安装 Bun ..." -ForegroundColor Yellow
    powershell -c "irm bun.sh/install.ps1 | iex"
    $env:BUN_INSTALL = "$env:USERPROFILE\.bun"
    $env:PATH = "$env:BUN_INSTALL\bin;$env:PATH"
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Write-Host "[X] Bun 安装失败，请手动安装: https://bun.sh" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Bun 安装成功: $(bun --version)" -ForegroundColor Green
}

# ---- Step 2: 检查并安装 Rust ----
function Install-Rust {
    if (Get-Command rustc -ErrorAction SilentlyContinue) {
        Write-Host "[OK] Rust 已安装: $(rustc --version)" -ForegroundColor Green
        return
    }
    Write-Host "[...] 正在下载 Rust 安装程序 ..." -ForegroundColor Yellow
    $rustupPath = "$env:TEMP\rustup-init.exe"
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustupPath
    Write-Host "[...] 正在安装 Rust (静默模式) ..." -ForegroundColor Yellow
    Start-Process -FilePath $rustupPath -ArgumentList "-y" -Wait -NoNewWindow
    $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
    if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
        Write-Host "[X] Rust 安装失败，请手动安装: https://rustup.rs" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Rust 安装成功: $(rustc --version)" -ForegroundColor Green
}

# ---- Step 3: 检查 Visual Studio Build Tools ----
function Check-BuildTools {
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        $installPath = & $vsWhere -latest -property installationPath
        if ($installPath) {
            Write-Host "[OK] Visual Studio Build Tools 已安装" -ForegroundColor Green
            return
        }
    }
    # 检查 cl.exe 是否可用
    if (Get-Command cl -ErrorAction SilentlyContinue) {
        Write-Host "[OK] C++ 编译器可用" -ForegroundColor Green
        return
    }
    Write-Host "[!] 未检测到 Visual Studio Build Tools" -ForegroundColor Yellow
    Write-Host "    Tauri 需要 C++ 编译工具，请安装:" -ForegroundColor Yellow
    Write-Host "    https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
    Write-Host "    安装时勾选 'Desktop development with C++'" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "已安装或稍后安装? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# ---- Step 4: 检查 WebView2 ----
function Check-WebView2 {
    $wv2 = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BEE-13A6279B00D5}" -ErrorAction SilentlyContinue
    if ($wv2 -or (Test-Path "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView")) {
        Write-Host "[OK] WebView2 已安装" -ForegroundColor Green
        return
    }
    Write-Host "[!] 未检测到 WebView2，正在安装 ..." -ForegroundColor Yellow
    try {
        winget install Microsoft.EdgeWebView2 --silent --accept-source-agreements
        Write-Host "[OK] WebView2 安装成功" -ForegroundColor Green
    } catch {
        Write-Host "[!] 自动安装失败，请手动安装: https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor Yellow
    }
}

# ---- Step 5: 克隆项目 ----
function Clone-Repo {
    if (Test-Path "$INSTALL_DIR\.git") {
        Write-Host "[OK] 项目目录已存在: $INSTALL_DIR" -ForegroundColor Green
        Set-Location $INSTALL_DIR
        git pull
        return
    }
    Write-Host "[...] 正在克隆项目 ..." -ForegroundColor Yellow
    git clone $REPO_URL $INSTALL_DIR
    Set-Location $INSTALL_DIR
    Write-Host "[OK] 项目克隆完成" -ForegroundColor Green
}

# ---- Step 6: 安装依赖 ----
function Install-Dependencies {
    Write-Host "[...] 正在安装前端依赖 ..." -ForegroundColor Yellow
    bun install
    Write-Host "[OK] 前端依赖安装完成" -ForegroundColor Green
}

# ---- Step 7: 准备 Sidecar 二进制 ----
function Prepare-Sidecar {
    $binDir = "src-tauri\binaries"
    if (-not (Test-Path $binDir)) {
        New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    }

    $targetName = "bun-x86_64-pc-windows-msvc.exe"
    $targetPath = "$binDir\$targetName"

    if (Test-Path $targetPath) {
        Write-Host "[OK] Sidecar 二进制已就绪" -ForegroundColor Green
        return
    }

    $bunPath = (Get-Command bun -ErrorAction SilentlyContinue).Source
    if (-not $bunPath) {
        $bunPath = "$env:USERPROFILE\.bun\bin\bun.exe"
    }

    if (Test-Path $bunPath) {
        Copy-Item $bunPath $targetPath -Force
        Write-Host "[OK] Sidecar 二进制已复制: $targetPath" -ForegroundColor Green
    } else {
        Write-Host "[X] 找不到 bun 可执行文件，请手动复制到 $targetPath" -ForegroundColor Red
        exit 1
    }
}

# ---- Step 8: 首次构建验证 ----
function Build-Check {
    Write-Host "[...] 正在验证前端构建 ..." -ForegroundColor Yellow
    bun run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] 前端构建失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] 前端构建成功" -ForegroundColor Green

    Write-Host "[...] 正在验证 Rust 编译 (首次较慢) ..." -ForegroundColor Yellow
    Push-Location src-tauri
    cargo check
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Rust 编译失败" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "[OK] Rust 编译通过" -ForegroundColor Green
}

# ---- 执行全部步骤 ----
Write-Host ""
Write-Host "[1/7] 检查 Bun ..." -ForegroundColor Cyan
Install-Bun

Write-Host ""
Write-Host "[2/7] 检查 Rust ..." -ForegroundColor Cyan
Install-Rust

Write-Host ""
Write-Host "[3/7] 检查 Build Tools ..." -ForegroundColor Cyan
Check-BuildTools

Write-Host ""
Write-Host "[4/7] 检查 WebView2 ..." -ForegroundColor Cyan
Check-WebView2

Write-Host ""
Write-Host "[5/7] 克隆项目 ..." -ForegroundColor Cyan
Clone-Repo

Write-Host ""
Write-Host "[6/7] 安装依赖 ..." -ForegroundColor Cyan
Install-Dependencies

Write-Host ""
Write-Host "[7/7] 准备 Sidecar ..." -ForegroundColor Cyan
Prepare-Sidecar

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "启动开发模式:" -ForegroundColor White
Write-Host "  cd $INSTALL_DIR" -ForegroundColor White
Write-Host "  bun run tauri dev" -ForegroundColor White
Write-Host ""

$start = Read-Host "是否现在启动? (y/n)"
if ($start -eq "y") {
    bun run tauri dev
}
