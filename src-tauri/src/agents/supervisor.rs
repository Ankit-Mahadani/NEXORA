use chrono::Utc;
use crate::models::{SupervisorHint, AgentRun, AgentRole};
use crate::ollama::{OllamaClient, OllamaChatMessage};
use crate::storage::{LocalDatabase, Neo4jClient};

pub struct SupervisorAgent {
    ollama: OllamaClient,
}

impl SupervisorAgent {
    pub fn new(ollama: OllamaClient) -> Self {
        Self { ollama }
    }

    /// Flowchart Step: "Inspect Context & Trajectory" from Persistent Graph Memory (Neo4j)
    pub async fn inspect_context_and_trajectory(
        &self,
        neo4j: &Neo4jClient,
        db: &LocalDatabase,
        task_objective: &str,
    ) -> Vec<String> {
        let mut context_insights = Vec::new();

        // 1. Inspect relevant experiences from local vector/procedural memory
        let memories = crate::agents::MemoryAgent::retrieve_relevant(db, task_objective);
        for m in memories.iter().take(3) {
            context_insights.push(format!("[Prior Experience ({})]: {}", m.category, m.content));
        }

        // 2. Inspect graph trajectory from Persistent Graph Memory (Neo4j)
        let graph = neo4j.get_task_graph("current").await;
        for node in &graph.nodes {
            if node.label == "VariationCandidate" || node.label == "EvaluationsAndScores" {
                if let Some(hyp) = node.properties.get("hypothesis").and_then(|h| h.as_str()) {
                    context_insights.push(format!("[Graph Trajectory Candidate]: {}", hyp));
                }
            }
        }

        context_insights
    }

    /// Flowchart Step: "Supervisor Hint Intervention"
    pub async fn generate_hint_intervention(
        &self,
        model: &str,
        task_id: &str,
        task_objective: &str,
        trajectory_context: &[String],
    ) -> SupervisorHint {
        let context_str = if trajectory_context.is_empty() {
            "None recorded yet (first execution trajectory)".to_string()
        } else {
            trajectory_context.join("\n")
        };

        let system_prompt = r#"You are the Supervisor Agent in NEXORA's NVIDIA AVO (Agentic Variation & Optimization) architecture.
Your duty is to oversee the AVO loop, inspect prior trajectories, and issue a guiding Hint Intervention for the Specialized Sub-Agents:
- Planner Agent
- Variation Worker
- Evaluator Agent
- Diagnoser & Repair

Guidelines:
1. Desktop Apps (Chrome, Spotify, Notepad, etc.): Suggest desktop_app tool or PowerShell Start-Process.
2. File paths: Prefer Desktop path ("Desktop/<filename>") or Downloads.
3. System commands (shutdown, sleep): Guide to system_control or run_command.
4. Keep the hint precise, actionable, and architectural.

Return ONLY a valid JSON object:
{
  "hint": "Actionable supervisory guidance for subagents",
  "strategy": "direct_execution|iterative_variation|grounded_tool_search"
}"#;

        let user_prompt = format!(
            "Task Objective: {}\nTraversed Context & History:\n{}",
            task_objective, context_str
        );

        let messages = vec![
            OllamaChatMessage { role: "system".into(), content: system_prompt.into() },
            OllamaChatMessage { role: "user".into(), content: user_prompt },
        ];

        let mut hint_text = format!("Supervisor guidance: execute grounded variation steps targeting '{}'", task_objective);
        let mut strategy = "iterative_variation".to_string();

        if let Ok(res) = self.ollama.chat_complete(model, messages, true).await {
            if let Some(val) = crate::agents::extract_json(&res) {
                if let Some(h) = val["hint"].as_str() {
                    hint_text = h.to_string();
                }
                if let Some(s) = val["strategy"].as_str() {
                    strategy = s.to_string();
                }
            }
        }

        SupervisorHint {
            id: uuid::Uuid::new_v4().to_string(),
            task_id: task_id.to_string(),
            hint: hint_text,
            strategy,
            timestamp: Utc::now(),
        }
    }

    /// Flowchart Step: "Spawn As Needed" Specialized Sub-Agents
    pub fn spawn_specialized_subagents(&self, task_id: &str, model: &str) -> Vec<AgentRun> {
        let now = Utc::now();
        vec![
            AgentRun {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.to_string(),
                subtask_id: None,
                agent_role: AgentRole::Supervisor,
                model_id: model.to_string(),
                status: "active".into(),
                started_at: now,
                ended_at: None,
                summary: Some("Supervisor Agent: oversees trajectory & intervenes with hints".into()),
            },
            AgentRun {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.to_string(),
                subtask_id: None,
                agent_role: AgentRole::Planner,
                model_id: model.to_string(),
                status: "ready".into(),
                started_at: now,
                ended_at: None,
                summary: Some("Planner Agent: plans variation strategies from lineage".into()),
            },
            AgentRun {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.to_string(),
                subtask_id: None,
                agent_role: AgentRole::VariationWorker,
                model_id: model.to_string(),
                status: "ready".into(),
                started_at: now,
                ended_at: None,
                summary: Some("Variation Worker: implements candidate actions & tool executions".into()),
            },
            AgentRun {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.to_string(),
                subtask_id: None,
                agent_role: AgentRole::Evaluation,
                model_id: model.to_string(),
                status: "ready".into(),
                started_at: now,
                ended_at: None,
                summary: Some("Evaluator Agent: scores candidates against quality thresholds".into()),
            },
            AgentRun {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.to_string(),
                subtask_id: None,
                agent_role: AgentRole::Diagnostic,
                model_id: model.to_string(),
                status: "ready".into(),
                started_at: now,
                ended_at: None,
                summary: Some("Diagnoser & Repair Agent: diagnoses failures & repairs variations".into()),
            },
        ]
    }
}
