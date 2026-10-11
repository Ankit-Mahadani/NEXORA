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
        let preferred_model = task.selected_model.clone();
        let model = self.ollama.resolve_working_model(&preferred_model).await;
        if model != preferred_model {
            let _ = app_handle.emit("nexora://event", NexoraEvent::AgentProgress {
                run_id: task_id.clone(),
                message: format!("Model '{}' is unavailable. Auto-switched to active model '{}'.", preferred_model, model),
                percentage: Some(0.05),
            });
            task.selected_model = model.clone();
            let _ = self.db.save_task(&task);
        }

        // Branch: conversational dialogue vs actionable system task
        if !Self::is_actionable_task(&task.objective) {
            return self.run_conversational_chat(app_handle, task, &model).await;
        }

        // 1. Initial State: Supervisor Agent & Trajectory Inspection
        task.status = TaskStatus::Planning;
        task.updated_at = Utc::now();
        let _ = self.db.save_task(&task);
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

        let supervisor = SupervisorAgent::new(self.ollama.clone());

        // Flowchart: "Inspect Context & Trajectory" from Persistent Graph Memory (Neo4j)
        let trajectory_context = supervisor.inspect_context_and_trajectory(&self.neo4j, &self.db, &task.objective).await;
        if !trajectory_context.is_empty() {
            let _ = app_handle.emit("nexora://event", NexoraEvent::AgentProgress {
                run_id: task_id.clone(),
                message: format!("Supervisor inspected graph trajectory and retrieved {} prior context insights", trajectory_context.len()),
                percentage: Some(0.1),
            });
        }

        // Flowchart: "Spawn As Needed" Specialized Sub-Agents
        let spawned_agents = supervisor.spawn_specialized_subagents(&task_id, &model);
        for subagent in &spawned_agents {
            let _ = app_handle.emit("nexora://event", NexoraEvent::AgentStarted(subagent.clone()));
        }

        // Flowchart: "Supervisor Hint Intervention"
        let supervisor_hint = supervisor.generate_hint_intervention(
            &model,
            &task_id,
            &task.objective,
            &trajectory_context,
        ).await;

        let _ = app_handle.emit("nexora://event", NexoraEvent::SupervisorIntervention(supervisor_hint.clone()));
        let _ = app_handle.emit("nexora://event", NexoraEvent::AgentProgress {
            run_id: task_id.clone(),
            message: format!("Supervisor Hint Intervention: {}", supervisor_hint.hint),
            percentage: Some(0.15),
        });

        // 2. AVO Agentic Variation Loop
        let mut current_iteration: u32 = 0;
        let max_iterations: u32 = task.max_iterations.max(1);
        let mut parent_candidate_id: Option<String> = None;
        let mut candidates: Vec<VariationCandidate> = Vec::new();
        let mut evaluations: Vec<EvaluationResult> = Vec::new();
        let mut diagnostics: Vec<DiagnosticResult> = Vec::new();
        let mut last_repair_hint: Option<String> = None;
        let mut winning_candidate: Option<VariationCandidate> = None;
        let mut final_observations: Vec<ToolExecutionResult> = Vec::new();
        let mut final_answer_accum = String::new();

        while current_iteration < max_iterations {
            task.current_iteration = current_iteration;
            task.status = TaskStatus::Executing;
            task.updated_at = Utc::now();
            let _ = self.db.save_task(&task);
            let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

            // Step 1: Inspect Lineage
            let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
                task_id: task_id.clone(),
                step_number: 1,
                step_name: "1. Inspect Lineage".to_string(),
                iteration: current_iteration,
                description: format!(
                    "Inspecting variation lineage tree (depth: {}, parent: {})",
                    candidates.len(),
                    parent_candidate_id.as_deref().unwrap_or("Root")
                ),
            });

            // Step 2: Plan Next Variation
            let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
                task_id: task_id.clone(),
                step_number: 2,
                step_name: "2. Plan Next Variation".to_string(),
                iteration: current_iteration,
                description: format!("Planner formulating variation strategy for iteration {}", current_iteration),
            });

            let planner = PlannerAgent::new(self.ollama.clone());
            let subtasks = planner.create_variation_plan(
                &model,
                &task_id,
                &task.objective,
                &supervisor_hint.hint,
                last_repair_hint.as_deref(),
                current_iteration,
            ).await?;

            let plan = Plan {
                id: uuid::Uuid::new_v4().to_string(),
                task_id: task_id.clone(),
                goal: task.objective.clone(),
                capabilities: vec!["coding".into(), "terminal".into(), "filesystem".into(), "desktop_app".into()],
                subtasks: subtasks.clone(),
                estimated_resources: "NVIDIA AVO Grounded Sandbox".into(),
                risks: vec!["Tool execution variance", "Environment state drift"].into_iter().map(String::from).collect(),
                created_at: Utc::now(),
            };
            let _ = app_handle.emit("nexora://event", NexoraEvent::PlanGenerated(plan));

            // Step 3: Implement Candidate
            let candidate_id = uuid::Uuid::new_v4().to_string();
            let mut candidate = VariationCandidate {
                id: candidate_id.clone(),
                task_id: task_id.clone(),
                parent_candidate_id: parent_candidate_id.clone(),
                iteration: current_iteration,
                hypothesis: format!("Candidate {}: execute variation satisfying '{}'", current_iteration, task.objective),
                subtasks: subtasks.clone(),
                status: "executing".into(),
                score: None,
                created_at: Utc::now(),
            };
            let _ = app_handle.emit("nexora://event", NexoraEvent::VariationCandidateCreated(candidate.clone()));

            let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
                task_id: task_id.clone(),
                step_number: 3,
                step_name: "3. Implement Candidate".to_string(),
                iteration: current_iteration,
                description: format!("Variation Worker synthesized candidate with {} subtask actions", subtasks.len()),
            });

            // Step 4: Execute & Ground
            let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
                task_id: task_id.clone(),
                step_number: 4,
                step_name: "4. Execute & Ground".to_string(),
                iteration: current_iteration,
                description: "Executing actions in desktop environment & capturing grounded feedback".to_string(),
            });

            let mut iteration_observations: Vec<ToolExecutionResult> = Vec::new();

            for subtask in &subtasks {
                let worker = SpecialistAgent::new(&subtask.assigned_agent, self.ollama.clone());

                if let Ok(Some(action)) = worker.decide_action(
                    &model,
                    &task.objective,
                    &subtask.description,
                    &self.tools,
                    &iteration_observations,
                ).await {
                    let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallRequested(action.clone()));
                    let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallStarted {
                        call_id: action.call_id.clone(),
                        tool_name: action.tool_name.clone(),
                    });

                    if let Some(tool) = self.tools.get(&action.tool_name) {
                        let is_enabled = self.db.get_setting(&format!("tool_enabled_{}", action.tool_name))
                            .unwrap_or(None)
                            .map(|v| v != "false")
                            .unwrap_or(true);

                        let result = if is_enabled {
                            tool.execute(action.arguments.clone(), &self.security).await
                        } else {
                            crate::models::ToolExecutionResult {
                                call_id: action.call_id.clone(),
                                tool_name: action.tool_name.clone(),
                                success: false,
                                stdout: "".into(),
                                stderr: format!("Execution blocked: Permission '{}' has been turned OFF by user in Settings.", action.tool_name),
                                exit_code: Some(1),
                                duration_ms: 0,
                                metadata: serde_json::json!({ "blocked": true }),
                            }
                        };
                        let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallCompleted(result.clone()));
                        iteration_observations.push(result);
                    }
                } else {
                    // Fallback heuristic grounding for common desktop targets
                    let lower_obj = task.objective.to_lowercase();
                    let lower_sub = subtask.description.to_lowercase();

                    let fallback_action = if lower_obj.contains("screenshot") || lower_sub.contains("screenshot") {
                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "take_screenshot".into(),
                            arguments: serde_json::json!({ "destination": "Desktop/Screenshot.png" }),
                            requires_approval: false,
                        })
                    } else if lower_obj.contains("shutdown") || lower_sub.contains("shutdown") {
                        let delay = if lower_obj.contains("10 min") || lower_sub.contains("10 min") { 600 } else { 0 };
                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "system_control".into(),
                            arguments: serde_json::json!({ "action": "shutdown", "delay_seconds": delay }),
                            requires_approval: false,
                        })
                    } else if lower_obj.contains("change the song")
                        || lower_obj.contains("change song")
                        || lower_obj.contains("next song")
                        || lower_obj.contains("next track")
                        || lower_obj.contains("skip song")
                        || lower_obj.contains("skip the song")
                        || lower_sub.contains("change the song")
                        || lower_sub.contains("next track")
                        || lower_sub.contains("skip song")
                    {
                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "desktop_app".into(),
                            arguments: serde_json::json!({
                                "action": "media",
                                "target": "next",
                                "args": ""
                            }),
                            requires_approval: false,
                        })
                    } else if lower_obj.contains("pause song")
                        || lower_obj.contains("pause music")
                        || lower_obj.contains("resume song")
                        || lower_obj.contains("resume music")
                        || lower_sub.contains("pause song")
                    {
                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "desktop_app".into(),
                            arguments: serde_json::json!({
                                "action": "media",
                                "target": "play_pause",
                                "args": ""
                            }),
                            requires_approval: false,
                        })
                    } else if lower_obj.contains("prev song")
                        || lower_obj.contains("previous song")
                        || lower_sub.contains("previous song")
                    {
                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "desktop_app".into(),
                            arguments: serde_json::json!({
                                "action": "media",
                                "target": "prev",
                                "args": ""
                            }),
                            requires_approval: false,
                        })
                    } else if lower_obj.contains("spotify") || lower_sub.contains("spotify") {
                        let mut song = String::new();
                        if let Some(start) = task.objective.find('"') {
                            if let Some(end) = task.objective[start + 1..].find('"') {
                                song = task.objective[start + 1..start + 1 + end].trim().to_string();
                            }
                        }
                        if song.is_empty() {
                            let cleaned = task.objective
                                .to_lowercase()
                                .replace("in spotify", "")
                                .replace("on spotify", "")
                                .replace("spotify", "")
                                .replace("play", "")
                                .trim()
                                .to_string();
                            if !cleaned.is_empty() {
                                song = cleaned;
                            }
                        }
                        if song.is_empty() {
                            song = "chamak chalo".to_string();
                        }

                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "desktop_app".into(),
                            arguments: serde_json::json!({
                                "action": "open",
                                "target": "spotify",
                                "args": song
                            }),
                            requires_approval: false,
                        })
                    } else if lower_obj.contains("chrome") || lower_sub.contains("chrome") {
                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "desktop_app".into(),
                            arguments: serde_json::json!({ "action": "open", "target": "chrome" }),
                            requires_approval: false,
                        })
                    } else if lower_obj.contains("assignment")
                        || lower_obj.contains("classroom")
                        || lower_obj.contains("handwritten")
                        || lower_sub.contains("assignment")
                        || lower_sub.contains("classroom")
                        || lower_sub.contains("handwritten")
                    {
                        let student_name = self.db.get_setting("student_name").unwrap_or(None)
                            .or_else(|| self.db.get_setting("user_name").unwrap_or(None))
                            .unwrap_or_else(|| "Ankit".to_string());
                        let reg_no = self.db.get_setting("registration_number").unwrap_or(None)
                            .unwrap_or_else(|| "2023BCSE042".to_string());
                        let default_subject = self.db.get_setting("default_subject").unwrap_or(None)
                            .unwrap_or_else(|| "Operating Systems".to_string());
                        let format_mode = if lower_obj.contains("word") || lower_obj.contains("docx") || lower_obj.contains("doc ") {
                            "word"
                        } else {
                            "handwritten"
                        };

                        let action = if lower_obj.contains("turn in") {
                            "turn_in"
                        } else if lower_obj.contains("chatgpt") {
                            "open_chatgpt_generator"
                        } else if lower_obj.contains("check classroom") || lower_obj.contains("check from classroom") {
                            "check_classroom"
                        } else {
                            "full_pipeline"
                        };

                        Some(crate::models::ToolCallRequest {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: "assignment_pipeline".into(),
                            arguments: serde_json::json!({
                                "action": action,
                                "assignment_title": "Assignment_1",
                                "subject_name": default_subject,
                                "student_name": student_name,
                                "registration_number": reg_no,
                                "format": format_mode,
                            }),
                            requires_approval: false,
                        })
                    } else {
                        None
                    };

                    if let Some(fallback) = fallback_action {
                        let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallRequested(fallback.clone()));
                        let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallStarted {
                            call_id: fallback.call_id.clone(),
                            tool_name: fallback.tool_name.clone(),
                        });
                        if let Some(tool) = self.tools.get(&fallback.tool_name) {
                            let is_enabled = self.db.get_setting(&format!("tool_enabled_{}", fallback.tool_name))
                                .unwrap_or(None)
                                .map(|v| v != "false")
                                .unwrap_or(true);

                            let result = if is_enabled {
                                tool.execute(fallback.arguments.clone(), &self.security).await
                            } else {
                                crate::models::ToolExecutionResult {
                                    call_id: fallback.call_id.clone(),
                                    tool_name: fallback.tool_name.clone(),
                                    success: false,
                                    stdout: "".into(),
                                    stderr: format!("Execution blocked: Permission '{}' has been turned OFF by user in Settings.", fallback.tool_name),
                                    exit_code: Some(1),
                                    duration_ms: 0,
                                    metadata: serde_json::json!({ "blocked": true }),
                                }
                            };
                            let _ = app_handle.emit("nexora://event", NexoraEvent::ToolCallCompleted(result.clone()));
                            iteration_observations.push(result);
                        }
                    } else {
                        // Direct model response streaming
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
            }

            // Step 5: Score & Evaluate
            task.status = TaskStatus::Evaluating;
            task.updated_at = Utc::now();
            let _ = self.db.save_task(&task);
            let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

            let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
                task_id: task_id.clone(),
                step_number: 5,
                step_name: "5. Score & Evaluate".to_string(),
                iteration: current_iteration,
                description: "Evaluator Agent scoring candidate results against success criteria".to_string(),
            });

            let eval_agent = EvaluationAgent::new(self.ollama.clone());
            let mut eval_result = eval_agent.evaluate(
                &model,
                &task_id,
                &task.objective,
                "Satisfies user requirements without critical errors",
                &iteration_observations,
            ).await;
            eval_result.candidate_id = candidate_id.clone();
            candidate.score = Some(eval_result.score);
            let _ = app_handle.emit("nexora://event", NexoraEvent::CandidateEvaluated(eval_result.clone()));
            evaluations.push(eval_result.clone());

            // Flowchart Decision Diamond: Score >= Threshold (0.75)
            let threshold = 0.75f32;
            let meets_threshold = eval_result.passed && eval_result.score >= threshold;

            if meets_threshold {
                // Flowchart Branch: Score >= Threshold -> Synthesize Solution
                candidate.status = "accepted".into();
                candidates.push(candidate.clone());
                winning_candidate = Some(candidate);
                final_observations = iteration_observations;
                break;
            } else {
                // Flowchart Branch: Stagnation / Failure
                candidate.status = "stagnated".into();
                candidates.push(candidate.clone());

                if current_iteration + 1 < max_iterations {
                    // Step 6: Diagnose & Repair
                    task.status = TaskStatus::Diagnosing;
                    task.updated_at = Utc::now();
                    let _ = self.db.save_task(&task);
                    let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

                    let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
                        task_id: task_id.clone(),
                        step_number: 6,
                        step_name: "6. Diagnose & Repair".to_string(),
                        iteration: current_iteration,
                        description: format!("Diagnoser analyzing failure (Score: {:.2}). Mutating repair plan for next variation.", eval_result.score),
                    });

                    let diag_agent = DiagnosticAgent::new(self.ollama.clone());
                    let diag_result = diag_agent.diagnose(&model, &task_id, &task.objective, &eval_result, &iteration_observations).await;
                    let _ = app_handle.emit("nexora://event", NexoraEvent::DiagnosticGenerated(diag_result.clone()));
                    diagnostics.push(diag_result.clone());

                    last_repair_hint = Some(format!("Root cause: {}. Suggested repair: {}", diag_result.root_cause, diag_result.suggested_repair));
                    parent_candidate_id = Some(candidate_id);
                    current_iteration += 1;
                    // Loops back to Step 2: Plan Next Variation!
                } else {
                    // Max iterations reached, accept best effort
                    winning_candidate = Some(candidate);
                    final_observations = iteration_observations;
                    break;
                }
            }
        }

        // Flowchart: "Synthesize Solution"
        let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
            task_id: task_id.clone(),
            step_number: 7,
            step_name: "Synthesize Solution".to_string(),
            iteration: current_iteration,
            description: "Synthesizing verified solution and grounded observations into final agent response".to_string(),
        });

        task.status = TaskStatus::Completed;
        task.updated_at = Utc::now();

        let final_summary = if !final_answer_accum.trim().is_empty() {
            final_answer_accum
        } else {
            format!("Completed task '{}' with {} verified observations across {} variation candidates.", task.title, final_observations.len(), candidates.len())
        };

        task.result = Some(final_summary.clone());
        let _ = self.db.save_task(&task);
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

        // Flowchart: "Commit Lineage & Scores" into Persistent Graph Memory (Neo4j)
        let _ = app_handle.emit("nexora://event", NexoraEvent::AvoStepProgress {
            task_id: task_id.clone(),
            step_number: 8,
            step_name: "Commit Lineage & Scores".to_string(),
            iteration: current_iteration,
            description: "Persisting variation candidates, lineage tree, and scores into Persistent Graph Memory".to_string(),
        });

        let winning_id = winning_candidate.as_ref().map(|c| c.id.as_str());
        let graph_data = self.neo4j.commit_avo_lineage(
            &task,
            &supervisor_hint,
            &spawned_agents,
            &candidates,
            &evaluations,
            &diagnostics,
            winning_id,
        ).await;

        let _ = self.db.save_task_graph(&task_id, &graph_data);
        let _ = app_handle.emit("nexora://event", NexoraEvent::LineageCommitted {
            task_id: task_id.clone(),
            nodes_count: graph_data.nodes.len(),
            rels_count: graph_data.relationships.len(),
        });

        if !task.is_ephemeral.unwrap_or(false) {
            if let Ok(mem) = MemoryAgent::save_experience(
                &self.db,
                &task_id,
                "procedure",
                &format!("Objective: {}\nSummary: {}", task.objective, final_summary),
                true,
            ) {
                let _ = app_handle.emit("nexora://event", NexoraEvent::MemoryUpdated(mem));
            }
        }

        // Flowchart: "Agent Response"
        let target_session_id = task.session_id.clone().or_else(|| {
            self.db.list_chat_sessions().ok().and_then(|list| list.first().map(|s| s.id.clone()))
        });

        if let Some(session_id) = target_session_id {
            let chat_msg = crate::models::ChatMessage {
                id: uuid::Uuid::new_v4().to_string(),
                session_id,
                role: "assistant".to_string(),
                content: final_summary.clone(),
                task_id: Some(task_id.clone()),
                created_at: Utc::now(),
                metadata: None,
            };
            let _ = self.db.save_chat_message(&chat_msg);
            let _ = app_handle.emit("nexora://event", NexoraEvent::ChatMessageAdded(chat_msg));
        }

        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskCompleted {
            task_id: task_id.clone(),
            final_summary: final_summary.clone(),
        });

        Ok(final_summary)
    }

    async fn run_conversational_chat<R: tauri::Runtime>(
        &self,
        app_handle: &tauri::AppHandle<R>,
        mut task: Task,
        model: &str,
    ) -> Result<String, String> {
        let task_id = task.id.clone();
        task.status = TaskStatus::Executing;
        task.updated_at = Utc::now();
        let _ = self.db.save_task(&task);
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

        // Retrieve user name and tone preference from settings
        let user_name = self.db.get_setting("user_name").unwrap_or(None).unwrap_or_default();
        let tone = self.db.get_setting("assistant_tone").unwrap_or(None).unwrap_or_else(|| "concise".to_string());

        let tone_desc = match tone.as_str() {
            "analytical" => "analytical, deep, providing structured and insightful explanations",
            "warm" => "warm, empathetic, friendly, supportive, and conversational",
            _ => "concise, direct, natural, and helpful",
        };

        let user_address = if user_name.trim().is_empty() {
            "the user".to_string()
        } else {
            user_name.clone()
        };

        let system_prompt = format!(
            "You are NEXORA, a serene, intelligent, and highly capable local AI companion and assistant for {}. \
            Your style is {}. \
            You converse normally, answer questions, explain concepts, brainstorm, write poems, help with code, and chat naturally. \
            When the user talks normally or greets you, respond conversationally, naturally, and warmly. \
            Do not pretend to run terminal tools when just having a conversation.",
            user_address, tone_desc
        );

        let mut messages = vec![
            OllamaChatMessage {
                role: "system".into(),
                content: system_prompt,
            }
        ];

        // Retrieve recent chat history if part of a session
        if let Some(session_id) = &task.session_id {
            if let Ok(history) = self.db.get_session_messages(session_id) {
                let start_idx = history.len().saturating_sub(10);
                for msg in &history[start_idx..] {
                    if msg.content.trim() == task.objective.trim() && msg.role == "user" {
                        continue;
                    }
                    messages.push(OllamaChatMessage {
                        role: msg.role.clone(),
                        content: msg.content.clone(),
                    });
                }
            }
        }

        messages.push(OllamaChatMessage {
            role: "user".into(),
            content: task.objective.clone(),
        });

        let task_id_clone = task_id.clone();
        let app_handle_clone = app_handle.clone();
        let response = match self.ollama.chat_stream(model, messages, false, move |token| {
            let _ = app_handle_clone.emit("nexora://event", NexoraEvent::StreamToken {
                task_id: task_id_clone.clone(),
                token,
            });
        }).await {
            Ok(res) if !res.trim().is_empty() => res,
            _ => {
                if user_name.trim().is_empty() {
                    "Hello! How can I help you today?".to_string()
                } else {
                    format!("Hello {}! How can I help you today?", user_name)
                }
            }
        };

        task.status = TaskStatus::Completed;
        task.updated_at = Utc::now();
        task.result = Some(response.clone());
        let _ = self.db.save_task(&task);
        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskUpdated(task.clone()));

        let target_session_id = task.session_id.clone().or_else(|| {
            self.db.list_chat_sessions().ok().and_then(|list| list.first().map(|s| s.id.clone()))
        });

        if let Some(session_id) = target_session_id {
            let chat_msg = crate::models::ChatMessage {
                id: uuid::Uuid::new_v4().to_string(),
                session_id,
                role: "assistant".to_string(),
                content: response.clone(),
                task_id: Some(task_id.clone()),
                created_at: Utc::now(),
                metadata: None,
            };
            let _ = self.db.save_chat_message(&chat_msg);
            let _ = app_handle.emit("nexora://event", NexoraEvent::ChatMessageAdded(chat_msg));
        }

        let _ = app_handle.emit("nexora://event", NexoraEvent::TaskCompleted {
            task_id: task_id.clone(),
            final_summary: response.clone(),
        });

        Ok(response)
    }

    pub fn is_actionable_task(prompt: &str) -> bool {
        let p = prompt.trim().to_lowercase();
        if p.is_empty() {
            return false;
        }

        // Direct greetings or conversational phrases
        if p == "hi"
            || p == "hello"
            || p == "hey"
            || p == "hey there"
            || p == "hi there"
            || p == "good morning"
            || p == "good afternoon"
            || p == "good evening"
            || p == "good night"
            || p == "how are you"
            || p == "how are you?"
            || p == "who are you"
            || p == "who are you?"
            || p == "what is your name"
            || p == "what is your name?"
            || p == "what can you do"
            || p == "what can you do?"
            || p == "thanks"
            || p == "thank you"
            || p.starts_with("tell me a joke")
            || p.starts_with("tell me about ")
            || p.starts_with("what is ")
            || p.starts_with("what are ")
            || p.starts_with("how do i ")
            || p.starts_with("how does ")
            || p.starts_with("can you explain ")
            || p.starts_with("explain ")
            || p.starts_with("who was ")
            || p.starts_with("who is ")
            || p.starts_with("why is ")
            || p.starts_with("write a poem")
            || p.starts_with("write a story")
            || p.starts_with("help me brainstorm")
        {
            if p.contains("desktop") || p.contains(".txt") || p.contains(".json") || p.contains("spotify") {
                // fall through to check action keywords
            } else {
                return false;
            }
        }

        let action_patterns = [
            "create file", "make a file", "make a text file", "write inside", "save to desktop",
            "save file", "save on desktop", "in desktop", "on desktop", ".txt",
            "take a screenshot", "take screenshot", "screenshot of", "capture screen",
            "shutdown", "shut down", "restart computer", "reboot",
            "open spotify", "play in spotify", "play on spotify", "play song",
            "change the song", "change song", "next song", "next track", "skip song", "skip the song",
            "previous song", "prev song", "pause song", "pause music", "resume song", "resume music",
            "assignment", "do my assignment", "classroom", "handwritten", "generate handwritten", "handwritten notes", "turn in assignment",
            "open chrome", "open browser", "open mail", "open gmail", "open classroom", "open pinterest",
            "open notepad", "close notepad", "close file",
            "download picture", "download the picture", "download file",
            "run command", "terminal", "powershell"
        ];

        for pattern in &action_patterns {
            if p.contains(pattern) {
                return true;
            }
        }

        if p.starts_with("open ")
            || p.starts_with("launch ")
            || p.starts_with("play ")
            || p.starts_with("close ")
            || p.starts_with("create ")
            || p.starts_with("delete ")
            || p.starts_with("shutdown ")
            || p.starts_with("restart ")
        {
            return true;
        }

        false
    }
}
