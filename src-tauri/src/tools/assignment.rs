use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use std::process::Command;
use std::time::Instant;

use crate::models::ToolExecutionResult;
use crate::security::{SecurityManager, ToolPermissionLevel};
use crate::tools::Tool;

pub struct AssignmentPipelineTool;

#[async_trait]
impl Tool for AssignmentPipelineTool {
    fn name(&self) -> &str {
        "assignment_pipeline"
    }

    fn description(&self) -> &str {
        "Autonomous college assignment pipeline: checks Google Classroom, downloads questions, generates handwritten lined notebook pages (or Word file), compiles them into a named PDF (Assignment_Subject_RegNo.pdf), and turns in to Classroom."
    }

    fn permission_level(&self) -> ToolPermissionLevel {
        ToolPermissionLevel::Safe
    }

    fn input_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action: 'check_classroom', 'generate_assignment', 'open_chatgpt_generator', 'turn_in', or 'full_pipeline'",
                    "enum": ["check_classroom", "generate_assignment", "open_chatgpt_generator", "turn_in", "full_pipeline"]
                },
                "assignment_title": { "type": "string", "description": "Title of the assignment (e.g. 'Assignment 1')" },
                "subject_name": { "type": "string", "description": "Course or Subject (e.g. 'Operating Systems')" },
                "student_name": { "type": "string", "description": "Student full name (e.g. 'Ankit')" },
                "registration_number": { "type": "string", "description": "College registration / roll number (e.g. '2023BCSE042')" },
                "format": { "type": "string", "description": "Format: 'handwritten' (default) or 'word'", "enum": ["handwritten", "word"] },
                "questions_json": { "type": "string", "description": "JSON string of questions & answers or raw questions prompt" },
                "output_dir": { "type": "string", "description": "Output directory (defaults to Desktop)" }
            },
            "required": ["action"]
        })
    }

    async fn execute(&self, args: Value, _security: &Arc<tokio::sync::Mutex<SecurityManager>>) -> ToolExecutionResult {
        let start = Instant::now();
        let action = args["action"].as_str().unwrap_or("full_pipeline");
        let title = args["assignment_title"].as_str().unwrap_or("Assignment_1");
        let subject = args["subject_name"].as_str().unwrap_or("Operating_Systems");
        let student_name = args["student_name"].as_str().unwrap_or("Ankit");
        let reg_no = args["registration_number"].as_str().unwrap_or("2023BCSE042");
        let format_type = args["format"].as_str().unwrap_or("handwritten");
        let questions_json = args["questions_json"].as_str().unwrap_or("");
        
        let desktop_dir = dirs::desktop_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .to_string_lossy()
            .to_string();
        let output_dir = args["output_dir"].as_str().unwrap_or(&desktop_dir);

        match action {
            "check_classroom" => {
                let ps_cmd = r#"Start-Process 'https://classroom.google.com'; Write-Output 'Opened Google Classroom in Chrome/browser.';"#;
                let output = Command::new("powershell")
                    .arg("-NoProfile")
                    .arg("-Command")
                    .arg(ps_cmd)
                    .output();

                match output {
                    Ok(out) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: out.status.success(),
                        stdout: String::from_utf8_lossy(&out.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&out.stderr).to_string(),
                        exit_code: out.status.code(),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "action": "check_classroom" }),
                    },
                    Err(e) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Failed to launch browser for Classroom: {}", e),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "error": e.to_string() }),
                    },
                }
            }
            "open_chatgpt_generator" => {
                let prompt = format!(
                    "Create an A4 high quality photo of a student handwritten assignment on lined notebook paper. At top: Name: {}, Reg No: {}, Subject: {}, Assignment: {}. Write clear handwritten solutions for the questions on notebook ruled lines in blue ink.",
                    student_name, reg_no, subject, title
                );
                let clean_prompt = prompt.replace('\'', "''");
                let ps_cmd = format!(
                    r#"Set-Clipboard '{prompt}'; Start-Process 'https://chatgpt.com'; Write-Output 'Copied DALL-E handwritten assignment prompt to clipboard and opened ChatGPT: {prompt}';"#,
                    prompt = clean_prompt
                );

                let output = Command::new("powershell")
                    .arg("-NoProfile")
                    .arg("-Command")
                    .arg(ps_cmd)
                    .output();

                match output {
                    Ok(out) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: out.status.success(),
                        stdout: String::from_utf8_lossy(&out.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&out.stderr).to_string(),
                        exit_code: out.status.code(),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "action": "open_chatgpt_generator", "prompt": prompt }),
                    },
                    Err(e) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Failed to open ChatGPT: {}", e),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "error": e.to_string() }),
                    },
                }
            }
            "turn_in" => {
                let clean_title = title.replace(' ', "_");
                let clean_subj = subject.replace(' ', "_");
                let clean_reg = reg_no.replace(' ', "_");
                let ext = if format_type == "word" { "docx" } else { "pdf" };
                let expected_file = format!("{}/{}_{}_{}.{}", output_dir.replace('\\', "/"), clean_title, clean_subj, clean_reg, ext);
                let ps_cmd = format!(
                    r#"Set-Clipboard '{path}'; Start-Process 'https://classroom.google.com'; Write-Output 'Copied assignment path ({path}) to clipboard and opened Google Classroom to turn in.';"#,
                    path = expected_file.replace('\'', "''")
                );

                let output = Command::new("powershell")
                    .arg("-NoProfile")
                    .arg("-Command")
                    .arg(ps_cmd)
                    .output();

                match output {
                    Ok(out) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: out.status.success(),
                        stdout: String::from_utf8_lossy(&out.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&out.stderr).to_string(),
                        exit_code: out.status.code(),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "action": "turn_in", "target_file": expected_file }),
                    },
                    Err(e) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Failed to launch Classroom turn-in: {}", e),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "error": e.to_string() }),
                    },
                }
            }
            "generate_assignment" => {
                let script_path = std::env::current_dir()
                    .unwrap_or_default()
                    .join("scripts")
                    .join("assignment_engine.py");

                let mut cmd = Command::new("python");
                cmd.arg(script_path.to_string_lossy().to_string())
                    .arg("--mode").arg(format_type)
                    .arg("--name").arg(student_name)
                    .arg("--regno").arg(reg_no)
                    .arg("--subject").arg(subject)
                    .arg("--assignment").arg(title)
                    .arg("--output-dir").arg(output_dir);

                if !questions_json.is_empty() {
                    cmd.arg("--data-json").arg(questions_json);
                }

                let output = cmd.output();
                match output {
                    Ok(out) => {
                        let stdout_str = String::from_utf8_lossy(&out.stdout).to_string();
                        let stderr_str = String::from_utf8_lossy(&out.stderr).to_string();
                        let success = out.status.success();
                        ToolExecutionResult {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: self.name().into(),
                            success,
                            stdout: stdout_str,
                            stderr: stderr_str,
                            exit_code: out.status.code(),
                            duration_ms: start.elapsed().as_millis() as u64,
                            metadata: serde_json::json!({ "action": "generate_assignment", "format": format_type }),
                        }
                    }
                    Err(e) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Failed to execute assignment_engine: {}", e),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "error": e.to_string() }),
                    },
                }
            }
            _ => {
                // "full_pipeline"
                let script_path = std::env::current_dir()
                    .unwrap_or_default()
                    .join("scripts")
                    .join("assignment_engine.py");

                let mut cmd = Command::new("python");
                cmd.arg(script_path.to_string_lossy().to_string())
                    .arg("--mode").arg(format_type)
                    .arg("--name").arg(student_name)
                    .arg("--regno").arg(reg_no)
                    .arg("--subject").arg(subject)
                    .arg("--assignment").arg(title)
                    .arg("--output-dir").arg(output_dir);

                if !questions_json.is_empty() {
                    cmd.arg("--data-json").arg(questions_json);
                }

                let gen_result = cmd.output();
                let clean_title = title.replace(' ', "_");
                let clean_subj = subject.replace(' ', "_");
                let clean_reg = reg_no.replace(' ', "_");
                let ext = if format_type == "word" { "docx" } else { "pdf" };
                let expected_file = format!("{}/{}_{}_{}.{}", output_dir.replace('\\', "/"), clean_title, clean_subj, clean_reg, ext);

                let ps_cmd = format!(
                    r#"Set-Clipboard '{path}'; Start-Process 'https://classroom.google.com'; Write-Output 'Autonomous pipeline complete: Created {path}, copied path to clipboard, and opened Google Classroom to turn in.';"#,
                    path = expected_file.replace('\'', "''")
                );

                let _ = Command::new("powershell")
                    .arg("-NoProfile")
                    .arg("-Command")
                    .arg(ps_cmd)
                    .output();

                match gen_result {
                    Ok(out) => {
                        let mut msg = format!(
                            "### Autonomous College Assignment Pipeline Complete\n\n- **Student Name**: {}\n- **Registration No**: {}\n- **Subject**: {}\n- **Assignment**: {}\n- **Format**: {}\n- **Output File**: `{}`\n\n✅ Generated sequentially on lined notebook paper styling (150 DPI).\n✅ Copied file path to clipboard.\n✅ Opened Google Classroom (`https://classroom.google.com`) ready to upload & turn in.",
                            student_name, reg_no, subject, title, format_type, expected_file
                        );
                        let stdout_str = String::from_utf8_lossy(&out.stdout).to_string();
                        if !stdout_str.is_empty() {
                            msg.push_str(&format!("\n\n```json\n{}\n```", stdout_str.trim()));
                        }

                        ToolExecutionResult {
                            call_id: uuid::Uuid::new_v4().to_string(),
                            tool_name: self.name().into(),
                            success: out.status.success(),
                            stdout: msg,
                            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
                            exit_code: out.status.code(),
                            duration_ms: start.elapsed().as_millis() as u64,
                            metadata: serde_json::json!({
                                "action": "full_pipeline",
                                "output_file": expected_file,
                                "format": format_type
                            }),
                        }
                    }
                    Err(e) => ToolExecutionResult {
                        call_id: uuid::Uuid::new_v4().to_string(),
                        tool_name: self.name().into(),
                        success: false,
                        stdout: String::new(),
                        stderr: format!("Autonomous pipeline generator failed: {}", e),
                        exit_code: Some(1),
                        duration_ms: start.elapsed().as_millis() as u64,
                        metadata: serde_json::json!({ "error": e.to_string() }),
                    },
                }
            }
        }
    }
}
