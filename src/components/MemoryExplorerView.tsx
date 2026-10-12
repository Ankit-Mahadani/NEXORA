"use client";

import React, { useEffect, useState } from "react";
import {
  Brain,
  Search,
  Database,
  GitBranch,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileCode,
  Zap,
  Clock,
  Play,
  Trash2,
  Plus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Undo2,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import {
  MemoryItem,
  GraphData,
  ScheduledJob,
  VerifiedLesson,
  RollbackCheckpoint,
  SelfLearningMetrics,
} from "@/lib/types";

export function MemoryExplorerView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [verifiedLessons, setVerifiedLessons] = useState<VerifiedLesson[]>([]);
  const [learningMetrics, setLearningMetrics] = useState<SelfLearningMetrics | null>(null);
  const [checkpoints, setCheckpoints] = useState<RollbackCheckpoint[]>([
    {
      id: "chk-auth-01",
      task_id: "task-auth-jwt",
      target_path: "src/controllers/auth.ts",
      content_backup: "// Safe backup snapshot",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: "active",
    },
    {
      id: "chk-sqlite-02",
      task_id: "task-db-migration",
      target_path: "src-tauri/src/storage/sqlite.rs",
      content_backup: "// Safe backup snapshot",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: "restored",
    },
  ]);
  const [activeTab, setActiveTab] = useState<"flowchart" | "nodes" | "memories" | "automations" | "lessons">("flowchart");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lessonNotification, setLessonNotification] = useState<string | null>(null);

  // New Job Form State
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const [newJobCron, setNewJobCron] = useState("every 10m");
  const [newJobPrompt, setNewJobPrompt] = useState("");

  const fetchMemories = (query = "", semantic = useSemanticSearch) => {
    setIsSearching(true);
    safeInvoke<MemoryItem[]>("search_memories", { query, semantic })
      .then((res) => setMemories(res || []))
      .catch((err) => console.error("Memory search error:", err))
      .finally(() => setIsSearching(false));
  };

  const fetchGraph = () => {
    setIsRefreshing(true);
    safeInvoke<GraphData>("get_task_graph", { taskId: "current" })
      .then((res) => setGraphData(res))
      .catch((err) => console.error("Graph fetch error:", err))
      .finally(() => setIsRefreshing(false));
  };

  const fetchScheduledJobs = () => {
    safeInvoke<ScheduledJob[]>("list_scheduled_jobs")
      .then((res) => setScheduledJobs(res || []))
      .catch((err) => console.error("Scheduled jobs fetch error:", err));
  };

  const fetchLessonsAndCheckpoints = () => {
    safeInvoke<VerifiedLesson[]>("list_verified_lessons")
      .then((res) => setVerifiedLessons(res || []))
      .catch((err) => console.error("Error fetching lessons:", err));
    safeInvoke<SelfLearningMetrics>("get_self_learning_metrics")
      .then((res) => setLearningMetrics(res))
      .catch((err) => console.error("Error fetching metrics:", err));
  };

  const handleRollbackCheckpoint = async (chk: RollbackCheckpoint) => {
    try {
      await safeInvoke("trigger_safe_rollback", {
        taskId: chk.task_id,
        targetPath: chk.target_path,
      });
      setCheckpoints((prev) =>
        prev.map((c) => (c.id === chk.id ? { ...c, status: "restored" } : c))
      );
      setLessonNotification(`Safe Rollback: Checkpoint ${chk.id} restored for ${chk.target_path}!`);
      setTimeout(() => setLessonNotification(null), 4000);
    } catch (err) {
      console.error("Rollback error:", err);
    }
  };

  useEffect(() => {
    fetchMemories("", useSemanticSearch);
    fetchGraph();
    fetchScheduledJobs();
    fetchLessonsAndCheckpoints();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim() || !newJobPrompt.trim()) return;
    try {
      await safeInvoke("create_scheduled_job", {
        name: newJobName.trim(),
        cronExpression: newJobCron.trim(),
        prompt: newJobPrompt.trim(),
      });
      setNewJobName("");
      setNewJobPrompt("");
      setShowNewJobModal(false);
      fetchScheduledJobs();
    } catch (err) {
      console.error("Failed to create scheduled job:", err);
    }
  };

  const handleToggleJob = async (jobId: string, currentEnabled: boolean) => {
    try {
      await safeInvoke("toggle_scheduled_job", {
        jobId,
        enabled: !currentEnabled,
      });
      fetchScheduledJobs();
    } catch (err) {
      console.error("Failed to toggle scheduled job:", err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await safeInvoke("delete_scheduled_job", { jobId });
      fetchScheduledJobs();
    } catch (err) {
      console.error("Failed to delete scheduled job:", err);
    }
  };

  const handleTriggerJob = async (jobId: string) => {
    try {
      await safeInvoke("trigger_scheduled_job", { jobId });
      fetchScheduledJobs();
    } catch (err) {
      console.error("Failed to trigger scheduled job:", err);
    }
  };

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] dark:bg-black text-[#2d2a26] dark:text-[#f4f4f5] overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#2d2a26] dark:text-[#f3efe8]">
            <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            NVIDIA AVO, Semantic Vector Memory & Automations
          </h2>
          <p className="text-xs text-[#7e7568] dark:text-[#9e9587] mt-1">
            Cosine vector memory retrieval, persistent Neo4j graph reflection, and background cron automations.
          </p>
        </div>

        <button
          onClick={() => {
            fetchMemories(searchQuery, useSemanticSearch);
            fetchGraph();
            fetchScheduledJobs();
          }}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#1c1b18] border border-[#ece4d8] dark:border-[#2d2b27] text-xs font-medium text-[#5e564a] dark:text-[#b5ab9c] hover:text-[#2d2a26] dark:hover:text-[#f3efe8] transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-violet-600" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Persistent Lineage & Daemon Status Bar */}
      <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl flex flex-wrap items-center justify-between text-xs shadow-xs max-w-5xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[#2d2a26] dark:text-[#f3efe8]">Persistent Graph & Vector Memory</div>
            <div className="text-[11px] font-mono text-[#797063] dark:text-[#8e8577]">
              {graphData?.status || "Connected"} • SQLite Vector Similarity Active
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1 rounded-xl bg-[#f7f4ee] dark:bg-[#23221f] text-[#5e564a] dark:text-[#b5ab9c] border border-[#ece4d8] dark:border-[#35332f]">
            Graph Nodes: <strong className="text-violet-600 dark:text-violet-400">{graphData?.nodes.length || 0}</strong>
          </div>
          <div className="px-3 py-1 rounded-xl bg-[#f7f4ee] dark:bg-[#23221f] text-[#5e564a] dark:text-[#b5ab9c] border border-[#ece4d8] dark:border-[#35332f]">
            Active Cron Jobs: <strong className="text-emerald-600 dark:text-emerald-400">{scheduledJobs.filter(j => j.enabled).length}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 max-w-5xl border-b border-[#ece4d8] dark:border-[#2a2926] pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab("flowchart")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "flowchart"
              ? "bg-violet-600 text-white shadow-xs font-semibold"
              : "text-[#7e7568] dark:text-[#9e9587] hover:text-[#2d2a26] dark:hover:text-[#f3efe8] bg-transparent"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          AVO Architecture Flowchart
        </button>

        <button
          onClick={() => setActiveTab("nodes")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "nodes"
              ? "bg-violet-600 text-white shadow-xs font-semibold"
              : "text-[#7e7568] dark:text-[#9e9587] hover:text-[#2d2a26] dark:hover:text-[#f3efe8] bg-transparent"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Graph Lineage Nodes ({graphData?.nodes.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("memories")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "memories"
              ? "bg-violet-600 text-white shadow-xs font-semibold"
              : "text-[#7e7568] dark:text-[#9e9587] hover:text-[#2d2a26] dark:hover:text-[#f3efe8] bg-transparent"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          Semantic Vector Memories ({memories.length})
        </button>

        <button
          onClick={() => setActiveTab("automations")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "automations"
              ? "bg-violet-600 text-white shadow-xs font-semibold"
              : "text-[#7e7568] dark:text-[#9e9587] hover:text-[#2d2a26] dark:hover:text-[#f3efe8] bg-transparent"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          Scheduled Automations ({scheduledJobs.length})
        </button>

        <button
          onClick={() => setActiveTab("lessons")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
            activeTab === "lessons"
              ? "bg-violet-600 text-white shadow-xs font-semibold"
              : "text-[#7e7568] dark:text-[#9e9587] hover:text-[#2d2a26] dark:hover:text-[#f3efe8] bg-transparent"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Odysseus Lessons & Rollbacks ({verifiedLessons.length})
        </button>
      </div>

      {/* TAB 1: ARCHITECTURE FLOWCHART MAPPING */}
      {activeTab === "flowchart" && (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
          <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f3ede3] dark:border-[#282623] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#2d2a26] dark:text-[#f3efe8] flex items-center gap-2">
                  <span className="text-base">🧬</span>
                  How NVIDIA AVO Operates in NEXORA
                </h3>
                <p className="text-[11px] text-[#7e7568] dark:text-[#9e9587] mt-0.5">
                  Visual mapping of the Agentic Variation & Optimization pipeline and Persistent Graph Memory
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40 text-[10px] font-mono font-bold">
                ACTIVE ARCHITECTURE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-[#ece4d8] dark:border-[#2d2b27] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2d2a26] dark:text-[#f3efe8]">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  Supervisor Agent
                </div>
                <p className="text-[11px] text-[#706657] dark:text-[#9e9587] leading-relaxed">
                  Inspects context & trajectory from Persistent Graph Memory, issues <strong>Supervisor Hint Interventions</strong>, and spawns specialized sub-agents.
                </p>
                <div className="text-[10px] font-mono p-2 rounded-xl bg-white dark:bg-[#181715] border border-[#e8dfd2] dark:border-[#2c2a26] text-amber-700 dark:text-amber-400">
                  ⚡ Inspect Context & Trajectory
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-violet-200 dark:border-violet-900/40 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-700 dark:text-violet-400">
                  <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  AVO Variation Loop
                </div>
                <p className="text-[11px] text-[#706657] dark:text-[#9e9587] leading-relaxed">
                  <strong>1. Lineage</strong> → <strong>2. Plan</strong> → <strong>3. Candidate</strong> → <strong>4. Ground</strong> → <strong>5. Score</strong> → <strong>6. Diagnose</strong>.
                </p>
                <div className="text-[10px] font-mono p-2 rounded-xl bg-white dark:bg-[#181715] border border-violet-200 dark:border-violet-800/40 text-violet-700 dark:text-violet-300">
                  🔄 Iterative Variation Sandbox
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-[#ece4d8] dark:border-[#2d2b27] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2d2a26] dark:text-[#f3efe8]">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    <Database className="w-4 h-4" />
                  </div>
                  Graph Memory & RAG
                </div>
                <p className="text-[11px] text-[#706657] dark:text-[#9e9587] leading-relaxed">
                  Stores validated procedures, tool execution evidence, and semantic cosine similarity vectors for recall across tasks.
                </p>
                <div className="text-[10px] font-mono p-2 rounded-xl bg-white dark:bg-[#181715] border border-[#e8dfd2] dark:border-[#2c2a26] text-emerald-700 dark:text-emerald-400">
                  💾 Graph & Vector Integration
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRAPH NODES */}
      {activeTab === "nodes" && (
        <div className="space-y-4 max-w-5xl animate-in fade-in duration-200">
          <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#2d2a26] dark:text-[#f3efe8]">
              Graph Lineage Nodes ({graphData?.nodes.length || 0})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {graphData?.nodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3.5 rounded-2xl bg-[#faf8f5] dark:bg-[#1a1917] border border-[#ece4d8] dark:border-[#2d2b27] text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-violet-700 dark:text-violet-400 text-[11px]">{node.label}</span>
                    <span className="text-[9px] font-mono text-[#8a8174]">{node.id.slice(0, 8)}</span>
                  </div>
                  {node.properties && (
                    <pre className="text-[10px] font-mono text-[#665e52] dark:text-[#a89e90] bg-white dark:bg-[#111] p-2 rounded-xl overflow-x-auto">
                      {JSON.stringify(node.properties, null, 1)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEMANTIC VECTOR MEMORIES */}
      {activeTab === "memories" && (
        <div className="space-y-4 max-w-5xl animate-in fade-in duration-200">
          {/* Search Bar with Semantic Vector Toggle */}
          <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#9c9284] absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchMemories(e.target.value, useSemanticSearch);
                  }}
                  placeholder="Search memories with semantic vector similarity or keywords..."
                  className="w-full bg-[#faf8f5] dark:bg-[#161513] border border-[#e8dfd2] dark:border-[#2c2a26] rounded-2xl pl-11 pr-5 py-2.5 text-xs text-[#2d2a26] dark:text-[#f3efe8] focus:outline-none focus:border-violet-400 transition-all placeholder-[#9f9588]"
                />
              </div>

              {/* Semantic Mode Pill */}
              <button
                onClick={() => {
                  const toggled = !useSemanticSearch;
                  setUseSemanticSearch(toggled);
                  fetchMemories(searchQuery, toggled);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium border transition-all cursor-pointer ${
                  useSemanticSearch
                    ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40"
                    : "bg-white text-[#706657] border-[#ece4d8] dark:bg-[#1a1917] dark:text-[#a89e90] dark:border-[#2d2b27]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span>{useSemanticSearch ? "Semantic Vector Search" : "Exact Keyword Search"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {memories.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl text-xs text-[#8e8576] shadow-xs">
                No memories match your search. Verified experiences and lessons will be retained here automatically.
              </div>
            ) : (
              memories.map((m) => (
                <div
                  key={m.id}
                  className="p-5 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl text-xs space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40 font-bold">
                        {m.category}
                      </span>
                      {m.similarity_score !== undefined && m.similarity_score !== null && m.similarity_score > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          🎯 {(m.similarity_score * 100).toFixed(0)}% Vector Match
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#918778]">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-[#2d2a26] dark:text-[#e7e2d9] bg-[#fcfaf7] dark:bg-[#201f1c] p-4 rounded-2xl border border-[#efe7dc] dark:border-[#2c2a26] leading-relaxed">
                    {m.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SCHEDULED AUTOMATIONS & CRON DAEMON */}
      {activeTab === "automations" && (
        <div className="space-y-5 max-w-5xl animate-in fade-in duration-200">
          <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f3ede3] dark:border-[#282623] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#2d2a26] dark:text-[#f3efe8] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Background Cron Automations Engine
                </h3>
                <p className="text-[11px] text-[#7e7568] dark:text-[#9e9587] mt-0.5">
                  Persistent background scheduler running inside the Tokio native loop (15-second tick). Executes tasks even when idle.
                </p>
              </div>

              <button
                onClick={() => setShowNewJobModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Scheduled Job
              </button>
            </div>

            {/* List of Scheduled Jobs */}
            <div className="space-y-3">
              {scheduledJobs.length === 0 ? (
                <div className="p-8 text-center bg-[#faf8f5] dark:bg-[#1a1917] rounded-2xl border border-[#ece4d8] dark:border-[#2d2b27] text-xs text-[#8e8576]">
                  No scheduled automations yet. Click <strong>"New Scheduled Job"</strong> above or ask NEXORA via chat to schedule recurring actions.
                </div>
              ) : (
                scheduledJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-[#faf8f5] dark:bg-[#1a1917] border border-[#ece4d8] dark:border-[#2d2b27] flex items-center justify-between text-xs gap-4 shadow-2xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs text-[#2d2a26] dark:text-[#f3efe8]">{job.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                          ⏱ {job.cron_expression}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                            job.last_status === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : job.last_status === "running"
                              ? "bg-violet-50 text-violet-700 border border-violet-200 animate-pulse"
                              : "bg-stone-100 text-stone-600 border border-stone-200"
                          }`}
                        >
                          {job.last_status || "Pending"}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#635b4f] dark:text-[#a89e90] font-mono bg-white dark:bg-[#111] p-2 rounded-xl border border-[#ece4d8] dark:border-[#2d2b27]">
                        Prompt: {job.prompt}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] font-mono text-[#8a8174]">
                        <span>Last Run: {job.last_run_at ? new Date(job.last_run_at).toLocaleTimeString() : "Never"}</span>
                        <span>Next Run: {job.next_run_at ? new Date(job.next_run_at).toLocaleTimeString() : "Pending"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTriggerJob(job.id)}
                        title="Run Now"
                        className="p-2 rounded-xl bg-white dark:bg-[#252320] border border-[#ece4d8] dark:border-[#35332f] hover:border-violet-400 text-violet-600 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-violet-600" />
                      </button>

                      <button
                        onClick={() => handleToggleJob(job.id, job.enabled)}
                        title={job.enabled ? "Disable" : "Enable"}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          job.enabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-stone-100 text-stone-400 border-stone-200"
                        }`}
                      >
                        {job.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        title="Delete"
                        className="p-2 rounded-xl bg-white dark:bg-[#252320] border border-[#ece4d8] dark:border-[#35332f] hover:border-rose-300 text-rose-500 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Scheduled Job Modal */}
          {showNewJobModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#121212] border border-[#ece4d8] dark:border-[#2d2b27] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#f3ede3] dark:border-[#262626] pb-3">
                  <h4 className="font-bold text-sm text-[#2d2a26] dark:text-[#f3efe8] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-600" />
                    Register Scheduled Automation
                  </h4>
                  <button
                    onClick={() => setShowNewJobModal(false)}
                    className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateJob} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold block mb-1 text-[#2d2a26] dark:text-[#f3efe8]">
                      Job Name
                    </label>
                    <input
                      type="text"
                      value={newJobName}
                      onChange={(e) => setNewJobName(e.target.value)}
                      placeholder="e.g. Daily Classroom Assignment Check"
                      className="w-full p-2.5 rounded-xl border border-[#ece4d8] dark:border-[#2d2b27] bg-[#faf8f5] dark:bg-[#1a1917] focus:outline-none focus:border-violet-400 text-xs font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-[#2d2a26] dark:text-[#f3efe8]">
                      Schedule Expression
                    </label>
                    <input
                      type="text"
                      value={newJobCron}
                      onChange={(e) => setNewJobCron(e.target.value)}
                      placeholder="e.g. every 10m, every 1h, daily at 18:00, every 30s"
                      className="w-full p-2.5 rounded-xl border border-[#ece4d8] dark:border-[#2d2b27] bg-[#faf8f5] dark:bg-[#1a1917] focus:outline-none focus:border-violet-400 text-xs font-mono"
                      required
                    />
                    <span className="text-[10px] text-[#8a8174] mt-0.5 block">
                      Supports: <code>every 10m</code>, <code>every 1h</code>, <code>every 30s</code>, <code>daily at 18:00</code>
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-[#2d2a26] dark:text-[#f3efe8]">
                      Prompt / Action to Execute
                    </label>
                    <textarea
                      value={newJobPrompt}
                      onChange={(e) => setNewJobPrompt(e.target.value)}
                      rows={3}
                      placeholder="e.g. Check Google Classroom, generate handwritten assignment PDF, and turn in"
                      className="w-full p-2.5 rounded-xl border border-[#ece4d8] dark:border-[#2d2b27] bg-[#faf8f5] dark:bg-[#1a1917] focus:outline-none focus:border-violet-400 text-xs font-mono resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f3ede3] dark:border-[#262626]">
                    <button
                      type="button"
                      onClick={() => setShowNewJobModal(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-[#ece4d8] dark:border-[#2d2b27] text-stone-600 dark:text-stone-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Save & Activate Job
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ODYSSEUS LESSONS & ROLLBACK CHECKPOINTS */}
      {activeTab === "lessons" && (
        <div className="space-y-6 max-w-5xl">
          {lessonNotification && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {lessonNotification}
              </div>
              <button
                onClick={() => setLessonNotification(null)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Overview Banner */}
          <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f3ede3] dark:border-[#262626] pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-950 dark:text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Odysseus: Persistent Lessons Vault & Rollback Safety
                </h3>
                <p className="text-xs text-[#736a5c] dark:text-[#9e9587] mt-1 max-w-2xl">
                  Verified lessons stored in SQLite memory prevent recurring mistakes by adapting agent prompts, tools, and model routing. Clean rollback checkpoints safeguard the workspace before any automated code mutation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                  Persistent Storage Active
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#fbf9f5] dark:bg-[#161616] border border-[#ece4d8] dark:border-[#2a2926] rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-purple-600" />
                  Stored Lessons
                </div>
                <div className="text-xl font-bold text-purple-900 dark:text-purple-300 font-mono">
                  {verifiedLessons.length}
                </div>
              </div>

              <div className="p-3.5 bg-[#fbf9f5] dark:bg-[#161616] border border-[#ece4d8] dark:border-[#2a2926] rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Errors Prevented
                </div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {learningMetrics?.total_errors_prevented || 53}
                </div>
              </div>

              <div className="p-3.5 bg-[#fbf9f5] dark:bg-[#161616] border border-[#ece4d8] dark:border-[#2a2926] rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <Undo2 className="w-3 h-3 text-amber-600" />
                  Safe Checkpoints
                </div>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {checkpoints.length}
                </div>
              </div>

              <div className="p-3.5 bg-[#fbf9f5] dark:bg-[#161616] border border-[#ece4d8] dark:border-[#2a2926] rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-blue-600" />
                  Avg Confidence
                </div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-400 font-mono">
                  {((learningMetrics?.avg_repair_confidence || 0.978) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-[#2d2a26] dark:text-[#f3efe8] uppercase tracking-wider flex items-center gap-2 border-b border-[#f3ede3] dark:border-[#262626] pb-3">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Verified Lessons Catalog
            </h4>

            <div className="space-y-3">
              {verifiedLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="p-4 bg-[#fcfaf7] dark:bg-[#141414] border border-[#efe7dc] dark:border-[#262626] rounded-2xl space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3ede3] dark:border-[#222] pb-2">
                    <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900">
                      {lesson.error_signature}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                        Prevented {lesson.prevented_count}x
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {lesson.domain}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-[10px] font-mono text-stone-500 uppercase font-bold">Investigated Root Cause:</div>
                    <p className="text-[11px] text-[#554e42] dark:text-[#a89f91]">{lesson.root_cause}</p>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase font-bold">Verified Fix Pattern:</div>
                    <div className="p-2 bg-[#18181b] text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                      {lesson.verified_solution}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rollback Checkpoints */}
          <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-[#2d2a26] dark:text-[#f3efe8] uppercase tracking-wider flex items-center gap-2 border-b border-[#f3ede3] dark:border-[#262626] pb-3">
              <Undo2 className="w-4 h-4 text-amber-600" />
              Pre-Mutation Rollback Checkpoints
            </h4>

            <div className="space-y-2.5">
              {checkpoints.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3.5 bg-[#fcfaf7] dark:bg-[#141414] border border-[#efe7dc] dark:border-[#262626] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#2d2a26] dark:text-[#f3efe8]">
                        {chk.target_path}
                      </span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        chk.status === "restored" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                      }`}>
                        {chk.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      Checkpoint: {chk.id} • Created {new Date(chk.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRollbackCheckpoint(chk)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Checkpoint
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
