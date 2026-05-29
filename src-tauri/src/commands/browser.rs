use tauri::{AppHandle, Emitter, Manager};
use serde_json::json;

/// 指南 7.1: 检查 Chromium 是否可用，不可用则静默下载
#[tauri::command]
pub async fn check_browser(app: AppHandle) -> Result<String, String> {
    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("stagehand-cache");

    std::fs::create_dir_all(&cache_dir).ok();

    // 检查 Playwright Chromium 是否已安装
    let output = std::process::Command::new("npx")
        .args(["playwright", "install", "--dry-run", "chromium"])
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            if stdout.contains("is already installed") || stdout.contains("chromium") {
                return Ok("Chromium 已安装".to_string());
            }
        }
        _ => {}
    }

    // 静默下载 Chromium
    let _ = app.emit("rpa-event", json!({
        "event_type": "LOG",
        "data": { "log": "首次启动，正在下载 Chromium 浏览器（约 150MB）..." }
    }));

    let status = std::process::Command::new("npx")
        .args(["playwright", "install", "chromium"])
        .status();

    match status {
        Ok(s) if s.success() => {
            let _ = app.emit("rpa-event", json!({
                "event_type": "LOG",
                "data": { "log": "Chromium 下载完成" }
            }));
            Ok("Chromium 下载完成".to_string())
        }
        Ok(s) => Err(format!("Chromium 下载失败, exit code: {:?}", s.code())),
        Err(e) => Err(format!("Chromium 下载命令执行失败: {}", e)),
    }
}
