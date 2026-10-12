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
    #[serde(default)]
    pub is_ephemeral: Option<bool>,
    #[serde(default)]
    pub rating: Option<String>,
    #[serde(default)]
    pub feedback_notes: Option<String>,
    #[serde(default)]
    pub result: Option<String>,
    #[serde(default)]
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub is_ephemeral: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    #[serde(default)]
    pub task_id: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub metadata: Option<String>,
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
    VariationWorker,
    Research,
    Coding,
    ToolExecution,
    Tester,
    Reviewer,
    Evaluation,
    Diagnostic,
    Memory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisorHint {
    pub id: String,
    pub task_id: String,
    pub hint: String,
    pub strategy: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariationCandidate {
    pub id: String,
    pub task_id: String,
    pub parent_candidate_id: Option<String>,
    pub iteration: u32,
    pub hypothesis: String,
    pub subtasks: Vec<Subtask>,
    pub status: String, // "created", "executing", "evaluated", "accepted", "stagnated"
    pub score: Option<f32>,
    pub created_at: DateTime<Utc>,
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
    #[serde(default)]
    pub similarity_score: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledJob {
    pub id: String,
    pub name: String,
    pub cron_expression: String,
    pub prompt: String,
    pub enabled: bool,
    pub last_run_at: Option<DateTime<Utc>>,
    pub next_run_at: Option<DateTime<Utc>>,
    pub last_status: Option<String>,
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
    SupervisorIntervention(SupervisorHint),
    AvoStepProgress {
        task_id: String,
        step_number: u32,
        step_name: String,
        iteration: u32,
        description: String,
    },
    VariationCandidateCreated(VariationCandidate),
    ToolCallRequested(ToolCallRequest),
    ApprovalRequired(ToolCallRequest),
    ToolCallStarted { call_id: String, tool_name: String },
    ToolCallCompleted(ToolExecutionResult),
    CandidateEvaluated(EvaluationResult),
    DiagnosticGenerated(DiagnosticResult),
    MemoryUpdated(MemoryItem),
    LineageCommitted { task_id: String, nodes_count: usize, rels_count: usize },
    TaskCompleted { task_id: String, final_summary: String },
    TaskFailed { task_id: String, reason: String },
    TaskCancelled { task_id: String },
    TaskRated { task_id: String, rating: String, notes: Option<String> },
    StreamToken { task_id: String, token: String },
    ChatMessageAdded(ChatMessage),
    JobExecuted { job_id: String, job_name: String, status: String, message: String },
    LessonLearned(VerifiedLesson),
    RollbackExecuted { task_id: String, checkpoint_id: String, target_path: String, reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiedLesson {
    pub id: String,
    pub error_signature: String,
    pub root_cause: String,
    pub failed_approach: String,
    pub verified_solution: String,
    pub domain: String,
    pub prevented_count: u32,
    pub confidence_score: f32,
    pub created_at: DateTime<Utc>,
    pub last_applied_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackCheckpoint {
    pub id: String,
    pub task_id: String,
    pub target_path: String,
    pub content_backup: String,
    pub created_at: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfLearningMetrics {
    pub total_mistakes_detected: u32,
    pub total_verified_corrections: u32,
    pub total_rollbacks_executed: u32,
    pub recurring_errors_prevented: u32,
    pub correction_accuracy_rate: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictiveIssue {
    pub id: String,
    pub title: String,
    pub category: String, // "dependency", "deadline", "bottleneck", "failure_risk"
    pub severity: String, // "critical", "warning", "info"
    pub affected_component: String,
    pub predicted_impact: String,
    pub suggested_action: String,
    pub auto_fixable: bool,
    pub detected_at: DateTime<Utc>,
    pub status: String, // "active", "resolved", "dismissed"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictiveScanSummary {
    pub total_issues: usize,
    pub critical_count: usize,
    pub warning_count: usize,
    pub health_score: f32, // 0.0 - 100.0
    pub bottleneck_risk: String,
    pub issues: Vec<PredictiveIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub title: String,
    pub integration: String, // "git", "terminal", "email", "notes", "calendar", "social"
    pub action: String,
    pub parameters: serde_json::Value,
    pub on_failure: String, // "retry", "fallback", "abort"
    pub require_approval: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutableWorkflow {
    pub id: String,
    pub name: String,
    pub natural_instruction: String,
    pub trigger_type: String, // "schedule", "file_change", "webhook", "social_event", "manual"
    pub trigger_config: String,
    pub conditions: Vec<String>,
    pub steps: Vec<WorkflowStep>,
    pub require_approval: bool,
    pub enabled: bool,
    pub last_run_at: Option<DateTime<Utc>>,
    pub status: String, // "idle", "running", "success", "failed"
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SweTestResult {
    pub passed: bool,
    pub total_tests: usize,
    pub passed_tests: usize,
    pub failed_tests: usize,
    pub output: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutonomousSweRun {
    pub id: String,
    pub repository_path: String,
    pub task_type: String, // "feature", "bugfix", "refactor", "audit"
    pub objective: String,
    pub branch_name: String,
    pub status: String, // "indexing", "implementing", "testing", "reviewing", "pr_ready", "completed", "failed"
    pub files_changed: Vec<String>,
    pub test_results: Option<SweTestResult>,
    pub pr_title: String,
    pub pr_summary: String,
    pub diff_preview: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeEntity {
    pub id: String,
    pub name: String,
    pub entity_type: String, // "memory", "conversation", "file", "project", "decision"
    pub summary: String,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeRelation {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String, // "influenced", "created_by", "depends_on", "resolved_in", "modifies", "referenced_by"
    pub confidence: f32,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphDiscoveryResult {
    pub nodes: Vec<KnowledgeEntity>,
    pub edges: Vec<KnowledgeRelation>,
    pub insight: String,
    pub path_hops: usize,
}

