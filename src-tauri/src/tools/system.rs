use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use std::time::Instant;
use crate::models::ToolExecutionResult;
use crate::security::{SecurityManager, ToolPermissionLevel};
use super::Tool;

pub struct SystemInfoTool;

#[async_trait]
impl Tool for SystemInfoTool {
    fn name(&self) -> &str { "system_info" }
    fn description(&self) -> &str { "Get current operating system and environment diagnostics" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::Safe }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {}
        })
    }
    async fn execute(&self, _args: Value, _security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let os = std::env::consts::OS;
        let arch = std::env::consts::ARCH;
        let current_dir = std::env::current_dir().unwrap_or_default();

        let output = format!("OS: {}\nArch: {}\nCwd: {:?}", os, arch, current_dir);

        ToolExecutionResult {
            call_id: uuid::Uuid::new_v4().to_string(),
            tool_name: "system_info".into(),
            success: true,
            stdout: output,
            stderr: String::new(),
            exit_code: Some(0),
            duration_ms: start.elapsed().as_millis() as u64,
            metadata: serde_json::json!({ "os": os, "arch": arch }),
        }
    }
}
