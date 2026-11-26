#!/usr/bin/env node
// Publishes a confirmed draft by id, verifies the public release against its evidence, and re-drafts it on any failure.
import { setTimeout as sleep } from "node:timers/promises";

import { getArgValue, isMainModule } from "./args.mjs";
import { envToken, fetchGitHubJson } from "./public-assets/http.mjs";
import { parseArgs } from "./public-assets/options.mjs";
import { assertReleaseBody, composeReleaseNotes } from "./release-notes.mjs";
import { verifyPublicReleaseAssets } from "./verify-public-release-assets.mjs";

/** Total budget for publish plus verification. The readiness lint keeps the publication job timeout above it. */
export const publishVerifyBudgetMs = 20 * 60_000;
/** Ceiling for the retried re-draft after a failure; the readiness lint adds it to the job timeout too. */
export const redraftWindowMs = 4 * 60_000;
/** Cancellation gets SIGINT, SIGTERM 7.5 s later, then SIGKILL 2.5 s after that: re-draft within 7 s of the first. */
const signalGraceMs = 7_000;
/** Part of the grace window spent waiting for an in-flight publish PATCH, so the re-draft cannot land before it. */
const inFlightWaitMs = 3_000;
const redraftDelaysMs = [1_000, 2_000, 5_000, 15_000, 30_000, 60_000];

function releaseApiUrl(repo, releaseId) {
  return `https://api.github.com/repos/${repo}/releases/${releaseId}`;
}

/** Network errors, timeouts, 5xx, 429 and 403 secondary rate limits may succeed on a later attempt. */
function retryable(error) {
  return error?.status === undefined || error.status >= 500 || error.status === 429 || error.status === 403;
}

/** PATCHes the release back to draft and requires the response to say so, retrying with backoff until `windowMs` runs out. */
export async function redraftRelease(releaseUrl, { fetchImpl = fetch, token, windowMs = redraftWindowMs, delaysMs = redraftDelaysMs }) {
  const deadline = Date.now() + windowMs;
  for (let attempt = 0; ; attempt += 1) {
    try {
      const release = await fetchGitHubJson(releaseUrl, { fetchImpl, token, method: "PATCH", body: { draft: true }, deadline });
      if (release?.draft !== true) throw new Error(`Re-draft response for ${releaseUrl} has draft ${release?.draft}.`);
      return release;
    } catch (error) {
      const delay = delaysMs[attempt];
      if (!retryable(error) || delay === undefined || Date.now() + delay >= deadline) throw error;
      await sleep(delay);
    }
  }
}

/**
 * PATCHes release `releaseId` to published with `body`, the notes generated from the checked-out tag commit, then
 * requires the response to carry that body and verifies the release. Every fetch is bounded by the budget, and every
 * download and attestation call by the time that remains. Any failure after the PATCH is attempted, including
 * a PATCH error the server may still have applied or a fetch hung past the budget, re-drafts the release by id.
 * `publication.patchAttempted` turns true just before the publish PATCH is sent; `publication.publishSettled` resolves
 * once that request has finished either way.
 */
export async function publishVerifiedRelease(
  { options, releaseId, name, body },
  {
    verify = verifyPublicReleaseAssets,
    fetchImpl = fetch,
    token = envToken(),
    verifyAttestation,
    budgetMs = publishVerifyBudgetMs,
    redraftDelays,
    publication = {},
  } = {},
) {
  if (!/^[1-9][0-9]*$/.test(String(releaseId))) throw new Error(`Release id must be a positive integer, found ${releaseId}.`);
  if (!options.evidenceRevision) throw new Error("Publication requires --evidence-revision for post-publication verification.");
  if (!token.trim()) throw new Error("Publication requires a GitHub token.");
  if (typeof body !== "string" || body === "") throw new Error("Publication requires the generated release notes as the body.");
  const releaseUrl = releaseApiUrl(options.repo, releaseId);
  const deadline = Date.now() + budgetMs;
  const budget = AbortSignal.timeout(budgetMs);
  const boundedFetch = (url, init = {}) => fetchImpl(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, budget]) : budget });
  try {
    publication.patchAttempted = true;
    const publishRequest = fetchGitHubJson(releaseUrl, { fetchImpl: boundedFetch, token, method: "PATCH", body: { name, body, draft: false, prerelease: false } });
    publication.publishSettled = publishRequest.then(() => {}, () => {});
    assertReleaseBody({ id: releaseId, body: (await publishRequest)?.body }, body);
    const result = await verify(options, { fetchImpl: boundedFetch, token, deadline, ...(verifyAttestation ? { verifyAttestation } : {}) });
    if (String(result.releaseId) !== String(releaseId)) throw new Error(`Verified release ${result.releaseId} is not published release ${releaseId}.`);
    return result;
  } catch (error) {
    const reason = budget.aborted ? `publication and verification exceeded ${budgetMs} ms` : error instanceof Error ? error.message : String(error);
    try {
      await redraftRelease(releaseUrl, { fetchImpl, token, ...(redraftDelays ? { delaysMs: redraftDelays } : {}) });
    } catch (containError) {
      throw new Error(`Release ${releaseId} failed publication or verification (${reason}) and could not be returned to draft: ${containError.message}`, { cause: containError });
    }
    throw new Error(`Release ${releaseId} failed publication or verification and was returned to draft: ${reason}`, { cause: error });
  }
}

/**
 * On SIGINT or SIGTERM, exits non-zero. Once the publish PATCH was attempted, it first waits briefly for that request
 * to settle, then re-drafts by id within the cancellation grace window. Later signals are ignored while that runs.
 * The runner signals only the step's top process, so the workflow must `exec` this script. SIGKILL cannot be handled.
 */
export function redraftOnCancel({ repo, releaseId, publication, fetchImpl = fetch, token = envToken(), graceMs = signalGraceMs, delaysMs = [500, 1_000] }) {
  let handling = false;
  const handler = async (signal) => {
    if (handling) return;
    handling = true;
    let message = `${signal} received before the publish request; release ${releaseId} stays a draft.`;
    if (publication.patchAttempted) {
      const started = Date.now();
      try {
        await Promise.race([publication.publishSettled, sleep(inFlightWaitMs)]);
        await redraftRelease(releaseApiUrl(repo, releaseId), { fetchImpl, token, windowMs: graceMs - (Date.now() - started), delaysMs });
        message = `${signal} received after the publish request; release ${releaseId} was returned to draft.`;
      } catch (error) {
        message = `${signal} received after the publish request; release ${releaseId} could not be returned to draft: ${error.message}`;
      }
    }
    console.error(`::error::${message}`);
    process.exit(1);
  };
  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
}

if (isMainModule(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    if (!options.releaseTag || !options.expectedVersion || !options.selection) throw new Error("Usage: publish-release.mjs --tag vX.Y.Z --expected-version X.Y.Z --release-id <id> --repo <o/r> --selection <s> --evidence-revision <E> [verifier flags]");
    const releaseId = getArgValue(args, "--release-id");
    const publication = { patchAttempted: false };
    redraftOnCancel({ repo: options.repo, releaseId, publication });
    const body = composeReleaseNotes({ version: options.expectedVersion });
    await publishVerifiedRelease({ options, releaseId, name: `JobSentinel ${options.expectedVersion}`, body }, { publication });
    console.log(`Published release ${options.releaseTag} matches the final-phase evidence.`);
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
