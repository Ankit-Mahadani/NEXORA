use std::sync::Mutex;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use crate::models::{Task, TaskStatus, MemoryItem, EvaluationResult};

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
            "#
        ).map_err(|e| format!("Failed to initialize SQLite schema: {}", e))?;

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

        conn.execute(
            r#"
            INSERT INTO tasks (id, title, objective, status, created_at, updated_at, current_iteration, max_iterations, workspace_path, selected_model)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                objective = excluded.objective,
                status = excluded.status,
                updated_at = excluded.updated_at,
                current_iteration = excluded.current_iteration,
                max_iterations = excluded.max_iterations,
                workspace_path = excluded.workspace_path,
                selected_model = excluded.selected_model
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
                task.selected_model
            ],
        ).map_err(|e| format!("Failed to save task: {}", e))?;

        Ok(())
    }

    pub fn get_task(&self, task_id: &str) -> Result<Option<Task>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, objective, status, created_at, updated_at, current_iteration, max_iterations, workspace_path, selected_model FROM tasks WHERE id = ?1"
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
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list_tasks(&self) -> Result<Vec<Task>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, objective, status, created_at, updated_at, current_iteration, max_iterations, workspace_path, selected_model FROM tasks ORDER BY updated_at DESC"
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
            });
        }

        Ok(tasks)
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
}
