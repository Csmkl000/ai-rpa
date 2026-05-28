use crate::process::{sidecar, EngineState};
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub async fn run_workflow(
    app: AppHandle,
    state: State<'_, EngineState>,
    workflow_json: String,
    _workflow_id: i64,
) -> Result<String, String> {
    {
        let running = state.running.lock().map_err(|e| e.to_string())?;
        if *running {
            return Err("已有任务在运行中，请先停止当前任务".to_string());
        }
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
    let state_clone = EngineState::default();

    tauri::async_runtime::spawn(async move {
        let result = sidecar::spawn_engine(app_clone.clone(), workflow_json, cache_dir).await;

        let mut running = state_clone.running.lock().unwrap();
        *running = false;

        if let Err(e) = result {
            let _ = app_clone.emit(
                "rpa-event",
                serde_json::json!({ "event_type": "ERROR", "data": { "message": e } }),
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
