use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use chrono::Utc;

use crate::models::{Task, TaskStatus, SystemMetrics, MemoryItem};
use crate::storage::{LocalDatabase, Neo4jClient, GraphData};
use crate::ollama::{OllamaClient, OllamaModelInfo};
use crate::agent::Orchestrator;
use crate::telemetry::TelemetryService;
use crate::security::SecurityManager;

pub struct AppState {
    pub orchestrator: Arc<Orchestrator>,
    pub db: Arc<LocalDatabase>,
    pub neo4j: Arc<Neo4jClient>,
    pub ollama: OllamaClient,
    pub telemetry: Arc<TelemetryService>,
    pub security: Arc<Mutex<SecurityManager>>,
}

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<OllamaModelInfo>, String> {
    state.ollama.list_models().await
}

#[tauri::command]
pub async fn get_system_metrics(state: State<'_, AppState>) -> Result<SystemMetrics, String> {
    let tasks = state.db.list_tasks().unwrap_or_default();
    let active = tasks.iter().filter(|t| matches!(t.status, TaskStatus::Executing | TaskStatus::Planning)).count();
    Ok(state.telemetry.collect_metrics(active).await)
}

#[tauri::command]
pub async fn create_and_run_task(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    title: String,
    objective: String,
    model: String,
) -> Result<Task, String> {
    let cwd = std::env::current_dir().unwrap_or_default().to_string_lossy().to_string();
    let task = Task {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        objective,
        status: TaskStatus::Pending,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        current_iteration: 0,
        max_iterations: 5,
        workspace_path: cwd,
        selected_model: model,
    };

    state.db.save_task(&task)?;

    let orch = state.orchestrator.clone();
    let task_clone = task.clone();
    tokio::spawn(async move {
        let _ = orch.run_task(&app, task_clone).await;
    });

    Ok(task)
}

#[tauri::command]
pub async fn list_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    state.db.list_tasks()
}

#[tauri::command]
pub async fn get_task_graph(state: State<'_, AppState>, task_id: String) -> Result<GraphData, String> {
    Ok(state.neo4j.get_task_graph(&task_id).await)
}

#[tauri::command]
pub async fn search_memories(state: State<'_, AppState>, query: String) -> Result<Vec<MemoryItem>, String> {
    state.db.search_memories(&query)
}

#[tauri::command]
pub async fn get_tool_permissions(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    Ok(serde_json::to_value(state.orchestrator.tools.list_tools_summary()).unwrap_or_default())
}
