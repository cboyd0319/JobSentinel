import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logError } from "../utils/errorUtils";

interface SetupWizardProps {
  onComplete: () => void;
}

// Validate Slack webhook URL format
const isValidSlackWebhook = (url: string): boolean => {
  if (!url) return true; // Empty is OK (optional)
  return url.startsWith("https://hooks.slack.com/services/");
};

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
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

  // Validation states
  const canProceedFromStep1 = config.title_allowlist.length > 0;
  const isValidWebhook = isValidSlackWebhook(config.alerts.slack.webhook_url);

  const handleAddTitle = (title: string) => {
    const trimmed = title.trim();
    if (trimmed && !config.title_allowlist.includes(trimmed)) {
      setConfig((prev) => ({
        ...prev,
        title_allowlist: [...prev.title_allowlist, trimmed],
      }));
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
    const sanitized = Math.max(0, parsed); // No negative salaries
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary to-primary-dark p-8">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to JobSentinel</h1>
        <p className="text-gray-600 mb-8">
          Let's set up your job search automation in a few simple steps.
        </p>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 1: What jobs are you looking for?</h2>
            <p className="text-gray-600 mb-4">Enter job titles you're interested in:</p>
            <input
              type="text"
              placeholder="e.g., Software Engineer, Product Manager"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  handleAddTitle(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {config.title_allowlist.map((title) => (
                <span
                  key={title}
                  className="px-3 py-1 bg-primary text-white rounded-full text-sm flex items-center gap-1"
                >
                  {title}
                  <button
                    onClick={() => handleRemoveTitle(title)}
                    className="ml-1 hover:text-gray-200"
                    aria-label={`Remove ${title}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {!canProceedFromStep1 && (
              <p className="mt-2 text-sm text-amber-600">
                Add at least one job title to continue
              </p>
            )}
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedFromStep1}
              className={`mt-8 w-full py-3 rounded-lg font-semibold transition ${
                canProceedFromStep1
                  ? "bg-primary text-white hover:bg-primary-dark"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 2: Location preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.location_preferences.allow_remote}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      location_preferences: {
                        ...config.location_preferences,
                        allow_remote: e.target.checked,
                      },
                    })
                  }
                  className="mr-2"
                />
                <span>Remote jobs</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.location_preferences.allow_hybrid}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      location_preferences: {
                        ...config.location_preferences,
                        allow_hybrid: e.target.checked,
                      },
                    })
                  }
                  className="mr-2"
                />
                <span>Hybrid jobs</span>
              </label>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 3: Salary</h2>
            <p className="text-gray-600 mb-4">Minimum salary (USD):</p>
            <input
              type="number"
              value={config.salary_floor_usd}
              onChange={(e) => handleSalaryChange(e.target.value)}
              min={0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="e.g., 120000"
            />
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 4: Slack notifications (optional)</h2>
            <p className="text-gray-600 mb-4">Get alerts for high-match jobs:</p>
            <input
              type="text"
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
                !isValidWebhook ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="https://hooks.slack.com/services/..."
            />
            {!isValidWebhook && (
              <p className="mt-2 text-sm text-red-600">
                Please enter a valid Slack webhook URL (starts with https://hooks.slack.com/services/)
              </p>
            )}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!isValidWebhook}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  isValidWebhook
                    ? "bg-success text-white hover:bg-green-600"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${s === step ? "bg-primary" : "bg-gray-300"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
