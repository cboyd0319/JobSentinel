import { useEffect, type RefObject } from "react";
import { useKeyboardNavigation } from "../../../hooks/useKeyboardNavigation";
import type { Job } from "../types";

interface DashboardKeyboardOptions {
  enabled: boolean;
  items: Job[];
  jobListRef: RefObject<HTMLDivElement | null>;
  onBookmark: (job: Job) => void;
  onHide: (job: Job) => void;
  onNotes: (job: Job) => void;
  onOpen: (job: Job) => void;
  onRefresh: () => void;
  onResearch: (job: Job) => void;
  onToggleSelect: (job: Job) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function useDashboardKeyboard({
  enabled,
  items,
  jobListRef,
  onBookmark,
  onHide,
  onNotes,
  onOpen,
  onRefresh,
  onResearch,
  onToggleSelect,
  searchInputRef,
}: DashboardKeyboardOptions) {
  const navigation = useKeyboardNavigation({
    items,
    enabled,
    onOpen,
    onHide,
    onBookmark,
    onNotes,
    onResearch,
    onToggleSelect,
    onFocusSearch: () => searchInputRef.current?.focus(),
    onRefresh,
  });

  useEffect(() => {
    const handleFocusSearch = () => searchInputRef.current?.focus();
    const handleSlashFocus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        (event.key !== "/" && event.code !== "Slash") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      window.setTimeout(() => {
        const searchInput = document.querySelector<HTMLInputElement>(
          "[data-testid='search-input']",
        );
        (searchInput ?? searchInputRef.current)?.focus();
      }, 0);
    };

    window.addEventListener("keyboard-focus-search", handleFocusSearch);
    document.addEventListener("keydown", handleSlashFocus, true);
    return () => {
      window.removeEventListener("keyboard-focus-search", handleFocusSearch);
      document.removeEventListener("keydown", handleSlashFocus, true);
    };
  }, [searchInputRef]);

  useEffect(() => {
    if (
      navigation.isKeyboardActive &&
      navigation.selectedIndex >= 0 &&
      jobListRef.current
    ) {
      const selectedElement = jobListRef.current.querySelector(
        `[data-selected="true"]`,
      );
      selectedElement?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [jobListRef, navigation.isKeyboardActive, navigation.selectedIndex]);

  return navigation;
}
