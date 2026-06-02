import { memo } from "react";
import { Button } from "./Button";
import { formatCompactDateTime } from "../utils/formatUtils";

interface MarketAlert {
  id: number;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  related_entity: string | null;
  metric_value: number | null;
  metric_change_pct: number | null;
  is_read: boolean;
  created_at: string;
}

interface MarketAlertCardProps {
  alert: MarketAlert;
  onMarkRead?: (id: number) => void;
}

type AlertTypeIconName = "skill" | "salary" | "freeze" | "spree" | "location" | "obsolete" | "default";

// Lookup objects for cleaner mapping (moved outside component to avoid recreation)
const SEVERITY_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  critical: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  },
  warning: {
    bg: "bg-alert-50 dark:bg-alert-900/20",
    border: "border-alert-200 dark:border-alert-800",
    badge: "bg-alert-100 dark:bg-alert-900/40 text-alert-700 dark:text-alert-300",
  },
};

const DEFAULT_SEVERITY_STYLE = {
  bg: "bg-blue-50 dark:bg-blue-900/20",
  border: "border-blue-200 dark:border-blue-800",
  badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
};

const ALERT_TYPE_ICONS: Record<string, AlertTypeIconName> = {
  skill_surge: "skill",
  salary_spike: "salary",
  hiring_freeze: "freeze",
  hiring_spree: "spree",
  location_boom: "location",
  role_obsolete: "obsolete",
};

const DEFAULT_ALERT_ICON: AlertTypeIconName = "default";

function AlertTypeIcon({ type }: { type: AlertTypeIconName }) {
  const commonProps = {
    className: "w-5 h-5",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    "aria-hidden": true,
  };

  switch (type) {
    case "skill":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.7 6.3l3 3m-1.5-4.5l3 3-8.7 8.7H7.5v-3L16.2 4.8z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 19h14" />
        </svg>
      );
    case "salary":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v12m3-9.5A3.5 3.5 0 0012 7c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2a3.5 3.5 0 01-3-1.5" />
        </svg>
      );
    case "freeze":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v18M5.6 6.6l12.8 10.8M18.4 6.6L5.6 17.4M8 3.8L12 7l4-3.2M8 20.2L12 17l4 3.2" />
        </svg>
      );
    case "spree":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 19c4.5-1 9.5-6 10.5-10.5L19 5l-3.5 1C11 7 6 12 5 16.5V19z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 15l-4 4m10-14l4 4" />
        </svg>
      );
    case "location":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s6-5.4 6-11a6 6 0 10-12 0c0 5.6 6 11 6 11z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10.5h.01" />
        </svg>
      );
    case "obsolete":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M6 7l1 13h10l1-13M10 11v5m4-5v5M9 7V4h6v3" />
        </svg>
      );
    case "default":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V5m4 14v-6m4 6V9m4 10v-8m4 8V7" />
        </svg>
      );
  }
}

export const MarketAlertCard = memo(function MarketAlertCard({ alert, onMarkRead }: MarketAlertCardProps) {
  const getSeverityStyles = (severity: string) =>
    SEVERITY_STYLES[severity.toLowerCase()] ?? DEFAULT_SEVERITY_STYLE;

  const getAlertTypeIcon = (type: string) =>
    ALERT_TYPE_ICONS[type.toLowerCase()] ?? DEFAULT_ALERT_ICON;

  const getSeverityLabel = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "Check soon";
      case "warning":
        return "Needs review";
      case "info":
        return "New signal";
      default:
        return "Needs review";
    }
  };

  const formatChange = (change: number | null) => {
    if (change === null) return null;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const styles = getSeverityStyles(alert.severity);
  const severityLabel = getSeverityLabel(alert.severity);

  return (
    <div
      className={`p-4 rounded-lg border ${styles.bg} ${styles.border} ${
        alert.is_read ? "opacity-60" : ""
      }`}
      role="article"
      aria-label={`${severityLabel} alert: ${alert.title}`}
      aria-live={!alert.is_read ? "polite" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="flex-shrink-0 text-surface-500 dark:text-surface-400">
            <AlertTypeIcon type={getAlertTypeIcon(alert.alert_type)} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-surface-900 dark:text-surface-100">
                {alert.title}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                {severityLabel}
              </span>
              {alert.related_entity && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300">
                  {alert.related_entity}
                </span>
              )}
            </div>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              {alert.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-surface-500 dark:text-surface-500">
              {alert.metric_change_pct !== null && (
                <span
                  className={
                    alert.metric_change_pct > 0
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : "text-red-600 dark:text-red-400 font-medium"
                  }
                >
                  {formatChange(alert.metric_change_pct)}
                </span>
              )}
              <span>{formatCompactDateTime(alert.created_at)}</span>
            </div>
          </div>
        </div>
        {!alert.is_read && onMarkRead && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkRead(alert.id)}
            aria-label={`Mark ${alert.title} as read`}
          >
            Mark Read
          </Button>
        )}
      </div>
    </div>
  );
});

interface MarketAlertListProps {
  alerts: MarketAlert[];
  onMarkRead?: (id: number) => void;
  onMarkAllRead?: () => void;
  loading?: boolean;
}

export const MarketAlertList = memo(function MarketAlertList({
  alerts = [],
  onMarkRead,
  onMarkAllRead,
  loading = false,
}: MarketAlertListProps) {
  const unreadCount = (alerts ?? []).filter((a) => !a.is_read).length;

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading hiring trend alerts">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-surface-200 dark:bg-surface-700 rounded-lg" aria-hidden="true" />
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-surface-500 dark:text-surface-400" role="status">
        No hiring trend alerts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3" role="feed" aria-label="Hiring trend alerts">
      {unreadCount > 0 && onMarkAllRead && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-surface-600 dark:text-surface-400" role="status" aria-live="polite" aria-atomic="true">
            {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
          </span>
          <Button variant="ghost" size="sm" onClick={onMarkAllRead} aria-label={`Mark all ${unreadCount} alerts as read`}>
            Mark All Read
          </Button>
        </div>
      )}
      {alerts.map((alert) => (
        <MarketAlertCard key={alert.id} alert={alert} onMarkRead={onMarkRead} />
      ))}
    </div>
  );
});
