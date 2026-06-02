import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../Button";
import { Card } from "../Card";
import { HelpIcon } from "../HelpIcon";
import { Input } from "../Input";
import { useToast } from "../../contexts";
import { logError } from "../../utils/errorUtils";
import {
  validateRequiredEmail,
  validatePhone,
  validateUrl,
  validateRequired,
} from "../../utils/formValidation";

// Type for tracking original form values
interface FormSnapshot {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  websiteUrl: string;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
}

// Types matching the Rust backend
interface ApplicationProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  defaultResumeId: number | null;
  hasResumeFile: boolean;
  resumeFileName: string | null;
  defaultCoverLetterTemplate: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationProfileInput {
  full_name: string;
  email: string;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  website_url?: string | null;
  default_resume_id?: number | null;
  resume_file_token?: string | null;
  clear_resume_file?: boolean;
  default_cover_letter_template?: string | null;
  us_work_authorized: boolean;
  requires_sponsorship: boolean;
  max_applications_per_day?: number;
  require_manual_approval?: boolean;
}

interface ProfileFormProps {
  onSaved?: () => void;
}

interface ApplicationResumeFileSelection {
  token: string;
  fileName: string;
}

export const ProfileForm = memo(function ProfileForm({ onSaved }: ProfileFormProps) {
  const [loading, setLoading] = useState(true);
  const [takingLong, setTakingLong] = useState(false);
  const [saving, setSaving] = useState(false);
  const { error: showError, success: showSuccess } = useToast();
  const hasLoadedProfileRef = useRef(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedResumeFileToken, setSelectedResumeFileToken] = useState("");
  const [selectedResumeFileName, setSelectedResumeFileName] = useState("");
  const [savedResumeFileName, setSavedResumeFileName] = useState("");
  const [resumeFileMarkedForClear, setResumeFileMarkedForClear] = useState(false);
  const [usWorkAuthorized, setUsWorkAuthorized] = useState(true);
  const [requiresSponsorship, setRequiresSponsorship] = useState(false);
  const [maxApplicationsPerDay, setMaxApplicationsPerDay] = useState(10);
  const [requireManualApproval, setRequireManualApproval] = useState(true);

  // Track original values for dirty detection
  const [originalValues, setOriginalValues] = useState<FormSnapshot | null>(null);

  // Inline validation errors (shown on blur and submit)
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    websiteUrl?: string;
  }>({});

  // Track which fields have been touched (for real-time validation)
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Field validators lookup (better performance than switch)
  const fieldValidators = useMemo((): Record<string, (value: string) => string | undefined> => ({
    fullName: (value) => validateRequired(value, "Full name"),
    email: validateRequiredEmail,
    phone: validatePhone,
    linkedinUrl: validateUrl,
    githubUrl: validateUrl,
    portfolioUrl: validateUrl,
    websiteUrl: validateUrl,
  }), []);

  // Field validation function using lookup
  const validateField = useCallback((field: string, value: string): string | undefined => {
    return fieldValidators[field]?.(value);
  }, [fieldValidators]);

  // Handle field blur for inline validation
  const handleBlur = useCallback((field: string, value: string) => {
    setTouched((prev) => new Set(prev).add(field));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, [validateField]);

  // Real-time validation for touched fields
  const handleChange = useCallback((field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (touched.has(field)) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  }, [touched, validateField]);

  // Compute if form has unsaved changes
  const isDirty = useMemo(() => {
    if (!originalValues) return false;
    return (
      fullName !== originalValues.fullName ||
      email !== originalValues.email ||
      phone !== originalValues.phone ||
      linkedinUrl !== originalValues.linkedinUrl ||
      githubUrl !== originalValues.githubUrl ||
      portfolioUrl !== originalValues.portfolioUrl ||
      websiteUrl !== originalValues.websiteUrl ||
      selectedResumeFileToken.trim().length > 0 ||
      resumeFileMarkedForClear ||
      usWorkAuthorized !== originalValues.usWorkAuthorized ||
      requiresSponsorship !== originalValues.requiresSponsorship ||
      maxApplicationsPerDay !== originalValues.maxApplicationsPerDay ||
      requireManualApproval !== originalValues.requireManualApproval
    );
  }, [originalValues, fullName, email, phone, linkedinUrl, githubUrl, portfolioUrl, websiteUrl, selectedResumeFileToken, resumeFileMarkedForClear, usWorkAuthorized, requiresSponsorship, maxApplicationsPerDay, requireManualApproval]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<ApplicationProfile | null>("get_application_profile");
      if (hasLoadedProfileRef.current) return;
      hasLoadedProfileRef.current = true;

      if (data) {
        setFullName(data.fullName);
        setEmail(data.email);
        setPhone(data.phone || "");
        setLinkedinUrl(data.linkedinUrl || "");
        setGithubUrl(data.githubUrl || "");
        setPortfolioUrl(data.portfolioUrl || "");
        setWebsiteUrl(data.websiteUrl || "");
        setSavedResumeFileName(data.hasResumeFile ? data.resumeFileName || "Resume selected" : "");
        setSelectedResumeFileToken("");
        setSelectedResumeFileName("");
        setResumeFileMarkedForClear(false);
        setUsWorkAuthorized(data.usWorkAuthorized);
        setRequiresSponsorship(data.requiresSponsorship);
        setMaxApplicationsPerDay(data.maxApplicationsPerDay);
        setRequireManualApproval(data.requireManualApproval);
        // Store original values for dirty detection
        setOriginalValues({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || "",
          linkedinUrl: data.linkedinUrl || "",
          githubUrl: data.githubUrl || "",
          portfolioUrl: data.portfolioUrl || "",
          websiteUrl: data.websiteUrl || "",
          usWorkAuthorized: data.usWorkAuthorized,
          requiresSponsorship: data.requiresSponsorship,
          maxApplicationsPerDay: data.maxApplicationsPerDay,
          requireManualApproval: data.requireManualApproval,
        });
      } else {
        // New profile - track initial empty state
        setOriginalValues({
          fullName: "",
          email: "",
          phone: "",
          linkedinUrl: "",
          githubUrl: "",
          portfolioUrl: "",
          websiteUrl: "",
          usWorkAuthorized: true,
          requiresSponsorship: false,
          maxApplicationsPerDay: 10,
          requireManualApproval: true,
        });
        setSavedResumeFileName("");
        setSelectedResumeFileToken("");
        setSelectedResumeFileName("");
        setResumeFileMarkedForClear(false);
      }
    } catch (error: unknown) {
      logError("Could not load application profile:", error);
      showError(
        "Could not load profile",
        "Try again. If it keeps happening, copy a safe support report."
      );
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Show a plain slow-load message if opening the profile takes a while.
  useEffect(() => {
    if (!loading) {
      setTakingLong(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setTakingLong(true);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  const resumeFileLabel = selectedResumeFileToken
    ? selectedResumeFileName || "Selected resume"
    : resumeFileMarkedForClear
      ? ""
      : savedResumeFileName;

  const handleSelectResume = async (): Promise<void> => {
    try {
      const selected = await invoke<ApplicationResumeFileSelection | null>(
        "select_application_resume_file",
      );
      if (selected) {
        setSelectedResumeFileToken(selected.token);
        setSelectedResumeFileName(selected.fileName || "Selected resume");
        setResumeFileMarkedForClear(false);
      }
    } catch (error: unknown) {
      logError("Could not select resume file:", error);
      showError(
        "Could not select resume",
        "Choose the resume again. If it keeps happening, copy a safe support report."
      );
    }
  };

  const handleSave = useCallback(async (): Promise<void> => {
    // Validate all fields and collect errors
    const newErrors = {
      fullName: validateField("fullName", fullName),
      email: validateField("email", email),
      phone: validateField("phone", phone),
      linkedinUrl: validateField("linkedinUrl", linkedinUrl),
      githubUrl: validateField("githubUrl", githubUrl),
      portfolioUrl: validateField("portfolioUrl", portfolioUrl),
      websiteUrl: validateField("websiteUrl", websiteUrl),
    };

    // Update error state to show inline errors
    setErrors(newErrors);

    // Check if any errors exist
    const hasErrors = Object.values(newErrors).some((error) => error !== undefined);
    if (hasErrors) {
      showError("Check highlighted fields", "Add the missing details, then save again.");
      return;
    }

    try {
      setSaving(true);
      const input: ApplicationProfileInput = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        resume_file_token: selectedResumeFileToken.trim() || null,
        clear_resume_file: resumeFileMarkedForClear,
        us_work_authorized: usWorkAuthorized,
        requires_sponsorship: requiresSponsorship,
        max_applications_per_day: maxApplicationsPerDay,
        require_manual_approval: requireManualApproval,
      };

      await invoke("upsert_application_profile", { input });
      showSuccess("Profile saved", "Your application profile has been updated");
      const nextSavedResumeFileName = resumeFileMarkedForClear
        ? ""
        : selectedResumeFileToken.trim()
          ? selectedResumeFileName || "Selected resume"
          : savedResumeFileName;
      setSavedResumeFileName(nextSavedResumeFileName);
      setSelectedResumeFileToken("");
      setSelectedResumeFileName("");
      setResumeFileMarkedForClear(false);
      // Update original values to mark form as clean
      setOriginalValues({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        linkedinUrl: linkedinUrl.trim(),
        githubUrl: githubUrl.trim(),
        portfolioUrl: portfolioUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        usWorkAuthorized,
        requiresSponsorship,
        maxApplicationsPerDay,
        requireManualApproval,
      });
      onSaved?.();
    } catch (error: unknown) {
      logError("Could not save profile:", error);
      showError(
        "Could not save profile",
        "Check the highlighted fields, then save again. If it keeps happening, copy a safe support report."
      );
    } finally {
      setSaving(false);
    }
  }, [
    fullName,
    email,
    phone,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
    websiteUrl,
    selectedResumeFileToken,
    selectedResumeFileName,
    savedResumeFileName,
    resumeFileMarkedForClear,
    usWorkAuthorized,
    requiresSponsorship,
    maxApplicationsPerDay,
    requireManualApproval,
    validateField,
    showError,
    showSuccess,
    onSaved,
  ]);

  // Keyboard shortcuts: Cmd+S to save, Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd+S or Cmd+Enter to save
      if ((e.key === 's' || e.key === 'Enter') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isDirty && !saving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, saving, handleSave]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8" role="status" aria-busy="true" aria-label="Loading profile">
          <div className="animate-spin w-6 h-6 border-2 border-sentinel-500 border-t-transparent rounded-full" aria-hidden="true" />
          {takingLong && (
            <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">
              Still opening your application profile...
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">
          Application Profile
        </h3>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          This information can be prepared while you review job applications
        </p>
      </div>

      <div className="space-y-6" role="form" aria-label="Application profile form">
        {/* Contact Information */}
        <section role="group" aria-labelledby="contact-info-heading">
          <h4 id="contact-info-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
            Contact Information
            <HelpIcon text="Basic info required for all job applications" />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={fullName}
              onChange={(e) => handleChange("fullName", e.target.value, setFullName)}
              onBlur={() => handleBlur("fullName", fullName)}
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
              onChange={(e) => handleChange("email", e.target.value, setEmail)}
              onBlur={() => handleBlur("email", email)}
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
              onChange={(e) => handleChange("phone", e.target.value, setPhone)}
              onBlur={() => handleBlur("phone", phone)}
              placeholder="+1 (555) 123-4567"
              hint="10-15 digits"
              error={errors.phone}
              autoComplete="tel"
              maxLength={20}
            />
          </div>
        </section>

        {/* URLs */}
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
              onChange={(e) => handleChange("linkedinUrl", e.target.value, setLinkedinUrl)}
              onBlur={() => handleBlur("linkedinUrl", linkedinUrl)}
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
              onChange={(e) => handleChange("githubUrl", e.target.value, setGithubUrl)}
              onBlur={() => handleBlur("githubUrl", githubUrl)}
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
              onChange={(e) => handleChange("portfolioUrl", e.target.value, setPortfolioUrl)}
              onBlur={() => handleBlur("portfolioUrl", portfolioUrl)}
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
              onChange={(e) => handleChange("websiteUrl", e.target.value, setWebsiteUrl)}
              onBlur={() => handleBlur("websiteUrl", websiteUrl)}
              placeholder="https://your-name.example.com"
              leftIcon={<LinkIcon className="w-4 h-4" />}
              error={errors.websiteUrl}
              autoComplete="url"
              maxLength={255}
            />
          </div>
        </section>

        {/* Resume Upload */}
        <section>
          <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
            Resume File
            <HelpIcon text="Select your resume file (PDF or DOCX) for application review" />
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                label="Selected resume"
                hideLabel
                value={resumeFileLabel}
                placeholder="No resume selected"
                readOnly
                leftIcon={<DocumentIcon className="w-4 h-4" />}
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleSelectResume}
              className="shrink-0"
            >
              Choose Resume
            </Button>
            {resumeFileLabel && (
              <button
                onClick={() => {
                  setSelectedResumeFileToken("");
                  setSelectedResumeFileName("");
                  setResumeFileMarkedForClear(true);
                }}
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

        {/* Work Authorization */}
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

        {/* Review Settings */}
        <section role="group" aria-labelledby="review-settings-heading">
          <h4 id="review-settings-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
            Review Settings
            <HelpIcon text="Control how Application Assist prepares forms for review" />
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="max-applications-select" className="text-surface-700 dark:text-surface-300 text-sm">
                Daily review limit:
              </label>
              <select
                id="max-applications-select"
                value={maxApplicationsPerDay}
                onChange={(e) => setMaxApplicationsPerDay(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                aria-label="Daily application review limit"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
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
                  Review each application before JobSentinel prepares details (recommended)
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-200 dark:border-surface-700">
          {isDirty ? (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" aria-hidden="true" />
              You have unsaved changes
            </span>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} loading={saving} loadingText="Saving..." disabled={!isDirty && !saving}>
            Save Profile
          </Button>
        </div>
      </div>
    </Card>
  );
});

// Icons
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
