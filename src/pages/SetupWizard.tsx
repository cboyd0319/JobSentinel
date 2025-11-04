import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

interface SetupWizardProps {
  onComplete: () => void;
}

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

  const handleComplete = async () => {
    try {
      await invoke("complete_setup", { config });
      onComplete();
    } catch (error) {
      console.error("Setup failed:", error);
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
                  setConfig({
                    ...config,
                    title_allowlist: [...config.title_allowlist, e.currentTarget.value],
                  });
                  e.currentTarget.value = "";
                }
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {config.title_allowlist.map((title, i) => (
                <span key={i} className="px-3 py-1 bg-primary text-white rounded-full text-sm">
                  {title}
                </span>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="mt-8 w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
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
              onChange={(e) => setConfig({ ...config, salary_floor_usd: parseInt(e.target.value) || 0 })}
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
                setConfig({
                  ...config,
                  alerts: {
                    slack: {
                      enabled: e.target.value.length > 0,
                      webhook_url: e.target.value,
                    },
                  },
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="https://hooks.slack.com/services/..."
            />
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 bg-success text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition"
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
