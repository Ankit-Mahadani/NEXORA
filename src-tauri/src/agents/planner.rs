use crate::models::{Subtask, TaskStatus};
use crate::ollama::{OllamaClient, OllamaChatMessage};

pub struct PlannerAgent {
    ollama: OllamaClient,
}

impl PlannerAgent {
    pub fn new(ollama: OllamaClient) -> Self {
        Self { ollama }
    }

    pub async fn create_plan(&self, model: &str, task_id: &str, objective: &str) -> Result<Vec<Subtask>, String> {
        self.create_variation_plan(model, task_id, objective, "", None, 0).await
    }

    /// Flowchart Step: "2. Plan Next Variation"
    pub async fn create_variation_plan(
        &self,
        model: &str,
        task_id: &str,
        objective: &str,
        supervisor_hint: &str,
        repair_hint: Option<&str>,
        iteration: u32,
    ) -> Result<Vec<Subtask>, String> {
        let mut context_addendum = String::new();
        if !supervisor_hint.is_empty() {
            context_addendum.push_str(&format!("\nSupervisor Hint Guidance: {}", supervisor_hint));
        }
        if let Some(repair) = repair_hint {
            context_addendum.push_str(&format!("\nDiagnosed Failure Repair Patch (Iteration {}): {}", iteration, repair));
        }

        let system_prompt = format!(
            r#"You are the Planner Agent for NEXORA in the NVIDIA AVO (Agentic Variation & Optimization) architecture.
Analyze the user's objective and formulate the next variation plan (Iteration {}).
Context Guidance:
{}

Common scenarios:
- Create files on Desktop, write text, open/close in Notepad -> assign 'variation_worker' or 'tool_execution'
- System shutdown or restart -> assign 'tool_execution'
- Take screenshots -> assign 'tool_execution'
- Open Chrome, Gmail, Google Classroom, Pinterest, Spotify -> assign 'tool_execution'
- Read files, extract, write answers to Desktop -> assign 'research', then 'coding'

Each subtask must assign one of the following specialist agents:
- 'variation_worker': For implementing and executing candidate operations
- 'coding': For writing answers, editing files, formatting solutions
- 'research': For inspecting downloaded files, extracting questions
- 'tool_execution': For running desktop apps, power commands, screenshots, web launch
- 'evaluation': For verifying results against criteria

Return ONLY a valid JSON array of objects with the following schema:
[
  {{
    "title": "Short title",
    "description": "What to do",
    "assigned_agent": "variation_worker|coding|research|tool_execution|evaluation",
    "expected_output": "Concrete output expected",
    "verification_criteria": "How to verify success"
  }}
]
No markdown fences or commentary outside the JSON array."#,
            iteration,
            if context_addendum.is_empty() { "No special constraints" } else { &context_addendum }
        );

        let user_prompt = format!("Plan variation candidate for: {}{}", objective, context_addendum);

        let messages = vec![
            OllamaChatMessage { role: "system".into(), content: system_prompt },
            OllamaChatMessage { role: "user".into(), content: user_prompt }
        ];

        let response = match self.ollama.chat_complete(model, messages, true).await {
            Ok(res) => res,
            Err(_) => {
                let is_app_or_media = objective.to_lowercase().contains("open")
                    || objective.to_lowercase().contains("play")
                    || objective.to_lowercase().contains("launch")
                    || objective.to_lowercase().contains("start")
                    || objective.to_lowercase().contains("run");

                let agent = if is_app_or_media { "tool_execution" } else { "coding" };

                return Ok(vec![
                    Subtask {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task_id.to_string(),
                        title: "Execute requested objective".into(),
                        description: format!("Execute tools or commands to satisfy: {}", objective),
                        assigned_agent: agent.into(),
                        dependencies: vec![],
                        status: TaskStatus::Pending,
                        order_index: 0,
                        expected_output: "Operation executed successfully".into(),
                        verification_criteria: "Command or tool execution completed".into(),
                    },
                    Subtask {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task_id.to_string(),
                        title: "Verify and evaluate solution".into(),
                        description: "Verify that the operation satisfies the user request".into(),
                        assigned_agent: "evaluation".into(),
                        dependencies: vec![],
                        status: TaskStatus::Pending,
                        order_index: 1,
                        expected_output: "Verification summary".into(),
                        verification_criteria: "Results evaluated".into(),
                    }
                ]);
            }
        };

        let parsed = crate::agents::extract_json(&response).unwrap_or(serde_json::json!([]));

        let mut subtasks = Vec::new();
        if let Some(arr) = parsed.as_array() {
            for (idx, item) in arr.iter().enumerate() {
                subtasks.push(Subtask {
                    id: uuid::Uuid::new_v4().to_string(),
                    task_id: task_id.to_string(),
                    title: item["title"].as_str().unwrap_or("Execute step").to_string(),
                    description: item["description"].as_str().unwrap_or("").to_string(),
                    assigned_agent: item["assigned_agent"].as_str().unwrap_or("tool_execution").to_string(),
                    dependencies: vec![],
                    status: TaskStatus::Pending,
                    order_index: idx,
                    expected_output: item["expected_output"].as_str().unwrap_or("").to_string(),
                    verification_criteria: item["verification_criteria"].as_str().unwrap_or("").to_string(),
                });
            }
        } else if parsed.is_object() {
            if let Some(arr) = parsed.get("subtasks").or_else(|| parsed.get("tasks")).and_then(|v| v.as_array()) {
                for (idx, item) in arr.iter().enumerate() {
                    subtasks.push(Subtask {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task_id.to_string(),
                        title: item["title"].as_str().unwrap_or("Execute step").to_string(),
                        description: item["description"].as_str().unwrap_or("").to_string(),
                        assigned_agent: item["assigned_agent"].as_str().unwrap_or("tool_execution").to_string(),
                        dependencies: vec![],
                        status: TaskStatus::Pending,
                        order_index: idx,
                        expected_output: item["expected_output"].as_str().unwrap_or("").to_string(),
                        verification_criteria: item["verification_criteria"].as_str().unwrap_or("").to_string(),
                    });
                }
            } else if parsed.get("title").is_some() || parsed.get("description").is_some() {
                subtasks.push(Subtask {
                    id: uuid::Uuid::new_v4().to_string(),
                    task_id: task_id.to_string(),
                    title: parsed["title"].as_str().unwrap_or("Execute objective").to_string(),
                    description: parsed["description"].as_str().unwrap_or(objective).to_string(),
                    assigned_agent: parsed["assigned_agent"].as_str().unwrap_or("tool_execution").to_string(),
                    dependencies: vec![],
                    status: TaskStatus::Pending,
                    order_index: 0,
                    expected_output: parsed["expected_output"].as_str().unwrap_or("Finished goal").to_string(),
                    verification_criteria: parsed["verification_criteria"].as_str().unwrap_or("Evidence provided").to_string(),
                });
            }
        }

        if subtasks.is_empty() {
            let is_app_or_media = objective.to_lowercase().contains("open")
                || objective.to_lowercase().contains("play")
                || objective.to_lowercase().contains("launch")
                || objective.to_lowercase().contains("start")
                || objective.to_lowercase().contains("run")
                || objective.to_lowercase().contains("assignment")
                || objective.to_lowercase().contains("handwritten")
                || objective.to_lowercase().contains("classroom");

            let agent = if is_app_or_media { "tool_execution" } else { "coding" };

            subtasks.push(Subtask {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.to_string(),
                title: "Execute objective".into(),
                description: objective.to_string(),
                assigned_agent: agent.into(),
                dependencies: vec![],
                status: TaskStatus::Pending,
                order_index: 0,
                expected_output: "Finished goal".into(),
                verification_criteria: "Evidence provided".into(),
            });
        }

        Ok(subtasks)
    }
}
