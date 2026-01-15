import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Badge, Card } from "../components";
import { logError } from "../utils/errorUtils";

interface SetupWizardProps {
  onComplete: () => void;
}

const isValidSlackWebhook = (url: string): boolean => {
  if (!url) return true;
  return url.startsWith("https://hooks.slack.com/services/");
};

const STEPS = [
  { id: 1, title: "Job Titles", description: "What roles are you looking for?" },
  { id: 2, title: "Location", description: "Where do you want to work?" },
  { id: 3, title: "Salary", description: "What's your minimum?" },
  { id: 4, title: "Notifications", description: "Stay informed (optional)" },
];

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [titleInput, setTitleInput] = useState("");
  const [config, setConfig] = useState({
    title_allowlist: [] as string[],
    keywords_boost: [] as string[],
    location_preferences: {
      allow_remote: true,
      allow_hybrid: false,
      allow_onsite: false,
    },
    salary_floor_usd: 0,
    alerts: {
      slack: {
        enabled: false,
        webhook_url: "",
      },
    },
  });

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

  const handleSalaryChange = (value: string) => {
    const parsed = parseInt(value) || 0;
    const sanitized = Math.max(0, parsed);
    setConfig((prev) => ({ ...prev, salary_floor_usd: sanitized }));
  };

  const handleComplete = async () => {
    try {
      await invoke("complete_setup", { config });
      onComplete();
    } catch (error) {
      logError("Setup failed:", error);
      alert("Setup failed. Please try again.");
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
                    s.id
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
            <p className="text-surface-400 text-sm">Step {step} of {STEPS.length}</p>
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
              {STEPS[step - 1].title}
            </h1>
            <p className="text-surface-500">
              {STEPS[step - 1].description}
            </p>
          </div>

          {/* Step 1: Job Titles */}
          {step === 1 && (
            <div className="animate-slide-up">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="e.g., Software Engineer"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTitle();
                    }
                  }}
                  leftIcon={<SearchIcon />}
                />
                <Button onClick={handleAddTitle} disabled={!titleInput.trim()}>
                  Add
                </Button>
              </div>

              {config.title_allowlist.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-6 p-4 bg-surface-50 rounded-lg min-h-[80px]">
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
                <div className="flex items-center justify-center p-8 bg-surface-50 rounded-lg mb-6">
                  <p className="text-surface-400 text-sm">
                    Add job titles you're interested in
                  </p>
                </div>
              )}

              {!canProceedFromStep1 && (
                <p className="text-center text-sm text-amber-600 mb-4">
                  Add at least one job title to continue
                </p>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedFromStep1}
                className="w-full"
                size="lg"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="animate-slide-up">
              <div className="space-y-3 mb-8">
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

          {/* Step 3: Salary */}
          {step === 3 && (
            <div className="animate-slide-up">
              <div className="mb-8">
                <Input
                  type="number"
                  label="Minimum Annual Salary (USD)"
                  value={config.salary_floor_usd || ""}
                  onChange={(e) => handleSalaryChange(e.target.value)}
                  placeholder="e.g., 120000"
                  leftIcon={<DollarIcon />}
                  hint="Jobs below this salary will be ranked lower"
                />

                {config.salary_floor_usd > 0 && (
                  <div className="mt-4 p-4 bg-sentinel-50 rounded-lg">
                    <p className="text-sm text-sentinel-700">
                      Looking for jobs paying at least{" "}
                      <span className="font-semibold font-mono">
                        ${config.salary_floor_usd.toLocaleString()}
                      </span>
                      /year
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1" size="lg">
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1" size="lg">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Notifications */}
          {step === 4 && (
            <div className="animate-slide-up">
              <div className="mb-8">
                <Input
                  label="Slack Webhook URL (Optional)"
                  value={config.alerts.slack.webhook_url}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      alerts: {
                        slack: {
                          enabled: e.target.value.length > 0 && isValidSlackWebhook(e.target.value),
                          webhook_url: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  leftIcon={<SlackIcon />}
                  error={!isValidWebhook ? "Please enter a valid Slack webhook URL" : undefined}
                  hint="Get notified when high-match jobs are found"
                />
              </div>

              <div className="p-4 bg-surface-50 rounded-lg mb-8">
                <p className="text-sm text-surface-600">
                  <span className="font-medium text-surface-700">Privacy note:</span> JobSentinel 
                  stores all data locally. Your preferences never leave your device unless you 
                  configure external notifications.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(3)} className="flex-1" size="lg">
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!isValidWebhook}
                  variant="success"
                  className="flex-1"
                  size="lg"
                >
                  Complete Setup
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function OfficeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}
