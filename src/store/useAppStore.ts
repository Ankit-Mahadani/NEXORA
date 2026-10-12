import { create } from "zustand";
import { safeInvoke } from "../lib/ipc";
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
  ChatSession,
  ChatMessage,
  SupervisorHint,
  VariationCandidate,
  AvoStepProgress,
} from "../lib/types";

export type ActiveView =
  | "chat"
  | "tasks"
  | "agents"
  | "predictive"
  | "workflows"
  | "swe"
  | "graph"
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

  supervisorHint: SupervisorHint | null;
  setSupervisorHint: (hint: SupervisorHint | null) => void;

  activeAvoStep: AvoStepProgress | null;
  setActiveAvoStep: (step: AvoStepProgress | null) => void;

  variationCandidates: VariationCandidate[];
  addVariationCandidate: (cand: VariationCandidate) => void;
  clearAvoState: () => void;

  memories: MemoryItem[];
  setMemories: (memories: MemoryItem[]) => void;

  metrics: SystemMetrics | null;
  setMetrics: (metrics: SystemMetrics) => void;

  streamingOutput: string;
  appendStreamToken: (token: string) => void;
  clearStream: () => void;

  isTemporaryChat: boolean;
  setTemporaryChat: (val: boolean) => void;

  userName: string;
  setUserName: (name: string) => void;

  onboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => void;

  selectedMicrophone: string;
  setSelectedMicrophone: (mic: string) => void;

  selectedSpeaker: string;
  setSelectedSpeaker: (speaker: string) => void;

  sessions: ChatSession[];
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  removeSession: (id: string) => void;

  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;

  sessionMessages: Record<string, ChatMessage[]>;
  setSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;
  addSessionMessage: (message: ChatMessage) => void;

  inputHistory: string[];
  addInputHistory: (text: string) => void;

  registrationNumber: string;
  setRegistrationNumber: (reg: string) => void;

  defaultSubject: string;
  setDefaultSubject: (subject: string) => void;

  assignmentFormat: "handwritten" | "word";
  setAssignmentFormat: (fmt: "handwritten" | "word") => void;

  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;

  hydrateFromStorage: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "chat",
  setCurrentView: (view) => set({ currentView: view }),

  selectedModel: "qwen2.5-coder:7b",
  setSelectedModel: (model) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_selected_model", model); } catch (_) {}
    }
    safeInvoke("set_setting", { key: "selected_model", value: model }).catch(() => {});
    set({ selectedModel: model });
  },

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  activeTask: null,
  setActiveTask: (task) => {
    if (task) {
      if (!task.is_ephemeral && typeof window !== "undefined") {
        try {
          localStorage.setItem("nexora_last_active_task_id", task.id);
        } catch (_) {}
      }
    } else {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("nexora_last_active_task_id");
        } catch (_) {}
      }
    }
    set({ activeTask: task });
  },

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

  supervisorHint: null,
  setSupervisorHint: (supervisorHint) => set({ supervisorHint }),

  activeAvoStep: null,
  setActiveAvoStep: (activeAvoStep) => set({ activeAvoStep }),

  variationCandidates: [],
  addVariationCandidate: (cand) => set((s) => ({ variationCandidates: [...s.variationCandidates, cand] })),
  clearAvoState: () => set({ supervisorHint: null, activeAvoStep: null, variationCandidates: [] }),

  memories: [],
  setMemories: (memories) => set({ memories }),

  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  streamingOutput: "",
  appendStreamToken: (token) => set((s) => ({ streamingOutput: s.streamingOutput + token })),
  clearStream: () => set({ streamingOutput: "" }),

  isTemporaryChat: false,
  setTemporaryChat: (val) => set({ isTemporaryChat: val }),

  userName: "",
  setUserName: (name) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_user_name", name); } catch (_) {}
    }
    set({ userName: name });
  },

  onboardingCompleted: true,
  setOnboardingCompleted: (val) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_onboarding_completed", val ? "true" : "false"); } catch (_) {}
    }
    set({ onboardingCompleted: val });
  },

  selectedMicrophone: "default",
  setSelectedMicrophone: (mic) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_selected_microphone", mic); } catch (_) {}
    }
    safeInvoke("set_setting", { key: "selected_microphone", value: mic }).catch(() => {});
    set({ selectedMicrophone: mic });
  },

  selectedSpeaker: "default",
  setSelectedSpeaker: (speaker) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_selected_speaker", speaker); } catch (_) {}
    }
    safeInvoke("set_setting", { key: "selected_speaker", value: speaker }).catch(() => {});
    set({ selectedSpeaker: speaker });
  },

  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions.filter(x => x.id !== session.id)] })),
  removeSession: (id) => set((s) => ({
    sessions: s.sessions.filter(x => x.id !== id),
    currentSessionId: s.currentSessionId === id ? null : s.currentSessionId,
  })),

  currentSessionId: null,
  setCurrentSessionId: (id) => {
    if (typeof window !== "undefined") {
      try {
        if (id) {
          localStorage.setItem("nexora_current_session_id", id);
        } else {
          localStorage.removeItem("nexora_current_session_id");
        }
      } catch (_) {}
    }
    set({ currentSessionId: id, streamingOutput: "" });
  },

  sessionMessages: {},
  setSessionMessages: (sessionId, messages) => set((s) => ({
    sessionMessages: { ...s.sessionMessages, [sessionId]: messages }
  })),
  addSessionMessage: (message) => set((s) => {
    const existing = s.sessionMessages[message.session_id] || [];
    if (existing.some(m => m.id === message.id)) {
      return s;
    }
    return {
      sessionMessages: {
        ...s.sessionMessages,
        [message.session_id]: [...existing, message]
      }
    };
  }),

  inputHistory: [],
  addInputHistory: (text) => set((s) => {
    if (!text || !text.trim()) return s;
    const trimmed = text.trim();
    const updated = [trimmed, ...s.inputHistory.filter(x => x !== trimmed)].slice(0, 100);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_input_history", JSON.stringify(updated)); } catch (_) {}
    }
    return { inputHistory: updated };
  }),

  registrationNumber: "2023BCSE042",
  setRegistrationNumber: (reg) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_reg_number", reg); } catch (_) {}
    }
    safeInvoke("set_setting", { key: "registration_number", value: reg }).catch(() => {});
    set({ registrationNumber: reg });
  },

  defaultSubject: "Operating Systems",
  setDefaultSubject: (subject) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_default_subject", subject); } catch (_) {}
    }
    safeInvoke("set_setting", { key: "default_subject", value: subject }).catch(() => {});
    set({ defaultSubject: subject });
  },

  assignmentFormat: "handwritten",
  setAssignmentFormat: (fmt) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("nexora_assignment_format", fmt); } catch (_) {}
    }
    safeInvoke("set_setting", { key: "assignment_format", value: fmt }).catch(() => {});
    set({ assignmentFormat: fmt });
  },

  theme: "light",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nexora_theme", theme);
      } catch (_) {}
      if (typeof document !== "undefined") {
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        }
      }
    }
    safeInvoke("set_setting", { key: "theme", value: theme }).catch(() => {});
    set({ theme });
  },

  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const savedModel = localStorage.getItem("nexora_selected_model");
      const savedName = localStorage.getItem("nexora_user_name");
      const savedOnboarding = localStorage.getItem("nexora_onboarding_completed");
      const savedMic = localStorage.getItem("nexora_selected_microphone");
      const savedSpeaker = localStorage.getItem("nexora_selected_speaker");
      const savedSessionId = localStorage.getItem("nexora_current_session_id");
      const savedHistory = localStorage.getItem("nexora_input_history");
      const savedReg = localStorage.getItem("nexora_reg_number");
      const savedSubject = localStorage.getItem("nexora_default_subject");
      const savedFmt = localStorage.getItem("nexora_assignment_format") as "handwritten" | "word" | null;
      const savedTheme = localStorage.getItem("nexora_theme") as "light" | "dark" | null;
      const activeTheme = savedTheme === "dark" ? "dark" : "light";

      if (typeof document !== "undefined") {
        if (activeTheme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        }
      }

      set({
        ...(savedModel ? { selectedModel: savedModel } : {}),
        ...(savedName ? { userName: savedName } : {}),
        onboardingCompleted: savedOnboarding ? savedOnboarding === "true" : false,
        ...(savedMic ? { selectedMicrophone: savedMic } : {}),
        ...(savedSpeaker ? { selectedSpeaker: savedSpeaker } : {}),
        ...(savedSessionId ? { currentSessionId: savedSessionId } : {}),
        ...(savedHistory ? { inputHistory: JSON.parse(savedHistory) } : {}),
        ...(savedReg ? { registrationNumber: savedReg } : {}),
        ...(savedSubject ? { defaultSubject: savedSubject } : {}),
        ...(savedFmt ? { assignmentFormat: savedFmt } : {}),
        theme: activeTheme,
      });
    } catch (_) {}
  },
}));
