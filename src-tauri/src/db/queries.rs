use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Workflow {
    pub id: i64,
    pub name: String,
    pub steps_json: String,
    pub created_at: String,
    pub updated_at: String,
}

// [Refactor: 删除未使用的 RunLog struct by Claude]

pub fn save_workflow(conn: &Connection, name: &str, steps_json: &str) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO workflows (name, steps_json) VALUES (?1, ?2)",
        rusqlite::params![name, steps_json],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn update_workflow(conn: &Connection, id: i64, name: &str, steps_json: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE workflows SET name = ?1, steps_json = ?2, updated_at = datetime('now') WHERE id = ?3",
        rusqlite::params![name, steps_json, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_workflows(conn: &Connection) -> Result<Vec<Workflow>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, steps_json, created_at, updated_at FROM workflows ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Workflow {
                id: row.get(0)?,
                name: row.get(1)?,
                steps_json: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn delete_workflow(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM workflows WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// [Refactor: 删除未使用的 create_run_log, finish_run_log by Claude]

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query_map(rusqlite::params![key], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    match rows.next() {
        Some(Ok(val)) => Ok(Some(val)),
        Some(Err(e)) => Err(e.to_string()),
        None => Ok(None),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn cleanup_stale_cache(conn: &Connection, days: i64) -> Result<usize, String> {
    let count = conn.execute(
        "DELETE FROM cache_metadata WHERE last_hit_at < datetime('now', ?1)",
        rusqlite::params![format!("-{} days", days)],
    )
    .map_err(|e| e.to_string())?;
    Ok(count)
}
