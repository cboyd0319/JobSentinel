import { useState, useEffect, useCallback, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "../Badge";
import { Card } from "../Card";
import { logError } from "../../utils/errorUtils";
import { getApplicationFormDisplayName } from "./applicationFormLabels";

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
  patterns: RegExp[];
  getDetail?: (context: HardQuestionDetailContext) => string;
}

const HARD_QUESTION_REVIEWS: HardQuestionReview[] = [
  {
    label: "Work authorization",
    detail: "Check work authorization or sponsorship answers against your profile and resume.",
    getDetail: getWorkAuthorizationReviewDetail,
    patterns: [
      /\bwork authorization\b/i,
      /\bauthorized to work\b/i,
      /\bsponsorship\b/i,
      /\bvisa\b/i,
    ],
  },
  {
    label: "Location, relocation, or travel",
    detail: "Confirm location, commute, relocation, remote, hybrid, travel, and shift constraints.",
    getDetail: ({ screeningAnswers }) => getSavedScreeningAnswerReviewDetail(
      screeningAnswers,
      [
        /\brelocat(?:e|ion)\b/i,
        /\bremote\b/i,
        /\bhybrid\b/i,
        /\bon[-\s]?site\b/i,
        /\bcommut(?:e|ing)\b/i,
        /\btravel\b/i,
      ],
      "Confirm location, commute, relocation, remote, hybrid, travel, and shift constraints.",
    ),
    patterns: [
      /\brelocat(?:e|ion)\b/i,
      /\bremote\b/i,
      /\bhybrid\b/i,
      /\bon[-\s]?site\b/i,
      /\bcommut(?:e|ing)\b/i,
      /\btravel\b/i,
    ],
  },
  {
    label: "License, certification, or clearance",
    detail: "Use only credentials, licenses, certifications, or clearances you can document.",
    patterns: [
      /\blicen[cs]e\b/i,
      /\bcertif(?:ication|ied)\b/i,
      /\bclearance\b/i,
      /\bRN\b/,
      /\bCNA\b/,
      /\bCDL\b/,
      /\bPMP\b/,
      /\bSecurity\+\b/i,
    ],
  },
  {
    label: "Education or degree",
    detail: "Check degree, diploma, or education-equivalent answers against visible evidence.",
    patterns: [
      /\bdegree\b/i,
      /\bbachelor'?s?\b/i,
      /\bmaster'?s?\b/i,
      /\bhigh school\b/i,
      /\bdiploma\b/i,
    ],
  },
  {
    label: "Years of experience",
    detail: "Make years, level, and seniority answers match the experience you can explain.",
    patterns: [
      /\b\d+\+?\s*(?:years|yrs)\b/i,
      /\byears? of experience\b/i,
      /\bexperience required\b/i,
    ],
  },
  {
    label: "Salary or availability",
    detail: "Review salary, start-date, schedule, and availability answers before submission.",
    patterns: [
      /\bsalary\b/i,
      /\bcompensation\b/i,
      /\bavailability\b/i,
      /\bstart date\b/i,
      /\bshift\b/i,
      /\bweekend\b/i,
      /\bovernight\b/i,
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
  const normalizedPattern = questionPattern.toLowerCase();

  if (/\btravel\b/.test(normalizedPattern)) return "travel";
  if (/\brelocat/.test(normalizedPattern)) return "relocation";
  if (/\bcommut/.test(normalizedPattern)) return "commute";
  if (/\bremote\b|\bhybrid\b|\bon[-\s]?site\b/.test(normalizedPattern)) return "location";

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
  answerPatterns: RegExp[],
  fallbackDetail: string,
) {
  const savedAnswer = screeningAnswers.find((answer) => (
    answer.answer.trim().length > 0 &&
    answerPatterns.some((pattern) => pattern.test(answer.questionPattern))
  ));

  if (!savedAnswer) return fallbackDetail;

  const answerLabel = getSavedScreeningAnswerLabel(savedAnswer.questionPattern);
  const answerSnippet = getSavedAnswerSnippet(savedAnswer.answer);

  return `Saved ${answerLabel} answer says: ${answerSnippet} Confirm it matches the employer's wording and resume evidence before continuing.`;
}

function hasHardQuestionReviewText(job: Job) {
  const text = job.description?.trim() ?? "";
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

      if (!data || !hasHardQuestionReviewText(job)) {
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
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-surface-900 dark:text-white">
              {job.title}
            </h4>
            <p className="text-surface-600 dark:text-surface-400">
              {job.company} • {job.location}
            </p>
          </div>
          {applicationFormName && (
            <Badge variant="surface" aria-label={`Application form: ${applicationFormName}`}>
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
                className="px-4 py-3 flex items-center justify-between"
                role="listitem"
              >
                <span className="text-surface-600 dark:text-surface-400 text-sm">
                  {field.label}
                </span>
                <span className="text-surface-900 dark:text-white font-medium truncate ml-4 max-w-[250px]">
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
