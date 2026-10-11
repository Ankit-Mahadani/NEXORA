"use client";

import React, { useEffect, useState } from "react";
import { Activity, Server, Cpu, HardDrive, RefreshCw } from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { SystemMetrics } from "@/lib/types";

export function SystemMonitorView() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    safeInvoke<SystemMetrics>("get_system_metrics")
      .then((res) => setMetrics(res))
      .catch((err) => console.error("Telemetry error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      <div className="flex items-center justify-between max-w-5xl">
        <div>
          <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            System Resources & Services
          </h2>
          <p className="text-xs text-[#7e7568] mt-1">
            Real-time telemetry of host hardware usage and inference service availability.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-white hover:bg-[#f6f2ea] border border-[#ece4d8] rounded-full text-xs font-semibold text-[#2d2a26] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Poll Telemetry
        </button>
      </div>

      {loading && !metrics ? (
        <div className="text-xs text-[#8e8576]">Measuring system resources...</div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
          {/* CPU Card */}
          <div className="p-5 bg-white border border-[#ece4d8] rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#6e6659]">
              <span className="flex items-center gap-2 font-medium">
                <Cpu className="w-4 h-4 text-violet-600" /> CPU Usage
              </span>
              <span className="font-mono text-[#2d2a26] font-bold">{metrics.cpu_usage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[#f4eee4] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 to-pink-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.cpu_usage)}%` }}
              ></div>
            </div>
          </div>

          {/* RAM Card */}
          <div className="p-5 bg-white border border-[#ece4d8] rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#6e6659]">
              <span className="flex items-center gap-2 font-medium">
                <Server className="w-4 h-4 text-pink-500" /> Memory
              </span>
              <span className="font-mono text-[#2d2a26] font-bold">
                {(metrics.memory_used_mb / 1024).toFixed(1)} / {(metrics.memory_total_mb / 1024).toFixed(1)} GB
              </span>
            </div>
            <div className="w-full bg-[#f4eee4] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-pink-400 to-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.memory_percentage)}%` }}
              ></div>
            </div>
          </div>

          {/* Disk Storage Card */}
          <div className="p-5 bg-white border border-[#ece4d8] rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#6e6659]">
              <span className="flex items-center gap-2 font-medium">
                <HardDrive className="w-4 h-4 text-emerald-600" /> Free Disk
              </span>
              <span className="font-mono text-[#2d2a26] font-bold">
                {metrics.disk_free_gb} GB
              </span>
            </div>
            <div className="text-[11px] text-[#8e8576] font-mono">
              Total Disk: {metrics.disk_total_gb} GB
            </div>
          </div>

          {/* Service status */}
          <div className="p-5 bg-white border border-[#ece4d8] rounded-3xl space-y-3 shadow-xs">
            <div className="text-xs text-[#6e6659] font-medium">Local Services</div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center">
                <span>Ollama Engine:</span>
                <span className={metrics.ollama_online ? "text-emerald-700 font-bold" : "text-rose-600"}>
                  {metrics.ollama_online ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Neo4j Graph:</span>
                <span className={metrics.neo4j_online ? "text-emerald-700 font-bold" : "text-[#8e8576]"}>
                  {metrics.neo4j_online ? "ONLINE" : "FALLBACK"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
