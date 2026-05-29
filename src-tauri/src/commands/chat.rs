use tauri::{AppHandle, Manager};
use serde_json::json;

/// 对话式执行: 用户输入 → AI 生成指令 → 执行 → 返回结果
#[tauri::command]
pub async fn chat_step(
    app: AppHandle,
    user_message: String,
    api_key: String,
    model: String,
    base_url: String,
    cache_dir: String,
) -> Result<String, String> {
    let chat_script = find_chat_script(&app)?;
    let bun_path = find_bun()?;

    let input_file = std::env::temp_dir().join("ai-rpa-chat-input.json");
    std::fs::write(&input_file, json!({
        "userMessage": user_message,
        "apiKey": api_key,
        "model": model,
        "baseURL": base_url,
        "cacheDir": cache_dir,
    }).to_string()).map_err(|e| e.to_string())?;

    let output = std::process::Command::new(&bun_path)
        .args([&chat_script, "--input", &input_file.to_string_lossy()])
        .output()
        .map_err(|e| format!("执行对话失败: {}", e))?;

    let _ = std::fs::remove_file(&input_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("对话失败: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json_line = stdout.lines()
        .filter(|l| l.trim_start().starts_with('{') || l.trim_start().starts_with('['))
        .last()
        .unwrap_or("{}");

    Ok(json_line.to_string())
}

fn find_chat_script(app: &AppHandle) -> Result<String, String> {
    let dev_path = std::env::current_dir().ok()
        .and_then(|d| d.parent().map(|p| p.join("src/engine/chat_runner.ts")))
        .filter(|p| p.exists());
    if let Some(p) = dev_path { return Ok(p.to_string_lossy().to_string()); }

    let resource_path = app.path().resource_dir().ok()
        .map(|d| d.join("src/engine/chat_runner.ts"))
        .filter(|p| p.exists());
    if let Some(p) = resource_path { return Ok(p.to_string_lossy().to_string()); }

    Err("找不到对话脚本".to_string())
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
