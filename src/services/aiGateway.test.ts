import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_EXTERNAL_AI_SETTINGS,
  ExternalAiGatewayError,
  type ExternalAiRequest,
  createExternalAiGateway,
} from "./aiGateway";

const publicJobSummaryRequest: ExternalAiRequest = {
  feature: "job-description-summary",
  labels: ["External AI optional", "Public-data only"],
  dataCategories: ["job_posting", "public_metadata"],
  payload: {
    title: "Operations Manager",
    company: "Example Co",
    description: "Lead scheduling and vendor coordination.",
    sourceUrl: "https://jobs.example.test/operations-manager",
  },
  redactedPayload: {
    title: "Operations Manager",
    company: "Example Co",
    description: "Lead scheduling and vendor coordination.",
    sourceUrl: "https://jobs.example.test/operations-manager",
  },
  previewShown: true,
  userApproved: true,
};

function enabledSettings(overrides = {}) {
  return {
    ...DEFAULT_EXTERNAL_AI_SETTINGS,
    enabled: true,
    provider: "openai" as const,
    ...overrides,
  };
}

describe("aiGateway", () => {
  it("keeps external AI disabled by default", () => {
    expect(DEFAULT_EXTERNAL_AI_SETTINGS).toMatchObject({
      enabled: false,
      provider: "none",
      requirePayloadPreview: true,
      allowSensitivePayloads: false,
      redaction: {
        enabled: true,
      },
      logRequestsLocally: true,
    });
  });

  it("blocks external AI calls without opt-in", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "summary" }),
    };
    const gateway = createExternalAiGateway(
      DEFAULT_EXTERNAL_AI_SETTINGS,
      transport,
    );

    await expect(gateway.send(publicJobSummaryRequest)).rejects.toMatchObject({
      code: "external_ai_disabled",
      message: "Outside AI is off. Turn it on only after reviewing what will be sent.",
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("requires payload preview before sending", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "summary" }),
    };
    const gateway = createExternalAiGateway(enabledSettings(), transport);

    await expect(
      gateway.send({
        ...publicJobSummaryRequest,
        previewShown: false,
      }),
    ).rejects.toMatchObject({
      code: "payload_preview_required",
      message: "Review the details that would be sent before continuing.",
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("uses plain setup wording when no transport is provided", async () => {
    const gateway = createExternalAiGateway(enabledSettings());

    await expect(gateway.send(publicJobSummaryRequest)).rejects.toMatchObject({
      code: "transport_missing",
      message: "Outside AI sending is not set up.",
    });
  });

  it("rejects sensitive data by default", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "fit explanation" }),
    };
    const gateway = createExternalAiGateway(enabledSettings(), transport);

    await expect(
      gateway.send({
        ...publicJobSummaryRequest,
        feature: "resume-job-fit",
        labels: ["External AI optional", "Sensitive"],
        dataCategories: ["job_posting", "resume", "salary_floor"],
        payload: {
          title: "Operations Manager",
          resumeText: "Private resume text",
          salaryFloor: 90000,
        },
      }),
    ).rejects.toMatchObject({
      code: "sensitive_payload_blocked",
      message:
        "Private details stay local unless you choose exactly what to send and turn on sharing for private details.",
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("blocks full database payload categories", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "analysis" }),
    };
    const gateway = createExternalAiGateway(
      enabledSettings({ allowSensitivePayloads: true }),
      transport,
    );

    await expect(
      gateway.send({
        ...publicJobSummaryRequest,
        labels: ["External AI optional", "Sensitive"],
        dataCategories: ["full_database"],
        explicitlyIncludedSensitiveData: true,
      }),
    ).rejects.toMatchObject({
      code: "full_database_blocked",
      message: "JobSentinel will not send all saved job data to outside AI.",
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("keeps public-data-only job summaries free of unrelated user data", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "summary" }),
    };
    const gateway = createExternalAiGateway(enabledSettings(), transport);

    await expect(
      gateway.send({
        ...publicJobSummaryRequest,
        payload: {
          ...publicJobSummaryRequest.payload,
          privateNotes: "Do not send this note",
        },
        redactedPayload: {
          ...publicJobSummaryRequest.redactedPayload,
          privateNotes: "Do not send this note",
        },
      }),
    ).rejects.toMatchObject({
      code: "public_data_only_violation",
      message: "JobSentinel can send only public job-posting details here.",
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("sends minimized public payloads and logs local metadata", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "summary" }),
    };
    const logRequest = vi.fn();
    const gateway = createExternalAiGateway(
      enabledSettings(),
      transport,
      logRequest,
    );

    await expect(gateway.send(publicJobSummaryRequest)).resolves.toEqual({
      text: "summary",
    });

    expect(transport.send).toHaveBeenCalledWith({
      feature: "job-description-summary",
      provider: "openai",
      labels: ["External AI optional", "Public-data only"],
      dataCategories: ["job_posting", "public_metadata"],
      payload: publicJobSummaryRequest.payload,
    });
    expect(logRequest).toHaveBeenCalledWith({
      feature: "job-description-summary",
      provider: "openai",
      timestamp: expect.any(String),
      labels: ["External AI optional", "Public-data only"],
      dataCategories: ["job_posting", "public_metadata"],
    });
  });

  it("requires a reviewed redacted payload when redaction is enabled", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "summary" }),
    };
    const requestWithoutRedaction = { ...publicJobSummaryRequest };
    delete requestWithoutRedaction.redactedPayload;
    const gateway = createExternalAiGateway(enabledSettings(), transport);

    await expect(gateway.send(requestWithoutRedaction)).rejects.toMatchObject({
      code: "redacted_payload_required",
      message: "Review the details that would be sent before using outside AI.",
    });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("sends the reviewed redacted payload instead of the raw payload", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "summary" }),
    };
    const gateway = createExternalAiGateway(enabledSettings(), transport);

    await gateway.send({
      ...publicJobSummaryRequest,
      payload: {
        ...publicJobSummaryRequest.payload,
        description: "Lead scheduling. Private draft note removed before sending.",
      },
      redactedPayload: {
        ...publicJobSummaryRequest.payload,
        description: "Lead scheduling.",
      },
    });

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          ...publicJobSummaryRequest.payload,
          description: "Lead scheduling.",
        },
      }),
    );
    expect(transport.send).not.toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          description: expect.stringContaining("Private draft note"),
        }),
      }),
    );
  });

  it("uses plain wording when outside AI details are not reviewed by the gateway", async () => {
    const transport = {
      send: vi.fn().mockResolvedValue({ text: "summary" }),
    };
    const gateway = createExternalAiGateway(enabledSettings(), transport);

    const requestWithUnreviewedDetails = {
      ...publicJobSummaryRequest,
      payload: {
        ...publicJobSummaryRequest.payload,
        unreviewedCandidatePacket: ["private answer"],
      },
      redactedPayload: {
        ...publicJobSummaryRequest.redactedPayload,
        unreviewedCandidatePacket: ["private answer"],
      },
    };
    const error = await gateway
      .send(requestWithUnreviewedDetails)
      .catch((err: unknown) => err);

    expect(error).toMatchObject({
      code: "unclassified_payload_key",
      message: "Outside AI details include something JobSentinel has not reviewed for sharing.",
    });
    expect((error as Error).message).not.toMatch(/payload|field|classified/i);
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("exposes typed gateway errors for UI cancel and redaction flows", () => {
    const error = new ExternalAiGatewayError(
      "user_approval_required",
      "Approval missing",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("user_approval_required");
  });
});
