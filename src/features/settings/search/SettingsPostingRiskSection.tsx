import { Button } from "../../../components/Button";
import { HelpIcon } from "../../../components/HelpIcon";
import { Input } from "../../../components/Input";
import {
  GHOST_PRESETS,
  GHOST_PRESET_DESCRIPTIONS,
  GHOST_PRESET_LABELS,
  formatPostingRiskHideLabel,
  formatPostingRiskWarningLabel,
  type GhostConfig,
  type GhostPreset,
  type GhostPresetSelection,
} from "../config/SettingsConfig";

interface SettingsPostingRiskSectionProps {
  ghostConfig: GhostConfig | null;
  ghostConfigLoading: boolean;
  ghostPreset: GhostPresetSelection;
  onGhostConfigChange: (config: GhostConfig) => void;
  onGhostPresetChange: (preset: GhostPresetSelection) => void;
  onReset: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
}

const GHOST_PRESET_CONFIGS: Record<GhostPreset, GhostConfig> = {
  lenient: {
    stale_threshold_days: 120,
    repost_threshold: 5,
    min_description_length: 100,
    penalize_missing_salary: false,
    warning_threshold: 0.5,
    hide_threshold: 0.85,
  },
  balanced: {
    stale_threshold_days: 60,
    repost_threshold: 3,
    min_description_length: 200,
    penalize_missing_salary: false,
    warning_threshold: 0.3,
    hide_threshold: 0.7,
  },
  strict: {
    stale_threshold_days: 30,
    repost_threshold: 2,
    min_description_length: 300,
    penalize_missing_salary: true,
    warning_threshold: 0.2,
    hide_threshold: 0.5,
  },
};

export function SettingsPostingRiskSection({
  ghostConfig,
  ghostConfigLoading,
  ghostPreset,
  onGhostConfigChange,
  onGhostPresetChange,
  onReset,
  onSave,
}: SettingsPostingRiskSectionProps) {
  const applyGhostPreset = (preset: GhostPreset) => {
    onGhostPresetChange(preset);
    onGhostConfigChange({ ...GHOST_PRESET_CONFIGS[preset] });
  };

  return (
    <section className="mb-6">
      <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
        Posting Risk and Freshness
        <HelpIcon text="Choose how strongly JobSentinel warns about stale, reposted, or postings that need review." />
      </h3>
      {ghostConfig && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Freshness behavior:
            </span>
            <div className="flex flex-wrap gap-2">
              {GHOST_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyGhostPreset(preset)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    ghostPreset === preset
                      ? preset === "lenient"
                        ? "bg-green-500 text-white"
                        : preset === "balanced"
                          ? "bg-sentinel-500 text-white"
                          : "bg-red-500 text-white"
                      : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
                  }`}
                >
                  {GHOST_PRESET_LABELS[preset]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onGhostPresetChange("custom")}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  ghostPreset === "custom"
                    ? "bg-surface-600 text-white"
                    : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
                }`}
              >
                Custom
              </button>
            </div>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400 -mt-2">
            {GHOST_PRESET_DESCRIPTIONS[ghostPreset]}
          </p>

          {ghostPreset === "custom" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Warn when a posting is older than"
                    type="number"
                    min="1"
                    max="365"
                    value={ghostConfig.stale_threshold_days}
                    onChange={(e) =>
                      onGhostConfigChange({
                        ...ghostConfig,
                        stale_threshold_days: parseInt(e.target.value) || 60,
                      })
                    }
                    hint="Older postings get a stale-posting warning"
                  />
                </div>
                <div>
                  <Input
                    label="Warn after a posting appears this many times"
                    type="number"
                    min="1"
                    max="20"
                    value={ghostConfig.repost_threshold}
                    onChange={(e) =>
                      onGhostConfigChange({
                        ...ghostConfig,
                        repost_threshold: parseInt(e.target.value) || 3,
                      })
                    }
                    hint="Repeated postings get an earlier review warning"
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Warn when a job description is very short"
                  type="number"
                  min="50"
                  max="1000"
                  value={ghostConfig.min_description_length}
                  onChange={(e) =>
                    onGhostConfigChange({
                      ...ghostConfig,
                      min_description_length: parseInt(e.target.value) || 200,
                    })
                  }
                  hint="Shorter descriptions get a low-detail warning"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ghostConfig.penalize_missing_salary}
                      onChange={(e) =>
                        onGhostConfigChange({
                          ...ghostConfig,
                          penalize_missing_salary: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                      Flag jobs without salary info
                    </span>
                  </label>
                  <HelpIcon
                    text="Many legitimate jobs don't list pay. Turn this on when missing pay should trigger an earlier review warning."
                    position="right"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="posting-risk-warning-threshold"
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
                  >
                    Show posting-risk warning:{" "}
                    {formatPostingRiskWarningLabel(
                      ghostConfig.warning_threshold,
                    )}
                  </label>
                  <input
                    id="posting-risk-warning-threshold"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ghostConfig.warning_threshold}
                    aria-valuetext={formatPostingRiskWarningLabel(
                      ghostConfig.warning_threshold,
                    )}
                    onChange={(e) =>
                      onGhostConfigChange({
                        ...ghostConfig,
                        warning_threshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-sentinel-500"
                  />
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                    Move left to warn sooner. Move right to warn later.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="posting-risk-hide-threshold"
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
                  >
                    Hide postings that need review:{" "}
                    {formatPostingRiskHideLabel(ghostConfig.hide_threshold)}
                  </label>
                  <input
                    id="posting-risk-hide-threshold"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ghostConfig.hide_threshold}
                    aria-valuetext={formatPostingRiskHideLabel(
                      ghostConfig.hide_threshold,
                    )}
                    onChange={(e) =>
                      onGhostConfigChange({
                        ...ghostConfig,
                        hide_threshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                    Move left to hide more flagged jobs by default. Move right
                    to keep more visible.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={onReset}
              loading={ghostConfigLoading}
              className="flex-1"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={onSave}
              loading={ghostConfigLoading}
              className="flex-1"
            >
              Save Settings
            </Button>
          </div>
        </div>
      )}
      {!ghostConfig && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
          <div
            className="flex items-center justify-center py-4"
            role="status"
            aria-label="Loading posting risk settings"
          >
            <div
              className="animate-spin w-6 h-6 border-4 border-sentinel-500 border-t-transparent rounded-full"
              aria-hidden="true"
            />
            <span className="sr-only">Loading settings...</span>
          </div>
        </div>
      )}
    </section>
  );
}
