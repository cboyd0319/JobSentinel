export interface PostingRiskGuidance {
  level: "low" | "medium" | "high";
  title: string;
  description: string;
  ariaLabel: string;
  nextSteps?: string[];
  actionLabel?: string;
  actionAriaLabel?: string;
}

export interface PayFloorGuidance {
  title: string;
  description: string;
  ariaLabel: string;
}

export interface SalaryRangeQualityGuidance {
  title: string;
  description: string;
  ariaLabel: string;
}

export interface ScamRiskGuidance {
  title: string;
  description: string;
  ariaLabel: string;
}

interface PostingRiskReason {
  category: "stale" | "repost" | "generic" | "missing_details" | "unrealistic" | "company_behavior";
  description: string;
  weight: number;
  severity: "low" | "medium" | "high";
}

const SCAM_SIGNAL_PATTERNS = [
  /\b(?:cashier'?s\s+check|fake\s+check|deposit\s+(?:the\s+)?check|mobile\s+deposit)\b/i,
  /\b(?:pay|send|wire|transfer)\b.{0,50}\b(?:money|fee|deposit|gift\s+cards?|funds)\b/i,
  /\b(?:buy|purchase|get|send)\b.{0,40}\b(?:gift\s+cards?|prepaid\s+cards?|money\s+orders?)\b/i,
  /\b(?:upfront|application|training|equipment)\b.{0,30}\b(?:fee|payment)\b/i,
  /\b(?:social\s+security\s+number|ssn|bank\s+account|driver'?s\s+license)\b.{0,80}\b(?:before|interview|start|offer)\b/i,
] as const;

const LOW_DETAIL_TITLE_PATTERNS = [
  /^\s*(?:various|multiple)\s+(?:positions|roles|openings)\s*$/i,
  /^\s*(?:general|open)\s+(?:application|position|role|opening)\s*$/i,
  /^\s*(?:now hiring|hiring now|join our team)\s*$/i,
] as const;

const THIN_DESCRIPTION_PATTERN = /\b(?:apply|hiring|opportunity|position|role|team)\b/i;
const MIN_THIN_DESCRIPTION_LENGTH = 45;

const reviewCueReasonCategories = new Set<PostingRiskReason["category"]>([
  "stale",
  "repost",
]);

function parsePostingRiskReasons(reasonsJson: string | null | undefined): PostingRiskReason[] {
  if (!reasonsJson) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(reasonsJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is PostingRiskReason => {
      if (!value || typeof value !== "object") {
        return false;
      }

      const reason = value as Record<string, unknown>;

      return (
        typeof reason.category === "string" &&
        reviewCueReasonCategories.has(reason.category as PostingRiskReason["category"]) &&
        typeof reason.description === "string" &&
        typeof reason.weight === "number" &&
        Number.isFinite(reason.weight) &&
        typeof reason.severity === "string" &&
        ["low", "medium", "high"].includes(reason.severity)
      );
    });
  } catch {
    return [];
  }
}

export function getPostingRiskGuidance(
  ghostScore: number | null | undefined,
  ghostReasons: string | null | undefined,
): PostingRiskGuidance | null {
  const reviewReasons = parsePostingRiskReasons(ghostReasons);

  if (
    ghostScore == null ||
    !Number.isFinite(ghostScore) ||
    ghostScore < 0 ||
    ghostScore > 1
  ) {
    if (reviewReasons.length > 0) {
      return {
        level: "low",
        title: "Check posting evidence",
        description:
          "This posting has stale or repost evidence. Open the original job page before spending tailoring time.",
        ariaLabel: "posting evidence to check",
      };
    }

    return null;
  }

  if (ghostScore >= 0.75) {
    return {
      level: "high",
      title: "Verify before tailoring",
      description:
        "This posting has strong stale, repost, or low-detail signals. Open the original job page before spending serious time.",
      ariaLabel: "verify before tailoring",
      nextSteps: [
        "Check that the original posting is still active.",
        "Tailor only after the employer or hiring page still shows the role.",
      ],
      actionLabel: "Open Original Posting",
      actionAriaLabel: "Open original posting before tailoring",
    };
  }

  if (ghostScore >= 0.6) {
    return {
      level: "medium",
      title: "Review before tailoring",
      description:
        "This posting has multiple warning signs. A quick original-posting check can protect your time.",
      ariaLabel: "review before tailoring",
    };
  }

  if (reviewReasons.length > 0) {
    return {
      level: "low",
      title: "Check posting evidence",
      description:
        "This posting has stale or repost evidence. Open the original job page before spending tailoring time.",
      ariaLabel: "posting evidence to check",
    };
  }

  return null;
}

export function getLowDetailPostingGuidance(
  title: string,
  description: string | null | undefined,
): PostingRiskGuidance | null {
  const trimmedTitle = title.trim();
  const trimmedDescription = description?.trim() ?? "";
  const hasBroadTitle = LOW_DETAIL_TITLE_PATTERNS.some((pattern) =>
    pattern.test(trimmedTitle)
  );
  const hasMissingDescription = trimmedDescription.length === 0;
  const hasThinDescription =
    trimmedDescription.length > 0 &&
    trimmedDescription.length < MIN_THIN_DESCRIPTION_LENGTH &&
    THIN_DESCRIPTION_PATTERN.test(trimmedDescription);

  if (!hasBroadTitle && !hasMissingDescription && !hasThinDescription) {
    return null;
  }

  return {
    level: "low",
    title: "Check role details",
    description:
      "This posting has a very broad title or thin description. Confirm the role, team, and work details before tailoring.",
    ariaLabel: "role details to check",
  };
}

export function getScamRiskGuidance(description: string | null | undefined): ScamRiskGuidance | null {
  const text = description?.trim();
  if (!text) return null;

  if (!SCAM_SIGNAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return null;
  }

  return {
    title: "Possible scam sign",
    description:
      "This posting mentions money, checks, or sensitive details early. Verify the employer, do not pay fees, and do not share sensitive information before confirming the job.",
    ariaLabel: "possible scam sign",
  };
}

function formatPayFloor(salaryFloorUsd: number) {
  return `$${salaryFloorUsd.toLocaleString()}/year`;
}

function hasListedSalaryValue(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function getPayFloorGuidance(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
  salaryFloorUsd: number | null | undefined,
): PayFloorGuidance | null {
  if (
    salaryFloorUsd == null ||
    !Number.isFinite(salaryFloorUsd) ||
    salaryFloorUsd <= 0
  ) {
    return null;
  }

  const formattedFloor = formatPayFloor(salaryFloorUsd);
  const hasSalaryMin = hasListedSalaryValue(salaryMin);
  const hasSalaryMax = hasListedSalaryValue(salaryMax);
  const hasReversedSalaryRange =
    hasSalaryMin && hasSalaryMax && salaryMax < salaryMin;

  if ((!hasSalaryMin && !hasSalaryMax) || hasReversedSalaryRange) {
    return {
      title: "Pay not listed",
      description: `No pay range is listed. Compare this role with your ${formattedFloor} floor before tailoring.`,
      ariaLabel: "pay not listed; compare before tailoring",
    };
  }

  if (!hasSalaryMax || salaryMax >= salaryFloorUsd) {
    return null;
  }

  return {
    title: "Below the lowest pay you want",
    description: `Listed pay tops out below ${formattedFloor}. Verify before tailoring.`,
    ariaLabel: "below the lowest pay you want",
  };
}

export function getSalaryRangeQualityGuidance(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
): SalaryRangeQualityGuidance | null {
  if (
    salaryMin == null ||
    salaryMax == null ||
    !Number.isFinite(salaryMin) ||
    !Number.isFinite(salaryMax) ||
    salaryMin <= 0 ||
    salaryMax <= salaryMin
  ) {
    return null;
  }

  const rangeWidth = salaryMax - salaryMin;
  const rangeRatio = salaryMax / salaryMin;

  if (rangeWidth < 50000 || rangeRatio < 1.75) {
    return null;
  }

  return {
    title: "Very wide pay range",
    description:
      "This range may cover different levels or schedules. Check the written level, schedule, and realistic pay before tailoring.",
    ariaLabel: "very wide pay range",
  };
}
