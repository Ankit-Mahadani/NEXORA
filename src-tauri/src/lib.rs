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
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEXORA desktop application");
}
