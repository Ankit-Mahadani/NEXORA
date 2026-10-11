import { describe, it, expect } from "vitest";
import { useAppStore } from "./useAppStore";

describe("useAppStore", () => {
  it("initializes with default values", () => {
    const state = useAppStore.getState();
    expect(state.currentView).toBe("chat");
    expect(state.selectedModel).toBe("qwen2.5-coder:7b");
    expect(state.tasks).toEqual([]);
    expect(state.streamingOutput).toBe("");
    expect(state.theme).toBe("light");
  });

  it("updates view and selected model and persists model", () => {
    useAppStore.getState().setCurrentView("monitor");
    expect(useAppStore.getState().currentView).toBe("monitor");

    useAppStore.getState().setSelectedModel("deepseek-v3.1:671b-cloud");
    expect(useAppStore.getState().selectedModel).toBe("deepseek-v3.1:671b-cloud");
    expect(localStorage.getItem("nexora_selected_model")).toBe("deepseek-v3.1:671b-cloud");
  });

  it("changes theme and persists to localStorage with white as default", () => {
    expect(useAppStore.getState().theme).toBe("light");

    useAppStore.getState().setTheme("dark");
    expect(useAppStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("nexora_theme")).toBe("dark");

    useAppStore.getState().setTheme("light");
    expect(useAppStore.getState().theme).toBe("light");
    expect(localStorage.getItem("nexora_theme")).toBe("light");
  });

  it("handles streaming token accumulation", () => {
    useAppStore.getState().clearStream();
    useAppStore.getState().appendStreamToken("Hello ");
    useAppStore.getState().appendStreamToken("NEXORA!");
    expect(useAppStore.getState().streamingOutput).toBe("Hello NEXORA!");
    useAppStore.getState().clearStream();
    expect(useAppStore.getState().streamingOutput).toBe("");
  });

  it("clears streamingOutput when switching sessions or creating a new chat", () => {
    useAppStore.getState().appendStreamToken("Old stream text");
    expect(useAppStore.getState().streamingOutput).toBe("Old stream text");

    useAppStore.getState().setCurrentSessionId("session-new-123");
    expect(useAppStore.getState().streamingOutput).toBe("");
  });
});
