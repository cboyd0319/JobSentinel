import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { LocationInfo } from "../utils/locationDetection";
import type { Config } from "./SettingsConfig";

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
  const [whitelistCompanyInput, setWhitelistCompanyInput] = useState("");
  const [blacklistCompanyInput, setBlacklistCompanyInput] = useState("");

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

  const handleRemoveTitle = useCallback((title: string) => {
    if (!config) return;
    setConfig({
      ...config,
      title_allowlist: config.title_allowlist.filter((item) => item !== title),
    });
  }, [config, setConfig]);

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

  const handleRemoveSkill = useCallback((skill: string) => {
    if (!config) return;
    setConfig({
      ...config,
      keywords_boost: config.keywords_boost.filter((item) => item !== skill),
    });
  }, [config, setConfig]);

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

  const handleRemoveCity = useCallback((city: string) => {
    if (!config) return;
    setConfig({
      ...config,
      location_preferences: {
        ...config.location_preferences,
        cities: config.location_preferences.cities.filter((item) => item !== city),
      },
    });
  }, [config, setConfig]);

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

  const handleRemoveBlockedTitle = useCallback((title: string) => {
    if (!config) return;
    setConfig({
      ...config,
      title_blocklist: config.title_blocklist.filter((item) => item !== title),
    });
  }, [config, setConfig]);

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

  const handleRemoveExcludeKeyword = useCallback((keyword: string) => {
    if (!config) return;
    setConfig({
      ...config,
      keywords_exclude: config.keywords_exclude.filter((item) => item !== keyword),
    });
  }, [config, setConfig]);

  const handleAddWhitelistCompany = useCallback(() => {
    if (!config) return;
    const trimmed = whitelistCompanyInput.trim();
    const companyWhitelist = config.company_whitelist ?? [];
    if (trimmed && !companyWhitelist.includes(trimmed)) {
      setConfig({
        ...config,
        company_whitelist: [...companyWhitelist, trimmed],
      });
      setWhitelistCompanyInput("");
    }
  }, [config, setConfig, whitelistCompanyInput]);

  const handleRemoveWhitelistCompany = useCallback((company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_whitelist: (config.company_whitelist ?? []).filter(
        (item) => item !== company,
      ),
    });
  }, [config, setConfig]);

  const handleAddBlacklistCompany = useCallback(() => {
    if (!config) return;
    const trimmed = blacklistCompanyInput.trim();
    const companyBlacklist = config.company_blacklist ?? [];
    if (trimmed && !companyBlacklist.includes(trimmed)) {
      setConfig({
        ...config,
        company_blacklist: [...companyBlacklist, trimmed],
      });
      setBlacklistCompanyInput("");
    }
  }, [blacklistCompanyInput, config, setConfig]);

  const handleRemoveBlacklistCompany = useCallback((company: string) => {
    if (!config) return;
    setConfig({
      ...config,
      company_blacklist: (config.company_blacklist ?? []).filter(
        (item) => item !== company,
      ),
    });
  }, [config, setConfig]);

  return {
    blacklistCompanyInput,
    blockedTitleInput,
    cityInput,
    excludeKeywordInput,
    handleAddBlacklistCompany,
    handleAddBlockedTitle,
    handleAddCity,
    handleAddExcludeKeyword,
    handleAddSkill,
    handleAddTitle,
    handleAddWhitelistCompany,
    handleRemoveBlacklistCompany,
    handleRemoveBlockedTitle,
    handleRemoveCity,
    handleRemoveExcludeKeyword,
    handleRemoveSkill,
    handleRemoveTitle,
    handleRemoveWhitelistCompany,
    handleUseDetectedLocation,
    setBlacklistCompanyInput,
    setBlockedTitleInput,
    setCityInput,
    setExcludeKeywordInput,
    setSkillInput,
    setTitleInput,
    setWhitelistCompanyInput,
    skillInput,
    titleInput,
    whitelistCompanyInput,
  };
}
