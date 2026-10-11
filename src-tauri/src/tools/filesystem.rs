use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use std::path::Path;
use std::time::Instant;
use crate::models::ToolExecutionResult;
use crate::security::{SecurityManager, ToolPermissionLevel};
use super::Tool;

pub struct ListDirTool;

#[async_trait]
impl Tool for ListDirTool {
    fn name(&self) -> &str { "list_dir" }
    fn description(&self) -> &str { "List contents of a directory in the workspace" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::Safe }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Relative or absolute directory path" }
            },
            "required": ["path"]
        })
    }
    async fn execute(&self, args: Value, security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let path_str = args["path"].as_str().unwrap_or(".");
        let sec = security.lock().await;
        
        let path = match sec.validate_path(Path::new(path_str)) {
            Ok(p) => p,
            Err(e) => return ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "list_dir".into(),
                success: false,
                stdout: String::new(),
                stderr: e,
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        };

        match std::fs::read_dir(&path) {
            Ok(entries) => {
                let mut items = Vec::new();
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
                    items.push(format!("{}{}", name, if is_dir { "/" } else { "" }));
                }
                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "list_dir".into(),
                    success: true,
                    stdout: items.join("\n"),
                    stderr: String::new(),
                    exit_code: Some(0),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({ "count": items.len() }),
                }
            }
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "list_dir".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to read directory {:?}: {}", path, e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}

pub struct ReadFileTool;

#[async_trait]
impl Tool for ReadFileTool {
    fn name(&self) -> &str { "read_file" }
    fn description(&self) -> &str { "Read the text contents of a file" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::Safe }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "File path" }
            },
            "required": ["path"]
        })
    }
    async fn execute(&self, args: Value, security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let path_str = args["path"].as_str().unwrap_or("");
        let sec = security.lock().await;

        let path = match sec.validate_path(Path::new(path_str)) {
            Ok(p) => p,
            Err(e) => return ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "read_file".into(),
                success: false,
                stdout: String::new(),
                stderr: e,
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        };

        match std::fs::read_to_string(&path) {
            Ok(content) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "read_file".into(),
                success: true,
                stdout: content,
                stderr: String::new(),
                exit_code: Some(0),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({ "path": path_str }),
            },
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "read_file".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to read file: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}

pub struct WriteFileTool;

#[async_trait]
impl Tool for WriteFileTool {
    fn name(&self) -> &str { "write_file" }
    fn description(&self) -> &str { "Write or overwrite a file with given content" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::ModerateImpact }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Target file path" },
                "content": { "type": "string", "description": "Content to write" }
            },
            "required": ["path", "content"]
        })
    }
    async fn execute(&self, args: Value, security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let path_str = args["path"].as_str().unwrap_or("");
        let content = args["content"].as_str().unwrap_or("");
        let sec = security.lock().await;

        let path = match sec.validate_path(Path::new(path_str)) {
            Ok(p) => p,
            Err(e) => return ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "write_file".into(),
                success: false,
                stdout: String::new(),
                stderr: e,
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        };

        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        match std::fs::write(&path, content) {
            Ok(_) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "write_file".into(),
                success: true,
                stdout: format!("Successfully wrote {} bytes to {:?}", content.len(), path),
                stderr: String::new(),
                exit_code: Some(0),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({ "bytes": content.len() }),
            },
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "write_file".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to write file: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}

pub struct PatchFileTool;

#[async_trait]
impl Tool for PatchFileTool {
    fn name(&self) -> &str { "patch_file" }
    fn description(&self) -> &str { "Replace target snippet in an existing file" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::ModerateImpact }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Target file path" },
                "search": { "type": "string", "description": "Exact text to find and replace" },
                "replacement": { "type": "string", "description": "New replacement text" }
            },
            "required": ["path", "search", "replacement"]
        })
    }
    async fn execute(&self, args: Value, security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let path_str = args["path"].as_str().unwrap_or("");
        let search = args["search"].as_str().unwrap_or("");
        let replacement = args["replacement"].as_str().unwrap_or("");
        let sec = security.lock().await;

        let path = match sec.validate_path(Path::new(path_str)) {
            Ok(p) => p,
            Err(e) => return ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "patch_file".into(),
                success: false,
                stdout: String::new(),
                stderr: e,
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        };

        match std::fs::read_to_string(&path) {
            Ok(content) => {
                if !content.contains(search) {
                    return ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "patch_file".into(),
                        success: false,
                        stdout: String::new(),
                        stderr: "Target search string not found in file".into(),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({}),
                    };
                }
                let new_content = content.replacen(search, replacement, 1);
                if let Err(e) = std::fs::write(&path, new_content) {
                    return ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "patch_file".into(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Failed to save patch: {}", e),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({}),
                    };
                }
                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "patch_file".into(),
                    success: true,
                    stdout: format!("Successfully patched {:?}", path),
                    stderr: String::new(),
                    exit_code: Some(0),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({}),
                }
            }
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "patch_file".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to read file for patching: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}
