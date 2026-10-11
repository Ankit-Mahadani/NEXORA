"use client";

import React, { useEffect, useState } from "react";
import { ListTodo, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { Task } from "@/lib/types";

export function TaskHistoryView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeInvoke<Task[]>("list_tasks")
      .then((res) => setTasks(res || []))
      .catch((err) => console.error("Failed to load tasks:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-rose-500" />
          Task History
        </h2>
        <p className="text-xs text-[#7b7264] mt-1">
          Persistent execution history and outcomes safely preserved in SQLite.
        </p>
      </div>

      {loading ? (
        <div className="text-xs text-[#8c8275]">Loading past journeys...</div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#ece4d8] rounded-3xl text-xs text-[#8e8576] shadow-xs">
          No tasks recorded yet. Submit a goal in the Workspace tab to get started.
        </div>
      ) : (
        <div className="space-y-3.5 max-w-4xl">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="p-5 bg-white border border-[#ece4d8] rounded-3xl text-xs space-y-2.5 hover:border-violet-300 transition-all shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#2d2a26] text-sm">{t.title}</span>
                <span
                  className={`text-[10px] font-mono px-3 py-1 rounded-full border font-bold ${
                    t.status === "completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : t.status === "failed"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-violet-50 text-violet-700 border-violet-200"
                  }`}
                >
                  {t.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[#645c4f] text-xs leading-relaxed">{t.objective}</p>
              <div className="flex items-center gap-5 text-[11px] text-[#938a7c] font-mono pt-2 border-t border-[#f4ede3]">
                <span>Model: {t.selected_model}</span>
                <span>Iterations: {t.current_iteration}/{t.max_iterations}</span>
                <span>Date: {new Date(t.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
