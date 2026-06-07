import { memo } from "react";
import { Tooltip } from "./Tooltip";

interface HelpIconProps {
  text: string;
  size?: "sm" | "md" | "lg";
  position?: "top" | "bottom" | "left" | "right";
}

const sizeStyles = {
  sm: "w-4 h-4 text-xs",
  md: "w-5 h-5 text-sm",
  lg: "w-6 h-6 text-base",
};

export const HelpIcon = memo(function HelpIcon({ text, size = "sm", position = "top" }: HelpIconProps) {
  return (
    <Tooltip content={text} position={position}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center
          ${sizeStyles[size]}
          rounded-full
          bg-surface-200 dark:bg-surface-700
          text-surface-600 dark:text-surface-400
          hover:bg-surface-300 dark:hover:bg-surface-600
          transition-colors
          cursor-help
          font-semibold
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-surface-900
        `}
        aria-label={text}
      >
        ?
      </button>
    </Tooltip>
  );
});
