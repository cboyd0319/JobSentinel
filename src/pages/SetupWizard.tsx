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

interface SetupWizardProps {
  onComplete: () => void;
}

interface LocationPreferences {
  allow_remote: boolean;
  allow_hybrid: boolean;
  allow_onsite: boolean;
  cities: string[];
}

interface GhostConfig {
  stale_threshold_days: number;
  repost_threshold: number;
  min_description_length: number;
  penalize_missing_salary: boolean;
  warning_threshold: number;
  hide_threshold: number;
}

type FreshnessPreference =
  | "fresh_verified_first"
  | "balanced"
  | "wide_search";

interface FreshnessOption {
  id: FreshnessPreference;
  label: string;
  description: string;
}

type ReviewVolumePreference =
  | "focused"
  | "balanced"
  | "broad";

interface ReviewVolumeOption {
  id: ReviewVolumePreference;
  label: string;
  description: string;
}

const DEFAULT_FRESHNESS_PREFERENCE: FreshnessPreference = "fresh_verified_first";
const DEFAULT_REVIEW_VOLUME_PREFERENCE: ReviewVolumePreference = "balanced";

const FRESHNESS_GHOST_CONFIGS = {
  fresh_verified_first: {
    stale_threshold_days: 30,
    repost_threshold: 2,
    min_description_length: 200,
    penalize_missing_salary: false,
    warning_threshold: 0.2,
    hide_threshold: 0.75,
  },
  balanced: {
    stale_threshold_days: 60,
    repost_threshold: 3,
    min_description_length: 200,
    penalize_missing_salary: false,
    warning_threshold: 0.3,
    hide_threshold: 0.7,
  },
  wide_search: {
    stale_threshold_days: 120,
    repost_threshold: 5,
    min_description_length: 100,
    penalize_missing_salary: false,
    warning_threshold: 0.5,
    hide_threshold: 0.85,
  },
} satisfies Record<FreshnessPreference, GhostConfig>;

const FRESHNESS_OPTIONS: FreshnessOption[] = [
  {
    id: "fresh_verified_first",
    label: "Fresh and verified first",
    description: "Warn earlier when a posting looks old, reposted, or hard to verify.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Use normal posting-risk warnings while keeping the list broad.",
  },
  {
    id: "wide_search",
    label: "Widest search",
    description: "Show more older postings and warn only when risk looks clearer.",
  },
];

const REVIEW_VOLUME_CONFIGS = {
  focused: {
    immediate_alert_threshold: 0.92,
    remoteok_limit: 25,
    hn_hiring_limit: 50,
    weworkremotely_limit: 25,
  },
  balanced: {
    immediate_alert_threshold: 0.9,
    remoteok_limit: 50,
    hn_hiring_limit: 100,
    weworkremotely_limit: 50,
  },
  broad: {
    immediate_alert_threshold: 0.85,
    remoteok_limit: 75,
    hn_hiring_limit: 150,
    weworkremotely_limit: 75,
  },
} satisfies Record<ReviewVolumePreference, {
  immediate_alert_threshold: number;
  remoteok_limit: number;
  hn_hiring_limit: number;
  weworkremotely_limit: number;
}>;

const REVIEW_VOLUME_OPTIONS: ReviewVolumeOption[] = [
  {
    id: "focused",
    label: "Smaller list",
    description: "Show fewer jobs and focus alerts on the strongest matches.",
  },
  {
    id: "balanced",
    label: "Balanced list",
    description: "Recommended. Keep a manageable list without hiding useful roles.",
  },
  {
    id: "broad",
    label: "Broad discovery",
    description: "Show more possible roles, including weaker or adjacent matches.",
  },
];

function ghostConfigForFreshnessPreference(
  preference: FreshnessPreference
): GhostConfig {
  return { ...FRESHNESS_GHOST_CONFIGS[preference] };
}

function freshnessSummary(preference: FreshnessPreference) {
  switch (preference) {
    case "fresh_verified_first":
      return "Fresh and verified first";
    case "balanced":
      return "Balanced";
    case "wide_search":
      return "Widest search";
  }
}

function reviewVolumeSummary(preference: ReviewVolumePreference) {
  switch (preference) {
    case "focused":
      return "Smaller list";
    case "balanced":
      return "Balanced list";
    case "broad":
      return "Broad discovery";
  }
}

function applyReviewVolumePreference<T extends {
  immediate_alert_threshold?: number;
  remoteok: { limit: number };
  hn_hiring: { limit: number };
  weworkremotely: { limit: number };
}>(
  config: T,
  preference: ReviewVolumePreference
): T {
  const volume = REVIEW_VOLUME_CONFIGS[preference];
  return {
    ...config,
    immediate_alert_threshold: volume.immediate_alert_threshold,
    remoteok: {
      ...config.remoteok,
      limit: volume.remoteok_limit,
    },
    hn_hiring: {
      ...config.hn_hiring,
      limit: volume.hn_hiring_limit,
    },
    weworkremotely: {
      ...config.weworkremotely,
      limit: volume.weworkremotely_limit,
    },
  };
}

// Step 0 is profile selection, then simplified flow
const STEPS = [
  { id: 0, title: "Career Path", description: "What kind of work are you looking for?" },
  { id: 1, title: "Review & Edit", description: "Customize your job search" },
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
  const toast = useToast();
  const [stepAnnouncement, setStepAnnouncement] = useState("");
  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const [detectedLocation, setDetectedLocation] = useState<LocationInfo | null>(
    () => readCachedDetectedLocation()
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [config, setConfig] = useState({
    title_allowlist: [] as string[],
    title_blocklist: [] as string[],
    keywords_boost: [] as string[],
    keywords_exclude: [] as string[],
    location_preferences: {
      allow_remote: true,
      allow_hybrid: false,
      allow_onsite: false,
      cities: [] as string[],
    },
    salary_floor_usd: 0,
    alerts: {
      slack: {
        enabled: false,
        webhook_url: "",
      },
      desktop: {
        enabled: true,
        play_sound: true,
        show_when_focused: false,
      },
    },
    immediate_alert_threshold:
      REVIEW_VOLUME_CONFIGS[DEFAULT_REVIEW_VOLUME_PREFERENCE].immediate_alert_threshold,
    ghost_config: ghostConfigForFreshnessPreference(DEFAULT_FRESHNESS_PREFERENCE),
    // Keep tech-heavy sources off until the saved search calls for them.
    remoteok: {
      enabled: false,
      tags: [] as string[],
      limit: 50,
    },
    hn_hiring: {
      enabled: false,
      remote_only: false,
      limit: 100,
    },
    weworkremotely: {
      enabled: false,
      limit: 50,
    },
  });

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
      setConfig({
        title_allowlist: [],
        title_blocklist: [],
        keywords_boost: [],
        keywords_exclude: [],
        location_preferences: {
          allow_remote: true,
          allow_hybrid: false,
          allow_onsite: false,
          cities: [],
        },
        salary_floor_usd: 0,
        alerts: {
          slack: {
            enabled: false,
            webhook_url: "",
          },
          desktop: {
            enabled: true,
            play_sound: true,
            show_when_focused: false,
          },
        },
        immediate_alert_threshold:
          REVIEW_VOLUME_CONFIGS[DEFAULT_REVIEW_VOLUME_PREFERENCE].immediate_alert_threshold,
        ghost_config: ghostConfigForFreshnessPreference(DEFAULT_FRESHNESS_PREFERENCE),
        // Keep tech-heavy sources off until the saved search calls for them.
        remoteok: {
          enabled: false,
          tags: [],
          limit: 50,
        },
        hn_hiring: {
          enabled: false,
          remote_only: false,
          limit: 100,
        },
        weworkremotely: {
          enabled: false,
          limit: 50,
        },
      });
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
        logContext: "Complete setup wizard"
      });
      toast.success("Setup complete", "Your saved search is ready.");
      onComplete();
    } catch {
      // Error already logged and shown to user
    }
  };

  const searchSummary = {
    titles: config.title_allowlist.join(", "),
    wantedWork: formatListSummary(
      config.keywords_boost,
      "No extra work preferences yet"
    ),
    avoidedWork: formatListSummary(
      config.keywords_exclude,
      "Nothing selected"
    ),
    location: formatLocationSummary(config.location_preferences),
    freshness: freshnessSummary(freshnessPreference),
    reviewVolume: reviewVolumeSummary(reviewVolumePreference),
    pay:
      config.salary_floor_usd > 0
        ? `At least $${config.salary_floor_usd.toLocaleString()}/year`
        : "Show jobs even when pay is missing or not listed",
  };

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
                {selectedProfile ? "Continue with This Path" : "Continue with My Own Search"}
              </Button>
            </div>
          )}

          {/* Step 1: Review & Edit Job Titles + Skills (combined) */}
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

              {/* Pay floor */}
              <div>
                <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
                  <PayIcon /> Pay Floor
                </h3>
                <p className="mb-3 text-sm text-surface-500">
                  Optional. Add the minimum yearly pay that would make a job worth considering.
                </p>
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
                {config.salary_floor_usd > 0 && (
                  <p className="mt-2 text-sm text-surface-600">
                    JobSentinel will warn when listed pay is below{" "}
                    <span className="font-semibold text-surface-800">
                      ${config.salary_floor_usd.toLocaleString()}/year
                    </span>
                    .
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
                        Looks up your approximate city from your internet
                        address. Not saved unless added.
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
                  Get notified when JobSentinel finds strong matches for your saved search
                </p>
                
                <div className="mb-6 rounded-lg border-2 border-surface-200 p-4">
                  <p className="font-medium text-surface-700">Alerts</p>
                  <p className="mt-1 text-sm text-surface-500">
                    Start with desktop alerts now. Email or chat alerts can be added later in Settings.
                  </p>
                </div>
              </div>

              <section
                className="mb-6 border-t border-surface-200 pt-5"
                aria-labelledby="setup-search-summary-title"
              >
                <h3
                  id="setup-search-summary-title"
                  className="mb-4 flex items-center gap-2 font-semibold text-surface-800"
                >
                  <CheckIcon className="w-5 h-5 text-sentinel-600" />
                  Review your search
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt className="font-medium text-surface-600">Look for</dt>
                    <dd className="text-surface-800">{searchSummary.titles}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt className="font-medium text-surface-600">Show more</dt>
                    <dd className="text-surface-800">{searchSummary.wantedWork}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt className="font-medium text-surface-600">Rank lower</dt>
                    <dd className="text-surface-800">{searchSummary.avoidedWork}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt className="font-medium text-surface-600">Location</dt>
                    <dd className="text-surface-800">{searchSummary.location}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt className="font-medium text-surface-600">Freshness</dt>
                    <dd className="text-surface-800">{searchSummary.freshness}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt className="font-medium text-surface-600">Review list</dt>
                    <dd className="text-surface-800">{searchSummary.reviewVolume}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <dt className="font-medium text-surface-600">Pay</dt>
                    <dd className="text-surface-800">{searchSummary.pay}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-surface-500">
                  JobSentinel uses these answers to rank jobs. You can change them later.
                </p>
              </section>

              <div className="p-4 bg-surface-50 rounded-lg mb-6">
                <p className="text-sm text-surface-600">
                  <span className="font-medium text-surface-700">Your privacy matters:</span> JobSentinel 
                  saves your search on this computer. It only contacts job sources or alert services
                  needed for features you turn on.
                </p>
              </div>

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

function formatListSummary(items: string[], emptyText: string) {
  return items.length > 0 ? items.join(", ") : emptyText;
}

function formatLocationSummary(locationPreferences: LocationPreferences) {
  const workTypes = [
    locationPreferences.allow_remote ? "remote" : null,
    locationPreferences.allow_hybrid ? "hybrid" : null,
    locationPreferences.allow_onsite ? "on-site" : null,
  ].filter(Boolean);

  const workTypeSummary = workTypes.length > 0 ? workTypes.join(", ") : "no work type selected";
  const citySummary =
    locationPreferences.cities.length > 0
      ? ` near ${locationPreferences.cities.join(", ")}`
      : "";

  return `${workTypeSummary}${citySummary}`;
}

// Location option component
interface LocationOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
}

function LocationOption({ label, description, checked, onChange, icon }: LocationOptionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      className={`
        flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-150
        ${checked
          ? "border-sentinel-500 bg-sentinel-50"
          : "border-surface-200 hover:border-surface-300"
        }
      `}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="checkbox"
      aria-checked={checked}
      aria-label={`${label}: ${description}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center
        ${checked ? "bg-sentinel-500 text-white" : "bg-surface-100 text-surface-500"}
      `}>
        {icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${checked ? "text-sentinel-700" : "text-surface-700"}`}>
          {label}
        </p>
        <p className="text-sm text-surface-500">{description}</p>
      </div>
      <div className={`
        w-6 h-6 rounded-full border-2 flex items-center justify-center
        ${checked ? "border-sentinel-500 bg-sentinel-500" : "border-surface-300"}
      `}>
        {checked && <CheckIcon className="w-4 h-4 text-white" />}
      </div>
    </label>
  );
}

// Icons
function SentinelIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function AvoidIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.72 6.72a7.5 7.5 0 1010.56 10.56M6.72 6.72l10.56 10.56M6.72 6.72a7.5 7.5 0 0110.56 10.56" />
    </svg>
  );
}

function PayIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m3-9.5A3.5 3.5 0 0012 7a3.5 3.5 0 000 7 3.5 3.5 0 010 7 3.5 3.5 0 01-3-1.5" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function OfficeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  );
}
