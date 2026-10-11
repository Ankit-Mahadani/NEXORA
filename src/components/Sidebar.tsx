"use client";

import React from "react";
import {
  Sparkles,
  ListTodo,
  Bot,
  Brain,
  Cpu,
  Activity,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { useAppStore, ActiveView } from "@/store/useAppStore";

export function Sidebar() {
  const { currentView, setCurrentView, theme, setTheme } = useAppStore();

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Workspace & Assistant", icon: <Sparkles className="w-4 h-4 text-violet-500" /> },
    { id: "tasks", label: "Task History", icon: <ListTodo className="w-4 h-4 text-rose-400" /> },
    { id: "agents", label: "Agent Runs", icon: <Bot className="w-4 h-4 text-indigo-500" /> },
    { id: "memory", label: "Memory Explorer", icon: <Brain className="w-4 h-4 text-purple-400" /> },
    { id: "models", label: "Ollama Models", icon: <Cpu className="w-4 h-4 text-amber-500" /> },
    { id: "monitor", label: "System Monitor", icon: <Activity className="w-4 h-4 text-emerald-500" /> },
    { id: "settings", label: "Security & Rules", icon: <Settings className="w-4 h-4 text-stone-400" /> },
  ];

  return (
    <aside className="w-64 bg-[#f8f5ee]/85 backdrop-blur-xl border-r border-[#ece4d8] flex flex-col justify-between shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
      <div>
        {/* Brand header */}
        <div className="p-5 border-b border-[#ece4d8]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/40 to-amber-300/40 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-9 h-9 rounded-2xl bg-white dark:bg-[#121212] border border-[#f0e8dc] dark:border-[#262626] flex items-center justify-center overflow-hidden shadow-sm p-1.5">
                <img
                  src="/logo.png"
                  alt="NEXORA Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-[#2d2a26] flex items-center gap-1.5">
                NEXORA
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                  v1.0
                </span>
              </div>
              <div className="text-[11px] text-[#8c8275] flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Soft Local Assistant
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-5 pt-5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#9f9486] font-semibold">
          AI Navigation
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white text-violet-900 border border-[#e8dfd2] shadow-sm shadow-violet-900/5"
                    : "text-[#6c6458] hover:text-[#2d2a26] hover:bg-white/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-xl ${isActive ? "bg-violet-50 text-violet-600" : "bg-[#f1ebe0] group-hover:bg-[#ebe3d6]"} transition-colors`}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </div>
                {isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 text-violet-500" />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Quick Theme Switcher */}
      <div className="p-4 border-t border-[#ece4d8]/80 bg-[#fbf9f4]/60 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-[#726a5e]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Sandbox Active
          </span>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-white hover:bg-[#f6f2ea] text-[#6c6458] border border-[#ece4d8] transition-all cursor-pointer shadow-2xs"
            title={theme === "light" ? "Switch to Dark (Obsidian) theme" : "Switch to Light (White) theme"}
          >
            {theme === "light" ? (
              <>
                <Sun className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3 h-3 text-violet-400 fill-violet-400/20" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
