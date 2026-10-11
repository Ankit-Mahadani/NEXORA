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
