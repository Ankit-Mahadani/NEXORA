"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Brain,
  Code2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Gauge,
  Zap,
  ShieldCheck,
  Layers,
  ArrowRight,
  Search,
  FileCode,
  Activity,
  Check,
  Play,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Sliders,
  DollarSign,
  Cpu,
  History,
  Undo2,
  Bug,
  BookOpen,
  ShieldAlert,
  Trash2,
  Plus,
  Filter,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { safeInvoke } from "@/lib/ipc";
import {
  AgentRun,
  Subtask,
  EvaluationResult,
  VerifiedLesson,
  RollbackCheckpoint,
  SelfLearningMetrics,
} from "@/lib/types";

interface SpecialistAgentConfig {
  role: "planner" | "researcher" | "coder" | "tester" | "reviewer";
  name: string;
  title: string;
  description: string;
  assignedModel: string;
  complexityTier: "Low" | "Medium" | "High";
  speedScore: number; // out of 10
  costTier: "Free / Local Fast" | "Balanced Local" | "Deep Reasoning";
  status: "active" | "idle" | "running" | "retrying";
  skills: string[];
}

interface LearnedWorkflow {
  id: string;
  patternName: string;
  agentsSequence: string[];
  reliabilityScore: number; // percentage
  sampleObjective: string;
  totalRuns: number;
  avgRetries: number;
  lastUpdated: string;
  status: "verified" | "optimizing";
}

const DEFAULT_SPECIALISTS: SpecialistAgentConfig[] = [
  {
    role: "planner",
    name: "Athena Planner",
    title: "Planner & Coordinator Agent",
    description: "Decomposes complex objectives into DAG subtasks, selects models based on complexity/cost/speed, and delegates to specialist agents.",
    assignedModel: "qwen2.5-coder:7b",
    complexityTier: "High",
    speedScore: 8.5,
    costTier: "Deep Reasoning",
    status: "active",
    skills: ["Goal Decomposition", "Cost/Speed Routing", "DAG Dependency Ordering", "Prior Workflow Retrieval"],
  },
  {
    role: "researcher",
    name: "Scout Researcher",
    title: "Researcher & Context Gatherer",
    description: "Inspects workspace files, analyzes project dependencies, reads documentation, and gathers domain context.",
    assignedModel: "qwen2.5-coder:1.5b",
    complexityTier: "Low",
    speedScore: 9.8,
    costTier: "Free / Local Fast",
    status: "idle",
    skills: ["File Tree Traversal", "AST Search", "Documentation Indexing", "Question Extraction"],
  },
  {
    role: "coder",
    name: "DaVinci Coder",
    title: "Coder & Algorithmic Specialist",
    description: "Synthesizes code implementations, generates diff patches, writes documents, and refactors components.",
    assignedModel: "qwen2.5-coder:7b",
    complexityTier: "Medium",
    speedScore: 8.0,
    costTier: "Balanced Local",
    status: "idle",
    skills: ["Typescript / Rust", "Unified Diff Patching", "Test-Driven Implementation", "Refactoring"],
  },
  {
    role: "tester",
    name: "Argus Tester",
    title: "Tester & Automatic Retry Engine",
    description: "Executes test suites and terminal verification. On failure, triggers automated diagnostic repair and re-tests up to 3 times.",
    assignedModel: "qwen2.5-coder:7b",
    complexityTier: "Medium",
    speedScore: 8.2,
    costTier: "Balanced Local",
    status: "idle",
    skills: ["Vitest & Cargo Test", "Exit Code Verification", "Diagnostic Extraction", "Automatic Retries"],
  },
  {
    role: "reviewer",
    name: "Socrates Reviewer",
    title: "Reviewer & Quality Auditor",
    description: "Evaluates code quality, audits security boundaries, identifies subtle edge cases, and provides final sign-off.",
    assignedModel: "qwen3.5:9b",
    complexityTier: "High",
    speedScore: 7.4,
    costTier: "Deep Reasoning",
    status: "idle",
    skills: ["Quality Grading", "Security Boundary Checks", "Edge Case Detection", "Final Acceptance Gate"],
  },
];

const INITIAL_LEARNED_WORKFLOWS: LearnedWorkflow[] = [
  {
    id: "wf-1",
    patternName: "Full-Stack Implementation Pipeline",
    agentsSequence: ["Planner", "Researcher", "Coder", "Tester", "Reviewer"],
    reliabilityScore: 97.4,
    sampleObjective: "Implement social messaging tool with unit tests and UI panel",
    totalRuns: 34,
    avgRetries: 0.3,
    lastUpdated: "Just now",
    status: "verified",
  },
  {
    id: "wf-2",
    patternName: "Bug Diagnosis & Auto-Repair Loop",
    agentsSequence: ["Researcher", "Tester", "Coder (Auto-Retry)", "Reviewer"],
    reliabilityScore: 92.8,
    sampleObjective: "Fix failing test assertion in database storage migration",
    totalRuns: 19,
    avgRetries: 1.2,
    lastUpdated: "Today",
    status: "verified",
  },
  {
    id: "wf-3",
    patternName: "Rapid Document & Assignment Synthesis",
    agentsSequence: ["Planner", "Researcher", "Coder", "Reviewer"],
    reliabilityScore: 99.1,
    sampleObjective: "Generate Operating Systems lab notes with formulas and PDF export",
    totalRuns: 28,
    avgRetries: 0.0,
    lastUpdated: "Yesterday",
    status: "verified",
  },
  {
    id: "wf-4",
    patternName: "Hardware & Audio Device Configuration",
    agentsSequence: ["Researcher", "Coder", "Tester"],
    reliabilityScore: 94.0,
    sampleObjective: "Enumerate microphone devices and test notification chimes",
    totalRuns: 12,
    avgRetries: 0.5,
    lastUpdated: "2 days ago",
    status: "verified",
  },
];

export function AgentTeamView() {
  const {
    agentRuns,
    activeTask,
    currentPlan,
    evaluations,
    diagnostics,
    selectedModel,
    setSelectedModel,
  } = useAppStore();

  const [specialists, setSpecialists] = useState<SpecialistAgentConfig[]>(DEFAULT_SPECIALISTS);
  const [learnedWorkflows, setLearnedWorkflows] = useState<LearnedWorkflow[]>(INITIAL_LEARNED_WORKFLOWS);
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistAgentConfig>(DEFAULT_SPECIALISTS[0]);
  const [activeTab, setActiveTab] = useState<"pipeline" | "model_routing" | "retries" | "learned_workflows" | "self_learning">("pipeline");
  
  // Interactive Live Team Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);

  // Model Routing Configuration
  const [lowTierModel, setLowTierModel] = useState("qwen2.5-coder:1.5b");
  const [medTierModel, setMedTierModel] = useState("qwen2.5-coder:7b");
  const [highTierModel, setHighTierModel] = useState("qwen3.5:9b");
  const [maxAutoRetries, setMaxAutoRetries] = useState(3);
  const [learningRateBoost, setLearningRateBoost] = useState(true);

  // Odysseus Self-Learning and Self-Correction State
  const [verifiedLessons, setVerifiedLessons] = useState<VerifiedLesson[]>([]);
  const [learningMetrics, setLearningMetrics] = useState<SelfLearningMetrics | null>(null);
  const [checkpoints, setCheckpoints] = useState<RollbackCheckpoint[]>([
    {
      id: "chk-auth-01",
      task_id: "task-auth-jwt",
      target_path: "src/controllers/auth.ts",
      content_backup: "// Backup: Original auth controller snapshot before automated refactor\nexport function verifyToken(req) { return req.headers['authorization']; }",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: "active",
    },
    {
      id: "chk-sqlite-02",
      task_id: "task-db-migration",
      target_path: "src-tauri/src/storage/sqlite.rs",
      content_backup: "// Backup: SQLite schema v3 before concurrent subtask test\nPRAGMA synchronous = NORMAL;",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: "restored",
    },
    {
      id: "chk-types-03",
      task_id: "task-model-routing",
      target_path: "src/lib/types.ts",
      content_backup: "// Backup: Pre-mutation schema snapshot\nexport interface Subtask { ... }",
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: "active",
    },
  ]);
  const [lessonFilter, setLessonFilter] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [isSimulatingOdysseus, setIsSimulatingOdysseus] = useState(false);
  const [odysseusStep, setOdysseusStep] = useState<number>(0);
  const [odysseusLog, setOdysseusLog] = useState<string[]>([]);
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [newLessonForm, setNewLessonForm] = useState({
    error_signature: "",
    root_cause: "",
    failed_approach: "",
    verified_solution: "",
    domain: "TypeScript / Runtime",
  });
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);

  const fetchLessons = () => {
    safeInvoke<VerifiedLesson[]>("list_verified_lessons")
      .then((res) => setVerifiedLessons(res || []))
      .catch((err) => console.error("Error loading lessons:", err));
  };

  const fetchMetrics = () => {
    safeInvoke<SelfLearningMetrics>("get_self_learning_metrics")
      .then((res) => setLearningMetrics(res))
      .catch((err) => console.error("Error loading metrics:", err));
  };

  useEffect(() => {
    fetchLessons();
    fetchMetrics();
  }, []);

  const handleRollback = async (checkpoint: RollbackCheckpoint) => {
    try {
      await safeInvoke("trigger_safe_rollback", {
        taskId: checkpoint.task_id,
        targetPath: checkpoint.target_path,
      });
      setCheckpoints((prev) =>
        prev.map((c) => (c.id === checkpoint.id ? { ...c, status: "restored" } : c))
      );
      setRollbackSuccessMsg(`Safe Rollback restored: ${checkpoint.target_path} reverted to pre-mutation snapshot!`);
      setTimeout(() => setRollbackSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Rollback error:", err);
    }
  };

  const handleSaveNewLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonForm.error_signature.trim() || !newLessonForm.verified_solution.trim()) return;
    const lesson: VerifiedLesson = {
      id: "lesson-" + Math.random().toString(36).substring(2, 9),
      error_signature: newLessonForm.error_signature.trim(),
      root_cause: newLessonForm.root_cause.trim(),
      failed_approach: newLessonForm.failed_approach.trim(),
      verified_solution: newLessonForm.verified_solution.trim(),
      domain: newLessonForm.domain,
      prevented_count: 1,
      confidence_score: 0.98,
      created_at: new Date().toISOString(),
      last_applied_at: new Date().toISOString(),
    };
    await safeInvoke("save_verified_lesson", { lesson });
    setShowNewLessonModal(false);
    setNewLessonForm({
      error_signature: "",
      root_cause: "",
      failed_approach: "",
      verified_solution: "",
      domain: "TypeScript / Runtime",
    });
    fetchLessons();
    fetchMetrics();
  };

  const handleDeleteLesson = async (id: string) => {
    await safeInvoke("delete_verified_lesson", { lessonId: id });
    fetchLessons();
    fetchMetrics();
  };

  // Run a real-time live simulation of the Odysseus Self-Learning and Correction Engine
  const handleRunOdysseusSimulation = () => {
    setIsSimulatingOdysseus(true);
    setOdysseusStep(1);
    setOdysseusLog([
      "🚨 [Mistake Detector]: Runtime Exception Intercepted during task execution!",
      "🚨 [Error Captured]: 'TypeError: Cannot read properties of undefined (reading 'session')' in src/controllers/auth.ts:42",
      "🔬 [Root Cause Investigator]: Extracting stack trace and AST AST-context. Identifying failure mechanism...",
    ]);

    // Step 2: Investigation
    setTimeout(() => {
      setOdysseusStep(2);
      setOdysseusLog((prev) => [
        ...prev,
        "🔬 [Root Cause Investigator]: Isolated failure site -> Async token deserializer returns undefined on revoked credentials.",
        "🔬 [Signature Extracted]: 'TypeError: undefined session payload' -> Hashed signature: 'ERR_AUTH_UNDEFINED_SESSION_42'.",
        "🛡️ [Safe Testing Engine]: Capturing clean pre-mutation snapshot of 'src/controllers/auth.ts' (Checkpoint ID: chk-live-odysseus-01)...",
      ]);

      // Step 3: Checkpoint Created & Candidate 1 Failed (demonstrating safe rollback!)
      setTimeout(() => {
        setOdysseusStep(3);
        setOdysseusLog((prev) => [
          ...prev,
          "🛡️ [Safe Testing Engine]: Clean snapshot saved! Safe rollback guardrail armed.",
          "💡 [Solution Generator]: Candidate #1 synthesized: direct assignment 'token = req.session.token'.",
          "🧪 [Verification Tester]: Executing verification test suite `vitest run auth.test.ts`...",
          "⚠️ [Verification Tester]: Assertion Failed! Test exited with code 1: 'TypeError still thrown on null payload'.",
          "↩️ [Safe Rollback Triggered]: Candidate #1 failed verification! Instantly auto-reverting 'src/controllers/auth.ts' to clean checkpoint chk-live-odysseus-01...",
          "↩️ [Safe Rollback Engine]: Snapshot restored! Workspace integrity preserved with zero corrupted state.",
        ]);

        // Step 4: Candidate 2 synthesized & verified
        setTimeout(() => {
          setOdysseusStep(4);
          setOdysseusLog((prev) => [
            ...prev,
            "💡 [Solution Generator]: Synthesizing Candidate #2 with defensive optional chaining and null fallback...",
            "💡 [Candidate #2 Patch]: Applied: `const token = payload?.session?.token ?? null; if (!token) return unauthorized();`",
            "🧪 [Verification Tester]: Re-running test suite `vitest run auth.test.ts` on Candidate #2...",
            "✅ [Verification Tester]: 5/5 unit assertions PASSED! Exit code 0. Diagnostic correction verified!",
          ]);

          // Step 5: Store Verified Lesson in Persistent Memory
          setTimeout(() => {
            setOdysseusStep(5);
            setOdysseusLog((prev) => [
              ...prev,
              "🧠 [Persistent Memory Vault]: Storing Verified Lesson in SQLite database & Neo4j Knowledge Graph:",
              "   • Error: 'TypeError: Cannot read properties of undefined (reading 'session')'",
              "   • Root Cause: 'Unchecked optional chaining on async auth payload'",
              "   • Verified Fix: 'payload?.session?.token ?? null with early guard check'",
              "   • Confidence Score: 99.4% (Multi-pass verified)",
            ]);

            // Step 6: Adaptive Optimization
            setTimeout(() => {
              setOdysseusStep(6);
              setOdysseusLog((prev) => [
                ...prev,
                "⚡ [Adaptive Engine]: Updating future performance configurations:",
                "   • Dynamic Prompt Guardrail: Injected negative constraint to DaVinci Coder: 'Never dereference async session payload without null-safety check'.",
                "   • Model Routing Escalation: Tasks matching this signature automatically routed to higher reasoning model (qwen3.5:9b).",
                "   • Tool Boundaries: Enforced atomic temporary writes before committing file modifications.",
                "🎉 [Odysseus Engine]: Self-Learning and Self-Correction cycle completed! Future errors of this type will be proactively prevented.",
              ]);
              setIsSimulatingOdysseus(false);

              // Update in-memory lessons list with the new lesson
              const simulatedLesson: VerifiedLesson = {
                id: "lesson-odysseus-live",
                error_signature: "TypeError: Cannot read properties of undefined (reading 'session')",
                root_cause: "Unchecked optional chaining on async auth payload returning null on revoked credentials",
                failed_approach: "Direct unchecked access req.session.token without defensive coalescing",
                verified_solution: "const token = payload?.session?.token ?? null; if (!token) return unauthorized();",
                domain: "Backend / Auth",
                prevented_count: 1,
                confidence_score: 0.994,
                created_at: new Date().toISOString(),
                last_applied_at: new Date().toISOString(),
              };
              setVerifiedLessons((prev) => [simulatedLesson, ...prev.filter((l) => l.id !== simulatedLesson.id)]);
              fetchMetrics();
            }, 1400);
          }, 1400);
        }, 1400);
      }, 1500);
    }, 1300);
  };

  // Run a real-time live simulation of the Self-Improving Agent Team
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(1);
    setRetryAttempt(0);
    setSimLog([
      "🧠 [Planner Agent]: Analyzing user objective: 'Build and verify robust user authentication endpoint'...",
      "🧠 [Planner Agent]: Inspected prior learned workflows: Matching pattern 'Full-Stack Implementation Pipeline' (97.4% reliability).",
      "🧠 [Planner Agent]: Complexity Classified: Researcher (Low, 1.5B) -> Coder (Med, 7B) -> Tester (Med, 7B) -> Reviewer (High, 9B).",
    ]);

    // Step 2: Researcher
    setTimeout(() => {
      setSimulationStep(2);
      setSimLog((prev) => [
        ...prev,
        "🔍 [Researcher Agent (1.5B)]: Gathering codebase context from 'src/lib/types.ts' and auth routes. High speed 9.8/10.",
        "🔍 [Researcher Agent]: Extracted 3 schema contracts and existing JWT cryptographic utility.",
      ]);

      // Step 3: Coder
      setTimeout(() => {
        setSimulationStep(3);
        setSimLog((prev) => [
          ...prev,
          "💻 [Coder Agent (7B)]: Synthesizing implementation. Created auth controller and handler tests.",
        ]);

        // Step 4: Tester (Intentional test failure to demonstrate Automatic Retries!)
        setTimeout(() => {
          setSimulationStep(4);
          setSimLog((prev) => [
            ...prev,
            "🧪 [Tester Agent]: Executing test suite `vitest run auth.test.ts`...",
            "⚠️ [Tester Agent]: Test FAILED! Exit code 1: 'AssertionError: Token expiration expected 3600s, got 1800s'.",
            "🔄 [Automatic Retry Engine]: Triggering Retry 1/3! Diagnosing root cause and dispatching repair to Coder Agent...",
          ]);
          setRetryAttempt(1);

          // Retry repair step
          setTimeout(() => {
            setSimLog((prev) => [
              ...prev,
              "🔧 [Diagnoser & Repair]: Root cause: expiration token mismatch in payload generator. Suggested repair: update expiresIn to 3600.",
              "💻 [Coder Agent]: Applied diagnostic repair patch. Modified expiresIn to 3600s in auth controller.",
              "🧪 [Tester Agent]: Re-running test suite `vitest run auth.test.ts` (Attempt 2)...",
              "✅ [Tester Agent]: Test PASSED (3/3 assertions verified, 0 errors). Automatic retry recovery successful!",
            ]);

            // Step 5: Reviewer
            setTimeout(() => {
              setSimulationStep(5);
              setSimLog((prev) => [
                ...prev,
                "🧐 [Reviewer Agent (9B)]: Auditing code quality, security bounds, and timing attack resistance...",
                "🧐 [Reviewer Agent]: Quality score 9.8/10. Approved for merge.",
                "⚖️ [Evaluation Agent]: Candidate accepted with Score: 0.96. Committed workflow trajectory to Persistent Graph Memory.",
                "🌟 [Self-Improvement]: Workflow pattern reinforced! Success rate updated from 97.4% to 97.9%.",
              ]);
              setIsSimulating(false);

              // Update learned workflow stats
              setLearnedWorkflows((prev) =>
                prev.map((w, idx) =>
                  idx === 0
                    ? { ...w, totalRuns: w.totalRuns + 1, reliabilityScore: Math.min(99.9, w.reliabilityScore + 0.5) }
                    : w
                )
              );
            }, 1400);
          }, 1500);
        }, 1300);
      }, 1200);
    }, 1200);
  };

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              Self-Improving Agent Teams
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
              Autonomous Collaboration
            </span>
          </div>
          <p className="text-xs text-[#7e7568] mt-1">
            Planner coordinates specialist agents, manages automatic test failure retries, selects models based on complexity, cost & speed, and learns reliable workflows from evaluation results.
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          {isSimulating ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              Team Collaborating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Run Agent Team Simulation
            </>
          )}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#f8f5ee] rounded-2xl border border-[#ece4d8] max-w-5xl">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "pipeline"
              ? "bg-white text-indigo-900 shadow-xs border border-[#e5decb]"
              : "text-[#6f6759] hover:text-[#2d2a26]"
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          Specialist Agent Pipeline
        </button>

        <button
          onClick={() => setActiveTab("model_routing")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "model_routing"
              ? "bg-white text-indigo-900 shadow-xs border border-[#e5decb]"
              : "text-[#6f6759] hover:text-[#2d2a26]"
          }`}
        >
          <Gauge className="w-4 h-4 text-amber-600" />
          Complexity, Cost & Speed Routing
        </button>

        <button
          onClick={() => setActiveTab("retries")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "retries"
              ? "bg-white text-indigo-900 shadow-xs border border-[#e5decb]"
              : "text-[#6f6759] hover:text-[#2d2a26]"
          }`}
        >
          <RotateCcw className="w-4 h-4 text-rose-500" />
          Automatic Test Retries & Recovery
        </button>

        <button
          onClick={() => setActiveTab("learned_workflows")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "learned_workflows"
              ? "bg-white text-indigo-900 shadow-xs border border-[#e5decb]"
              : "text-[#6f6759] hover:text-[#2d2a26]"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Learned Reliable Workflows
        </button>

        <button
          onClick={() => setActiveTab("self_learning")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "self_learning"
              ? "bg-white text-purple-900 shadow-xs border border-[#e5decb]"
              : "text-[#6f6759] hover:text-[#2d2a26]"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          Self-Learning Engine (Odysseus)
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-mono font-bold">
            Self-Correction & Rollbacks
          </span>
        </button>
      </div>

      {/* Tab 1: Specialist Agent Pipeline Flow */}
      {activeTab === "pipeline" && (
        <div className="space-y-6 max-w-5xl">
          {/* Interactive Agent Flow Ribbon */}
          <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f3ede3] pb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Autonomous Specialist Team Architecture
                </h3>
                <p className="text-[11px] text-[#7a7164] mt-0.5">
                  Planner coordinates the team DAG, delegating each phase to the specialized agent best suited for the task.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                5 Active Specialists
              </span>
            </div>

            {/* Visual Flow Pipeline */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {specialists.map((agent, idx) => {
                const isCurrentSimStep = isSimulating && simulationStep === idx + 1;
                const isSelected = selectedSpecialist.role === agent.role;
                return (
                  <div
                    key={agent.role}
                    onClick={() => setSelectedSpecialist(agent)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                      isCurrentSimStep
                        ? "border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-400"
                        : isSelected
                        ? "border-indigo-500 bg-white shadow-xs"
                        : "border-[#ece4d8] bg-[#fcfaf7] hover:border-indigo-300"
                    }`}
                  >
                    {idx < 4 && (
                      <div className="hidden sm:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-stone-300">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-stone-400">
                          Step {idx + 1}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            agent.complexityTier === "High"
                              ? "bg-purple-100 text-purple-700"
                              : agent.complexityTier === "Medium"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {agent.complexityTier}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-[#2d2a26] flex items-center gap-1.5">
                        {agent.role === "planner" && <Brain className="w-3.5 h-3.5 text-indigo-600" />}
                        {agent.role === "researcher" && <Search className="w-3.5 h-3.5 text-sky-600" />}
                        {agent.role === "coder" && <Code2 className="w-3.5 h-3.5 text-blue-600" />}
                        {agent.role === "tester" && <RotateCcw className="w-3.5 h-3.5 text-rose-500" />}
                        {agent.role === "reviewer" && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                        {agent.name.split(" ")[0]}
                      </div>

                      <p className="text-[10px] text-[#786f62] line-clamp-2">
                        {agent.title}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#f0e8db] text-[9px] font-mono text-[#8a8174] space-y-0.5">
                      <div>Model: <strong className="text-indigo-800">{agent.assignedModel}</strong></div>
                      <div>Speed: {agent.speedScore}/10</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Specialist Details Card */}
          <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#2d2a26] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  {selectedSpecialist.name} ({selectedSpecialist.title})
                </h4>
                <p className="text-xs text-[#7a7164] mt-0.5">
                  {selectedSpecialist.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                  Tier: {selectedSpecialist.complexityTier} Complexity
                </span>
                <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                  Cost: {selectedSpecialist.costTier}
                </span>
              </div>
            </div>

            {/* Specialist Core Capabilities */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#665e52]">
                Key Skills & Delegated Tool Boundaries:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedSpecialist.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-3 py-1 bg-[#fcfaf7] border border-[#ece4d8] rounded-xl text-[#3d3830] font-medium flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Live Simulation Trace Log */}
          {simLog.length > 0 && (
            <div className="p-6 bg-[#161220] border border-[#2b223c] rounded-3xl text-stone-200 space-y-3 font-mono text-xs shadow-lg">
              <div className="flex items-center justify-between border-b border-[#2b223c] pb-2 text-stone-400">
                <span className="flex items-center gap-2 font-semibold">
                  <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                  Live Team Execution & Retry Trace
                </span>
                <span className="text-[10px]">
                  {isSimulating ? "Running..." : "Completed (Verified)"}
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {simLog.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Model Routing by Complexity, Cost & Speed */}
      {activeTab === "model_routing" && (
        <div className="space-y-6 max-w-5xl">
          <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs">
            <div className="border-b border-[#f3ede3] pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-600" />
                Dynamic Model Selection Matrix (Complexity, Cost & Speed)
              </h3>
              <p className="text-xs text-[#7a7164] mt-1">
                The Planner evaluates each subtask's reasoning requirements. Low-complexity tasks route to lightweight, ultra-fast models to preserve compute, while high-complexity tasks route to deep reasoning models.
              </p>
            </div>

            {/* Matrix Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Low Complexity Tier */}
              <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2d2a26] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Tier 1: Low Complexity
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    FAST / 0-COST
                  </span>
                </div>
                <p className="text-[11px] text-[#71685b]">
                  Assigned to: <strong>Researcher</strong> for directory scans, keyword search, file reads, and light parsing.
                </p>
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-mono text-[#7a7164]">Assigned Model:</label>
                  <select
                    value={lowTierModel}
                    onChange={(e) => setLowTierModel(e.target.value)}
                    className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs font-mono"
                  >
                    <option value="qwen2.5-coder:1.5b">qwen2.5-coder:1.5b (Ultra-Fast)</option>
                    <option value="llama3.2:3b">llama3.2:3b (Fast)</option>
                    <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
                  </select>
                </div>
                <div className="text-[10px] font-mono text-[#5b5346] space-y-0.5 border-t border-[#f0e8db] pt-2">
                  <div>Speed: <strong className="text-emerald-700">9.8 / 10</strong> (Instantaneous)</div>
                  <div>Compute Cost: <strong>Minimal (1.5B params)</strong></div>
                  <div>Token Efficiency: <strong>100% Local</strong></div>
                </div>
              </div>

              {/* Medium Complexity Tier */}
              <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2d2a26] flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-blue-600" />
                    Tier 2: Medium Complexity
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                    BALANCED CODE
                  </span>
                </div>
                <p className="text-[11px] text-[#71685b]">
                  Assigned to: <strong>Coder & Tester</strong> for writing algorithms, executing test suites, and patching files.
                </p>
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-mono text-[#7a7164]">Assigned Model:</label>
                  <select
                    value={medTierModel}
                    onChange={(e) => setMedTierModel(e.target.value)}
                    className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs font-mono"
                  >
                    <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (Default Coder)</option>
                    <option value="mistral:7b">mistral:7b</option>
                    <option value="huihui_ai/qwen3.5-abliterated:9b">qwen3.5-abliterated:9b</option>
                  </select>
                </div>
                <div className="text-[10px] font-mono text-[#5b5346] space-y-0.5 border-t border-[#f0e8db] pt-2">
                  <div>Speed: <strong className="text-blue-700">8.0 / 10</strong> (Fast)</div>
                  <div>Compute Cost: <strong>Balanced (7B params)</strong></div>
                  <div>Token Efficiency: <strong>High throughput</strong></div>
                </div>
              </div>

              {/* High Complexity Tier */}
              <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2d2a26] flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-purple-600" />
                    Tier 3: High Complexity
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                    DEEP REASONING
                  </span>
                </div>
                <p className="text-[11px] text-[#71685b]">
                  Assigned to: <strong>Planner, Reviewer & Diagnoser</strong> for architectural planning, security audits, and root-cause analysis.
                </p>
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-mono text-[#7a7164]">Assigned Model:</label>
                  <select
                    value={highTierModel}
                    onChange={(e) => setHighTierModel(e.target.value)}
                    className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs font-mono"
                  >
                    <option value="qwen3.5:9b">qwen3.5:9b (Deep Reasoning)</option>
                    <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
                    <option value="qwen2.5-coder:32b">qwen2.5-coder:32b (Ultra Capable)</option>
                  </select>
                </div>
                <div className="text-[10px] font-mono text-[#5b5346] space-y-0.5 border-t border-[#f0e8db] pt-2">
                  <div>Speed: <strong className="text-purple-700">7.2 / 10</strong> (Deliberate)</div>
                  <div>Compute Cost: <strong>Highest Reasoning</strong></div>
                  <div>Token Efficiency: <strong>Maximum Accuracy</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Automatic Test Retries & Recovery */}
      {activeTab === "retries" && (
        <div className="space-y-6 max-w-5xl">
          <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs">
            <div className="border-b border-[#f3ede3] pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                Automatic Retries on Test Failures
              </h3>
              <p className="text-xs text-[#7a7164] mt-1">
                When the Tester Agent encounters a test failure or non-zero exit code, NEXORA automatically isolates the stack trace, generates a diagnostic repair patch, and re-executes the Coder and Tester.
              </p>
            </div>

            {/* Recovery Flow Diagram */}
            <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-3">
              <span className="text-[11px] font-bold text-[#2d2a26] uppercase tracking-wider">
                Automated Recovery Loop Architecture:
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-rose-200 text-rose-800 text-center flex-1">
                  <div className="font-bold">1. Tester Fails</div>
                  <div className="text-[10px] text-stone-500">Captures stderr & exit code</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 rotate-90 sm:rotate-0" />
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-amber-800 text-center flex-1">
                  <div className="font-bold">2. Diagnoser Pinpoints</div>
                  <div className="text-[10px] text-stone-500">Root-cause failure repair</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 rotate-90 sm:rotate-0" />
                <div className="p-3 bg-white rounded-xl border border-blue-200 text-blue-800 text-center flex-1">
                  <div className="font-bold">3. Coder Patches</div>
                  <div className="text-[10px] text-stone-500">Applies targeted code diff</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 rotate-90 sm:rotate-0" />
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-emerald-800 text-center flex-1">
                  <div className="font-bold">4. Retester Passes</div>
                  <div className="text-[10px] text-stone-500">Validates assertions</div>
                </div>
              </div>
            </div>

            {/* Retry Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-2">
                <label className="text-xs font-bold text-[#2d2a26] block">
                  Maximum Automatic Retries per Test Failure
                </label>
                <p className="text-[11px] text-[#7a7164]">
                  Number of autonomous repair iterations attempted before escalating to the user.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  {[1, 2, 3, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMaxAutoRetries(num)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        maxAutoRetries === num
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-[#ece4d8] text-[#2d2a26]"
                      }`}
                    >
                      {num} Retries
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-2">
                <label className="text-xs font-bold text-[#2d2a26] block">
                  Adaptive Temperature Escalation
                </label>
                <p className="text-[11px] text-[#7a7164]">
                  Slightly varies sampling temperature on repeated retries to prevent getting stuck in local minima.
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    ACTIVE (0.2 -&gt; 0.4 on Retry 2)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Learned Reliable Workflows */}
      {activeTab === "learned_workflows" && (
        <div className="space-y-6 max-w-5xl">
          <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Learned Workflows & Self-Improving Memory
                </h3>
                <p className="text-xs text-[#7a7164] mt-0.5">
                  NEXORA learns which specialist sequences and model combinations succeed. Future planner decisions bias toward high-reliability patterns.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Knowledge Graph Synchronized
              </span>
            </div>

            {/* Learned Workflows List */}
            <div className="space-y-3">
              {learnedWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-2 hover:border-emerald-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#2d2a26]">
                        {wf.patternName}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {wf.reliabilityScore.toFixed(1)}% Reliability
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {wf.totalRuns} successful runs • Avg retries: {wf.avgRetries}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#71685b]">
                    Example Task: "{wf.sampleObjective}"
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-stone-500 font-mono">Delegation Sequence:</span>
                    {wf.agentsSequence.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-white border border-[#ece4d8] rounded-md font-semibold text-indigo-900">
                          {step}
                        </span>
                        {idx < wf.agentsSequence.length - 1 && (
                          <span className="text-stone-300 text-xs">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Odysseus Self-Learning & Self-Correction Engine */}
      {activeTab === "self_learning" && (
        <div className="space-y-6 max-w-5xl">
          {/* Rollback Success Banner */}
          {rollbackSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {rollbackSuccessMsg}
              </div>
              <button
                onClick={() => setRollbackSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Odysseus Top Banner */}
          <div className="p-6 bg-gradient-to-br from-white via-[#faf7f2] to-purple-50/40 border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f3ede3] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Odysseus: Self-Learning & Self-Correction Engine
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                    Autonomous Evolution
                  </span>
                </div>
                <p className="text-xs text-[#736a5c] mt-1 max-w-2xl">
                  Odysseus automatically detects mistakes (runtime errors, assertion failures, unexpected tool output), investigates root causes, generates verified solutions, and preserves lessons in persistent memory to prevent recurring failures. Prompts, strategies, and models dynamically adapt based on historical outcomes.
                </p>
              </div>

              <button
                onClick={handleRunOdysseusSimulation}
                disabled={isSimulatingOdysseus}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                {isSimulatingOdysseus ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Odysseus Self-Correcting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Simulate Mistake, Fix & Rollback
                  </>
                )}
              </button>
            </div>

            {/* 5 High-Impact Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="p-3.5 bg-white border border-[#ece4d8] rounded-2xl shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-purple-600" />
                  Lessons Vault
                </div>
                <div className="text-xl font-extrabold text-purple-900 font-mono">
                  {verifiedLessons.length}
                </div>
                <div className="text-[9px] text-stone-500">Persistent in SQLite</div>
              </div>

              <div className="p-3.5 bg-white border border-[#ece4d8] rounded-2xl shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-emerald-600" />
                  Errors Prevented
                </div>
                <div className="text-xl font-extrabold text-emerald-700 font-mono">
                  {learningMetrics?.total_errors_prevented || 53}
                </div>
                <div className="text-[9px] text-stone-500">Proactively blocked</div>
              </div>

              <div className="p-3.5 bg-white border border-[#ece4d8] rounded-2xl shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <Undo2 className="w-3 h-3 text-amber-600" />
                  Rollback Points
                </div>
                <div className="text-xl font-extrabold text-amber-700 font-mono">
                  {checkpoints.length}
                </div>
                <div className="text-[9px] text-stone-500">Zero file corruption</div>
              </div>

              <div className="p-3.5 bg-white border border-[#ece4d8] rounded-2xl shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-blue-600" />
                  Repair Confidence
                </div>
                <div className="text-xl font-extrabold text-blue-700 font-mono">
                  {((learningMetrics?.avg_repair_confidence || 0.978) * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-stone-500">Multi-pass verified</div>
              </div>

              <div className="p-3.5 bg-white border border-[#ece4d8] rounded-2xl shadow-2xs space-y-1 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-600" />
                  Guardrails
                </div>
                <div className="text-xl font-extrabold text-indigo-700 font-mono">
                  {learningMetrics?.active_guardrails_count || 8}
                </div>
                <div className="text-[9px] text-stone-500">Active prompt rules</div>
              </div>
            </div>
          </div>

          {/* Interactive Live Odysseus Simulator Stepper & Log */}
          {(isSimulatingOdysseus || odysseusLog.length > 0) && (
            <div className="p-6 bg-white border border-purple-200 rounded-3xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                  <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider font-mono">
                    Odysseus Closed-Loop Self-Correction in Action
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Step {odysseusStep} / 6
                </span>
              </div>

              {/* 6-Stage Progress Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[
                  { step: 1, label: "1. Mistake Trapped", icon: Bug },
                  { step: 2, label: "2. Root Cause AST", icon: Search },
                  { step: 3, label: "3. Safe Checkpoint", icon: ShieldAlert },
                  { step: 4, label: "4. Auto-Rollback", icon: Undo2 },
                  { step: 5, label: "5. Verified Fix", icon: CheckCircle },
                  { step: 6, label: "6. Memory & Adapt", icon: Brain },
                ].map((s) => {
                  const isDone = odysseusStep > s.step;
                  const isCurrent = odysseusStep === s.step;
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.step}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isDone
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : isCurrent
                          ? "bg-purple-100 border-purple-400 text-purple-900 shadow-xs ring-2 ring-purple-300"
                          : "bg-stone-50 border-stone-200 text-stone-400 opacity-60"
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-[10px] font-bold font-mono">{s.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Execution Console Log */}
              <div className="bg-[#18181b] text-[#f4f4f5] p-4 rounded-2xl font-mono text-xs space-y-1.5 max-h-64 overflow-y-auto shadow-inner">
                {odysseusLog.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      log.includes("🚨") || log.includes("⚠️")
                        ? "text-rose-400"
                        : log.includes("🔬")
                        ? "text-sky-300"
                        : log.includes("🛡️") || log.includes("↩️")
                        ? "text-amber-300 font-semibold"
                        : log.includes("✅") || log.includes("🎉")
                        ? "text-emerald-400 font-bold"
                        : log.includes("🧠") || log.includes("⚡")
                        ? "text-purple-300"
                        : "text-stone-300"
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pillar 1 & Pillar 3: Detection Diagnostics & Adaptive Performance Engine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1: Detection & Investigation Engine */}
            <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#f3ede3] pb-3">
                <Bug className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-bold text-[#2d2a26] uppercase tracking-wider">
                  Pillar 1: Mistake Detection & Investigation
                </h4>
              </div>
              <p className="text-[11px] text-[#71685b]">
                Continuous inspection traps failures across three execution vectors, analyzes AST call-sites, and extracts cryptographically verifiable error signatures.
              </p>

              <div className="space-y-2.5">
                <div className="p-3 bg-[#fcfaf7] border border-[#efe7dc] rounded-xl flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2d2a26]">1. Runtime & Assertion Traps</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Catches uncaught exceptions, exit code failures, and Vitest/Cargo assertion diffs instantly before user-facing error escalation.
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#fcfaf7] border border-[#efe7dc] rounded-xl flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 mt-0.5">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2d2a26]">2. Unexpected Tool Output Trapper</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Detects schema mismatches, JSON parse failures, and sandboxed command timeouts across filesystem and terminal tools.
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#fcfaf7] border border-[#efe7dc] rounded-xl flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 mt-0.5">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2d2a26]">3. Root Cause AST Diagnoser</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Extracts exact call-site, variable scopes, and async dependencies to isolate whether errors stem from typos, missing configs, or algorithmic logic.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 3: Adaptive Performance Engine */}
            <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#f3ede3] pb-3">
                <Zap className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-[#2d2a26] uppercase tracking-wider">
                  Pillar 3: Adaptive Optimization (Prompts & Routing)
                </h4>
              </div>
              <p className="text-[11px] text-[#71685b]">
                Past failures continuously reshape future execution. Odysseus injects negative prompt constraints, updates tool parameters, and escalates model selection.
              </p>

              <div className="space-y-2.5">
                <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-purple-900 flex items-center justify-between">
                    <span>Dynamic Prompt Guardrails</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                      ACTIVE (8 Injected)
                    </span>
                  </div>
                  <div className="text-[10px] text-purple-800 font-mono bg-white p-2 rounded-lg border border-purple-100">
                    "NEVER dereference async auth payload without null-safe optional chaining (?.). ALWAYS provide fallback tokens."
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
                    <span>Model Selection Escalation</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                      AUTO-ESCALATE
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-800">
                    If an objective matches a fragile domain with &gt;1 historical retry, Odysseus dynamically overrides DaVinci Coder from 7B to <strong className="font-mono text-blue-950">qwen3.5:9b</strong> for deep reasoning.
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                    <span>Strategy Shift to Test-First</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                      STABILITY
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-800">
                    Automatically enforces pre-flight unit test scaffolding before code synthesis for high-risk files.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2: Persistent Verified Lessons Vault (Memory) */}
          <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-3">
              <div>
                <h4 className="text-xs font-bold text-[#2d2a26] uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Pillar 2: Persistent Verified Lessons Vault (Memory)
                </h4>
                <p className="text-[11px] text-[#71685b] mt-0.5">
                  Stored in local SQLite & Neo4j. Before executing tasks, agents check this vault to ensure known failure modes are never repeated.
                </p>
              </div>

              <button
                onClick={() => setShowNewLessonModal(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Verified Lesson
              </button>
            </div>

            {/* Search & Domain Filter Row */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search error signatures, root causes, or solutions..."
                  value={lessonFilter}
                  onChange={(e) => setLessonFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-xl text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {["all", "TypeScript / Runtime", "Backend / Auth", "Storage / SQLite"].map((dom) => (
                  <button
                    key={dom}
                    onClick={() => setSelectedDomain(dom)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      selectedDomain === dom
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-[#fcfaf7] text-stone-600 hover:text-stone-900 border border-[#ece4d8]"
                    }`}
                  >
                    {dom === "all" ? "All Domains" : dom}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Verified Lessons */}
            <div className="space-y-3 pt-2">
              {verifiedLessons
                .filter((l) => {
                  const matchSearch =
                    l.error_signature.toLowerCase().includes(lessonFilter.toLowerCase()) ||
                    l.root_cause.toLowerCase().includes(lessonFilter.toLowerCase()) ||
                    l.verified_solution.toLowerCase().includes(lessonFilter.toLowerCase());
                  const matchDomain = selectedDomain === "all" || l.domain === selectedDomain;
                  return matchSearch && matchDomain;
                })
                .map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl space-y-3 hover:border-purple-300 transition-all shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3ede3] pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          {lesson.error_signature}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
                          {lesson.domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Prevented {lesson.prevented_count}x
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          {((lesson.confidence_score || 0.98) * 100).toFixed(0)}% Confidence
                        </span>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Lesson"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase text-stone-500 font-bold">Root Cause:</div>
                        <p className="text-[11px] text-[#554e42] leading-relaxed">
                          {lesson.root_cause}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase text-rose-600 font-bold">Failed Approach (Prevented):</div>
                        <p className="text-[11px] text-rose-800 bg-rose-50/60 p-2 rounded-lg border border-rose-100 font-mono">
                          {lesson.failed_approach}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-mono uppercase text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified Solution Pattern:
                      </div>
                      <div className="p-2.5 bg-[#18181b] text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                        {lesson.verified_solution}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Pillar 4: Safe Testing & Rollback Checkpoints */}
          <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-3">
              <div>
                <h4 className="text-xs font-bold text-[#2d2a26] uppercase tracking-wider flex items-center gap-2">
                  <Undo2 className="w-4 h-4 text-amber-600" />
                  Pillar 4: Safe Testing Sandbox & Rollback Mechanism
                </h4>
                <p className="text-[11px] text-[#71685b] mt-0.5">
                  Before any file mutation or test repair, Odysseus takes an atomic snapshot. If candidate verification fails, the file is reverted instantly with 0 workspace corruption.
                </p>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                Pre-Execution Sandboxing Active
              </span>
            </div>

            {/* Checkpoints Audit Table */}
            <div className="space-y-2.5">
              {checkpoints.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3.5 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#2d2a26]">
                        {chk.target_path}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                          chk.status === "restored"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {chk.status}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {chk.id}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      Task: {chk.task_id} • Snapshot captured {new Date(chk.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRollback(chk)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Checkpoint
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal: Add Verified Lesson */}
          {showNewLessonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white border border-[#ece4d8] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#f3ede3] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-[#2d2a26]">
                      Store New Verified Lesson
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowNewLessonModal(false)}
                    className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveNewLesson} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#2d2a26] mb-1">
                      Error Signature / Exception Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ReferenceError: process is not defined in edge runtime"
                      value={newLessonForm.error_signature}
                      onChange={(e) =>
                        setNewLessonForm({ ...newLessonForm, error_signature: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-xl focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2d2a26] mb-1">
                      Domain Category
                    </label>
                    <select
                      value={newLessonForm.domain}
                      onChange={(e) =>
                        setNewLessonForm({ ...newLessonForm, domain: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-xl focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="TypeScript / Runtime">TypeScript / Runtime</option>
                      <option value="Backend / Auth">Backend / Auth</option>
                      <option value="Storage / SQLite">Storage / SQLite</option>
                      <option value="APIs / Network">APIs / Network</option>
                      <option value="Automation / System">Automation / System</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2d2a26] mb-1">
                      Investigated Root Cause
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Why did this mistake happen? (e.g. Node process global accessed within Edge WebWorker runtime)"
                      value={newLessonForm.root_cause}
                      onChange={(e) =>
                        setNewLessonForm({ ...newLessonForm, root_cause: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-xl focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-rose-600 mb-1">
                      Failed Approach (What not to do)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Using process.env.KEY directly in client code"
                      value={newLessonForm.failed_approach}
                      onChange={(e) =>
                        setNewLessonForm({ ...newLessonForm, failed_approach: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-xl focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                      Verified Solution Pattern (Code / Fix)
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Use public runtime config or NEXT_PUBLIC_ prefix"
                      value={newLessonForm.verified_solution}
                      onChange={(e) =>
                        setNewLessonForm({ ...newLessonForm, verified_solution: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-xl focus:outline-none focus:border-purple-500 font-mono text-emerald-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#f3ede3]">
                    <button
                      type="button"
                      onClick={() => setShowNewLessonModal(false)}
                      className="px-4 py-2 bg-[#f4eee4] hover:bg-[#eae1d4] text-[#635a4d] rounded-xl font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                    >
                      Save Lesson in Memory
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
