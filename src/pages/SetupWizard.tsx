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
  profileToConfig,
} from "../utils/profiles";
import {
  cacheDetectedLocation,
  readCachedDetectedLocation,
  type LocationInfo,
} from "../utils/locationDetection";
import {
  AvoidIcon,
  CheckIcon,
  SearchIcon,
  SentinelIcon,
  SparkleIcon,
} from "./SetupWizardIcons";
import { SetupWizardLocationStep } from "./SetupWizardLocationStep";
import { SetupWizardNotificationsStep } from "./SetupWizardNotificationsStep";
import { SetupWizardPayFloorSection } from "./SetupWizardPayFloorSection";
import { SetupWizardResumeSuggestions } from "./SetupWizardResumeSuggestions";
import {
  COMMON_WORK_TO_AVOID,
  COMMON_STARTER_JOB_TITLES,
  DEFAULT_FRESHNESS_PREFERENCE,
  DEFAULT_REVIEW_VOLUME_PREFERENCE,
  applyReviewVolumePreference,
  buildSetupSearchSummary,
  createDefaultSetupConfig,
  ghostConfigForFreshnessPreference,
  type FreshnessPreference,
  type ReviewVolumePreference,
  type SetupConfig,
  type SetupJobSourceKey,
  type SetupPayUnit,
  normalizeSetupPayFloorUsd,
} from "./setupWizardPreferences";
import {
  getSetupWizardSourceReviewOptions,
  toggleSetupJobSource,
} from "./setupWizardSourceReviewState";
import { useSetupResumeSuggestions } from "./useSetupResumeSuggestions";

interface SetupWizardProps {
  onComplete: () => void;
}

type WorkLocationPreferenceKey = "allow_remote" | "allow_hybrid" | "allow_onsite";

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
  const [payFloorInput, setPayFloorInput] = useState("");
  const [payFloorUnit, setPayFloorUnit] = useState<SetupPayUnit>("yearly");
  const toast = useToast();
  const [stepAnnouncement, setStepAnnouncement] = useState("");
  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const [detectedLocation, setDetectedLocation] = useState<LocationInfo | null>(
    () => readCachedDetectedLocation()
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [config, setConfig] = useState<SetupConfig>(() => createDefaultSetupConfig());
  const {
    addedResumeSuggestionCount,
    handleAddAllVisibleSkillSuggestions,
    handleAddSkillSuggestion,
    handleRequestResumeSuggestions,
    handleSkipResumeSuggestions,
    removeResumeSkillSource,
    resumeSkillSuggestions,
    resumeSkillSummary,
    resumeSuggestionName,
    resumeSuggestionState,
  } = useSetupResumeSuggestions({ config, setConfig });

  // When a profile is selected, auto-populate the config
  const handleProfileSelect = (profileId: string | null) => {
    setSelectedProfile(profileId);
    if (profileId) {
      const profile = getProfileById(profileId);
      if (profile) {
        const profileConfig = profileToConfig(profile);
        setPayFloorInput(profileConfig.salary_floor_usd > 0
          ? String(profileConfig.salary_floor_usd)
          : "");
        setPayFloorUnit("yearly");
        setConfig(prev => applyReviewVolumePreference({
          ...prev,
          ...profileConfig,
        }, reviewVolumePreference));
      }
    } else {
      // Reset to empty for the user's own search.
      setFreshnessPreference(DEFAULT_FRESHNESS_PREFERENCE);
      setReviewVolumePreference(DEFAULT_REVIEW_VOLUME_PREFERENCE);
      setPayFloorInput("");
      setPayFloorUnit("yearly");
      setConfig(createDefaultSetupConfig());
    }
  };

  const canProceedFromStep1 = config.title_allowlist.length > 0;
  const hasSelectedWorkType =
    config.location_preferences.allow_remote ||
    config.location_preferences.allow_hybrid ||
    config.location_preferences.allow_onsite;

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

  const handleAddStarterTitle = (title: string) => {
    setConfig((prev) => {
      if (prev.title_allowlist.includes(title)) {
        return prev;
      }

      return {
        ...prev,
        title_allowlist: [...prev.title_allowlist, title],
      };
    });
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

  const handleRemoveSkill = (skillToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      keywords_boost: prev.keywords_boost.filter((s) => s !== skillToRemove),
    }));
    removeResumeSkillSource(skillToRemove);
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
    setPayFloorInput(value);
    setConfig((prev) => ({
      ...prev,
      salary_floor_usd: normalizeSetupPayFloorUsd(value, payFloorUnit),
    }));
  };

  const handlePayUnitChange = (unit: SetupPayUnit) => {
    setPayFloorUnit(unit);
    setConfig((prev) => ({
      ...prev,
      salary_floor_usd: normalizeSetupPayFloorUsd(payFloorInput, unit),
    }));
  };

  const handlePayNotSure = () => {
    setPayFloorInput("");
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

  const handleDesktopAlertsChange = (enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      alerts: {
        ...prev.alerts,
        desktop: {
          ...prev.alerts.desktop,
          enabled,
          play_sound: enabled ? prev.alerts.desktop.play_sound : false,
          show_when_focused: false,
        },
      },
    }));
  };

  const handleToggleJobSource = (
    source: SetupJobSourceKey,
    enabled: boolean,
  ) => {
    setConfig((prev) => toggleSetupJobSource(prev, source, enabled));
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

  const handleWorkTypeChange = (
    key: WorkLocationPreferenceKey,
    checked: boolean,
  ) => {
    setConfig((prev) => ({
      ...prev,
      location_preferences: {
        ...prev.location_preferences,
        [key]: checked,
      },
    }));
  };

  const handleUseDetectedLocation = () => {
    if (!detectedLocation) {
      return;
    }

    const locationStr = `${detectedLocation.city}, ${detectedLocation.region}`;
    if (config.location_preferences.cities.includes(locationStr)) {
      return;
    }

    setConfig((prev) => ({
      ...prev,
      location_preferences: {
        ...prev.location_preferences,
        cities: [...prev.location_preferences.cities, locationStr],
      },
    }));
    toast.success("Location added", `Added ${locationStr}`);
  };

  const handleComplete = async () => {
    if (!hasSelectedWorkType) {
      setStep(2);
      setValidationAnnouncement("Choose at least one work location option to continue");
      return;
    }

    try {
      // Create config object without the webhook_url (it's stored in keyring, not config file)
      const configToSave = {
        ...config,
        alerts: {
          ...config.alerts,
          slack: {
            enabled: config.alerts.slack.enabled,
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
    reviewVolumePreference,
    payFloorUnit
  );
  const suggestedJobSources = getSetupWizardSourceReviewOptions(config);

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
                  <div className="space-y-3 p-6 bg-surface-50 rounded-lg">
                    <p className="text-surface-400 text-sm">Add at least one job title</p>
                    <div
                      className="flex flex-wrap gap-2"
                      aria-label="Common starter job titles"
                    >
                      {COMMON_STARTER_JOB_TITLES.map((title) => (
                        <Button
                          key={title}
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAddStarterTitle(title)}
                          aria-label={`Add ${title} job title`}
                        >
                          {title}
                        </Button>
                      ))}
                    </div>
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

              <SetupWizardResumeSuggestions
                state={resumeSuggestionState}
                resumeName={resumeSuggestionName}
                suggestions={resumeSkillSuggestions}
                addedSkills={config.keywords_boost}
                addedCount={addedResumeSuggestionCount}
                onRequest={handleRequestResumeSuggestions}
                onAdd={handleAddSkillSuggestion}
                onAddAll={handleAddAllVisibleSkillSuggestions}
                onSkip={handleSkipResumeSuggestions}
              />

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

              <SetupWizardPayFloorSection
                payFloorInput={payFloorInput}
                payFloorUnit={payFloorUnit}
                salaryFloorUsd={config.salary_floor_usd}
                onPayFloorChange={handleSalaryFloorChange}
                onPayNotSure={handlePayNotSure}
                onPayUnitChange={handlePayUnitChange}
              />

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
            <SetupWizardLocationStep
              cityInput={cityInput}
              config={config}
              detectedLocation={detectedLocation}
              hasSelectedWorkType={hasSelectedWorkType}
              isDetectingLocation={isDetectingLocation}
              onAddCity={handleAddCity}
              onBack={() => setStep(1)}
              onCityInputChange={setCityInput}
              onContinue={() => setStep(3)}
              onDetectLocation={handleDetectLocation}
              onLocationNotSure={handleLocationNotSure}
              onRemoveCity={handleRemoveCity}
              onUseDetectedLocation={handleUseDetectedLocation}
              onWorkTypeChange={handleWorkTypeChange}
            />
          )}

          {/* Step 3: Notifications */}
          {step === 3 && (
            <SetupWizardNotificationsStep
              config={config}
              freshnessPreference={freshnessPreference}
              reviewVolumePreference={reviewVolumePreference}
              resumeSkillSummary={resumeSkillSummary}
              searchSummary={searchSummary}
              suggestedJobSources={suggestedJobSources}
              onBack={() => setStep(2)}
              onComplete={handleComplete}
              onDesktopAlertsChange={handleDesktopAlertsChange}
              onFreshnessPreferenceChange={handleFreshnessPreferenceChange}
              onQuietAlertModeChange={handleQuietAlertModeChange}
              onReviewVolumePreferenceChange={handleReviewVolumePreferenceChange}
              onToggleJobSource={handleToggleJobSource}
            />
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
