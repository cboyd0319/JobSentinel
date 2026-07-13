import { describe, expect, it } from "vitest";
import {
  normalizeExternalAiRuntimeConfig,
  providerLabel,
  toGatewaySettings,
} from "./externalAiBackendTransport";

describe("externalAiBackendTransport", () => {
  it("supports older config with a single selected provider", () => {
    const config = normalizeExternalAiRuntimeConfig({
      enabled: true,
      provider: "open_ai",
      enabled_providers: [],
    });

    expect(config).toMatchObject({
      enabled: true,
      provider: "open_ai",
      require_payload_preview: true,
      redaction: { enabled: true },
    });
    expect(toGatewaySettings(config)).toMatchObject({
      enabled: true,
      provider: "open_ai",
      requirePayloadPreview: true,
      redaction: { enabled: true },
    });
  });

  it("uses the first enabled provider as the gateway provider", () => {
    const config = normalizeExternalAiRuntimeConfig({
      enabled: true,
      provider: "open_ai",
      enabled_providers: ["anthropic", "open_ai", "anthropic"],
      require_payload_preview: true,
      allow_sensitive_payloads: false,
      redaction: { enabled: true },
      log_requests_locally: false,
    });

    expect(config.provider).toBe("anthropic");
    expect(providerLabel(config.provider)).toBe("Anthropic");
    expect(toGatewaySettings(config)).toMatchObject({
      enabled: true,
      provider: "anthropic",
      requirePayloadPreview: true,
      allowSensitivePayloads: false,
      logRequestsLocally: false,
    });
  });

  it("treats unsafe review settings as disabled for sending", () => {
    const config = normalizeExternalAiRuntimeConfig({
      enabled: true,
      provider: "custom",
      enabled_providers: ["custom"],
      require_payload_preview: false,
      redaction: { enabled: false },
    });

    expect(toGatewaySettings(config)).toMatchObject({
      enabled: true,
      provider: "custom",
      requirePayloadPreview: false,
      redaction: { enabled: false },
    });
  });
});
