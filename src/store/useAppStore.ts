import { create } from "zustand";
import {
  Task,
  Plan,
  AgentRun,
  ToolCallRequest,
  ToolExecutionResult,
  EvaluationResult,
  DiagnosticResult,
  MemoryItem,
  SystemMetrics,
} from "../lib/types";

export type ActiveView =
  | "chat"
  | "tasks"
  | "agents"
  | "memory"
  | "models"
  | "monitor"
  | "settings";

interface AppState {
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;

  selectedModel: string;
  setSelectedModel: (model: string) => void;

  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  activeTask: Task | null;
  setActiveTask: (task: Task | null) => void;

  currentPlan: Plan | null;
  setCurrentPlan: (plan: Plan | null) => void;

  agentRuns: AgentRun[];
  addAgentRun: (run: AgentRun) => void;

  toolCalls: ToolCallRequest[];
  addToolCall: (call: ToolCallRequest) => void;

  toolResults: ToolExecutionResult[];
  addToolResult: (res: ToolExecutionResult) => void;

  evaluations: EvaluationResult[];
  addEvaluation: (evalRes: EvaluationResult) => void;

  diagnostics: DiagnosticResult[];
  addDiagnostic: (diag: DiagnosticResult) => void;

  memories: MemoryItem[];
  setMemories: (memories: MemoryItem[]) => void;

  metrics: SystemMetrics | null;
  setMetrics: (metrics: SystemMetrics) => void;

  streamingOutput: string;
  appendStreamToken: (token: string) => void;
  clearStream: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "chat",
  setCurrentView: (view) => set({ currentView: view }),

  selectedModel: "qwen2.5-coder:7b",
  setSelectedModel: (model) => set({ selectedModel: model }),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  activeTask: null,
  setActiveTask: (task) => set({ activeTask: task }),

  currentPlan: null,
  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  agentRuns: [],
  addAgentRun: (run) => set((s) => ({ agentRuns: [...s.agentRuns, run] })),

  toolCalls: [],
  addToolCall: (call) => set((s) => ({ toolCalls: [...s.toolCalls, call] })),

  toolResults: [],
  addToolResult: (res) => set((s) => ({ toolResults: [...s.toolResults, res] })),

  evaluations: [],
  addEvaluation: (evalRes) => set((s) => ({ evaluations: [...s.evaluations, evalRes] })),

  diagnostics: [],
  addDiagnostic: (diag) => set((s) => ({ diagnostics: [...s.diagnostics, diag] })),

  memories: [],
  setMemories: (memories) => set({ memories }),

  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  streamingOutput: "",
  appendStreamToken: (token) => set((s) => ({ streamingOutput: s.streamingOutput + token })),
  clearStream: () => set({ streamingOutput: "" }),
}));
