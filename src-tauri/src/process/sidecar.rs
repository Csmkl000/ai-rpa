use super::EngineEvent;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

// [Refactor: 添加日志 rotation，超过 5MB 自动轮转 by Claude]
macro_rules! engine_log {
    ($($arg:tt)*) => {
        let msg = format!($($arg)*);
        eprintln!("[ENGINE_SPAWN] {}", msg);
        let log_path = std::env::temp_dir().join("ai-rpa-engine.log");
        // 超过 5MB 时轮转
        if let Ok(meta) = std::fs::metadata(&log_path) {
            if meta.len() > 5 * 1024 * 1024 {
                let _ = std::fs::rename(&log_path, std::env::temp_dir().join("ai-rpa-engine.log.old"));
            }
        }
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true).append(true)
            .open(&log_path)
        {
            use std::io::Write;
            let _ = writeln!(f, "[{}] {}", chrono_now(), msg);
        }
    };
}

/// 去除 ANSI 转义码（终端颜色代码）
fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut in_escape = false;
    for ch in s.chars() {
        if ch == '\x1b' {
            in_escape = true;
            continue;
        }
        if in_escape {
            if ch == 'm' {
                in_escape = false;
            }
            continue;
        }
        result.push(ch);
    }
    result
}

fn chrono_now() -> String {
    let d = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = d.as_secs();
    format!("{:02}:{:02}:{:02}", (secs % 86400) / 3600, (secs % 3600) / 60, secs % 60)
}

pub async fn spawn_engine(
    app: AppHandle,
    workflow_json: String,
    cache_dir: String,
    api_key: String,
    model: String,
    base_url: String,
    proxy_url: String,
    headless: bool,
) -> Result<(), String> {
    engine_log!("=== spawn_engine 开始 ===");

    let engine_script = find_engine_script(&app)?;
    engine_log!("引擎脚本: {}", engine_script);

    // 写 workflow 到临时文件
    let workflow_file = std::env::temp_dir().join("ai-rpa-workflow.json");
    std::fs::write(&workflow_file, &workflow_json)
        .map_err(|e| format!("写入工作流文件失败: {}", e))?;

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
        "--headless".to_string(),
        headless.to_string(),
    ];

    // 指南 6.1: 优先用 Tauri sidecar，找不到则回退到 std::process::Command
    let app_clone = app.clone();
    let args_clone = args.clone();

    match try_sidecar(&app, &args) {
        Ok(()) => {
            engine_log!("使用 Tauri Sidecar 模式启动");
            return Ok(());
        }
        Err(e) => {
            engine_log!("Sidecar 不可用 ({}), 回退到 std::process::Command", e);
        }
    }

    // 回退: std::process::Command
    let bun_path = find_bun_executable()?;
    engine_log!("Bun 路径: {}", bun_path);
    engine_log!("启动命令: {} {}", bun_path, args_clone.join(" "));

    let child = match std::process::Command::new(&bun_path)
        .args(&args_clone)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => { engine_log!("进程启动成功, pid={:?}", c.id()); c }
        Err(e) => { engine_log!("进程启动失败: {}", e); return Err(format!("启动执行器失败: {}", e)); }
    };

    spawn_io_threads(app_clone, child);
    Ok(())
}

fn try_sidecar(app: &AppHandle, args: &[String]) -> Result<(), String> {
    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("bun")
        .map_err(|e| format!("sidecar 初始化失败: {}", e))?
        .args(args)
        .spawn()
        .map_err(|e| format!("sidecar 启动失败: {}", e))?;

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes).to_string();
                    engine_log!("[stdout] {}", line);
                    let _ = app_clone.emit("rpa-event", parse_engine_line(&line));
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes).to_string();
                    engine_log!("[stderr] {}", line);
                    let _ = app_clone.emit("rpa-event", EngineEvent {
                        event_type: "ERROR".into(),
                        data: json!({ "message": line }),
                    });
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                    engine_log!("进程退出, code={:?}", payload.code);
                    let _ = app_clone.emit("rpa-event", EngineEvent {
                        event_type: "FINISHED".into(),
                        data: json!({ "code": payload.code }),
                    });
                    break;
                }
                _ => {}
            }
        }
    });
    Ok(())
}

fn spawn_io_threads(app: AppHandle, mut child: std::process::Child) {
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    if let Some(stdout) = stdout {
        let app_out = app.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            for line in BufReader::new(stdout).lines() {
                if let Ok(line) = line {
                    // 截断过长行 + 去除 ANSI 转义码
                    let clean = strip_ansi(&line);
                    let display = if clean.len() > 200 {
                        format!("{}...", &clean[..200])
                    } else {
                        clean
                    };
                    if !display.trim().is_empty() {
                        engine_log!("[stdout] {}", display);
                    }
                    let _ = app_out.emit("rpa-event", parse_engine_line(&line));
                }
            }
        });
    }

    if let Some(stderr) = stderr {
        let app_err = app.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            for line in BufReader::new(stderr).lines() {
                if let Ok(line) = line {
                    engine_log!("[stderr] {}", line);
                    let _ = app_err.emit("rpa-event", EngineEvent {
                        event_type: "ERROR".into(),
                        data: json!({ "message": line }),
                    });
                }
            }
        });
    }

    // [Refactor: 添加 5 分钟超时保护 by Claude]
    let app_fin = app.clone();
    std::thread::spawn(move || {
        let timeout = std::time::Duration::from_secs(300);
        let start = std::time::Instant::now();
        let code = loop {
            match child.try_wait() {
                Ok(Some(status)) => break status.code().unwrap_or(-1),
                Ok(None) if start.elapsed() < timeout => {
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }
                _ => {
                    engine_log!("引擎超时（5分钟），强制终止");
                    let _ = child.kill();
                    break -1;
                }
            }
        };
        engine_log!("进程退出, code={}", code);
        let _ = app_fin.emit("rpa-event", EngineEvent {
            event_type: "FINISHED".into(),
            data: json!({ "code": code }),
        });
    });
}

fn find_engine_script(app: &AppHandle) -> Result<String, String> {
    let dev_path = std::env::current_dir().ok()
        .and_then(|d| d.parent().map(|p| p.join("src/engine/execute.ts")))
        .filter(|p| p.exists());
    if let Some(p) = dev_path { return Ok(p.to_string_lossy().to_string()); }

    let resource_path = app.path().resource_dir().ok()
        .map(|d| d.join("src/engine/execute.ts"))
        .filter(|p| p.exists());
    if let Some(p) = resource_path { return Ok(p.to_string_lossy().to_string()); }

    Err("找不到引擎脚本".to_string())
}

fn find_bun_executable() -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();
    let candidates: Vec<String> = if cfg!(windows) {
        vec![format!("{}\\.bun\\bin\\bun.exe", home)]
    } else {
        vec![format!("{}/.bun/bin/bun", home), "/usr/local/bin/bun".into()]
    };
    for c in &candidates {
        if std::path::Path::new(c).exists() { return Ok(c.clone()); }
    }
    if let Ok(output) = std::process::Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg("bun").output()
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

pub fn parse_engine_line(line: &str) -> EngineEvent {
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
    } else if line.contains("[SCREENSHOT]") {
        let json_str = line.split("[SCREENSHOT] ").nth(1).unwrap_or("{}");
        let data: serde_json::Value = serde_json::from_str(json_str).unwrap_or(json!({ "raw": line }));
        EngineEvent { event_type: "SCREENSHOT".into(), data }
    } else if line.contains("[CAPTCHA_PAUSE]") {
        let step_id = line.split("step_id").nth(1)
            .and_then(|s| s.split('"').nth(3))
            .unwrap_or("unknown").to_string();
        EngineEvent { event_type: "CAPTCHA_PAUSE".into(), data: json!({ "step_id": step_id }) }
    } else if line.contains("[ERROR]") {
        EngineEvent { event_type: "ERROR".into(), data: json!({ "message": line }) }
    } else {
        EngineEvent { event_type: "LOG".into(), data: json!({ "log": line }) }
    }
}
