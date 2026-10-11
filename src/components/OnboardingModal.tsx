"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  User,
  Sliders,
  FolderOpen,
  Mic,
  Volume2,
  CheckCircle2,
  Compass,
  ArrowRight,
  Play,
  Cpu,
  Check,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { useAppStore } from "@/store/useAppStore";
import { OllamaModelInfo } from "@/lib/types";

export function OnboardingModal() {
  const {
    userName,
    setUserName,
    setOnboardingCompleted,
    selectedModel,
    setSelectedModel,
    selectedMicrophone,
    setSelectedMicrophone,
    selectedSpeaker,
    setSelectedSpeaker,
  } = useAppStore();

  const [nameInput, setNameInput] = useState("");
  const [tone, setTone] = useState<"concise" | "analytical" | "warm">("concise");
  const [saveFolder, setSaveFolder] = useState("Desktop");
  const [browser, setBrowser] = useState("Chrome");
  const [availableModels, setAvailableModels] = useState<OllamaModelInfo[]>([]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Populate audio devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
          setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
        })
        .catch(() => {});
    }

    // Populate detected Ollama models
    safeInvoke<OllamaModelInfo[]>("list_models")
      .then((models) => {
        if (models && models.length > 0) {
          setAvailableModels(models);
        }
      })
      .catch(() => {});
  }, []);

  const handleTestSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } catch (_) {}
  };

  const handleComplete = async () => {
    const finalName = nameInput.trim() || "User";
    setIsSubmitting(true);

    try {
      setUserName(finalName);
      await safeInvoke("set_setting", { key: "user_name", value: finalName });
      await safeInvoke("set_setting", { key: "assistant_tone", value: tone });
      await safeInvoke("set_setting", { key: "selected_model", value: selectedModel });
      await safeInvoke("set_setting", { key: "default_save_folder", value: saveFolder });
      await safeInvoke("set_setting", { key: "preferred_browser", value: browser });
      await safeInvoke("set_setting", { key: "selected_microphone", value: selectedMicrophone });
      await safeInvoke("set_setting", { key: "selected_speaker", value: selectedSpeaker });
      await safeInvoke("set_setting", { key: "onboarding_completed", value: "true" });

      // Save initial memory in local SQLite so specialist agents know who they are serving
      await safeInvoke("save_chat_message", {
        message: {
          id: "intro-" + Date.now(),
          session_id: "system-bootstrap",
          role: "system",
          content: `User initialized setup. Name: ${finalName}. Preferred tone: ${tone}. Default folder: ${saveFolder}.`,
          created_at: new Date().toISOString(),
        },
      }).catch(() => {});

      setOnboardingCompleted(true);
    } catch (err) {
      console.warn("Failed saving onboarding settings:", err);
      setOnboardingCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241f1a]/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#fdfbf7] border border-[#ece4d8] shadow-2xl shadow-stone-900/15 overflow-hidden text-[#2d2a26]">
        {/* Ambient Top Glow Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-gradient-to-b from-violet-300/35 via-pink-200/15 to-transparent blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-b from-white/80 to-transparent border-b border-[#ece4d8]/80">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/40 to-amber-300/40 rounded-2xl blur-xs opacity-75"></div>
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-[#121212] border border-[#f0e8dc] dark:border-[#262626] overflow-hidden shadow-sm p-2">
                <img
                  src="/logo.png"
                  alt="NEXORA Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-[#1c1917]">
                  Welcome to NEXORA
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold border border-violet-200">
                  SETUP
                </span>
              </div>
              <p className="text-[11px] text-[#857b6d] font-mono tracking-wide mt-0.5">
                LOCAL SOVEREIGN WORKSPACE PERSONALIZATION
              </p>
            </div>
          </div>
          <p className="text-xs text-[#665e52] leading-relaxed mt-2.5">
            Nexora runs 100% locally with zero prior assumptions. Tell Nexora how to address you and configure your workstation defaults.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {step === 1 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#38332d] uppercase tracking-wider flex items-center gap-2">
                  <User className="h-4 w-4 text-violet-600" /> What should Nexora call you?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name or preferred moniker..."
                    autoFocus
                    className="w-full rounded-2xl bg-white border border-[#e5dcce] px-4 py-3.5 text-xs text-[#1c1917] placeholder-[#a3988b] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all shadow-xs font-medium"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && nameInput.trim()) {
                        setStep(2);
                      }
                    }}
                  />
                </div>
                <span className="text-[11px] text-[#8c8275] block">
                  Stored strictly locally in your machine&apos;s SQLite database.
                </span>
              </div>

              {/* Tone Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-[#38332d] uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-violet-600" /> Preferred Interaction Style
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: "concise",
                      label: "Concise",
                      desc: "Direct, minimal chatter, rapid execution",
                    },
                    {
                      id: "analytical",
                      label: "Analytical",
                      desc: "In-depth rationale and step details",
                    },
                    {
                      id: "warm",
                      label: "Warm",
                      desc: "Supportive, conversational companion",
                    },
                  ].map((t) => {
                    const isSelected = tone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "bg-white border-violet-500 shadow-md shadow-violet-900/5 ring-2 ring-violet-200"
                            : "bg-[#f8f5ee]/70 border-[#e8dfd3] hover:bg-white hover:border-violet-200 text-[#5c5447]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-xs font-bold ${isSelected ? "text-violet-700" : "text-[#2d2a26]"}`}>
                            {t.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-violet-600" />}
                        </div>
                        <span className="text-[11px] text-[#786e60] leading-tight">
                          {t.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* AI Model Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#38332d] uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-violet-600" /> Default AI Model (Ollama)
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-[#e5dcce] px-3.5 py-3 text-xs text-[#1c1917] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 font-mono shadow-xs cursor-pointer"
                >
                  {availableModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                  {availableModels.length === 0 && (
                    <option value={selectedModel}>{selectedModel}</option>
                  )}
                </select>
                <span className="text-[11px] text-[#8c8275] block">
                  Nexora remembers your model across restarts.
                </span>
              </div>

              {/* Destination & Browser */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#38332d] uppercase tracking-wider flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-violet-600" /> Save Folder
                  </label>
                  <select
                    value={saveFolder}
                    onChange={(e) => setSaveFolder(e.target.value)}
                    className="w-full rounded-2xl bg-white border border-[#e5dcce] px-3.5 py-3 text-xs text-[#1c1917] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 shadow-xs cursor-pointer"
                  >
                    <option value="Desktop">Desktop</option>
                    <option value="Downloads">Downloads</option>
                    <option value="Documents">Documents</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#38332d] uppercase tracking-wider flex items-center gap-2">
                    <Compass className="h-4 w-4 text-violet-600" /> Browser
                  </label>
                  <select
                    value={browser}
                    onChange={(e) => setBrowser(e.target.value)}
                    className="w-full rounded-2xl bg-white border border-[#e5dcce] px-3.5 py-3 text-xs text-[#1c1917] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 shadow-xs cursor-pointer"
                  >
                    <option value="Chrome">Google Chrome</option>
                    <option value="Edge">Microsoft Edge</option>
                    <option value="Firefox">Mozilla Firefox</option>
                    <option value="Brave">Brave Browser</option>
                  </select>
                </div>
              </div>

              {/* Audio hardware confirmation */}
              <div className="space-y-2.5 pt-1">
                <label className="text-xs font-semibold text-[#38332d] uppercase tracking-wider flex items-center gap-2">
                  <Mic className="h-4 w-4 text-violet-600" /> Microphone & Speaker
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#786e60]">Microphone Input</span>
                    <select
                      value={selectedMicrophone}
                      onChange={(e) => setSelectedMicrophone(e.target.value)}
                      className="w-full rounded-xl bg-white border border-[#e5dcce] px-3 py-2.5 text-xs text-[#1c1917] truncate focus:outline-none focus:border-violet-500 shadow-xs cursor-pointer"
                    >
                      <option value="default">Default System Microphone</option>
                      {audioInputs.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Microphone ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#786e60]">Speaker Output</span>
                      <button
                        type="button"
                        onClick={handleTestSound}
                        className="text-[11px] text-violet-700 hover:text-violet-950 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="h-2.5 w-2.5 fill-violet-600" /> Test
                      </button>
                    </div>
                    <select
                      value={selectedSpeaker}
                      onChange={(e) => setSelectedSpeaker(e.target.value)}
                      className="w-full rounded-xl bg-white border border-[#e5dcce] px-3 py-2.5 text-xs text-[#1c1917] truncate focus:outline-none focus:border-violet-500 shadow-xs cursor-pointer"
                    >
                      <option value="default">Default Audio Output</option>
                      {audioOutputs.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Speaker ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-5 sm:p-6 bg-[#f7f3eb] border-t border-[#ece4d8] flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium text-[#6e6558] hover:text-[#1c1917] transition rounded-full hover:bg-white cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div className="text-[11px] text-[#8c8275] font-mono">
              Step 1 of 2
            </div>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!nameInput.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 disabled:opacity-40 text-white font-semibold text-xs transition shadow-md shadow-violet-500/25 cursor-pointer"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 text-white font-semibold text-xs transition shadow-md shadow-violet-500/25 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Setting Up..." : "Start Using Nexora"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
