/** Covers and unmounts private application state until native privacy admission permits access. */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { clearCommandCache } from "../platform/tauri";
import { listen } from "../platform/tauri/events";
import { invokeAppPrivacy, parseAppPrivacyStatus, SESSION_CLEANUP_FAILED_EVENT, type AppPrivacyStatus } from "../platform/tauri/appPrivacy";
import { removeStorageValue } from "../shared/browserStorage";
import { Button } from "../ui/Button";

export function AppPrivacy({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppPrivacyStatus | null>(null);
  const [problem, setProblem] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(0);
  const [retry, setRetry] = useState(0);
  const revision = useRef(0);
  const current = useRef(status);
  const invalidate = useCallback(() => ++revision.current, []);

  const applyStatus = useCallback((value: unknown) => {
    const next = parseAppPrivacyStatus(value);
    current.current = next;
    setStatus(next);
    if (next.locked) {
      clearCommandCache();
      setPassphrase("");
    }
  }, []);

  const refresh = useCallback(async () => {
    const request = invalidate();
    setProblem("");
    try {
      const next: unknown = await invokeAppPrivacy("get_app_privacy_status");
      if (request === revision.current) applyStatus(next);
    } catch {
      if (request === revision.current) setProblem("Could not check app protection. Try again.");
    }
  }, [applyStatus, invalidate]);

  useEffect(() => {
    let disposed = false;
    const releases: Array<() => void> = [];
    async function subscribe() {
      try {
        for (const [name, handler] of [
          ["app-privacy-changed", (payload: unknown) => {
            invalidate();
            try { applyStatus(payload); } catch {
              clearCommandCache();
              current.current = null;
              setStatus(null);
              setProblem("Could not check app protection. Try again.");
            }
          }],
          ["private-session-cleared", () => {
            clearCommandCache();
            const cleared = ["jobContext", "jobsentinel-resume-match-draft-v1", "detected_location"]
              .map((key) => removeStorageValue("session", key)).every(Boolean);
            setSession((value) => value + 1);
            if (!cleared) setProblem("Some temporary browser data could not be cleared. Close JobSentinel before sharing this session.");
          }],
        ] as const) {
          const release = await listen<unknown>(name, (event) => {
            if (!disposed) handler(event.payload);
          });
          if (disposed) release(); else releases.push(release);
        }
        if (!disposed) await refresh();
      } catch {
        if (!disposed) setProblem("Could not check app protection. Try again.");
      }
    }
    void subscribe();
    return () => {
      disposed = true;
      invalidate();
      releases.forEach((release) => release());
    };
  }, [applyStatus, refresh, invalidate, retry]);

  const lock = useCallback(async () => {
    const previous = current.current;
    if (!previous?.enabled || previous.locked) return;
    const request = invalidate();
    applyStatus({ ...previous, locked: true });
    setProblem("");
    try {
      const next: unknown = await invokeAppPrivacy("lock_app");
      if (request === revision.current) applyStatus(next);
    } catch {
      if (request === revision.current) setProblem("Could not confirm the lock. Keep this screen covered and try again.");
    }
  }, [applyStatus, invalidate]);

  useEffect(() => {
    const leaveWindow = () => { void lock(); };
    const cleanupFailed = () => {
      setProblem("Session cleanup did not finish. Keep this session private, then restart JobSentinel before trying again.");
    };
    window.addEventListener("blur", leaveWindow);
    window.addEventListener(SESSION_CLEANUP_FAILED_EVENT, cleanupFailed);
    return () => {
      window.removeEventListener("blur", leaveWindow);
      window.removeEventListener(SESSION_CLEANUP_FAILED_EVENT, cleanupFailed);
    };
  }, [lock]);

  async function unlock() {
    const request = invalidate();
    setBusy(true);
    setProblem("");
    const supplied = passphrase;
    setPassphrase("");
    try {
      const next: unknown = await invokeAppPrivacy("unlock_app", status?.unlock_method === "passphrase"
        ? { passphrase: supplied } : {});
      if (request === revision.current) applyStatus(next);
    } catch {
      if (request === revision.current) setProblem("Could not unlock. Check your passphrase or system prompt, then try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!status || status.locked) return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-900">
      <section className="w-full max-w-md space-y-4" aria-labelledby="app-lock-heading">
        <h1 id="app-lock-heading" className="text-xl font-semibold">
          {status ? "JobSentinel is locked" : "Checking app protection"}
        </h1>
        {problem && <p role="alert">{problem}</p>}
        {!status ? <Button onClick={() => setRetry((value) => value + 1)}>Try again</Button> : (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void unlock(); }}>
            <p>Unlock to view your private job-search data.</p>
            {status.unlock_method === "passphrase" && <label className="block">
              App unlock passphrase
              <input type="password" autoComplete="current-password" value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)} disabled={busy}
                className="mt-1 block w-full rounded border p-2 dark:bg-surface-800" />
            </label>}
            {status.unlock_method === "unavailable" && <p>Restore access to your configured passphrase or this device's protected password store.</p>}
            <Button type="submit" loading={busy} loadingText="Unlocking..."
              disabled={status.unlock_method === "unavailable" || (status.unlock_method === "passphrase" && !passphrase)}>
              Unlock JobSentinel
            </Button>
          </form>
        )}
      </section>
    </main>
  );

  return <>
    {problem && <p role="alert" className="relative z-50 bg-surface-50 p-4 dark:bg-surface-900">{problem}</p>}
    {status.enabled && <div className="fixed right-4 top-3 z-40">
      <Button size="sm" variant="secondary" onClick={() => void lock()}>Lock JobSentinel</Button>
    </div>}
    <div key={session}>{children}</div>
  </>;
}
