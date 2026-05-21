import { useState, useCallback, useMemo, type ReactNode, useEffect, useRef } from "react";
import { AnnouncerContext, type AnnouncerContextType } from "./announcerContextDef";

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite"): void => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (priority === "assertive") {
      setAssertiveMessage(message);
      // Clear after announcement
      timeoutRef.current = setTimeout(() => setAssertiveMessage(""), 1000);
    } else {
      setPoliteMessage(message);
      // Clear after announcement
      timeoutRef.current = setTimeout(() => setPoliteMessage(""), 1000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo<AnnouncerContextType>(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      {/* Screen reader live regions - visually hidden but announced */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}
