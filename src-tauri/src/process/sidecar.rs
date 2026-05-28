use super::EngineEvent;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

pub async fn spawn_engine(
    app: AppHandle,
    workflow_json: String,
    cache_dir: String,
    api_key: String,
    model: String,
    base_url: String,
    proxy_url: String,
) -> Result<(), String> {
    // 定位引擎脚本：开发模式下在项目目录，打包后在资源目录
    let engine_script = find_engine_script(&app)?;

    let mut args = vec![
        engine_script.clone(),
        "--workflow".to_string(),
        workflow_json,
        "--cache-dir".to_string(),
        cache_dir,
        "--api-key".to_string(),
        api_key,
        "--model".to_string(),
        model,
    ];

    if !base_url.is_empty() {
        args.push("--base-url".to_string());
        args.push(base_url);
    }

    if !proxy_url.is_empty() {
        args.push("--proxy".to_string());
        args.push(proxy_url);
    }

    // 查找 bun 可执行文件
    let bun_path = find_bun_executable()?;

    let app_clone = app.clone();

    let mut child = std::process::Command::new(&bun_path)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动执行器失败: {} (bun: {})", e, bun_path))?;

    let stdout = child.stdout.take().ok_or("无法获取 stdout")?;
    let stderr = child.stderr.take().ok_or("无法获取 stderr")?;

    // 读取 stdout
    let app_out = app_clone.clone();
    std::thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let parsed = parse_engine_line(&line);
                let _ = app_out.emit("rpa-event", parsed);
            }
        }
    });

    // 读取 stderr
    let app_err = app_clone.clone();
    std::thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_err.emit(
                    "rpa-event",
                    EngineEvent {
                        event_type: "ERROR".to_string(),
                        data: json!({ "message": line }),
                    },
                );
            }
        }
    });

    // 等待进程结束
    let app_fin = app_clone.clone();
    std::thread::spawn(move || {
        let status = child.wait();
        let code = status.map(|s| s.code()).unwrap_or(Some(-1));
        let _ = app_fin.emit(
            "rpa-event",
            EngineEvent {
                event_type: "FINISHED".to_string(),
                data: json!({ "code": code }),
            },
        );
    });

    Ok(())
}

fn find_engine_script(app: &AppHandle) -> Result<String, String> {
    // 开发模式: src-tauri 同级的 src/engine/execute.ts
    let dev_path = std::env::current_dir()
        .ok()
        .and_then(|d| d.parent().map(|p| p.join("src/engine/execute.ts")))
        .filter(|p| p.exists());

    if let Some(p) = dev_path {
        return Ok(p.to_string_lossy().to_string());
    }

    // 打包模式: 资源目录
    let resource_path = app
        .path()
        .resource_dir()
        .ok()
        .map(|d| d.join("src/engine/execute.ts"))
        .filter(|p| p.exists());

    if let Some(p) = resource_path {
        return Ok(p.to_string_lossy().to_string());
    }

    Err("找不到引擎脚本 src/engine/execute.ts".to_string())
}

fn find_bun_executable() -> Result<String, String> {
    // 1. 先查 PATH
    if let Ok(output) = std::process::Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg("bun")
        .output()
    {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            // Windows where 可能返回多行，取第一行
            let first = path.lines().next().unwrap_or(&path).to_string();
            if std::path::Path::new(&first).exists() {
                return Ok(first);
            }
        }
    }

    // 2. 常见安装路径
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();

    let candidates: Vec<String> = if cfg!(windows) {
        vec![
            format!("{}\\.bun\\bin\\bun.exe", home),
            "C:\\Program Files\\bun\\bun.exe".to_string(),
        ]
    } else {
        vec![
            format!("{}/.bun/bin/bun", home),
            "/usr/local/bin/bun".to_string(),
            "/opt/homebrew/bin/bun".to_string(),
        ]
    };

    for candidate in &candidates {
        if std::path::Path::new(candidate).exists() {
            return Ok(candidate.clone());
        }
    }

    Err(format!(
        "找不到 bun 可执行文件。请确保 bun 已安装并在 PATH 中。候选路径: {:?}",
        candidates
    ))
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
    } else if line.contains("[ERROR]") {
        EngineEvent {
            event_type: "ERROR".to_string(),
            data: json!({ "message": line }),
        }
    } else {
        EngineEvent {
            event_type: "LOG".to_string(),
            data: json!({ "log": line }),
        }
    }
}
