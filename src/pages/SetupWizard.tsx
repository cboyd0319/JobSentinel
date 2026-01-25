import { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { CareerProfileSelector } from "../components/CareerProfileSelector";
import { useToast } from "../contexts";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
import { CAREER_PROFILES, getProfileById, profileToConfig } from "../utils/profiles";

interface SetupWizardProps {
  onComplete: () => void;
}

const isValidSlackWebhook = (url: string): boolean => {
  if (!url) return true;
  return url.startsWith("https://hooks.slack.com/services/");
};

// Step 0 is profile selection, then simplified flow
const STEPS = [
  { id: 0, title: "Career Path", description: "What kind of work are you looking for?" },
  { id: 1, title: "Review & Edit", description: "Customize your job search" },
  { id: 2, title: "Location", description: "Where do you want to work?" },
  { id: 3, title: "Notifications", description: "Stay informed (optional)" },
];

// Popular suggestions are no longer needed - profiles provide pre-populated data

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0); // Start at step 0 (profile selection)
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const toast = useToast();
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
    // Enable free scrapers by default (no auth required, work out of the box)
    remoteok: {
      enabled: true,
      tags: [] as string[],
      limit: 50,
    },
    hn_hiring: {
      enabled: true,
      remote_only: false,
      limit: 100,
    },
    weworkremotely: {
      enabled: true,
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
        setConfig(prev => ({
          ...prev,
          ...profileConfig,
        }));
      }
    } else {
      // Reset to empty for custom setup
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
        // Enable free scrapers by default
        remoteok: {
          enabled: true,
          tags: [],
          limit: 50,
        },
        hn_hiring: {
          enabled: true,
          remote_only: false,
          limit: 100,
        },
        weworkremotely: {
          enabled: true,
          limit: 50,
        },
      });
    }
  };

  const canProceedFromStep1 = config.title_allowlist.length > 0;
  const isValidWebhook = isValidSlackWebhook(config.alerts.slack.webhook_url);

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
    try {
      // Store Slack webhook in secure storage if provided
      const webhookUrl = config.alerts.slack.webhook_url;
      if (webhookUrl && isValidSlackWebhook(webhookUrl)) {
        await safeInvoke("store_credential", { key: "slack_webhook", value: webhookUrl }, {
          logContext: "Store Slack webhook credential"
        });
      }

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
        logContext: "Complete setup wizard"
      });
      toast.success("Setup complete!", "Let's find you some great jobs");
      onComplete();
    } catch {
      // Error already logged and shown to user
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sentinel-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sentinel-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl animate-fade-in">
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
              {STEPS[step].title}
            </h1>
            <p className="text-surface-500">
              {STEPS[step].description}
            </p>
          </div>

          {/* Step 0: Career Profile Selection */}
          {step === 0 && (
            <div className="animate-slide-up">
              <CareerProfileSelector
                selectedProfile={selectedProfile}
                onSelectProfile={handleProfileSelect}
              />

              <Button
                onClick={() => setStep(1)}
                disabled={!selectedProfile}
                className="w-full mt-6"
                size="lg"
              >
                {selectedProfile ? "Continue with This Profile" : "Continue with Custom Setup"}
              </Button>
            </div>
          )}

          {/* Step 1: Review & Edit Job Titles + Skills (combined) */}
          {step === 1 && (
            <div className="animate-slide-up space-y-6">
              {/* Pre-populated indicator */}
              {selectedProfile && (
                <div className="p-3 bg-sentinel-50 border border-sentinel-200 rounded-lg text-sm text-sentinel-700">
                  Pre-filled from your <strong>{CAREER_PROFILES.find(p => p.id === selectedProfile)?.name}</strong> profile. Edit as needed.
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
                  <SparkleIcon /> Skills & Keywords
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

              {/* Salary indicator (pre-populated from profile) */}
              {config.salary_floor_usd > 0 && (
                <div className="p-3 bg-surface-50 rounded-lg">
                  <p className="text-sm text-surface-600">
                    Looking for jobs paying at least{" "}
                    <span className="font-semibold text-surface-800">
                      ${config.salary_floor_usd.toLocaleString()}/year
                    </span>
                  </p>
                </div>
              )}

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
            <div className="animate-slide-up">
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
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="e.g., San Francisco, New York"
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
                <Button onClick={() => setStep(3)} className="flex-1" size="lg">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Notifications */}
          {step === 3 && (
            <div className="animate-slide-up">
              <div className="mb-6">
                <p className="text-surface-600 mb-4 text-center">
                  Get notified when we find great matches for you
                </p>
                
                {/* Slack notification info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-surface-200">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <SlackIcon />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-700">Slack</p>
                      <p className="text-sm text-surface-500">Get alerts in your Slack workspace</p>
                    </div>
                    {config.alerts.slack.enabled && config.alerts.slack.webhook_url.length > 0 && (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        Enabled
                      </span>
                    )}
                  </div>
                </div>

                {/* Slack webhook input */}
                <Input
                  label="Slack Webhook URL"
                  value={config.alerts.slack.webhook_url}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      alerts: {
                        ...prev.alerts,
                        slack: {
                          enabled: e.target.value.length > 0 && isValidSlackWebhook(e.target.value),
                          webhook_url: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  leftIcon={<SlackIcon />}
                  error={config.alerts.slack.webhook_url && !isValidWebhook ? "Please enter a valid Slack webhook URL" : undefined}
                  hint="Don't have Slack? No problem! Skip this and check the app directly."
                />
              </div>

              <div className="p-4 bg-surface-50 rounded-lg mb-6">
                <p className="text-sm text-surface-600">
                  <span className="font-medium text-surface-700">Your privacy matters:</span> JobSentinel 
                  stores all your data on your computer. Nothing is sent anywhere unless you set up notifications.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1" size="lg">
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={config.alerts.slack.webhook_url.length > 0 && !isValidWebhook}
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
          Privacy-first job search automation
        </p>
      </div>
    </div>
  );
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
  return (
    <label
      className={`
        flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-150
        ${checked 
          ? "border-sentinel-500 bg-sentinel-50" 
          : "border-surface-200 hover:border-surface-300"
        }
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
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

function SlackIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}
