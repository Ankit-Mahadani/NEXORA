use sysinfo::{System, Disks};
use std::sync::Mutex;
use crate::models::SystemMetrics;
use crate::ollama::OllamaClient;
use crate::storage::Neo4jClient;

pub struct TelemetryService {
    sys: Mutex<System>,
    ollama_client: OllamaClient,
    neo4j_client: Neo4jClient,
}

impl TelemetryService {
    pub fn new(ollama_client: OllamaClient, neo4j_client: Neo4jClient) -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        Self {
            sys: Mutex::new(sys),
            ollama_client,
            neo4j_client,
        }
    }

    pub async fn collect_metrics(&self, active_tasks: usize) -> SystemMetrics {
        let (cpu, mem_used, mem_total, mem_pct) = {
            let mut sys = self.sys.lock().unwrap();
            sys.refresh_cpu_usage();
            sys.refresh_memory();

            let cpu = sys.global_cpu_usage();
            let mem_used = sys.used_memory() / (1024 * 1024);
            let mem_total = sys.total_memory() / (1024 * 1024);
            let mem_pct = if mem_total > 0 {
                (mem_used as f32 / mem_total as f32) * 100.0
            } else {
                0.0
            };
            (cpu, mem_used, mem_total, mem_pct)
        };

        let disks = Disks::new_with_refreshed_list();
        let (mut disk_free, mut disk_total) = (0u64, 0u64);
        for d in &disks {
            disk_free += d.available_space() / (1024 * 1024 * 1024);
            disk_total += d.total_space() / (1024 * 1024 * 1024);
        }

        let os_name = System::name().unwrap_or_else(|| "Windows".to_string());
        let os_version = System::os_version().unwrap_or_else(|| "11".to_string());

        let ollama_online = self.ollama_client.check_health().await;
        let neo4j_online = self.neo4j_client.check_health().await;

        SystemMetrics {
            cpu_usage: cpu,
            memory_used_mb: mem_used,
            memory_total_mb: mem_total,
            memory_percentage: mem_pct,
            disk_free_gb: disk_free,
            disk_total_gb: disk_total,
            os_name,
            os_version,
            ollama_online,
            neo4j_online,
            active_tasks_count: active_tasks,
        }
    }
}
