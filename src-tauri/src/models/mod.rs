use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Planning,
    Executing,
    Evaluating,
    Diagnosing,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub objective: String,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub current_iteration: u32,
    pub max_iterations: u32,
    pub workspace_path: String,
    pub selected_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subtask {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub description: String,
    pub assigned_agent: String,
    pub dependencies: Vec<String>,
    pub status: TaskStatus,
    pub order_index: usize,
    pub expected_output: String,
    pub verification_criteria: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub id: String,
    pub task_id: String,
    pub goal: String,
    pub capabilities: Vec<String>,
    pub subtasks: Vec<Subtask>,
    pub estimated_resources: String,
    pub risks: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentRole {
    Supervisor,
    Planner,
    Research,
    Coding,
    ToolExecution,
    Evaluation,
    Diagnostic,
    Memory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRun {
    pub id: String,
    pub task_id: String,
    pub subtask_id: Option<String>,
    pub agent_role: AgentRole,
    pub model_id: String,
    pub status: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallRequest {
    pub call_id: String,
    pub tool_name: String,
    pub arguments: serde_json::Value,
    pub requires_approval: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolExecutionResult {
    pub call_id: String,
    pub tool_name: String,
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationResult {
    pub id: String,
    pub task_id: String,
    pub candidate_id: String,
    pub score: f32, // 0.0 to 1.0
    pub passed: bool,
    pub evidence: Vec<String>,
    pub failure_reasons: Vec<String>,
    pub recommended_action: String,
    pub evaluated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticResult {
    pub id: String,
    pub task_id: String,
    pub root_cause: String,
    pub is_transient: bool,
    pub suggested_repair: String,
    pub replan_recommended: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryItem {
    pub id: String,
    pub category: String, // fact, procedure, error_lesson, artifact
    pub content: String,
    pub task_id: Option<String>,
    pub source: String,
    pub verified: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage: f32,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub memory_percentage: f32,
    pub disk_free_gb: u64,
    pub disk_total_gb: u64,
    pub os_name: String,
    pub os_version: String,
    pub ollama_online: bool,
    pub neo4j_online: bool,
    pub active_tasks_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum NexoraEvent {
    TaskCreated(Task),
    TaskUpdated(Task),
    PlanGenerated(Plan),
    AgentStarted(AgentRun),
    AgentProgress { run_id: String, message: String, percentage: Option<f32> },
    ToolCallRequested(ToolCallRequest),
    ApprovalRequired(ToolCallRequest),
    ToolCallStarted { call_id: String, tool_name: String },
    ToolCallCompleted(ToolExecutionResult),
    CandidateEvaluated(EvaluationResult),
    DiagnosticGenerated(DiagnosticResult),
    MemoryUpdated(MemoryItem),
    TaskCompleted { task_id: String, final_summary: String },
    TaskFailed { task_id: String, reason: String },
    TaskCancelled { task_id: String },
    StreamToken { task_id: String, token: String },
}
