use super::EngineEvent;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

pub async fn spawn_engine(
    app: AppHandle,
    workflow_json: String,
    cache_dir: String,
    api_key: String,
    model: String,
    proxy_url: String,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {}", e))?;

    let engine_script = app_data_dir.join("src/engine/execute.ts");
    let engine_script_str = engine_script.to_string_lossy().to_string();

    let mut args = vec![
        engine_script_str.clone(),
        "--workflow".to_string(),
        workflow_json,
        "--cache-dir".to_string(),
        cache_dir,
        "--api-key".to_string(),
        api_key,
        "--model".to_string(),
        model,
    ];

    if !proxy_url.is_empty() {
        args.push("--proxy".to_string());
        args.push(proxy_url);
    }

    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("bun")
        .map_err(|e| format!("初始化 Bun Sidecar 失败: {}", e))?
        .args(&args)
        .spawn()
        .map_err(|e| format!("启动执行器失败: {}", e))?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes).to_string();
                    let parsed = parse_engine_line(&line);
                    let _ = app.emit("rpa-event", parsed);
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes).to_string();
                    let _ = app.emit(
                        "rpa-event",
                        EngineEvent {
                            event_type: "ERROR".to_string(),
                            data: json!({ "message": line }),
                        },
                    );
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                    let _ = app.emit(
                        "rpa-event",
                        EngineEvent {
                            event_type: "FINISHED".to_string(),
                            data: json!({ "code": payload.code }),
                        },
                    );
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

fn parse_engine_line(line: &str) -> EngineEvent {
    if line.contains("[CACHE_HIT]") {
        EngineEvent {
            event_type: "CACHE_HIT".to_string(),
            data: json!({ "log": line }),
        }
    } else if line.contains("[SELF_HEALING]") {
        EngineEvent {
            event_type: "SELF_HEAL".to_string(),
            data: json!({ "log": line }),
        }
    } else if line.contains("[DATA_RECORD]") {
        let json_str = line.split("[DATA_RECORD] ").nth(1).unwrap_or("{}");
        let data: serde_json::Value =
            serde_json::from_str(json_str).unwrap_or(json!({ "raw": line }));
        EngineEvent {
            event_type: "DATA_EXTRACTED".to_string(),
            data,
        }
    } else if line.contains("[ACTION_COMPLETED]") {
        EngineEvent {
            event_type: "ACTION_COMPLETED".to_string(),
            data: json!({ "log": line }),
        }
    } else if line.contains("[AGENT_START]") {
        EngineEvent {
            event_type: "AGENT_START".to_string(),
            data: json!({ "log": line }),
        }
    } else if line.contains("[AGENT_SUCCESS]") {
        EngineEvent {
            event_type: "AGENT_SUCCESS".to_string(),
            data: json!({ "log": line }),
        }
    } else if line.contains("[PAGINATION_FINISHED]") {
        EngineEvent {
            event_type: "PAGINATION_FINISHED".to_string(),
            data: json!({ "log": line }),
        }
    } else if line.contains("[ENGINE_BOOT]") {
        EngineEvent {
            event_type: "ENGINE_BOOT".to_string(),
            data: json!({ "log": line }),
        }
    } else {
        EngineEvent {
            event_type: "LOG".to_string(),
            data: json!({ "log": line }),
        }
    }
}
