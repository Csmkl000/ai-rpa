use crate::db::{queries, DatabaseState};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduledTask {
    pub id: i64,
    pub workflow_id: i64,
    pub cron_expr: String,
    pub enabled: bool,
    pub workflow_name: String,
}

pub struct SchedulerState {
    pub tasks: Mutex<Vec<ScheduledTask>>,
}

impl Default for SchedulerState {
    fn default() -> Self {
        Self { tasks: Mutex::new(Vec::new()) }
    }
}

/// 保存定时任务
#[tauri::command]
pub fn save_schedule(
    db: State<'_, DatabaseState>,
    workflow_id: i64,
    cron_expr: String,
) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // 创建 schedules 表（如果不存在）
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL REFERENCES workflows(id),
            cron_expr TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO schedules (workflow_id, cron_expr) VALUES (?1, ?2)",
        rusqlite::params![workflow_id, cron_expr],
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

/// 获取所有定时任务
#[tauri::command]
pub fn load_schedules(db: State<'_, DatabaseState>) -> Result<Vec<ScheduledTask>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL REFERENCES workflows(id),
            cron_expr TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT s.id, s.workflow_id, s.cron_expr, s.enabled, w.name
         FROM schedules s JOIN workflows w ON s.workflow_id = w.id
         ORDER BY s.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let tasks = stmt.query_map([], |row| {
        Ok(ScheduledTask {
            id: row.get(0)?,
            workflow_id: row.get(1)?,
            cron_expr: row.get(2)?,
            enabled: row.get::<_, i32>(3)? != 0,
            workflow_name: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(tasks)
}

/// 删除定时任务
#[tauri::command]
pub fn delete_schedule(db: State<'_, DatabaseState>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM schedules WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 启用/禁用定时任务
#[tauri::command]
pub fn toggle_schedule(db: State<'_, DatabaseState>, id: i64, enabled: bool) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE schedules SET enabled = ?1 WHERE id = ?2",
        rusqlite::params![enabled as i32, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
