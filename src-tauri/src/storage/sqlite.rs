use std::sync::Mutex;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use crate::models::{Task, TaskStatus, MemoryItem, ChatSession, ChatMessage};
use crate::storage::neo4j::GraphData;

pub struct LocalDatabase {
    conn: Mutex<Connection>,
}

impl LocalDatabase {
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open SQLite database: {}", e))?;
        
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                objective TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                current_iteration INTEGER NOT NULL,
                max_iterations INTEGER NOT NULL,
                workspace_path TEXT NOT NULL,
                selected_model TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                content TEXT NOT NULL,
                task_id TEXT,
                source TEXT NOT NULL,
                verified INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                candidate_id TEXT NOT NULL,
                score REAL NOT NULL,
                passed INTEGER NOT NULL,
                evidence TEXT NOT NULL,
                failure_reasons TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                evaluated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tool_permissions (
                tool_name TEXT PRIMARY KEY,
                permission_level TEXT NOT NULL,
                auto_approved INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_ephemeral INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                task_id TEXT,
                created_at TEXT NOT NULL,
                metadata TEXT
            );

            CREATE TABLE IF NOT EXISTS task_graphs (
                task_id TEXT PRIMARY KEY,
                graph_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#
        ).map_err(|e| format!("Failed to initialize SQLite schema: {}", e))?;

        // Graceful column migrations for existing databases
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN rating TEXT", []);
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN feedback_notes TEXT", []);
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN is_ephemeral INTEGER DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN result TEXT", []);
        let _ = conn.execute("ALTER TABLE tasks ADD COLUMN session_id TEXT", []);

        Ok(())
    }

    pub fn save_task(&self, task: &Task) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let status_str = match task.status {
            TaskStatus::Pending => "pending",
            TaskStatus::Planning => "planning",
            TaskStatus::Executing => "executing",
            TaskStatus::Evaluating => "evaluating",
            TaskStatus::Diagnosing => "diagnosing",
            TaskStatus::Completed => "completed",
            TaskStatus::Failed => "failed",
            TaskStatus::Cancelled => "cancelled",
        };

        let is_eph = if task.is_ephemeral.unwrap_or(false) { 1 } else { 0 };

        conn.execute(
            r#"
            INSERT INTO tasks (id, title, objective, status, created_at, updated_at, current_iteration, max_iterations, workspace_path, selected_model, rating, feedback_notes, is_ephemeral, result, session_id)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                objective = excluded.objective,
                status = excluded.status,
                updated_at = excluded.updated_at,
                current_iteration = excluded.current_iteration,
                max_iterations = excluded.max_iterations,
                workspace_path = excluded.workspace_path,
                selected_model = excluded.selected_model,
                rating = excluded.rating,
                feedback_notes = excluded.feedback_notes,
                is_ephemeral = excluded.is_ephemeral,
                result = excluded.result,
                session_id = excluded.session_id
            "#,
            params![
                task.id,
                task.title,
                task.objective,
                status_str,
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
                task.current_iteration,
                task.max_iterations,
                task.workspace_path,
                task.selected_model,
                task.rating,
                task.feedback_notes,
                is_eph,
                task.result,
                task.session_id,
            ],
        ).map_err(|e| format!("Failed to save task: {}", e))?;

        Ok(())
    }

    pub fn rate_task(&self, task_id: &str, rating: &str, feedback_notes: Option<&str>) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET rating = ?1, feedback_notes = ?2 WHERE id = ?3",
            params![rating, feedback_notes, task_id],
        ).map_err(|e| format!("Failed to rate task: {}", e))?;
        Ok(())
    }

    pub fn get_task(&self, task_id: &str) -> Result<Option<Task>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, objective, status, created_at, updated_at, current_iteration, max_iterations, workspace_path, selected_model, rating, feedback_notes, is_ephemeral, result, session_id FROM tasks WHERE id = ?1"
        ).map_err(|e| e.to_string())?;

        let mut rows = stmt.query(params![task_id]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let status_str: String = row.get(3).unwrap_or_default();
            let status = match status_str.as_str() {
                "planning" => TaskStatus::Planning,
                "executing" => TaskStatus::Executing,
                "evaluating" => TaskStatus::Evaluating,
                "diagnosing" => TaskStatus::Diagnosing,
                "completed" => TaskStatus::Completed,
                "failed" => TaskStatus::Failed,
                "cancelled" => TaskStatus::Cancelled,
                _ => TaskStatus::Pending,
            };

            let created_at_str: String = row.get(4).unwrap_or_default();
            let updated_at_str: String = row.get(5).unwrap_or_default();

            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            let is_eph: i32 = row.get(12).unwrap_or(0);

            Ok(Some(Task {
                id: row.get(0).unwrap_or_default(),
                title: row.get(1).unwrap_or_default(),
                objective: row.get(2).unwrap_or_default(),
                status,
                created_at,
                updated_at,
                current_iteration: row.get(6).unwrap_or(0),
                max_iterations: row.get(7).unwrap_or(10),
                workspace_path: row.get(8).unwrap_or_default(),
                selected_model: row.get(9).unwrap_or_default(),
                rating: row.get(10).ok(),
                feedback_notes: row.get(11).ok(),
                is_ephemeral: Some(is_eph == 1),
                result: row.get(13).ok(),
                session_id: row.get(14).ok(),
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list_tasks(&self) -> Result<Vec<Task>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, objective, status, created_at, updated_at, current_iteration, max_iterations, workspace_path, selected_model, rating, feedback_notes, is_ephemeral, result, session_id FROM tasks ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        let mut tasks = Vec::new();

        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let status_str: String = row.get(3).unwrap_or_default();
            let status = match status_str.as_str() {
                "planning" => TaskStatus::Planning,
                "executing" => TaskStatus::Executing,
                "evaluating" => TaskStatus::Evaluating,
                "diagnosing" => TaskStatus::Diagnosing,
                "completed" => TaskStatus::Completed,
                "failed" => TaskStatus::Failed,
                "cancelled" => TaskStatus::Cancelled,
                _ => TaskStatus::Pending,
            };

            let created_at_str: String = row.get(4).unwrap_or_default();
            let updated_at_str: String = row.get(5).unwrap_or_default();

            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            let is_eph: i32 = row.get(12).unwrap_or(0);

            tasks.push(Task {
                id: row.get(0).unwrap_or_default(),
                title: row.get(1).unwrap_or_default(),
                objective: row.get(2).unwrap_or_default(),
                status,
                created_at,
                updated_at,
                current_iteration: row.get(6).unwrap_or(0),
                max_iterations: row.get(7).unwrap_or(10),
                workspace_path: row.get(8).unwrap_or_default(),
                selected_model: row.get(9).unwrap_or_default(),
                rating: row.get(10).ok(),
                feedback_notes: row.get(11).ok(),
                is_ephemeral: Some(is_eph == 1),
                result: row.get(13).ok(),
                session_id: row.get(14).ok(),
            });
        }

        Ok(tasks)
    }

    pub fn list_chat_sessions(&self) -> Result<Vec<ChatSession>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, created_at, updated_at, is_ephemeral FROM chat_sessions ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        let mut sessions = Vec::new();

        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let created_at_str: String = row.get(2).unwrap_or_default();
            let updated_at_str: String = row.get(3).unwrap_or_default();
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let is_eph: i32 = row.get(4).unwrap_or(0);

            sessions.push(ChatSession {
                id: row.get(0).unwrap_or_default(),
                title: row.get(1).unwrap_or_default(),
                created_at,
                updated_at,
                is_ephemeral: Some(is_eph == 1),
            });
        }

        Ok(sessions)
    }

    pub fn save_chat_session(&self, session: &ChatSession) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let is_eph = if session.is_ephemeral.unwrap_or(false) { 1 } else { 0 };

        conn.execute(
            r#"
            INSERT INTO chat_sessions (id, title, created_at, updated_at, is_ephemeral)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                updated_at = excluded.updated_at,
                is_ephemeral = excluded.is_ephemeral
            "#,
            params![
                session.id,
                session.title,
                session.created_at.to_rfc3339(),
                session.updated_at.to_rfc3339(),
                is_eph
            ],
        ).map_err(|e| format!("Failed to save chat session: {}", e))?;

        Ok(())
    }

    pub fn delete_chat_session(&self, session_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM chat_messages WHERE session_id = ?1", params![session_id]).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM chat_sessions WHERE id = ?1", params![session_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_session_messages(&self, session_id: &str) -> Result<Vec<ChatMessage>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, role, content, task_id, created_at, metadata FROM chat_messages WHERE session_id = ?1 ORDER BY created_at ASC"
        ).map_err(|e| e.to_string())?;

        let mut rows = stmt.query(params![session_id]).map_err(|e| e.to_string())?;
        let mut messages = Vec::new();

        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let created_at_str: String = row.get(5).unwrap_or_default();
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            messages.push(ChatMessage {
                id: row.get(0).unwrap_or_default(),
                session_id: row.get(1).unwrap_or_default(),
                role: row.get(2).unwrap_or_default(),
                content: row.get(3).unwrap_or_default(),
                task_id: row.get(4).ok(),
                created_at,
                metadata: row.get(6).ok(),
            });
        }

        Ok(messages)
    }

    pub fn save_chat_message(&self, message: &ChatMessage) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO chat_messages (id, session_id, role, content, task_id, created_at, metadata)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                content = excluded.content,
                metadata = excluded.metadata
            "#,
            params![
                message.id,
                message.session_id,
                message.role,
                message.content,
                message.task_id,
                message.created_at.to_rfc3339(),
                message.metadata,
            ],
        ).map_err(|e| format!("Failed to save chat message: {}", e))?;

        // Also update session updated_at timestamp
        let _ = conn.execute(
            "UPDATE chat_sessions SET updated_at = ?1 WHERE id = ?2",
            params![message.created_at.to_rfc3339(), message.session_id],
        );

        Ok(())
    }


    pub fn save_memory(&self, item: &MemoryItem) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO memories (id, category, content, task_id, source, verified, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                category = excluded.category,
                content = excluded.content,
                verified = excluded.verified
            "#,
            params![
                item.id,
                item.category,
                item.content,
                item.task_id,
                item.source,
                if item.verified { 1 } else { 0 },
                item.created_at.to_rfc3339()
            ],
        ).map_err(|e| format!("Failed to save memory: {}", e))?;

        Ok(())
    }

    pub fn search_memories(&self, query: &str) -> Result<Vec<MemoryItem>, String> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, category, content, task_id, source, verified, created_at FROM memories WHERE content LIKE ?1 ORDER BY created_at DESC LIMIT 50"
        ).map_err(|e| e.to_string())?;

        let mut rows = stmt.query(params![pattern]).map_err(|e| e.to_string())?;
        let mut memories = Vec::new();

        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let created_at_str: String = row.get(6).unwrap_or_default();
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            memories.push(MemoryItem {
                id: row.get(0).unwrap_or_default(),
                category: row.get(1).unwrap_or_default(),
                content: row.get(2).unwrap_or_default(),
                task_id: row.get(3).ok(),
                source: row.get(4).unwrap_or_default(),
                verified: row.get::<_, i32>(5).unwrap_or(0) == 1,
                created_at,
            });
        }

        Ok(memories)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1").map_err(|e| e.to_string())?;
        let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(row.get(0).unwrap_or_default()))
        } else {
            Ok(None)
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn save_task_graph(&self, task_id: &str, graph: &GraphData) -> Result<(), String> {
        let json_str = serde_json::to_string(graph).map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO task_graphs (task_id, graph_json, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(task_id) DO UPDATE SET graph_json = excluded.graph_json, updated_at = excluded.updated_at",
            params![task_id, json_str, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_task_graph(&self, task_id: &str) -> Result<Option<GraphData>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT graph_json FROM task_graphs WHERE task_id = ?1").map_err(|e| e.to_string())?;
        let mut rows = stmt.query(params![task_id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json_str: String = row.get(0).map_err(|e| e.to_string())?;
            let graph: GraphData = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
            Ok(Some(graph))
        } else {
            Ok(None)
        }
    }
}
