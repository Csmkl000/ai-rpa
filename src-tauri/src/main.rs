mod commands;
mod db;
mod process;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let db_path = app_handle
                .path()
                .app_data_dir()
                .expect("无法获取 AppData 目录")
                .join("ai-rpa.db");

            std::fs::create_dir_all(db_path.parent().unwrap()).ok();

            let conn = db::init_database(&db_path)?;

            // 指南 7.4: 启动时自动清理过期缓存
            {
                let settings_json = db::queries::get_setting(&conn, "app_settings").ok().flatten();
                let ttl_days: i64 = settings_json
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                    .and_then(|v| v["cache_ttl_days"].as_i64())
                    .unwrap_or(30);
                if let Ok(count) = db::queries::cleanup_stale_cache(&conn, ttl_days) {
                    if count > 0 {
                        eprintln!("[CACHE] 启动时清理了 {} 条过期缓存", count);
                    }
                }
            }

            app.manage(db::DatabaseState(std::sync::Mutex::new(conn)));
            app.manage(process::EngineState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::workflow::save_workflow,
            commands::workflow::load_workflows,
            commands::workflow::delete_workflow,
            commands::engine::run_workflow,
            commands::engine::stop_workflow,
            commands::engine::continue_engine,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::cleanup_cache,
            commands::recorder::start_recording,
            commands::recorder::stop_recording,
        ])
        .run(tauri::generate_context!())
        .expect("AI-RPA 启动失败");
}
