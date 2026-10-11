use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use crate::models::{ToolExecutionResult};
use crate::security::{SecurityManager, ToolPermissionLevel};

pub mod filesystem;
pub mod terminal;
pub mod system;
pub mod automation;
pub mod assignment;

#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn permission_level(&self) -> ToolPermissionLevel;
    fn input_schema(&self) -> Value;
    async fn execute(&self, args: Value, security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult;
}

pub struct ToolRegistry {
    tools: std::collections::HashMap<String, Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            tools: std::collections::HashMap::new(),
        };
        registry.register(Box::new(filesystem::ListDirTool));
        registry.register(Box::new(filesystem::ReadFileTool));
        registry.register(Box::new(filesystem::WriteFileTool));
        registry.register(Box::new(filesystem::PatchFileTool));
        registry.register(Box::new(terminal::RunCommandTool));
        registry.register(Box::new(system::SystemInfoTool));
        registry.register(Box::new(automation::TakeScreenshotTool));
        registry.register(Box::new(automation::DesktopAppTool));
        registry.register(Box::new(automation::SystemControlTool));
        registry.register(Box::new(assignment::AssignmentPipelineTool));
        registry
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.insert(tool.name().to_string(), tool);
    }

    pub fn get(&self, name: &str) -> Option<&Box<dyn Tool>> {
        self.tools.get(name)
    }

    pub fn list_tools_summary(&self) -> Vec<Value> {
        let mut list: Vec<Value> = self.tools.values().map(|t| {
            serde_json::json!({
                "name": t.name(),
                "description": t.description(),
                "permission_level": match t.permission_level() {
                    ToolPermissionLevel::Safe => "safe",
                    ToolPermissionLevel::ModerateImpact => "moderate_impact",
                    ToolPermissionLevel::Sensitive => "sensitive",
                },
                "category": match t.name() {
                    "write_file" | "read_file" | "patch_file" | "list_dir" => "Filesystem",
                    "run_command" => "Terminal",
                    "system_info" | "system_control" => "System",
                    _ => "Automation",
                },
                "parameters": t.input_schema(),
                "status": "active",
            })
        }).collect();

        // Extended/future permissions reserved for subsequent capabilities
        let future_specs = vec![
            ("browser_automation", "Automate Chromium/Edge browser navigation, tab control, and web scraping", "sensitive", "Web & Network"),
            ("clipboard_access", "Read and write system clipboard contents and rich text buffers", "moderate_impact", "System"),
            ("web_search", "Perform live web searches and index external references", "safe", "Web & Network"),
            ("network_http", "Send outbound HTTP requests and fetch remote REST APIs", "moderate_impact", "Web & Network"),
            ("audio_synthesis", "Local text-to-speech voice generation and auditory feedback", "safe", "Hardware"),
            ("camera_capture", "Capture webcam frame for computer vision and object inspection", "sensitive", "Hardware"),
            ("file_deletion", "Permanently delete files or directories in authorized folders", "sensitive", "Filesystem"),
            ("git_operations", "Execute Git version control actions, branch switching, and commits", "moderate_impact", "Terminal"),
            ("active_window_inspect", "Inspect titles, bounds, and process IDs of currently open windows", "safe", "System"),
            ("keystroke_automation", "Simulate native Windows keystrokes and hotkey combinations", "sensitive", "Automation"),
            ("mouse_click_automation", "Simulate native Windows mouse cursor movements, clicks, and drags", "sensitive", "Automation"),
            ("environment_variables", "Inspect and configure process environment variables and paths", "sensitive", "System"),
            ("notification_toast", "Display native Windows Action Center notifications and banners", "safe", "System"),
            ("scheduled_cron", "Register recurring background cron jobs and automated reminders", "safe", "Automation"),
            ("package_manager", "Install, update, or remove packages via WinGet, npm, or pip", "sensitive", "Terminal"),
            ("database_direct_sql", "Execute raw SQL and Cypher queries against SQLite and Neo4j", "moderate_impact", "Data"),
            ("registry_read", "Read Windows registry configuration keys and values", "sensitive", "System"),
            ("registry_write", "Modify Windows registry keys and workstation group policies", "sensitive", "System"),
        ];

        for (name, desc, level, cat) in future_specs {
            if !list.iter().any(|v| v["name"] == name) {
                list.push(serde_json::json!({
                    "name": name,
                    "description": desc,
                    "permission_level": level,
                    "category": cat,
                    "status": "reserved",
                }));
            }
        }

        list
    }
}
