import { useState, useEffect, useCallback } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { CareerProfileSelector } from "../components/CareerProfileSelector";
import { useToast } from "../contexts";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
import {
  CAREER_PROFILES,
  getProfileById,
  getSearchSourceDefaults,
  profileToConfig,
} from "../utils/profiles";
import {
  cacheDetectedLocation,
  readCachedDetectedLocation,
  type LocationInfo,
} from "../utils/locationDetection";
import {
  AvoidIcon,
  BuildingIcon,
  CheckIcon,
  GlobeIcon,
  MapPinIcon,
  OfficeIcon,
  PayIcon,
  SearchIcon,
  SentinelIcon,
  SparkleIcon,
} from "./SetupWizardIcons";
import { LocationOption } from "./SetupWizardLocationOption";
import { SetupWizardSearchSummary } from "./SetupWizardSearchSummary";
import {
  COMMON_WORK_TO_AVOID,
  DEFAULT_FRESHNESS_PREFERENCE,
  DEFAULT_REVIEW_VOLUME_PREFERENCE,
  FRESHNESS_OPTIONS,
  REVIEW_VOLUME_OPTIONS,
  applyReviewVolumePreference,
  buildSetupSearchSummary,
  createDefaultSetupConfig,
  ghostConfigForFreshnessPreference,
  toResumeSkillSuggestions,
  type FreshnessPreference,
  type ReviewVolumePreference,
  type SetupConfig,
  type SetupResumeSkill,
  type SetupResumeSummary,
} from "./setupWizardPreferences";

interface SetupWizardProps {
  onComplete: () => void;
}

// Step 0 is profile selection, then simplified flow
const STEPS = [
  { id: 0, title: "Work You Want", description: "What kind of work are you looking for?" },
  { id: 1, title: "Job Basics", description: "Tell JobSentinel what to look for" },
  { id: 2, title: "Location", description: "Where do you want to work?" },
  { id: 3, title: "Notifications", description: "Stay informed (optional)" },
];

// Preset paths provide starter search settings.

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0); // Start at step 0 (profile selection)
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [freshnessPreference, setFreshnessPreference] = useState<FreshnessPreference>(
    DEFAULT_FRESHNESS_PREFERENCE
  );
  const [reviewVolumePreference, setReviewVolumePreference] = useState<ReviewVolumePreference>(
    DEFAULT_REVIEW_VOLUME_PREFERENCE
  );
  const [titleInput, setTitleInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [resumeSuggestionName, setResumeSuggestionName] = useState<string | null>(null);
  const [resumeSkillSuggestions, setResumeSkillSuggestions] = useState<string[]>([]);
  const toast = useToast();
  const [stepAnnouncement, setStepAnnouncement] = useState("");
  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const [detectedLocation, setDetectedLocation] = useState<LocationInfo | null>(
    () => readCachedDetectedLocation()
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [config, setConfig] = useState<SetupConfig>(() => createDefaultSetupConfig());

  // When a profile is selected, auto-populate the config
  const handleProfileSelect = (profileId: string | null) => {
    setSelectedProfile(profileId);
    if (profileId) {
      const profile = getProfileById(profileId);
      if (profile) {
        const profileConfig = profileToConfig(profile);
        setConfig(prev => applyReviewVolumePreference({
          ...prev,
          ...profileConfig,
        }, reviewVolumePreference));
      }
    } else {
      // Reset to empty for the user's own search.
      setFreshnessPreference(DEFAULT_FRESHNESS_PREFERENCE);
      setReviewVolumePreference(DEFAULT_REVIEW_VOLUME_PREFERENCE);
      setConfig(createDefaultSetupConfig());
    }
  };

  const canProceedFromStep1 = config.title_allowlist.length > 0;
  const hasSelectedWorkType =
    config.location_preferences.allow_remote ||
    config.location_preferences.allow_hybrid ||
    config.location_preferences.allow_onsite;
  const addedResumeSuggestionCount = resumeSkillSuggestions.filter((skill) =>
    config.keywords_boost.includes(skill)
  ).length;

  useEffect(() => {
    let cancelled = false;

    const loadResumeSuggestions = async () => {
      try {
        const activeResume = await safeInvoke<SetupResumeSummary | null>(
          "get_active_resume",
          {},
          { logContext: "Load setup resume suggestions", silent: true },
        );

        if (cancelled || !activeResume) return;

        const skills = await safeInvoke<SetupResumeSkill[]>(
          "get_user_skills",
          { resumeId: activeResume.id },
          { logContext: "Load setup resume skills", silent: true },
        );

        if (cancelled) return;

        const suggestions = toResumeSkillSuggestions(skills);
        setResumeSuggestionName(suggestions.length > 0 ? activeResume.name : null);
        setResumeSkillSuggestions(suggestions);
      } catch {
        if (cancelled) return;
        setResumeSuggestionName(null);
        setResumeSkillSuggestions([]);
      }
    };

    void loadResumeSuggestions();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDetectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    try {
      const location = await safeInvoke<LocationInfo>(
        "detect_location",
        {},
        { logContext: "Detect location from IP" }
      );
      setDetectedLocation(location);
      cacheDetectedLocation(location);
    } catch {
      toast.warning("Location unavailable", "Enter a city manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toast]);

  // Announce step changes for screen readers
  useEffect(() => {
    const currentStep = STEPS[step];
    if (currentStep) {
      setStepAnnouncement(`Step ${step + 1} of ${STEPS.length}: ${currentStep.title}`);
    }
  }, [step]);

  // Announce when user cannot proceed from step 1
  useEffect(() => {
    if (step === 1 && !canProceedFromStep1) {
      setValidationAnnouncement("Add at least one job title to continue");
    }
  }, [step, canProceedFromStep1]);

  useEffect(() => {
    if (step === 2 && !hasSelectedWorkType) {
      setValidationAnnouncement("Choose at least one work location option to continue");
    } else if (step === 2 && hasSelectedWorkType) {
      setValidationAnnouncement("");
    }
  }, [step, hasSelectedWorkType]);

  const handleAddTitle = () => {
    const trimmed = titleInput.trim();
    if (trimmed && !config.title_allowlist.includes(trimmed)) {
      setConfig((prev) => ({
        ...prev,
        title_allowlist: [...prev.title_allowlist, trimmed],
      }));
      setTitleInput("");
    }
  };

  const handleRemoveTitle = (titleToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      title_allowlist: prev.title_allowlist.filter((t) => t !== titleToRemove),
    }));
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !config.keywords_boost.includes(trimmed)) {
      setConfig((prev) => ({
        ...prev,
        keywords_boost: [...prev.keywords_boost, trimmed],
      }));
      setSkillInput("");
    }
  };

  const handleAddSkillSuggestion = (skillName: string) => {
    const trimmed = skillName.trim();
    if (trimmed && !config.keywords_boost.includes(trimmed)) {
      setConfig((prev) => ({
        ...prev,
        keywords_boost: [...prev.keywords_boost, trimmed],
      }));
    }
  };

  const handleAddAllVisibleSkillSuggestions = () => {
    setConfig((prev) => {
      const skillsToAdd = resumeSkillSuggestions.filter(
        (skill) => !prev.keywords_boost.includes(skill)
      );

      if (skillsToAdd.length === 0) return prev;

      return {
        ...prev,
        keywords_boost: [...prev.keywords_boost, ...skillsToAdd],
      };
    });
  };

  const handleSkipResumeSuggestions = () => {
    setResumeSuggestionName(null);
    setResumeSkillSuggestions([]);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      keywords_boost: prev.keywords_boost.filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddAvoid = () => {
    const trimmed = avoidInput.trim();
    if (trimmed && !config.keywords_exclude.includes(trimmed)) {
      setConfig((prev) => ({
        ...prev,
        keywords_exclude: [...prev.keywords_exclude, trimmed],
      }));
      setAvoidInput("");
    }
  };

  const handleAddAvoidSuggestion = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !config.keywords_exclude.includes(trimmed)) {
      setConfig((prev) => ({
        ...prev,
        keywords_exclude: [...prev.keywords_exclude, trimmed],
      }));
    }
  };

  const handleRemoveAvoid = (itemToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      keywords_exclude: prev.keywords_exclude.filter((item) => item !== itemToRemove),
    }));
  };

  const handleSalaryFloorChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    setConfig((prev) => ({
      ...prev,
      salary_floor_usd: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    }));
  };

  const handlePayNotSure = () => {
    setConfig((prev) => ({
      ...prev,
      salary_floor_usd: 0,
    }));
  };

  const handleFreshnessPreferenceChange = (preference: FreshnessPreference) => {
    setFreshnessPreference(preference);
    setConfig((prev) => ({
      ...prev,
      ghost_config: ghostConfigForFreshnessPreference(preference),
    }));
  };

  const handleReviewVolumePreferenceChange = (preference: ReviewVolumePreference) => {
    setReviewVolumePreference(preference);
    setConfig((prev) => applyReviewVolumePreference(prev, preference));
  };

  const handleQuietAlertModeChange = (enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      alerts: {
        ...prev.alerts,
        desktop: {
          ...prev.alerts.desktop,
          play_sound: !enabled,
          show_when_focused: false,
        },
      },
    }));
  };

  const handleAddCity = () => {
    const trimmed = cityInput.trim();
    if (trimmed && !config.location_preferences.cities.includes(trimmed)) {
      setConfig((prev) => ({
        ...prev,
        location_preferences: {
          ...prev.location_preferences,
          cities: [...prev.location_preferences.cities, trimmed],
        },
      }));
      setCityInput("");
    }
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      location_preferences: {
        ...prev.location_preferences,
        cities: prev.location_preferences.cities.filter((c) => c !== cityToRemove),
      },
    }));
  };

  const handleLocationNotSure = () => {
    setConfig((prev) => ({
      ...prev,
      location_preferences: {
        ...prev.location_preferences,
        allow_remote: true,
        allow_hybrid: true,
        allow_onsite: true,
        cities: [],
      },
    }));
    setCityInput("");
  };

  const handleComplete = async () => {
    if (!hasSelectedWorkType) {
      setStep(2);
      setValidationAnnouncement("Choose at least one work location option to continue");
      return;
    }

    try {
      const sourceDefaults = getSearchSourceDefaults({
        titles: config.title_allowlist,
        keywords: config.keywords_boost,
        allowRemote: config.location_preferences.allow_remote,
      });
      const configWithSourceDefaults = {
        ...config,
        remoteok: {
          ...config.remoteok,
          enabled: config.remoteok.enabled || sourceDefaults.remoteokEnabled,
        },
        hn_hiring: {
          ...config.hn_hiring,
          enabled: config.hn_hiring.enabled || sourceDefaults.hnHiringEnabled,
        },
        weworkremotely: {
          ...config.weworkremotely,
          enabled: config.weworkremotely.enabled || sourceDefaults.weworkremotelyEnabled,
        },
      };

      // Create config object without the webhook_url (it's stored in keyring, not config file)
      const configToSave = {
        ...configWithSourceDefaults,
        alerts: {
          ...configWithSourceDefaults.alerts,
          slack: {
            enabled: configWithSourceDefaults.alerts.slack.enabled,
            // webhook_url is intentionally omitted - stored in OS keyring
          },
        },
      };

      await safeInvokeWithToast("complete_setup", { config: configToSave }, toast, {
        logContext: "Complete first-run setup"
      });
      toast.success("Saved search ready", "JobSentinel will use these choices.");
      onComplete();
    } catch {
      // Error already logged and shown to user
    }
  };

  const searchSummary = buildSetupSearchSummary(
    config,
    freshnessPreference,
    reviewVolumePreference
  );

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sentinel-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sentinel-600/10 rounded-full blur-3xl" />
      </div>

      {/* Live regions for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {stepAnnouncement}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {validationAnnouncement}
      </div>

      <div className="relative w-full max-w-xl motion-safe:animate-fade-in">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-300
                    ${step > s.id
                      ? "bg-sentinel-500 text-white"
                      : step === s.id
                        ? "bg-sentinel-500 text-white ring-4 ring-sentinel-500/30"
                        : "bg-surface-700 text-surface-400"
                    }
                  `}
                >
                  {step > s.id ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`
                      w-full h-0.5 mx-2 transition-colors duration-300
                      ${step > s.id ? "bg-sentinel-500" : "bg-surface-700"}
                    `}
                    style={{ width: "60px" }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-surface-400 text-sm">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        {/* Card */}
        <Card padding="lg" className="bg-white">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-sentinel-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <SentinelIcon className="w-8 h-8 text-sentinel-600" />
            </div>
            <h1 className="font-display text-display-xl text-surface-900 mb-2">
              {STEPS[step]?.title ?? 'Setup'}
            </h1>
            <p className="text-surface-500">
              {STEPS[step]?.description ?? ''}
            </p>
          </div>

          {/* Step 0: Career Profile Selection */}
          {step === 0 && (
            <div className="motion-safe:animate-slide-up">
              <CareerProfileSelector
                selectedProfile={selectedProfile}
                onSelectProfile={handleProfileSelect}
              />

              <Button
                onClick={() => setStep(1)}
                className="w-full mt-6"
                size="lg"
              >
                {selectedProfile ? "Use These Starting Ideas" : "Build My Search"}
              </Button>
            </div>
          )}

          {/* Step 1: Job titles, skills, and constraints */}
          {step === 1 && (
            <div className="motion-safe:animate-slide-up space-y-6">
              {/* Pre-populated indicator */}
              {selectedProfile && (
                <div className="p-3 bg-sentinel-50 border border-sentinel-200 rounded-lg text-sm text-sentinel-700">
                  Started with <strong>{CAREER_PROFILES.find(p => p.id === selectedProfile)?.name}</strong>. Change anything you want.
                </div>
              )}

              {/* Job Titles Section */}
              <div>
                <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
                  <SearchIcon /> Job Titles
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a job title..."
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTitle();
                      }
                    }}
                  />
                  <Button onClick={handleAddTitle} disabled={!titleInput.trim()}>
                    Add
                  </Button>
                </div>

                {config.title_allowlist.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg max-h-32 overflow-y-auto">
                    {config.title_allowlist.map((title) => (
                      <Badge
                        key={title}
                        variant="sentinel"
                        removable
                        onRemove={() => handleRemoveTitle(title)}
                      >
                        {title}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 bg-surface-50 rounded-lg">
                    <p className="text-surface-400 text-sm">Add at least one job title</p>
                  </div>
                )}
              </div>

              {/* Skills Section */}
              <div>
                <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
                  <SparkleIcon /> Skills and Work You Want
                </h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <Button onClick={handleAddSkill} disabled={!skillInput.trim()}>
                    Add
                  </Button>
                </div>

                {config.keywords_boost.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg max-h-32 overflow-y-auto">
                    {config.keywords_boost.map((skill) => (
                      <Badge
                        key={skill}
                        variant="alert"
                        removable
                        onRemove={() => handleRemoveSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 bg-surface-50 rounded-lg">
                    <p className="text-surface-400 text-sm">Skills help us find better matches (optional)</p>
                  </div>
                )}
              </div>

              {resumeSkillSuggestions.length > 0 && (
                <section
                  className="border-l-2 border-surface-200 pl-3"
                  aria-labelledby="setup-resume-skills-title"
                >
                  <h3
                    id="setup-resume-skills-title"
                    className="font-semibold text-surface-800 mb-2"
                  >
                    Use reviewed resume skills
                  </h3>
                  <p className="mb-3 text-sm text-surface-500">
                    From{" "}
                    <span className="font-medium text-surface-700">
                      {resumeSuggestionName}
                    </span>
                    . Review these skill names before adding them.
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddAllVisibleSkillSuggestions}
                      disabled={resumeSkillSuggestions.every((skill) =>
                        config.keywords_boost.includes(skill)
                      )}
                    >
                      Add all visible
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkipResumeSuggestions}
                    >
                      Hide suggestions
                    </Button>
                  </div>
                  {addedResumeSuggestionCount > 0 && (
                    <p className="mb-2 text-xs text-surface-500">
                      Added skills appear above. Remove any you do not want.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {resumeSkillSuggestions.map((skill) => {
                      const alreadyAdded = config.keywords_boost.includes(skill);
                      return (
                        <Button
                          key={skill}
                          variant={alreadyAdded ? "ghost" : "secondary"}
                          size="sm"
                          onClick={() => handleAddSkillSuggestion(skill)}
                          disabled={alreadyAdded}
                          aria-label={
                            alreadyAdded
                              ? `${skill} already in search`
                              : `Add ${skill} to search`
                          }
                        >
                          {alreadyAdded ? `Added ${skill}` : skill}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-surface-500">
                    Suggestions stay local and do not change your search until you pick them.
                  </p>
                </section>
              )}

              {/* Work to Avoid Section */}
              <div>
                <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
                  <AvoidIcon /> Work to Avoid
                </h3>
                <p className="mb-3 text-sm text-surface-500">
                  Optional. Add words or phrases JobSentinel should rank lower.
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    label="Work to avoid"
                    hideLabel
                    placeholder="e.g., night shift, heavy travel"
                    value={avoidInput}
                    onChange={(e) => setAvoidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAvoid();
                      }
                    }}
                  />
                  <Button onClick={handleAddAvoid} disabled={!avoidInput.trim()}>
                    Add
                  </Button>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500">
                    Common to rank lower
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_WORK_TO_AVOID.map((item) => {
                      const alreadyAdded = config.keywords_exclude.includes(item);
                      return (
                        <Button
                          key={item}
                          type="button"
                          variant={alreadyAdded ? "ghost" : "secondary"}
                          size="sm"
                          onClick={() => handleAddAvoidSuggestion(item)}
                          disabled={alreadyAdded}
                          aria-label={
                            alreadyAdded
                              ? `${item} already ranked lower`
                              : `Add ${item} to rank lower`
                          }
                        >
                          {alreadyAdded ? `Added ${item}` : item}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {config.keywords_exclude.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg max-h-32 overflow-y-auto">
                    {config.keywords_exclude.map((item) => (
                      <Badge
                        key={item}
                        variant="danger"
                        removable
                        onRemove={() => handleRemoveAvoid(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 bg-surface-50 rounded-lg">
                    <p className="text-surface-400 text-sm">Skip this if nothing comes to mind</p>
                  </div>
                )}
              </div>

              {/* Lowest pay */}
              <div>
                <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
                  <PayIcon /> Lowest Pay
                </h3>
                <p className="mb-3 text-sm text-surface-500">
                  Optional. Add the minimum yearly pay that would make a job worth considering.
                </p>
                <div className="space-y-2">
                  <Input
                    label="Minimum yearly pay"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    placeholder="e.g., 60000"
                    value={config.salary_floor_usd || ""}
                    onChange={(e) => handleSalaryFloorChange(e.target.value)}
                    hint="Leave blank if unsure. Jobs without pay stay visible and marked."
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handlePayNotSure}
                    disabled={config.salary_floor_usd === 0}
                    aria-label="Not sure about pay yet"
                  >
                    Not sure yet
                  </Button>
                </div>
                {config.salary_floor_usd > 0 && (
                  <p className="mt-2 text-sm text-surface-600">
                    JobSentinel will warn when listed pay is below{" "}
                    <span className="font-semibold text-surface-800">
                      ${config.salary_floor_usd.toLocaleString()}/year
                    </span>
                    .
                  </p>
                )}
                {config.salary_floor_usd === 0 && (
                  <p className="mt-2 text-sm text-surface-600">
                    Jobs without pay stay visible and marked.
                  </p>
                )}
              </div>

              {!canProceedFromStep1 && (
                <p className="text-center text-sm text-amber-600">
                  Add at least one job title to continue
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)} className="flex-1" size="lg">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedFromStep1}
                  className="flex-1"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="motion-safe:animate-slide-up">
              <div className="space-y-3 mb-6">
                <LocationOption
                  label="Remote"
                  description="Work from anywhere"
                  checked={config.location_preferences.allow_remote}
                  onChange={(checked) =>
                    setConfig({
                      ...config,
                      location_preferences: {
                        ...config.location_preferences,
                        allow_remote: checked,
                      },
                    })
                  }
                  icon={<GlobeIcon />}
                />
                <LocationOption
                  label="Hybrid"
                  description="Mix of remote and office"
                  checked={config.location_preferences.allow_hybrid}
                  onChange={(checked) =>
                    setConfig({
                      ...config,
                      location_preferences: {
                        ...config.location_preferences,
                        allow_hybrid: checked,
                      },
                    })
                  }
                  icon={<BuildingIcon />}
                />
                <LocationOption
                  label="On-site"
                  description="Work from the office"
                  checked={config.location_preferences.allow_onsite}
                  onChange={(checked) =>
                    setConfig({
                      ...config,
                      location_preferences: {
                        ...config.location_preferences,
                        allow_onsite: checked,
                      },
                    })
                  }
                  icon={<OfficeIcon />}
                />
              </div>

              <div className="mb-6 rounded-lg border border-surface-200 bg-surface-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-surface-600">
                    Not sure yet? Keep remote, hybrid, and on-site jobs visible.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleLocationNotSure}
                    aria-label="Not sure about location yet"
                  >
                    Not sure yet
                  </Button>
                </div>
                <p className="mt-2 text-xs text-surface-500">
                  Add cities later if commute or office days start to matter.
                </p>
              </div>

              {/* City input for hybrid/onsite */}
              {(config.location_preferences.allow_hybrid || config.location_preferences.allow_onsite) && (
                <div className="mb-6">
                  {/* Detected location indicator */}
                  {detectedLocation && (
                    <div className="mb-3 p-3 bg-sentinel-50 border border-sentinel-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPinIcon />
                          <span className="text-sm text-sentinel-700">
                            Detected: <strong>{detectedLocation.city}, {detectedLocation.region}</strong>
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const locationStr = `${detectedLocation.city}, ${detectedLocation.region}`;
                            if (!config.location_preferences.cities.includes(locationStr)) {
                              setConfig(prev => ({
                                ...prev,
                                location_preferences: {
                                  ...prev.location_preferences,
                                  cities: [...prev.location_preferences.cities, locationStr],
                                },
                              }));
                              toast.success("Location added", `Added ${locationStr}`);
                            }
                          }}
                          disabled={config.location_preferences.cities.includes(`${detectedLocation.city}, ${detectedLocation.region}`)}
                        >
                          {config.location_preferences.cities.includes(`${detectedLocation.city}, ${detectedLocation.region}`) ? "Added" : "Use This"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {!detectedLocation && (
                    <div className="mb-3 p-3 bg-surface-50 border border-surface-200 rounded-lg">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleDetectLocation}
                          loading={isDetectingLocation}
                          loadingText="Detecting..."
                          aria-describedby="setup-location-detection-privacy"
                          icon={<MapPinIcon />}
                        >
                          Detect location
                        </Button>
                      </div>
                      <p
                        id="setup-location-detection-privacy"
                        className="mt-2 text-xs text-surface-500"
                      >
                        Only when you use this button, JobSentinel asks an outside
                        location lookup service for your approximate city from
                        your internet address. Nothing is saved unless you add
                        the city.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="e.g., Chicago, Austin"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCity();
                        }
                      }}
                      leftIcon={<MapPinIcon />}
                    />
                    <Button onClick={handleAddCity} disabled={!cityInput.trim()}>
                      Add
                    </Button>
                  </div>
                  {config.location_preferences.cities.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-surface-50 rounded-lg">
                      {config.location_preferences.cities.map((city) => (
                        <Badge
                          key={city}
                          variant="surface"
                          removable
                          onRemove={() => handleRemoveCity(city)}
                        >
                          {city}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1" size="lg">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!hasSelectedWorkType}
                  className="flex-1"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
              {!hasSelectedWorkType && (
                <p className="mt-3 text-center text-sm text-amber-600">
                  Choose at least one work location option to continue
                </p>
              )}
            </div>
          )}

          {/* Step 3: Notifications */}
          {step === 3 && (
            <div className="motion-safe:animate-slide-up">
              <fieldset
                className="mb-6"
                aria-describedby="setup-freshness-help"
              >
                <legend className="font-semibold text-surface-800 mb-2">
                  Fresh and verified jobs
                </legend>
                <p id="setup-freshness-help" className="mb-3 text-sm text-surface-500">
                  Choose how JobSentinel handles older or hard-to-verify postings.
                </p>
                <div className="space-y-2">
                  {FRESHNESS_OPTIONS.map((option) => {
                    const checked = freshnessPreference === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`
                          flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all duration-150
                          ${checked
                            ? "border-sentinel-500 bg-sentinel-50"
                            : "border-surface-200 hover:border-surface-300"
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="freshness-preference"
                          value={option.id}
                          checked={checked}
                          onChange={() => handleFreshnessPreferenceChange(option.id)}
                          className="mt-1 h-4 w-4 border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                        />
                        <span>
                          <span className="block font-medium text-surface-800">
                            {option.label}
                          </span>
                          <span className="block text-sm text-surface-500">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset
                className="mb-6"
                aria-describedby="setup-review-volume-help"
              >
                <legend className="font-semibold text-surface-800 mb-2">
                  Jobs to review
                </legend>
                <p id="setup-review-volume-help" className="mb-3 text-sm text-surface-500">
                  Choose how broad the first results and alerts should feel.
                </p>
                <div className="space-y-2">
                  {REVIEW_VOLUME_OPTIONS.map((option) => {
                    const checked = reviewVolumePreference === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`
                          flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all duration-150
                          ${checked
                            ? "border-sentinel-500 bg-sentinel-50"
                            : "border-surface-200 hover:border-surface-300"
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="review-volume-preference"
                          value={option.id}
                          checked={checked}
                          onChange={() => handleReviewVolumePreferenceChange(option.id)}
                          className="mt-1 h-4 w-4 border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                        />
                        <span>
                          <span className="block font-medium text-surface-800">
                            {option.label}
                          </span>
                          <span className="block text-sm text-surface-500">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mb-6">
                <p className="text-surface-600 mb-4 text-center">
                  Get notified when JobSentinel finds roles that fit your saved search
                </p>
                
                <div className="mb-6 rounded-lg border-2 border-surface-200 p-4">
                  <p className="font-medium text-surface-700">Alerts</p>
                  <p className="mt-1 text-sm text-surface-500">
                    Start with desktop alerts now. Email or chat alerts can be added later in Settings.
                  </p>
                  <label
                    className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 p-3"
                    htmlFor="quiet-alert-mode"
                  >
                    <input
                      id="quiet-alert-mode"
                      type="checkbox"
                      checked={!config.alerts.desktop.play_sound}
                      onChange={(e) => handleQuietAlertModeChange(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span>
                      <span className="block font-medium text-surface-800">
                        Quiet job-search mode
                      </span>
                      <span className="block text-sm text-surface-500">
                        Use desktop alerts without sound. Good for a private or quieter search.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <SetupWizardSearchSummary summary={searchSummary} />

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1" size="lg">
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  variant="success"
                  className="flex-1"
                  size="lg"
                >
                  Start Finding Jobs
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-surface-500 text-sm mt-6">
          Privacy-preserving job search
        </p>
      </div>
    </div>
  );
}
