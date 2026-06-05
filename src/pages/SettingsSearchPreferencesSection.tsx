import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { HelpIcon } from "../components/HelpIcon";
import { Input } from "../components/Input";
import type { LocationInfo } from "../utils/locationDetection";
import type { Config } from "./SettingsConfig";
import { RefreshIcon, SettingsSymbol } from "./SettingsIcons";

interface SettingsSearchPreferencesSectionProps {
  config: Config;
  titleInput: string;
  blockedTitleInput: string;
  skillInput: string;
  excludeKeywordInput: string;
  cityInput: string;
  whitelistCompanyInput: string;
  blacklistCompanyInput: string;
  detectedLocation: LocationInfo | null;
  isDetectingLocation: boolean;
  onConfigChange: (config: Config) => void;
  onTitleInputChange: (value: string) => void;
  onBlockedTitleInputChange: (value: string) => void;
  onSkillInputChange: (value: string) => void;
  onExcludeKeywordInputChange: (value: string) => void;
  onCityInputChange: (value: string) => void;
  onWhitelistCompanyInputChange: (value: string) => void;
  onBlacklistCompanyInputChange: (value: string) => void;
  onAddTitle: () => void;
  onRemoveTitle: (title: string) => void;
  onAddBlockedTitle: () => void;
  onRemoveBlockedTitle: (title: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skill: string) => void;
  onAddExcludeKeyword: () => void;
  onRemoveExcludeKeyword: (keyword: string) => void;
  onDetectLocation: () => void | Promise<void>;
  onUseDetectedLocation: () => void;
  onAddCity: () => void;
  onRemoveCity: (city: string) => void;
  onAddWhitelistCompany: () => void;
  onRemoveWhitelistCompany: (company: string) => void;
  onAddBlacklistCompany: () => void;
  onRemoveBlacklistCompany: (company: string) => void;
}

export function SettingsSearchPreferencesSection({
  config,
  titleInput,
  blockedTitleInput,
  skillInput,
  excludeKeywordInput,
  cityInput,
  whitelistCompanyInput,
  blacklistCompanyInput,
  detectedLocation,
  isDetectingLocation,
  onConfigChange,
  onTitleInputChange,
  onBlockedTitleInputChange,
  onSkillInputChange,
  onExcludeKeywordInputChange,
  onCityInputChange,
  onWhitelistCompanyInputChange,
  onBlacklistCompanyInputChange,
  onAddTitle,
  onRemoveTitle,
  onAddBlockedTitle,
  onRemoveBlockedTitle,
  onAddSkill,
  onRemoveSkill,
  onAddExcludeKeyword,
  onRemoveExcludeKeyword,
  onDetectLocation,
  onUseDetectedLocation,
  onAddCity,
  onRemoveCity,
  onAddWhitelistCompany,
  onRemoveWhitelistCompany,
  onAddBlacklistCompany,
  onRemoveBlacklistCompany,
}: SettingsSearchPreferencesSectionProps) {
  const detectedLocationLabel = detectedLocation
    ? `${detectedLocation.city}, ${detectedLocation.region}`
    : "";

  return (
    <>
      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Job Titles You Want
          <HelpIcon text="Jobs with these titles will appear in your feed. Add titles like 'Marketing Manager' or 'SEO Specialist'." />
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a job title..."
            value={titleInput}
            onChange={(e) => onTitleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTitle();
              }
            }}
          />
          <Button onClick={onAddTitle} disabled={!titleInput.trim()}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.title_allowlist.map((title) => (
            <Badge
              key={title}
              variant="sentinel"
              removable
              onRemove={() => onRemoveTitle(title)}
            >
              {title}
            </Badge>
          ))}
          {config.title_allowlist.length === 0 && (
            <p className="text-sm text-surface-400">No job titles added</p>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Job Titles to Avoid
          <HelpIcon text="Jobs with these titles will be filtered out. Use this for titles like 'Intern' or 'Entry Level' if you're looking for senior roles." />
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a title to block..."
            value={blockedTitleInput}
            onChange={(e) => onBlockedTitleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddBlockedTitle();
              }
            }}
          />
          <Button
            onClick={onAddBlockedTitle}
            disabled={!blockedTitleInput.trim()}
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.title_blocklist.map((title) => (
            <Badge
              key={title}
              variant="danger"
              removable
              onRemove={() => onRemoveBlockedTitle(title)}
            >
              {title}
            </Badge>
          ))}
          {config.title_blocklist.length === 0 && (
            <p className="text-sm text-surface-400">No blocked titles</p>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Your Skills
          <HelpIcon text="Jobs that mention these skills will rank higher. Add skills from your resume like 'Project Management', 'Customer Service', or 'Scheduling'." />
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => onSkillInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddSkill();
              }
            }}
          />
          <Button onClick={onAddSkill} disabled={!skillInput.trim()}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.keywords_boost.map((skill) => (
            <Badge
              key={skill}
              variant="alert"
              removable
              onRemove={() => onRemoveSkill(skill)}
            >
              {skill}
            </Badge>
          ))}
          {config.keywords_boost.length === 0 && (
            <p className="text-sm text-surface-400">No skills added</p>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Search Words to Avoid
          <HelpIcon text="Jobs mentioning these words will rank lower. Use this for work you do not want, like 'Sales' or 'Travel Required'." />
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a word or phrase to avoid..."
            value={excludeKeywordInput}
            onChange={(e) => onExcludeKeywordInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddExcludeKeyword();
              }
            }}
          />
          <Button
            onClick={onAddExcludeKeyword}
            disabled={!excludeKeywordInput.trim()}
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.keywords_exclude.map((keyword) => (
            <Badge
              key={keyword}
              variant="danger"
              removable
              onRemove={() => onRemoveExcludeKeyword(keyword)}
            >
              {keyword}
            </Badge>
          ))}
          {config.keywords_exclude.length === 0 && (
            <p className="text-sm text-surface-400">
              No search words to avoid
            </p>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Where You Want to Work
          <HelpIcon text="Choose your work style preferences. If you select hybrid or on-site, you can add specific cities." />
        </h3>
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.location_preferences.allow_remote}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  location_preferences: {
                    ...config.location_preferences,
                    allow_remote: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
            />
            <span className="text-surface-700 dark:text-surface-300">
              Remote
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.location_preferences.allow_hybrid}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  location_preferences: {
                    ...config.location_preferences,
                    allow_hybrid: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
            />
            <span className="text-surface-700 dark:text-surface-300">
              Hybrid
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.location_preferences.allow_onsite}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  location_preferences: {
                    ...config.location_preferences,
                    allow_onsite: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
            />
            <span className="text-surface-700 dark:text-surface-300">
              On-site
            </span>
          </label>
        </div>

        {(config.location_preferences.allow_hybrid ||
          config.location_preferences.allow_onsite) && (
          <>
            {detectedLocation && (
              <div className="mb-3 p-3 bg-sentinel-50 dark:bg-sentinel-950 border border-sentinel-200 dark:border-sentinel-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SettingsSymbol icon="location" className="w-4 h-4" />
                    <span className="text-sm text-sentinel-700 dark:text-sentinel-300">
                      Detected: <strong>{detectedLocationLabel}</strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onUseDetectedLocation}
                    disabled={config.location_preferences.cities.includes(
                      detectedLocationLabel,
                    )}
                  >
                    {config.location_preferences.cities.includes(
                      detectedLocationLabel,
                    )
                      ? "Added"
                      : "Use This"}
                  </Button>
                </div>
              </div>
            )}
            {!detectedLocation && (
              <div className="mb-3 p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onDetectLocation}
                    loading={isDetectingLocation}
                    loadingText="Detecting..."
                    aria-describedby="settings-location-detection-privacy"
                    icon={
                      <SettingsSymbol
                        icon="location"
                        className="w-4 h-4"
                      />
                    }
                  >
                    Detect location
                  </Button>
                </div>
                <p
                  id="settings-location-detection-privacy"
                  className="mt-2 text-xs text-surface-500 dark:text-surface-400"
                >
                  Only when you use this button, JobSentinel asks an outside
                  location lookup service for your approximate city from your
                  internet address. Nothing is saved unless you add the city.
                </p>
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add a city..."
                value={cityInput}
                onChange={(e) => onCityInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddCity();
                  }
                }}
              />
              <Button onClick={onAddCity} disabled={!cityInput.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.location_preferences.cities.map((city) => (
                <Badge
                  key={city}
                  variant="surface"
                  removable
                  onRemove={() => onRemoveCity(city)}
                >
                  {city}
                </Badge>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Salary Preferences
          <HelpIcon text="Set your minimum and target salary. Job matches show whether listed pay is close to your target." />
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Minimum Acceptable Salary
            </label>
            <Input
              type="number"
              value={config.salary_floor_usd || ""}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  salary_floor_usd: parseInt(e.target.value) || 0,
                })
              }
              placeholder="e.g., 60000"
              hint="The lowest salary you'd consider"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Target Salary
            </label>
            <Input
              type="number"
              value={config.salary_target_usd || ""}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  salary_target_usd: parseInt(e.target.value) || undefined,
                })
              }
              placeholder="e.g., 100000"
              hint="Your ideal salary - jobs at or above this show stronger pay fit"
            />
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Company Preferences
          <HelpIcon text="Add companies you love (they'll rank higher) or companies you want to avoid (they'll rank lower)." />
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Preferred Companies
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add a company you'd love to work for..."
                value={whitelistCompanyInput}
                onChange={(e) =>
                  onWhitelistCompanyInputChange(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddWhitelistCompany();
                  }
                }}
              />
              <Button
                onClick={onAddWhitelistCompany}
                disabled={!whitelistCompanyInput.trim()}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.company_whitelist?.map((company) => (
                <Badge
                  key={company}
                  variant="sentinel"
                  removable
                  onRemove={() => onRemoveWhitelistCompany(company)}
                >
                  {company}
                </Badge>
              ))}
              {(!config.company_whitelist ||
                config.company_whitelist.length === 0) && (
                <p className="text-sm text-surface-400">
                  No preferred companies
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Companies to Avoid
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add a company you don't want to see..."
                value={blacklistCompanyInput}
                onChange={(e) =>
                  onBlacklistCompanyInputChange(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddBlacklistCompany();
                  }
                }}
              />
              <Button
                onClick={onAddBlacklistCompany}
                disabled={!blacklistCompanyInput.trim()}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.company_blacklist?.map((company) => (
                <Badge
                  key={company}
                  variant="danger"
                  removable
                  onRemove={() => onRemoveBlacklistCompany(company)}
                >
                  {company}
                </Badge>
              ))}
              {(!config.company_blacklist ||
                config.company_blacklist.length === 0) && (
                <p className="text-sm text-surface-400">
                  No blocked companies
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Auto-Search
          <HelpIcon text="Turn this on to check for new postings while JobSentinel is open." />
        </h3>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RefreshIcon className="w-5 h-5 text-sentinel-500" />
              <span className="font-medium text-surface-800 dark:text-surface-200">
                Check selected job sites on schedule
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_refresh?.enabled ?? false}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    auto_refresh: {
                      ...config.auto_refresh,
                      enabled: e.target.checked,
                      interval_minutes:
                        config.auto_refresh?.interval_minutes ?? 30,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
            </label>
          </div>

          {config.auto_refresh?.enabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-surface-700 dark:text-surface-300">
                  Refresh every:
                </label>
                <select
                  value={config.auto_refresh?.interval_minutes ?? 30}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      auto_refresh: {
                        ...config.auto_refresh,
                        enabled: true,
                        interval_minutes: parseInt(e.target.value),
                      },
                    })
                  }
                  className="px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                >
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                JobSentinel checks for new jobs at this interval while the app
                is open.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
