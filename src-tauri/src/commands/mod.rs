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
    is_ephemeral: Option<bool>,
    session_id: Option<String>,
) -> Result<Task, String> {
    let cwd = std::env::current_dir().unwrap_or_default().to_string_lossy().to_string();
    let resolved_session = session_id.filter(|s| !s.trim().is_empty()).or_else(|| {
        state.db.list_chat_sessions().ok().and_then(|list| list.first().map(|s| s.id.clone()))
    });

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
        is_ephemeral,
        rating: None,
        feedback_notes: None,
        result: None,
        session_id: resolved_session,
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
pub async fn list_chat_sessions(state: State<'_, AppState>) -> Result<Vec<crate::models::ChatSession>, String> {
    state.db.list_chat_sessions()
}

#[tauri::command]
pub async fn create_chat_session(
    state: State<'_, AppState>,
    title: Option<String>,
    is_ephemeral: Option<bool>,
) -> Result<crate::models::ChatSession, String> {
    let session = crate::models::ChatSession {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.unwrap_or_else(|| "New Conversation".to_string()),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        is_ephemeral,
    };
    state.db.save_chat_session(&session)?;
    Ok(session)
}

#[tauri::command]
pub async fn delete_chat_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.db.delete_chat_session(&session_id)
}

#[tauri::command]
pub async fn get_session_messages(state: State<'_, AppState>, session_id: String) -> Result<Vec<crate::models::ChatMessage>, String> {
    state.db.get_session_messages(&session_id)
}

#[tauri::command]
pub async fn save_chat_message(state: State<'_, AppState>, message: crate::models::ChatMessage) -> Result<(), String> {
    state.db.save_chat_message(&message)
}

#[tauri::command]
pub async fn rate_task(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    task_id: String,
    rating: String,
    feedback_notes: Option<String>,
) -> Result<(), String> {
    state.db.rate_task(&task_id, &rating, feedback_notes.as_deref())?;

    if let Ok(Some(task)) = state.db.get_task(&task_id) {
        if !task.is_ephemeral.unwrap_or(false) {
            let memory_category = if rating == "good" { "success_rule" } else { "error_lesson" };
            let memory_content = if rating == "good" {
                format!("User rated SUCCESS for objective: '{}'. Approved workflow.", task.objective)
            } else {
                format!("User rated FAILED/IMPROVE for objective: '{}'. Notes: '{}'. Avoid repeating.", task.objective, feedback_notes.as_deref().unwrap_or("Approach did not satisfy criteria"))
            };

            let _ = crate::agents::MemoryAgent::save_experience(
                &state.db,
                &task_id,
                memory_category,
                &memory_content,
                rating == "good",
            );
        }
    }

    use tauri::Emitter;
    let _ = app.emit("nexora://event", crate::models::NexoraEvent::TaskRated {
        task_id,
        rating,
        notes: feedback_notes,
    });

    Ok(())
}

#[tauri::command]
pub async fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    state.db.get_setting(&key)
}

#[tauri::command]
pub async fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    state.db.set_setting(&key, &value)
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

use std::sync::Mutex as StdMutex;
static SPEECH_PID: StdMutex<Option<u32>> = StdMutex::new(None);

#[tauri::command]
pub async fn listen_speech_offline(timeout_seconds: Option<u64>) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let timeout = timeout_seconds.unwrap_or(8).clamp(3, 20);
        let ps_script = format!(
            r#"
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            try {{
                Add-Type -AssemblyName System.Speech
                $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
                $engine.SetInputToDefaultAudioDevice()
                $grammar = New-Object System.Speech.Recognition.DictationGrammar
                $engine.LoadGrammar($grammar)
                $engine.InitialSilenceTimeout = [TimeSpan]::FromSeconds({timeout})
                $result = $engine.Recognize([TimeSpan]::FromSeconds({timeout}))
                if ($result -and $result.Text) {{
                    [Console]::WriteLine($result.Text.Trim())
                }}
                $engine.Dispose()
            }} catch {{
                [Console]::Error.WriteLine($_.Exception.Message)
            }}
            "#
        );

        let mut cmd = std::process::Command::new("powershell");
        cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &ps_script]);

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn speech recognition: {}", e))?;
        if let Ok(mut lock) = SPEECH_PID.lock() {
            *lock = Some(child.id());
        }

        let output = child.wait_with_output().map_err(|e| format!("Failed to wait for speech recognition: {}", e))?;

        if let Ok(mut lock) = SPEECH_PID.lock() {
            *lock = None;
        }

        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(text)
        } else {
            let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if err.is_empty() {
                Ok("".to_string())
            } else {
                Err(err)
            }
        }
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn cancel_speech_offline() -> Result<(), String> {
    if let Ok(mut lock) = SPEECH_PID.lock() {
        if let Some(pid) = lock.take() {
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/PID", &pid.to_string()])
                    .creation_flags(0x08000000)
                    .output();
            }
        }
    }
    Ok(())
}
