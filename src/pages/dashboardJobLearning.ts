import type { Job } from "./DashboardTypes";
import { recordBrowserAssistLearningSignalIfEnabled } from "../shared/browserAssistLearning";

export function recordJobLearningSignal(action: string, job: Job) {
  recordBrowserAssistLearningSignalIfEnabled({
    source: action === "note" ? "job-notes" : "job-card",
    action,
    title: job.title,
    company: job.company,
    recordedAt: new Date().toISOString(),
  });
}
