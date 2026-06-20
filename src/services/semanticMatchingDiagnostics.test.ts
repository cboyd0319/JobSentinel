import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  getSemanticMatchingDiagnostics,
  normalizeSemanticMatchingDiagnostics,
} from "./semanticMatchingDiagnostics";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

function diagnosticPayload() {
  return {
    build_enabled: true,
    runtime_status: "needs_model_download",
    active_profile: "Qwen3 embedding plus Qwen3 reranker",
    privacy_mode: "Local only",
    manifest_hash: "a".repeat(64),
    models: [
      {
        id: "qwen3-embedding-0.6b",
        role: "Default embedding",
        repo: "Qwen/Qwen3-Embedding-0.6B",
        revision: "97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3",
        backend: "qwen3-candle",
        license: "Apache-2.0",
        dimension: 768,
        max_tokens: 32768,
        required_files: 3,
        required_files_present: 2,
        locked_size_bytes: 123456,
        downloaded: false,
        required_for_qwen3_runtime: true,
      },
    ],
    scoring_signals: [
      {
        id: "exact_skills",
        label: "Exact skills",
        state: "Always on",
        explanation: "Matches visible skills.",
      },
    ],
    eval_contract: ["Direct evidence must outrank keyword-only near misses."],
    user_action: "Download the pinned local models.",
  };
}

describe("semantic matching diagnostics service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads diagnostics through the Tauri command", async () => {
    mockInvoke.mockResolvedValueOnce(diagnosticPayload());

    const diagnostics = await getSemanticMatchingDiagnostics();

    expect(mockInvoke).toHaveBeenCalledWith("get_semantic_matching_diagnostics");
    expect(diagnostics.runtime_status).toBe("needs_model_download");
    expect(diagnostics.models[0].id).toBe("qwen3-embedding-0.6b");
    expect(diagnostics.models[0].dimension).toBe(768);
  });

  it("rejects an unknown status", () => {
    expect(() =>
      normalizeSemanticMatchingDiagnostics({
        ...diagnosticPayload(),
        runtime_status: "surprise",
      }),
    ).toThrow("unknown status");
  });
});
