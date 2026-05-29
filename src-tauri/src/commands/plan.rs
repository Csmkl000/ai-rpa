use crate::db::{queries, DatabaseState};
use tauri::{AppHandle, Manager, State};
use serde_json::json;

/// AI 规划: 用户输入一句话 → LLM 生成工作流步骤
#[tauri::command]
pub async fn plan_workflow(
    app: AppHandle,
    db: State<'_, DatabaseState>,
    user_input: String,
) -> Result<String, String> {
    // 读取设置
    let (api_key, model, base_url) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let settings_json = queries::get_setting(&conn, "app_settings")?;
        let settings: serde_json::Value = match settings_json {
            Some(s) => serde_json::from_str(&s).unwrap_or(json!({})),
            None => json!({}),
        };
        (
            settings["llm_api_key"].as_str().unwrap_or("").to_string(),
            settings["llm_model"].as_str().unwrap_or("gpt-4o").to_string(),
            settings["base_url"].as_str().unwrap_or("").to_string(),
        )
    };

    if api_key.is_empty() {
        return Err("未配置 API Key。请先在设置中填写。".to_string());
    }

    // 定位 planner 脚本
    let planner_script = find_planner_script(&app)?;
    let bun_path = find_bun()?;

    // 写参数到临时文件
    let input_file = std::env::temp_dir().join("ai-rpa-plan-input.json");
    std::fs::write(&input_file, json!({
        "userInput": user_input,
        "apiKey": api_key,
        "model": model,
        "baseURL": base_url,
    }).to_string()).map_err(|e| e.to_string())?;

    // 执行
    let output = std::process::Command::new(&bun_path)
        .args([&planner_script, "--input", &input_file.to_string_lossy()])
        .output()
        .map_err(|e| format!("执行规划失败: {}", e))?;

    let _ = std::fs::remove_file(&input_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("规划失败: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // 从输出中提取 JSON（跳过日志行）
    let json_line = stdout.lines()
        .filter(|l| l.trim_start().starts_with('{') || l.trim_start().starts_with('['))
        .last()
        .unwrap_or("{}");

    Ok(json_line.to_string())
}

fn find_planner_script(app: &AppHandle) -> Result<String, String> {
    let dev_path = std::env::current_dir().ok()
        .and_then(|d| d.parent().map(|p| p.join("src/engine/planner.ts")))
        .filter(|p| p.exists());
    if let Some(p) = dev_path { return Ok(p.to_string_lossy().to_string()); }

    let resource_path = app.path().resource_dir().ok()
        .map(|d| d.join("src/engine/planner.ts"))
        .filter(|p| p.exists());
    if let Some(p) = resource_path { return Ok(p.to_string_lossy().to_string()); }

    Err("找不到规划脚本".to_string())
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
