"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { TaskHistoryView } from "@/components/TaskHistoryView";
import { MemoryExplorerView } from "@/components/MemoryExplorerView";
import { ModelManagerView } from "@/components/ModelManagerView";
import { SystemMonitorView } from "@/components/SystemMonitorView";
import { SettingsView } from "@/components/SettingsView";
import { useAppStore } from "@/store/useAppStore";
import { safeListen } from "@/lib/ipc";

export default function Home() {
  const {
    currentView,
    setActiveTask,
    setCurrentPlan,
    addAgentRun,
    addToolCall,
    addToolResult,
    addEvaluation,
    addDiagnostic,
    appendStreamToken,
  } = useAppStore();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    safeListen<any>("nexora://event", (event) => {
      const payload = event.payload;
      if (!payload) return;

      switch (payload.type) {
        case "TaskCreated":
        case "TaskUpdated":
          setActiveTask(payload.payload);
          break;
        case "PlanGenerated":
          setCurrentPlan(payload.payload);
          break;
        case "AgentStarted":
          addAgentRun(payload.payload);
          break;
        case "ToolCallRequested":
          addToolCall(payload.payload);
          break;
        case "ToolCallCompleted":
          addToolResult(payload.payload);
          break;
        case "CandidateEvaluated":
          addEvaluation(payload.payload);
          break;
        case "DiagnosticGenerated":
          addDiagnostic(payload.payload);
          break;
        case "StreamToken":
          appendStreamToken(payload.payload.token);
          break;
        default:
          break;
      }
    }).then((cleanup) => {
      unlisten = cleanup;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [
    setActiveTask,
    setCurrentPlan,
    addAgentRun,
    addToolCall,
    addToolResult,
    addEvaluation,
    addDiagnostic,
    appendStreamToken,
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c0f]">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        {currentView === "chat" && <ChatWorkspace />}
        {currentView === "tasks" && <TaskHistoryView />}
        {currentView === "agents" && <ChatWorkspace />}
        {currentView === "memory" && <MemoryExplorerView />}
        {currentView === "models" && <ModelManagerView />}
        {currentView === "monitor" && <SystemMonitorView />}
        {currentView === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
