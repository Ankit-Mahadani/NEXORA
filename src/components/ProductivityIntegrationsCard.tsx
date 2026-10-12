"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  BookOpen,
  CheckSquare,
  Bell,
  Mail,
  Calendar,
  Shield,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Lock,
  Radio,
  Send,
  Clock,
  Check,
  ChevronRight,
  Info,
  X,
  Sliders,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import {
  ProductivityDomain,
  ProductivityIntegration,
  ProductivityActivity,
} from "@/lib/types";

const DEFAULT_PRODUCTIVITY_INTEGRATIONS: ProductivityIntegration[] = [
  {
    id: "documents",
    name: "Documents",
    tagline: "Google Docs, Local Word (.docx), Markdown & PDF Workspace",
    provider: "Google Drive & Local Documents",
    connected: true,
    connected_account: "ankit.workspace@gmail.com (Desktop ~/Documents)",
    last_sync: "Just now",
    permission_mode: "both",
    require_approval: false,
    bot_instruction:
      "When creating documents, structure with clear markdown headers, executive summaries, bullet points, and date stamps. Format cleanly for college and work reports.",
    total_items_read: 19,
    total_items_created: 7,
    recent_activity: [
      {
        id: "act-doc-1",
        domain: "documents",
        action: "create",
        title: "OS_Virtual_Memory_Analysis.md",
        detail: "Created in Desktop with 4 sections and formulas",
        timestamp: "10:20 AM",
        status: "success",
      },
      {
        id: "act-doc-2",
        domain: "documents",
        action: "read",
        title: "Semester_Syllabus_2026.pdf",
        detail: "Extracted exam units and lab submission dates",
        timestamp: "Yesterday",
        status: "success",
      },
    ],
  },
  {
    id: "notes",
    name: "Notes",
    tagline: "Notion, Obsidian Vault & NEXORA Native Notebook",
    provider: "Obsidian Local Vault & Notion API",
    connected: true,
    connected_account: "Vault: ~/Documents/Obsidian/NexoraVault",
    last_sync: "5 mins ago",
    permission_mode: "both",
    require_approval: false,
    bot_instruction:
      "Store notes concisely with relevant tags (#study, #project, #idea). Summarize long articles into 3 key takeaways. Never overwrite existing notes without asking.",
    total_items_read: 42,
    total_items_created: 15,
    recent_activity: [
      {
        id: "act-note-1",
        domain: "notes",
        action: "create",
        title: "Quick Note: Rust Tokio Concurrency Patterns",
        detail: "Saved in category #study with code snippets",
        timestamp: "09:45 AM",
        status: "success",
      },
    ],
  },
  {
    id: "tasks",
    name: "Tasks & To-Dos",
    tagline: "Task Hub, Todoist, Linear & Microsoft To-Do",
    provider: "NEXORA Task Hub (Local SQLite)",
    connected: true,
    connected_account: "Active User Task Board",
    last_sync: "Just now",
    permission_mode: "both",
    require_approval: false,
    bot_instruction:
      "Break down user goals into concrete, actionable checklist items. Assign realistic deadlines and priority badges (High, Medium, Low).",
    total_items_read: 28,
    total_items_created: 14,
    recent_activity: [
      {
        id: "act-task-1",
        domain: "tasks",
        action: "create",
        title: "Submit Operating Systems Lab Assignment",
        detail: "Due Tomorrow 6:00 PM • Priority: High",
        timestamp: "10:05 AM",
        status: "success",
      },
      {
        id: "act-task-2",
        domain: "tasks",
        action: "complete",
        title: "Download lecture slides for Unit 3",
        detail: "Marked finished",
        timestamp: "Yesterday",
        status: "completed",
      },
    ],
  },
  {
    id: "reminders",
    name: "Reminders & Alerts",
    tagline: "System Alarms, Audio Chimes & Windows Action Center Toasts",
    provider: "Windows Native Alarms & NEXORA Audio Daemon",
    connected: true,
    connected_account: "Local Workstation Audio & Notifications",
    last_sync: "Active",
    permission_mode: "both",
    require_approval: false,
    bot_instruction:
      "Alert me 15 minutes before calendar events and task deadlines. Speak reminders gently using local text-to-speech when I am active.",
    total_items_read: 12,
    total_items_created: 9,
    recent_activity: [
      {
        id: "act-rem-1",
        domain: "reminders",
        action: "schedule",
        title: "Call Doctor regarding prescription",
        detail: "Armed for 4:30 PM Today with audio chime",
        timestamp: "10:10 AM",
        status: "pending",
      },
    ],
  },
  {
    id: "email",
    name: "Email (Gmail / Outlook)",
    tagline: "Gmail API, Microsoft Outlook & IMAP / SMTP Mailboxes",
    provider: "Google Gmail OAuth & IMAP",
    connected: true,
    connected_account: "ankit.developer@gmail.com",
    last_sync: "3 mins ago",
    permission_mode: "both",
    require_approval: true,
    bot_instruction:
      "Draft professional and polite emails. Check unread inbox when commanded and summarize urgent threads. NEVER send an email autonomously without displaying the draft and getting my confirmation first.",
    total_items_read: 64,
    total_items_created: 8,
    recent_activity: [
      {
        id: "act-mail-1",
        domain: "email",
        action: "read",
        title: "Inbox check: 3 unread messages from Prof. Sharma",
        detail: "Summarized assignment submission portal link",
        timestamp: "09:30 AM",
        status: "success",
      },
      {
        id: "act-mail-2",
        domain: "email",
        action: "send",
        title: "Drafted reply to Sharma Lab Coordinator",
        detail: "Sent with user approval: 'Assignment submitted on portal'",
        timestamp: "Yesterday",
        status: "success",
      },
    ],
  },
  {
    id: "calendar",
    name: "Calendar & Scheduling",
    tagline: "Google Calendar, Outlook & Apple iCal Timelines",
    provider: "Google Calendar & Local Schedule",
    connected: true,
    connected_account: "ankit.developer@gmail.com (Primary Calendar)",
    last_sync: "Just now",
    permission_mode: "both",
    require_approval: true,
    bot_instruction:
      "Schedule events between 9:00 AM and 6:00 PM on weekdays. Avoid double-booking. Always block 10 minutes buffer time between meetings.",
    total_items_read: 31,
    total_items_created: 11,
    recent_activity: [
      {
        id: "act-cal-1",
        domain: "calendar",
        action: "schedule",
        title: "Operating Systems Lecture (Hall 4)",
        detail: "Today 10:00 AM - 11:30 AM",
        timestamp: "08:00 AM",
        status: "success",
      },
      {
        id: "act-cal-2",
        domain: "calendar",
        action: "schedule",
        title: "Project Review Sync (Google Meet)",
        detail: "Today 02:00 PM - 03:00 PM",
        timestamp: "Yesterday",
        status: "success",
      },
    ],
  },
];

const DOMAIN_PRESETS: Record<ProductivityDomain, { title: string; prompt: string }[]> = {
  documents: [
    {
      title: "Academic & College Format",
      prompt: "Structure reports with student details, abstract, question breakdown, code listings, and conclusions.",
    },
    {
      title: "Executive Summary",
      prompt: "Keep documents concise with bullet points, strategic decisions, and high-level summaries.",
    },
  ],
  notes: [
    {
      title: "Zettelkasten / Linked Notes",
      prompt: "Tag notes with #topics, link related concepts, and write atomic, reusable thoughts.",
    },
    {
      title: "Meeting Minutes",
      prompt: "Format as: Date, Attendees, Key Decisions, Action Items with owners.",
    },
  ],
  tasks: [
    {
      title: "Agile Sprint / Subtasks",
      prompt: "Break tasks into manageable 30-minute chunks with definition of done.",
    },
    {
      title: "Eisenhower Matrix",
      prompt: "Classify tasks into Urgent/Important quadrants to maintain focus.",
    },
  ],
  reminders: [
    {
      title: "Gentle Study Prompts",
      prompt: "Give 15-minute advance warnings before deadlines and encourage short hydration breaks.",
    },
    {
      title: "High Urgency Alarms",
      prompt: "Persistent reminders for exams, doctor calls, and submission cutoffs.",
    },
  ],
  email: [
    {
      title: "Strict Human Approval Only",
      prompt: "Draft emails into review queue. Never send without my manual confirmation.",
    },
    {
      title: "Formal Academic & Business",
      prompt: "Write polished, respectful correspondence with clear subject lines and polite sign-offs.",
    },
  ],
  calendar: [
    {
      title: "Deep Work Protector",
      prompt: "Guard 2-hour uninterrupted morning focus blocks. Reject meetings before 11 AM.",
    },
    {
      title: "Balanced Daily Agenda",
      prompt: "Schedule study, coding, and rest intervals evenly across the week.",
    },
  ],
};

export function ProductivityIntegrationsCard() {
  const [integrations, setIntegrations] = useState<ProductivityIntegration[]>(
    DEFAULT_PRODUCTIVITY_INTEGRATIONS
  );
  const [activeDomain, setActiveDomain] = useState<ProductivityDomain>("documents");
  const [savedNotice, setSavedNotice] = useState(false);

  // Live Test Form State
  const [testTitle, setTestTitle] = useState("");
  const [testContent, setTestContent] = useState("");
  const [testDate, setTestDate] = useState("");
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Load saved configuration
  useEffect(() => {
    safeInvoke<ProductivityIntegration[] | null>("get_productivity_integrations")
      .then((loaded) => {
        if (loaded && Array.isArray(loaded) && loaded.length > 0) {
          setIntegrations(loaded);
        } else if (typeof window !== "undefined") {
          try {
            const local = localStorage.getItem("nexora_productivity_integrations");
            if (local) {
              setIntegrations(JSON.parse(local));
            }
          } catch (_) {}
        }
      })
      .catch((err) => console.warn("Could not load productivity integrations:", err));
  }, []);

  const saveIntegrations = (updated: ProductivityIntegration[]) => {
    setIntegrations(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("nexora_productivity_integrations", JSON.stringify(updated));
      } catch (_) {}
    }
    safeInvoke("save_productivity_integrations", { integrations: updated }).catch(() => {});
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const activeIntegration =
    integrations.find((item) => item.id === activeDomain) || integrations[0];

  const updateActiveIntegration = (patch: Partial<ProductivityIntegration>) => {
    const updated = integrations.map((item) =>
      item.id === activeDomain ? { ...item, ...patch } : item
    );
    saveIntegrations(updated);
  };

  // Sync default input fields when switching domain
  useEffect(() => {
    setTestFeedback(null);
    switch (activeDomain) {
      case "documents":
        setTestTitle("Project_Summary_Spec");
        setTestContent("Overview of local multi-agent architecture and autonomous tool executions.");
        setTestDate("");
        break;
      case "notes":
        setTestTitle("Operating Systems Memory Formulas");
        setTestContent("Page Table Size = Number of Pages * Page Table Entry Size. TLB Hit Ratio = 95%.");
        setTestDate("");
        break;
      case "tasks":
        setTestTitle("Prepare OS Lab Assignment Solution");
        setTestContent("High Priority");
        setTestDate("Tomorrow 6:00 PM");
        break;
      case "reminders":
        setTestTitle("Submit Assignment to Classroom Portal");
        setTestContent("Urgent reminder with sound chime");
        setTestDate("in 45 minutes");
        break;
      case "email":
        setTestTitle("Prof. Sharma <sharma@univ.edu>");
        setTestContent("Dear Professor, submitting my completed OS Lab 4 report for evaluation. Regards, Ankit.");
        setTestDate("Re: Lab Assignment 4");
        break;
      case "calendar":
        setTestTitle("Study Session: Distributed Systems");
        setTestContent("Google Meet Hall 2");
        setTestDate("Friday 3:00 PM - 4:30 PM");
        break;
    }
  }, [activeDomain]);

  // Execute test action
  const handleRunTestAction = async (actionType: "create" | "read") => {
    setIsExecuting(true);
    const domain = activeIntegration.id;
    const mode = activeIntegration.permission_mode;

    setTimeout(() => {
      // Permission checks
      if (actionType === "create" && mode === "read") {
        setTestFeedback(
          `🚫 Permission Denied: ${activeIntegration.name} is in 'Read Only' mode. Creating or modifying items is blocked.`
        );
        setIsExecuting(false);
        return;
      }

      if (actionType === "read" && mode === "write") {
        setTestFeedback(
          `🚫 Permission Denied: ${activeIntegration.name} is in 'Write Only' mode. Inspecting existing data is blocked.`
        );
        setIsExecuting(false);
        return;
      }

      // Successful test execution
      const newActivity: ProductivityActivity = {
        id: `act-${Date.now()}`,
        domain,
        action: actionType,
        title: testTitle || `${activeIntegration.name} Item`,
        detail:
          actionType === "create"
            ? `Successfully created: "${testContent.slice(0, 40)}..." (Applied instructions: "${activeIntegration.bot_instruction.slice(0, 30)}...")`
            : `Successfully read and parsed recent items from ${activeIntegration.provider}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "success",
      };

      const updatedActivities = [newActivity, ...activeIntegration.recent_activity].slice(0, 20);

      updateActiveIntegration({
        recent_activity: updatedActivities,
        total_items_created:
          actionType === "create"
            ? activeIntegration.total_items_created + 1
            : activeIntegration.total_items_created,
        total_items_read:
          actionType === "read"
            ? activeIntegration.total_items_read + 1
            : activeIntegration.total_items_read,
        last_sync: "Just now",
      });

      setTestFeedback(
        actionType === "create"
          ? `✅ Successfully created ${activeIntegration.name} item '${testTitle}' using persona rules!`
          : `✅ Successfully fetched and read latest ${activeIntegration.name} data.`
      );

      setIsExecuting(false);
    }, 500);
  };

  const getDomainIcon = (d: ProductivityDomain) => {
    switch (d) {
      case "documents":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "notes":
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case "tasks":
        return <CheckSquare className="w-4 h-4 text-amber-600" />;
      case "reminders":
        return <Bell className="w-4 h-4 text-rose-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-indigo-600" />;
      case "calendar":
        return <Calendar className="w-4 h-4 text-violet-600" />;
    }
  };

  return (
    <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-6 shadow-xs max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-600" />
              Productivity & Workspace Integrations
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
              Docs • Notes • Tasks • Reminders • Email • Calendar
            </span>
          </div>
          <p className="text-xs text-[#7a7164] mt-1">
            Connect external apps and local stores so NEXORA can autonomously take notes, create documents, manage to-dos, set reminders, draft emails, and schedule events.
          </p>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-pulse">
            <Check className="w-3.5 h-3.5" />
            Integrations Saved!
          </div>
        )}
      </div>

      {/* Domain Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 p-1.5 bg-[#f8f5ee] rounded-2xl border border-[#ece4d8]">
        {integrations.map((item) => {
          const isActive = item.id === activeDomain;
          return (
            <button
              key={item.id}
              onClick={() => setActiveDomain(item.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-[#2d2a26] shadow-xs border border-[#e5decb]"
                  : "text-[#6f6759] hover:text-[#2d2a26] hover:bg-white/60"
              }`}
            >
              <div className="mb-1">{getDomainIcon(item.id)}</div>
              <span className="font-semibold text-[11px] truncate">{item.name}</span>
              <span
                className={`text-[8px] px-1.5 py-0.2 rounded font-mono mt-0.5 ${
                  item.permission_mode === "both"
                    ? "bg-violet-100 text-violet-700"
                    : item.permission_mode === "read"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {item.permission_mode.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Integration Banner & Connection Details */}
      <div className="p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white rounded-lg border border-[#ece4d8]">
              {getDomainIcon(activeIntegration.id)}
            </div>
            <span className="font-bold text-sm text-[#2d2a26]">
              {activeIntegration.name} Integration
            </span>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
                activeIntegration.connected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              {activeIntegration.connected ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active & Synced
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-stone-500" />
                  Disconnected
                </>
              )}
            </span>
          </div>

          <p className="text-[11px] text-[#7a7164]">
            {activeIntegration.tagline}
          </p>

          <div className="text-[11px] font-mono text-[#5b5346] flex flex-wrap items-center gap-3 pt-1">
            <span>Provider: <strong className="text-violet-800">{activeIntegration.provider}</strong></span>
            <span>•</span>
            <span>Account: {activeIntegration.connected_account || "Local Workstation"}</span>
            <span>•</span>
            <span>Read: {activeIntegration.total_items_read}</span>
            <span>•</span>
            <span>Created: {activeIntegration.total_items_created}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => updateActiveIntegration({ connected: !activeIntegration.connected })}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeIntegration.connected
                ? "bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            }`}
          >
            {activeIntegration.connected ? "Disconnect" : "Connect Provider"}
          </button>
        </div>
      </div>

      {/* Operating Permissions for this domain */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#2d2a26] flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-violet-600" />
            Operating Permission Mode ({activeIntegration.name})
          </label>
          <span className="text-[11px] text-[#7a7164]">
            Applied whenever the bot interacts with {activeIntegration.name.toLowerCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Read Only */}
          <div
            onClick={() => updateActiveIntegration({ permission_mode: "read" })}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              activeIntegration.permission_mode === "read"
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
                  activeIntegration.permission_mode === "read"
                    ? "border-sky-600"
                    : "border-[#d8cfc0]"
                }`}
              >
                {activeIntegration.permission_mode === "read" && (
                  <div className="w-2 h-2 rounded-full bg-sky-600" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#71685b] leading-relaxed">
              Bot can <strong>only read, search, and summarize</strong> existing items. It cannot create, edit, or delete anything.
            </p>
          </div>

          {/* Write Only */}
          <div
            onClick={() => updateActiveIntegration({ permission_mode: "write" })}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              activeIntegration.permission_mode === "write"
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
                  activeIntegration.permission_mode === "write"
                    ? "border-amber-600"
                    : "border-[#d8cfc0]"
                }`}
              >
                {activeIntegration.permission_mode === "write" && (
                  <div className="w-2 h-2 rounded-full bg-amber-600" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#71685b] leading-relaxed">
              Bot can <strong>only create or schedule new items</strong> when commanded. It has no permission to read your existing data.
            </p>
          </div>

          {/* Read & Write (Both) */}
          <div
            onClick={() => updateActiveIntegration({ permission_mode: "both" })}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              activeIntegration.permission_mode === "both"
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
                  activeIntegration.permission_mode === "both"
                    ? "border-violet-600"
                    : "border-[#d8cfc0]"
                }`}
              >
                {activeIntegration.permission_mode === "both" && (
                  <div className="w-2 h-2 rounded-full bg-violet-600" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#71685b] leading-relaxed">
              Full bi-directional access: Bot can <strong>read, search, create, update, and manage</strong> items based on your instructions.
            </p>
          </div>
        </div>
      </div>

      {/* Bot Custom Instructions & Safety Approval Switch */}
      <div className="space-y-3 p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-[#2d2a26] flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-600" />
              Bot Instructions & Persona for {activeIntegration.name}
            </label>
            <p className="text-[11px] text-[#7a7164]">
              Instruct NEXORA how to behave when handling your {activeIntegration.name.toLowerCase()}.
            </p>
          </div>

          {/* Require user confirmation toggle */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#ece4d8] shrink-0">
            <span className="text-[11px] font-semibold text-[#2d2a26]">
              Require Human Confirmation:
            </span>
            <input
              type="checkbox"
              checked={activeIntegration.require_approval}
              onChange={(e) =>
                updateActiveIntegration({ require_approval: e.target.checked })
              }
              className="w-4 h-4 rounded text-violet-600 cursor-pointer"
            />
          </div>
        </div>

        <textarea
          rows={3}
          value={activeIntegration.bot_instruction}
          onChange={(e) =>
            updateActiveIntegration({ bot_instruction: e.target.value })
          }
          placeholder="e.g. Always structure documents with clear headings... Never send emails without asking me first..."
          className="w-full p-3 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26] focus:outline-none focus:border-violet-500 font-normal leading-relaxed"
        />

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-[#877e70] uppercase tracking-wider">
            Quick Persona Rules:
          </span>
          <div className="flex flex-wrap gap-2">
            {(DOMAIN_PRESETS[activeDomain] || []).map((preset, idx) => (
              <button
                key={idx}
                onClick={() =>
                  updateActiveIntegration({ bot_instruction: preset.prompt })
                }
                className="text-[11px] px-2.5 py-1 bg-white hover:bg-violet-50 hover:border-violet-300 border border-[#ece4d8] rounded-lg text-[#524a3e] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-violet-600" />
                {preset.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Testing & Activity Simulator */}
      <div className="space-y-4 p-4 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#f1e9dd] pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-violet-600 animate-pulse" />
            <h4 className="text-xs font-bold text-[#2d2a26]">
              Interactive Tester & Activity Feed ({activeIntegration.name})
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[#7a7164]">
            Mode: <strong className="uppercase text-violet-700">{activeIntegration.permission_mode}</strong>
          </span>
        </div>

        {/* Test Inputs Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-[11px] font-semibold text-[#2d2a26]">
              Title / Subject / Contact
            </label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Title or identifier..."
              className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26]"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="text-[11px] font-semibold text-[#2d2a26]">
              Details / Content
            </label>
            <input
              type="text"
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="Content body..."
              className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26]"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="text-[11px] font-semibold text-[#2d2a26]">
              Date / Time Slot (Optional)
            </label>
            <input
              type="text"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              placeholder="e.g. Tomorrow 5 PM..."
              className="w-full p-2 bg-white border border-[#ece4d8] rounded-xl text-xs text-[#2d2a26]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleRunTestAction("create")}
            disabled={isExecuting}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Test Create / Write Action
          </button>

          <button
            onClick={() => handleRunTestAction("read")}
            disabled={isExecuting}
            className="px-4 py-2 bg-white hover:bg-[#f6f2ea] border border-[#ece4d8] rounded-xl text-xs font-semibold text-[#2d2a26] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            Test Read / Search Action
          </button>
        </div>

        {/* Test Feedback Notice */}
        {testFeedback && (
          <div className="p-3 bg-violet-50/80 border border-violet-200 rounded-xl text-xs text-violet-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{testFeedback}</div>
            <button
              onClick={() => setTestFeedback(null)}
              className="text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Recent Activity Log */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#665e52]">
            <span>Recent {activeIntegration.name} Actions Executed:</span>
            <span>{activeIntegration.recent_activity.length} recorded</span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {activeIntegration.recent_activity.length === 0 ? (
              <div className="text-center py-4 text-xs text-stone-400 italic">
                No activity logged yet for this domain.
              </div>
            ) : (
              activeIntegration.recent_activity.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl border bg-white border-[#ece4d8] text-xs flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#7a7164]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#2d2a26]">
                        {act.title}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-violet-100 text-violet-800">
                        {act.action.toUpperCase()}
                      </span>
                    </div>
                    <span>{act.timestamp}</span>
                  </div>
                  {act.detail && (
                    <div className="text-[11px] text-[#554d40]">
                      {act.detail}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
