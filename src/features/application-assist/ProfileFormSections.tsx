import { Button } from "../../ui/Button";
import { HelpIcon } from "../../ui/HelpIcon";
import { Input } from "../../ui/Input";

const REVIEW_PACE_OPTIONS = [3, 5, 10, 15] as const;

export type ProfileFieldErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  websiteUrl?: string;
};

type TextFieldName = keyof ProfileFieldErrors;

type TextChangeHandler = (
  field: TextFieldName,
  value: string,
  setter: (value: string) => void,
) => void;

type FieldBlurHandler = (field: TextFieldName, value: string) => void;

interface ContactInformationSectionProps {
  fullName: string;
  email: string;
  phone: string;
  errors: ProfileFieldErrors;
  onTextChange: TextChangeHandler;
  onFieldBlur: FieldBlurHandler;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setPhone: (value: string) => void;
}

export function ContactInformationSection({
  fullName,
  email,
  phone,
  errors,
  onTextChange,
  onFieldBlur,
  setFullName,
  setEmail,
  setPhone,
}: ContactInformationSectionProps) {
  return (
    <section role="group" aria-labelledby="contact-info-heading">
      <h4 id="contact-info-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        Contact Information
        <HelpIcon text="Basic info required for all job applications" />
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name *"
          value={fullName}
          onChange={(e) => onTextChange("fullName", e.target.value, setFullName)}
          onBlur={() => onFieldBlur("fullName", fullName)}
          placeholder="Jordan Lee"
          error={errors.fullName}
          autoComplete="name"
          maxLength={100}
          required
        />
        <Input
          label="Email *"
          type="email"
          value={email}
          onChange={(e) => onTextChange("email", e.target.value, setEmail)}
          onBlur={() => onFieldBlur("email", email)}
          placeholder="jordan@example.com"
          error={errors.email}
          autoComplete="email"
          maxLength={255}
          required
        />
        <Input
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => onTextChange("phone", e.target.value, setPhone)}
          onBlur={() => onFieldBlur("phone", phone)}
          placeholder="+1 (555) 123-4567"
          hint="10-15 digits"
          error={errors.phone}
          autoComplete="tel"
          maxLength={20}
        />
      </div>
    </section>
  );
}

interface ProfessionalLinksSectionProps {
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  websiteUrl: string;
  errors: ProfileFieldErrors;
  onTextChange: TextChangeHandler;
  onFieldBlur: FieldBlurHandler;
  setLinkedinUrl: (value: string) => void;
  setGithubUrl: (value: string) => void;
  setPortfolioUrl: (value: string) => void;
  setWebsiteUrl: (value: string) => void;
}

export function ProfessionalLinksSection({
  linkedinUrl,
  githubUrl,
  portfolioUrl,
  websiteUrl,
  errors,
  onTextChange,
  onFieldBlur,
  setLinkedinUrl,
  setGithubUrl,
  setPortfolioUrl,
  setWebsiteUrl,
}: ProfessionalLinksSectionProps) {
  return (
    <section role="group" aria-labelledby="professional-links-heading">
      <h4 id="professional-links-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        Professional Links
        <HelpIcon text="Links to your professional profiles and portfolio" />
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="LinkedIn"
          type="url"
          value={linkedinUrl}
          onChange={(e) => onTextChange("linkedinUrl", e.target.value, setLinkedinUrl)}
          onBlur={() => onFieldBlur("linkedinUrl", linkedinUrl)}
          placeholder="https://linkedin.com/in/your-name"
          leftIcon={<LinkedInIcon className="w-4 h-4" />}
          error={errors.linkedinUrl}
          autoComplete="url"
          maxLength={255}
        />
        <Input
          label="Work samples or profile"
          type="url"
          value={githubUrl}
          onChange={(e) => onTextChange("githubUrl", e.target.value, setGithubUrl)}
          onBlur={() => onFieldBlur("githubUrl", githubUrl)}
          placeholder="https://profile.example.com/your-name"
          leftIcon={<GlobeIcon className="w-4 h-4" />}
          error={errors.githubUrl}
          autoComplete="url"
          maxLength={255}
        />
        <Input
          label="Portfolio"
          type="url"
          value={portfolioUrl}
          onChange={(e) => onTextChange("portfolioUrl", e.target.value, setPortfolioUrl)}
          onBlur={() => onFieldBlur("portfolioUrl", portfolioUrl)}
          placeholder="https://portfolio.example.com"
          leftIcon={<GlobeIcon className="w-4 h-4" />}
          error={errors.portfolioUrl}
          autoComplete="url"
          maxLength={255}
        />
        <Input
          label="Personal website or credential page"
          type="url"
          value={websiteUrl}
          onChange={(e) => onTextChange("websiteUrl", e.target.value, setWebsiteUrl)}
          onBlur={() => onFieldBlur("websiteUrl", websiteUrl)}
          placeholder="https://your-name.example.com"
          leftIcon={<LinkIcon className="w-4 h-4" />}
          error={errors.websiteUrl}
          autoComplete="url"
          maxLength={255}
        />
      </div>
    </section>
  );
}

interface ResumeFileSectionProps {
  resumeFileLabel: string;
  onSelectResume: () => void;
  onClearResume: () => void;
}

export function ResumeFileSection({
  resumeFileLabel,
  onSelectResume,
  onClearResume,
}: ResumeFileSectionProps) {
  return (
    <section>
      <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        Resume File
        <HelpIcon text="Choose a resume file saved on this device. You decide whether to attach it on each application." />
      </h4>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="selected-resume-file">
            Selected resume
          </label>
          <div className="relative">
            <DocumentIcon className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-surface-400 dark:text-surface-500" />
            <textarea
              id="selected-resume-file"
              value={resumeFileLabel || "No resume selected"}
              readOnly
              rows={2}
              className="min-h-12 w-full resize-none rounded-lg border border-surface-200 bg-white py-3 pl-10 pr-4 text-surface-800 [overflow-wrap:anywhere] dark:border-surface-700 dark:bg-surface-800 dark:text-white"
            />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={onSelectResume}
          className="w-full justify-center sm:w-auto sm:shrink-0"
        >
          Choose Resume
        </Button>
        {resumeFileLabel && (
          <button
            onClick={onClearResume}
            className="p-2 text-surface-400 hover:text-red-500 transition-colors cursor-pointer"
            aria-label="Clear resume"
          >
            <ClearIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
        Supported formats: PDF, DOCX, DOC. You choose whether to attach this file while reviewing an application.
      </p>
    </section>
  );
}

interface WorkAuthorizationSectionProps {
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  setUsWorkAuthorized: (value: boolean) => void;
  setRequiresSponsorship: (value: boolean) => void;
}

export function WorkAuthorizationSection({
  usWorkAuthorized,
  requiresSponsorship,
  setUsWorkAuthorized,
  setRequiresSponsorship,
}: WorkAuthorizationSectionProps) {
  return (
    <section role="group" aria-labelledby="work-auth-heading">
      <h4 id="work-auth-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        Work Authorization
        <HelpIcon text="Common screening questions about work eligibility" />
      </h4>
      <div className="space-y-3" role="group" aria-labelledby="work-auth-heading">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={usWorkAuthorized}
            onChange={(e) => setUsWorkAuthorized(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
          />
          <div>
            <span className="text-surface-700 dark:text-surface-300 font-medium">
              US Work Authorization
            </span>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              I am authorized to work in the United States
            </p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresSponsorship}
            onChange={(e) => setRequiresSponsorship(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
          />
          <div>
            <span className="text-surface-700 dark:text-surface-300 font-medium">
              Requires Sponsorship
            </span>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              I require visa sponsorship now or in the future
            </p>
          </div>
        </label>
      </div>
    </section>
  );
}

interface ReviewPaceSectionProps {
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
  setMaxApplicationsPerDay: (value: number) => void;
  setRequireManualApproval: (value: boolean) => void;
}

export function ReviewPaceSection({
  maxApplicationsPerDay,
  requireManualApproval,
  setMaxApplicationsPerDay,
  setRequireManualApproval,
}: ReviewPaceSectionProps) {
  const hasStandardReviewPace = REVIEW_PACE_OPTIONS.some(
    (option) => option === maxApplicationsPerDay,
  );

  return (
    <section role="group" aria-labelledby="review-settings-heading">
      <h4 id="review-settings-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        Review Pace
        <HelpIcon text="Set a review pace you can inspect carefully. JobSentinel never submits applications for you." />
      </h4>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <label htmlFor="max-applications-select" className="text-surface-700 dark:text-surface-300 text-sm">
              Applications to review per day:
            </label>
            <select
              id="max-applications-select"
              value={maxApplicationsPerDay}
              onChange={(e) => setMaxApplicationsPerDay(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
              aria-label="Applications to review per day"
            >
              {REVIEW_PACE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {!hasStandardReviewPace && maxApplicationsPerDay > 0 && (
                <option value={maxApplicationsPerDay}>
                  {maxApplicationsPerDay} (current saved pace)
                </option>
              )}
            </select>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Use a pace you can review carefully. JobSentinel never submits applications for you.
          </p>
          {!hasStandardReviewPace && maxApplicationsPerDay > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Your saved pace is higher than the usual choices. Lower it if applications start crowding out verified, fairly paid roles.
            </p>
          )}
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requireManualApproval}
            onChange={(e) => setRequireManualApproval(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
          />
          <div>
            <span className="text-surface-700 dark:text-surface-300 font-medium">
              Ask me before each form
            </span>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Review every application before JobSentinel prepares details (recommended)
            </p>
          </div>
        </label>
      </div>
    </section>
  );
}

function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function LinkIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function DocumentIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ClearIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
