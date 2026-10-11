# NEXORA v1.0 — Autonomous Local-First Multi-Agent Intelligence System

NEXORA is a private, production-grade, local-first multi-agent desktop AI operating assistant built with **Tauri v2**, **Rust**, **Next.js (App Router)**, **Tokio**, **Ollama**, and **SQLite/Neo4j**.

---

## 🌟 Key Capabilities

1. **Iterative Autonomous Execution Loop**:
   - `INSPECT` → `PLAN` → `SELECT STRATEGY` → `GENERATE ACTION` → `VALIDATE` → `EXECUTE` → `OBSERVE` → `EVALUATE` → `REVISE / COMPLETE` → `SAVE EXPERIENCE`.
2. **Multi-Agent Orchestration**:
   - **Supervisor Agent**: Maintains global task state, strategy selection, iteration budgets, and termination decisions.
   - **Planner Agent**: Generates dependency-aware subtasks with expected deliverables and verification criteria.
   - **Specialist Agents (Coding, Research, Tool Execution)**: Isolated agents executing targeted work.
   - **Evaluation Agent**: Analyzes observable execution outputs (stdout, exit codes, file existence) against objective criteria.
   - **Diagnostic Agent**: Performs root-cause analysis on failed runs and prescribes targeted fixes.
   - **Memory Agent**: Searches prior verified experiences and error lessons to avoid repeated failures.
3. **Native Tool Registry & Security Sandbox**:
   - `list_dir`, `read_file`, `write_file`, `patch_file`, `run_command`, `system_info`.
   - Path-traversal validation, workspace isolation, execution timeouts (30s), and secret redaction.
4. **Local-First Privacy & Zero Cloud Dependency**:
   - Native integration with **Ollama** REST API (`/api/tags`, `/api/chat`).
   - Dynamic model detection (e.g. `qwen2.5-coder:7b`, `qwen3.5`, `deepseek`).
   - Streaming responses with typed event dispatch over Tauri IPC.
5. **Graph Memory & Local Persistence**:
   - Embedded transactional **SQLite** database for tasks, memories, evaluations, and tool permissions.
   - **Neo4j** graph memory integration with resilient offline fallback.

---

## 🏗️ Architecture

```
nexora/
├── src/                          # Next.js App Router Frontend
│   ├── app/                      # Main desktop shell layout & pages
│   ├── components/               # UI components (Sidebar, Workspace, Memory, Models, Telemetry)
│   ├── lib/                      # Tauri IPC adapter & TypeScript domain models
│   └── store/                    # Zustand client-state store
├── src-tauri/                    # Native Rust Engine (Tauri v2)
│   ├── src/
│   │   ├── agent/                # Supervisor loop & task state machine
│   │   ├── agents/               # Planner, Specialist, Evaluation, Diagnostic, Memory agents
│   │   ├── commands/             # Tauri IPC command handlers
│   │   ├── models/               # Shared domain structs & event definitions
│   │   ├── ollama/               # Ollama REST client & streaming engine
│   │   ├── security/             # Workspace isolation, path checks, secret redaction
│   │   ├── storage/              # SQLite & Neo4j graph storage
│   │   ├── telemetry/            # Live CPU, RAM, Disk, and service monitor
│   │   └── tools/                # Native typed tool registry
│   ├── tests/                    # Rust unit and integration tests
│   ├── Cargo.toml                # Native dependencies
│   └── tauri.conf.json           # Desktop window configuration
├── docker-compose.yml            # Neo4j Community Edition container setup
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

1. **Rust**: 1.80+ (GNU or MSVC toolchain with GCC or MSVC Build Tools).
2. **Node.js**: v20+ with `pnpm`.
3. **Ollama**: Installed and running locally on port `11434`.
   ```bash
   ollama serve
   ollama pull qwen2.5-coder:7b
   ```
4. *(Optional)* **Neo4j**:
   ```bash
   docker compose up -d
   ```

### Running in Development

```bash
# Install frontend dependencies
pnpm install

# Run desktop app in development mode
pnpm exec tauri dev
```

### Building Production Release

```bash
# Build Next.js static bundle and Rust desktop executable
pnpm build
pnpm exec tauri build --no-bundle
```

The compiled native executable is produced at:
`src-tauri/target/release/nexora.exe`

### Running Automated Tests

```bash
cargo test --manifest-path src-tauri/Cargo.toml --test task_tests
```

---

## 🔒 Security & Privacy

- **Workspace Scoping**: Tools cannot access files outside designated project roots.
- **Audited Terminal Commands**: Commands run under restricted subprocesses with timeouts and masked secrets.
- **Local LLM Isolation**: Prompts and observations stay strictly on your local machine.
