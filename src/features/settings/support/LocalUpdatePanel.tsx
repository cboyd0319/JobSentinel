/** Reviews signed local app updates and compatible rollbacks without coupling them to online discovery. */
import { useEffect, useRef, useState } from "react";
import { invoke } from "../../../platform/tauri";
import { openDeepLink } from "../../../shared/search-links";
import { Button } from "../../../ui/Button";
import {
  isInstallerOpened, isLocalUpdateReview, isLocalUpdateStatus, isUpdateAvailability,
  type LocalUpdateReview, type LocalUpdateStatus, type UpdateAvailability,
} from "./localUpdateContract";

export function LocalUpdatePanel() {
  const [local, setLocal] = useState<LocalUpdateStatus | null>(null);
  const [availability, setAvailability] = useState<UpdateAvailability | null>(null);
  const [review, setReview] = useState<LocalUpdateReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const mounted = useRef(false);
  const running = useRef(false);
  const statusRequest = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const request = ++statusRequest.current;
    void invoke<unknown>("get_local_update_status").then((value) => {
      if (!isLocalUpdateStatus(value)) throw new Error("Invalid update status");
      if (active && request === statusRequest.current) setLocal(value);
    }).catch(() => {
      if (active && request === statusRequest.current) setMessage("Local update options could not be checked. Try choosing an installer again.");
    });
    return () => { active = false; mounted.current = false; };
  }, []);
  useEffect(() => { if (review) heading.current?.focus(); }, [review]);

  const run = async (action: () => Promise<void>, failure: string) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try { await action(); } catch {
      if (mounted.current) { setMessage(failure); setFailed(true); }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const readLocal = async () => {
    const request = ++statusRequest.current;
    const value = await invoke<unknown>("get_local_update_status");
    if (!isLocalUpdateStatus(value)) throw new Error("Invalid update status");
    if (mounted.current && request === statusRequest.current) setLocal(value);
    return value;
  };
  const choose = () => run(async () => {
    const status = await readLocal();
    if (!mounted.current || !status.trustedPublisherConfigured || status.restartRequired) return;
    const value = await invoke<unknown>("select_local_update");
    if (value !== null && !isLocalUpdateReview(value)) throw new Error("Invalid update review");
    if (mounted.current) {
      setReview(value);
      if (value === null) setMessage("Installer selection cancelled. Nothing was installed.");
    }
  }, "This installer could not be verified for this app and device. Choose a compatible signed package with its manifest and signature files beside it.");
  const check = () => run(async () => {
    setAvailability(null);
    const value = await invoke<unknown>("check_update_availability");
    if (!isUpdateAvailability(value)) throw new Error("Invalid update availability");
    if (mounted.current) setAvailability(value);
  }, "Online update availability could not be checked. Your local work and recovery tools remain available.");
  const cancel = () => run(async () => {
    if (!review) return;
    await invoke("cancel_local_update", { reviewId: review.reviewId });
    if (mounted.current) { setReview(null); setMessage("Installer review cancelled. Nothing was installed."); }
  }, "The review could not be cancelled. Check update options again before installing.");
  const apply = () => run(async () => {
    if (!review) return;
    try {
      const result = await invoke<unknown>("apply_local_update", { reviewId: review.reviewId });
      if (!isInstallerOpened(result)) throw new Error("Unconfirmed installer handoff");
      if (mounted.current) {
        setReview(null);
        setLocal((current) => current ? { ...current, restartRequired: true } : current);
        setMessage("Installer opened. Follow its instructions, then reopen JobSentinel. Installation is not yet confirmed.");
      }
    } catch (error) {
      if (mounted.current) setReview(null);
      try { await readLocal(); } catch {
        if (mounted.current) setLocal({ trustedPublisherConfigured: false, pendingReview: false, restartRequired: true });
      }
      throw error;
    }
  }, "Installation could not be confirmed. Follow the restart guidance below, or choose and review the installer again.");
  const releaseUrl = availability?.releaseUrl;
  const safeReleaseUrl = availability?.availableVersion && /^3\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(availability.availableVersion) &&
    releaseUrl === `https://github.com/cboyd0319/JobSentinel/releases/tag/v${availability.availableVersion}` ? releaseUrl : null;

  return (
    <section id="local-update-options" aria-labelledby="local-update-heading"
      className="mb-6 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
      <h3 id="local-update-heading" className="font-medium text-surface-800 dark:text-surface-200">App Updates and Rollback</h3>
      <p className="mt-2 text-sm text-surface-700 dark:text-surface-200">
        Essentials is one upgradable app. Models and packs stay optional and are managed separately.
        Updates never require optional cleanup.
      </p>
      <div className="my-3 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy || review !== null || local?.restartRequired} onClick={() => void check()}>Check for updates</Button>
        <Button variant="secondary" disabled={busy || review !== null || local?.trustedPublisherConfigured === false || local?.restartRequired}
          onClick={() => void choose()}>Review downloaded installer</Button>
      </div>
      <p className="text-xs text-surface-600 dark:text-surface-300">Update availability is checked on GitHub only when you ask. Downloaded installer review works offline.</p>
      {local?.trustedPublisherConfigured === false && !local.restartRequired && (
        <p className="mt-2 text-sm">This build has no trusted update publisher configured. Signed installer review is unavailable until a release build includes publisher trust. Your local work and backups remain available.</p>
      )}
      {local?.restartRequired && <p className="mt-2 text-sm" role="alert">Restart JobSentinel before continuing local work or attempting another update. An update preparation or installer handoff requires a fresh start.</p>}
      {local?.pendingReview && !review && !local.restartRequired && <p className="mt-2 text-sm">A previous review is pending. Choose the installer again to review its current details.</p>}
      {availability && <div className="mt-3 text-sm" role="status">
        {availability.status === "available" ? `Version ${availability.availableVersion} is available; you have ${availability.currentVersion}. Availability does not verify an installer.` :
          availability.status === "current" ? `No newer supported stable release was found for ${availability.currentVersion}.` :
            "Online update availability is unavailable. Your local work and recovery tools remain available."}
        {availability.status === "available" && safeReleaseUrl && <Button variant="ghost" disabled={busy}
          onClick={() => void run(() => openDeepLink(safeReleaseUrl), "The release page could not be opened. Try again later.")}>Open release downloads</Button>}
      </div>}
      {review && <section className="mt-4 space-y-3" aria-labelledby="installer-review-heading">
        <h4 id="installer-review-heading" ref={heading} tabIndex={-1} className="font-medium">
          Review {review.direction === "rollback" ? "compatible v3 rollback" : "app update"}
        </h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm [&_dd]:break-words">
          <dt>Version</dt><dd>{review.currentVersion} → {review.targetVersion}</dd>
          <dt>Package</dt><dd>{review.packageName}</dd>
          <dt>Size</dt><dd>{review.packageBytes.toLocaleString()} bytes</dd>
          <dt>Device</dt><dd>{review.platform} / {review.architecture}</dd>
          <dt>Edition</dt><dd>{review.edition}</dd>
        </dl>
        <p className="text-sm">{review.compatibilitySummary}</p>
        <h5 className="text-sm font-medium">Component changes</h5>
        <ul className="list-disc pl-5 text-sm">{review.componentSummary.map((component, index) => <li key={index}>{component}</li>)}</ul>
        <h5 className="text-sm font-medium">Recovery requirements</h5>
        <p className="text-sm">{review.recoverySummary}</p>
        {review.direction === "rollback" && <p className="text-sm">This changes the app version. It does not restore an older copy of your saved data.</p>}
        <p className="text-sm">Save your work first. Confirming prepares recovery, opens the verified installer, and closes JobSentinel. Reopen the app after installation.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void apply()}>{review.direction === "rollback" ? "Confirm rollback and close app" : "Confirm install and close app"}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => void cancel()}>Cancel installer review</Button>
        </div>
      </section>}
      {busy && <p className="mt-2 text-sm" role="status">Checking or preparing the requested update action…</p>}
      {message && <p className="mt-3 text-sm" role={failed ? "alert" : "status"}>{message}</p>}
      <a href="#portable-recovery-heading" className="mt-3 inline-block text-sm underline">Review encrypted backup and recovery</a>
    </section>
  );
}
