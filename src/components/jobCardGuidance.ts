import {
  hasLowDetailPostingReviewCue,
  hasPostingEvidenceReviewCue,
  hasScamPostingReviewCue,
} from "../utils/postingRisk";
import { hasMalformedSalaryRangeInput } from "../utils/formatUtils";

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

export function getPostingRiskGuidance(
  ghostScore: number | null | undefined,
  ghostReasons: string | null | undefined,
): PostingRiskGuidance | null {
  const hasReviewCue = hasPostingEvidenceReviewCue(ghostReasons);

  if (
    ghostScore == null ||
    !Number.isFinite(ghostScore) ||
    ghostScore < 0 ||
    ghostScore > 1
  ) {
    if (hasReviewCue) {
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

  if (hasReviewCue) {
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
  if (!hasLowDetailPostingReviewCue(title, description)) {
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
  if (!hasScamPostingReviewCue(description)) {
    return null;
  }

  return {
    title: "Possible scam sign",
    description:
      "This posting mentions money, checks, messaging apps, or sensitive details early. Verify the employer, do not pay fees, and do not share sensitive information before confirming the job.",
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

  if (hasSalaryMin && !hasSalaryMax && salaryMin < salaryFloorUsd) {
    return {
      title: "Open-ended listed pay",
      description: `Only starting pay is listed below your ${formattedFloor} floor. Confirm the realistic top range before tailoring.`,
      ariaLabel: "open-ended listed pay; confirm range before tailoring",
    };
  }

  if (
    hasSalaryMin &&
    hasSalaryMax &&
    salaryMin < salaryFloorUsd &&
    salaryMax >= salaryFloorUsd
  ) {
    return {
      title: "Starting pay below your floor",
      description: `Listed pay starts below your ${formattedFloor} floor. Confirm where your experience would land before tailoring.`,
      ariaLabel: "starting pay below your floor; confirm range before tailoring",
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
  if (hasMalformedSalaryRangeInput(salaryMin, salaryMax)) {
    return {
      title: "Check listed pay",
      description:
        "The listed pay fields could not be read as a usable range. Open the posting and confirm the written range before tailoring.",
      ariaLabel: "listed pay to check",
    };
  }

  if (
    salaryMin != null &&
    Number.isFinite(salaryMin) &&
    salaryMin > 0 &&
    (salaryMax == null || !Number.isFinite(salaryMax) || salaryMax <= 0)
  ) {
    return {
      title: "Open-ended listed pay",
      description:
        "Only starting pay is listed. Confirm the realistic top range before tailoring.",
      ariaLabel: "open-ended listed pay",
    };
  }

  if (
    (salaryMin == null || !Number.isFinite(salaryMin) || salaryMin <= 0) &&
    salaryMax != null &&
    Number.isFinite(salaryMax) &&
    salaryMax > 0
  ) {
    return {
      title: "Top-only listed pay",
      description:
        "Only top pay is listed. Confirm the starting pay before tailoring.",
      ariaLabel: "top-only listed pay",
    };
  }

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
