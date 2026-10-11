use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::time::Duration;
use futures_util::StreamExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelDetails {
    pub parent_model: Option<String>,
    pub format: Option<String>,
    pub family: Option<String>,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelInfo {
    pub name: String,
    pub model: Option<String>,
    pub size: Option<u64>,
    pub details: Option<OllamaModelDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaTagResponse {
    pub models: Vec<OllamaModelInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<OllamaChatMessage>,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>, // e.g. "json"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaChatChunkResponse {
    pub model: Option<String>,
    pub message: Option<OllamaChatMessage>,
    pub done: bool,
}

#[derive(Clone)]
pub struct OllamaClient {
    base_url: String,
    client: Client,
}

impl OllamaClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "http://127.0.0.1:11434".to_string());
        let client = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .unwrap_or_default();

        Self { base_url, client }
    }

    pub async fn check_health(&self) -> bool {
        let url = format!("{}/api/tags", self.base_url);
        match self.client.get(&url).timeout(Duration::from_secs(2)).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    pub async fn list_models(&self) -> Result<Vec<OllamaModelInfo>, String> {
        let url = format!("{}/api/tags", self.base_url);
        let resp = match self.client.get(&url).timeout(Duration::from_secs(3)).send().await {
            Ok(r) => r,
            Err(_) => {
                // Return empty list gracefully instead of crashing or returning an unhandled rejection
                return Ok(Vec::new());
            }
        };

        if !resp.status().is_success() {
            return Ok(Vec::new());
        }

        let body: OllamaTagResponse = resp.json().await.unwrap_or(OllamaTagResponse { models: Vec::new() });
        Ok(body.models)
    }

    pub async fn chat_complete(
        &self,
        model: &str,
        messages: Vec<OllamaChatMessage>,
        json_format: bool,
    ) -> Result<String, String> {
        let url = format!("{}/api/chat", self.base_url);
        let req = OllamaChatRequest {
            model: model.to_string(),
            messages,
            stream: false,
            format: if json_format { Some("json".to_string()) } else { None },
            options: Some(serde_json::json!({
                "temperature": 0.2,
            })),
        };

        let resp = self.client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| format!("Chat request to Ollama failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Ollama chat endpoint returned HTTP {}", resp.status()));
        }

        let body: OllamaChatChunkResponse = resp.json().await.map_err(|e| format!("Failed to parse chat response: {}", e))?;
        Ok(body.message.map(|m| m.content).unwrap_or_default())
    }

    pub async fn chat_stream<F>(
        &self,
        model: &str,
        messages: Vec<OllamaChatMessage>,
        json_format: bool,
        mut on_token: F,
    ) -> Result<String, String>
    where
        F: FnMut(String) + Send + 'static,
    {
        let url = format!("{}/api/chat", self.base_url);
        let req = OllamaChatRequest {
            model: model.to_string(),
            messages,
            stream: true,
            format: if json_format { Some("json".to_string()) } else { None },
            options: Some(serde_json::json!({
                "temperature": 0.2,
            })),
        };

        let resp = self.client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| format!("Stream request failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Ollama stream endpoint returned HTTP {}", resp.status()));
        }

        let mut stream = resp.bytes_stream();
        let mut full_text = String::new();

        while let Some(item) = stream.next().await {
            match item {
                Ok(chunk) => {
                    if let Ok(text) = std::str::from_utf8(&chunk) {
                        for line in text.lines() {
                            if line.trim().is_empty() {
                                continue;
                            }
                            if let Ok(parsed) = serde_json::from_str::<OllamaChatChunkResponse>(line) {
                                if let Some(msg) = parsed.message {
                                    if !msg.content.is_empty() {
                                        on_token(msg.content.clone());
                                        full_text.push_str(&msg.content);
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => return Err(format!("Stream read error: {}", e)),
            }
        }

        Ok(full_text)
    }
}
