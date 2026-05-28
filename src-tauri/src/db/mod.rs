pub mod queries;
pub mod schema;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct DatabaseState(pub Mutex<Connection>);

pub fn init_database(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| format!("数据库打开失败: {}", e))?;
    schema::run_migrations(&conn).map_err(|e| format!("数据库迁移失败: {}", e))?;
    Ok(conn)
}
