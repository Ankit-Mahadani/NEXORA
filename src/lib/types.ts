export interface Task {
  id: string;
  title: string;
  objective: string;
  status: 'pending' | 'planning' | 'executing' | 'evaluating' | 'diagnosing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  current_iteration: number;
  max_iterations: number;
  workspace_path: string;
  selected_model: string;
  rating?: string;
  feedback_notes?: string;
  is_ephemeral?: boolean;
  result?: string;
  session_id?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_ephemeral?: boolean;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  task_id?: string;
  created_at: string;
  metadata?: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string;
  assigned_agent: string;
  dependencies: string[];
  status: string;
  order_index: number;
  expected_output: string;
  verification_criteria: string;
}

export interface Plan {
  id: string;
  task_id: string;
  goal: string;
  capabilities: string[];
  subtasks: Subtask[];
  estimated_resources: string;
  risks: string[];
  created_at: string;
}

export interface AgentRun {
  id: string;
  task_id: string;
  subtask_id?: string;
  agent_role: string;
  model_id: string;
  status: string;
  started_at: string;
  ended_at?: string;
  summary?: string;
}

export interface ToolCallRequest {
  call_id: string;
  tool_name: string;
  arguments: any;
  requires_approval: boolean;
}

export interface ToolExecutionResult {
  call_id: string;
  tool_name: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code?: number;
  duration_ms: number;
  metadata: any;
}

export interface EvaluationResult {
  id: string;
  task_id: string;
  candidate_id: string;
  score: number;
  passed: boolean;
  evidence: string[];
  failure_reasons: string[];
  recommended_action: string;
  evaluated_at: string;
}

export interface SupervisorHint {
  id: string;
  task_id: string;
  hint: string;
  strategy: string;
  timestamp: string;
}

export interface VariationCandidate {
  id: string;
  task_id: string;
  parent_candidate_id?: string;
  iteration: number;
  hypothesis: string;
  subtasks: Subtask[];
  status: 'created' | 'executing' | 'evaluated' | 'accepted' | 'stagnated';
  score?: number;
  created_at: string;
}

export interface AvoStepProgress {
  task_id: string;
  step_number: number;
  step_name: string;
  iteration: number;
  description: string;
}

export interface DiagnosticResult {
  id: string;
  task_id: string;
  root_cause: string;
  is_transient: boolean;
  suggested_repair: string;
  replan_recommended: boolean;
}

export interface MemoryItem {
  id: string;
  category: string;
  content: string;
  task_id?: string;
  source: string;
  verified: boolean;
  created_at: string;
  similarity_score?: number;
}

export interface ScheduledJob {
  id: string;
  name: string;
  cron_expression: string;
  prompt: string;
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
  last_status?: string;
  created_at: string;
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_percentage: number;
  disk_free_gb: number;
  disk_total_gb: number;
  os_name: string;
  os_version: string;
  ollama_online: boolean;
  neo4j_online: boolean;
  active_tasks_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  properties: any;
}

export interface GraphRelationship {
  from: string;
  to: string;
  rel_type: string;
  properties: any;
}

export interface GraphData {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  status: string;
}

export interface OllamaModelInfo {
  name: string;
  model?: string;
  size?: number;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export type SocialPlatformId = "whatsapp" | "telegram" | "discord" | "slack" | "instagram";

export type SocialPermissionMode = "read" | "write" | "both";

export interface SocialMessage {
  id: string;
  platform: SocialPlatformId;
  sender: string;
  sender_name?: string;
  content: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  bot_action_taken?: string;
  status?: "delivered" | "read" | "sent" | "blocked";
}

export interface SocialConnector {
  id: SocialPlatformId;
  name: string;
  tagline: string;
  connected: boolean;
  paired_account?: string;
  connected_at?: string;
  last_sync?: string;
  permission_mode: SocialPermissionMode;
  bot_instruction: string;
  auto_reply_enabled: boolean;
  chat_scope: "all" | "dms" | "groups" | "whitelist";
  whitelist_contacts: string[];
  unread_count: number;
  total_messages_read: number;
  total_messages_sent: number;
  recent_messages: SocialMessage[];
  auth_type: "qr" | "bot_token" | "webhook";
  token?: string;
}

export type ProductivityDomain =
  | "documents"
  | "notes"
  | "tasks"
  | "reminders"
  | "email"
  | "calendar";

export interface ProductivityActivity {
  id: string;
  domain: ProductivityDomain;
  action: string;
  title: string;
  detail?: string;
  timestamp: string;
  status: "success" | "pending" | "blocked" | "completed";
}

export interface ProductivityIntegration {
  id: ProductivityDomain;
  name: string;
  tagline: string;
  provider: string;
  connected: boolean;
  connected_account?: string;
  last_sync?: string;
  permission_mode: "read" | "write" | "both";
  require_approval: boolean;
  bot_instruction: string;
  total_items_read: number;
  total_items_created: number;
  recent_activity: ProductivityActivity[];
}

export interface VerifiedLesson {
  id: string;
  error_signature: string;
  root_cause: string;
  failed_approach: string;
  verified_solution: string;
  domain: string;
  prevented_count: number;
  confidence_score: number;
  created_at: string;
  last_applied_at?: string;
}

export interface RollbackCheckpoint {
  id: string;
  task_id: string;
  target_path: string;
  content_backup: string;
  created_at: string;
  status: "active" | "restored" | "discarded";
}

export interface SelfLearningMetrics {
  total_lessons_learned: number;
  total_errors_prevented: number;
  total_rollbacks_executed: number;
  avg_repair_confidence: number;
  active_guardrails_count: number;
}

export interface PredictiveIssue {
  id: string;
  title: string;
  category: "dependency" | "deadline" | "bottleneck" | "failure_risk";
  severity: "critical" | "warning" | "info";
  affected_component: string;
  predicted_impact: string;
  suggested_action: string;
  auto_fixable: boolean;
  detected_at: string;
  status: "active" | "resolved" | "dismissed";
}

export interface PredictiveScanSummary {
  total_issues: number;
  critical_count: number;
  warning_count: number;
  health_score: number;
  bottleneck_risk: string;
  issues: PredictiveIssue[];
}

export interface WorkflowStep {
  id: string;
  title: string;
  integration: "git" | "terminal" | "email" | "notes" | "calendar" | "social";
  action: string;
  parameters: any;
  on_failure: "retry" | "fallback" | "abort";
  require_approval: boolean;
}

export interface ExecutableWorkflow {
  id: string;
  name: string;
  natural_instruction: string;
  trigger_type: "schedule" | "file_change" | "webhook" | "social_event" | "manual";
  trigger_config: string;
  conditions: string[];
  steps: WorkflowStep[];
  require_approval: boolean;
  enabled: boolean;
  last_run_at?: string;
  status: "idle" | "running" | "success" | "failed";
  created_at: string;
}

export interface SweTestResult {
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  output: string;
  duration_ms: number;
}

export interface AutonomousSweRun {
  id: string;
  repository_path: string;
  task_type: "feature" | "bugfix" | "refactor" | "audit";
  objective: string;
  branch_name: string;
  status: "indexing" | "implementing" | "testing" | "reviewing" | "pr_ready" | "completed" | "failed";
  files_changed: string[];
  test_results?: SweTestResult;
  pr_title: string;
  pr_summary: string;
  diff_preview: string;
  created_at: string;
}

export interface KnowledgeEntity {
  id: string;
  name: string;
  entity_type: "memory" | "conversation" | "file" | "project" | "decision";
  summary: string;
  metadata: any;
  created_at: string;
}

export interface KnowledgeRelation {
  source_id: string;
  target_id: string;
  relation_type: "influenced" | "created_by" | "depends_on" | "resolved_in" | "modifies" | "referenced_by";
  confidence: number;
  explanation: string;
}

export interface GraphDiscoveryResult {
  nodes: KnowledgeEntity[];
  edges: KnowledgeRelation[];
  insight: string;
  path_hops: number;
}
