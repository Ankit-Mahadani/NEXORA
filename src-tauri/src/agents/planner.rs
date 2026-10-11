use serde_json::Value;
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
        let system_prompt = r#"You are the Planner Agent for NEXORA AI.
Analyze the user's objective and break it down into an ordered series of clear subtasks.
Each subtask must assign one of the following specialist agents:
- 'coding': For creating files, editing code, running builds, debugging
- 'research': For analyzing local files, extracting information
- 'tool_execution': For running specific terminal or system commands
- 'evaluation': For verifying results against criteria

Return ONLY a valid JSON array of objects with the following schema:
[
  {
    "title": "Short title",
    "description": "What to do",
    "assigned_agent": "coding|research|tool_execution|evaluation",
    "expected_output": "Concrete output expected",
    "verification_criteria": "How to verify success"
  }
]
No markdown fences or commentary outside the JSON array."#;

        let messages = vec![
            OllamaChatMessage { role: "system".into(), content: system_prompt.into() },
            OllamaChatMessage { role: "user".into(), content: format!("Create an execution plan for: {}", objective) }
        ];

        let response = match self.ollama.chat_complete(model, messages, true).await {
            Ok(res) => res,
            Err(_) => {
                // Resilient fallback plan if LLM is momentarily unresponsive
                return Ok(vec![
                    Subtask {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task_id.to_string(),
                        title: "Analyze workspace and requirements".into(),
                        description: format!("Inspect current project structure and understand {}", objective),
                        assigned_agent: "research".into(),
                        dependencies: vec![],
                        status: TaskStatus::Pending,
                        order_index: 0,
                        expected_output: "Project structure analysis".into(),
                        verification_criteria: "Files inspected".into(),
                    },
                    Subtask {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task_id.to_string(),
                        title: "Implement requested objective".into(),
                        description: format!("Execute tools and code changes to satisfy: {}", objective),
                        assigned_agent: "coding".into(),
                        dependencies: vec![],
                        status: TaskStatus::Pending,
                        order_index: 1,
                        expected_output: "Changes implemented".into(),
                        verification_criteria: "Files written or commands succeeded".into(),
                    },
                    Subtask {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task_id.to_string(),
                        title: "Verify and evaluate solution".into(),
                        description: "Verify that the implementation satisfies the requirements".into(),
                        assigned_agent: "evaluation".into(),
                        dependencies: vec![],
                        status: TaskStatus::Pending,
                        order_index: 2,
                        expected_output: "Verification report".into(),
                        verification_criteria: "All checks passed".into(),
                    }
                ]);
            }
        };

        let parsed: Value = serde_json::from_str(&response)
            .or_else(|_| {
                // If model wrapped array inside an object e.g. {"subtasks": [...]}
                if let Ok(val) = serde_json::from_str::<Value>(&response) {
                    if let Some(arr) = val.get("subtasks").or_else(|| val.get("tasks")) {
                        return Ok(arr.clone());
                    }
                }
                Err("Failed to parse plan json")
            })
            .unwrap_or(serde_json::json!([]));

        let mut subtasks = Vec::new();
        if let Some(arr) = parsed.as_array() {
            for (idx, item) in arr.iter().enumerate() {
                subtasks.push(Subtask {
                    id: uuid::Uuid::new_v4().to_string(),
                    task_id: task_id.to_string(),
                    title: item["title"].as_str().unwrap_or("Execute step").to_string(),
                    description: item["description"].as_str().unwrap_or("").to_string(),
                    assigned_agent: item["assigned_agent"].as_str().unwrap_or("coding").to_string(),
                    dependencies: vec![],
                    status: TaskStatus::Pending,
                    order_index: idx,
                    expected_output: item["expected_output"].as_str().unwrap_or("").to_string(),
                    verification_criteria: item["verification_criteria"].as_str().unwrap_or("").to_string(),
                });
            }
        }

        if subtasks.is_empty() {
            subtasks.push(Subtask {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.to_string(),
                title: "Execute objective".into(),
                description: objective.to_string(),
                assigned_agent: "coding".into(),
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
