import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../Button";
import { Card } from "../Card";
import { useToast } from "../../contexts";
import { logError } from "../../utils/errorUtils";
import {
  validateRequiredEmail,
  validatePhone,
  validateUrl,
  validateRequired,
} from "../../utils/formValidation";
import {
  ContactInformationSection,
  ProfessionalLinksSection,
  ResumeFileSection,
  ReviewPaceSection,
  WorkAuthorizationSection,
  type ProfileFieldErrors,
} from "./ProfileFormSections";

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
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  hasResumeFile: boolean;
  resumeFileName: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
  maxApplicationsPerDay: number;
  requireManualApproval: boolean;
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
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);

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

  const hasPendingChanges = useCallback(() => {
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

  // Compute if form has unsaved changes
  const isDirty = useMemo(() => hasPendingChanges(), [hasPendingChanges]);

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
      setTouched(new Set(Object.keys(newErrors)));
      setShowValidationSummary(true);
      return;
    }
    setShowValidationSummary(false);

    if (!hasPendingChanges()) {
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
    hasPendingChanges,
    showError,
    showSuccess,
    onSaved,
  ]);

  const shouldShowValidationSummary = showValidationSummary
    && Object.values(errors).some((error) => error !== undefined);

  // Keyboard shortcuts: Cmd+S to save, Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd+S or Cmd+Enter to save
      if ((e.key === 's' || e.key === 'Enter') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!saving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, handleSave]);

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
        {shouldShowValidationSummary && (
          <div
            role="alert"
            className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
          >
            <p className="font-semibold text-danger">Check highlighted fields</p>
            <p className="mt-1 text-danger/90">Add the missing details, then save again.</p>
          </div>
        )}

        <ContactInformationSection
          fullName={fullName}
          email={email}
          phone={phone}
          errors={errors}
          onTextChange={handleChange}
          onFieldBlur={handleBlur}
          setFullName={setFullName}
          setEmail={setEmail}
          setPhone={setPhone}
        />

        <ProfessionalLinksSection
          linkedinUrl={linkedinUrl}
          githubUrl={githubUrl}
          portfolioUrl={portfolioUrl}
          websiteUrl={websiteUrl}
          errors={errors}
          onTextChange={handleChange}
          onFieldBlur={handleBlur}
          setLinkedinUrl={setLinkedinUrl}
          setGithubUrl={setGithubUrl}
          setPortfolioUrl={setPortfolioUrl}
          setWebsiteUrl={setWebsiteUrl}
        />

        <ResumeFileSection
          resumeFileLabel={resumeFileLabel}
          onSelectResume={handleSelectResume}
          onClearResume={() => {
            setSelectedResumeFileToken("");
            setSelectedResumeFileName("");
            setResumeFileMarkedForClear(true);
          }}
        />

        <WorkAuthorizationSection
          usWorkAuthorized={usWorkAuthorized}
          requiresSponsorship={requiresSponsorship}
          setUsWorkAuthorized={setUsWorkAuthorized}
          setRequiresSponsorship={setRequiresSponsorship}
        />

        <ReviewPaceSection
          maxApplicationsPerDay={maxApplicationsPerDay}
          requireManualApproval={requireManualApproval}
          setMaxApplicationsPerDay={setMaxApplicationsPerDay}
          setRequireManualApproval={setRequireManualApproval}
        />

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
          <Button onClick={handleSave} loading={saving} loadingText="Saving..." disabled={saving}>
            Save Profile
          </Button>
        </div>
      </div>
    </Card>
  );
});
