"use client";

import React, { useEffect, useState } from "react";
import { Cpu, Check, AlertCircle, RefreshCw } from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { OllamaModelInfo } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export function ModelManagerView() {
  const { selectedModel, setSelectedModel } = useAppStore();
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchModels = () => {
    setLoading(true);
    safeInvoke<OllamaModelInfo[]>("list_models")
      .then((res) => {
        const list = res || [];
        setModels(list);
        setIsOffline(list.length === 0);
      })
      .catch((err) => {
        console.warn("Ollama is unreachable:", err);
        setModels([]);
        setIsOffline(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      <div className="flex items-center justify-between max-w-4xl">
        <div>
          <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-500" />
            Ollama Model Manager
          </h2>
          <p className="text-xs text-[#7e7568] mt-1">
            Discover and select local or cloud models served through your Ollama instance.
          </p>
        </div>
        <button
          onClick={fetchModels}
          disabled={loading}
          className="px-4 py-2 bg-white hover:bg-[#f6f2ea] border border-[#ece4d8] rounded-full text-xs font-semibold text-[#2d2a26] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-violet-600" : ""}`} />
          Refresh Models
        </button>
      </div>

      {isOffline && !loading && (
        <div className="p-6 bg-white border border-amber-200 rounded-3xl text-xs text-[#2d2a26] space-y-3 shadow-xs max-w-4xl">
          <div className="flex items-center gap-2.5 text-amber-600 font-semibold text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Ollama Server Not Detected</span>
          </div>
          <p className="text-[#6c6458] leading-relaxed text-xs">
            The local Ollama daemon is currently not running at <code className="bg-[#f7f2ea] px-2 py-0.5 rounded-md text-[#2d2a26]">http://127.0.0.1:11434</code>.
            Run the following in your shell:
          </p>
          <div className="bg-[#fcfaf7] p-3.5 rounded-2xl border border-[#efe7dc] font-mono text-xs text-[#2d2a26]">
            ollama serve
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-[#8e8576] flex items-center gap-2 py-4">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600" />
          Probing local Ollama service...
        </div>
      ) : models.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#ece4d8] rounded-3xl text-xs text-[#8e8576] shadow-xs max-w-4xl space-y-2">
          <div>No models currently returned from Ollama.</div>
          <div className="text-[11px] text-[#a19789]">Run <code className="font-mono text-[#2d2a26]">ollama serve</code> then click Refresh above.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {models.map((m) => {
            const isSelected = selectedModel === m.name;
            return (
              <div
                key={m.name}
                onClick={() => setSelectedModel(m.name)}
                className={`p-5 rounded-3xl border text-xs cursor-pointer transition-all space-y-3 ${
                  isSelected
                    ? "bg-white border-violet-400 shadow-md shadow-violet-900/5 ring-2 ring-violet-100"
                    : "bg-white border-[#ece4d8] hover:border-[#dfd5c7] shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#2d2a26] text-sm font-mono truncate max-w-[240px]">
                    {m.name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-200 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#786f62] font-mono space-y-1 pt-2 border-t border-[#f4ede3]">
                  <div>Family: {m.details?.family || "unknown"}</div>
                  <div>Params: {m.details?.parameter_size || "N/A"}</div>
                  <div>Size: {m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : "Cloud"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
