import {
  findUnclassifiedPayloadKey,
  hasSensitiveData,
  hasSensitivePayloadKeys,
} from "./aiGatewayPayloadPolicy";
import { hasPromptLikeExternalAiContent } from "./aiGatewayPromptInspection";
import {
  ExternalAiGatewayError,
  type ExternalAiProvider,
  type ExternalAiRequest,
  type ExternalAiSettings,
  type ExternalAiTransport,
} from "./aiGatewayTypes";

function getOutgoingPayload(
  settings: ExternalAiSettings,
  request: ExternalAiRequest,
): Record<string, unknown> {
  if (!settings.redaction.enabled) {
    return request.payload;
  }

  if (!request.redactedPayload) {
    throw new ExternalAiGatewayError(
      "redacted_payload_required",
      "Review the details that would be sent before using outside AI.",
    );
  }

  return request.redactedPayload;
}

export function validateExternalAiRequest(
  settings: ExternalAiSettings,
  provider: ExternalAiProvider,
  request: ExternalAiRequest,
  transport?: ExternalAiTransport,
): Record<string, unknown> {
  if (!settings.enabled) {
    throw new ExternalAiGatewayError(
      "external_ai_disabled",
      "Outside AI is off. Turn it on only after reviewing what will be sent.",
    );
  }

  if (provider === "none") {
    throw new ExternalAiGatewayError(
      "provider_not_selected",
      "Choose the outside AI service before sending anything.",
    );
  }

  if (!transport) {
    throw new ExternalAiGatewayError(
      "transport_missing",
      "Outside AI sending is not set up.",
    );
  }

  if (settings.requirePayloadPreview && !request.previewShown) {
    throw new ExternalAiGatewayError(
      "payload_preview_required",
      "Review the details that would be sent before continuing.",
    );
  }

  if (!request.userApproved) {
    throw new ExternalAiGatewayError(
      "user_approval_required",
      "Approve sending these details before continuing.",
    );
  }

  if (request.dataCategories.includes("full_database")) {
    throw new ExternalAiGatewayError(
      "full_database_blocked",
      "JobSentinel will not send all saved job data to outside AI.",
    );
  }

  const outgoingPayload = getOutgoingPayload(settings, request);
  const unclassifiedRawKey = findUnclassifiedPayloadKey(request.payload);
  const unclassifiedOutgoingKey = findUnclassifiedPayloadKey(outgoingPayload);
  const unclassifiedKey = unclassifiedRawKey ?? unclassifiedOutgoingKey;

  if (unclassifiedKey) {
    throw new ExternalAiGatewayError(
      "unclassified_payload_key",
      "Outside AI details include something JobSentinel has not reviewed for sharing.",
    );
  }

  if (hasPromptLikeExternalAiContent(outgoingPayload)) {
    throw new ExternalAiGatewayError(
      "external_ai_prompt_injection_blocked",
      "Details selected for outside AI include instructions aimed at AI tools. Keep this review local or remove those instructions before sending.",
    );
  }

  if (request.labels.includes("Public-data only") && hasSensitivePayloadKeys(outgoingPayload)) {
    throw new ExternalAiGatewayError(
      "public_data_only_violation",
      "JobSentinel can send only public job-posting details here.",
    );
  }

  if (
    hasSensitiveData(request, outgoingPayload) &&
    (!settings.allowSensitivePayloads || !request.explicitlyIncludedSensitiveData)
  ) {
    throw new ExternalAiGatewayError(
      "sensitive_payload_blocked",
      "Private details stay local unless you choose exactly what to send and turn on sharing for private details.",
    );
  }

  return outgoingPayload;
}
