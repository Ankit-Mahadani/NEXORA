use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Planning,
    Executing,
    Evaluating,
    Diagnosing,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub objective: String,
    pub status: TaskStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub current_iteration: u32,
    pub max_iterations: u32,
    pub workspace_path: String,
    pub selected_model: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_status_serialization() {
        let task = Task {
            id: "test-1".into(),
            title: "Test Task".into(),
            objective: "Test objective".into(),
            status: TaskStatus::Planning,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            current_iteration: 0,
            max_iterations: 5,
            workspace_path: ".".into(),
            selected_model: "qwen2.5-coder:7b".into(),
        };

        let json = serde_json::to_string(&task).unwrap();
        assert!(json.contains("\"status\":\"planning\""));
    }

    #[test]
    fn test_task_state_transition() {
        let mut task = Task {
            id: "test-2".into(),
            title: "Test Task 2".into(),
            objective: "Evaluate code".into(),
            status: TaskStatus::Pending,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            current_iteration: 0,
            max_iterations: 3,
            workspace_path: ".".into(),
            selected_model: "qwen2.5-coder:7b".into(),
        };

        assert_eq!(task.status, TaskStatus::Pending);
        task.status = TaskStatus::Planning;
        assert_eq!(task.status, TaskStatus::Planning);
        task.status = TaskStatus::Executing;
        assert_eq!(task.status, TaskStatus::Executing);
        task.status = TaskStatus::Completed;
        assert_eq!(task.status, TaskStatus::Completed);
    }
}
