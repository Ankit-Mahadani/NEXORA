use chrono::Utc;
use crate::models::MemoryItem;
use crate::storage::LocalDatabase;

pub struct MemoryAgent;

impl MemoryAgent {
    pub fn retrieve_relevant(db: &LocalDatabase, query: &str) -> Vec<MemoryItem> {
        db.search_memories(query).unwrap_or_default()
    }

    pub fn save_experience(
        db: &LocalDatabase,
        task_id: &str,
        category: &str,
        content: &str,
        verified: bool,
    ) -> Result<MemoryItem, String> {
        let item = MemoryItem {
            id: uuid::Uuid::new_v4().to_string(),
            category: category.to_string(),
            content: content.to_string(),
            task_id: Some(task_id.to_string()),
            source: "supervisor_loop".to_string(),
            verified,
            created_at: Utc::now(),
            similarity_score: None,
        };

        db.save_memory(&item)?;
        Ok(item)
    }
}
