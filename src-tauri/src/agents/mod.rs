pub mod supervisor;
pub mod planner;
pub mod specialist;
pub mod evaluation;
pub mod memory;

pub use supervisor::SupervisorAgent;
pub use planner::PlannerAgent;
pub use specialist::SpecialistAgent;
pub type VariationWorker = specialist::SpecialistAgent;
pub use evaluation::{EvaluationAgent, DiagnosticAgent};
pub use memory::MemoryAgent;

pub fn extract_json(raw: &str) -> Option<serde_json::Value> {
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(raw) {
        return Some(val);
    }
    let trimmed = raw.trim();
    // Try to find object {...}
    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if end > start {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&trimmed[start..=end]) {
                return Some(val);
            }
        }
    }
    // Try to find array [...]
    if let (Some(start), Some(end)) = (trimmed.find('['), trimmed.rfind(']')) {
        if end > start {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&trimmed[start..=end]) {
                return Some(val);
            }
        }
    }
    None
}
