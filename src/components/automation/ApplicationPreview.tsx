import { useState, useEffect, useCallback, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "../Badge";
import { Card } from "../Card";
import { logError } from "../../utils/errorUtils";
import { getApplicationFormDisplayName } from "./applicationFormLabels";
import * as screeningTaxonomy from "../../shared/applicationScreeningTaxonomy";

interface Job {
  id: number;
  hash: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  score?: number;
}

interface ApplicationProfilePreview {
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

interface ScreeningAnswerPreview {
  questionPattern: string;
  answer: string;
}

interface ApplicationPreviewProps {
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

function hasHardQuestionReviewText(description: string | null | undefined) {
  const text = description?.trim() ?? "";
  if (!text) return false;

  return HARD_QUESTION_REVIEWS.some((review) =>
    review.patterns.some((pattern) => pattern.test(text)),
  );
}

function getHardQuestionReviews(
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

export const ApplicationPreview = memo(function ApplicationPreview({ job, atsPlatform }: ApplicationPreviewProps) {
  const [profile, setProfile] = useState<ApplicationProfilePreview | null>(null);
  const [screeningAnswers, setScreeningAnswers] = useState<ScreeningAnswerPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await invoke<ApplicationProfilePreview | null>("get_application_profile_preview");
      
      if (signal?.aborted) return;
      setProfile(data);

      if (!data || !hasHardQuestionReviewText(job.description)) {
        setScreeningAnswers([]);
        return;
      }

      try {
        const answers = await invoke<ScreeningAnswerPreview[]>("get_screening_answers");
        if (signal?.aborted) return;
        setScreeningAnswers(Array.isArray(answers) ? answers : []);
      } catch (error: unknown) {
        if (signal?.aborted) return;
        setScreeningAnswers([]);
        logError("Failed to load screening answers for preview:", error);
      }
    } catch (error: unknown) {
      if (signal?.aborted) return;
      logError("Failed to load profile for preview:", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [job.description]);

  useEffect(() => {
    const controller = new AbortController();
    
    loadProfile(controller.signal);
    
    return () => controller.abort();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-busy="true" aria-label="Loading application preview">
        <div className="animate-spin w-6 h-6 border-2 border-sentinel-500 border-t-transparent rounded-full" aria-hidden="true" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-surface-500 dark:text-surface-400" role="status">
        <p>Set up your application profile to preview what JobSentinel can prepare.</p>
      </div>
    );
  }

  const fieldData = [
    { label: "Full Name", value: profile.fullName, willFill: true },
    { label: "Email", value: profile.email, willFill: true },
    { label: "Phone", value: profile.phone, willFill: !!profile.phone },
    { label: "LinkedIn", value: profile.linkedinUrl, willFill: !!profile.linkedinUrl },
    { label: "Work samples or profile", value: profile.githubUrl, willFill: !!profile.githubUrl },
    { label: "Portfolio", value: profile.portfolioUrl, willFill: !!profile.portfolioUrl },
    { label: "Personal website or credential page", value: profile.websiteUrl, willFill: !!profile.websiteUrl },
    {
      label: "US Work Authorization",
      value: profile.usWorkAuthorized ? "Yes" : "No",
      willFill: true,
    },
    {
      label: "Requires Sponsorship",
      value: profile.requiresSponsorship ? "Yes" : "No",
      willFill: true,
    },
  ];
  const applicationFormName = getApplicationFormDisplayName(atsPlatform);
  const hardQuestionReviews = getHardQuestionReviews(job, profile, screeningAnswers);

  return (
    <div className="space-y-6" role="region" aria-label="Application preview">
      {/* Job Summary */}
      <Card className="p-4 bg-surface-50 dark:bg-surface-800/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium text-surface-900 [overflow-wrap:anywhere] dark:text-white">
              {job.title}
            </h4>
            <p className="break-words text-surface-600 [overflow-wrap:anywhere] dark:text-surface-400">
              {job.company} • {job.location}
            </p>
          </div>
          {applicationFormName && (
            <Badge variant="surface" className="w-fit flex-shrink-0" aria-label={`Application form: ${applicationFormName}`}>
              {applicationFormName}
            </Badge>
          )}
        </div>
      </Card>

      {/* What JobSentinel Can Prepare */}
      <section role="group" aria-labelledby="prepared-fields-heading">
        <h4 id="prepared-fields-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-500" aria-hidden="true" />
          Fields JobSentinel can prepare
        </h4>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700" role="list" aria-label="Prepared fields">
          {fieldData
            .filter((f) => f.willFill && f.value)
            .map((field) => (
              <div
                key={field.label}
                className="flex items-start justify-between gap-4 px-4 py-3"
                role="listitem"
              >
                <span className="text-surface-600 dark:text-surface-400 text-sm">
                  {field.label}
                </span>
                <span className="min-w-0 break-words [overflow-wrap:anywhere] text-right font-medium text-surface-900 dark:text-white">
                  {field.value}
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* Manual Fields Warning */}
      <section role="group" aria-labelledby="manual-fields-heading">
        <h4 id="manual-fields-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <ExclamationIcon className="w-5 h-5 text-amber-500" aria-hidden="true" />
          You will complete and review
        </h4>
        <ul className="text-sm text-surface-600 dark:text-surface-400 space-y-2 pl-7" role="list" aria-label="Manual tasks">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Resume file (you choose it)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Cover letter (if required)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Additional screening questions
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Human check (if the site asks)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <strong>Final Submit button (you use this yourself)</strong>
          </li>
        </ul>
      </section>

      {hardQuestionReviews.length > 0 && (
        <section role="group" aria-labelledby="hard-question-review-heading">
          <h4 id="hard-question-review-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-2 flex items-center gap-2">
            <ExclamationIcon className="w-5 h-5 text-amber-500" aria-hidden="true" />
            Hard Question Review
          </h4>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-3">
            Make saved answers and resume evidence agree before submitting.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2" role="list" aria-label="Hard screening topics">
            {hardQuestionReviews.map((review) => (
              <li
                key={review.label}
                className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/10 px-3 py-2"
              >
                <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
                  {review.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-400">
                  {review.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4" role="complementary" aria-labelledby="info-banner-title">
        <div className="flex gap-3">
          <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p id="info-banner-title" className="font-medium mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300" role="list" aria-label="Application process steps">
              <li>A browser window will open with the application page</li>
              <li>Matching profile details are prepared for your review</li>
              <li>Review every prepared detail and complete any missing fields</li>
              <li>When ready, submit the form yourself</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
});

// Icons
function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ExclamationIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
