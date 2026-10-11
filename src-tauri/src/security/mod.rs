use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolPermissionLevel {
    Safe,             // Auto-executed (e.g. read_file, list_dir, system_metrics)
    ModerateImpact,   // Can be configured to auto-approve or prompt (e.g. write_file)
    Sensitive,        // Always prompt or strictly restricted (e.g. terminal execution, delete)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolPermissionConfig {
    pub tool_name: String,
    pub level: ToolPermissionLevel,
    pub auto_approved: bool,
}

pub struct SecurityManager {
    workspace_roots: Vec<PathBuf>,
}

impl SecurityManager {
    pub fn new(initial_workspace: PathBuf) -> Self {
        Self {
            workspace_roots: vec![initial_workspace],
        }
    }

    pub fn add_workspace_root(&mut self, path: PathBuf) {
        if !self.workspace_roots.contains(&path) {
            self.workspace_roots.push(path);
        }
    }

    /// Validates path traversal and ensures path is inside authorized workspace
    pub fn validate_path(&self, target_path: &Path) -> Result<PathBuf, String> {
        let canonical_target = if target_path.exists() {
            target_path.canonicalize().map_err(|e| format!("Failed to canonicalize path: {}", e))?
        } else {
            // If file does not exist yet, check its canonical parent directory
            let parent = target_path.parent().unwrap_or(Path::new("."));
            let can_parent = parent.canonicalize().map_err(|e| format!("Parent directory does not exist or invalid: {}", e))?;
            can_parent.join(target_path.file_name().unwrap_or_default())
        };

        for root in &self.workspace_roots {
            if let Ok(can_root) = root.canonicalize() {
                if canonical_target.starts_with(&can_root) {
                    return Ok(canonical_target);
                }
            }
        }

        Err(format!(
            "Access denied: path {:?} is outside of approved workspaces: {:?}",
            target_path, self.workspace_roots
        ))
    }

    /// Redacts sensitive keys, tokens, or passwords from logs and memory
    pub fn redact_secrets(input: &str) -> String {
        let pattern = regex::Regex::new(r"(?i)(password|token|secret|api_key|authorization)\s*[:=]\s*([^\s,;]+)").unwrap();
        pattern.replace_all(input, "$1: [REDACTED]").to_string()
    }
}
