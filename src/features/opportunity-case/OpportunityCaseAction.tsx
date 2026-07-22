import { useCallback, useState } from "react";
import { invoke } from "../../platform/tauri";
import { formatCompactDateTime, formatEventDate } from "../../shared/dateFormatting";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";

type CaseFile = {
  job: {
    job_hash: string;
    title: string;
    company: string;
    location: string | null;
    remote: boolean | null;
    times_seen: number;
  };
  source: {
    name: string;
    last_seen_at: string;
    connectivity_required: boolean;
    stale: boolean;
  };
  posting_risk: { score: number | null; reasons: string[] };
  application: null | { status: string; has_contact: boolean };
  interviews: null | { upcoming_count: number; completed_count: number };
  offer: null | { status: "pending" | "accepted" | "declined" };
  outcome: null | {
    status: "offer_accepted" | "offer_rejected" | "rejected" | "ghosted" | "withdrawn";
  };
  evidence: {
    confirmed_count: number;
    current_packet_count: number;
    stale_packet_count: number;
    review_status: "ready" | "no_saved_match" | "needs_refresh";
    requirements: Array<{
      requirement: string;
      importance: "required" | "preferred" | "industry";
      match_state: "direct" | "strong" | "partial" | "implied" | "missing";
      hard_constraint: boolean;
      blocking: boolean;
      why_not: "partial_evidence" | "implied_evidence" | "missing_evidence" | null;
      evidence: Array<{
        kind: "resume_bullet" | "project" | "skill" | "certification" | "resume_evidence";
        confirmed: boolean;
      }>;
    }>;
  };
  decision: {
    kind: "apply" | "maybe" | "skip" | "research_more";
    reasons: string[];
  };
  timeline: Array<{ at: string; kind: string }>;
};

interface OpportunityCaseActionProps {
  jobHash: string;
}

const timelineLabels: Record<string, string> = {
  case_created: "Case created",
  status_changed: "Status changed",
  evidence_linked: "Evidence linked",
  source_checked_succeeded: "Source checked",
  source_checked_failed: "Source check failed",
  source_checked_timed_out: "Source check timed out",
  source_checked_cancelled: "Source check cancelled",
  privacy_receipt_recorded: "Privacy receipt recorded",
  source_policy_changed: "Source policy changed",
  recovery_restored: "Data restored",
  recovery_failed: "Recovery failed",
  recovery_retried: "Recovery retried",
  application_status_changed: "Application status changed",
  application_email_received: "Application email received",
  application_email_sent: "Application email sent",
  application_phone_called: "Application phone call",
  application_interview_scheduled: "Interview scheduled",
  application_note_added: "Application note added",
  application_reminder_set: "Application reminder set",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function getCaseStatus(caseFile: CaseFile) {
  if (caseFile.outcome) return `Outcome: ${titleCase(caseFile.outcome.status)}`;
  if (caseFile.offer) return `Offer: ${titleCase(caseFile.offer.status)}`;
  if (caseFile.interviews && caseFile.interviews.upcoming_count > 0) {
    return `${caseFile.interviews.upcoming_count} upcoming interview${caseFile.interviews.upcoming_count === 1 ? "" : "s"}`;
  }
  if (caseFile.application) return `Application: ${titleCase(caseFile.application.status)}`;
  return "No application activity yet";
}

const decisionLabels: Record<CaseFile["decision"]["kind"], string> = {
  apply: "Apply",
  maybe: "Maybe",
  skip: "Skip",
  research_more: "Research more",
};

const requirementStateLabels: Record<
  CaseFile["evidence"]["requirements"][number]["match_state"],
  string
> = {
  direct: "Visible evidence",
  strong: "Visible evidence",
  partial: "Needs support",
  implied: "Check wording",
  missing: "Not found",
};

const evidenceKindLabels: Record<
  CaseFile["evidence"]["requirements"][number]["evidence"][number]["kind"],
  string
> = {
  resume_bullet: "Resume bullet",
  project: "Project",
  skill: "Skill",
  certification: "Certification",
  resume_evidence: "Resume evidence",
};

export function OpportunityCaseAction({ jobHash }: OpportunityCaseActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const openCase = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      setCaseFile(await invoke<CaseFile>("open_opportunity_case", { jobHash }));
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [jobHash]);

  const handleOpen = () => {
    setIsOpen(true);
    void openCase();
  };

  const close = () => {
    setIsOpen(false);
    setCaseFile(null);
    setHasError(false);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleOpen}>
        Open case
      </Button>
      <Modal isOpen={isOpen} onClose={close} title="Opportunity case" size="lg">
        {isLoading && <p role="status">Opening case…</p>}
        {hasError && (
          <div className="space-y-3" role="alert">
            <p>Could not open this case.</p>
            <Button variant="secondary" size="sm" onClick={() => void openCase()}>
              Retry
            </Button>
          </div>
        )}
        {caseFile && !isLoading && !hasError && (
          <div className="min-w-0 space-y-5 text-sm text-surface-700 dark:text-surface-300">
            <header>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{caseFile.job.title}</h3>
              <p>{caseFile.job.company}{caseFile.job.location ? `, ${caseFile.job.location}` : ""}</p>
            </header>

            <section aria-labelledby="case-status">
              <h4 id="case-status" className="font-semibold text-surface-900 dark:text-white">Case status</h4>
              <p>{getCaseStatus(caseFile)}</p>
            </section>

            <section aria-labelledby="case-decision">
              <h4 id="case-decision" className="font-semibold text-surface-900 dark:text-white">Decision summary</h4>
              <p className="font-medium">{decisionLabels[caseFile.decision.kind]}</p>
            </section>

            <section aria-labelledby="case-why-not">
              <h4 id="case-why-not" className="font-semibold text-surface-900 dark:text-white">Why not this job?</h4>
              {caseFile.decision.kind === "apply" ? (
                <p>No current blockers recorded.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5">
                  {caseFile.decision.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
            </section>

            <section aria-labelledby="case-evidence">
              <h4 id="case-evidence" className="font-semibold text-surface-900 dark:text-white">Evidence wall</h4>
              <p>{caseFile.evidence.confirmed_count} confirmed, {caseFile.evidence.current_packet_count} current packet{caseFile.evidence.current_packet_count === 1 ? "" : "s"}.</p>
              {caseFile.evidence.stale_packet_count > 0 && <p>Evidence needs review before reuse.</p>}
              {caseFile.evidence.review_status === "no_saved_match" && (
                <p>Compare this job with your active saved resume to build the evidence wall.</p>
              )}
              {caseFile.evidence.review_status === "needs_refresh" && (
                <p>The saved-resume evidence review changed. Refresh it before relying on the results.</p>
              )}
              {caseFile.evidence.review_status === "ready" && caseFile.evidence.requirements.length === 0 && (
                <p>The posting does not contain enough recognized requirements for an evidence review.</p>
              )}
              {caseFile.evidence.requirements.length > 0 && (
                <div className="mt-3 space-y-3">
                  {caseFile.evidence.requirements.map((requirement) => (
                    <article
                      className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                      key={`${requirement.requirement}-${requirement.importance}`}
                    >
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <h5 className="break-words font-medium text-surface-900 dark:text-white">
                          {requirement.requirement}
                        </h5>
                        <div className="flex flex-wrap gap-2 text-xs font-medium">
                          <span>{titleCase(requirement.importance)}</span>
                          {requirement.blocking && <span>Hard blocker</span>}
                        </div>
                      </div>
                      <p>{requirementStateLabels[requirement.match_state]}</p>
                      {requirement.why_not && <p>Why not: {requirement.why_not.replace(/_/g, " ")}</p>}
                      {requirement.evidence.length === 0 ? (
                        <p>No supporting evidence available</p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {requirement.evidence.map((evidence, index) => (
                            <li key={`${evidence.kind}-${index}`}>
                              {evidenceKindLabels[evidence.kind]}, {evidence.confirmed ? "confirmed" : "not confirmed"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="case-timeline">
              <h4 id="case-timeline" className="font-semibold text-surface-900 dark:text-white">Timeline</h4>
              {caseFile.timeline.length === 0 ? <p>No case activity yet.</p> : (
                <ul className="space-y-1">
                  {caseFile.timeline.map((event, index) => (
                    <li className="flex flex-wrap justify-between gap-x-3" key={`${event.at}-${event.kind}-${index}`}>
                      <span>{timelineLabels[event.kind] ?? titleCase(event.kind)}</span>
                      <time className="text-surface-500" dateTime={event.at}>{formatCompactDateTime(event.at)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="rounded-lg bg-surface-50 p-3 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              Source: {caseFile.source.name}. Last checked <time dateTime={caseFile.source.last_seen_at}>{formatEventDate(caseFile.source.last_seen_at)}</time>. {caseFile.source.stale ? "Source may be stale. " : ""}This local case is available offline.{caseFile.source.connectivity_required ? " Source refresh needs a connection." : ""}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
