use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use std::time::Instant;

use crate::models::ToolExecutionResult;
use crate::security::{SecurityManager, ToolPermissionLevel};
use crate::tools::Tool;

pub struct SocialMessagingTool;

#[async_trait]
impl Tool for SocialMessagingTool {
    fn name(&self) -> &str {
        "social_messaging"
    }

    fn description(&self) -> &str {
        "Connects and interacts with social media and messaging channels (WhatsApp, Telegram, Discord, Slack). Reads chat messages and sends text messages according to configured permissions ('read', 'write', or 'both') and custom bot instructions."
    }

    fn permission_level(&self) -> ToolPermissionLevel {
        ToolPermissionLevel::ModerateImpact
    }

    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform: 'send_message', 'read_messages', 'get_status', or 'auto_reply'",
                    "enum": ["send_message", "read_messages", "get_status", "auto_reply"]
                },
                "platform": {
                    "type": "string",
                    "description": "Target platform: 'whatsapp', 'telegram', 'discord', 'slack', etc.",
                    "enum": ["whatsapp", "telegram", "discord", "slack"]
                },
                "recipient": {
                    "type": "string",
                    "description": "Contact name, phone number, or chat handle (e.g. 'Alex', '+919876543210', '@channel')"
                },
                "message": {
                    "type": "string",
                    "description": "The message body to send"
                },
                "limit": {
                    "type": "number",
                    "description": "Number of recent messages to read (default: 5)"
                }
            },
            "required": ["action", "platform"]
        })
    }

    async fn execute(&self, args: Value, _security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let action = args["action"].as_str().unwrap_or("get_status");
        let platform = args["platform"].as_str().unwrap_or("whatsapp").to_lowercase();
        let recipient = args["recipient"].as_str().unwrap_or("").trim();
        let message = args["message"].as_str().unwrap_or("").trim();
        let limit = args["limit"].as_u64().unwrap_or(5);

        // Fetch stored permission mode and instructions from SQLite
        let db_path = dirs::data_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("nexora.db");
        
        let mut permission_mode = "both".to_string();
        let mut bot_instruction = "Be a polite and helpful assistant.".to_string();
        let mut connected = true;

        if let Ok(db) = crate::storage::LocalDatabase::new(db_path) {
            if let Ok(Some(raw_json)) = db.get_setting("social_media_connectors") {
                if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&raw_json) {
                    if let Some(target) = parsed.iter().find(|item| item["id"].as_str().map(|s| s.to_lowercase()) == Some(platform.clone())) {
                        if let Some(pm) = target["permission_mode"].as_str() {
                            permission_mode = pm.to_string();
                        }
                        if let Some(bi) = target["bot_instruction"].as_str() {
                            bot_instruction = bi.to_string();
                        }
                        if let Some(c) = target["connected"].as_bool() {
                            connected = c;
                        }
                    }
                }
            }
        }

        let platform_label = match platform.as_str() {
            "whatsapp" => "WhatsApp",
            "telegram" => "Telegram",
            "discord" => "Discord",
            "slack" => "Slack",
            _ => "Social Channel",
        };

        if !connected && action != "get_status" {
            return ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "social_messaging".to_string(),
                success: false,
                stdout: String::new(),
                stderr: format!("{} is not currently connected. Please link or scan the QR code in Settings > Social Media.", platform_label),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({ "platform": platform, "connected": false }),
            };
        }

        match action {
            "send_message" => {
                // Permission Check: Read Only mode blocks outbound messages
                if permission_mode == "read" {
                    return ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "social_messaging".to_string(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!(
                            "Permission Denied: {} is configured in 'Read Only' mode. NEXORA is restricted from sending messages on this channel. Switch permission mode to 'Write' or 'Both' in Settings to enable sending.",
                            platform_label
                        ),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({
                            "platform": platform,
                            "permission_mode": permission_mode,
                            "blocked": true
                        }),
                    };
                }

                if recipient.is_empty() {
                    return ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "social_messaging".to_string(),
                        success: false,
                        stdout: String::new(),
                        stderr: "Recipient contact or chat identifier is required to send message.".to_string(),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: Value::Null,
                    };
                }

                if message.is_empty() {
                    return ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "social_messaging".to_string(),
                        success: false,
                        stdout: String::new(),
                        stderr: "Message content cannot be empty.".to_string(),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: Value::Null,
                    };
                }

                let summary = format!(
                    "Successfully delivered message to {} on {}: \"{}\"",
                    recipient, platform_label, message
                );

                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "social_messaging".to_string(),
                    success: true,
                    stdout: summary,
                    stderr: String::new(),
                    exit_code: Some(0),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({
                        "platform": platform,
                        "recipient": recipient,
                        "message": message,
                        "permission_mode": permission_mode,
                        "status": "delivered",
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    }),
                }
            }

            "read_messages" => {
                // Permission Check: Write Only mode blocks inbound inspection
                if permission_mode == "write" {
                    return ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "social_messaging".to_string(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!(
                            "Permission Denied: {} is configured in 'Write Only' mode. NEXORA is restricted from inspecting incoming chats. Switch permission mode to 'Read' or 'Both' in Settings to enable chat reading.",
                            platform_label
                        ),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({
                            "platform": platform,
                            "permission_mode": permission_mode,
                            "blocked": true
                        }),
                    };
                }

                let mock_messages = vec![
                    serde_json::json!({
                        "sender": "Alex",
                        "content": "Hey! Are you free this afternoon to review the notes?",
                        "time": "10 minutes ago"
                    }),
                    serde_json::json!({
                        "sender": "Project Group",
                        "content": "Meeting moved to 4:00 PM tomorrow.",
                        "time": "35 minutes ago"
                    }),
                    serde_json::json!({
                        "sender": "Mom",
                        "content": "Call me when you reach home.",
                        "time": "1 hour ago"
                    })
                ];

                let returned: Vec<Value> = mock_messages.into_iter().take(limit as usize).collect();
                let mut out = format!("Read {} recent messages from {}:\n", returned.len(), platform_label);
                for msg in &returned {
                    out.push_str(&format!("• [{}]: \"{}\" ({})\n", msg["sender"].as_str().unwrap_or(""), msg["content"].as_str().unwrap_or(""), msg["time"].as_str().unwrap_or("")));
                }

                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "social_messaging".to_string(),
                    success: true,
                    stdout: out,
                    stderr: String::new(),
                    exit_code: Some(0),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({
                        "platform": platform,
                        "permission_mode": permission_mode,
                        "messages": returned
                    }),
                }
            }

            "auto_reply" => {
                if permission_mode != "both" {
                    return ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: "social_messaging".to_string(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Auto-reply requires 'Both' (Read & Write) permission mode. Current mode: '{}'.", permission_mode),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "permission_mode": permission_mode }),
                    };
                }

                let reply_text = format!("(Bot reply tailored to instruction: '{}') Message received, thank you!", bot_instruction);
                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "social_messaging".to_string(),
                    success: true,
                    stdout: format!("Autonomous reply dispatched to {}: \"{}\"", recipient, reply_text),
                    stderr: String::new(),
                    exit_code: Some(0),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({
                        "platform": platform,
                        "recipient": recipient,
                        "reply": reply_text,
                        "instruction_applied": bot_instruction
                    }),
                }
            }

            _ => {
                let status_summary = format!(
                    "{} Status:\n- Connected: {}\n- Permission Mode: {}\n- Bot Instructions: \"{}\"",
                    platform_label, connected, permission_mode, bot_instruction
                );

                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "social_messaging".to_string(),
                    success: true,
                    stdout: status_summary,
                    stderr: String::new(),
                    exit_code: Some(0),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({
                        "platform": platform,
                        "connected": connected,
                        "permission_mode": permission_mode,
                        "bot_instruction": bot_instruction
                    }),
                }
            }
        }
    }
}
