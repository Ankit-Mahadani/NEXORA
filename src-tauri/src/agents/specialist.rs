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
            r#"You are the {role} Agent in NEXORA, an autonomous local assistant for Ankit.
Host Environment: Windows OS. Terminal commands run in PowerShell.
Available tools:
{tools}

Action Guidelines:
1. Files on Desktop & Downloads:
   - Create/write text files on Desktop: call 'write_file' with path "Desktop/<filename>" and content.
   - Open files in Notepad: call 'desktop_app' with action "open", target "notepad", args "Desktop/<filename>".
   - Close Notepad or apps: call 'desktop_app' with action "close", target "notepad".
   - Inspect downloaded question files: call 'read_file' with path "Downloads/<filename>" or "Desktop/<filename>".
   - Answer/solve questions: analyze the questions, then call 'write_file' with path "Desktop/answers.txt" with detailed answers.
2. System Power & Shutdown:
   - Schedule shutdown: call 'system_control' with action "shutdown", delay_seconds (e.g. 600 for 10 minutes).
   - Cancel shutdown: call 'system_control' with action "cancel_shutdown".
3. Screen Captures:
   - Take full screenshot: call 'take_screenshot' with destination "Desktop/screenshot.png".
4. Web, Mail, Classroom, Pinterest & Apps:
   - Open URLs (Gmail, Classroom, Pinterest): call 'desktop_app' with action "open", target "chrome", args "https://..." or call 'run_command' with: Start-Process chrome "https://...".
   - Open Spotify & play a song: call 'desktop_app' with action "open", target "spotify", args "<song name>" (e.g. "chamak chalo"). This automatically opens Spotify, searches for the song, highlights the top result, and plays the first song.

Decision Format:
If a tool is needed, respond ONLY with a JSON object:
{{
  "call_tool": true,
  "tool_name": "write_file|read_file|list_dir|desktop_app|system_control|take_screenshot|run_command|system_info",
  "arguments": {{ ... }}
}}
If the task is complete or providing direct answer:
{{
  "call_tool": false,
  "summary": "Detailed summary of achievements and findings"
}}
Return ONLY valid JSON. No conversational text outside JSON."#,
            role = self.role_name, tools = tools_json
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

        if let Some(val) = crate::agents::extract_json(&response) {
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
