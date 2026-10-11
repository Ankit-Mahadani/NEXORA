use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use std::time::Instant;
use tokio::process::Command;
use crate::models::ToolExecutionResult;
use crate::security::{SecurityManager, ToolPermissionLevel};
use super::Tool;

pub struct TakeScreenshotTool;

#[async_trait]
impl Tool for TakeScreenshotTool {
    fn name(&self) -> &str { "take_screenshot" }
    fn description(&self) -> &str { "Capture a full screenshot of the screen and save to Desktop or specified destination" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::Safe }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "destination": { "type": "string", "description": "Optional file path or filename to save PNG. Defaults to Desktop." }
            }
        })
    }
    async fn execute(&self, args: Value, _security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
        let default_name = format!("Screenshot_{}.png", timestamp);

        let dest_str = args["destination"].as_str().unwrap_or(&default_name);
        let save_path = if dest_str.contains('/') || dest_str.contains('\\') {
            std::path::PathBuf::from(dest_str)
        } else {
            let desktop = dirs::desktop_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
            desktop.join(dest_str)
        };

        let path_str = save_path.to_string_lossy().to_string();

        let ps_script = format!(
            r#"Add-Type -AssemblyName System.Windows.Forms;
Add-Type -AssemblyName System.Drawing;
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height;
$graphics = [System.Drawing.Graphics]::FromImage($bitmap);
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size);
$bitmap.Save('{}', [System.Drawing.Imaging.ImageFormat]::Png);
$graphics.Dispose();
$bitmap.Dispose();
Write-Output 'Screenshot saved to {}';"#,
            path_str.replace('\'', "''"),
            path_str.replace('\'', "''")
        );

        let output = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(ps_script)
            .output()
            .await;

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "take_screenshot".into(),
                    success: out.status.success(),
                    stdout: stdout.trim().to_string(),
                    stderr,
                    exit_code: out.status.code(),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({ "file": path_str }),
                }
            }
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "take_screenshot".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to take screenshot: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}

pub struct DesktopAppTool;

#[async_trait]
impl Tool for DesktopAppTool {
    fn name(&self) -> &str { "desktop_app" }
    fn description(&self) -> &str { "Open or close desktop applications (e.g. Notepad, Chrome, Spotify) or open files with their default program" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::ModerateImpact }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "action": { "type": "string", "enum": ["open", "close"], "description": "Action to perform: 'open' or 'close'" },
                "target": { "type": "string", "description": "Application name (e.g. notepad, chrome, spotify) or file path to open" },
                "args": { "type": "string", "description": "Optional command-line arguments or file path for the app" }
            },
            "required": ["action", "target"]
        })
    }
    async fn execute(&self, args: Value, security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let action = args["action"].as_str().unwrap_or("open");
        let target = args["target"].as_str().unwrap_or("");
        let extra_args = args["args"].as_str().unwrap_or("");

        let sec = security.lock().await;
        // Expand path if target is a file
        let resolved_target = sec.resolve_path_prefix(std::path::Path::new(target));
        let target_str = resolved_target.to_string_lossy().to_string();

        let ps_command = if action == "close" {
            let proc_name = target.trim_end_matches(".exe");
            format!("Stop-Process -Name '{}' -Force -ErrorAction SilentlyContinue; Write-Output 'Closed process {}';", proc_name, proc_name)
        } else if action == "media" || target == "media" || action == "next_track" || target == "next" || action == "prev_track" || target == "prev" || action == "play_pause" || target == "play_pause" {
            let sub = if target == "prev" || target == "previous" || action == "prev_track" || action == "previous_track" {
                "prev"
            } else if target == "pause" || target == "play_pause" || target == "resume" || action == "play_pause" {
                "play_pause"
            } else {
                "next"
            };

            match sub {
                "prev" => {
                    r#"$null = Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class NexoraMedia {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Prev() { keybd_event(0xB1, 0, 0, UIntPtr.Zero); keybd_event(0xB1, 0, 2, UIntPtr.Zero); }
}
"@ -PassThru -ErrorAction SilentlyContinue;
[NexoraMedia]::Prev();
$w = New-Object -ComObject WScript.Shell;
if ($w.AppActivate('Spotify')) { Start-Sleep -Milliseconds 150; $w.SendKeys('^{LEFT}'); }
Write-Output 'Skipped to previous song.';"#.to_string()
                }
                "play_pause" => {
                    r#"$null = Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class NexoraMedia {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void PlayPause() { keybd_event(0xB3, 0, 0, UIntPtr.Zero); keybd_event(0xB3, 0, 2, UIntPtr.Zero); }
}
"@ -PassThru -ErrorAction SilentlyContinue;
[NexoraMedia]::PlayPause();
Write-Output 'Toggled media playback (play/pause).';"#.to_string()
                }
                _ => {
                    r#"$null = Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class NexoraMedia {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Next() { keybd_event(0xB0, 0, 0, UIntPtr.Zero); keybd_event(0xB0, 0, 2, UIntPtr.Zero); }
}
"@ -PassThru -ErrorAction SilentlyContinue;
[NexoraMedia]::Next();
$w = New-Object -ComObject WScript.Shell;
if ($w.AppActivate('Spotify')) { Start-Sleep -Milliseconds 150; $w.SendKeys('^{RIGHT}'); }
Write-Output 'Skipped to next song.';"#.to_string()
                }
            }
        } else if target.to_lowercase().contains("spotify") && !extra_args.trim().is_empty() {
            let clean_song = extra_args.trim().trim_matches('"').trim_matches('\'').replace('\'', "''");
            format!(
                r#"Start-Process 'spotify:'; Start-Sleep -Milliseconds 1200; $w = New-Object -ComObject WScript.Shell; $w.AppActivate('Spotify'); Start-Sleep -Milliseconds 500; Set-Clipboard '{song}'; $w.SendKeys('^k'); Start-Sleep -Milliseconds 600; $w.SendKeys('^v'); Start-Sleep -Milliseconds 1200; $w.SendKeys('{{DOWN}}'); Start-Sleep -Milliseconds 300; $w.SendKeys('{{ENTER}}'); Start-Sleep -Milliseconds 400; Write-Output 'Started playing first result for: {song}';"#,
                song = clean_song
            )
        } else {
            if extra_args.is_empty() {
                format!("Start-Process -FilePath '{}'; Write-Output 'Opened {}';", target_str.replace('\'', "''"), target_str.replace('\'', "''"))
            } else {
                let resolved_arg = sec.resolve_path_prefix(std::path::Path::new(extra_args));
                let arg_str = resolved_arg.to_string_lossy().to_string();
                format!("Start-Process -FilePath '{}' -ArgumentList '{}'; Write-Output 'Opened {} with {}';", 
                    target_str.replace('\'', "''"),
                    arg_str.replace('\'', "''"),
                    target_str.replace('\'', "''"),
                    arg_str.replace('\'', "''")
                )
            }
        };

        let output = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(ps_command)
            .output()
            .await;

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "desktop_app".into(),
                    success: out.status.success(),
                    stdout: stdout.trim().to_string(),
                    stderr,
                    exit_code: out.status.code(),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({ "action": action, "target": target }),
                }
            }
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "desktop_app".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("Desktop app command failed: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}

pub struct SystemControlTool;

#[async_trait]
impl Tool for SystemControlTool {
    fn name(&self) -> &str { "system_control" }
    fn description(&self) -> &str { "Manage system state: schedule shutdown, cancel shutdown, restart, or sleep" }
    fn permission_level(&self) -> ToolPermissionLevel { ToolPermissionLevel::Sensitive }
    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "action": { "type": "string", "enum": ["shutdown", "cancel_shutdown", "restart", "sleep"], "description": "System action to trigger" },
                "delay_seconds": { "type": "integer", "description": "Delay in seconds before action occurs (default: 0 for immediate, or e.g. 600 for 10 minutes)" }
            },
            "required": ["action"]
        })
    }
    async fn execute(&self, args: Value, _security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let action = args["action"].as_str().unwrap_or("shutdown");
        let delay = args["delay_seconds"].as_u64().unwrap_or(0);

        let cmd = match action {
            "shutdown" => format!("shutdown /s /t {}", delay),
            "cancel_shutdown" => "shutdown /a".to_string(),
            "restart" => format!("shutdown /r /t {}", delay),
            "sleep" => "rundll32.exe powrprof.dll,SetSuspendState 0,1,0".to_string(),
            _ => format!("shutdown /s /t {}", delay),
        };

        let output = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(&cmd)
            .output()
            .await;

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                let msg = if action == "cancel_shutdown" {
                    "Scheduled system shutdown was cancelled successfully.".to_string()
                } else if delay > 0 {
                    format!("Computer will {} in {} seconds ({} minutes).", action, delay, delay / 60)
                } else {
                    format!("Triggered system {}.", action)
                };

                ToolExecutionResult {
                    call_id: uuid::Uuid::new_v4().to_string(),
                    tool_name: "system_control".into(),
                    success: out.status.success(),
                    stdout: if stdout.trim().is_empty() { msg } else { stdout.trim().to_string() },
                    stderr,
                    exit_code: out.status.code(),
                    duration_ms: start.elapsed().as_millis() as u64,
                    metadata: serde_json::json!({ "action": action, "delay_seconds": delay }),
                }
            }
            Err(e) => ToolExecutionResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                tool_name: "system_control".into(),
                success: false,
                stdout: String::new(),
                stderr: format!("System control error: {}", e),
                exit_code: Some(1),
                duration_ms: start.elapsed().as_millis() as u64,
                metadata: serde_json::json!({}),
            },
        }
    }
}
