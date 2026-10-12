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
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

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
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            // Build system tray menu
            let open_i = MenuItem::with_id(app, "open", "Open Nexora", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Nexora", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_i, &quit_i])?;

            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("Nexora")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                });

            let app_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
                .or_else(|_| tauri::image::Image::from_bytes(include_bytes!("../icons/128x128.png")))
                .ok();
            let icon = app_icon.or_else(|| app.default_window_icon().cloned());

            if let Some(ref icon) = icon {
                tray_builder = tray_builder.icon(icon.clone());
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon.clone());
                }
            }

            let _tray = tray_builder.build(app)?;
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
                orchestrator: orchestrator.clone(),
                db: local_db.clone(),
                neo4j,
                ollama,
                telemetry,
                security,
            };

            // Spawn Background Scheduled Automation Daemon
            let daemon_app = app.handle().clone();
            let daemon_db = local_db.clone();
            let daemon_orch = orchestrator.clone();

            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(15));
                loop {
                    interval.tick().await;

                    if let Ok(jobs) = daemon_db.list_scheduled_jobs() {
                        let now = chrono::Utc::now();
                        for job in jobs {
                            if !job.enabled {
                                continue;
                            }

                            let is_due = match job.next_run_at {
                                Some(next) => next <= now,
                                None => true,
                            };

                            if is_due {
                                let job_id = job.id.clone();
                                let job_name = job.name.clone();
                                let prompt = job.prompt.clone();
                                let cron_expr = job.cron_expression.clone();
                                let app_handle = daemon_app.clone();
                                let orch = daemon_orch.clone();
                                let db = daemon_db.clone();

                                // Update next_run immediately to avoid duplicate firing
                                let next_run = crate::storage::sqlite::compute_next_run(&cron_expr, now);
                                let _ = db.update_scheduled_job_run(&job_id, "running", now, Some(next_run));

                                tokio::spawn(async move {
                                    let model = db.get_setting("selected_model")
                                        .unwrap_or(None)
                                        .unwrap_or_else(|| "qwen2.5-coder:7b".to_string());
                                    let cwd = std::env::current_dir().unwrap_or_default().to_string_lossy().to_string();

                                    let task = crate::models::Task {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        title: format!("[Scheduled] {}", job_name),
                                        objective: prompt,
                                        status: crate::models::TaskStatus::Pending,
                                        created_at: chrono::Utc::now(),
                                        updated_at: chrono::Utc::now(),
                                        current_iteration: 0,
                                        max_iterations: 5,
                                        workspace_path: cwd,
                                        selected_model: model,
                                        is_ephemeral: Some(false),
                                        rating: None,
                                        feedback_notes: None,
                                        result: None,
                                        session_id: None,
                                    };

                                    let _ = db.save_task(&task);
                                    let res = orch.run_task(&app_handle, task).await;
                                    let status = if res.is_ok() { "success" } else { "failed" };
                                    let finished_at = chrono::Utc::now();
                                    let future_run = crate::storage::sqlite::compute_next_run(&cron_expr, finished_at);
                                    let _ = db.update_scheduled_job_run(&job_id, status, finished_at, Some(future_run));

                                    use tauri::Emitter;
                                    let _ = app_handle.emit("nexora://event", crate::models::NexoraEvent::JobExecuted {
                                        job_id,
                                        job_name,
                                        status: status.to_string(),
                                        message: res.unwrap_or_else(|e| e),
                                    });
                                });
                            }
                        }
                    }
                }
            });

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
            commands::rate_task,
            commands::get_setting,
            commands::set_setting,
            commands::listen_speech_offline,
            commands::cancel_speech_offline,
            commands::list_chat_sessions,
            commands::create_chat_session,
            commands::delete_chat_session,
            commands::get_session_messages,
            commands::save_chat_message,
            commands::list_scheduled_jobs,
            commands::create_scheduled_job,
            commands::toggle_scheduled_job,
            commands::delete_scheduled_job,
            commands::trigger_scheduled_job,
            commands::list_verified_lessons,
            commands::save_verified_lesson,
            commands::delete_verified_lesson,
            commands::trigger_safe_rollback,
            commands::get_self_learning_metrics,
            commands::scan_predictive_issues,
            commands::dismiss_predictive_issue,
            commands::apply_predictive_fix,
            commands::convert_nl_to_workflow,
            commands::list_executable_workflows,
            commands::save_executable_workflow,
            commands::delete_executable_workflow,
            commands::run_executable_workflow,
            commands::start_swe_task,
            commands::list_swe_runs,
            commands::run_swe_sandbox_tests,
            commands::create_swe_pull_request,
            commands::query_mind_graph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEXORA desktop application");
}
