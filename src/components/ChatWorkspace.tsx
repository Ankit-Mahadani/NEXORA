"use client";

import React, { useState } from "react";
import {
  Send,
  Sparkles,
  Bot,
  Play,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Activity,
  ArrowRight,
  Cpu,
  Layers,
  Heart,
  Mic,
  MicOff,
} from "lucide-react";
import { VioletAtmosphericSphere } from "./VioletAtmosphericSphere";
import { useAppStore } from "@/store/useAppStore";
import { safeInvoke } from "@/lib/ipc";
import { Task } from "@/lib/types";

export function ChatWorkspace() {
  const {
    selectedModel,
    activeTask,
    setActiveTask,
    currentPlan,
    toolResults,
    evaluations,
    streamingOutput,
    clearStream,
  } = useAppStore();

  const [inputPrompt, setInputPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Offline-capable speech recognition using browser built-in Web Speech API
  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      alert("Speech recognition is not supported in this environment.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInputPrompt(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isSubmitting) return;

    if (isListening) {
      setIsListening(false);
    }

    setIsSubmitting(true);
    clearStream();

    try {
      const task = await safeInvoke<Task>("create_and_run_task", {
        title: inputPrompt.slice(0, 40),
        objective: inputPrompt,
        model: selectedModel,
      });
      setActiveTask(task);
      setInputPrompt("");
    } catch (err) {
      console.error("Failed to run task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fbf9f5] text-[#2d2a26] overflow-hidden">
      {/* Top Atmospheric Header */}
      <header className="h-16 border-b border-[#ece4d8] px-8 flex items-center justify-between bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f6f1e8] border border-[#ebe1d3] shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-[11px] font-mono text-[#786f63]">Engine:</span>
            <span className="text-[11px] font-mono text-violet-800 font-semibold">{selectedModel}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTask ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-mono shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
              </span>
              <span>{activeTask.status.toUpperCase()}</span>
            </div>
          ) : (
            <div className="text-[11px] text-[#8a8174] font-medium flex items-center gap-1.5 bg-[#f4eee4] px-3 py-1 rounded-full border border-[#ece4d8]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Serene & Ready
            </div>
          )}
        </div>
      </header>

      {/* Main split area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Central AI Sphere & Assistant Chat */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto p-8 space-y-6">
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            {/* The Central Violet Sphere / Glowing Aura */}
            <div className="text-center pt-8 pb-4 space-y-4">
              <div className="flex justify-center mb-3">
                <VioletAtmosphericSphere isProcessing={Boolean(activeTask || isSubmitting)} />
              </div>

              {/* Personalized Warm Greeting matching user screenshot */}
              <div className="space-y-1">
                <div className="text-base font-medium text-[#9d7cf7]">
                  Hello, Ankit
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1c1917]">
                  How can I assist you today?
                </h1>
                <p className="text-xs text-[#7e7568] max-w-md mx-auto pt-1 leading-relaxed">
                  Your local multi-agent intelligence assistant. Plan, inspect, execute, and evaluate.
                </p>
              </div>

              {/* Atmospheric suggestion pills */}
              {!activeTask && (
                <div className="grid grid-cols-2 gap-2.5 pt-3 text-left">
                  {[
                    "Explore workspace files & project structure",
                    "Analyze repository architecture & dependencies",
                    "Check system health, memory & CPU usage",
                    "Verify code modules with automated diagnostics"
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setInputPrompt(preset)}
                      className="p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-[#ece4d8] hover:border-violet-300 text-[11px] text-[#5e564a] hover:text-[#2d2a26] transition-all duration-200 text-left group flex items-start justify-between shadow-xs hover:shadow-md hover:shadow-violet-900/5 cursor-pointer"
                    >
                      <span className="leading-snug">{preset}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#b5aa9b] group-hover:text-violet-600 shrink-0 ml-2 mt-0.5 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active task banner */}
            {activeTask && (
              <div className="bg-white border border-[#ece4d8] rounded-3xl p-6 shadow-sm shadow-stone-900/5 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-[#8c8275] border-b border-[#f3ede3] pb-3">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-500" />
                    TASK: <strong className="text-[#2d2a26]">{activeTask.id.slice(0, 8)}</strong>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[11px] font-semibold">
                    Iteration {activeTask.current_iteration}/{activeTask.max_iterations}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#2d2a26] leading-relaxed">{activeTask.objective}</p>
              </div>
            )}

            {/* Structured Plan Visualizer */}
            {currentPlan && (
              <div className="bg-white border border-[#ece4d8] rounded-3xl p-6 space-y-4 shadow-sm shadow-stone-900/5">
                <div className="text-xs font-semibold text-[#665e52] uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-violet-600" />
                  Supervisor Execution Plan
                </div>
                <div className="space-y-2.5">
                  {currentPlan.subtasks.map((st, i) => (
                    <div
                      key={st.id || i}
                      className="p-4 bg-[#fcfaf7] hover:bg-white rounded-2xl border border-[#efe7dc] text-xs flex items-start justify-between gap-4 transition-all"
                    >
                      <div>
                        <div className="font-semibold text-[#2d2a26] flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-mono font-bold">
                            {i + 1}
                          </span>
                          {st.title}
                        </div>
                        <p className="text-[11px] text-[#736a5c] mt-1.5 pl-7 leading-relaxed">{st.description}</p>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-[#f3ece0] text-[#635b4f] border border-[#e8dfd2] shrink-0 font-medium">
                        {st.assigned_agent}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Streaming Specialist Reasoning */}
            {streamingOutput && (
              <div className="bg-white border border-[#ece4d8] rounded-3xl p-6 space-y-3 shadow-sm shadow-stone-900/5">
                <div className="text-xs font-mono text-violet-700 font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-600" />
                  Agent Thought & Streaming Reflections:
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-[#2d2a26] leading-relaxed bg-[#fbf9f5] p-5 rounded-2xl border border-[#ece4d8] overflow-x-auto">
                  {streamingOutput}
                </pre>
              </div>
            )}
          </div>

          {/* Calm, Floating Input Box */}
          <form onSubmit={handleSubmit} className="relative mt-auto pt-4 max-w-2xl mx-auto w-full">
            <div className="relative bg-white border border-[#e8dfd2] rounded-3xl shadow-lg shadow-stone-900/5 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 transition-all duration-300">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask NEXORA AI to explore, build, or analyze..."
                rows={3}
                className="w-full bg-transparent p-5 text-xs text-[#2d2a26] placeholder-[#9f9588] focus:outline-none resize-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="px-5 py-3.5 border-t border-[#f4ede3] flex items-center justify-between bg-[#fdfcfa] rounded-b-3xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Listening... click to stop" : "Voice input (offline speech recognition)"}
                    className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer ${
                      isListening
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse scale-105"
                        : "bg-[#f4ede3] hover:bg-[#eae1d4] text-[#6b6255] hover:text-[#2d2a26]"
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <span className="text-[11px] text-[#938a7c]">
                    {isListening ? (
                      <span className="text-rose-600 font-medium flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                        Listening locally...
                      </span>
                    ) : (
                      "Press mic or Enter to submit"
                    )}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 disabled:opacity-40 text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-violet-500/25 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Task
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right: Observable Evidence & Trace Cards */}
        <div className="w-[400px] border-l border-[#ece4d8] bg-[#fbf8f2]/90 backdrop-blur-md p-6 flex flex-col space-y-4 overflow-y-auto shrink-0 shadow-[-2px_0_12px_rgba(0,0,0,0.01)]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#696154] flex items-center justify-between pb-2 border-b border-[#ece4d8]">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-600" />
              Observable Evidence
            </span>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-full border border-[#ece4d8] text-[#7a7164]">
              {toolResults.length} events
            </span>
          </div>

          {toolResults.length === 0 ? (
            <div className="text-[11px] text-[#918778] text-center py-16 px-4 border border-dashed border-[#e6ddd0] rounded-3xl bg-white/40">
              Tool observations (exit codes, stdout, files inspected) will gracefully appear here during execution.
            </div>
          ) : (
            <div className="space-y-3.5">
              {toolResults.map((tr, idx) => (
                <div
                  key={tr.call_id || idx}
                  className="bg-white border border-[#ece4d8] rounded-2xl p-4 text-xs space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-violet-800 font-semibold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#857b6d]" />
                      {tr.tool_name}
                    </span>
                    <span
                      className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                        tr.success
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {tr.success ? "SUCCESS" : "FAILED"}
                    </span>
                  </div>

                  {tr.stdout && (
                    <div className="bg-[#fbf9f5] p-3 rounded-xl text-[11px] font-mono text-[#38332d] max-h-36 overflow-y-auto border border-[#efe7dc] whitespace-pre-wrap">
                      {tr.stdout}
                    </div>
                  )}

                  {tr.stderr && (
                    <div className="bg-rose-50 p-3 rounded-xl text-[11px] font-mono text-rose-800 max-h-36 overflow-y-auto border border-rose-100 whitespace-pre-wrap">
                      {tr.stderr}
                    </div>
                  )}

                  <div className="text-[10px] text-[#8e8577] flex justify-between font-mono pt-1.5 border-t border-[#f4ede3]">
                    <span>Duration: {tr.duration_ms}ms</span>
                    <span>Exit: {tr.exit_code ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Evaluation Score Summary */}
          {evaluations.length > 0 && (
            <div className="bg-white border border-[#ece4d8] rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="text-xs font-bold text-[#2d2a26] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Evidence Evaluation
              </div>
              {evaluations.map((ev, i) => (
                <div key={ev.id || i} className="text-xs space-y-2">
                  <div className="flex justify-between items-center text-[#2d2a26] font-mono text-xs">
                    <span>Score: <strong className="text-violet-700">{(ev.score * 100).toFixed(0)}%</strong></span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ev.passed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                      {ev.passed ? "PASSED" : "REVISE"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#786e60] bg-[#fbf9f5] p-3 rounded-xl border border-[#efe7dc]">
                    {ev.evidence.join("; ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
