use super::EngineEvent;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

macro_rules! engine_log {
    ($($arg:tt)*) => {
        let msg = format!($($arg)*);
        eprintln!("[ENGINE_SPAWN] {}", msg);
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true).append(true)
            .open(std::env::temp_dir().join("ai-rpa-engine.log"))
        {
            use std::io::Write;
            let _ = writeln!(f, "[{}] {}", chrono_now(), msg);
        }
    };
}

fn chrono_now() -> String {
    let d = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = d.as_secs();
    let hours = (secs % 86400) / 3600;
    let mins = (secs % 3600) / 60;
    let ss = secs % 60;
    format!("{:02}:{:02}:{:02}", hours, mins, ss)
}

pub async fn spawn_engine(
    app: AppHandle,
    workflow_json: String,
    cache_dir: String,
    api_key: String,
    model: String,
    base_url: String,
    proxy_url: String,
) -> Result<(), String> {
    engine_log!("=== spawn_engine 开始 ===");

    // 1. 定位引擎脚本
    let engine_script = find_engine_script(&app)?;
    engine_log!("引擎脚本: {}", engine_script);

    // 2. 查找 bun
    let bun_path = find_bun_executable()?;
    engine_log!("Bun 路径: {}", bun_path);

    // 3. 将 workflow JSON 写入临时文件，避免命令行参数转义问题
    let workflow_file = std::env::temp_dir().join("ai-rpa-workflow.json");
    std::fs::write(&workflow_file, &workflow_json)
        .map_err(|e| format!("写入工作流文件失败: {}", e))?;
    engine_log!("工作流文件: {}", workflow_file.display());

    // 4. 构造参数
    let args = vec![
        engine_script,
        "--workflow-file".to_string(),
        workflow_file.to_string_lossy().to_string(),
        "--cache-dir".to_string(),
        cache_dir,
        "--api-key".to_string(),
        api_key,
        "--model".to_string(),
        model,
        "--base-url".to_string(),
        base_url,
        "--proxy".to_string(),
        proxy_url,
    ];

    engine_log!("启动命令: {} {}", bun_path, args.join(" "));

    // 5. 启动进程
    let app_clone = app.clone();
    let mut child = match std::process::Command::new(&bun_path)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => {
            engine_log!("进程启动成功, pid={:?}", c.id());
            c
        }
        Err(e) => {
            engine_log!("进程启动失败: {}", e);
            return Err(format!("启动执行器失败: {}", e));
        }
    };

    // 6. 读取 stdout
    let stdout = child.stdout.take().ok_or("无法获取 stdout")?;
    let app_out = app_clone.clone();
    std::thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        for line in BufReader::new(stdout).lines() {
            if let Ok(line) = line {
                engine_log!("[stdout] {}", line);
                let _ = app_out.emit("rpa-event", parse_engine_line(&line));
            }
        }
    });

    // 7. 读取 stderr
    let stderr = child.stderr.take().ok_or("无法获取 stderr")?;
    let app_err = app_clone.clone();
    std::thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        for line in BufReader::new(stderr).lines() {
            if let Ok(line) = line {
                engine_log!("[stderr] {}", line);
                let _ = app_err.emit("rpa-event", EngineEvent {
                    event_type: "ERROR".to_string(),
                    data: json!({ "message": line }),
                });
            }
        }
    });

    // 8. 等待进程结束
    let app_fin = app_clone.clone();
    std::thread::spawn(move || {
        let status = child.wait();
        let code = status.map(|s| s.code()).unwrap_or(Some(-1));
        engine_log!("进程退出, code={:?}", code);
        let _ = app_fin.emit("rpa-event", EngineEvent {
            event_type: "FINISHED".to_string(),
            data: json!({ "code": code }),
        });
    });

    Ok(())
}

fn find_engine_script(app: &AppHandle) -> Result<String, String> {
    let dev_path = std::env::current_dir()
        .ok()
        .and_then(|d| d.parent().map(|p| p.join("src/engine/execute.ts")))
        .filter(|p| p.exists());

    if let Some(p) = dev_path {
        return Ok(p.to_string_lossy().to_string());
    }

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

    if let Ok(output) = std::process::Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg("bun")
        .output()
    {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            let first = path.lines().next().unwrap_or(&path).to_string();
            if !first.contains("target") && std::path::Path::new(&first).exists() {
                return Ok(first);
            }
        }
    }

    Err(format!("找不到 bun。候选路径: {:?}", candidates))
}

fn parse_engine_line(line: &str) -> EngineEvent {
    if line.contains("[CACHE_HIT]") {
        EngineEvent { event_type: "CACHE_HIT".into(), data: json!({ "log": line }) }
    } else if line.contains("[SELF_HEALING]") {
        EngineEvent { event_type: "SELF_HEAL".into(), data: json!({ "log": line }) }
    } else if line.contains("[DATA_RECORD]") {
        let json_str = line.split("[DATA_RECORD] ").nth(1).unwrap_or("{}");
        let data: serde_json::Value = serde_json::from_str(json_str).unwrap_or(json!({ "raw": line }));
        EngineEvent { event_type: "DATA_EXTRACTED".into(), data }
    } else if line.contains("[ACTION_COMPLETED]") {
        EngineEvent { event_type: "ACTION_COMPLETED".into(), data: json!({ "log": line }) }
    } else if line.contains("[AGENT_START]") {
        EngineEvent { event_type: "AGENT_START".into(), data: json!({ "log": line }) }
    } else if line.contains("[AGENT_SUCCESS]") {
        EngineEvent { event_type: "AGENT_SUCCESS".into(), data: json!({ "log": line }) }
    } else if line.contains("[PAGINATION_FINISHED]") {
        EngineEvent { event_type: "PAGINATION_FINISHED".into(), data: json!({ "log": line }) }
    } else if line.contains("[ENGINE_BOOT]") {
        EngineEvent { event_type: "ENGINE_BOOT".into(), data: json!({ "log": line }) }
    } else if line.contains("[ERROR]") {
        EngineEvent { event_type: "ERROR".into(), data: json!({ "message": line }) }
    } else {
        EngineEvent { event_type: "LOG".into(), data: json!({ "log": line }) }
    }
}
