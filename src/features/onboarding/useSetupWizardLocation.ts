import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { useToast } from "../../contexts";
import { safeInvoke } from "../../utils/api";
import {
  cacheDetectedLocation,
  readCachedDetectedLocation,
  type LocationInfo,
} from "../../utils/locationDetection";
import type { SetupConfig } from "./setupWizardPreferences";

type WorkLocationPreferenceKey = "allow_remote" | "allow_hybrid" | "allow_onsite";

export function useSetupWizardLocation(
  config: SetupConfig,
  setConfig: Dispatch<SetStateAction<SetupConfig>>,
) {
  const [cityInput, setCityInput] = useState("");
  const [detectedLocation, setDetectedLocation] = useState<LocationInfo | null>(
    () => readCachedDetectedLocation(),
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const toast = useToast();
  const hasSelectedWorkType =
    config.location_preferences.allow_remote ||
    config.location_preferences.allow_hybrid ||
    config.location_preferences.allow_onsite;

  const handleDetectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    try {
      const location = await safeInvoke<LocationInfo>(
        "detect_location",
        {},
        { logContext: "Detect location from IP" },
      );
      setDetectedLocation(location);
      cacheDetectedLocation(location);
    } catch {
      toast.warning("Location unavailable", "Enter a city manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toast]);

  const handleAddCity = () => {
    const trimmed = cityInput.trim();
    if (trimmed && !config.location_preferences.cities.includes(trimmed)) {
      setConfig((previous) => ({
        ...previous,
        location_preferences: {
          ...previous.location_preferences,
          cities: [...previous.location_preferences.cities, trimmed],
        },
      }));
      setCityInput("");
    }
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setConfig((previous) => ({
      ...previous,
      location_preferences: {
        ...previous.location_preferences,
        cities: previous.location_preferences.cities.filter((city) => city !== cityToRemove),
      },
    }));
  };

  const handleLocationNotSure = () => {
    setConfig((previous) => ({
      ...previous,
      location_preferences: {
        ...previous.location_preferences,
        allow_remote: true,
        allow_hybrid: true,
        allow_onsite: true,
        cities: [],
      },
    }));
    setCityInput("");
  };

  const handleWorkTypeChange = (
    key: WorkLocationPreferenceKey,
    checked: boolean,
  ) => {
    setConfig((previous) => ({
      ...previous,
      location_preferences: {
        ...previous.location_preferences,
        [key]: checked,
      },
    }));
  };

  const handleUseDetectedLocation = () => {
    if (!detectedLocation) {
      return;
    }

    const location = `${detectedLocation.city}, ${detectedLocation.region}`;
    if (config.location_preferences.cities.includes(location)) {
      return;
    }

    setConfig((previous) => ({
      ...previous,
      location_preferences: {
        ...previous.location_preferences,
        cities: [...previous.location_preferences.cities, location],
      },
    }));
    toast.success("Location added", `Added ${location}`);
  };

  return {
    cityInput,
    detectedLocation,
    handleAddCity,
    handleDetectLocation,
    handleLocationNotSure,
    handleRemoveCity,
    handleUseDetectedLocation,
    handleWorkTypeChange,
    hasSelectedWorkType,
    isDetectingLocation,
    setCityInput,
  };
}
