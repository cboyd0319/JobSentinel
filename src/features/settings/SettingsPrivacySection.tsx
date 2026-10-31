/** Offers opt-in app protection and explicit review before clearing temporary session data. */

import { useEffect, useState } from "react";
import { invokeAppPrivacy, parseAppPrivacyStatus, SESSION_CLEANUP_FAILED_EVENT, type AppPrivacyStatus } from "../../platform/tauri/appPrivacy";
import { Button } from "../../ui/Button";

export function SettingsPrivacySection() {
  const [status, setStatus] = useState<AppPrivacyStatus | null>(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let disposed = false;
    void invokeAppPrivacy<unknown>("get_app_privacy_status").then((value) => {
      if (!disposed) setStatus(parseAppPrivacyStatus(value));
    }).catch(() => { if (!disposed) setProblem("App protection is unavailable. Reopen Settings to try again."); });
    return () => { disposed = true; };
  }, []);

  async function change(command: "set_shared_computer_mode" | "clear_private_session", enabled?: boolean) {
    setBusy(true);
    setProblem("");
    try {
      const next: unknown = await invokeAppPrivacy(command, command === "set_shared_computer_mode" ? { enabled } : undefined);
      setStatus(parseAppPrivacyStatus(next));
      setReview(false);
    } catch {
      if (command === "clear_private_session") window.dispatchEvent(new Event(SESSION_CLEANUP_FAILED_EVENT));
      else setProblem("Could not change app protection. Set up a saved-details passphrase below, or allow your device's verification prompt, then try again.");
    } finally { setBusy(false); }
  }

  return <section className="mb-6 space-y-3" aria-labelledby="shared-computer-heading">
    <h3 id="shared-computer-heading" className="font-medium">Shared-computer privacy</h3>
    <p className="text-sm">Start locked and lock when you leave this window. Unlock with your saved-details passphrase or supported device verification. Private views are recreated after unlocking.</p>
    {problem && <p role="alert">{problem}</p>}
    <Button variant="secondary" disabled={!status || busy} onClick={() => void change("set_shared_computer_mode", !status?.enabled)}>
      {status?.enabled ? "Turn off shared-computer mode" : "Turn on shared-computer mode"}
    </Button>
    <Button variant="ghost" disabled={!status || busy} onClick={() => setReview(true)}>Review session cleanup</Button>
    {review && <div className="space-y-3 rounded border border-surface-300 p-4 dark:border-surface-600">
      <p>Clear temporary job text, resume-match drafts, detected location, command caches and pending import reviews. Open views, notifications and undo history will close. Unsaved edits will be lost.</p>
      <p>Saved jobs, resumes, applications, settings and connection details stay saved. Exported files, clipboard contents and external copies remain. This does not securely erase this computer.</p>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => void change("clear_private_session")}>Clear reviewed session</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setReview(false)}>Keep session</Button>
      </div>
    </div>}
  </section>;
}
