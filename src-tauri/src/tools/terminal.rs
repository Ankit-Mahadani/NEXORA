use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use std::time::Instant;
use tokio::process::Command;
use crate::models::ToolExecutionResult;
use crate::security::{SecurityManager, ToolPermissionLevel};
use super::Tool;

pub struct RunCommandTool;

#[async_trait]
impl Tool for RunCommandTool {
    fn name(&self) -> &str { "run_command" }
    fn description(&self) -> &str { "Execute a terminal command within the workspace" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::Sensitive }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "command": { "type": "string", "description": "The command line string to execute" },
                "cwd": { "type": "string", "description": "Optional working directory" }
            },
            "required": ["command"]
        })
    }
    async fn execute(&self, args: Value, security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let cmd_str = args["command"].as_str().unwrap_or("");
        let cwd_str = args["cwd"].as_str().unwrap_or(".");
        let sec = security.lock().await;

        let cwd_path = match sec.validate_path(std::path::Path::new(cwd_str)) {
            Ok(p) => p,
            Err(e) => return ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "run_command".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Invalid working directory: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        };

        // On Windows run via powershell or cmd
        let mut child = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(cmd_str)
            .current_dir(cwd_path)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn();

        match child {
            Ok(proc) => {
                // Timeout after 30 seconds to prevent deadlocks
                match tokio::time::timeout(std::time::Duration::from_secs(30), proc.wait_with_output()).await {
                    Ok(Ok(output)) => {
                        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                        let exit_code = output.status.code();
                        ToolExecutionResult {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "run_command".into(),
                            success: output.status.success(),
                            stdout: SecurityManager::redact_secrets(&stdout),
                            stderr: SecurityManager::redact_secrets(&stderr),
                            exit_code,
                            duration_ms: start.elapsed().as_millis() as u64,
                            metadata: serde_json::json!({ "command": cmd_str }),
                        }
                    }
                    Ok(Err(e)) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "run_command".into(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Execution failed: {}", e),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({}),
                    },
                    Err(_) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "run_command".into(),
                        success: false,
                        stdout: String::new(),
                        stderr: "Command timed out after 30 seconds".into(),
                        exit_code: Some(124),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({}),
                    },
                }
            }
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "run_command".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to spawn process: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}
