import { invoke } from "@tauri-apps/api/core";
import { listen, EventCallback, UnlistenFn } from "@tauri-apps/api/event";
import {
  Task,
  SystemMetrics,
  OllamaModelInfo,
  GraphData,
  MemoryItem,
  VerifiedLesson,
  RollbackCheckpoint,
  SelfLearningMetrics,
  PredictiveIssue,
  PredictiveScanSummary,
  ExecutableWorkflow,
  WorkflowStep,
  AutonomousSweRun,
  SweTestResult,
  KnowledgeEntity,
  KnowledgeRelation,
  GraphDiscoveryResult,
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

    case "get_social_connectors": {
      const stored = typeof window !== "undefined" ? localStorage.getItem("nexora_social_connectors") : null;
      if (stored) {
        try {
          return JSON.parse(stored) as unknown as T;
        } catch (_) {}
      }
      return null as unknown as T;
    }

    case "save_social_connectors": {
      if (typeof window !== "undefined" && args.connectors) {
        try {
          localStorage.setItem("nexora_social_connectors", JSON.stringify(args.connectors));
        } catch (_) {}
      }
      return undefined as unknown as T;
    }

    case "send_social_message": {
      return {
        id: "msg-" + Math.random().toString(36).substring(2, 9),
        platform: args.platform,
        sender: "You (NEXORA)",
        content: args.message,
        direction: "outbound",
        timestamp: new Date().toISOString(),
        status: "sent",
      } as unknown as T;
    }

    case "get_productivity_integrations": {
      const stored = typeof window !== "undefined" ? localStorage.getItem("nexora_productivity_integrations") : null;
      if (stored) {
        try {
          return JSON.parse(stored) as unknown as T;
        } catch (_) {}
      }
      return null as unknown as T;
    }

    case "save_productivity_integrations": {
      if (typeof window !== "undefined" && args.integrations) {
        try {
          localStorage.setItem("nexora_productivity_integrations", JSON.stringify(args.integrations));
        } catch (_) {}
      }
      return undefined as unknown as T;
    }

    case "execute_productivity_action": {
      return {
        success: true,
        message: `Action '${args.action}' executed for domain '${args.domain}'.`,
        timestamp: new Date().toISOString(),
      } as unknown as T;
    }

    case "list_verified_lessons": {
      const stored = typeof window !== "undefined" ? localStorage.getItem("nexora_verified_lessons") : null;
      if (stored) {
        try {
          return JSON.parse(stored) as unknown as T;
        } catch (_) {}
      }
      const initialLessons: VerifiedLesson[] = [
        {
          id: "lesson-1",
          error_signature: "SyntaxError: Cannot use import statement outside a module",
          root_cause: "CJS/ESM boundary mismatch when dynamic scripts are loaded into Node runtime without module resolution flag",
          failed_approach: "Direct require() statement without bundle transpile step",
          verified_solution: "Add explicit package.json 'type': 'module' or compile to CJS bundle with esbuild before running",
          domain: "TypeScript / Runtime",
          prevented_count: 18,
          confidence_score: 0.98,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          last_applied_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "lesson-2",
          error_signature: "AssertionError: Token expiration expected 3600s, got 1800s",
          root_cause: "Hardcoded default JWT TTL in legacy auth middleware conflicting with new OAuth2 standard",
          failed_approach: "Overriding TTL only inside client header without modifying backend token generator payload",
          verified_solution: "Synchronize jwtOptions.expiresIn configuration in auth controller and inject as environment variable",
          domain: "Backend / Auth",
          prevented_count: 24,
          confidence_score: 0.99,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          last_applied_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: "lesson-3",
          error_signature: "SqliteError: database is locked (5) during concurrent subtask writes",
          root_cause: "Subagents attempting simultaneous write transactions on non-WAL SQLite database",
          failed_approach: "Running raw uncoordinated parallel SQL threads without connection pool serialization",
          verified_solution: "Enable PRAGMA journal_mode=WAL; and PRAGMA busy_timeout=5000; with single write mutex lock",
          domain: "Storage / SQLite",
          prevented_count: 11,
          confidence_score: 0.96,
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          last_applied_at: new Date(Date.now() - 14400000).toISOString(),
        },
      ];
      if (typeof window !== "undefined") {
        localStorage.setItem("nexora_verified_lessons", JSON.stringify(initialLessons));
      }
      return initialLessons as unknown as T;
    }

    case "save_verified_lesson": {
      if (typeof window !== "undefined" && args.lesson) {
        const stored = localStorage.getItem("nexora_verified_lessons");
        let list: VerifiedLesson[] = stored ? JSON.parse(stored) : [];
        const existingIdx = list.findIndex((l) => l.error_signature.toLowerCase() === args.lesson.error_signature.toLowerCase());
        if (existingIdx >= 0) {
          list[existingIdx].prevented_count += 1;
          list[existingIdx].verified_solution = args.lesson.verified_solution;
          list[existingIdx].last_applied_at = new Date().toISOString();
        } else {
          list.unshift(args.lesson);
        }
        localStorage.setItem("nexora_verified_lessons", JSON.stringify(list));
      }
      return undefined as unknown as T;
    }

    case "delete_verified_lesson": {
      if (typeof window !== "undefined" && args.lessonId) {
        const stored = localStorage.getItem("nexora_verified_lessons");
        if (stored) {
          let list: VerifiedLesson[] = JSON.parse(stored);
          list = list.filter((l) => l.id !== args.lessonId);
          localStorage.setItem("nexora_verified_lessons", JSON.stringify(list));
        }
      }
      return undefined as unknown as T;
    }

    case "trigger_safe_rollback": {
      return {
        id: "rb-" + Math.random().toString(36).substring(2, 9),
        task_id: args.taskId || "active-task",
        target_path: "src/controllers/auth.ts",
        content_backup: "// Safe backup snapshot restored",
        created_at: new Date().toISOString(),
        status: "restored",
      } as unknown as T;
    }

    case "get_self_learning_metrics": {
      const storedLessons = typeof window !== "undefined" ? localStorage.getItem("nexora_verified_lessons") : null;
      const count = storedLessons ? JSON.parse(storedLessons).length : 3;
      const metrics: SelfLearningMetrics = {
        total_lessons_learned: count,
        total_errors_prevented: 53,
        total_rollbacks_executed: 4,
        avg_repair_confidence: 0.978,
        active_guardrails_count: 8,
      };
      return metrics as unknown as T;
    }

    // Predictive Problem Detection fallbacks
    case "scan_predictive_issues": {
      const issues: PredictiveIssue[] = [
        {
          id: "iss-dep-01",
          title: "Missing Native Audio Synthesis Dependency (espeak-ng / libasound)",
          category: "dependency",
          severity: "warning",
          affected_component: "Hardware / Audio Voice Engine",
          predicted_impact: "Offline text-to-speech fallback will revert to silent console output if native synthesis library is not installed.",
          suggested_action: "Run winget install eSpeak-NG.eSpeak-NG or configure cloud TTS fallback in Settings.",
          auto_fixable: true,
          detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          status: "active",
        },
        {
          id: "iss-bot-02",
          title: "DAG Bottleneck: DaVinci Coder serialization on subtask DAG #4",
          category: "bottleneck",
          severity: "warning",
          affected_component: "Agent Teams / DaVinci Coder",
          predicted_impact: "Subtasks 3 and 4 have sequential dependency creating a 12.4s idle queue stall for Socrates Reviewer.",
          suggested_action: "Auto-decouple subtask #4 dependencies or route independent test scaffolding to Argus Tester in parallel.",
          auto_fixable: true,
          detected_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          status: "active",
        },
        {
          id: "iss-dl-03",
          title: "Approaching Deadline: Operating Systems Lab Assignment Turn-in",
          category: "deadline",
          severity: "critical",
          affected_component: "Productivity / Google Classroom & Calendar",
          predicted_impact: "Due in 3 hours (today at 15:00). Assignment draft is 75% complete; final PDF synthesis not yet submitted.",
          suggested_action: "Dispatch Autonomous SWE to finalize assignment report, compile LaTeX, and prepare turn-in bundle.",
          auto_fixable: true,
          detected_at: new Date(Date.now() - 1800000).toISOString(),
          status: "active",
        },
        {
          id: "iss-fail-04",
          title: "VRAM Pressure Warning: Concurrent Ollama 9B Model Context Exceeded",
          category: "failure_risk",
          severity: "info",
          affected_component: "Ollama Local Runtime",
          predicted_impact: "Active context buffer is at 84% capacity. Concurrent parallel generation may spill over to CPU RAM reducing throughput.",
          suggested_action: "Enable dynamic context truncation or route low-complexity subtasks to 1.5B fast model.",
          auto_fixable: true,
          detected_at: new Date(Date.now() - 7200000).toISOString(),
          status: "active",
        },
      ];
      const summary: PredictiveScanSummary = {
        total_issues: issues.length,
        critical_count: 1,
        warning_count: 2,
        health_score: 91.5,
        bottleneck_risk: "Elevated Risk (1 Critical)",
        issues,
      };
      return summary as unknown as T;
    }

    case "dismiss_predictive_issue":
    case "apply_predictive_fix":
      return "Mitigation applied successfully." as unknown as T;

    // Natural-Language Workflow Builder fallbacks
    case "convert_nl_to_workflow": {
      const instruction = args.instruction || "Run cargo test, summarize git commits and email team with approval";
      const wf: ExecutableWorkflow = {
        id: "wf-nl-" + Math.random().toString(36).substring(2, 9),
        name: instruction.length > 40 ? instruction.substring(0, 37) + "..." : instruction,
        natural_instruction: instruction,
        trigger_type: instruction.toLowerCase().includes("friday") ? "schedule" : "manual",
        trigger_config: "Every Friday at 17:00",
        conditions: ["test_exit_code == 0", "git_status == 'clean'"],
        steps: [
          {
            id: "step-1",
            title: "Execute Test Verification Suite",
            integration: "terminal",
            action: "exec_command",
            parameters: { command: "cargo test --workspace --quiet" },
            on_failure: "retry",
            require_approval: false,
          },
          {
            id: "step-2",
            title: "Collect Git Commits & Change Diff",
            integration: "git",
            action: "get_recent_commits",
            parameters: { limit: 10 },
            on_failure: "abort",
            require_approval: false,
          },
          {
            id: "step-3",
            title: "Synthesize Executive Notes Digest",
            integration: "notes",
            action: "create_note",
            parameters: { category: "Weekly Report", title: "Engineering Sync" },
            on_failure: "fallback",
            require_approval: false,
          },
          {
            id: "step-4",
            title: "Send Notification Digest via Email / Telegram",
            integration: "email",
            action: "send_message",
            parameters: { recipient: "Core Team", format: "markdown" },
            on_failure: "fallback",
            require_approval: true,
          },
        ],
        require_approval: true,
        enabled: true,
        status: "idle",
        created_at: new Date().toISOString(),
      };
      return wf as unknown as T;
    }

    case "list_executable_workflows": {
      const stored = typeof window !== "undefined" ? localStorage.getItem("nexora_workflows") : null;
      if (stored) {
        try {
          return JSON.parse(stored) as unknown as T;
        } catch (_) {}
      }
      const initialWfs: ExecutableWorkflow[] = [
        {
          id: "wf-1",
          name: "Weekly Test & Team Email Digest",
          natural_instruction: "Every Friday at 5 PM run cargo test, summarize git commits, and email them to the team with approval required",
          trigger_type: "schedule",
          trigger_config: "Every Friday at 17:00",
          conditions: ["test_exit_code == 0"],
          steps: [
            { id: "s1", title: "Run Cargo Tests", integration: "terminal", action: "cargo test", parameters: {}, on_failure: "retry", require_approval: false },
            { id: "s2", title: "Extract Git Diffs", integration: "git", action: "git log", parameters: {}, on_failure: "abort", require_approval: false },
            { id: "s3", title: "Send Team Email", integration: "email", action: "send_email", parameters: { to: "team@nexora.ai" }, on_failure: "fallback", require_approval: true },
          ],
          require_approval: true,
          enabled: true,
          last_run_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          status: "success",
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: "wf-2",
          name: "Social Alert to Calendar Tasks Sync",
          natural_instruction: "When an urgent WhatsApp or Telegram message arrives, inspect calendar and draft summary note",
          trigger_type: "social_event",
          trigger_config: "Inbound message with keyword 'urgent'",
          conditions: ["message_priority == 'high'"],
          steps: [
            { id: "s1", title: "Parse Inbound Message", integration: "social", action: "read_message", parameters: {}, on_failure: "abort", require_approval: false },
            { id: "s2", title: "Query Google Calendar", integration: "calendar", action: "get_events", parameters: {}, on_failure: "fallback", require_approval: false },
            { id: "s3", title: "Create Priority Task Note", integration: "notes", action: "create_note", parameters: {}, on_failure: "retry", require_approval: false },
          ],
          require_approval: false,
          enabled: true,
          last_run_at: new Date(Date.now() - 3600000 * 6).toISOString(),
          status: "idle",
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ];
      return initialWfs as unknown as T;
    }

    case "save_executable_workflow":
    case "delete_executable_workflow":
    case "run_executable_workflow":
      return "Workflow operation completed." as unknown as T;

    // Autonomous Software Engineer fallbacks
    case "start_swe_task": {
      const run: AutonomousSweRun = {
        id: "swe-run-" + Math.random().toString(36).substring(2, 9),
        repository_path: args.repo_path || "c:/D/IDE PROJECTS/self/NEXORA",
        task_type: args.task_type || "feature",
        objective: args.objective || "Implement Autonomous SWE Pull Request Engine",
        branch_name: "feat/swe-" + Math.random().toString(36).substring(2, 8),
        status: "pr_ready",
        files_changed: [
          "src-tauri/src/models/mod.rs",
          "src-tauri/src/storage/sqlite.rs",
          "src/lib/types.ts",
        ],
        test_results: {
          passed: true,
          total_tests: 18,
          passed_tests: 18,
          failed_tests: 0,
          output: "Running target/debug/deps/nexora-tests...\ntest result: ok. 18 passed; 0 failed; finished in 0.94s",
          duration_ms: 940,
        },
        pr_title: `feat(swe): ${args.objective || "Autonomous Feature Implementation"}`,
        pr_summary: `### Summary of Changes\n- Implemented: ${args.objective || "Feature"}\n- Isolated Sandbox Tests: 18/18 assertions PASSED.\n- Branch: clean git branch with unified diffs ready for review.`,
        diff_preview: `+ // Autonomous SWE Implementation\n+ pub struct AutonomousSweRun { ... }\n+ pub fn start_swe_task(...) -> Result<AutonomousSweRun, String>`,
        created_at: new Date().toISOString(),
      };
      return run as unknown as T;
    }

    case "list_swe_runs": {
      const sampleRuns: AutonomousSweRun[] = [
        {
          id: "swe-run-01",
          repository_path: "c:/D/IDE PROJECTS/self/NEXORA",
          task_type: "feature",
          objective: "Implement Predictive Problem Detection & Early Warning Radar",
          branch_name: "feat/predictive-radar",
          status: "pr_ready",
          files_changed: [
            "src-tauri/src/models/mod.rs",
            "src-tauri/src/storage/sqlite.rs",
            "src/components/PredictiveRadarView.tsx",
          ],
          test_results: {
            passed: true,
            total_tests: 24,
            passed_tests: 24,
            failed_tests: 0,
            output: "test result: ok. 24 passed; 0 failed; finished in 1.1s",
            duration_ms: 1100,
          },
          pr_title: "feat(predictive): Add Early Warning Radar for dependencies and deadlines",
          pr_summary: "Automated PR generated by DaVinci Engineer. Detects potential failures, dependency gaps, and DAG bottlenecks before execution.",
          diff_preview: "@@ -1,5 +1,18 @@\n+ pub struct PredictiveIssue { ... }\n+ pub fn scan_predictive_issues()",
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: "swe-run-02",
          repository_path: "c:/D/IDE PROJECTS/self/NEXORA",
          task_type: "bugfix",
          objective: "Fix SQLite concurrent connection lock with WAL mode & busy timeout",
          branch_name: "fix/sqlite-wal-concurrency",
          status: "completed",
          files_changed: [
            "src-tauri/src/storage/sqlite.rs",
          ],
          test_results: {
            passed: true,
            total_tests: 12,
            passed_tests: 12,
            failed_tests: 0,
            output: "test result: ok. 12 passed; 0 failed; finished in 0.4s",
            duration_ms: 400,
          },
          pr_title: "fix(storage): Enable PRAGMA journal_mode=WAL and busy_timeout=5000",
          pr_summary: "Eliminates database busy (5) error during parallel subagent writing transactions.",
          diff_preview: "@@ -25,2 +25,4 @@\n+ PRAGMA journal_mode=WAL;\n+ PRAGMA busy_timeout=5000;",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      return sampleRuns as unknown as T;
    }

    case "run_swe_sandbox_tests":
      return {
        passed: true,
        total_tests: 24,
        passed_tests: 24,
        failed_tests: 0,
        output: "Sandbox test runner executed: 24 passed; 0 failed. Environment isolated.",
        duration_ms: 820,
      } as unknown as T;

    case "create_swe_pull_request":
      return "Pull Request published to git branch successfully." as unknown as T;

    // Knowledge Graph Intelligence fallbacks
    case "query_mind_graph": {
      const nodes: KnowledgeEntity[] = [
        { id: "ent-dec-01", name: "Decision: SQLite WAL & Mutex Architecture", entity_type: "decision", summary: "Selected SQLite in WAL mode with PRAGMA busy_timeout=5000 to eliminate concurrent write locking.", metadata: { scope: "storage" }, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
        { id: "ent-file-02", name: "src-tauri/src/storage/sqlite.rs", entity_type: "file", summary: "Core persistent storage backend handling tasks, memories, verified lessons, workflows, and checkpoints.", metadata: { language: "Rust" }, created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
        { id: "ent-task-03", name: "Task: Multi-Channel Social Connectors", entity_type: "project", summary: "Connected WhatsApp QR canvas, Telegram, Discord, and Slack with configurable permissions.", metadata: { status: "completed" }, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: "ent-mem-04", name: "Memory: ESM/CJS Module Resolution Contract", entity_type: "memory", summary: "Verified procedural lesson preventing 'Cannot use import statement outside module' via esbuild bundling.", metadata: { prevented: 18 }, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: "ent-conv-05", name: "Chat Session #3: Agent Teams & Retries Architecture", entity_type: "conversation", summary: "User discussion planning specialist pipeline (Planner, Researcher, Coder, Tester, Reviewer) and automatic retries.", metadata: { messages: 14 }, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: "ent-file-06", name: "src/components/AgentTeamView.tsx", entity_type: "file", summary: "Interactive UI component for specialist pipeline, model routing, automatic retries, and Odysseus self-learning engine.", metadata: { framework: "Next.js" }, created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: "ent-dec-07", name: "Decision: Complexity, Cost & Speed Model Routing", entity_type: "decision", summary: "Tiered model dispatch: 1.5B (low/fast context), 7B (balanced coding), 9B (deep reasoning & review).", metadata: { compute_saved: "64%" }, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: "ent-task-08", name: "Task: Odysseus Self-Learning & Rollback Sandbox", entity_type: "project", summary: "Closed-loop error interception, persistent lessons vault, adaptive prompt guardrails, and pre-mutation rollback checkpoints.", metadata: { version: "1.0" }, created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
      ];

      const edges: KnowledgeRelation[] = [
        { source_id: "ent-dec-01", target_id: "ent-file-02", relation_type: "modifies", confidence: 0.99, explanation: "Architectural decision directly shaped SQLite WAL implementation in sqlite.rs" },
        { source_id: "ent-conv-05", target_id: "ent-dec-07", relation_type: "created_by", confidence: 0.95, explanation: "Chat conversation #3 originated model routing tiering strategy" },
        { source_id: "ent-dec-07", target_id: "ent-file-06", relation_type: "modifies", confidence: 0.96, explanation: "Model routing strategy configured within AgentTeamView.tsx" },
        { source_id: "ent-mem-04", target_id: "ent-task-08", relation_type: "resolved_in", confidence: 0.98, explanation: "ESM lesson indexed into persistent memory vault during Odysseus task" },
        { source_id: "ent-task-08", target_id: "ent-file-06", relation_type: "depends_on", confidence: 0.97, explanation: "Self-learning visual controls depend on AgentTeamView interactive UI" },
        { source_id: "ent-task-03", target_id: "ent-conv-05", relation_type: "influenced", confidence: 0.92, explanation: "Social connectors implementation influenced agent team collaboration structure" },
        { source_id: "ent-file-02", target_id: "ent-task-08", relation_type: "depends_on", confidence: 0.99, explanation: "Odysseus persistent memory is backed by sqlite.rs tables" },
      ];

      const res: GraphDiscoveryResult = {
        nodes,
        edges,
        insight: "Multi-hop semantic traversal discovered non-obvious relationship: Decision on SQLite WAL directly resolves Task #8 storage bottleneck and modified sqlite.rs.",
        path_hops: 3,
      };
      return res as unknown as T;
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
