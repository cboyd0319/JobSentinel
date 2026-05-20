export interface LocationInfo {
  city: string;
  region: string;
  country: string;
  timezone: string;
}

const DETECTED_LOCATION_CACHE_KEY = "detected_location";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isLocationInfo(value: unknown): value is LocationInfo {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.city === "string" &&
    typeof candidate.region === "string" &&
    typeof candidate.country === "string" &&
    typeof candidate.timezone === "string"
  );
}

export function readCachedDetectedLocation(
  storage: Storage | null = getSessionStorage(),
): LocationInfo | null {
  if (!storage) {
    return null;
  }

  try {
    const cached = storage.getItem(DETECTED_LOCATION_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const parsed: unknown = JSON.parse(cached);
    if (isLocationInfo(parsed)) {
      return parsed;
    }

    storage.removeItem(DETECTED_LOCATION_CACHE_KEY);
  } catch {
    try {
      storage.removeItem(DETECTED_LOCATION_CACHE_KEY);
    } catch {
      // Optional cache cleanup; ignore storage policy failures.
    }
  }

  return null;
}

export function cacheDetectedLocation(
  location: LocationInfo,
  storage: Storage | null = getSessionStorage(),
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(DETECTED_LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch {
    // Optional convenience cache; ignore quota or storage policy failures.
  }
}
