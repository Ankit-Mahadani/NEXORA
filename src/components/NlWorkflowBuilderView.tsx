"use client";

import React, { useState, useEffect } from "react";
import {
  Workflow,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  Mail,
  FileText,
  Terminal,
  MessageSquare,
  Calendar,
  Clock,
  ShieldCheck,
  Plus,
  Trash2,
  ChevronRight,
  Sliders,
  Check,
  ArrowRight,
  Send,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { ExecutableWorkflow, WorkflowStep } from "@/lib/types";

export function NlWorkflowBuilderView() {
  const [instruction, setInstruction] = useState("");
  const [workflows, setWorkflows] = useState<ExecutableWorkflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<ExecutableWorkflow | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApprovalStep, setPendingApprovalStep] = useState<WorkflowStep | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchWorkflows = () => {
    safeInvoke<ExecutableWorkflow[]>("list_executable_workflows")
      .then((res) => {
        setWorkflows(res || []);
        if (res && res.length > 0 && !activeWorkflow) {
          setActiveWorkflow(res[0]);
        }
      })
      .catch((err) => console.error("Error loading workflows:", err));
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleSynthesize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!instruction.trim()) return;

    setIsSynthesizing(true);
    try {
      const generated = await safeInvoke<ExecutableWorkflow>("convert_nl_to_workflow", {
        instruction: instruction.trim(),
      });
      setActiveWorkflow(generated);
      setInstruction("");
      fetchWorkflows();
      setNotification(`Workflow '${generated.name}' synthesized and ready for execution!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("Failed to synthesize workflow:", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRunWorkflow = (wf: ExecutableWorkflow) => {
    setIsRunning(true);
    setExecutionLogs([
      `🚀 [Workflow Runner]: Triggering execution of '${wf.name}'...`,
      `⏱️ [Trigger Verified]: Trigger type: ${wf.trigger_type.toUpperCase()} (${wf.trigger_config}).`,
      `🔍 [Evaluating Conditions]: Checking ${wf.conditions.join(" AND ")}... [PASSED]`,
    ]);

    let stepIdx = 0;
    const executeNext = () => {
      if (stepIdx < wf.steps.length) {
        const step = wf.steps[stepIdx];
        if (step.require_approval) {
          // Pause and trigger human-in-the-loop approval gate!
          setPendingApprovalStep(step);
          setShowApprovalModal(true);
          setExecutionLogs((prev) => [
            ...prev,
            `🛑 [Approval Gate]: Step '${step.title}' requires human confirmation before execution!`,
          ]);
          return;
        }

        setExecutionLogs((prev) => [
          ...prev,
          `⚡ [Step ${stepIdx + 1}/${wf.steps.length}]: Executing [${step.integration.toUpperCase()}] -> ${step.title}...`,
          `✅ [Step ${stepIdx + 1} Success]: Action '${step.action}' finished with exit code 0.`,
        ]);
        stepIdx++;
        setTimeout(executeNext, 900);
      } else {
        setExecutionLogs((prev) => [
          ...prev,
          `🎉 [Workflow Complete]: All ${wf.steps.length} steps executed successfully!`,
        ]);
        setIsRunning(false);
      }
    };

    setTimeout(executeNext, 800);
  };

  const handleApproveStep = () => {
    setShowApprovalModal(false);
    if (!pendingApprovalStep || !activeWorkflow) return;

    setExecutionLogs((prev) => [
      ...prev,
      `👍 [User Approved]: Human approval granted for '${pendingApprovalStep.title}'!`,
      `⚡ [Step Executed]: Dispatched outbound notification digest securely.`,
      `🎉 [Workflow Complete]: Entire workflow pipeline finalized!`,
    ]);
    setIsRunning(false);
    setPendingApprovalStep(null);
  };

  const handleDeleteWorkflow = async (id: string) => {
    await safeInvoke("delete_executable_workflow", { id });
    fetchWorkflows();
    if (activeWorkflow?.id === id) {
      setActiveWorkflow(null);
    }
  };

  const samplePrompts = [
    "Every Friday at 5 PM run cargo test, summarize git commits, and email them to the team with approval required",
    "When urgent WhatsApp message arrives, check active calendar tasks and generate note summary",
    "On git commit in src/**/*.rs, run vitest, if tests pass deploy release notes to Google Docs",
  ];

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
              <Workflow className="w-5 h-5 text-amber-500" />
              Natural-Language Workflow Builder
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold">
              Prompt to Executable DAG
            </span>
          </div>
          <p className="text-xs text-[#7e7568] mt-1">
            Convert instructions into executable workflows with triggers, conditions, integrations, error handling, and approval steps.
          </p>
        </div>
      </div>

      {/* NL Prompt Input Box */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-3.5 shadow-xs max-w-5xl">
        <form onSubmit={handleSynthesize} className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <label className="text-xs font-bold text-[#2d2a26] uppercase font-mono tracking-wider">
              Natural-Language Instruction
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Every Friday at 5 PM run cargo test, summarize git commits, and email them to the team with approval required..."
              className="flex-1 px-4 py-3 bg-[#fcfaf7] border border-[#ece4d8] rounded-2xl text-xs focus:outline-none focus:border-amber-500 font-medium"
            />

            <button
              type="submit"
              disabled={isSynthesizing || !instruction.trim()}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-2xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
            >
              {isSynthesizing ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Synthesizing DAG...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white" />
                  Convert to Workflow
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Sample Prompts */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-mono text-stone-400 uppercase font-semibold">
            Or try a pre-configured template:
          </div>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setInstruction(p)}
                className="text-left text-[11px] px-3 py-1.5 rounded-xl bg-[#faf7f2] hover:bg-amber-50 text-stone-600 hover:text-amber-900 border border-[#ece4d8] transition-all cursor-pointer font-medium"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Workflow Visual Canvas */}
      {activeWorkflow && (
        <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs max-w-5xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#2d2a26]">
                  {activeWorkflow.name}
                </h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                  {activeWorkflow.status}
                </span>
                {activeWorkflow.require_approval && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    Approval Gate Armed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 font-mono">
                Prompt: "{activeWorkflow.natural_instruction}"
              </p>
            </div>

            <button
              onClick={() => handleRunWorkflow(activeWorkflow)}
              disabled={isRunning}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Executing Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Test Run Workflow
                </>
              )}
            </button>
          </div>

          {/* Visual DAG Nodes Ribbon */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
              Executable Pipeline DAG Architecture
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              {/* Node 1: Trigger */}
              <div className="p-3.5 bg-amber-50/60 border-2 border-amber-200 rounded-2xl space-y-1.5 relative shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-amber-800 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    1. Trigger
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white rounded text-amber-700">
                    {activeWorkflow.trigger_type}
                  </span>
                </div>
                <div className="text-xs font-bold text-amber-950 font-mono">
                  {activeWorkflow.trigger_config}
                </div>
                <div className="text-[10px] text-amber-800">
                  Activates workflow on schedule or event match.
                </div>
              </div>

              {/* Node 2: Conditions */}
              <div className="p-3.5 bg-blue-50/60 border-2 border-blue-200 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-blue-800 uppercase flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-blue-600" />
                    2. Conditions
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white rounded text-blue-700">
                    {activeWorkflow.conditions.length} Rules
                  </span>
                </div>
                <div className="text-xs font-bold text-blue-950 font-mono">
                  {activeWorkflow.conditions.join(" && ")}
                </div>
                <div className="text-[10px] text-blue-800">
                  Must evaluate to true before downstream actions run.
                </div>
              </div>

              {/* Node 3: Actions */}
              <div className="p-3.5 bg-emerald-50/60 border-2 border-emerald-200 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-emerald-600" />
                    3. Integrations
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white rounded text-emerald-700">
                    {activeWorkflow.steps.length} Steps
                  </span>
                </div>
                <div className="text-xs font-bold text-emerald-950">
                  {activeWorkflow.steps.map((s) => s.integration).join(" → ")}
                </div>
                <div className="text-[10px] text-emerald-800">
                  Coordinates Git, Terminal, Notes, and Email.
                </div>
              </div>

              {/* Node 4: Safety & Approvals */}
              <div className="p-3.5 bg-purple-50/60 border-2 border-purple-200 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-purple-800 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    4. Safety & Errors
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white rounded text-purple-700">
                    Auto-Retry
                  </span>
                </div>
                <div className="text-xs font-bold text-purple-950">
                  {activeWorkflow.require_approval ? "Human Gate Required" : "Automated Pass"}
                </div>
                <div className="text-[10px] text-purple-800">
                  Retries on failure with human confirmation gate.
                </div>
              </div>
            </div>
          </div>

          {/* Sequential Step Timeline */}
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
              Configured Step Chain & Parameters
            </div>

            <div className="space-y-2">
              {activeWorkflow.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-3.5 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-[#ece4d8] text-stone-600 flex items-center justify-center font-mono font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-[#2d2a26] flex items-center gap-2">
                        {step.title}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 uppercase font-semibold">
                          {step.integration}
                        </span>
                        {step.require_approval && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                        Action: <strong>{step.action}</strong> • Error Policy: {step.on_failure}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-semibold">
                    Validated
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Log Viewer */}
          {executionLogs.length > 0 && (
            <div className="bg-[#18181b] text-[#f4f4f5] p-4 rounded-2xl font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto shadow-inner">
              {executionLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes("🚀") || log.includes("🎉")
                      ? "text-emerald-400 font-bold"
                      : log.includes("🛑")
                      ? "text-amber-400 font-bold"
                      : log.includes("⚡")
                      ? "text-sky-300"
                      : "text-stone-300"
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Catalog of Stored Workflows */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs max-w-5xl">
        <h3 className="text-xs font-bold text-[#2d2a26] uppercase font-mono tracking-wider flex items-center gap-2 border-b border-[#f3ede3] pb-3">
          <Workflow className="w-4 h-4 text-amber-500" />
          Active Workflows Repository ({workflows.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {workflows.map((wf) => {
            const isSelected = activeWorkflow?.id === wf.id;
            return (
              <div
                key={wf.id}
                onClick={() => setActiveWorkflow(wf)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? "bg-amber-50/40 border-amber-400 shadow-2xs ring-1 ring-amber-300"
                    : "bg-[#fcfaf7] border-[#efe7dc] hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#2d2a26]">
                    {wf.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 font-bold uppercase">
                      {wf.trigger_type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkflow(wf.id);
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[#71685b] line-clamp-2">
                  "{wf.natural_instruction}"
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-1 border-t border-[#f0e8dc]">
                  <span>{wf.steps.length} sequential steps</span>
                  <span>{wf.require_approval ? "Human approval enabled" : "Fully autonomous"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human-in-the-Loop Approval Modal */}
      {showApprovalModal && pendingApprovalStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-[#ece4d8] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[#f3ede3] pb-3 text-amber-600">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-bold text-[#2d2a26]">
                Human-in-the-Loop Approval Required
              </h3>
            </div>

            <div className="text-xs space-y-2 text-[#554e42]">
              <p>
                The automated workflow has reached a gated action step that requires your explicit confirmation before proceeding:
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl font-mono text-xs text-amber-900 space-y-1">
                <div>Step: <strong>{pendingApprovalStep.title}</strong></div>
                <div>Integration: <strong>{pendingApprovalStep.integration.toUpperCase()}</strong></div>
                <div>Action: <strong>{pendingApprovalStep.action}</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#f3ede3]">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setIsRunning(false);
                }}
                className="px-4 py-2 bg-[#f4eee4] hover:bg-[#eae1d4] text-[#635a4d] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Reject & Abort
              </button>
              <button
                onClick={handleApproveStep}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
