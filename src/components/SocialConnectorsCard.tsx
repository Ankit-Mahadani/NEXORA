"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  RefreshCw,
  Sliders,
  Shield,
  Bot,
  Sparkles,
  Radio,
  Trash2,
  Lock,
  Unlock,
  Wifi,
  Send,
  Plus,
  X,
  Copy,
  Check,
  ChevronRight,
  Info,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import {
  SocialConnector,
  SocialMessage,
  SocialPlatformId,
  SocialPermissionMode,
} from "@/lib/types";

// Default preset configurations for supported social platforms
const DEFAULT_CONNECTORS: SocialConnector[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    tagline: "WhatsApp Web QR Session & End-to-End Chat Connector",
    connected: true,
    paired_account: "+91 98765 43210 (Personal Phone)",
    connected_at: "Today, 10:14 AM",
    last_sync: "Just now",
    permission_mode: "both",
    bot_instruction:
      "You are NEXORA answering on my behalf. Reply warmly and concisely. If contacts ask about college or work, tell them I am currently studying and will check messages at 6 PM. Never agree to meetings without asking me first.",
    auto_reply_enabled: true,
    chat_scope: "all",
    whitelist_contacts: ["Mom", "Alex", "Study Group", "Prof. Sharma"],
    unread_count: 3,
    total_messages_read: 48,
    total_messages_sent: 21,
    auth_type: "qr",
    recent_messages: [
      {
        id: "wa-1",
        platform: "whatsapp",
        sender: "Mom",
        content: "Did you reach college? Call me after classes.",
        direction: "inbound",
        timestamp: "10:15 AM",
        status: "read",
        bot_action_taken: "Autonomous auto-reply dispatched per bot instructions",
      },
      {
        id: "wa-2",
        platform: "whatsapp",
        sender: "NEXORA (Auto-Reply)",
        content: "Yes Mom! Reached safely. I have classes until 4 PM and will call you right after.",
        direction: "outbound",
        timestamp: "10:15 AM",
        status: "delivered",
        bot_action_taken: "Prompt applied: Family Warmth & College Schedule",
      },
      {
        id: "wa-3",
        platform: "whatsapp",
        sender: "Alex",
        content: "Hey, can you send the OS lab sheet before evening?",
        direction: "inbound",
        timestamp: "10:30 AM",
        status: "read",
        bot_action_taken: "Read-only logged. Waiting for user review.",
      },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    tagline: "Telegram Bot & Personal MTProto Client",
    connected: true,
    paired_account: "@nexora_assistant_bot (+91 98765 43210)",
    connected_at: "Yesterday",
    last_sync: "2 mins ago",
    permission_mode: "read",
    bot_instruction:
      "Monitor incoming channel alerts and project group messages. Summarize critical updates to NEXORA workspace. Do not send automatic replies.",
    auto_reply_enabled: false,
    chat_scope: "groups",
    whitelist_contacts: ["Dev Announcements", "AI Research Group"],
    unread_count: 5,
    total_messages_read: 112,
    total_messages_sent: 4,
    auth_type: "bot_token",
    token: "6891245890:AAHq_7xK89Lp29...Z",
    recent_messages: [
      {
        id: "tg-1",
        platform: "telegram",
        sender: "Dev Announcements",
        content: "Ollama v0.5.12 released with multi-modal enhancements.",
        direction: "inbound",
        timestamp: "09:40 AM",
        status: "read",
        bot_action_taken: "Logged in Memory Explorer. (Read-Only mode)",
      },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    tagline: "Discord Gateway Bot & Direct Message Hook",
    connected: false,
    permission_mode: "write",
    bot_instruction:
      "Send task completion notifications and code snippets to #nexora-logs channel. Do not read incoming server chatter.",
    auto_reply_enabled: false,
    chat_scope: "dms",
    whitelist_contacts: ["#general", "#nexora-logs"],
    unread_count: 0,
    total_messages_read: 0,
    total_messages_sent: 15,
    auth_type: "bot_token",
    token: "MTE5MjM4NDcxMDk4...XXXX",
    recent_messages: [],
  },
  {
    id: "slack",
    name: "Slack",
    tagline: "Slack Workspace App & Webhook Dispatcher",
    connected: false,
    permission_mode: "both",
    bot_instruction:
      "Act as an engineering assistant. Provide status summaries when colleagues tag @Nexora.",
    auto_reply_enabled: true,
    chat_scope: "all",
    whitelist_contacts: ["#engineering", "@lead"],
    unread_count: 0,
    total_messages_read: 0,
    total_messages_sent: 0,
    auth_type: "webhook",
    recent_messages: [],
  },
];

const PRESET_INSTRUCTIONS = [
  {
    title: "Casual & Friendly Personal Bot",
    desc: "Replies warmly, lets friends know you are busy, never makes concrete commitments.",
    prompt:
      "You are NEXORA answering on my behalf. Reply warmly and casually. Tell contacts I am occupied right now and will text them later this evening. Never confirm appointments or share sensitive details without asking me first.",
  },
  {
    title: "Professional & Business Desk",
    desc: "Polite, formal, office hours notification and emergency instructions.",
    prompt:
      "You are the executive AI assistant for Ankit. Greet the sender professionally. State that Ankit is currently in focus sessions and will review messages after 5:00 PM. For urgent inquiries, instruct them to call directly.",
  },
  {
    title: "College & Study Mode",
    desc: "Informs peers you are working on assignments/exams and unavailable till later.",
    prompt:
      "You are NEXORA answering on behalf of Ankit. Politely let classmates know I am completing university lab assignments and will be online later. Never share assignment files or solutions without my explicit authorization.",
  },
  {
    title: "Silent Monitor & Logger",
    desc: "Strictly logs incoming chats without ever answering or alerting contacts.",
    prompt:
      "Read and transcribe incoming chats. Extract key questions, tasks, or action items into NEXORA memory. Do not dispatch any outgoing replies.",
  },
];

export function SocialConnectorsCard() {
  const [connectors, setConnectors] = useState<SocialConnector[]>(DEFAULT_CONNECTORS);
  const [activePlatformId, setActivePlatformId] = useState<SocialPlatformId>("whatsapp");
  const [savedNotice, setSavedNotice] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(25);
  const [qrPairingStep, setQrPairingStep] = useState<"scan" | "pairing" | "success">("scan");
  const [phonePairCode, setPhonePairCode] = useState("NXRA-8834");
  const [activeQrTab, setActiveQrTab] = useState<"qr" | "phone">("qr");

  // Simulator state
  const [simSender, setSimSender] = useState("Alex");
  const [simIncomingMessage, setSimIncomingMessage] = useState("Hey Ankit! Are you free to review the OS assignment questions?");
  const [simOutboundRecipient, setSimOutboundRecipient] = useState("Alex");
  const [simOutboundMessage, setSimOutboundMessage] = useState("Yes, I'll send the PDF right over!");
  const [simStatusLog, setSimStatusLog] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Load saved connectors on mount
  useEffect(() => {
    safeInvoke<SocialConnector[] | null>("get_social_connectors")
      .then((loaded) => {
        if (loaded && Array.isArray(loaded) && loaded.length > 0) {
          setConnectors(loaded);
        } else {
          // Check local storage fallback
          if (typeof window !== "undefined") {
            try {
              const local = localStorage.getItem("nexora_social_connectors");
              if (local) {
                setConnectors(JSON.parse(local));
              }
            } catch (_) {}
          }
        }
      })
      .catch((err) => console.warn("Could not load social connectors:", err));
  }, []);

  // Save changes to backend and localStorage
  const saveConnectors = (updated: SocialConnector[]) => {
    setConnectors(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nexora_social_connectors", JSON.stringify(updated));
      } catch (_) {}
    }
    safeInvoke("save_social_connectors", { connectors: updated }).catch(() => {});
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const activeConnector =
    connectors.find((c) => c.id === activePlatformId) || connectors[0];

  // Update specific fields of the active connector
  const updateActiveConnector = (patch: Partial<SocialConnector>) => {
    const updated = connectors.map((c) =>
      c.id === activePlatformId ? { ...c, ...patch } : c
    );
    saveConnectors(updated);
  };

  // QR Code timer countdown
  useEffect(() => {
    if (!showQrModal || qrPairingStep !== "scan") return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          // Regenerate pair code & restart
          setPhonePairCode(
            "NX" + Math.floor(10 + Math.random() * 89) + "-" + Math.floor(1000 + Math.random() * 8999)
          );
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showQrModal, qrPairingStep]);

  // Simulate scanning QR code
  const handleSimulateScan = () => {
    setQrPairingStep("pairing");
    setTimeout(() => {
      setQrPairingStep("success");
      setTimeout(() => {
        updateActiveConnector({
          connected: true,
          paired_account: "+91 98765 43210 (Linked via WhatsApp Web QR)",
          connected_at: "Just now",
          last_sync: "Just now",
        });
        setShowQrModal(false);
        setQrPairingStep("scan");
      }, 1400);
    }, 1600);
  };

  // Disconnect handler
  const handleDisconnect = () => {
    updateActiveConnector({
      connected: false,
      paired_account: undefined,
      connected_at: undefined,
    });
  };

  // Test Simulator: Incoming message simulation
  const handleSimulateIncoming = () => {
    if (!simIncomingMessage.trim()) return;
    setIsSimulating(true);

    const platform = activeConnector.id;
    const mode = activeConnector.permission_mode;

    setTimeout(() => {
      // 1. If mode is "write", incoming messages cannot be read!
      if (mode === "write") {
        setSimStatusLog(
          `🚫 Inbound Reading Blocked: ${activeConnector.name} is configured in 'Write Only' mode. NEXORA cannot inspect or ingest incoming chats.`
        );
        setIsSimulating(false);
        return;
      }

      // 2. Incoming message is ingested
      const incomingMsg: SocialMessage = {
        id: `sim-in-${Date.now()}`,
        platform,
        sender: simSender || "Contact",
        content: simIncomingMessage,
        direction: "inbound",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "read",
        bot_action_taken:
          mode === "read"
            ? "📥 Read-Only Mode: Message ingested and logged. No reply sent."
            : activeConnector.auto_reply_enabled
            ? `🤖 Bi-Directional Auto-Reply generated based on your Bot Instructions`
            : "📥 Read: Auto-reply paused (switch is disabled).",
      };

      let newMessages = [incomingMsg, ...activeConnector.recent_messages];

      // 3. If mode is "both" and auto-reply is enabled, generate an intelligent answer!
      if (mode === "both" && activeConnector.auto_reply_enabled) {
        let replyContent = "Hey! Thanks for messaging. I am currently busy and will get back to you soon.";
        const pLower = simIncomingMessage.toLowerCase();

        if (pLower.includes("assignment") || pLower.includes("lab") || pLower.includes("notes")) {
          replyContent = `Hey ${simSender}! I'm working on the assignment right now. I'll share the completed PDF once finished after 6 PM!`;
        } else if (pLower.includes("dinner") || pLower.includes("lunch") || pLower.includes("reach") || pLower.includes("home")) {
          replyContent = `Yes! All good here. Just focusing on classes and will call you once I'm free.`;
        } else if (pLower.includes("meeting") || pLower.includes("call") || pLower.includes("free")) {
          replyContent = `Hey! I'm in focus mode right now. Let me check my schedule and get back to you this evening.`;
        }

        const replyMsg: SocialMessage = {
          id: `sim-out-${Date.now() + 1}`,
          platform,
          sender: `NEXORA (Auto-Reply for ${simSender})`,
          content: replyContent,
          direction: "outbound",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
          bot_action_taken: `Custom Persona Applied: "${activeConnector.bot_instruction.slice(0, 48)}..."`,
        };

        newMessages = [replyMsg, ...newMessages];

        setSimStatusLog(
          `✨ Bi-Directional Exchange Completed: NEXORA read message from '${simSender}' and auto-replied per your instructions: "${replyContent}"`
        );
      } else {
        setSimStatusLog(
          `📥 Message from '${simSender}' successfully read and stored in memory log. Outbound reply omitted (Permission: ${mode.toUpperCase()}).`
        );
      }

      updateActiveConnector({
        recent_messages: newMessages.slice(0, 25),
        total_messages_read: activeConnector.total_messages_read + 1,
        total_messages_sent:
          mode === "both" && activeConnector.auto_reply_enabled
            ? activeConnector.total_messages_sent + 1
            : activeConnector.total_messages_sent,
        last_sync: "Just now",
      });

      setIsSimulating(false);
    }, 600);
  };

  // Test Simulator: Outbound message test
  const handleSimulateOutbound = () => {
    if (!simOutboundMessage.trim()) return;
    setIsSimulating(true);

    const platform = activeConnector.id;
    const mode = activeConnector.permission_mode;

    setTimeout(() => {
      // If mode is "read", outbound sending is blocked!
      if (mode === "read") {
        setSimStatusLog(
          `🚫 Outbound Send Blocked: ${activeConnector.name} is configured in 'Read Only' mode. Sending messages is forbidden.`
        );
        setIsSimulating(false);
        return;
      }

      const outMsg: SocialMessage = {
        id: `sim-send-${Date.now()}`,
        platform,
        sender: `You (via ${activeConnector.name})`,
        content: simOutboundMessage,
        direction: "outbound",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
        bot_action_taken: `Outbound message sent to ${simOutboundRecipient}`,
      };

      const newMessages = [outMsg, ...activeConnector.recent_messages].slice(0, 25);
      updateActiveConnector({
        recent_messages: newMessages,
        total_messages_sent: activeConnector.total_messages_sent + 1,
        last_sync: "Just now",
      });

      setSimStatusLog(
        `✅ Outbound message successfully dispatched to '${simOutboundRecipient}' on ${activeConnector.name}.`
      );
      setIsSimulating(false);
    }, 500);
  };

  const getPlatformBadgeColor = (pId: SocialPlatformId) => {
    switch (pId) {
      case "whatsapp":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
      case "telegram":
        return "bg-sky-500/10 text-sky-700 border-sky-500/30";
      case "discord":
        return "bg-indigo-500/10 text-indigo-700 border-indigo-500/30";
      case "slack":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30";
      default:
        return "bg-stone-500/10 text-stone-700 border-stone-500/30";
    }
  };

  return (
    <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-6 shadow-xs max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Connected Social Channels & Messaging Accounts
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              WhatsApp • Telegram • Discord • Slack
            </span>
          </div>
          <p className="text-xs text-[#7a7164] mt-1">
            Connect your messaging apps via QR scan or tokens. Assign autonomous permissions (Read-Only, Write-Only, or Both) and train the bot with custom conversation instructions.
          </p>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-pulse">
            <Check className="w-3.5 h-3.5" />
            Connector Updated!
          </div>
        )}
      </div>

      {/* Platform Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#f8f5ee] rounded-2xl border border-[#ece4d8]">
        {connectors.map((c) => {
          const isActive = c.id === activePlatformId;
          return (
            <button
              key={c.id}
              onClick={() => setActivePlatformId(c.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-[#2d2a26] shadow-xs border border-[#e5decb]"
                  : "text-[#6f6759] hover:text-[#2d2a26] hover:bg-white/50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  c.connected ? "bg-emerald-500 animate-pulse" : "bg-stone-300"
                }`}
              />
              <span>{c.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  c.permission_mode === "both"
                    ? "bg-violet-100 text-violet-700"
                    : c.permission_mode === "read"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {c.permission_mode.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Connector Banner & Status */}
      <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-[#2d2a26]">
              {activeConnector.name} Integration
            </span>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
                activeConnector.connected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              {activeConnector.connected ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Connected & Linked
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-stone-500" />
                  Not Linked
                </>
              )}
            </span>
          </div>
          <p className="text-[11px] text-[#7a7164]">
            {activeConnector.tagline}
          </p>
          {activeConnector.connected && (
            <div className="text-[11px] font-mono text-[#5b5346] flex flex-wrap items-center gap-3 pt-1">
              <span>Account: <strong className="text-emerald-800">{activeConnector.paired_account}</strong></span>
              <span>•</span>
              <span>Last Sync: {activeConnector.last_sync}</span>
              <span>•</span>
              <span>Read: {activeConnector.total_messages_read} msgs</span>
              <span>•</span>
              <span>Sent: {activeConnector.total_messages_sent} msgs</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeConnector.connected ? (
            <>
              {activeConnector.id === "whatsapp" && (
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-1.5 bg-white hover:bg-[#f6f2ea] border border-[#ece4d8] rounded-xl text-xs font-medium text-[#2d2a26] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  View QR Status
                </button>
              )}
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Unlink Account
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (activeConnector.auth_type === "qr") {
                  setShowQrModal(true);
                } else {
                  // Direct token connection simulation
                  updateActiveConnector({
                    connected: true,
                    paired_account: `@nexora_${activeConnector.id}_bot`,
                    connected_at: "Just now",
                    last_sync: "Just now",
                  });
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {activeConnector.auth_type === "qr" ? (
                <>
                  <QrCode className="w-4 h-4" />
                  Scan QR Code to Connect
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Connect {activeConnector.name}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Permission Modes Selector (Read Only, Write Only, Both) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#2d2a26] flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-violet-600" />
            Operating Permission Mode for {activeConnector.name}
          </label>
          <span className="text-[11px] text-[#7a7164]">
            Enforced across all bot chat actions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Read Only */}
          <div
            onClick={() => updateActiveConnector({ permission_mode: "read" })}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              activeConnector.permission_mode === "read"
                ? "border-sky-600 bg-sky-50/40 shadow-xs"
                : "border-[#ece4d8] bg-white hover:border-sky-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                  <Eye className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs text-[#2d2a26]">
                  1. Only Read
                </span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  activeConnector.permission_mode === "read"
                    ? "border-sky-600"
                    : "border-[#d8cfc0]"
                }`}
              >
                {activeConnector.permission_mode === "read" && (
                  <div className="w-2 h-2 rounded-full bg-sky-600" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#71685b] leading-relaxed">
              Bot can <strong>only read</strong> incoming messages and notify you. It is strictly blocked from replying or sending text messages.
            </p>
            <div className="text-[10px] font-mono text-sky-800 bg-sky-100/60 px-2 py-0.5 rounded w-fit">
              Safe Ingestion Mode
            </div>
          </div>

          {/* 2. Write Only */}
          <div
            onClick={() => updateActiveConnector({ permission_mode: "write" })}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              activeConnector.permission_mode === "write"
                ? "border-amber-600 bg-amber-50/40 shadow-xs"
                : "border-[#ece4d8] bg-white hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Edit3 className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs text-[#2d2a26]">
                  2. Only Write
                </span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  activeConnector.permission_mode === "write"
                    ? "border-amber-600"
                    : "border-[#d8cfc0]"
                }`}
              >
                {activeConnector.permission_mode === "write" && (
                  <div className="w-2 h-2 rounded-full bg-amber-600" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#71685b] leading-relaxed">
              Bot can <strong>only send</strong> outbound messages when instructed by you. It cannot read incoming chats or access past message history.
            </p>
            <div className="text-[10px] font-mono text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded w-fit">
              Outbound Dispatcher
            </div>
          </div>

          {/* 3. Read & Write (Both) */}
          <div
            onClick={() => updateActiveConnector({ permission_mode: "both" })}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              activeConnector.permission_mode === "both"
                ? "border-violet-600 bg-violet-50/40 shadow-xs"
                : "border-[#ece4d8] bg-white hover:border-violet-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs text-[#2d2a26]">
                  3. Read & Write (Both)
                </span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  activeConnector.permission_mode === "both"
                    ? "border-violet-600"
                    : "border-[#d8cfc0]"
                }`}
              >
                {activeConnector.permission_mode === "both" && (
                  <div className="w-2 h-2 rounded-full bg-violet-600" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#71685b] leading-relaxed">
              Full bi-directional AI: Bot can <strong>read chats, converse with contacts</strong>, and dispatch text replies according to your custom instructions.
            </p>
            <div className="text-[10px] font-mono text-violet-800 bg-violet-100/60 px-2 py-0.5 rounded w-fit">
              Full Autonomous AI
            </div>
          </div>
        </div>
      </div>

      {/* Bot Instructions & Personality Prompt */}
      <div className="space-y-3 p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-[#2d2a26] flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-600" />
              Bot Instructions & Answering Persona ({activeConnector.name})
            </label>
            <p className="text-[11px] text-[#7a7164]">
              Instruct NEXORA how to talk to your chats and what to say when replying or reading messages.
            </p>
          </div>

          {/* Autonomous auto-reply toggle */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#ece4d8] shrink-0">
            <span className="text-[11px] font-semibold text-[#2d2a26]">
              Autonomous Auto-Reply:
            </span>
            <input
              type="checkbox"
              checked={activeConnector.auto_reply_enabled}
              onChange={(e) =>
                updateActiveConnector({ auto_reply_enabled: e.target.checked })
              }
              className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Textarea for custom instructions */}
        <textarea
          rows={3}
          value={activeConnector.bot_instruction}
          onChange={(e) =>
            updateActiveConnector({ bot_instruction: e.target.value })
          }
          placeholder="e.g. You are NEXORA answering for me. When friends message, be friendly and say I am busy studying and will call back in the evening. Never agree to meetings..."
          className="w-full p-3 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-emerald-500 font-normal leading-relaxed"
        />

        {/* Preset chips for fast selection */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-[#877e70] uppercase tracking-wider">
            Quick Persona Templates:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_INSTRUCTIONS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() =>
                  updateActiveConnector({ bot_instruction: preset.prompt })
                }
                className="text-[11px] px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-[#ece4d8] rounded-lg text-[#524a3e] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Scope & Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#f1e9dd]">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#2d2a26]">
              Chat Audience / Scope
            </label>
            <select
              value={activeConnector.chat_scope}
              onChange={(e) =>
                updateActiveConnector({
                  chat_scope: e.target.value as any,
                })
              }
              className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none cursor-pointer"
            >
              <option value="all">All Contacts & Group Chats</option>
              <option value="dms">Direct Messages (DMs) Only</option>
              <option value="groups">Group Chats Only</option>
              <option value="whitelist">Allowed Whitelist Contacts Only</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#2d2a26]">
              Whitelist Contacts (Comma-Separated)
            </label>
            <input
              type="text"
              value={activeConnector.whitelist_contacts.join(", ")}
              onChange={(e) =>
                updateActiveConnector({
                  whitelist_contacts: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g. Mom, Alex, Prof. Sharma"
              className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Live Message Simulator & Activity Log */}
      <div className="space-y-4 p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#f1e9dd] pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <h4 className="text-xs font-bold text-[#2d2a26]">
              Interactive Message Simulator & Activity Feed
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[#7a7164]">
            Permission: <strong className="uppercase text-emerald-700">{activeConnector.permission_mode}</strong>
          </span>
        </div>

        {/* Live Simulator Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Test Inbound Message */}
          <div className="space-y-2 p-3 bg-white rounded-xl border border-[#ece4d8]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#2d2a26] flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                Test Incoming Message (From Contact)
              </span>
              <span className="text-[10px] text-stone-500">Inbound Test</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={simSender}
                onChange={(e) => setSimSender(e.target.value)}
                placeholder="Sender Name (e.g. Alex)"
                className="w-1/3 p-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-lg text-xs"
              />
              <input
                type="text"
                value={simIncomingMessage}
                onChange={(e) => setSimIncomingMessage(e.target.value)}
                placeholder="Message body from contact..."
                className="flex-1 p-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-lg text-xs"
              />
            </div>
            <button
              onClick={handleSimulateIncoming}
              disabled={isSimulating}
              className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              Simulate Incoming Message
            </button>
          </div>

          {/* Test Outbound Send */}
          <div className="space-y-2 p-3 bg-white rounded-xl border border-[#ece4d8]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#2d2a26] flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                Test Outbound Message (To Contact)
              </span>
              <span className="text-[10px] text-stone-500">Outbound Test</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={simOutboundRecipient}
                onChange={(e) => setSimOutboundRecipient(e.target.value)}
                placeholder="To (e.g. Alex)"
                className="w-1/3 p-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-lg text-xs"
              />
              <input
                type="text"
                value={simOutboundMessage}
                onChange={(e) => setSimOutboundMessage(e.target.value)}
                placeholder="Message you want bot to send..."
                className="flex-1 p-2 bg-[#fcfaf7] border border-[#ece4d8] rounded-lg text-xs"
              />
            </div>
            <button
              onClick={handleSimulateOutbound}
              disabled={isSimulating}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3 h-3" />
              Test Send Message
            </button>
          </div>
        </div>

        {/* Simulation Feedback Alert */}
        {simStatusLog && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{simStatusLog}</div>
            <button
              onClick={() => setSimStatusLog(null)}
              className="text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Recent Message Log */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#665e52]">
            <span>Recent Message Activity ({activeConnector.name}):</span>
            <span>{activeConnector.recent_messages.length} messages logged</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {activeConnector.recent_messages.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-400 italic">
                No recent messages recorded yet for this channel.
              </div>
            ) : (
              activeConnector.recent_messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${
                    m.direction === "outbound"
                      ? "bg-emerald-50/50 border-emerald-200/80 ml-4"
                      : "bg-white border-[#ece4d8] mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#7a7164]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-semibold ${
                          m.direction === "outbound"
                            ? "text-emerald-800"
                            : "text-[#2d2a26]"
                        }`}
                      >
                        {m.sender}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                          m.direction === "outbound"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {m.direction.toUpperCase()}
                      </span>
                    </div>
                    <span>{m.timestamp}</span>
                  </div>
                  <div className="text-xs text-[#2d2a26] font-medium">
                    "{m.content}"
                  </div>
                  {m.bot_action_taken && (
                    <div className="text-[10px] text-[#857a6b] italic flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5 text-emerald-600" />
                      {m.bot_action_taken}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp QR Code Pairing Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#ece4d8] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f3ede3] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#2d2a26]">
                    Link WhatsApp to NEXORA
                  </h3>
                  <p className="text-[11px] text-[#7a7164]">
                    Instant QR scan pairing for multi-device desktop communication
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 p-1 bg-[#f8f5ee] rounded-xl border border-[#ece4d8]">
              <button
                onClick={() => setActiveQrTab("qr")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeQrTab === "qr"
                    ? "bg-white text-[#2d2a26] shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Scan QR Code
              </button>
              <button
                onClick={() => setActiveQrTab("phone")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeQrTab === "phone"
                    ? "bg-white text-[#2d2a26] shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Link with Phone Code
              </button>
            </div>

            {/* Tab 1: QR Code Scanner */}
            {activeQrTab === "qr" && (
              <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                {/* SVG Animated QR Code */}
                <div className="relative group shrink-0">
                  <div className="w-52 h-52 bg-white p-3 rounded-2xl border-2 border-emerald-500/40 shadow-md flex items-center justify-center relative overflow-hidden">
                    {/* Simulated Authentic QR Matrix SVG */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full text-[#1f2937]"
                    >
                      {/* Corner Position Detection Squares */}
                      <rect x="5" y="5" width="22" height="22" rx="3" fill="currentColor" />
                      <rect x="8" y="8" width="16" height="16" rx="2" fill="white" />
                      <rect x="11" y="11" width="10" height="10" rx="1" fill="#059669" />

                      <rect x="73" y="5" width="22" height="22" rx="3" fill="currentColor" />
                      <rect x="76" y="8" width="16" height="16" rx="2" fill="white" />
                      <rect x="79" y="11" width="10" height="10" rx="1" fill="#059669" />

                      <rect x="5" y="73" width="22" height="22" rx="3" fill="currentColor" />
                      <rect x="8" y="76" width="16" height="16" rx="2" fill="white" />
                      <rect x="11" y="79" width="10" height="10" rx="1" fill="#059669" />

                      {/* Random Data Pattern Matrix */}
                      <rect x="33" y="8" width="5" height="5" fill="currentColor" />
                      <rect x="42" y="8" width="5" height="5" fill="currentColor" />
                      <rect x="52" y="12" width="5" height="5" fill="currentColor" />
                      <rect x="62" y="8" width="5" height="5" fill="currentColor" />

                      <rect x="33" y="20" width="5" height="5" fill="currentColor" />
                      <rect x="45" y="22" width="5" height="5" fill="currentColor" />
                      <rect x="58" y="20" width="5" height="5" fill="currentColor" />

                      <rect x="8" y="35" width="5" height="5" fill="currentColor" />
                      <rect x="18" y="42" width="5" height="5" fill="currentColor" />
                      <rect x="25" y="35" width="5" height="5" fill="currentColor" />

                      <rect x="75" y="35" width="5" height="5" fill="currentColor" />
                      <rect x="85" y="42" width="5" height="5" fill="currentColor" />

                      {/* Center WhatsApp Icon */}
                      <circle cx="50" cy="50" r="14" fill="#10b981" />
                      <path
                        d="M44 54 L44 46 L53 50 Z"
                        fill="white"
                      />
                    </svg>

                    {/* Animated Pulsing Scan Beam */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-bounce opacity-80" />

                    {/* Pairing overlay */}
                    {qrPairingStep === "pairing" && (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                        <span className="text-xs font-bold text-[#2d2a26]">
                          Verifying Keypair...
                        </span>
                        <span className="text-[10px] text-stone-500">
                          Handshaking with WhatsApp
                        </span>
                      </div>
                    )}

                    {qrPairingStep === "success" && (
                      <div className="absolute inset-0 bg-emerald-500 text-white flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <CheckCircle2 className="w-10 h-10 animate-bounce" />
                        <span className="text-xs font-bold">
                          Successfully Connected!
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#7a7164] mt-2 px-1">
                    <span>Expires in: <strong>{qrCountdown}s</strong></span>
                    <button
                      onClick={() => setQrCountdown(30)}
                      className="text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Reload
                    </button>
                  </div>
                </div>

                {/* Instructions Steps */}
                <div className="space-y-3 text-xs text-[#2d2a26]">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#6b6254]">
                    Steps to connect:
                  </h4>
                  <ol className="space-y-2 text-[11px] text-[#554d40]">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        1
                      </span>
                      <span>Open <strong>WhatsApp</strong> on your mobile phone.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        2
                      </span>
                      <span>
                        Tap <strong>Menu</strong> (Android ⋮) or <strong>Settings</strong> (iPhone ⚙️) and select <strong>Linked Devices</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        3
                      </span>
                      <span>Tap <strong>Link a Device</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        4
                      </span>
                      <span>Point your camera at this QR code screen.</span>
                    </li>
                  </ol>

                  {/* One-click simulate scan button */}
                  <div className="pt-2">
                    <button
                      onClick={handleSimulateScan}
                      disabled={qrPairingStep !== "scan"}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Simulate Scan from Phone (+91 98765 43210)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Link with Phone Number */}
            {activeQrTab === "phone" && (
              <div className="space-y-4 py-3">
                <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl text-center space-y-2">
                  <span className="text-xs text-[#7a7164]">
                    Enter this 8-character code on your phone in WhatsApp &gt; Linked Devices:
                  </span>
                  <div className="text-2xl font-mono font-bold tracking-widest text-emerald-700 bg-white p-3 rounded-xl border border-[#ece4d8] shadow-2xs">
                    {phonePairCode}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(phonePairCode);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="flex-1 py-2 bg-white hover:bg-stone-50 border border-[#ece4d8] rounded-xl text-xs font-medium text-[#2d2a26] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Code Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Pairing Code
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSimulateScan}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Confirm Linked on Phone
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
