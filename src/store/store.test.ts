import { describe, it, expect } from "vitest";
import { useAppStore } from "./useAppStore";

describe("useAppStore", () => {
  it("initializes with default values", () => {
    const state = useAppStore.getState();
    expect(state.currentView).toBe("chat");
    expect(state.selectedModel).toBe("qwen2.5-coder:7b");
    expect(state.tasks).toEqual([]);
    expect(state.streamingOutput).toBe("");
  });

  it("updates view and selected model", () => {
    useAppStore.getState().setCurrentView("monitor");
    expect(useAppStore.getState().currentView).toBe("monitor");

    useAppStore.getState().setSelectedModel("deepseek-v3.1:671b-cloud");
    expect(useAppStore.getState().selectedModel).toBe("deepseek-v3.1:671b-cloud");
  });

  it("handles streaming token accumulation", () => {
    useAppStore.getState().clearStream();
    useAppStore.getState().appendStreamToken("Hello ");
    useAppStore.getState().appendStreamToken("NEXORA!");
    expect(useAppStore.getState().streamingOutput).toBe("Hello NEXORA!");
    useAppStore.getState().clearStream();
    expect(useAppStore.getState().streamingOutput).toBe("");
  });
});
