use crate::db::{queries, DatabaseState};
use crate::process::{sidecar, EngineState};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub async fn run_workflow(
    app: AppHandle,
    state: State<'_, EngineState>,
    db: State<'_, DatabaseState>,
    workflow_json: String,
    _workflow_id: i64,
) -> Result<String, String> {
    {
        let running = state.running.lock().map_err(|e| e.to_string())?;
        if *running {
            return Err("已有任务在运行中，请先停止当前任务".to_string());
        }
    }

    let settings_json = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        queries::get_setting(&conn, "app_settings")?
    };

    let settings: serde_json::Value = match settings_json {
        Some(s) => serde_json::from_str(&s).unwrap_or(json!({})),
        None => json!({}),
    };

    let api_key = settings["llm_api_key"].as_str().unwrap_or("").to_string();
    let model = settings["llm_model"].as_str().unwrap_or("gpt-4o").to_string();
    let base_url = settings["base_url"].as_str().unwrap_or("").to_string();
    let proxy_url = settings["proxy_url"].as_str().unwrap_or("").to_string();
    let headless = settings["headless"].as_bool().unwrap_or(true);
    let persist_browser = settings["persist_browser_data"].as_bool().unwrap_or(false);

    eprintln!("[ENGINE] api_key={}..., model={}, base_url={}, proxy={}",
        if api_key.is_empty() { "(空)" } else { &api_key[..8.min(api_key.len())] },
        model,
        if base_url.is_empty() { "(空)" } else { &base_url },
        if proxy_url.is_empty() { "(空)" } else { &proxy_url },
    );

    if api_key.is_empty() {
        return Err("未配置 API Key。请先在设置面板中填写 LLM API Key。".to_string());
    }

    {
        let mut running = state.running.lock().map_err(|e| e.to_string())?;
        *running = true;
    }

    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("stagehand-cache")
        .to_string_lossy()
        .to_string();

    std::fs::create_dir_all(&cache_dir).ok();

    let app_clone = app.clone();

    tauri::async_runtime::spawn(async move {
        let result = sidecar::spawn_engine(
            app_clone.clone(),
            workflow_json,
            cache_dir,
            api_key,
            model,
            base_url,
            proxy_url,
            headless,
            persist_browser,
        )
        .await;

        // spawn_engine 内部的 IO 线程会在进程退出时发 FINISHED
        // 只在 spawn 本身失败时才手动发 ERROR + FINISHED
        if let Err(e) = result {
            let _ = app_clone.emit(
                "rpa-event",
                json!({ "event_type": "ERROR", "data": { "message": e } }),
            );
            // spawn 失败才需要手动重置
            let engine_state = app_clone.state::<EngineState>();
            let mut running = engine_state.running.lock().unwrap();
            *running = false;
            let _ = app_clone.emit(
                "rpa-event",
                json!({ "event_type": "FINISHED", "data": { "code": -1 } }),
            );
        }
    });

    Ok("任务已部署到执行引擎".to_string())
}

#[tauri::command]
pub fn stop_workflow(state: State<'_, EngineState>) -> Result<String, String> {
    let mut running = state.running.lock().map_err(|e| e.to_string())?;
    *running = false;
    Ok("已发送停止信号".to_string())
}

#[tauri::command]
pub fn continue_engine() -> Result<String, String> {
    let signal_file = std::env::temp_dir().join("ai-rpa-continue.signal");
    std::fs::write(&signal_file, "continue").map_err(|e| e.to_string())?;
    Ok("已发送继续信号".to_string())
}
