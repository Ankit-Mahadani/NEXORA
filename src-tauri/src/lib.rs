pub mod models;
pub mod storage;
pub mod ollama;
pub mod security;
pub mod tools;
pub mod agents;
pub mod agent;
pub mod telemetry;
pub mod commands;

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;

use storage::{LocalDatabase, Neo4jClient};
use ollama::OllamaClient;
use security::SecurityManager;
use telemetry::TelemetryService;
use agent::Orchestrator;
use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = app_data_dir.join("nexora.db");
            let local_db = Arc::new(LocalDatabase::new(db_path).expect("Failed to initialize SQLite storage"));

            let ollama = OllamaClient::new(None);
            let neo4j = Arc::new(Neo4jClient::new(None, None, None));
            
            let current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let security = Arc::new(Mutex::new(SecurityManager::new(current_dir)));

            let telemetry = Arc::new(TelemetryService::new(ollama.clone(), (*neo4j).clone()));
            let orchestrator = Arc::new(Orchestrator::new(
                ollama.clone(),
                local_db.clone(),
                neo4j.clone(),
                security.clone(),
            ));

            let state = AppState {
                orchestrator,
                db: local_db,
                neo4j,
                ollama,
                telemetry,
                security,
            };

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_models,
            commands::get_system_metrics,
            commands::create_and_run_task,
            commands::list_tasks,
            commands::get_task_graph,
            commands::search_memories,
            commands::get_tool_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEXORA desktop application");
}
