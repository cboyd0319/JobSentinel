import * as screeningTaxonomy from "../../shared/applicationScreeningTaxonomy";

export interface Job {
  id: number;
  hash: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  score?: number;
}

export interface ApplicationProfilePreview {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
}

export interface ScreeningAnswerPreview {
  questionPattern: string;
  answer: string;
}

export interface ApplicationPreviewProps {
  job: Job;
  atsPlatform: string | null;
}

interface HardQuestionDetailContext {
  profile: ApplicationProfilePreview;
  screeningAnswers: ScreeningAnswerPreview[];
}

interface HardQuestionReview {
  label: string;
  detail: string;
  patterns: readonly RegExp[];
  getDetail?: (context: HardQuestionDetailContext) => string;
}

const {
  AVAILABILITY_SCREENING_PATTERNS,
  BACKGROUND_SCREENING_PATTERNS,
  CITIZENSHIP_SCREENING_PATTERNS,
  CREDENTIAL_SCREENING_PATTERNS,
  DRIVING_RECORD_OR_INSURANCE_PATTERNS,
  EDUCATION_SCREENING_PATTERNS,
  EXPERIENCE_ANSWER_SCREENING_PATTERNS,
  EXPERIENCE_REQUIREMENT_PATTERNS,
  LANGUAGE_SCREENING_PATTERNS,
  LOCATION_SCREENING_PATTERNS,
  MANAGEMENT_EXPERIENCE_PATTERNS,
  MINIMUM_AGE_PATTERNS,
  PHYSICAL_REQUIREMENT_PATTERNS,
  SALARY_EXPECTATION_PATTERNS,
  SALARY_HISTORY_PATTERNS,
  SAVED_SALARY_ANSWER_PATTERNS,
  SCREENING_ANSWER_LABEL_RULES,
  TRANSPORTATION_SCREENING_PATTERNS,
  WORK_AUTHORIZATION_PATTERNS,
} = screeningTaxonomy;

const HARD_QUESTION_REVIEWS: HardQuestionReview[] = [
  {
    label: "Citizenship requirement",
    detail: "Check citizenship requirements before answering. Do not treat work authorization as citizenship.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      CITIZENSHIP_SCREENING_PATTERNS,
      "Check citizenship requirements before answering. Do not treat work authorization as citizenship.",
      "Confirm it matches the employer's wording before continuing.",
    ),
    patterns: CITIZENSHIP_SCREENING_PATTERNS,
  },
  {
    label: "Work authorization",
    detail: "Check work authorization or sponsorship answers against your profile and resume.",
    getDetail: getWorkAuthorizationReviewDetail,
    patterns: WORK_AUTHORIZATION_PATTERNS,
  },
  {
    label: "Location, relocation, or travel",
    detail: "Confirm location, commute, relocation, remote, hybrid, travel, and shift constraints.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      LOCATION_SCREENING_PATTERNS,
      "Confirm location, commute, relocation, remote, hybrid, travel, and shift constraints.",
    ),
    patterns: LOCATION_SCREENING_PATTERNS,
  },
  {
    label: "Transportation requirement",
    detail: "Confirm transportation or vehicle requirements before answering. Use only commute, license, or vehicle details that are true.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      TRANSPORTATION_SCREENING_PATTERNS,
      "Confirm transportation or vehicle requirements before answering. Use only commute, license, or vehicle details that are true.",
    ),
    patterns: TRANSPORTATION_SCREENING_PATTERNS,
  },
  {
    label: "Driving record, vehicle, or insurance",
    detail: "Confirm driving record, vehicle, or auto insurance requirements before answering. If it is not current, workable, or true for you, do not claim it.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      DRIVING_RECORD_OR_INSURANCE_PATTERNS,
      "Confirm driving record, vehicle, or auto insurance requirements before answering. If it is not current, workable, or true for you, do not claim it.",
    ),
    patterns: DRIVING_RECORD_OR_INSURANCE_PATTERNS,
  },
  {
    label: "License, certification, or clearance",
    detail: "Use only credentials, licenses, certifications, or clearances you can document.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      CREDENTIAL_SCREENING_PATTERNS,
      "Use only credentials, licenses, certifications, or clearances you can document.",
    ),
    patterns: CREDENTIAL_SCREENING_PATTERNS,
  },
  {
    label: "Background check or drug screen",
    detail: "Confirm background-check, drug-screen, or pre-employment screening requirements before continuing.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      BACKGROUND_SCREENING_PATTERNS,
      "Confirm background-check, drug-screen, or pre-employment screening requirements before continuing.",
    ),
    patterns: BACKGROUND_SCREENING_PATTERNS,
  },
  {
    label: "Language fluency",
    detail: "Check language fluency before answering. Use only languages you can truthfully use for the work.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      LANGUAGE_SCREENING_PATTERNS,
      "Check language fluency before answering. Use only languages you can truthfully use for the work.",
    ),
    patterns: LANGUAGE_SCREENING_PATTERNS,
  },
  {
    label: "Physical requirement",
    detail: "Check physical requirements before answering. If it is not workable or safe for you, do not claim it.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      PHYSICAL_REQUIREMENT_PATTERNS,
      "Check physical requirements before answering. If it is not workable or safe for you, do not claim it.",
    ),
    patterns: PHYSICAL_REQUIREMENT_PATTERNS,
  },
  {
    label: "Age requirement",
    detail: "Check minimum-age or legal work-age requirements before answering. Use only truthful answers.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      MINIMUM_AGE_PATTERNS,
      "Check minimum-age or legal work-age requirements before answering. Use only truthful answers.",
      "Confirm it matches the employer's wording before continuing.",
    ),
    patterns: MINIMUM_AGE_PATTERNS,
  },
  {
    label: "Education or degree",
    detail: "Check degree, diploma, or education-equivalent answers against visible evidence.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      EDUCATION_SCREENING_PATTERNS,
      "Check degree, diploma, or education-equivalent answers against visible evidence.",
    ),
    patterns: EDUCATION_SCREENING_PATTERNS,
  },
  {
    label: "Years of experience",
    detail: "Make years, level, and seniority answers match the experience you can explain.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      EXPERIENCE_ANSWER_SCREENING_PATTERNS,
      "Make years, level, and seniority answers match the experience you can explain.",
    ),
    patterns: EXPERIENCE_REQUIREMENT_PATTERNS,
  },
  {
    label: "Management experience",
    detail: "Check management, supervision, or lead-experience answers before submission.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      MANAGEMENT_EXPERIENCE_PATTERNS,
      "Check management, supervision, or lead-experience answers before submission.",
    ),
    patterns: MANAGEMENT_EXPERIENCE_PATTERNS,
  },
  {
    label: "Current or past pay",
    detail: "Review current-pay or salary-history questions carefully. Consider using the role range and your target pay; do not invent or reveal past pay unless you choose to.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      SALARY_HISTORY_PATTERNS,
      "Review current-pay or salary-history questions carefully. Consider using the role range and your target pay; do not invent or reveal past pay unless you choose to.",
      "Confirm it answers the exact question with role range or target pay, not unsupported past pay.",
    ),
    patterns: SALARY_HISTORY_PATTERNS,
  },
  {
    label: "Salary or availability",
    detail: "Review salary, start-date, schedule, and availability answers before submission.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      [
        ...SAVED_SALARY_ANSWER_PATTERNS,
        ...AVAILABILITY_SCREENING_PATTERNS,
      ],
      "Review salary, start-date, schedule, and availability answers before submission.",
    ),
    patterns: [
      ...SALARY_EXPECTATION_PATTERNS,
      ...AVAILABILITY_SCREENING_PATTERNS,
    ],
  },
];

function getWorkAuthorizationReviewDetail({ profile }: HardQuestionDetailContext) {
  if (profile.requiresSponsorship) {
    return "Saved profile says sponsorship is needed. Check the employer's sponsorship question and resume evidence before continuing.";
  }

  if (!profile.usWorkAuthorized) {
    return "Saved profile says US work authorization is not confirmed. Check the employer's authorization question and resume evidence before continuing.";
  }

  return "Saved profile says US work authorization is available and sponsorship is not needed. Confirm the application asks the same thing before submitting.";
}

function getSavedScreeningAnswerLabel(questionPattern: string) {
  for (const { label, patterns } of SCREENING_ANSWER_LABEL_RULES) {
    if (patterns.some((pattern) => pattern.test(questionPattern))) return label;
  }

  return "screening";
}

function getSavedAnswerSnippet(answer: string) {
  const compactAnswer = answer.trim().replace(/\s+/g, " ");
  const maxLength = 140;

  if (compactAnswer.length <= maxLength) return compactAnswer;

  return `${compactAnswer.slice(0, maxLength - 3).trimEnd()}...`;
}

function getSavedScreeningAnswerReviewDetail(
  screeningAnswers: ScreeningAnswerPreview[],
  answerPatterns: readonly RegExp[],
  fallbackDetail: string,
  confirmationDetail = "Confirm it matches the employer's wording and resume evidence before continuing.",
) {
  const savedAnswer = screeningAnswers.find((answer) => (
    answer.answer.trim().length > 0 &&
    answerPatterns.some((pattern) => pattern.test(answer.questionPattern))
  ));

  if (!savedAnswer) return fallbackDetail;

  const answerLabel = getSavedScreeningAnswerLabel(savedAnswer.questionPattern);
  const answerSnippet = getSavedAnswerSnippet(savedAnswer.answer);

  return `Saved ${answerLabel} answer says: ${answerSnippet} ${confirmationDetail}`;
}

export function hasHardQuestionReviewText(description: string | null | undefined) {
  const text = description?.trim() ?? "";
  if (!text) return false;

  return HARD_QUESTION_REVIEWS.some((review) =>
    review.patterns.some((pattern) => pattern.test(text)),
  );
}

export function getHardQuestionReviews(
  job: Job,
  profile: ApplicationProfilePreview,
  screeningAnswers: ScreeningAnswerPreview[],
) {
  const text = job.description?.trim() ?? "";
  if (!text) return [];

  return HARD_QUESTION_REVIEWS.filter((review) =>
    review.patterns.some((pattern) => pattern.test(text)),
  ).map((review) => ({
    ...review,
    detail: review.getDetail?.({ profile, screeningAnswers }) ?? review.detail,
  }));
}
