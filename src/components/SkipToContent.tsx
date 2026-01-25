import { memo } from "react";

export const SkipToContent = memo(function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-50
        bg-sentinel-500 text-white
        px-4 py-2 rounded-lg font-medium
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-2
      "
    >
      Skip to main content
    </a>
  );
});
