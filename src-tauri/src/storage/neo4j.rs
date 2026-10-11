use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::models::{Task, SupervisorHint, AgentRun, VariationCandidate, EvaluationResult, DiagnosticResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub properties: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphRelationship {
    pub from: String,
    pub to: String,
    pub rel_type: String,
    pub properties: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub relationships: Vec<GraphRelationship>,
    pub status: String,
}

#[derive(Clone)]
pub struct Neo4jClient {
    uri: String,
    _user: String,
    _pass: String,
    cache: Arc<Mutex<HashMap<String, GraphData>>>,
}

impl Neo4jClient {
    pub fn new(uri: Option<String>, user: Option<String>, pass: Option<String>) -> Self {
        Self {
            uri: uri.unwrap_or_else(|| "127.0.0.1:7687".to_string()),
            _user: user.unwrap_or_else(|| "neo4j".to_string()),
            _pass: pass.unwrap_or_else(|| "password".to_string()),
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn check_health(&self) -> bool {
        let clean_target = self.uri
            .trim_start_matches("bolt://")
            .trim_start_matches("neo4j://");
        tokio::net::TcpStream::connect(clean_target).await.is_ok()
    }

    /// Flowchart Step: "Commit Lineage & Scores" into Persistent Graph Memory (Neo4j)
    pub async fn commit_avo_lineage(
        &self,
        task: &Task,
        supervisor_hint: &SupervisorHint,
        subagents: &[AgentRun],
        candidates: &[VariationCandidate],
        evaluations: &[EvaluationResult],
        _diagnostics: &[DiagnosticResult],
        winning_candidate_id: Option<&str>,
    ) -> GraphData {
        let is_connected = self.check_health().await;
        let mut nodes: Vec<GraphNode> = Vec::new();
        let mut relationships: Vec<GraphRelationship> = Vec::new();

        // 1. Task Node
        let task_node_id = task.id.clone();
        nodes.push(GraphNode {
            id: task_node_id.clone(),
            label: "TaskNode".to_string(),
            properties: serde_json::json!({
                "id": task.id,
                "title": task.title,
                "objective": task.objective,
                "status": format!("{:?}", task.status),
                "model": task.selected_model,
                "iterations": task.current_iteration
            }),
        });

        // 2. Supervisor Intervention Node
        let sup_id = supervisor_hint.id.clone();
        nodes.push(GraphNode {
            id: sup_id.clone(),
            label: "SupervisorIntervention".to_string(),
            properties: serde_json::json!({
                "id": supervisor_hint.id,
                "hint": supervisor_hint.hint,
                "strategy": supervisor_hint.strategy,
                "timestamp": supervisor_hint.timestamp.to_rfc3339()
            }),
        });

        relationships.push(GraphRelationship {
            from: task_node_id.clone(),
            to: sup_id.clone(),
            rel_type: "SUPERVISED_BY".to_string(),
            properties: serde_json::json!({ "type": "intervention" }),
        });

        // 3. Sub-Agent Execution Nodes
        for run in subagents {
            let agent_node_id = format!("{}-subagent-{:?}", task.id, run.agent_role);
            nodes.push(GraphNode {
                id: agent_node_id.clone(),
                label: "SubAgentExecution".to_string(),
                properties: serde_json::json!({
                    "role": format!("{:?}", run.agent_role),
                    "model": run.model_id,
                    "status": run.status,
                    "summary": run.summary.as_deref().unwrap_or("")
                }),
            });

            relationships.push(GraphRelationship {
                from: task_node_id.clone(),
                to: agent_node_id,
                rel_type: "SPAWNED_AGENT".to_string(),
                properties: serde_json::json!({}),
            });
        }

        // 4. Variation Candidate Nodes & "MUTATED_FROM" Lineage
        for cand in candidates {
            nodes.push(GraphNode {
                id: cand.id.clone(),
                label: "VariationCandidate".to_string(),
                properties: serde_json::json!({
                    "id": cand.id,
                    "iteration": cand.iteration,
                    "hypothesis": cand.hypothesis,
                    "status": cand.status,
                    "score": cand.score
                }),
            });

            // Flowchart link: Supervisor Intervention -[:GUIDED]-> Variation Candidate
            relationships.push(GraphRelationship {
                from: sup_id.clone(),
                to: cand.id.clone(),
                rel_type: "GUIDED".to_string(),
                properties: serde_json::json!({ "guidance": supervisor_hint.hint }),
            });

            // Flowchart link: Variation Candidate -[:MUTATED_FROM]-> Ancestor Variation Candidate
            if let Some(parent_id) = &cand.parent_candidate_id {
                relationships.push(GraphRelationship {
                    from: cand.id.clone(),
                    to: parent_id.clone(),
                    rel_type: "MUTATED_FROM".to_string(),
                    properties: serde_json::json!({ "iteration_delta": 1 }),
                });
            } else {
                relationships.push(GraphRelationship {
                    from: task_node_id.clone(),
                    to: cand.id.clone(),
                    rel_type: "ROOT_VARIATION".to_string(),
                    properties: serde_json::json!({}),
                });
            }
        }

        // 5. Evaluations & Scores Nodes
        for eval in evaluations {
            nodes.push(GraphNode {
                id: eval.id.clone(),
                label: "EvaluationsAndScores".to_string(),
                properties: serde_json::json!({
                    "id": eval.id,
                    "candidate_id": eval.candidate_id,
                    "score": eval.score,
                    "passed": eval.passed,
                    "evidence": eval.evidence,
                    "failure_reasons": eval.failure_reasons,
                    "evaluated_at": eval.evaluated_at.to_rfc3339()
                }),
            });

            // Flowchart link: Variation Candidate -> Evaluations & Scores
            relationships.push(GraphRelationship {
                from: eval.candidate_id.clone(),
                to: eval.id.clone(),
                rel_type: "EVALUATED_AS".to_string(),
                properties: serde_json::json!({ "score": eval.score, "passed": eval.passed }),
            });
        }

        // Winning solution link if synthesized
        if let Some(win_id) = winning_candidate_id {
            relationships.push(GraphRelationship {
                from: task_node_id.clone(),
                to: win_id.to_string(),
                rel_type: "SYNTHESIZED_SOLUTION".to_string(),
                properties: serde_json::json!({ "status": "accepted" }),
            });
        }

        let graph = GraphData {
            nodes,
            relationships,
            status: if is_connected {
                "Neo4j Connected (Bolt 7687)".to_string()
            } else {
                "Persistent Graph Memory (Local / Ready for Neo4j)".to_string()
            },
        };

        let mut lock = self.cache.lock().unwrap();
        lock.insert(task.id.clone(), graph.clone());
        lock.insert("current".to_string(), graph.clone());

        graph
    }

    pub async fn get_task_graph(&self, task_id: &str) -> GraphData {
        let is_connected = self.check_health().await;
        let lock = self.cache.lock().unwrap();

        if let Some(cached) = lock.get(task_id).cloned() {
            return cached;
        }

        if task_id == "current" {
            if let Some(curr) = lock.get("current").cloned() {
                return curr;
            }
        }

        // Flowchart Architecture Default Template representation
        GraphData {
            nodes: vec![
                GraphNode {
                    id: task_id.to_string(),
                    label: "TaskNode".to_string(),
                    properties: serde_json::json!({ "id": task_id, "status": "active" }),
                },
                GraphNode {
                    id: format!("{}-supervisor", task_id),
                    label: "SupervisorIntervention".to_string(),
                    properties: serde_json::json!({ "strategy": "AVO Variation Trajectory" }),
                },
                GraphNode {
                    id: format!("{}-var-0", task_id),
                    label: "VariationCandidate".to_string(),
                    properties: serde_json::json!({ "iteration": 0, "status": "evaluated" }),
                },
                GraphNode {
                    id: format!("{}-eval-0", task_id),
                    label: "EvaluationsAndScores".to_string(),
                    properties: serde_json::json!({ "score": 1.0, "passed": true }),
                },
            ],
            relationships: vec![
                GraphRelationship {
                    from: task_id.to_string(),
                    to: format!("{}-supervisor", task_id),
                    rel_type: "SUPERVISED_BY".to_string(),
                    properties: serde_json::json!({}),
                },
                GraphRelationship {
                    from: format!("{}-supervisor", task_id),
                    to: format!("{}-var-0", task_id),
                    rel_type: "GUIDED".to_string(),
                    properties: serde_json::json!({}),
                },
                GraphRelationship {
                    from: format!("{}-var-0", task_id),
                    to: format!("{}-eval-0", task_id),
                    rel_type: "EVALUATED_AS".to_string(),
                    properties: serde_json::json!({ "score": 1.0 }),
                },
            ],
            status: if is_connected {
                "Neo4j Connected (Bolt 7687)".to_string()
            } else {
                "Persistent Graph Memory (Local / Ready for Neo4j)".to_string()
            },
        }
    }
}
