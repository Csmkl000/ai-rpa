use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS workflows (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            steps_json  TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS run_logs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id   INTEGER NOT NULL REFERENCES workflows(id),
            status        TEXT NOT NULL DEFAULT 'pending',
            started_at    TEXT NOT NULL DEFAULT (datetime('now')),
            finished_at   TEXT,
            result_json   TEXT,
            error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS cache_metadata (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            dom_hash       TEXT NOT NULL,
            instruction    TEXT NOT NULL,
            selector       TEXT NOT NULL,
            last_hit_at    TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(dom_hash, instruction)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )?;
    Ok(())
}
