"use client";

import React, { useEffect, useState } from "react";
import { Settings, Shield, FolderOpen, Terminal } from "lucide-react";
import { safeInvoke } from "@/lib/ipc";

export function SettingsView() {
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    safeInvoke<any[]>("get_tool_permissions")
      .then((res) => setTools(res || []))
      .catch((err) => console.error("Failed to load permissions:", err));
  }, []);

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
          <Settings className="w-5 h-5 text-stone-500" />
          Settings & Boundaries
        </h2>
        <p className="text-xs text-[#7e7568] mt-1">
          Configure security policies, workspace isolation, and execution privileges.
        </p>
      </div>

      {/* Security sandbox policies */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs max-w-4xl">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Execution Boundaries
        </h3>
        <div className="text-xs text-[#2d2a26] space-y-2.5">
          <div className="flex items-center justify-between p-4 bg-[#fcfaf7] rounded-2xl border border-[#efe7dc]">
            <div>
              <div className="font-semibold text-sm">Workspace Isolation</div>
              <div className="text-[11px] text-[#7a7164] mt-0.5">
                Restricts directory traversal strictly within authorized project roots.
              </div>
            </div>
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              ENFORCED
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

      {/* Registered Native Tools */}
      <div className="space-y-4 max-w-4xl">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#696154] flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-600" />
          Native Tool System
        </h3>
        <div className="space-y-2.5">
          {tools.map((t) => (
            <div
              key={t.name}
              className="p-4 bg-white border border-[#ece4d8] rounded-2xl text-xs flex items-center justify-between shadow-xs"
            >
              <div>
                <span className="font-mono text-[#2d2a26] font-bold text-sm">{t.name}</span>
                <p className="text-[11px] text-[#71685b] mt-0.5">{t.description}</p>
              </div>
              <span
                className={`text-[10px] font-mono px-3 py-1 rounded-full border uppercase font-bold ${
                  t.permission_level === "safe"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : t.permission_level === "sensitive"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {t.permission_level}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
