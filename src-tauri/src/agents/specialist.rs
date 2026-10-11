use serde_json::Value;
use crate::models::{ToolCallRequest, ToolExecutionResult};
use crate::ollama::{OllamaClient, OllamaChatMessage};
use crate::tools::ToolRegistry;

pub struct SpecialistAgent {
    ollama: OllamaClient,
    role_name: String,
}

impl SpecialistAgent {
    pub fn new(role_name: &str, ollama: OllamaClient) -> Self {
        Self {
            ollama,
            role_name: role_name.to_string(),
        }
    }

    pub async fn decide_action(
        &self,
        model: &str,
        objective: &str,
        subtask_desc: &str,
        tools: &ToolRegistry,
        observations: &[ToolExecutionResult],
    ) -> Result<Option<ToolCallRequest>, String> {
        let tools_schema = tools.list_tools_summary();
        let tools_json = serde_json::to_string_pretty(&tools_schema).unwrap_or_default();

        let obs_summary = observations.iter().map(|o| {
            format!("Tool: {}\nSuccess: {}\nStdout: {}\nStderr: {}", o.tool_name, o.success, o.stdout, o.stderr)
        }).collect::<Vec<_>>().join("\n---\n");

        let system_prompt = format!(
            r#"You are the {} Agent in NEXORA AI.
Available tools:
{}

Based on the objective, subtask, and prior observations, decide if you need to call a tool or if the subtask is finished.
If you need a tool, respond ONLY with a JSON object:
{{
  "call_tool": true,
  "tool_name": "list_dir|read_file|write_file|patch_file|run_command|system_info",
  "arguments": {{ ... }}
}}
If the task is already complete or no tool is needed, respond with:
{{
  "call_tool": false,
  "summary": "What was achieved or discovered"
}}
Return ONLY valid JSON. No conversational text outside JSON."#,
            self.role_name, tools_json
        );

        let user_content = format!(
            "Objective: {}\nCurrent Subtask: {}\nPrior Observations:\n{}",
            objective, subtask_desc, if obs_summary.is_empty() { "None yet" } else { &obs_summary }
        );

        let messages = vec![
            OllamaChatMessage { role: "system".into(), content: system_prompt },
            OllamaChatMessage { role: "user".into(), content: user_content },
        ];

        let response = match self.ollama.chat_complete(model, messages, true).await {
            Ok(r) => r,
            Err(_) => return Ok(None),
        };

        if let Ok(val) = serde_json::from_str::<Value>(&response) {
            if val["call_tool"].as_bool().unwrap_or(false) {
                if let Some(tool_name) = val["tool_name"].as_str() {
                    let arguments = val["arguments"].clone();
                    let requires_approval = tool_name == "run_command";
                    return Ok(Some(ToolCallRequest {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: tool_name.to_string(),
                        arguments,
                        requires_approval,
                    }));
                }
            }
        }

        Ok(None)
    }
}
