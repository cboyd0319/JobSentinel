import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LocationInfo } from "../../../utils/locationDetection";
import type { Config } from "../config/SettingsConfig";

interface UseSettingsSearchPreferenceInputsOptions {
  config: Config | null;
  detectedLocation: LocationInfo | null;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  toastSuccess: (title: string, message?: string) => void;
}

export function useSettingsSearchPreferenceInputs({
  config,
  detectedLocation,
  setConfig,
  toastSuccess,
}: UseSettingsSearchPreferenceInputsOptions) {
  const [titleInput, setTitleInput] = useState("");
  const [blockedTitleInput, setBlockedTitleInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [excludeKeywordInput, setExcludeKeywordInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [preferredCompanyInput, setPreferredCompanyInput] = useState("");
  const [blockedCompanyInput, setBlockedCompanyInput] = useState("");

  const handleUseDetectedLocation = useCallback(() => {
    if (!config || !detectedLocation) return;

    const locationStr = `${detectedLocation.city}, ${detectedLocation.region}`;
    if (config.location_preferences.cities.includes(locationStr)) return;

    setConfig({
      ...config,
      location_preferences: {
        ...config.location_preferences,
        cities: [...config.location_preferences.cities, locationStr],
      },
    });
    toastSuccess("Location added", `Added ${locationStr}`);
  }, [config, detectedLocation, setConfig, toastSuccess]);

  const handleAddTitle = useCallback(() => {
    if (!config) return;
    const trimmed = titleInput.trim();
    if (trimmed && !config.title_allowlist.includes(trimmed)) {
      setConfig({
        ...config,
        title_allowlist: [...config.title_allowlist, trimmed],
      });
      setTitleInput("");
    }
  }, [config, setConfig, titleInput]);

  const handleRemoveTitle = useCallback(
    (title: string) => {
      if (!config) return;
      setConfig({
        ...config,
        title_allowlist: config.title_allowlist.filter(
          (item) => item !== title,
        ),
      });
    },
    [config, setConfig],
  );

  const handleAddSkill = useCallback(() => {
    if (!config) return;
    const trimmed = skillInput.trim();
    if (trimmed && !config.keywords_boost.includes(trimmed)) {
      setConfig({
        ...config,
        keywords_boost: [...config.keywords_boost, trimmed],
      });
      setSkillInput("");
    }
  }, [config, setConfig, skillInput]);

  const handleRemoveSkill = useCallback(
    (skill: string) => {
      if (!config) return;
      setConfig({
        ...config,
        keywords_boost: config.keywords_boost.filter((item) => item !== skill),
      });
    },
    [config, setConfig],
  );

  const handleAddCity = useCallback(() => {
    if (!config) return;
    const trimmed = cityInput.trim();
    if (trimmed && !config.location_preferences.cities.includes(trimmed)) {
      setConfig({
        ...config,
        location_preferences: {
          ...config.location_preferences,
          cities: [...config.location_preferences.cities, trimmed],
        },
      });
      setCityInput("");
    }
  }, [cityInput, config, setConfig]);

  const handleRemoveCity = useCallback(
    (city: string) => {
      if (!config) return;
      setConfig({
        ...config,
        location_preferences: {
          ...config.location_preferences,
          cities: config.location_preferences.cities.filter(
            (item) => item !== city,
          ),
        },
      });
    },
    [config, setConfig],
  );

  const handleAddBlockedTitle = useCallback(() => {
    if (!config) return;
    const trimmed = blockedTitleInput.trim();
    if (trimmed && !config.title_blocklist.includes(trimmed)) {
      setConfig({
        ...config,
        title_blocklist: [...config.title_blocklist, trimmed],
      });
      setBlockedTitleInput("");
    }
  }, [blockedTitleInput, config, setConfig]);

  const handleRemoveBlockedTitle = useCallback(
    (title: string) => {
      if (!config) return;
      setConfig({
        ...config,
        title_blocklist: config.title_blocklist.filter(
          (item) => item !== title,
        ),
      });
    },
    [config, setConfig],
  );

  const handleAddExcludeKeyword = useCallback(() => {
    if (!config) return;
    const trimmed = excludeKeywordInput.trim();
    if (trimmed && !config.keywords_exclude.includes(trimmed)) {
      setConfig({
        ...config,
        keywords_exclude: [...config.keywords_exclude, trimmed],
      });
      setExcludeKeywordInput("");
    }
  }, [config, excludeKeywordInput, setConfig]);

  const handleRemoveExcludeKeyword = useCallback(
    (keyword: string) => {
      if (!config) return;
      setConfig({
        ...config,
        keywords_exclude: config.keywords_exclude.filter(
          (item) => item !== keyword,
        ),
      });
    },
    [config, setConfig],
  );

  const handleAddPreferredCompany = useCallback(() => {
    if (!config) return;
    const trimmed = preferredCompanyInput.trim();
    const includedCompanies = config.preferred_companies ?? [];
    if (trimmed && !includedCompanies.includes(trimmed)) {
      setConfig({
        ...config,
        preferred_companies: [...includedCompanies, trimmed],
      });
      setPreferredCompanyInput("");
    }
  }, [config, setConfig, preferredCompanyInput]);

  const handleRemovePreferredCompany = useCallback(
    (company: string) => {
      if (!config) return;
      setConfig({
        ...config,
        preferred_companies: (config.preferred_companies ?? []).filter(
          (item) => item !== company,
        ),
      });
    },
    [config, setConfig],
  );

  const handleAddBlockedCompany = useCallback(() => {
    if (!config) return;
    const trimmed = blockedCompanyInput.trim();
    const excludedCompanies = config.blocked_companies ?? [];
    if (trimmed && !excludedCompanies.includes(trimmed)) {
      setConfig({
        ...config,
        blocked_companies: [...excludedCompanies, trimmed],
      });
      setBlockedCompanyInput("");
    }
  }, [blockedCompanyInput, config, setConfig]);

  const handleRemoveBlockedCompany = useCallback(
    (company: string) => {
      if (!config) return;
      setConfig({
        ...config,
        blocked_companies: (config.blocked_companies ?? []).filter(
          (item) => item !== company,
        ),
      });
    },
    [config, setConfig],
  );

  return {
    blockedCompanyInput,
    blockedTitleInput,
    cityInput,
    excludeKeywordInput,
    handleAddBlockedCompany,
    handleAddBlockedTitle,
    handleAddCity,
    handleAddExcludeKeyword,
    handleAddSkill,
    handleAddTitle,
    handleAddPreferredCompany,
    handleRemoveBlockedCompany,
    handleRemoveBlockedTitle,
    handleRemoveCity,
    handleRemoveExcludeKeyword,
    handleRemoveSkill,
    handleRemoveTitle,
    handleRemovePreferredCompany,
    handleUseDetectedLocation,
    setBlockedCompanyInput,
    setBlockedTitleInput,
    setCityInput,
    setExcludeKeywordInput,
    setSkillInput,
    setTitleInput,
    setPreferredCompanyInput,
    skillInput,
    titleInput,
    preferredCompanyInput,
  };
}
