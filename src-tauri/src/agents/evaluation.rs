use chrono::Utc;
use crate::models::{EvaluationResult, DiagnosticResult, ToolExecutionResult};
use crate::ollama::{OllamaClient, OllamaChatMessage};

pub struct EvaluationAgent {
    ollama: OllamaClient,
}

impl EvaluationAgent {
    pub fn new(ollama: OllamaClient) -> Self {
        Self { ollama }
    }

    pub async fn evaluate(
        &self,
        model: &str,
        task_id: &str,
        objective: &str,
        criteria: &str,
        observations: &[ToolExecutionResult],
    ) -> EvaluationResult {
        let any_failed = observations.iter().any(|o| !o.success);
        let all_empty = observations.is_empty();

        let obs_summary = observations.iter().map(|o| {
            format!("Tool {}: success={}, stdout_len={}, stderr={}", o.tool_name, o.success, o.stdout.len(), o.stderr)
        }).collect::<Vec<_>>().join("\n");

        let system_prompt = r#"You are the Evaluation Agent in NEXORA.
Evaluate whether the executions meet the verification criteria.
Respond ONLY with a JSON object:
{
  "score": 0.0 to 1.0,
  "passed": true|false,
  "evidence": ["point 1", "point 2"],
  "failure_reasons": ["reason if any"],
  "recommended_action": "complete|retry_with_diagnosis|replan"
}"#;

        let user_content = format!(
            "Objective: {}\nCriteria: {}\nObservations:\n{}",
            objective, criteria, obs_summary
        );

        let messages = vec![
            OllamaChatMessage { role: "system".into(), content: system_prompt.into() },
            OllamaChatMessage { role: "user".into(), content: user_content },
        ];

        let default_eval = EvaluationResult {
            id: uuid::Uuid::new_v4().to_string(),
            task_id: task_id.to_string(),
            candidate_id: uuid::Uuid::new_v4().to_string(),
            score: if !any_failed && !all_empty { 1.0 } else { 0.5 },
            passed: !any_failed && !all_empty,
            evidence: vec![format!("{} tool executions recorded", observations.len())],
            failure_reasons: if any_failed { vec!["One or more tool calls reported errors".into()] } else { vec![] },
            recommended_action: if !any_failed && !all_empty { "complete".into() } else { "retry_with_diagnosis".into() },
            evaluated_at: Utc::now(),
        };

        if let Ok(res) = self.ollama.chat_complete(model, messages, true).await {
            if let Some(val) = crate::agents::extract_json(&res) {
                let score = val["score"].as_f64().unwrap_or(0.5) as f32;
                let passed = val["passed"].as_bool().unwrap_or(!any_failed);
                let evidence = val["evidence"].as_array()
                    .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_else(|| vec!["LLM evaluated observable outputs".into()]);
                let failure_reasons = val["failure_reasons"].as_array()
                    .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default();
                let recommended_action = val["recommended_action"].as_str().unwrap_or("complete").to_string();

                return EvaluationResult {
                    id: uuid::Uuid::new_v4().to_string(),
                    task_id: task_id.to_string(),
                    candidate_id: uuid::Uuid::new_v4().to_string(),
                    score,
                    passed,
                    evidence,
                    failure_reasons,
                    recommended_action,
                    evaluated_at: Utc::now(),
                };
            }
        }

        default_eval
    }
}

pub struct DiagnosticAgent {
    ollama: OllamaClient,
}

impl DiagnosticAgent {
    pub fn new(ollama: OllamaClient) -> Self {
        Self { ollama }
    }

    pub async fn diagnose(
        &self,
        model: &str,
        task_id: &str,
        objective: &str,
        eval: &EvaluationResult,
        observations: &[ToolExecutionResult],
    ) -> DiagnosticResult {
        let failures = eval.failure_reasons.join(", ");
        let stderr_trace = observations.iter()
            .filter(|o| !o.stderr.is_empty())
            .map(|o| format!("{}: {}", o.tool_name, o.stderr))
            .collect::<Vec<_>>()
            .join("\n");

        let system_prompt = r#"You are the Diagnostic Agent in NEXORA.
Analyze failures and propose a minimal targeted repair.
Respond ONLY with JSON:
{
  "root_cause": "description of root cause",
  "is_transient": true|false,
  "suggested_repair": "exact code or command fix",
  "replan_recommended": true|false
}"#;

        let user_content = format!(
            "Objective: {}\nEvaluation Failures: {}\nErrors:\n{}",
            objective, failures, stderr_trace
        );

        let messages = vec![
            OllamaChatMessage { role: "system".into(), content: system_prompt.into() },
            OllamaChatMessage { role: "user".into(), content: user_content },
        ];

        let default_diag = DiagnosticResult {
            id: uuid::Uuid::new_v4().to_string(),
            task_id: task_id.to_string(),
            root_cause: if failures.is_empty() { "Execution did not satisfy criteria".into() } else { failures },
            is_transient: false,
            suggested_repair: "Revise tool parameters or file modifications to satisfy requirements".into(),
            replan_recommended: false,
        };

        if let Ok(res) = self.ollama.chat_complete(model, messages, true).await {
            if let Some(val) = crate::agents::extract_json(&res) {
                return DiagnosticResult {
                    id: uuid::Uuid::new_v4().to_string(),
                    task_id: task_id.to_string(),
                    root_cause: val["root_cause"].as_str().unwrap_or("Failure diagnosed").into(),
                    is_transient: val["is_transient"].as_bool().unwrap_or(false),
                    suggested_repair: val["suggested_repair"].as_str().unwrap_or("Apply patch").into(),
                    replan_recommended: val["replan_recommended"].as_bool().unwrap_or(false),
                };
            }
        }

        default_diag
    }
}
