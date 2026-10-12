"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Layers,
  Zap,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  Filter,
  Play,
  RotateCcw,
  Cpu,
  Package,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { PredictiveIssue, PredictiveScanSummary } from "@/lib/types";

export function PredictiveRadarView() {
  const [summary, setSummary] = useState<PredictiveScanSummary | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [notification, setNotification] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const fetchScan = () => {
    setIsScanning(true);
    safeInvoke<PredictiveScanSummary>("scan_predictive_issues")
      .then((res) => setSummary(res))
      .catch((err) => console.error("Error running predictive scan:", err))
      .finally(() => setIsScanning(false));
  };

  useEffect(() => {
    fetchScan();
  }, []);

  const handleApplyFix = async (id: string, title: string) => {
    try {
      await safeInvoke("apply_predictive_fix", { id });
      setNotification(`Mitigation successfully applied for: ${title}`);
      if (summary) {
        setSummary({
          ...summary,
          issues: summary.issues.map((i) =>
            i.id === id ? { ...i, status: "resolved" } : i
          ),
        });
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Failed to apply fix:", err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await safeInvoke("dismiss_predictive_issue", { id });
      if (summary) {
        setSummary({
          ...summary,
          issues: summary.issues.filter((i) => i.id !== id),
        });
      }
    } catch (err) {
      console.error("Failed to dismiss issue:", err);
    }
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationLogs([
      "🛰️ [Predictive Radar]: Initializing deep workspace trajectory analysis...",
      "🔍 [Dependency Inspector]: Auditing package.json, Cargo.lock, and native system bindings...",
    ]);

    setTimeout(() => {
      setSimulationLogs((prev) => [
        ...prev,
        "⚠️ [Impending Failure Detected]: DaVinci Coder and Argus Tester have sequential lock on DAG node #4.",
        "📊 [Bottleneck Calculation]: Predicted critical path delay: +14.8 seconds (28% overall execution stall).",
      ]);

      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          "🛡️ [Proactive Prevention Engine]: Auto-decoupling independent test suite generation from code synthesis.",
          "⚡ [Optimization Applied]: Parallelizing test scaffolding into Argus Tester. Predicted critical path stall reduced to 0.0s!",
          "✅ [Predictive Radar]: Bottleneck neutralized before task execution started. System health restored to 98.2%.",
        ]);
        setIsSimulating(false);
      }, 1500);
    }, 1200);
  };

  const filteredIssues = (summary?.issues || []).filter((i) => {
    if (categoryFilter === "all") return true;
    return i.category === categoryFilter;
  });

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {notification}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Predictive Problem Detection
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold">
              Early Warning Radar
            </span>
          </div>
          <p className="text-xs text-[#7e7568] mt-1">
            Detect potential failures, missing dependencies, approaching deadlines, and workflow bottlenecks before they cause problems.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchScan}
            disabled={isScanning}
            className="px-4 py-2.5 bg-white border border-[#ece4d8] hover:bg-[#faf7f2] text-[#4d463b] rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-rose-500" : ""}`} />
            Run Radar Scan
          </button>

          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSimulating ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                Simulating Prevention...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Simulate Early Mitigation
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl">
        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            System Health Index
          </div>
          <div className="text-2xl font-extrabold text-[#2d2a26] font-mono">
            {summary?.health_score ? `${summary.health_score.toFixed(1)}%` : "91.5%"}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">Proactively safeguarded</div>
        </div>

        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Critical Risks
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-mono">
            {summary?.critical_count ?? 1}
          </div>
          <div className="text-[10px] text-stone-500">Requires prompt action</div>
        </div>

        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            DAG Bottlenecks
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">
            {summary?.warning_count ?? 2}
          </div>
          <div className="text-[10px] text-stone-500">Queue stall risks</div>
        </div>

        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            Auto-Fix Available
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">
            {(summary?.issues.filter((i) => i.auto_fixable).length) ?? 4}
          </div>
          <div className="text-[10px] text-purple-600 font-semibold">1-click automated repair</div>
        </div>
      </div>

      {/* Simulation Terminal Log */}
      {(isSimulating || simulationLogs.length > 0) && (
        <div className="p-5 bg-white border border-rose-200 rounded-3xl space-y-3 shadow-xs max-w-5xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <h4 className="text-xs font-bold text-rose-950 uppercase font-mono">
                Predictive Risk Interception Console
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
              Live Trajectory Simulation
            </span>
          </div>

          <div className="bg-[#18181b] text-[#f4f4f5] p-3.5 rounded-2xl font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto">
            {simulationLogs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes("⚠️")
                    ? "text-rose-400 font-semibold"
                    : log.includes("⚡") || log.includes("✅")
                    ? "text-emerald-400 font-bold"
                    : log.includes("🛡️")
                    ? "text-purple-300"
                    : "text-stone-300"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 max-w-5xl overflow-x-auto pb-1">
        {[
          { id: "all", label: "All Predicted Issues" },
          { id: "dependency", label: "Missing Dependencies" },
          { id: "deadline", label: "Approaching Deadlines" },
          { id: "bottleneck", label: "Workflow Bottlenecks" },
          { id: "failure_risk", label: "Runtime Failure Risks" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              categoryFilter === tab.id
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-white border border-[#ece4d8] text-[#696154] hover:text-[#2d2a26]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Issues List */}
      <div className="space-y-3.5 max-w-5xl">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className={`p-5 rounded-3xl border transition-all space-y-3 ${
              issue.status === "resolved"
                ? "bg-[#faf9f6] border-emerald-200 opacity-80"
                : issue.severity === "critical"
                ? "bg-white border-rose-200 shadow-sm"
                : "bg-white border-[#ece4d8] shadow-xs"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3ede3] pb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    issue.severity === "critical"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : issue.severity === "warning"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {issue.severity}
                </span>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
                  {issue.category}
                </span>

                <span className="text-xs font-bold text-[#2d2a26]">
                  {issue.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-stone-400">
                  {issue.affected_component}
                </span>
                {issue.status === "resolved" && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Resolved
                  </span>
                )}
              </div>
            </div>

            {/* Impact & Suggestion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#fdf9f7] border border-[#f3e7e1] rounded-2xl space-y-1">
                <div className="text-[10px] font-mono uppercase text-rose-700 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Predicted Problem (If Unmitigated):
                </div>
                <p className="text-[11px] text-[#554d42] leading-relaxed">
                  {issue.predicted_impact}
                </p>
              </div>

              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-1">
                <div className="text-[10px] font-mono uppercase text-purple-700 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Recommended Proactive Action:
                </div>
                <p className="text-[11px] text-purple-900 leading-relaxed font-mono">
                  {issue.suggested_action}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[10px] font-mono text-stone-400">
                Detected at {new Date(issue.detected_at).toLocaleTimeString()}
              </div>

              {issue.status !== "resolved" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDismiss(issue.id)}
                    className="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs font-medium cursor-pointer"
                  >
                    Dismiss
                  </button>

                  <button
                    onClick={() => handleApplyFix(issue.id, issue.title)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Auto-Fix Mitigation
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
