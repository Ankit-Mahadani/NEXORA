"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Shield,
  FolderOpen,
  Terminal,
  Mic,
  Volume2,
  User,
  Sliders,
  Check,
  Play,
  EyeOff,
  RefreshCw,
  Sun,
  Moon,
  Palette,
  Search,
  Power,
  Filter,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  GraduationCap,
  FileText,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { useAppStore } from "@/store/useAppStore";

export function SettingsView() {
  const {
    userName,
    setUserName,
    registrationNumber,
    setRegistrationNumber,
    defaultSubject,
    setDefaultSubject,
    assignmentFormat,
    setAssignmentFormat,
    selectedMicrophone,
    setSelectedMicrophone,
    selectedSpeaker,
    setSelectedSpeaker,
    isTemporaryChat,
    setTemporaryChat,
    theme,
    setTheme,
  } = useAppStore();

  const [tools, setTools] = useState<any[]>([]);
  const [toolEnabledMap, setToolEnabledMap] = useState<Record<string, boolean>>({});
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissionFilter, setSelectedPermissionFilter] = useState<
    "all" | "safe" | "moderate_impact" | "sensitive" | "enabled" | "disabled"
  >("all");

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [testSoundPlaying, setTestSoundPlaying] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [defaultSaveFolder, setDefaultSaveFolder] = useState("Desktop");
  const [preferredBrowser, setPreferredBrowser] = useState("Chrome");

  const loadAudioDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        // Request momentary mic access so device labels are populated
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (_) {}

        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === "audioinput");
        const outputs = devices.filter((d) => d.kind === "audiooutput");

        setAudioInputs(inputs);
        setAudioOutputs(outputs);
      }
    } catch (err) {
      console.warn("Could not enumerate audio devices:", err);
    }
  };

  useEffect(() => {
    safeInvoke<any[]>("get_tool_permissions")
      .then(async (res) => {
        const loaded = res || [];
        setTools(loaded);

        const initialMap: Record<string, boolean> = {};
        for (const t of loaded) {
          try {
            const localVal =
              typeof window !== "undefined"
                ? localStorage.getItem("nexora_tool_enabled_" + t.name)
                : null;
            if (localVal !== null) {
              initialMap[t.name] = localVal !== "false";
            } else {
              const dbVal = await safeInvoke<string | null>("get_setting", {
                key: "tool_enabled_" + t.name,
              });
              initialMap[t.name] = dbVal !== "false";
            }
          } catch (_) {
            initialMap[t.name] = true;
          }
        }
        setToolEnabledMap(initialMap);
      })
      .catch((err) => console.error("Failed to load permissions:", err));

    loadAudioDevices();
  }, []);

  const handleToggleTool = (toolName: string) => {
    const current = toolEnabledMap[toolName] !== false;
    const nextVal = !current;
    setToolEnabledMap((prev) => ({ ...prev, [toolName]: nextVal }));

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nexora_tool_enabled_" + toolName, nextVal ? "true" : "false");
      } catch (_) {}
    }
    safeInvoke("set_setting", {
      key: "tool_enabled_" + toolName,
      value: nextVal ? "true" : "false",
    }).catch(() => {});
    handleSave();
  };

  const handleBulkToggle = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    for (const t of tools) {
      updated[t.name] = enable;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("nexora_tool_enabled_" + t.name, enable ? "true" : "false");
        } catch (_) {}
      }
      safeInvoke("set_setting", {
        key: "tool_enabled_" + t.name,
        value: enable ? "true" : "false",
      }).catch(() => {});
    }
    setToolEnabledMap(updated);
    handleSave();
  };

  const playTestChime = () => {
    try {
      setTestSoundPlaying(true);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);

      setTimeout(() => setTestSoundPlaying(false), 700);
    } catch (e) {
      setTestSoundPlaying(false);
    }
  };

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      <div className="flex items-center justify-between max-w-4xl">
        <div>
          <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-500" />
            Device Settings & User Preferences
          </h2>
          <p className="text-xs text-[#7e7568] mt-1">
            Configure audio hardware, personal assistant preferences, execution boundaries, and temporary chat.
          </p>
        </div>
        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
            <Check className="w-3.5 h-3.5" />
            Preferences Saved!
          </div>
        )}
      </div>

      {/* Audio Hardware Devices (Microphone & Speaker) */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs max-w-4xl">
        <div className="flex items-center justify-between border-b border-[#f3ede3] pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-600" />
            Audio Devices (Microphone & Speaker)
          </h3>
          <button
            onClick={loadAudioDevices}
            className="flex items-center gap-1.5 text-[11px] text-[#71685b] hover:text-[#2d2a26] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh Devices
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Microphone Selector */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#2d2a26]">
              <Mic className="w-4 h-4 text-rose-500" />
              <span>Microphone Input</span>
            </div>
            <p className="text-[11px] text-[#7a7164]">
              Select which microphone NEXORA should use for local voice transcription.
            </p>
            <select
              value={selectedMicrophone}
              onChange={(e) => {
                setSelectedMicrophone(e.target.value);
                handleSave();
              }}
              className="w-full mt-2 p-2.5 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-violet-400 cursor-pointer"
            >
              <option value="default">Default System Microphone</option>
              {audioInputs.map((input, idx) => (
                <option key={input.deviceId || idx} value={input.deviceId}>
                  {input.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Speaker / Output Selector */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#2d2a26]">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-500" />
                <span>Speaker Output</span>
              </div>
              <button
                onClick={playTestChime}
                disabled={testSoundPlaying}
                className="px-2.5 py-1 bg-white hover:bg-[#f6f2ea] border border-[#ece4d8] rounded-lg text-[10px] font-semibold text-[#2d2a26] flex items-center gap-1 transition-all cursor-pointer"
              >
                <Play className="w-2.5 h-2.5 text-indigo-600 fill-indigo-600" />
                {testSoundPlaying ? "Playing..." : "Test Sound"}
              </button>
            </div>
            <p className="text-[11px] text-[#7a7164]">
              Select the audio output for notification chimes and speech synthesis.
            </p>
            <select
              value={selectedSpeaker}
              onChange={(e) => {
                setSelectedSpeaker(e.target.value);
                handleSave();
              }}
              className="w-full mt-2 p-2.5 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-violet-400 cursor-pointer"
            >
              <option value="default">Default System Speaker</option>
              {audioOutputs.map((output, idx) => (
                <option key={output.deviceId || idx} value={output.deviceId}>
                  {output.label || `Speaker ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Appearance & Workspace Theme */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs max-w-4xl">
        <div className="flex items-center justify-between border-b border-[#f3ede3] pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
            <Palette className="w-4 h-4 text-violet-600" />
            Appearance & Workspace Theme
          </h3>
          <span className="text-[11px] font-mono text-[#8a8174]">
            Default: <span className="font-semibold text-violet-700">Light / White</span>
          </span>
        </div>

        <p className="text-xs text-[#7a7164]">
          Choose your desktop theme. White is the serene default with warm paper softness and gentle violet highlights. Dark offers an obsidian-violet night mode.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Theme Card (Default) */}
          <div
            onClick={() => {
              setTheme("light");
              handleSave();
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              theme === "light"
                ? "border-violet-600 bg-[#fbf9f5] shadow-sm shadow-violet-500/10"
                : "border-[#ece4d8] bg-white hover:border-violet-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#e8dfd2] flex items-center justify-center text-amber-500 shadow-2xs">
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#2d2a26] flex items-center gap-1.5">
                    Light (White)
                    <span className="text-[9px] bg-violet-100 text-violet-700 font-mono px-1.5 py-0.5 rounded-full border border-violet-200">
                      Default
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8c8275]">Warm Paper & Violet Calm</div>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  theme === "light" ? "border-violet-600" : "border-[#d8cfc0]"
                }`}
              >
                {theme === "light" && <div className="w-2 h-2 rounded-full bg-violet-600" />}
              </div>
            </div>

            {/* Mini visual mockup of light */}
            <div className="h-12 w-full rounded-xl bg-[#f8f5ee] border border-[#ece4d8] p-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#e8dfd2] flex items-center justify-center text-[10px] font-bold text-violet-700 shadow-2xs">
                N
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-16 bg-[#e5ded4] rounded-full"></div>
                <div className="h-1.5 w-24 bg-violet-200 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Dark Theme Card */}
          <div
            onClick={() => {
              setTheme("dark");
              handleSave();
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              theme === "dark"
                ? "border-violet-500 bg-[#14101e] shadow-sm shadow-violet-500/20"
                : "border-[#ece4d8] bg-white hover:border-violet-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b1528] border border-[#2e2444] flex items-center justify-center text-violet-400 shadow-2xs">
                  <Moon className="w-4 h-4 text-violet-400 fill-violet-400/20" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#2d2a26]">Dark (Obsidian)</div>
                  <div className="text-[11px] text-[#8c8275]">Deep Charcoal & Radiant Neon</div>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  theme === "dark" ? "border-violet-500" : "border-[#d8cfc0]"
                }`}
              >
                {theme === "dark" && <div className="w-2 h-2 rounded-full bg-violet-500" />}
              </div>
            </div>

            {/* Mini visual mockup of dark */}
            <div className="h-12 w-full rounded-xl bg-[#0e0b16] border border-[#2d2442] p-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#181326] border border-[#3b2e57] flex items-center justify-center text-[10px] font-bold text-violet-400 shadow-2xs">
                N
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-16 bg-[#2d2442] rounded-full"></div>
                <div className="h-1.5 w-24 bg-violet-500/60 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assistant Personalization & User Preferences */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs max-w-4xl">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2 border-b border-[#f3ede3] pb-3">
          <User className="w-4 h-4 text-violet-600" />
          Personalization & Workflow Habits
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* User Name */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <label className="font-semibold text-xs text-[#2d2a26] block">
              Your Name (Assistant Greeting)
            </label>
            <p className="text-[11px] text-[#7a7164]">
              Personalizes the greeting and context for all multi-agent prompts.
            </p>
            <input
              type="text"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                handleSave();
              }}
              placeholder="e.g. Ankit"
              className="w-full mt-2 p-2.5 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-violet-400 font-medium"
            />
          </div>

          {/* Default Save Destination */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <label className="font-semibold text-xs text-[#2d2a26] block">
              Default Save Location
            </label>
            <p className="text-[11px] text-[#7a7164]">
              Where new files, notes, answers, and screenshots are saved.
            </p>
            <select
              value={defaultSaveFolder}
              onChange={(e) => {
                setDefaultSaveFolder(e.target.value);
                handleSave();
              }}
              className="w-full mt-2 p-2.5 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-violet-400 cursor-pointer"
            >
              <option value="Desktop">Desktop (~/Desktop)</option>
              <option value="Downloads">Downloads (~/Downloads)</option>
              <option value="Documents">Documents (~/Documents)</option>
            </select>
          </div>

          {/* Preferred Web Browser */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <label className="font-semibold text-xs text-[#2d2a26] block">
              Preferred Browser for Web Actions
            </label>
            <p className="text-[11px] text-[#7a7164]">
              Browser launched when opening Gmail, Google Classroom, Pinterest, or links.
            </p>
            <select
              value={preferredBrowser}
              onChange={(e) => {
                setPreferredBrowser(e.target.value);
                handleSave();
              }}
              className="w-full mt-2 p-2.5 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-violet-400 cursor-pointer"
            >
              <option value="Chrome">Google Chrome</option>
              <option value="Edge">Microsoft Edge</option>
              <option value="Default">System Default Browser</option>
            </select>
          </div>

          {/* Temporary Chat Preference */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <label className="font-semibold text-xs text-[#2d2a26] block flex items-center justify-between">
              <span>Incognito / Temporary Chat Mode</span>
              <input
                type="checkbox"
                checked={isTemporaryChat}
                onChange={(e) => {
                  setTemporaryChat(e.target.checked);
                  handleSave();
                }}
                className="w-4 h-4 rounded text-violet-600 cursor-pointer"
              />
            </label>
            <p className="text-[11px] text-[#7a7164]">
              When enabled, chats and actions run ephemerally without persisting memory or history to SQLite.
            </p>
          </div>
        </div>
      </div>

      {/* College Assignment & Handwritten Notes Settings */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-5 shadow-xs max-w-4xl">
        <div className="flex items-center justify-between border-b border-[#f3ede3] pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            College Assignment & Handwritten Generator Profile
          </h3>
          <span className="text-[11px] font-mono text-[#8a8174]">
            Default Format: <span className="font-semibold text-indigo-700">Handwritten Notes (A4 Ruled)</span>
          </span>
        </div>

        <p className="text-xs text-[#7a7164]">
          Configure your college credentials and assignment defaults. When you instruct NEXORA to do an assignment, it checks Google Classroom, downloads and solves the questions, produces authentic handwritten lined notebook pages (or a Word document), compiles a sequenced PDF named <code className="bg-[#f2ece2] px-1.5 py-0.5 rounded font-mono text-indigo-900">[Assignment]_[Subject]_[RegNo].pdf</code>, and opens Classroom ready to turn in.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Registration Number */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <label className="font-semibold text-xs text-[#2d2a26] block">
              College Registration / Roll Number
            </label>
            <p className="text-[11px] text-[#7a7164]">
              Printed in the student header box on every handwritten page and included in the PDF filename.
            </p>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => {
                setRegistrationNumber(e.target.value);
                handleSave();
              }}
              placeholder="e.g. 2023BCSE042"
              className="w-full mt-2 p-2.5 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-indigo-400 font-mono font-medium"
            />
          </div>

          {/* Default Course / Subject */}
          <div className="space-y-2 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <label className="font-semibold text-xs text-[#2d2a26] block">
              Default Course / Subject Name
            </label>
            <p className="text-[11px] text-[#7a7164]">
              Default subject assigned when prompt doesn't explicitly name a subject.
            </p>
            <input
              type="text"
              value={defaultSubject}
              onChange={(e) => {
                setDefaultSubject(e.target.value);
                handleSave();
              }}
              placeholder="e.g. Operating Systems"
              className="w-full mt-2 p-2.5 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-indigo-400 font-medium"
            />
          </div>

          {/* Format Preference: Handwritten vs Word */}
          <div className="space-y-3 p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc] md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-[#2d2a26] block">
                Assignment Generation Mode (Default: Handwritten)
              </label>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200 font-medium">
                {assignmentFormat === "handwritten" ? "✍️ Blue Ink Ruled Paper" : "📄 Word Document"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                onClick={() => {
                  setAssignmentFormat("handwritten");
                  handleSave();
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  assignmentFormat === "handwritten"
                    ? "border-indigo-600 bg-white shadow-xs"
                    : "border-[#ece4d8] bg-[#faf8f5] hover:border-indigo-300"
                }`}
              >
                <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-indigo-600 flex items-center justify-center">
                  {assignmentFormat === "handwritten" && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#2d2a26] flex items-center gap-1.5">
                    Handwritten Ruled Copy Notes
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono">Default</span>
                  </div>
                  <p className="text-[11px] text-[#7a7164] mt-0.5">
                    A4 ruled paper with red left margin, student header box, blue ink handwriting typography, and sequential PDF assembly.
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  setAssignmentFormat("word");
                  handleSave();
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  assignmentFormat === "word"
                    ? "border-indigo-600 bg-white shadow-xs"
                    : "border-[#ece4d8] bg-[#faf8f5] hover:border-indigo-300"
                }`}
              >
                <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-indigo-600 flex items-center justify-center">
                  {assignmentFormat === "word" && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#2d2a26]">
                    Microsoft Word (.docx)
                  </div>
                  <p className="text-[11px] text-[#7a7164] mt-0.5">
                    Standard formatted Word document with clean typography, tables, and formatted Q&A blocks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security sandbox policies */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs max-w-4xl">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Execution Boundaries & Security
        </h3>
        <div className="text-xs text-[#2d2a26] space-y-2.5">
          <div className="flex items-center justify-between p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <div>
              <div className="font-semibold text-sm">Authorized User Folders</div>
              <div className="text-[11px] text-[#7a7164] mt-0.5">
                Full safe access enabled for Desktop, Downloads, Documents, and project workspaces.
              </div>
            </div>
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <div>
              <div className="font-semibold text-sm">Secret Redaction</div>
              <div className="text-[11px] text-[#7a7164] mt-0.5">
                Automatically masks credentials, tokens, and passwords in traces and memory.
              </div>
            </div>
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Registered Desktop & Automation Tools & Permissions */}
      <div className="space-y-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ece4d8] pb-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet-600" />
              Registered Desktop & Automation Permissions ({tools.length})
            </h3>
            <p className="text-[11px] text-[#7a7164] mt-0.5">
              Granularly turn individual tools on or off. Disabled permissions are blocked by the security sandbox.
            </p>
          </div>

          {/* Bulk Enable / Disable actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleBulkToggle(true)}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Enable All
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Disable All
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#8c8275] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              placeholder="Filter permissions by name, category, or keyword..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-violet-400 placeholder-[#9f9588]"
            />
            {permissionSearch && (
              <button
                onClick={() => setPermissionSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8c8275] hover:text-[#2d2a26] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: "all", label: `All (${tools.length})` },
                { id: "enabled", label: "Enabled" },
                { id: "disabled", label: "Disabled" },
                { id: "safe", label: "Safe" },
                { id: "moderate_impact", label: "Moderate" },
                { id: "sensitive", label: "Sensitive" },
              ] as const
            ).map((filter) => {
              const active = selectedPermissionFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedPermissionFilter(filter.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-all cursor-pointer shrink-0 border ${
                    active
                      ? "bg-violet-600 text-white border-violet-600 shadow-2xs"
                      : "bg-white text-[#6c6458] hover:text-[#2d2a26] border-[#ece4d8] hover:border-violet-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools
            .filter((t) => {
              const isEnabled = toolEnabledMap[t.name] !== false;
              if (selectedPermissionFilter === "safe" && t.permission_level !== "safe") return false;
              if (selectedPermissionFilter === "moderate_impact" && t.permission_level !== "moderate_impact") return false;
              if (selectedPermissionFilter === "sensitive" && t.permission_level !== "sensitive") return false;
              if (selectedPermissionFilter === "enabled" && !isEnabled) return false;
              if (selectedPermissionFilter === "disabled" && isEnabled) return false;

              if (permissionSearch.trim()) {
                const q = permissionSearch.toLowerCase();
                const matchName = t.name.toLowerCase().includes(q);
                const matchDesc = (t.description || "").toLowerCase().includes(q);
                const matchCat = (t.category || "").toLowerCase().includes(q);
                return matchName || matchDesc || matchCat;
              }
              return true;
            })
            .map((t) => {
              const isEnabled = toolEnabledMap[t.name] !== false;
              return (
                <div
                  key={t.name}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-xs ${
                    isEnabled
                      ? "bg-white border-[#ece4d8] hover:border-violet-300"
                      : "bg-[#fcfaf7]/70 border-[#ede5d8] opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[#2d2a26] font-bold text-sm">
                          {t.name}
                        </span>
                        {t.category && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#f4ede3] text-[#71685b] border border-[#e8ded0]">
                            {t.category}
                          </span>
                        )}
                        {t.status === "reserved" && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                            Available
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#71685b] leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleTool(t.name)}
                      role="switch"
                      aria-checked={isEnabled}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? "bg-violet-600" : "bg-[#d8cfc0]"
                      }`}
                      title={isEnabled ? "Click to disable permission" : "Click to enable permission"}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#f4ede3] text-[10px]">
                    {/* Permission Level Badge */}
                    <span
                      className={`font-mono px-2.5 py-0.5 rounded-full border uppercase font-bold ${
                        t.permission_level === "safe"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : t.permission_level === "sensitive"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {t.permission_level}
                    </span>

                    {/* On/Off Status Badge */}
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isEnabled ? "bg-emerald-500 animate-pulse" : "bg-[#a39889]"
                        }`}
                      />
                      <span className={isEnabled ? "text-emerald-700" : "text-[#8c8275]"}>
                        {isEnabled ? "ON / Enabled" : "OFF / Disabled"}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
