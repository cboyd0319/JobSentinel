import { memo, useEffect, useRef, KeyboardEvent } from "react";

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
}

export const FocusTrap = memo(function FocusTrap({ children, active = true }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element with proper timing
    requestAnimationFrame(() => {
      if (!isMountedRef.current || !container) return;
      
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        if (firstElement && document.body.contains(firstElement)) {
          firstElement.focus();
        }
      }
    });
  }, [active]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!active || e.key !== "Tab") return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
});

function getFocusableElements(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
}
