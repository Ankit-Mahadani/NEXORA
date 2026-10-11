"use client";
import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  Check,
  User,
  MessageSquare,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import { VioletAtmosphericSphere } from "./VioletAtmosphericSphere";
import { useAppStore } from "@/store/useAppStore";
import { safeInvoke, isTauri } from "@/lib/ipc";
import { Task, OllamaModelInfo, ChatSession, ChatMessage } from "@/lib/types";

export function ChatWorkspace() {
  const {
    tasks,
    setTasks,
    selectedModel,
    setSelectedModel,
    isTemporaryChat,
    setTemporaryChat,
    userName,
    theme,
    setTheme,
    activeTask,
    setActiveTask,
    currentPlan,
    toolResults,
    evaluations,
    streamingOutput,
    clearStream,
    sessions,
    setSessions,
    addSession,
    currentSessionId,
    setCurrentSessionId,
    sessionMessages,
    setSessionMessages,
    addSessionMessage,
    inputHistory,
    addInputHistory,
    setCurrentView,
    supervisorHint,
    activeAvoStep,
    variationCandidates,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [availableModels, setAvailableModels] = useState<OllamaModelInfo[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micStatus, setMicStatus] = useState<string | null>(null);
  const listeningActiveRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const [taskRating, setTaskRating] = useState<Record<string, "good" | "bad">>({});
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);

  // Terminal CMD-style Arrow Up / Down navigation
  const historyIndexRef = useRef<number>(-1);
  const draftRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentMessages: ChatMessage[] = currentSessionId ? sessionMessages[currentSessionId] || [] : [];

  // Scroll to bottom on new messages or active streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length, streamingOutput, isSubmitting]);

  const handleRateTask = async (taskId: string, rating: "good" | "bad") => {
    setTaskRating((prev) => ({ ...prev, [taskId]: rating }));
    try {
      await safeInvoke("rate_task", { task_id: taskId, rating });
      setRatingMessage(
        rating === "good"
          ? "Logged as helpful! Learned for future tasks."
          : "Feedback recorded. Strategy marked to avoid."
      );
      setTimeout(() => setRatingMessage(null), 3500);
    } catch (err) {
      console.warn("Could not submit rating:", err);
    }
  };

  useEffect(() => {
    safeInvoke<OllamaModelInfo[]>("list_models")
      .then((models) => {
        if (models && models.length > 0) {
          setAvailableModels(models);
        }
      })
      .catch((err) => console.warn("Could not load models in chat header:", err));
  }, []);

  // Ensure an active session exists
  const ensureSession = async (titleSeed?: string): Promise<string> => {
    if (currentSessionId) {
      return currentSessionId;
    }
    const cleanTitle = titleSeed ? titleSeed.slice(0, 36) : "New Conversation";
    try {
      const newSession = await safeInvoke<ChatSession>("create_chat_session", {
        title: cleanTitle,
        is_ephemeral: isTemporaryChat,
      });
      addSession(newSession);
      setCurrentSessionId(newSession.id);
      return newSession.id;
    } catch (err) {
      const fallbackId = "session-" + Date.now();
      const fallbackSession: ChatSession = {
        id: fallbackId,
        title: cleanTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_ephemeral: isTemporaryChat,
      };
      addSession(fallbackSession);
      setCurrentSessionId(fallbackId);
      return fallbackId;
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    clearStream();
    setIsSubmitting(false);
    setActiveTask(null);

    if (!sessionId) {
      // Start a brand new session
      const newSession = await safeInvoke<ChatSession>("create_chat_session", {
        title: "New Conversation",
        is_ephemeral: isTemporaryChat,
      });
      addSession(newSession);
      setCurrentSessionId(newSession.id);
      return;
    }
    setCurrentSessionId(sessionId);

    if (!sessionMessages[sessionId]) {
      try {
        const msgs = await safeInvoke<ChatMessage[]>("get_session_messages", {
          sessionId,
        });
        if (msgs) setSessionMessages(sessionId, msgs);
      } catch (_) {}
    }
  };

  // Offline-capable speech recognition
  const toggleListening = async () => {
    if (isListening) {
      listeningActiveRef.current = false;
      setIsListening(false);
      setMicStatus(null);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
        recognitionRef.current = null;
      }
      safeInvoke("cancel_speech_offline").catch(() => {});
      return;
    }

    listeningActiveRef.current = true;
    setIsListening(true);
    setMicStatus("Listening locally... Speak clearly into your mic");

    if (isTauri()) {
      safeInvoke<string>("listen_speech_offline", { timeout_seconds: 10 })
        .then((recognizedText) => {
          if (listeningActiveRef.current) {
            if (recognizedText && recognizedText.trim()) {
              setInputPrompt((prev) =>
                prev ? `${prev} ${recognizedText.trim()}` : recognizedText.trim()
              );
              setMicStatus("Speech transcribed successfully");
              setTimeout(() => setMicStatus(null), 3000);
            } else {
              setMicStatus("No speech detected. Press mic again or use Win+H.");
              setTimeout(() => setMicStatus(null), 4000);
            }
            setIsListening(false);
            listeningActiveRef.current = false;
          }
        })
        .catch((err) => {
          console.warn("Offline native speech recognition error:", err);
          if (listeningActiveRef.current) {
            setIsListening(false);
            listeningActiveRef.current = false;
            setMicStatus("Mic notice: Press Win + H to dictate directly!");
            setTimeout(() => setMicStatus(null), 4000);
          }
        });
      return;
    }

    // Web Speech API fallback for browsers
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setIsListening(false);
      listeningActiveRef.current = false;
      setMicStatus("Tip: Press Win + H on your keyboard to dictate directly!");
      setTimeout(() => setMicStatus(null), 5000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => (result as any)[0].transcript)
          .join("");
        setInputPrompt(transcript);
        setMicStatus("Recognizing...");
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        listeningActiveRef.current = false;
        setMicStatus(`Mic status: ${event.error}. Tip: Press Win + H to dictate.`);
        setTimeout(() => setMicStatus(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
        listeningActiveRef.current = false;
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
      listeningActiveRef.current = false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isSubmitting) return;

    if (isListening) {
      setIsListening(false);
    }

    const promptText = inputPrompt.trim();
    setIsSubmitting(true);
    clearStream();

    // Reset CMD history traversal
    addInputHistory(promptText);
    historyIndexRef.current = -1;
    draftRef.current = "";

    try {
      // 1. Ensure or create multi-message session
      const activeSessionId = await ensureSession(promptText);

      // 2. Add user message to session message thread
      const userMessage: ChatMessage = {
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        session_id: activeSessionId,
        role: "user",
        content: promptText,
        created_at: new Date().toISOString(),
      };
      addSessionMessage(userMessage);
      safeInvoke("save_chat_message", { message: userMessage }).catch(() => {});

      setInputPrompt("");

      // 3. Run the task within this session
      const task = await safeInvoke<Task>("create_and_run_task", {
        title: promptText.slice(0, 40),
        objective: promptText,
        model: selectedModel,
        is_ephemeral: isTemporaryChat,
        isEphemeral: isTemporaryChat,
        session_id: activeSessionId,
        sessionId: activeSessionId,
      });

      setActiveTask(task);
      setTasks([task, ...tasks.filter((t) => t.id !== task.id)]);

      if (!isTemporaryChat) {
        safeInvoke("set_setting", {
          key: "last_active_task_id",
          value: task.id,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to execute prompt in session:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // CMD-Style Terminal Arrow Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === "ArrowUp") {
      // If cursor is at start (or single-line text), recall earlier history commands
      const isAtStart =
        textarea.selectionStart === 0 && textarea.selectionEnd === 0;
      if (isAtStart && inputHistory.length > 0) {
        e.preventDefault();
        if (historyIndexRef.current === -1) {
          draftRef.current = inputPrompt;
        }
        const nextIndex = Math.min(
          historyIndexRef.current + 1,
          inputHistory.length - 1
        );
        historyIndexRef.current = nextIndex;
        setInputPrompt(inputHistory[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndexRef.current >= 0) {
        e.preventDefault();
        const prevIndex = historyIndexRef.current - 1;
        historyIndexRef.current = prevIndex;
        if (prevIndex === -1) {
          setInputPrompt(draftRef.current);
        } else {
          setInputPrompt(inputHistory[prevIndex]);
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fbf9f5] text-[#2d2a26] overflow-hidden">
      {/* Top Atmospheric Header */}
      <header className="h-16 border-b border-[#ece4d8] px-8 flex items-center justify-between bg-white/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f6f1e8] border border-[#ebe1d3] shadow-sm hover:border-violet-300 transition-colors">
            <Cpu className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span className="text-[11px] font-mono text-[#786f63]">Engine:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-[11px] font-mono text-violet-800 font-semibold focus:outline-none cursor-pointer pr-1"
              suppressHydrationWarning
            >
              {availableModels.map((m) => (
                <option key={m.name} value={m.name} className="text-[#2d2a26] font-sans">
                  {m.name}
                </option>
              ))}
              {availableModels.length === 0 && (
                <option value={selectedModel} className="text-[#2d2a26] font-sans" suppressHydrationWarning>
                  {selectedModel}
                </option>
              )}
            </select>
          </div>

          {/* Persistent Multi-Message Session Switcher */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f6f1e8] border border-[#ebe1d3] shadow-xs">
            <MessageSquare className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span className="text-[11px] font-mono text-[#786f63]">Session:</span>
            <select
              value={currentSessionId || ""}
              onChange={(e) => handleSelectSession(e.target.value)}
              className="bg-transparent text-[11px] text-[#2d2a26] font-medium focus:outline-none cursor-pointer max-w-[170px] truncate pr-1"
              suppressHydrationWarning
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title ? s.title.slice(0, 26) : "Conversation"}
                </option>
              ))}
              {sessions.length === 0 && (
                <option value="">Active Conversation</option>
              )}
            </select>
          </div>

          <button
            onClick={() => handleSelectSession("")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-[#f6f1e8] hover:bg-white text-[#5e564a] hover:text-[#2d2a26] border border-[#ebe1d3] hover:border-violet-300 transition-all cursor-pointer shadow-2xs"
            title="Start a new chat thread (past conversations are preserved)"
          >
            <Plus className="w-3.5 h-3.5 text-violet-600" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTemporaryChat(!isTemporaryChat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              isTemporaryChat
                ? "bg-amber-50 text-amber-900 border-amber-300 shadow-xs"
                : "bg-[#f6f1e8] text-[#786f63] border-[#ebe1d3] hover:border-violet-300"
            }`}
            title="Temporary Chat: will not record permanent memories"
          >
            <EyeOff
              className={`w-3.5 h-3.5 ${
                isTemporaryChat ? "text-amber-600" : "text-[#786f63]"
              }`}
            />
            <span>{isTemporaryChat ? "Temporary Mode ON" : "Temporary Chat"}</span>
          </button>

          {/* Quick Theme Switcher (White is default) */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-[#f6f1e8] hover:bg-white text-[#5e564a] hover:text-[#2d2a26] border border-[#ebe1d3] hover:border-violet-300 transition-all cursor-pointer shadow-2xs"
            title={theme === "light" ? "Switch to Dark (Obsidian) theme" : "Switch to Light (White) default theme"}
          >
            {theme === "light" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20" />
                <span>Dark</span>
              </>
            )}
          </button>

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
        {/* Left: Continuous Multi-Message Thread */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto p-8 space-y-6">
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            {/* If there are no messages yet in this session, show welcoming sphere & quick suggestions */}
            {mounted && currentMessages.length === 0 && !activeTask && (
              <div className="text-center pt-8 pb-4 space-y-4">
                <div className="flex justify-center mb-3">
                  <VioletAtmosphericSphere
                    isProcessing={Boolean(activeTask || isSubmitting)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-base font-medium text-[#9d7cf7]" suppressHydrationWarning>
                    {userName ? `Hello, ${userName}` : "Welcome to Nexora"}
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1c1917]">
                    How can I assist you today?
                  </h1>
                  <p className="text-xs text-[#7e7568] max-w-md mx-auto pt-1 leading-relaxed">
                    Continuous multi-turn desktop assistant. Use Up/Down arrows to cycle commands like in terminal.
                  </p>
                  {isTemporaryChat && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium mt-2">
                      <EyeOff className="w-3 h-3 text-amber-600" />
                      Temporary Mode: No memories or history will be retained.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 text-left">
                  {[
                    "Do college assignment from Google Classroom (Handwritten notes)",
                    "Take a screenshot of the screen and save to Desktop",
                    'Open Spotify and play "chamak chalo"',
                    "Make a text file on Desktop, write inside, open and close in Notepad",
                    "Schedule computer shutdown after 10 minutes",
                    "Check Google Classroom, generate handwritten assignment PDF, and turn in",
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
              </div>
            )}

            {/* Continuous Conversation Stream */}
            {currentMessages.length > 0 && (
              <div className="space-y-5 pb-2">
                {currentMessages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isUser ? "items-end" : "items-start"
                      } space-y-1.5`}
                    >
                      <div className="flex items-center gap-2 px-1 text-[10px] text-[#8e8577] font-mono">
                        {isUser ? (
                          <>
                            <span>{userName || "You"}</span>
                            <User className="w-3 h-3 text-amber-600" />
                          </>
                        ) : (
                          <>
                            <img src="/logo.png" alt="Nexora" className="w-3.5 h-3.5 object-contain inline-block" />
                            <span>Nexora</span>
                          </>
                        )}
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div
                        className={`rounded-3xl p-5 text-xs leading-relaxed max-w-xl transition-all ${
                          isUser
                            ? "bg-[#f3ede3] text-[#2d2a26] rounded-br-sm border border-[#e5dcce] shadow-xs font-medium"
                            : "bg-white text-[#2d2a26] rounded-bl-sm border border-[#ece4d8] shadow-sm shadow-stone-900/5"
                        }`}
                      >
                        <div className="whitespace-pre-wrap select-text">
                          {msg.content}
                        </div>

                        {/* If assistant reply and has associated task, show rating buttons */}
                        {!isUser && msg.task_id && (
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#f4ede3] text-[11px]">
                            <span className="text-[#8a8174]">Rate execution:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRateTask(msg.task_id!, "good")}
                                className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[10px] transition-all cursor-pointer ${
                                  taskRating[msg.task_id!] === "good"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                                    : "bg-white hover:bg-[#fbf9f5] text-[#6d6457] border-[#ece4d8]"
                                }`}
                                title="Mark as good answer (learns preference)"
                              >
                                <ThumbsUp className="w-3 h-3 text-emerald-600" />
                                <span>Good</span>
                              </button>
                              <button
                                onClick={() => handleRateTask(msg.task_id!, "bad")}
                                className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[10px] transition-all cursor-pointer ${
                                  taskRating[msg.task_id!] === "bad"
                                    ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold"
                                    : "bg-white hover:bg-[#fbf9f5] text-[#6d6457] border-[#ece4d8]"
                                }`}
                                title="Mark as needing fix (avoids approach)"
                              >
                                <ThumbsDown className="w-3 h-3 text-rose-600" />
                                <span>Needs Fix</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* In-progress Assistant Chat Bubble */}
            {(isSubmitting || (streamingOutput && (!activeTask || !activeTask.session_id || activeTask.session_id === currentSessionId))) && (
              <div className="flex flex-col items-start space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 px-1 text-[10px] text-[#8e8577] font-mono">
                  <img src="/logo.png" alt="Nexora" className="w-3.5 h-3.5 object-contain inline-block" />
                  <span>Nexora</span>
                  {!streamingOutput && (
                    <span className="text-violet-600 animate-pulse font-sans">thinking...</span>
                  )}
                </div>

                <div className="rounded-3xl p-5 text-xs leading-relaxed max-w-xl bg-white text-[#2d2a26] rounded-bl-sm border border-[#ece4d8] shadow-sm shadow-stone-900/5">
                  {streamingOutput ? (
                    <div className="whitespace-pre-wrap select-text leading-relaxed">
                      {streamingOutput}
                      <span className="inline-block w-1.5 h-3 ml-1 bg-violet-600 animate-pulse align-middle" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 py-1 text-violet-600">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NVIDIA AVO Flowchart Progress Tracker */}
            {(activeAvoStep || supervisorHint || (activeTask && activeTask.status !== "completed")) && (
              <div className="bg-white dark:bg-[#0a0a0a] border border-[#ece4d8] dark:border-[#1f1f1f] rounded-3xl p-5 space-y-4 shadow-sm shadow-stone-900/5 animate-in fade-in duration-200">
                {/* Supervisor Hint Intervention */}
                {supervisorHint && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
                        <span>🧬</span>
                        Supervisor Hint Intervention
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                        {supervisorHint.strategy}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed font-sans">
                      {supervisorHint.hint}
                    </p>
                  </div>
                )}

                {/* AVO Agentic Variation Loop Step Flow */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#443e34] dark:text-[#d4d4d8] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <span>🧬</span>
                      AVO Variation Loop: Step {activeAvoStep?.step_number || 1} / 6
                    </span>
                    <button
                      onClick={() => setCurrentView("memory")}
                      className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      View Persistent Graph (Neo4j) →
                    </button>
                  </div>

                  {/* Steps Pill Strip */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px] font-mono">
                    {[
                      { num: 1, name: "1. Inspect Lineage" },
                      { num: 2, name: "2. Plan Variation" },
                      { num: 3, name: "3. Implement Cand." },
                      { num: 4, name: "4. Ground & Exec" },
                      { num: 5, name: "5. Score & Eval" },
                      { num: 6, name: "6. Diagnose & Rep" },
                    ].map((step) => {
                      const isCurrent = activeAvoStep?.step_number === step.num;
                      const isPassed = (activeAvoStep?.step_number || 0) > step.num;
                      return (
                        <div
                          key={step.num}
                          className={`p-2 rounded-xl text-center border transition-all ${
                            isCurrent
                              ? "bg-violet-600 text-white border-violet-600 font-bold shadow-xs animate-pulse"
                              : isPassed
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40"
                              : "bg-[#faf7f2] dark:bg-[#121212] text-[#8e8475] dark:text-[#a1a1aa] border-[#ece4d8] dark:border-[#1f1f1f]"
                          }`}
                        >
                          <div className="truncate">{step.name}</div>
                        </div>
                      );
                    })}
                  </div>

                  {activeAvoStep && (
                    <div className="text-[11px] text-[#635b4f] dark:text-[#a1a1aa] bg-[#faf7f2] dark:bg-[#121212] p-2.5 rounded-xl border border-[#ece4d8] dark:border-[#1f1f1f] leading-relaxed">
                      <strong>Current Activity:</strong> {activeAvoStep.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Currently Active Executing Task Details (for Actionable Tasks with plans) */}
            {activeTask && activeTask.status !== "completed" && currentPlan && (
              <div className="bg-white border border-[#ece4d8] rounded-3xl p-6 shadow-sm shadow-stone-900/5 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-mono text-[#8c8275] border-b border-[#f3ede3] pb-3">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-500" />
                    EXECUTING TASK:{" "}
                    <strong className="text-[#2d2a26]">
                      {activeTask.id.slice(0, 8)}
                    </strong>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[11px] font-semibold animate-pulse">
                    Iteration {activeTask.current_iteration}/
                    {activeTask.max_iterations}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#2d2a26] leading-relaxed">
                  {activeTask.objective}
                </p>
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
                        <p className="text-[11px] text-[#736a5c] mt-1.5 pl-7 leading-relaxed">
                          {st.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-[#f3ece0] text-[#635b4f] border border-[#e8dfd2] shrink-0 font-medium">
                        {st.assigned_agent}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ratingMessage && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{ratingMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Calm, Floating Input Box with CMD Arrow Navigation */}
          <form
            onSubmit={handleSubmit}
            className="relative mt-auto pt-4 max-w-2xl mx-auto w-full shrink-0"
          >
            <div className="relative bg-white border border-[#e8dfd2] rounded-3xl shadow-lg shadow-stone-900/5 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 transition-all duration-300">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask NEXORA anything... (Press ↑/↓ to recall previous inputs)"
                rows={3}
                className="w-full bg-transparent p-5 text-xs text-[#2d2a26] placeholder-[#9f9588] focus:outline-none resize-none leading-relaxed"
                onKeyDown={handleKeyDown}
              />
              <div className="px-5 py-3.5 border-t border-[#f4ede3] flex items-center justify-between bg-[#fdfcfa] rounded-b-3xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={
                      isListening
                        ? "Listening... Click to stop"
                        : "Offline Speech Recognition (or press Win+H)"
                    }
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

                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#938a7c]">
                      {isListening ? (
                        <span className="text-rose-600 font-medium flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          Listening offline... (speak clearly)
                        </span>
                      ) : micStatus ? (
                        <span className="text-violet-700 font-medium text-[10px]">
                          {micStatus}
                        </span>
                      ) : (
                        "Press mic or Win+H to dictate | ↑/↓ for history"
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 disabled:opacity-40 text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-violet-500/25 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? "Running..." : "Send"}
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
                  key={`${tr.call_id || "call"}-${idx}`}
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
                <div key={`${ev.id || "eval"}-${i}`} className="text-xs space-y-2">
                  <div className="flex justify-between items-center text-[#2d2a26] font-mono text-xs">
                    <span>
                      Score:{" "}
                      <strong className="text-violet-700">
                        {(ev.score * 100).toFixed(0)}%
                      </strong>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ev.passed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
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
