use crate::db::{queries, DatabaseState};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowInput {
    pub id: Option<i64>,
    pub name: String,
    pub steps: serde_json::Value,
}

#[tauri::command]
pub fn save_workflow(state: State<'_, DatabaseState>, input: WorkflowInput) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let steps_json = serde_json::to_string(&input.steps).map_err(|e| e.to_string())?;

    match input.id {
        Some(id) => {
            queries::update_workflow(&conn, id, &input.name, &steps_json)?;
            Ok(id)
        }
        None => queries::save_workflow(&conn, &input.name, &steps_json),
    }
}

#[tauri::command]
pub fn load_workflows(state: State<'_, DatabaseState>) -> Result<Vec<queries::Workflow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::load_workflows(&conn)
}

#[tauri::command]
pub fn delete_workflow(state: State<'_, DatabaseState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_workflow(&conn, id)
}
