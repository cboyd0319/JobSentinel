import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button, Input, Card, HelpIcon } from "..";
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
  resumeFilePath: string;
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
  resumeFilePath: string | null;
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
  resume_file_path?: string | null;
  default_cover_letter_template?: string | null;
  us_work_authorized: boolean;
  requires_sponsorship: boolean;
  max_applications_per_day?: number;
  require_manual_approval?: boolean;
}

interface ProfileFormProps {
  onSaved?: () => void;
}

export const ProfileForm = memo(function ProfileForm({ onSaved }: ProfileFormProps) {
  const [loading, setLoading] = useState(true);
  const [takingLong, setTakingLong] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [resumeFilePath, setResumeFilePath] = useState("");
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
      resumeFilePath !== originalValues.resumeFilePath ||
      usWorkAuthorized !== originalValues.usWorkAuthorized ||
      requiresSponsorship !== originalValues.requiresSponsorship ||
      maxApplicationsPerDay !== originalValues.maxApplicationsPerDay ||
      requireManualApproval !== originalValues.requireManualApproval
    );
  }, [originalValues, fullName, email, phone, linkedinUrl, githubUrl, portfolioUrl, websiteUrl, resumeFilePath, usWorkAuthorized, requiresSponsorship, maxApplicationsPerDay, requireManualApproval]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<ApplicationProfile | null>("get_application_profile");
      if (data) {
        setFullName(data.fullName);
        setEmail(data.email);
        setPhone(data.phone || "");
        setLinkedinUrl(data.linkedinUrl || "");
        setGithubUrl(data.githubUrl || "");
        setPortfolioUrl(data.portfolioUrl || "");
        setWebsiteUrl(data.websiteUrl || "");
        setResumeFilePath(data.resumeFilePath || "");
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
          resumeFilePath: data.resumeFilePath || "",
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
          resumeFilePath: "",
          usWorkAuthorized: true,
          requiresSponsorship: false,
          maxApplicationsPerDay: 10,
          requireManualApproval: true,
        });
      }
    } catch (error: unknown) {
      logError("Failed to load application profile:", error);
      toast.error("Failed to load profile", "Please try again");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Show "taking longer" message if loading exceeds 5 seconds
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

  const handleSelectResume = async (): Promise<void> => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Resume",
            extensions: ["pdf", "docx", "doc"],
          },
        ],
      });
      if (selected && typeof selected === "string") {
        setResumeFilePath(selected);
      }
    } catch (error: unknown) {
      logError("Failed to select resume file:", error);
      toast.error("Failed to select file", "Please try again");
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
      toast.error("Please fix the errors", "Check the highlighted fields");
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
        resume_file_path: resumeFilePath.trim() || null,
        us_work_authorized: usWorkAuthorized,
        requires_sponsorship: requiresSponsorship,
        max_applications_per_day: maxApplicationsPerDay,
        require_manual_approval: requireManualApproval,
      };

      await invoke("upsert_application_profile", { input });
      toast.success("Profile saved", "Your application profile has been updated");
      // Update original values to mark form as clean
      setOriginalValues({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        linkedinUrl: linkedinUrl.trim(),
        githubUrl: githubUrl.trim(),
        portfolioUrl: portfolioUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        resumeFilePath: resumeFilePath.trim(),
        usWorkAuthorized,
        requiresSponsorship,
        maxApplicationsPerDay,
        requireManualApproval,
      });
      onSaved?.();
    } catch (error: unknown) {
      logError("Failed to save profile:", error);
      toast.error("Failed to save", "Please try again");
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
    resumeFilePath,
    usWorkAuthorized,
    requiresSponsorship,
    maxApplicationsPerDay,
    requireManualApproval,
    validateField,
    toast,
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
              Taking longer than expected...
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
          This information will be auto-filled when you apply to jobs
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
              placeholder="John Doe"
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
              placeholder="john@example.com"
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
              placeholder="https://linkedin.com/in/johndoe"
              leftIcon={<LinkedInIcon className="w-4 h-4" />}
              error={errors.linkedinUrl}
              autoComplete="url"
              maxLength={255}
            />
            <Input
              label="GitHub"
              type="url"
              value={githubUrl}
              onChange={(e) => handleChange("githubUrl", e.target.value, setGithubUrl)}
              onBlur={() => handleBlur("githubUrl", githubUrl)}
              placeholder="https://github.com/johndoe"
              leftIcon={<GitHubIcon className="w-4 h-4" />}
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
              placeholder="https://johndoe.com"
              leftIcon={<GlobeIcon className="w-4 h-4" />}
              error={errors.portfolioUrl}
              autoComplete="url"
              maxLength={255}
            />
            <Input
              label="Website"
              type="url"
              value={websiteUrl}
              onChange={(e) => handleChange("websiteUrl", e.target.value, setWebsiteUrl)}
              onBlur={() => handleBlur("websiteUrl", websiteUrl)}
              placeholder="https://blog.johndoe.com"
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
            <HelpIcon text="Select your resume file (PDF or DOCX) for auto-upload when applying" />
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                label="Resume file path"
                hideLabel
                value={resumeFilePath}
                onChange={(e) => setResumeFilePath(e.target.value)}
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
              Browse...
            </Button>
            {resumeFilePath && (
              <button
                onClick={() => setResumeFilePath("")}
                className="p-2 text-surface-400 hover:text-red-500 transition-colors"
                aria-label="Clear resume"
              >
                <ClearIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
            Supported formats: PDF, DOCX, DOC. This file will be automatically uploaded when applying.
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
                className="mt-1 w-4 h-4 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
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
                className="mt-1 w-4 h-4 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
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

        {/* Automation Settings */}
        <section role="group" aria-labelledby="automation-settings-heading">
          <h4 id="automation-settings-heading" className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
            Automation Settings
            <HelpIcon text="Control how the form filler behaves" />
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="max-applications-select" className="text-surface-700 dark:text-surface-300 text-sm">
                Max applications per day:
              </label>
              <select
                id="max-applications-select"
                value={maxApplicationsPerDay}
                onChange={(e) => setMaxApplicationsPerDay(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                aria-label="Maximum applications per day"
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
                className="mt-1 w-4 h-4 rounded border-surface-300 text-sentinel-500 focus:ring-sentinel-500"
              />
              <div>
                <span className="text-surface-700 dark:text-surface-300 font-medium">
                  Require manual approval
                </span>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Review each application before the form is filled (recommended)
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

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
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
