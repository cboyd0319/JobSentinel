/** Keeps application services hidden until the selected portable profile is unlocked natively. */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { invoke } from "../platform/tauri";
import { Button } from "../ui/Button";

interface PortableProfileStatus {
  portable: boolean;
  unlocked: boolean;
  new_profile: boolean;
}

function parseStatus(value: unknown): PortableProfileStatus {
  if (value && typeof value === "object" &&
    "portable" in value && typeof value.portable === "boolean" &&
    "unlocked" in value && typeof value.unlocked === "boolean" &&
    "new_profile" in value && typeof value.new_profile === "boolean") {
    return { portable: value.portable, unlocked: value.unlocked, new_profile: value.new_profile };
  }
  throw new Error("Portable profile status is unavailable.");
}

export function PortableStartup({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PortableProfileStatus | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(true);
  const [problem, setProblem] = useState("");
  const revision = useRef(0);
  const invalidate = useCallback(() => ++revision.current, []);

  const refresh = useCallback(async () => {
    const request = invalidate();
    setBusy(true);
    setProblem("");
    try {
      const next = parseStatus(await invoke<unknown>("get_portable_profile_status"));
      if (request === revision.current) setStatus(next);
    } catch {
      if (request === revision.current) setProblem("Could not check the portable profile. Check that its storage is connected, then try again.");
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }, [invalidate]);

  useEffect(() => {
    void refresh();
    return () => { invalidate(); };
  }, [refresh, invalidate]);

  const validPassphrase = [...passphrase.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "")].length >= 16 &&
    new TextEncoder().encode(passphrase).length <= 1024;

  async function unlock() {
    if (!status || busy || !validPassphrase || (status.new_profile && passphrase !== confirmation)) return;
    const request = invalidate();
    const args = status.new_profile ? { passphrase, confirmPassphrase: confirmation } : { passphrase };
    setPassphrase("");
    setConfirmation("");
    setBusy(true);
    setProblem("");
    try {
      await invoke("unlock_portable_profile", args);
      if (request !== revision.current) return;
      const next = parseStatus(await invoke<unknown>("get_portable_profile_status"));
      if (request !== revision.current) return;
      setStatus(next);
      if (next.portable && !next.unlocked) setProblem("The portable profile is still locked. Try again.");
    } catch {
      if (request === revision.current) setProblem("Could not open this portable profile. Check the passphrase and writable storage, then try again.");
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }

  if (status && (!status.portable || status.unlocked)) return children;

  return <main className="flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-900">
    <section className="w-full max-w-md space-y-4" aria-labelledby="portable-startup-heading">
      <h1 id="portable-startup-heading" className="text-xl font-semibold">
        {!status ? "Opening JobSentinel" : status.new_profile ? "Create a portable profile" : "Unlock your portable profile"}
      </h1>
      {problem && <p role="alert">{problem}</p>}
      {!status ? <Button disabled={busy} onClick={() => void refresh()}>Try again</Button> : <>
        <p>Saved job data and settings stay in this portable profile. Browser session state is temporary. Closing JobSentinel does not erase exported files or other copies on this computer.</p>
        {status.new_profile && <p>Choose a passphrase you can keep safely. Without it, this portable profile cannot be recovered.</p>}
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void unlock(); }}>
          <label className="block">Portable profile passphrase
            <input type="password" autoComplete={status.new_profile ? "new-password" : "current-password"}
              value={passphrase} disabled={busy} onChange={(event) => setPassphrase(event.target.value)}
              className="mt-1 block w-full rounded border p-2 dark:bg-surface-800" />
          </label>
          <p className="text-sm">Use at least 16 characters, excluding leading and trailing spaces, and at most 1024 UTF-8 bytes.</p>
          {status.new_profile && <label className="block">Confirm portable profile passphrase
            <input type="password" autoComplete="new-password" value={confirmation} disabled={busy}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-1 block w-full rounded border p-2 dark:bg-surface-800" />
          </label>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy} loadingText="Opening profile..."
              disabled={!validPassphrase || (status.new_profile && passphrase !== confirmation)}>
              {status.new_profile ? "Create portable profile" : "Unlock portable profile"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => {
              setPassphrase(""); setConfirmation(""); setProblem("");
            }}>Cancel</Button>
          </div>
        </form>
      </>}
    </section>
  </main>;
}
