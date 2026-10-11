use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use crate::models::{ToolExecutionResult};
use crate::security::{SecurityManager, ToolPermissionLevel};

pub mod filesystem;
pub mod terminal;
pub mod system;

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
        registry
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.insert(tool.name().to_string(), tool);
    }

    pub fn get(&self, name: &str) -> Option<&Box<dyn Tool>> {
        self.tools.get(name)
    }

    pub fn list_tools_summary(&self) -> Vec<Value> {
        self.tools.values().map(|t| {
            serde_json::json!({
                "name": t.name(),
                "description": t.description(),
                "permission_level": match t.permission_level() {
                    ToolPermissionLevel::Safe => "safe",
                    ToolPermissionLevel::ModerateImpact => "moderate_impact",
                    ToolPermissionLevel::Sensitive => "sensitive",
                },
                "parameters": t.input_schema(),
            })
        }).collect()
    }
}
