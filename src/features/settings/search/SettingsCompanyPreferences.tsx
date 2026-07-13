import { Badge } from "../../../ui/Badge";
import { Button } from "../../../ui/Button";
import { HelpIcon } from "../../../ui/HelpIcon";
import { Input } from "../../../ui/Input";
import type { Config } from "../config/SettingsConfig";

interface SettingsCompanyPreferencesProps {
  blockedCompanyInput: string;
  config: Config;
  onAddBlockedCompany: () => void;
  onAddPreferredCompany: () => void;
  onBlockedCompanyInputChange: (value: string) => void;
  onRemoveBlockedCompany: (company: string) => void;
  onRemovePreferredCompany: (company: string) => void;
  onPreferredCompanyInputChange: (value: string) => void;
  preferredCompanyInput: string;
}

export function SettingsCompanyPreferences({
  blockedCompanyInput,
  config,
  onAddBlockedCompany,
  onAddPreferredCompany,
  onBlockedCompanyInputChange,
  onRemoveBlockedCompany,
  onRemovePreferredCompany,
  onPreferredCompanyInputChange,
  preferredCompanyInput,
}: SettingsCompanyPreferencesProps) {
  return (
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
              value={preferredCompanyInput}
              onChange={(e) => onPreferredCompanyInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddPreferredCompany();
                }
              }}
            />
            <Button
              onClick={onAddPreferredCompany}
              disabled={!preferredCompanyInput.trim()}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.preferred_companies?.map((company) => (
              <Badge
                key={company}
                variant="sentinel"
                removable
                onRemove={() => onRemovePreferredCompany(company)}
              >
                {company}
              </Badge>
            ))}
            {(!config.preferred_companies ||
              config.preferred_companies.length === 0) && (
              <p className="text-sm text-surface-400">No preferred companies</p>
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
              value={blockedCompanyInput}
              onChange={(e) => onBlockedCompanyInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddBlockedCompany();
                }
              }}
            />
            <Button
              onClick={onAddBlockedCompany}
              disabled={!blockedCompanyInput.trim()}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.blocked_companies?.map((company) => (
              <Badge
                key={company}
                variant="danger"
                removable
                onRemove={() => onRemoveBlockedCompany(company)}
              >
                {company}
              </Badge>
            ))}
            {(!config.blocked_companies ||
              config.blocked_companies.length === 0) && (
              <p className="text-sm text-surface-400">No blocked companies</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
