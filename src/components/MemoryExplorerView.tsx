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
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { MemoryItem, GraphData } from "@/lib/types";

export function MemoryExplorerView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeTab, setActiveTab] = useState<"flowchart" | "nodes" | "memories">("flowchart");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMemories = (query = "") => {
    safeInvoke<MemoryItem[]>("search_memories", { query })
      .then((res) => setMemories(res || []))
      .catch((err) => console.error("Memory search error:", err));
  };

  const fetchGraph = () => {
    setIsRefreshing(true);
    safeInvoke<GraphData>("get_task_graph", { taskId: "current" })
      .then((res) => setGraphData(res))
      .catch((err) => console.error("Graph fetch error:", err))
      .finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    fetchMemories("");
    fetchGraph();
  }, []);

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] dark:bg-black text-[#2d2a26] dark:text-[#f4f4f5] overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#2d2a26] dark:text-[#f3efe8]">
            <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            NVIDIA AVO & Persistent Graph Memory
          </h2>
          <p className="text-xs text-[#7e7568] dark:text-[#9e9587] mt-1">
            Agentic Variation & Optimization (AVO) lineage, supervisor hints, and Neo4j graph reflection.
          </p>
        </div>

        <button
          onClick={() => {
            fetchMemories(searchQuery);
            fetchGraph();
          }}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#1c1b18] border border-[#ece4d8] dark:border-[#2d2b27] text-xs font-medium text-[#5e564a] dark:text-[#b5ab9c] hover:text-[#2d2a26] dark:hover:text-[#f3efe8] transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-violet-600" : ""}`} />
          Refresh Graph
        </button>
      </div>

      {/* Neo4j Engine & Lineage Status Bar */}
      <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl flex flex-wrap items-center justify-between text-xs shadow-xs max-w-5xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[#2d2a26] dark:text-[#f3efe8]">Persistent Graph Memory (Neo4j)</div>
            <div className="text-[11px] font-mono text-[#797063] dark:text-[#8e8577]">
              {graphData?.status || "Probing..."}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="px-3 py-1 rounded-xl bg-[#f7f4ee] dark:bg-[#23221f] text-[#5e564a] dark:text-[#b5ab9c] border border-[#ece4d8] dark:border-[#35332f]">
            Nodes: <strong className="text-violet-600 dark:text-violet-400">{graphData?.nodes.length || 0}</strong>
          </div>
          <div className="px-3 py-1 rounded-xl bg-[#f7f4ee] dark:bg-[#23221f] text-[#5e564a] dark:text-[#b5ab9c] border border-[#ece4d8] dark:border-[#35332f]">
            Edges: <strong className="text-emerald-600 dark:text-emerald-400">{graphData?.relationships.length || 0}</strong>
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
          Learned Procedures ({memories.length})
        </button>
      </div>

      {/* TAB 1: ARCHITECTURE FLOWCHART MAPPING */}
      {activeTab === "flowchart" && (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
          {/* Flowchart Schematic Card */}
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

            {/* Step-by-Step Flowchart Graph Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Supervisor Agent & Trajectory */}
              <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-[#ece4d8] dark:border-[#2d2b27] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2d2a26] dark:text-[#f3efe8]">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  Supervisor Agent
                </div>
                <p className="text-[11px] text-[#706657] dark:text-[#9e9587] leading-relaxed">
                  Inspects context & trajectory from Persistent Graph Memory (Neo4j), issues <strong>Supervisor Hint Interventions</strong>, and spawns specialized sub-agents.
                </p>
                <div className="text-[10px] font-mono p-2 rounded-xl bg-white dark:bg-[#181715] border border-[#e8dfd2] dark:border-[#2c2a26] text-amber-700 dark:text-amber-400">
                  ⚡ Inspect Context & Trajectory
                </div>
              </div>

              {/* Box 2: AVO Agentic Variation Loop */}
              <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-violet-200 dark:border-violet-900/40 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-700 dark:text-violet-400">
                  <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  AVO Variation Loop
                </div>
                <div className="space-y-1.5 text-[11px] text-[#5e564a] dark:text-[#b5ab9c]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-300 flex items-center justify-center font-bold text-[9px]">1</span>
                    Inspect Lineage
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-300 flex items-center justify-center font-bold text-[9px]">2</span>
                    Plan Next Variation
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-300 flex items-center justify-center font-bold text-[9px]">3</span>
                    Implement Candidate
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-300 flex items-center justify-center font-bold text-[9px]">4</span>
                    Execute & Ground
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-300 flex items-center justify-center font-bold text-[9px]">5</span>
                    Score & Evaluate
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-700 dark:text-amber-400">
                    <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold text-[9px]">6</span>
                    Diagnose & Repair (Fail Loop)
                  </div>
                </div>
              </div>

              {/* Box 3: Persistent Graph Memory (Neo4j) */}
              <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-[#ece4d8] dark:border-[#2d2b27] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2d2a26] dark:text-[#f3efe8]">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    <Database className="w-4 h-4" />
                  </div>
                  Persistent Graph Memory
                </div>
                <p className="text-[11px] text-[#706657] dark:text-[#9e9587] leading-relaxed">
                  Stores connected entities: <strong>Task Node</strong>, <strong>Sub-Agent Execution</strong>, <strong>Supervisor Intervention</strong>, <strong>Variation Candidate</strong> (with <em>MUTATED_FROM</em> edges), and <strong>Evaluations & Scores</strong>.
                </p>
                <div className="text-[10px] font-mono p-2 rounded-xl bg-white dark:bg-[#181715] border border-[#e8dfd2] dark:border-[#2c2a26] text-emerald-700 dark:text-emerald-400">
                  🌿 Commit Lineage & Scores
                </div>
              </div>
            </div>

            {/* Specialized Sub-Agents Bar */}
            <div className="p-4 rounded-2xl bg-[#f6f2ea] dark:bg-[#23211e] border border-[#e8dfd2] dark:border-[#2e2c28] space-y-2">
              <div className="text-[11px] font-semibold text-[#665e52] dark:text-[#9f9588] uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-violet-600" />
                Spawned Specialized Sub-Agents
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                {[
                  { name: "Planner Agent", desc: "Plans variations from lineage", icon: "📐" },
                  { name: "Variation Worker", desc: "Implements candidate actions", icon: "⚙️" },
                  { name: "Evaluator Agent", desc: "Scores output vs threshold", icon: "⚖️" },
                  { name: "Diagnoser & Repair", desc: "Diagnoses failures & patches", icon: "🩺" },
                ].map((agent) => (
                  <div
                    key={agent.name}
                    className="p-3 rounded-xl bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2a2926] text-xs space-y-1 shadow-2xs"
                  >
                    <div className="font-bold flex items-center gap-1.5 text-[#2d2a26] dark:text-[#f3efe8]">
                      <span>{agent.icon}</span>
                      <span>{agent.name}</span>
                    </div>
                    <div className="text-[10px] text-[#7e7568] dark:text-[#9e9587]">{agent.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE GRAPH NODES & EDGES */}
      {activeTab === "nodes" && (
        <div className="space-y-4 max-w-5xl animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Graph Nodes */}
            <div className="p-5 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-3 shadow-xs">
              <div className="font-bold text-xs uppercase tracking-wider text-[#665e52] dark:text-[#9f9588] flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-600" />
                Graph Nodes ({graphData?.nodes.length || 0})
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {graphData?.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-3 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-[#ece4d8] dark:border-[#2d2b27] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-violet-700 dark:text-violet-300 font-mono text-[11px]">
                        {node.label}
                      </span>
                      <span className="text-[10px] font-mono text-[#918778]">{node.id.slice(0, 16)}</span>
                    </div>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap text-[#615748] dark:text-[#a89e90] bg-white/70 dark:bg-[#161513] p-2 rounded-xl">
                      {JSON.stringify(node.properties, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Graph Relationships */}
            <div className="p-5 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl space-y-3 shadow-xs">
              <div className="font-bold text-xs uppercase tracking-wider text-[#665e52] dark:text-[#9f9588] flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-600" />
                Lineage Relationships ({graphData?.relationships.length || 0})
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {graphData?.relationships.map((rel, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#faf7f2] dark:bg-[#201f1c] border border-[#ece4d8] dark:border-[#2d2b27] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#615748] dark:text-[#a89e90] truncate max-w-[100px]">{rel.from.slice(0, 12)}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[9px] border border-emerald-200 dark:border-emerald-900/40">
                        {rel.rel_type}
                      </span>
                      <span className="text-[#615748] dark:text-[#a89e90] truncate max-w-[100px]">{rel.to.slice(0, 12)}</span>
                    </div>
                    {rel.properties && Object.keys(rel.properties).length > 0 && (
                      <pre className="text-[10px] font-mono text-[#8a8070] bg-white/70 dark:bg-[#161513] p-1.5 rounded-lg">
                        {JSON.stringify(rel.properties)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEARNED PROCEDURES & ERROR LESSONS */}
      {activeTab === "memories" && (
        <div className="space-y-4 max-w-5xl animate-in fade-in duration-200">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#9c9284] absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchMemories(e.target.value);
              }}
              placeholder="Search past memories, procedures, and error lessons..."
              className="w-full bg-white dark:bg-[#0a0a0a] border border-[#e8dfd2] dark:border-[#2c2a26] rounded-3xl pl-11 pr-5 py-3 text-xs text-[#2d2a26] dark:text-[#f3efe8] focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all shadow-xs placeholder-[#9f9588]"
            />
          </div>

          <div className="space-y-3">
            {memories.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl text-xs text-[#8e8576] shadow-xs">
                No memories match your query. Verified experiences will be preserved here across tasks.
              </div>
            ) : (
              memories.map((m) => (
                <div
                  key={m.id}
                  className="p-5 bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#2c2a26] rounded-3xl text-xs space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40 font-bold">
                      {m.category}
                    </span>
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
    </div>
  );
}
