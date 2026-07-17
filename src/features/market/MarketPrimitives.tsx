import { memo } from "react";

export type TabIcon = "chart" | "tool" | "building" | "location" | "bell";
export type MarketIcon =
  | TabIcon
  | "trend-up"
  | "trend-down"
  | "trend-flat"
  | "factory";

export function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function MarketIconView({
  icon,
  className = "h-4 w-4",
}: {
  icon: MarketIcon;
  className?: string;
}) {
  const commonProps = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    "aria-hidden": true,
  };

  switch (icon) {
    case "trend-up":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 17l6-6 4 4 6-8m0 0v6m0-6h-6" />
        </svg>
      );
    case "trend-down":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7l6 6 4-4 6 8m0 0v-6m0 6h-6" />
        </svg>
      );
    case "trend-flat":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14" />
        </svg>
      );
    case "chart":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V5m4 14v-6m4 6V9m4 10v-8m4 8V7" />
        </svg>
      );
    case "tool":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.7 6.3l3 3m-1.5-4.5l3 3-8.7 8.7H7.5v-3L16.2 4.8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 19h14" />
        </svg>
      );
    case "building":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 9h1m-1 4h1m4-4h1m-1 4h1M3 21h18" />
        </svg>
      );
    case "location":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s6-5.4 6-11a6 6 0 10-12 0c0 5.6 6 11 6 11z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10.5h.01" />
        </svg>
      );
    case "bell":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" />
        </svg>
      );
    case "factory":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 21V9l5 3V9l5 3V7h6v14H4zm4-5h1m4 0h1m4 0h1" />
        </svg>
      );
  }
}

export function TabIconView({ icon }: { icon: TabIcon }) {
  return <MarketIconView icon={icon} />;
}

interface TrendIndicatorProps {
  direction: string;
  percent: number;
}

const TREND_ICONS: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

export const TrendIndicator = memo(function TrendIndicator({
  direction,
  percent,
}: TrendIndicatorProps) {
  const icon = TREND_ICONS[(direction ?? "stable").toLowerCase()] ?? TREND_ICONS.stable;
  const color = percent > 0
    ? "text-green-600 dark:text-green-400"
    : percent < 0
      ? "text-red-600 dark:text-red-400"
      : "text-surface-500 dark:text-surface-400";

  return (
    <span className={`text-sm font-medium ${color}`}>
      {icon} {percent > 0 ? "+" : ""}
      {percent.toFixed(1)}%
    </span>
  );
});
