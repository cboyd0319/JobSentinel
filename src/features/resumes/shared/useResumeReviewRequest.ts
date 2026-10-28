/** Cancels superseded native reviews and guards UI updates with a unique request identity. */
import { useCallback, useEffect, useRef } from "react";
import { invoke } from "../../../platform/tauri";

export function useResumeReviewRequest() {
  const active = useRef<{ requestId: string; cancellable: boolean } | null>(null);
  const cancel = useCallback(() => {
    const request = active.current;
    active.current = null;
    if (request?.cancellable) {
      void invoke<boolean>("cancel_resume_review", { requestId: request.requestId }).catch(() => {
        // UI invalidation is immediate; native cancellation is best effort and may await a running kernel.
      });
    }
  }, []);
  const begin = useCallback((cancellable = true) => {
    cancel();
    const requestId = crypto.randomUUID();
    active.current = { requestId, cancellable };
    return requestId;
  }, [cancel]);
  const isCurrent = useCallback((requestId: string) => active.current?.requestId === requestId, []);
  const finish = useCallback((requestId: string) => {
    if (active.current?.requestId === requestId) active.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  return { begin, cancel, isCurrent, finish };
}
