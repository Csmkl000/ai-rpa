use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

/// 启动用户本机 Chrome，开启 CDP 远程调试端口
/// 返回 WebSocket URL 供 Stagehand 连接
#[tauri::command]
pub async fn launch_chrome(
    app: AppHandle,
    url: String,
    chrome_path: Option<String>,
) -> Result<String, String> {
    // 查找 Chrome 可执行文件
    let chrome_exe = if let Some(p) = chrome_path {
        if std::path::Path::new(&p).exists() {
            p
        } else {
            return Err(format!("Chrome 路径不存在: {}", p));
        }
    } else {
        find_chrome()?
    };

    // 使用独立 profile 目录，避免和已运行的 Chrome 冲突
    // 首次使用需登录，之后数据持久化
    let profile_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("chrome-rpa-profile");

    let debug_port = 9222;

    eprintln!("[CHROME] 启动: {}", chrome_exe);
    eprintln!("[CHROME] Profile: {}", profile_dir.display());
    eprintln!("[CHROME] CDP 端口: {}", debug_port);

    // 启动 Chrome
    let mut child = std::process::Command::new(&chrome_exe)
        .args([
            &format!("--remote-debugging-port={}", debug_port),
            &format!("--user-data-dir={}", profile_dir.to_string_lossy()),
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            &url,
        ])
        .spawn()
        .map_err(|e| format!("启动 Chrome 失败: {}", e))?;

    // 等待 CDP 端口就绪（最多 10 秒）
    let cdp_url = match wait_for_cdp(debug_port).await {
        Ok(url) => url,
        Err(e) => {
            let _ = child.kill();
            return Err(format!("Chrome 启动超时: {}。请确保没有其他 Chrome 实例占用调试端口。", e));
        }
    };

    // 存储 child 进程以便后续关闭
    let state = app.state::<crate::process::ChromeState>();
    *state.child.lock().unwrap() = Some(child);

    eprintln!("[CHROME] CDP 就绪: {}", cdp_url);

    let _ = app.emit(
        "rpa-event",
        json!({ "event_type": "CHROME_LAUNCHED", "data": { "cdp_url": cdp_url, "url": url } }),
    );

    Ok(cdp_url)
}

/// 关闭已启动的 Chrome
#[tauri::command]
pub fn close_chrome(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::process::ChromeState>();
    let mut guard = state.child.lock().unwrap();
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        eprintln!("[CHROME] 已关闭");
    }
    Ok(())
}

async fn wait_for_cdp(port: u16) -> Result<String, String> {
    let url = format!("http://127.0.0.1:{}/json/version", port);
    for _ in 0..20 {
        if let Ok(resp) = reqwest::get(&url).await {
            if resp.status().is_success() {
                if let Ok(body) = resp.json::<serde_json::Value>().await {
                    if let Some(ws) = body["webSocketDebuggerUrl"].as_str() {
                        return Ok(ws.to_string());
                    }
                }
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    Err("Chrome CDP 端口超时（15秒）".to_string())
}

fn find_chrome_profile() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();

    let candidates = if cfg!(target_os = "windows") {
        vec![
            format!("{}\\AppData\\Local\\Google\\Chrome\\User Data", home),
            format!("{}\\AppData\\Local\\Microsoft\\Edge\\User Data", home),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            format!("{}/Library/Application Support/Google/Chrome", home),
            format!("{}/Library/Application Support/Microsoft Edge", home),
        ]
    } else {
        vec![
            format!("{}/.config/google-chrome", home),
            format!("{}/.config/microsoft-edge", home),
        ]
    };

    for c in &candidates {
        if std::path::Path::new(c).exists() {
            return Ok(std::path::PathBuf::from(c));
        }
    }

    // 找不到则用 AppData 下的独立目录
    let fallback = std::env::temp_dir().join("ai-rpa-chrome-profile");
    std::fs::create_dir_all(&fallback).ok();
    Ok(fallback)
}

fn find_chrome() -> Result<String, String> {
    let candidates: Vec<String> = if cfg!(target_os = "windows") {
        vec![
            format!("{}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe", std::env::var("USERPROFILE").unwrap_or_default()),
            format!("{}\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe", std::env::var("USERPROFILE").unwrap_or_default()),
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe".into(),
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe".into(),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome".into(),
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge".into(),
        ]
    } else {
        vec![
            "/usr/bin/google-chrome".into(),
            "/usr/bin/chromium-browser".into(),
            "/usr/bin/microsoft-edge".into(),
        ]
    };

    for c in &candidates {
        if std::path::Path::new(c).exists() {
            return Ok(c.clone());
        }
    }

    Err("找不到 Chrome/Edge。请在设置中手动指定路径。".to_string())
}
