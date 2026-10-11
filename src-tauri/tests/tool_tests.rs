use nexora_lib::models::ToolExecutionResult;
use nexora_lib::security::{SecurityManager, ToolPermissionLevel};
use nexora_lib::tools::filesystem::{ListDirTool, ReadFileTool, WriteFileTool};
use nexora_lib::tools::terminal::RunCommandTool;
use nexora_lib::tools::Tool;
use std::sync::Arc;
use tokio::sync::Mutex;
use tempfile::tempdir;

#[tokio::test]
async fn test_security_path_traversal_prevention() {
    let dir = tempdir().unwrap();
    let sec = Arc::new(Mutex::new(SecurityManager::new(dir.path().to_path_buf())));

    let write_tool = WriteFileTool;
    // Attempt to write outside the workspace
    let args = serde_json::json!({
        "path": "../../outside_test.txt",
        "content": "illegal content"
    });

    let res = write_tool.execute(args, &sec).await;
    assert!(!res.success, "Should fail on path traversal");
    assert!(res.stderr.contains("outside of approved workspaces"));
}

#[tokio::test]
async fn test_write_and_read_file_tool() {
    let dir = tempdir().unwrap();
    let sec = Arc::new(Mutex::new(SecurityManager::new(dir.path().to_path_buf())));

    let write_tool = WriteFileTool;
    let read_tool = ReadFileTool;

    let test_file = dir.path().join("sample.txt");
    let test_path_str = test_file.to_str().unwrap();

    let write_res = write_tool.execute(serde_json::json!({
        "path": test_path_str,
        "content": "Hello NEXORA"
    }), &sec).await;

    assert!(write_res.success);

    let read_res = read_tool.execute(serde_json::json!({
        "path": test_path_str
    }), &sec).await;

    assert!(read_res.success);
    assert_eq!(read_res.stdout, "Hello NEXORA");
}

#[tokio::test]
async fn test_terminal_command_execution() {
    let dir = tempdir().unwrap();
    let sec = Arc::new(Mutex::new(SecurityManager::new(dir.path().to_path_buf())));

    let cmd_tool = RunCommandTool;
    let res = cmd_tool.execute(serde_json::json!({
        "command": "Write-Output 'NEXORA_EXEC_OK'",
        "cwd": dir.path().to_str().unwrap()
    }), &sec).await;

    assert!(res.success);
    assert!(res.stdout.contains("NEXORA_EXEC_OK"));
    assert_eq!(res.exit_code, Some(0));
}

#[test]
fn test_secret_redaction() {
    let raw = "user: admin, token: secret_api_token_12345, password: my_super_secret_password";
    let redacted = SecurityManager::redact_secrets(raw);
    assert!(!redacted.contains("secret_api_token_12345"));
    assert!(!redacted.contains("my_super_secret_password"));
    assert!(redacted.contains("[REDACTED]"));
}
