type BrowserStorageKind = "local" | "session";

function getBrowserStorage(kind: BrowserStorageKind): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStorageValue(kind: BrowserStorageKind, key: string): string | null {
  const storage = getBrowserStorage(kind);
  if (!storage) return null;

  try {
    return storage.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageValue(kind: BrowserStorageKind, key: string, value: string): boolean {
  const storage = getBrowserStorage(kind);
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageValue(kind: BrowserStorageKind, key: string): boolean {
  const storage = getBrowserStorage(kind);
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearStorage(kind: BrowserStorageKind): boolean {
  const storage = getBrowserStorage(kind);
  if (!storage) return false;

  try {
    storage.clear();
    return true;
  } catch {
    return false;
  }
}
