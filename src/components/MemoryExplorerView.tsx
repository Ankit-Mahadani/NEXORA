"use client";

import React, { useEffect, useState } from "react";
import { Brain, Search, Database } from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { MemoryItem, GraphData } from "@/lib/types";

export function MemoryExplorerView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const fetchMemories = (query = "") => {
    safeInvoke<MemoryItem[]>("search_memories", { query })
      .then((res) => setMemories(res || []))
      .catch((err) => console.error("Memory search error:", err));
  };

  useEffect(() => {
    fetchMemories("");
    safeInvoke<GraphData>("get_task_graph", { taskId: "current" })
      .then((res) => setGraphData(res))
      .catch((err) => console.error("Graph fetch error:", err));
  }, []);

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          Memory & Experience Reflection
        </h2>
        <p className="text-xs text-[#7e7568] mt-1">
          Explore validated knowledge, prior solutions, and graph task relationships.
        </p>
      </div>

      {/* Neo4j Status Bar */}
      <div className="p-4 bg-white border border-[#ece4d8] rounded-3xl flex items-center justify-between text-xs shadow-xs max-w-4xl">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-violet-600" />
          <span className="text-[#2d2a26] font-semibold">Graph Memory Engine:</span>
          <span className="font-mono text-[#797063]">
            {graphData?.status || "Probing..."}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-4xl">
        <Search className="w-4 h-4 text-[#9c9284] absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            fetchMemories(e.target.value);
          }}
          placeholder="Search past memories and learned procedures..."
          className="w-full bg-white border border-[#e8dfd2] rounded-3xl pl-11 pr-5 py-3 text-xs text-[#2d2a26] focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all shadow-xs placeholder-[#9f9588]"
        />
      </div>

      {/* Memory list */}
      <div className="space-y-3.5 max-w-4xl">
        {memories.length === 0 ? (
          <div className="p-12 text-center bg-white border border-[#ece4d8] rounded-3xl text-xs text-[#8e8576] shadow-xs">
            No memories match your query. Verified experiences will be preserved here.
          </div>
        ) : (
          memories.map((m) => (
            <div
              key={m.id}
              className="p-5 bg-white border border-[#ece4d8] rounded-3xl text-xs space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 font-bold">
                  {m.category}
                </span>
                <span className="text-[10px] font-mono text-[#918778]">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap text-[#2d2a26] bg-[#fcfaf7] p-4 rounded-2xl border border-[#efe7dc] leading-relaxed">
                {m.content}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
