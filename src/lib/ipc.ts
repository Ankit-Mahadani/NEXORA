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
        { name: "system_info", description: "Get current operating system, hardware, and environment diagnostics", permission_level: "safe", category: "System" },
        { name: "take_screenshot", description: "Capture a full screenshot of the screen and save to Desktop or specified destination", permission_level: "safe", category: "Automation" },
        { name: "desktop_app", description: "Open or close desktop applications (e.g. Notepad, Chrome, Spotify) or open files with their default program", permission_level: "moderate_impact", category: "Automation" },
        { name: "write_file", description: "Write or overwrite a file with given content in authorized user folders", permission_level: "moderate_impact", category: "Filesystem" },
        { name: "patch_file", description: "Replace target snippet in an existing file using unified diffs", permission_level: "moderate_impact", category: "Filesystem" },
        { name: "list_dir", description: "List contents and directories of a folder in the workspace", permission_level: "safe", category: "Filesystem" },
        { name: "system_control", description: "Manage system power state: schedule shutdown, cancel shutdown, restart, or sleep", permission_level: "sensitive", category: "System" },
        { name: "read_file", description: "Read the text contents of a file within authorized folders", permission_level: "safe", category: "Filesystem" },
        { name: "run_command", description: "Execute a sandboxed terminal command within the workspace", permission_level: "sensitive", category: "Terminal" },
        { name: "browser_automation", description: "Automate Chromium/Edge browser navigation, tab control, and web scraping", permission_level: "sensitive", category: "Web & Network" },
        { name: "clipboard_access", description: "Read and write system clipboard contents and rich text buffers", permission_level: "moderate_impact", category: "System" },
        { name: "web_search", description: "Perform live web searches and index external references", permission_level: "safe", category: "Web & Network" },
        { name: "network_http", description: "Send outbound HTTP requests and fetch remote REST APIs", permission_level: "moderate_impact", category: "Web & Network" },
        { name: "audio_synthesis", description: "Local text-to-speech voice generation and auditory feedback", permission_level: "safe", category: "Hardware" },
        { name: "camera_capture", description: "Capture webcam frame for computer vision and object inspection", permission_level: "sensitive", category: "Hardware" },
        { name: "file_deletion", description: "Permanently delete files or directories in authorized folders", permission_level: "sensitive", category: "Filesystem" },
        { name: "git_operations", description: "Execute Git version control actions, branch switching, and commits", permission_level: "moderate_impact", category: "Terminal" },
        { name: "active_window_inspect", description: "Inspect titles, bounds, and process IDs of currently open windows", permission_level: "safe", category: "System" },
        { name: "keystroke_automation", description: "Simulate native Windows keystrokes and hotkey combinations", permission_level: "sensitive", category: "Automation" },
        { name: "mouse_click_automation", description: "Simulate native Windows mouse cursor movements, clicks, and drags", permission_level: "sensitive", category: "Automation" },
        { name: "environment_variables", description: "Inspect and configure process environment variables and paths", permission_level: "sensitive", category: "System" },
        { name: "notification_toast", description: "Display native Windows Action Center notifications and banners", permission_level: "safe", category: "System" },
        { name: "scheduled_cron", description: "Register recurring background cron jobs and automated reminders", permission_level: "safe", category: "Automation" },
        { name: "package_manager", description: "Install, update, or remove packages via WinGet, npm, or pip", permission_level: "sensitive", category: "Terminal" },
        { name: "database_direct_sql", description: "Execute raw SQL and Cypher queries against SQLite and Neo4j", permission_level: "moderate_impact", category: "Data" },
        { name: "registry_read", description: "Read Windows registry configuration keys and values", permission_level: "sensitive", category: "System" },
        { name: "registry_write", description: "Modify Windows registry keys and workstation group policies", permission_level: "sensitive", category: "System" },
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
        is_ephemeral: args.is_ephemeral,
      };
      return mockTask as unknown as T;
    }

    case "rate_task":
      return undefined as unknown as T;

    case "get_setting":
      return null as unknown as T;

    case "set_setting":
      return undefined as unknown as T;

    case "listen_speech_offline":
      return "" as unknown as T;

    case "cancel_speech_offline":
      return undefined as unknown as T;

    case "list_chat_sessions":
      return [] as unknown as T;

    case "create_chat_session": {
      const mockSession = {
        id: "session-" + Math.random().toString(36).substring(2, 9),
        title: args.title || "New Conversation",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_ephemeral: args.is_ephemeral,
      };
      return mockSession as unknown as T;
    }

    case "delete_chat_session":
      return undefined as unknown as T;

    case "get_session_messages":
      return [] as unknown as T;

    case "save_chat_message":
      return undefined as unknown as T;

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
