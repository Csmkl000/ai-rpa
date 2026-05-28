pub mod sidecar;

use std::sync::Mutex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EngineEvent {
    pub event_type: String,
    pub data: serde_json::Value,
}

#[derive(Default)]
pub struct EngineState {
    pub running: Mutex<bool>,
}
