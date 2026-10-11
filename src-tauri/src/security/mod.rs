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
        let mut roots = vec![initial_workspace];
        if let Some(desktop) = dirs::desktop_dir() {
            roots.push(desktop);
        }
        if let Some(downloads) = dirs::download_dir() {
            roots.push(downloads);
        }
        if let Some(docs) = dirs::document_dir() {
            roots.push(docs);
        }
        if let Some(home) = dirs::home_dir() {
            roots.push(home);
        }
        Self {
            workspace_roots: roots,
        }
    }

    pub fn add_workspace_root(&mut self, path: PathBuf) {
        if !self.workspace_roots.contains(&path) {
            self.workspace_roots.push(path);
        }
    }

    /// Expands standard path prefixes (~, Desktop, Downloads, Documents)
    pub fn resolve_path_prefix(&self, target_path: &Path) -> PathBuf {
        let path_str = target_path.to_string_lossy();
        if path_str.starts_with("~/") || path_str.starts_with("~\\") {
            if let Some(home) = dirs::home_dir() {
                return home.join(&path_str[2..]);
            }
        }
        let lower = path_str.to_lowercase();
        if lower.starts_with("desktop/") || lower.starts_with("desktop\\") {
            if let Some(desktop) = dirs::desktop_dir() {
                return desktop.join(&path_str[8..]);
            }
        }
        if lower.starts_with("downloads/") || lower.starts_with("downloads\\") {
            if let Some(downloads) = dirs::download_dir() {
                return downloads.join(&path_str[10..]);
            }
        }
        if lower.starts_with("documents/") || lower.starts_with("documents\\") {
            if let Some(docs) = dirs::document_dir() {
                return docs.join(&path_str[10..]);
            }
        }
        target_path.to_path_buf()
    }

    /// Validates path traversal and ensures path is inside authorized workspace or user folders
    pub fn validate_path(&self, target_path: &Path) -> Result<PathBuf, String> {
        let resolved = self.resolve_path_prefix(target_path);

        let canonical_target = if resolved.exists() {
            resolved.canonicalize().map_err(|e| format!("Failed to canonicalize path: {}", e))?
        } else {
            // If file does not exist yet, check its canonical parent directory
            let parent = resolved.parent().unwrap_or(Path::new("."));
            if !parent.exists() {
                let _ = std::fs::create_dir_all(parent);
            }
            let can_parent = parent.canonicalize().map_err(|e| format!("Parent directory does not exist or invalid: {}", e))?;
            can_parent.join(resolved.file_name().unwrap_or_default())
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
