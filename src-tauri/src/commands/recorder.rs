use crate::process::EngineEvent;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

/// 指南 5: 启动智能录制模式
#[tauri::command]
pub async fn start_recording(
    app: AppHandle,
    url: String,
    api_key: String,
    model: String,
    base_url: String,
) -> Result<String, String> {
    let output_file = std::env::temp_dir().join("ai-rpa-recording.json");
    let engine_script = find_record_script(&app)?;

    let bun_path = find_bun()?;
    let mut args = vec![
        engine_script,
        "--url".to_string(),
        url,
        "--output".to_string(),
        output_file.to_string_lossy().to_string(),
        "--api-key".to_string(),
        api_key,
        "--model".to_string(),
        model,
        "--base-url".to_string(),
        base_url,
    ];

    let app_clone = app.clone();
    let mut child = std::process::Command::new(&bun_path)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动录制失败: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    std::thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        for line in BufReader::new(stdout).lines() {
            if let Ok(line) = line {
                let event = if line.contains("[RECORD_DONE]") {
                    EngineEvent { event_type: "RECORD_DONE".into(), data: json!({ "log": line }) }
                } else if line.contains("[ACTION_COMPLETED]") {
                    EngineEvent { event_type: "RECORDED_ACTION".into(), data: json!({ "log": line }) }
                } else {
                    EngineEvent { event_type: "LOG".into(), data: json!({ "log": line }) }
                };
                let _ = app_clone.emit("rpa-event", event);
            }
        }
    });

    Ok("录制已启动".to_string())
}

/// 停止录制并获取结果
#[tauri::command]
pub fn stop_recording() -> Result<String, String> {
    let output_file = std::env::temp_dir().join("ai-rpa-recording.json");
    if output_file.exists() {
        let content = std::fs::read_to_string(&output_file)
            .map_err(|e| e.to_string())?;
        std::fs::remove_file(&output_file).ok();
        Ok(content)
    } else {
        Ok("{}".to_string())
    }
}

fn find_record_script(app: &AppHandle) -> Result<String, String> {
    let dev_path = std::env::current_dir()
        .ok()
        .and_then(|d| d.parent().map(|p| p.join("src/engine/record.ts")))
        .filter(|p| p.exists());
    if let Some(p) = dev_path { return Ok(p.to_string_lossy().to_string()); }

    let resource_path = app.path().resource_dir().ok()
        .map(|d| d.join("src/engine/record.ts"))
        .filter(|p| p.exists());
    if let Some(p) = resource_path { return Ok(p.to_string_lossy().to_string()); }

    Err("找不到录制脚本".to_string())
}

fn find_bun() -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();
    let candidates = if cfg!(windows) {
        vec![format!("{}\\.bun\\bin\\bun.exe", home)]
    } else {
        vec![format!("{}/.bun/bin/bun", home)]
    };
    for c in &candidates {
        if std::path::Path::new(c).exists() { return Ok(c.clone()); }
    }
    Err("找不到 bun".to_string())
}
