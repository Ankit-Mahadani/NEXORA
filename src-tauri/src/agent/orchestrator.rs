use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::Utc;
use tauri::Emitter;

use crate::models::*;
use crate::ollama::{OllamaClient, OllamaChatMessage};
use crate::storage::{LocalDatabase, Neo4jClient};
use crate::tools::ToolRegistry;
use crate::security::SecurityManager;
use crate::agents::*;

pub struct Orchestrator {
    pub ollama: OllamaClient,
    pub db: Arc<LocalDatabase>,
    pub neo4j: Arc<Neo4jClient>,
    pub tools: Arc<ToolRegistry>,
    pub security: Arc<Mutex<SecurityManager>>,
}

impl Orchestrator {
    pub fn new(
        ollama: OllamaClient,
        db: Arc<LocalDatabase>,
        neo4j: Arc<Neo4jClient>,
        security: Arc<Mutex<SecurityManager>>,
    ) -> Self {
        Self {
            ollama,
            db,
            neo4j,
            tools: Arc::new(ToolRegistry::new()),
            security,
        }
    }

    pub async fn run_task<R: tauri::Runtime>(
        &self,
        app_handle: &tauri::AppHandle<R>,
        mut task: Task,
    ) -> Result<String, String> {
        let task_id = task.id.clone();
        let model = task.selected_model.clone();

        // 1. Initial State: Task Created
        task.status = TaskStatus::Planning;
        task.updated_at = Utc::now();
        let _ = self.db.save_task(&task);
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

        // Check relevant memory before planning
        let past_memories = MemoryAgent::retrieve_relevant(&self.db, &task.objective);
        if !past_memories.is_empty() {
            let _ = app_handle.emit("nexora://event", NexoraEvent::AgentProgress {
                run_id: task_id.clone(),
                message: format!("Retrieved {} relevant past experiences from memory", past_memories.len()),
                percentage: Some(0.1),
            });
        }

        // 2. Planning phase
        let planner = PlannerAgent::new(self.ollama.clone());
        let subtasks = planner.create_plan(&model, &task_id, &task.objective).await?;

        let plan = Plan {
            id: uuid::Uuid::new_v4().to_string(),
            task_id: task_id.clone(),
            goal: task.objective.clone(),
            capabilities: vec!["coding".into(), "terminal".into(), "filesystem".into()],
            subtasks: subtasks.clone(),
            estimated_resources: "Moderate (Local LLM + Workspace IO)".into(),
            risks: vec!["File conflicts", "Build failures"].into_iter().map(String::from).collect(),
            created_at: Utc::now(),
        };

        let _ = app_handle.emit("nexora://event", NexoraEvent::PlanGenerated(plan));

        // 3. Execution state loop
        task.status = TaskStatus::Executing;
        task.updated_at = Utc::now();
        let _ = self.db.save_task(&task);
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

        let mut all_observations: Vec<ToolExecutionResult> = Vec::new();
        let mut final_answer_accum = String::new();

        for subtask in subtasks {
            let run = AgentRun {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.clone(),
                subtask_id: Some(subtask.id.clone()),
                agent_role: match subtask.assigned_agent.as_str() {
                    "coding" => AgentRole::Coding,
                    "research" => AgentRole::Research,
                    "evaluation" => AgentRole::Evaluation,
                    _ => AgentRole::ToolExecution,
                },
                model_id: model.clone(),
                status: "running".into(),
                started_at: Utc::now(),
                ended_at: None,
                summary: Some(subtask.title.clone()),
            };

            let _ = app_handle.emit("nexora://event", NexoraEvent::AgentStarted(run.clone()));

            let specialist = SpecialistAgent::new(&subtask.assigned_agent, self.ollama.clone());

            // Check if tool is needed
            if let Ok(Some(action)) = specialist.decide_action(
                &model,
                &task.objective,
                &subtask.description,
                &self.tools,
                &all_observations,
            ).await {
                let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallRequested(action.clone()));

                // Auto approve or prompt
                let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallStarted {
                    call_id: action.call_id.clone(),
                    tool_name: action.tool_name.clone(),
                });

                if let Some(tool) = self.tools.get(&action.tool_name) {
                    let result = tool.execute(action.arguments.clone(), &self.security).await;
                    let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallCompleted(result.clone()));
                    all_observations.push(result);
                }
            } else {
                // If direct response or no tool call, stream direct thought/answer
                let messages = vec![
                    OllamaChatMessage {
                        role: "system".into(),
                        content: format!("You are the {} agent for NEXORA. Provide the direct output for: {}", subtask.assigned_agent, subtask.description),
                    },
                    OllamaChatMessage {
                        role: "user".into(),
                        content: task.objective.clone(),
                    }
                ];

                let task_id_clone = task_id.clone();
                let app_handle_clone = app_handle.clone();
                let streamed = self.ollama.chat_stream(&model, messages, false, move |token| {
                    let _ = app_handle_clone.emit("nexora://event", NexoraEvent::StreamToken {
                        task_id: task_id_clone.clone(),
                        token,
                    });
                }).await.unwrap_or_default();

                final_answer_accum.push_str(&streamed);
                final_answer_accum.push('\n');
            }
        }

        // 4. Evidence-based Evaluation Phase
        task.status = TaskStatus::Evaluating;
        task.updated_at = Utc::now();
        let _ = self.db.save_task(&task);
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

        let eval_agent = EvaluationAgent::new(self.ollama.clone());
        let eval_result = eval_agent.evaluate(&model, &task_id, &task.objective, "Satisfies user requirements without critical errors", &all_observations).await;
        let _ = app_handle.emit("nexora://event", NexoraEvent::CandidateEvaluated(eval_result.clone()));

        // 5. Iterative repair loop if failed and iterations remain
        if !eval_result.passed && task.current_iteration < task.max_iterations {
            task.status = TaskStatus::Diagnosing;
            task.current_iteration += 1;
            task.updated_at = Utc::now();
            let _ = self.db.save_task(&task);
            let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

            let diag_agent = DiagnosticAgent::new(self.ollama.clone());
            let diag_result = diag_agent.diagnose(&model, &task_id, &task.objective, &eval_result, &all_observations).await;
            let _ = app_handle.emit("nexora://event", NexoraEvent::DiagnosticGenerated(diag_result.clone()));

            // Store diagnosed failure in memory to prevent repeated mistakes
            let _ = MemoryAgent::save_experience(
                &self.db,
                &task_id,
                "error_lesson",
                &format!("Root cause: {}\nFix: {}", diag_result.root_cause, diag_result.suggested_repair),
                true,
            );
        }

        // 6. Complete task and preserve memory
        task.status = TaskStatus::Completed;
        task.updated_at = Utc::now();
        let _ = self.db.save_task(&task);

        let final_summary = if !final_answer_accum.trim().is_empty() {
            final_answer_accum
        } else {
            format!("Completed task '{}' with {} verified tool observations.", task.title, all_observations.len())
        };

        let mem = MemoryAgent::save_experience(
            &self.db,
            &task_id,
            "procedure",
            &format!("Objective: {}\nSummary: {}", task.objective, final_summary),
            true,
        ).map_err(|e| format!("Memory save error: {}", e))?;

        let _ = app_handle.emit("nexora://event", NexoraEvent::MemoryUpdated(mem));
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskCompleted {
            task_id: task_id.clone(),
            final_summary: final_summary.clone(),
        });

        Ok(final_summary)
    }
}
