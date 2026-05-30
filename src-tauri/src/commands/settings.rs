use crate::db::DatabaseState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub llm_provider: String,
    pub llm_api_key: String,
    pub llm_model: String,
    pub base_url: Option<String>,
    pub proxy_url: Option<String>,
    pub headless: bool,
    pub persist_browser_data: Option<bool>,
    pub chrome_path: Option<String>,
    pub cache_ttl_days: i64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            llm_provider: "openai".to_string(),
            llm_api_key: String::new(),
            llm_model: "gpt-4o".to_string(),
            base_url: None,
            proxy_url: None,
            headless: true,
            persist_browser_data: Some(false),
            chrome_path: None,
            cache_ttl_days: 30,
        }
    }
}

#[tauri::command]
pub fn get_settings(state: State<'_, DatabaseState>) -> Result<AppSettings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let json_str = crate::db::queries::get_setting(&conn, "app_settings")?;

    match json_str {
        Some(s) => serde_json::from_str(&s).map_err(|e| e.to_string()),
        None => Ok(AppSettings::default()),
    }
}

#[tauri::command]
pub fn update_settings(state: State<'_, DatabaseState>, settings: AppSettings) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let json_str = serde_json::to_string(&settings).map_err(|e| e.to_string())?;
    crate::db::queries::set_setting(&conn, "app_settings", &json_str)
}

/// 指南 7.4: 缓存自动清理
#[tauri::command]
pub fn cleanup_cache(state: State<'_, DatabaseState>) -> Result<usize, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let settings_json = crate::db::queries::get_setting(&conn, "app_settings")?;
    let ttl_days: i64 = match settings_json {
        Some(s) => {
            let v: serde_json::Value = serde_json::from_str(&s).unwrap_or_default();
            v["cache_ttl_days"].as_i64().unwrap_or(30)
        }
        None => 30,
    };
    crate::db::queries::cleanup_stale_cache(&conn, ttl_days)
}
