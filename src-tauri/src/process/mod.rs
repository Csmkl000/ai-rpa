pub mod sidecar;

use std::sync::Mutex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EngineEvent {
    pub event_type: String,
    pub data: serde_json::Value,
}

pub struct EngineState {
    pub running: Mutex<bool>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            running: Mutex::new(false),
        }
    }
}
