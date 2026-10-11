import { invoke } from "@tauri-apps/api/core";
import { listen, EventCallback, UnlistenFn } from "@tauri-apps/api/event";
import {
  Task,
  SystemMetrics,
  OllamaModelInfo,
  GraphData,
  MemoryItem,
} from "./types";

// Check if running inside Tauri native webview
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
};

// Safe invoke wrapper with full fallback support when previewed in web browsers
export async function safeInvoke<T>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  if (isTauri()) {
    return await invoke<T>(cmd, args);
  }

  // Graceful browser fallback for web browser preview
  switch (cmd) {
    case "list_models":
      return [
        { name: "qwen2.5-coder:7b", size: 4683087561, details: { family: "qwen2", parameter_size: "7B" } },
        { name: "huihui_ai/qwen3.5-abliterated:9b", size: 6594474755, details: { family: "qwen35", parameter_size: "9B" } },
        { name: "ankit-persona:latest", size: 4683095651, details: { family: "qwen2", parameter_size: "7B" } },
      ] as unknown as T;

    case "get_system_metrics":
      return {
        cpu_usage: 12.8,
        memory_used_mb: 8420,
        memory_total_mb: 32768,
        memory_percentage: 25.7,
        disk_free_gb: 240,
        disk_total_gb: 512,
        os_name: "Windows",
        os_version: "11",
        ollama_online: true,
        neo4j_online: false,
        active_tasks_count: 0,
      } as unknown as T;

    case "list_tasks":
      return [] as unknown as T;

    case "search_memories":
      return [] as unknown as T;

    case "get_task_graph":
      return {
        nodes: [],
        relationships: [],
        status: "offline",
      } as unknown as T;

    case "get_tool_permissions":
      return [
        { name: "list_dir", description: "List contents of workspace directory", permission_level: "safe" },
        { name: "read_file", description: "Read contents of files", permission_level: "safe" },
        { name: "write_file", description: "Write files safely inside workspace", permission_level: "moderate_impact" },
        { name: "patch_file", description: "Apply unified code diffs", permission_level: "moderate_impact" },
        { name: "run_command", description: "Execute sandboxed terminal commands", permission_level: "sensitive" },
        { name: "system_info", description: "Inspect environment diagnostics", permission_level: "safe" },
      ] as unknown as T;

    case "create_and_run_task": {
      const mockTask: Task = {
        id: "task-" + Math.random().toString(36).substring(2, 9),
        title: args.title || "Goal",
        objective: args.objective || "",
        status: "executing",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_iteration: 1,
        max_iterations: 5,
        workspace_path: "c:/D/IDE PROJECTS/self/NEXORA",
        selected_model: args.model || "qwen2.5-coder:7b",
      };
      return mockTask as unknown as T;
    }

    default:
      return {} as unknown as T;
  }
}

export async function safeListen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (isTauri()) {
    return await listen<T>(event, handler);
  }
  return () => {};
}
