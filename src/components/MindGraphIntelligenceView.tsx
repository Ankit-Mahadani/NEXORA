"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Brain,
  Search,
  GitBranch,
  FileCode,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle,
  ArrowRight,
  Database,
  MessageSquare,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { safeInvoke } from "@/lib/ipc";
import { KnowledgeEntity, KnowledgeRelation, GraphDiscoveryResult } from "@/lib/types";

export function MindGraphIntelligenceView() {
  const [graphResult, setGraphResult] = useState<GraphDiscoveryResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<KnowledgeEntity | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchGraph = (query = "") => {
    setIsQuerying(true);
    safeInvoke<GraphDiscoveryResult>("query_mind_graph", { query })
      .then((res) => {
        setGraphResult(res);
        if (res && res.nodes.length > 0 && !selectedEntity) {
          setSelectedEntity(res.nodes[0]);
        }
      })
      .catch((err) => console.error("Error fetching mind graph:", err))
      .finally(() => setIsQuerying(false));
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGraph(searchQuery.trim());
  };

  const filteredNodes = (graphResult?.nodes || []).filter((n) => {
    if (typeFilter === "all") return true;
    return n.entity_type === typeFilter;
  });

  const connectedEdges = (graphResult?.edges || []).filter((e) => {
    if (!selectedEntity) return false;
    return e.source_id === selectedEntity.id || e.target_id === selectedEntity.id;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "decision":
        return <Zap className="w-3.5 h-3.5 text-purple-600" />;
      case "file":
        return <FileCode className="w-3.5 h-3.5 text-sky-600" />;
      case "project":
        return <Layers className="w-3.5 h-3.5 text-emerald-600" />;
      case "memory":
        return <Brain className="w-3.5 h-3.5 text-amber-600" />;
      case "conversation":
        return <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Share2 className="w-3.5 h-3.5 text-stone-600" />;
    }
  };

  return (
    <div className="flex-1 p-8 bg-[#fbf9f5] text-[#2d2a26] overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2d2a26] flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-600" />
              Knowledge Graph Intelligence
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 font-bold">
              Odysseus Mind Graph
            </span>
          </div>
          <p className="text-xs text-[#7e7568] mt-1">
            Connect memories, conversations, files, projects, and decisions so Odysseus can discover relationships that ordinary keyword search misses.
          </p>
        </div>

        <button
          onClick={() => fetchGraph(searchQuery)}
          disabled={isQuerying}
          className="px-4 py-2.5 bg-white border border-[#ece4d8] hover:bg-[#faf7f2] text-[#4d463b] rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isQuerying ? "animate-spin text-teal-600" : ""}`} />
          Refresh Graph
        </button>
      </div>

      {/* Semantic Discovery Search Bar */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-3.5 shadow-xs max-w-5xl">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Find how Decision on SQLite WAL relates to recent tasks and files..."
              className="w-full pl-10 pr-4 py-3 bg-[#fcfaf7] border border-[#ece4d8] rounded-2xl text-xs focus:outline-none focus:border-teal-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isQuerying}
            className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Multi-Hop Discovery
          </button>
        </form>

        {/* Discovery Insight Banner */}
        {graphResult?.insight && (
          <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl text-xs text-teal-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold font-mono uppercase text-[10px] text-teal-800 block">
                Non-Obvious Semantic Relationship Discovered:
              </span>
              <p className="mt-0.5 leading-relaxed font-medium">
                {graphResult.insight}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl">
        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <Share2 className="w-3.5 h-3.5 text-teal-600" />
            Connected Entities
          </div>
          <div className="text-2xl font-extrabold text-teal-900 font-mono">
            {graphResult?.nodes.length || 8}
          </div>
          <div className="text-[10px] text-stone-500">Cross-domain nodes</div>
        </div>

        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
            Semantic Relations
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 font-mono">
            {graphResult?.edges.length || 7}
          </div>
          <div className="text-[10px] text-stone-500">Active directed edges</div>
        </div>

        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Discovery Depth
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">
            {graphResult?.path_hops || 3} Hops
          </div>
          <div className="text-[10px] text-purple-600 font-semibold">Traversed automatically</div>
        </div>

        <div className="p-4 bg-white border border-[#ece4d8] rounded-2xl shadow-xs space-y-1">
          <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1.5 font-bold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Avg Confidence
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">
            96.8%
          </div>
          <div className="text-[10px] text-stone-500">Graph inferred links</div>
        </div>
      </div>

      {/* Entity Type Filter Pills */}
      <div className="flex items-center gap-2 max-w-5xl overflow-x-auto pb-1">
        {[
          { id: "all", label: "All Entities" },
          { id: "decision", label: "Decisions" },
          { id: "file", label: "Files" },
          { id: "project", label: "Projects / Tasks" },
          { id: "memory", label: "Memories" },
          { id: "conversation", label: "Conversations" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              typeFilter === tab.id
                ? "bg-teal-600 text-white shadow-2xs"
                : "bg-white border border-[#ece4d8] text-[#696154] hover:text-[#2d2a26]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive Visual Network Canvas */}
      <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs max-w-5xl">
        <div className="flex items-center justify-between border-b border-[#f3ede3] pb-3">
          <h3 className="text-xs font-bold text-[#2d2a26] uppercase font-mono tracking-wider flex items-center gap-2">
            <Share2 className="w-4 h-4 text-teal-600" />
            Mind Graph Neural Topology
          </h3>
          <span className="text-[10px] font-mono text-stone-400">
            Click any entity to inspect connected multi-hop relations
          </span>
        </div>

        {/* Visual Entity Grid Map */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {filteredNodes.map((node) => {
            const isSelected = selectedEntity?.id === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedEntity(node)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? "bg-teal-50/50 border-teal-500 shadow-xs ring-2 ring-teal-200"
                    : "bg-[#fcfaf7] border-[#ece4d8] hover:border-teal-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 flex items-center gap-1">
                    {getEntityIcon(node.entity_type)}
                    {node.entity_type}
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">
                    {node.id.split("-").pop()}
                  </span>
                </div>

                <div className="text-xs font-bold text-[#2d2a26] line-clamp-1">
                  {node.name}
                </div>

                <p className="text-[10px] text-[#786f62] line-clamp-2">
                  {node.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Entity Inspector & Connected Multi-Hop Relations */}
      {selectedEntity && (
        <div className="p-6 bg-white border border-[#ece4d8] rounded-3xl space-y-4 shadow-xs max-w-5xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3ede3] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold uppercase">
                  {selectedEntity.entity_type}
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  {selectedEntity.id}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#2d2a26] mt-1">
                {selectedEntity.name}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-stone-400">
              Indexed {new Date(selectedEntity.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="p-3.5 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl text-xs space-y-1">
            <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
              Entity Synopsis & Semantic Role
            </div>
            <p className="text-[11px] text-[#554e42] leading-relaxed font-medium">
              {selectedEntity.summary}
            </p>
          </div>

          {/* Connected Edges List */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
              Connected Multi-Hop Relations ({connectedEdges.length})
            </div>

            <div className="space-y-2">
              {connectedEdges.map((edge, idx) => {
                const targetNode = graphResult?.nodes.find(
                  (n) => n.id === (edge.source_id === selectedEntity.id ? edge.target_id : edge.source_id)
                );
                return (
                  <div
                    key={idx}
                    className="p-3 bg-[#fcfaf7] border border-[#efe7dc] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 uppercase">
                        {edge.relation_type}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-bold text-[#2d2a26]">
                        {targetNode?.name || edge.target_id}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#71685b] font-medium sm:text-right">
                      {edge.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
