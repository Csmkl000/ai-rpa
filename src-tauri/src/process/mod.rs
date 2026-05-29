pub mod sidecar;

use std::sync::Mutex;
use std::sync::mpsc;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EngineEvent {
    pub event_type: String,
    pub data: serde_json::Value,
}

pub struct EngineState {
    pub running: Mutex<bool>,
    pub stdin_tx: Mutex<Option<mpsc::Sender<String>>>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            running: Mutex::new(false),
            stdin_tx: Mutex::new(None),
        }
    }
}
