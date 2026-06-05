import {
  buildSetupSourceQuery,
  getSuggestedJobSourceOptions,
  type SetupConfig,
  type SetupJobSourceKey,
  type SuggestedJobSourceOption,
} from "./setupWizardPreferences";

export interface SetupWizardSourceReviewOption extends SuggestedJobSourceOption {
  checked: boolean;
}

export function toggleSetupJobSource(
  config: SetupConfig,
  source: SetupJobSourceKey,
  enabled: boolean,
): SetupConfig {
  switch (source) {
    case "remoteok":
      return {
        ...config,
        remoteok: {
          ...config.remoteok,
          enabled,
        },
      };
    case "hn_hiring":
      return {
        ...config,
        hn_hiring: {
          ...config.hn_hiring,
          enabled,
        },
      };
    case "weworkremotely":
      return {
        ...config,
        weworkremotely: {
          ...config.weworkremotely,
          enabled,
        },
      };
    case "simplyhired": {
      const query = enabled
        ? config.simplyhired.query.trim() || buildSetupSourceQuery(config)
        : config.simplyhired.query;
      const location = enabled
        ? config.simplyhired.location ?? config.location_preferences.cities[0]
        : config.simplyhired.location;
      const simplyhired = {
        ...config.simplyhired,
        enabled,
        query,
      };

      return {
        ...config,
        simplyhired: location ? { ...simplyhired, location } : simplyhired,
      };
    }
  }
}

export function getSetupWizardSourceReviewOptions(
  config: SetupConfig,
): SetupWizardSourceReviewOption[] {
  return getSuggestedJobSourceOptions(config).map((source) => {
    switch (source.key) {
      case "remoteok":
        return { ...source, checked: config.remoteok.enabled };
      case "hn_hiring":
        return { ...source, checked: config.hn_hiring.enabled };
      case "weworkremotely":
        return { ...source, checked: config.weworkremotely.enabled };
      case "simplyhired":
        return { ...source, checked: config.simplyhired.enabled };
    }
  });
}
