"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { TaskHistoryView } from "@/components/TaskHistoryView";
import { MemoryExplorerView } from "@/components/MemoryExplorerView";
import { ModelManagerView } from "@/components/ModelManagerView";
import { SystemMonitorView } from "@/components/SystemMonitorView";
import { SettingsView } from "@/components/SettingsView";
import { AgentTeamView } from "@/components/AgentTeamView";
import { PredictiveRadarView } from "@/components/PredictiveRadarView";
import { NlWorkflowBuilderView } from "@/components/NlWorkflowBuilderView";
import { AutonomousSweView } from "@/components/AutonomousSweView";
import { MindGraphIntelligenceView } from "@/components/MindGraphIntelligenceView";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useAppStore } from "@/store/useAppStore";
import { safeListen, safeInvoke } from "@/lib/ipc";
import { Task, ChatSession, ChatMessage } from "@/lib/types";

export default function Home() {
  const {
    currentView,
    setTasks,
    setActiveTask,
    setCurrentPlan,
    addAgentRun,
    addToolCall,
    addToolResult,
    addEvaluation,
    addDiagnostic,
    setSupervisorHint,
    setActiveAvoStep,
    addVariationCandidate,
    appendStreamToken,
    onboardingCompleted,
    setOnboardingCompleted,
    setUserName,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    setSessionMessages,
    addSessionMessage,
    setSelectedModel,
    setTheme,
    hydrateFromStorage,
    clearStream,
  } = useAppStore();

  const [hasMounted, setHasMounted] = useState(false);

  // Restore persistent sessions, onboarding status and tasks from SQLite on boot
  useEffect(() => {
    setHasMounted(true);
    hydrateFromStorage();

    // 1. Check onboarding status
    safeInvoke<string | null>("get_setting", { key: "onboarding_completed" })
      .then((status) => {
        if (status === "true") {
          setOnboardingCompleted(true);
        } else {
          const localDone = typeof window !== "undefined" && localStorage.getItem("nexora_onboarding_completed") === "true";
          setOnboardingCompleted(localDone);
        }
      })
      .catch(() => {});

    // 2. Check saved user name
    safeInvoke<string | null>("get_setting", { key: "user_name" })
      .then((savedName) => {
        if (savedName) {
          setUserName(savedName);
        }
      })
      .catch(() => {});

    // 2.5. Check saved selected Ollama model
    safeInvoke<string | null>("get_setting", { key: "selected_model" })
      .then((savedModel) => {
        if (savedModel) {
          setSelectedModel(savedModel);
        }
      })
      .catch(() => {});

    // 2.6. Check saved theme
    safeInvoke<string | null>("get_setting", { key: "theme" })
      .then((savedTheme) => {
        if (savedTheme === "dark" || savedTheme === "light") {
          setTheme(savedTheme);
        }
      })
      .catch(() => {});

    // 3. Load chat sessions
    safeInvoke<ChatSession[]>("list_chat_sessions")
      .then((sessionList) => {
        if (sessionList && sessionList.length > 0) {
          setSessions(sessionList);
          const activeId = currentSessionId || sessionList[0].id;
          if (!currentSessionId) {
            setCurrentSessionId(activeId);
          }
          safeInvoke<ChatMessage[]>("get_session_messages", { sessionId: activeId })
            .then((msgs) => {
              if (msgs) setSessionMessages(activeId, msgs);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // 4. Load tasks
    safeInvoke<Task[]>("list_tasks")
      .then((taskList) => {
        if (!taskList || taskList.length === 0) return;
        setTasks(taskList);

        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem("nexora_last_active_task_id")
            : null;

        if (savedId) {
          const match = taskList.find((t) => t.id === savedId);
          if (match) {
            setActiveTask(match);
            return;
          }
        }

        safeInvoke<string | null>("get_setting", { key: "last_active_task_id" })
          .then((backendId) => {
            if (backendId) {
              const match = taskList.find((t) => t.id === backendId);
              if (match) {
                setActiveTask(match);
                return;
              }
            }
            const latest = taskList.find((t) => !t.is_ephemeral);
            if (latest) {
              setActiveTask(latest);
            }
          })
          .catch(() => {
            const latest = taskList.find((t) => !t.is_ephemeral);
            if (latest) {
              setActiveTask(latest);
            }
          });
      })
      .catch((err) => console.warn("Failed to restore session on boot:", err));
  }, [setActiveTask, setTasks]);

  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | null = null;

    safeListen<any>("nexora://event", (event) => {
      if (cancelled) return;
      const payload = event.payload;
      if (!payload) return;

      switch (payload.type) {
        case "TaskCreated":
        case "TaskUpdated":
          setActiveTask(payload.payload);
          break;
        case "TaskCompleted": {
          clearStream();
          const current = useAppStore.getState().activeTask;
          if (current && current.id === payload.payload.task_id) {
            setActiveTask({
              ...current,
              status: "completed",
              result: payload.payload.final_summary,
            });
          }
          const currentSession = useAppStore.getState().currentSessionId;
          if (currentSession && payload.payload.final_summary) {
            const msgs = useAppStore.getState().sessionMessages[currentSession] || [];
            const alreadyHasReply = msgs.some((m) => m.task_id === payload.payload.task_id && m.role === "assistant");
            if (!alreadyHasReply) {
              addSessionMessage({
                id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
                session_id: currentSession,
                role: "assistant",
                content: payload.payload.final_summary,
                task_id: payload.payload.task_id,
                created_at: new Date().toISOString(),
              });
            }
          }
          break;
        }
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
        case "SupervisorIntervention":
          setSupervisorHint(payload.payload);
          break;
        case "AvoStepProgress":
          setActiveAvoStep(payload.payload);
          break;
        case "VariationCandidateCreated":
          addVariationCandidate(payload.payload);
          break;
        case "StreamToken": {
          const active = useAppStore.getState().activeTask;
          const currentSession = useAppStore.getState().currentSessionId;
          if (active && (!payload.payload.task_id || active.id === payload.payload.task_id)) {
            if (!active.session_id || active.session_id === currentSession) {
              appendStreamToken(payload.payload.token);
            }
          }
          break;
        }
        case "ChatMessageAdded":
          addSessionMessage(payload.payload);
          clearStream();
          break;
        default:
          break;
      }
    }).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        unlistenFn = cleanup;
      }
    });

    return () => {
      cancelled = true;
      if (unlistenFn) {
        unlistenFn();
      }
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
    clearStream,
    addSessionMessage,
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fbf9f5]">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        {currentView === "chat" && <ChatWorkspace />}
        {currentView === "tasks" && <TaskHistoryView />}
        {currentView === "agents" && <AgentTeamView />}
        {currentView === "predictive" && <PredictiveRadarView />}
        {currentView === "workflows" && <NlWorkflowBuilderView />}
        {currentView === "swe" && <AutonomousSweView />}
        {currentView === "graph" && <MindGraphIntelligenceView />}
        {currentView === "memory" && <MemoryExplorerView />}
        {currentView === "models" && <ModelManagerView />}
        {currentView === "monitor" && <SystemMonitorView />}
        {currentView === "settings" && <SettingsView />}
      </main>

      {hasMounted && !onboardingCompleted && <OnboardingModal />}
    </div>
  );
}
