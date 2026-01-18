import { Button } from "./";

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

export function MarketAlertCard({ alert, onMarkRead }: MarketAlertCardProps) {
  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          icon: "🚨",
          badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
        };
      case "warning":
        return {
          bg: "bg-alert-50 dark:bg-alert-900/20",
          border: "border-alert-200 dark:border-alert-800",
          icon: "⚠️",
          badge: "bg-alert-100 dark:bg-alert-900/40 text-alert-700 dark:text-alert-300",
        };
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          icon: "ℹ️",
          badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
        };
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "skill_surge":
        return "🔧";
      case "salary_spike":
        return "💰";
      case "hiring_freeze":
        return "❄️";
      case "hiring_spree":
        return "🚀";
      case "location_boom":
        return "📍";
      case "role_obsolete":
        return "📉";
      default:
        return "📊";
    }
  };

  const formatChange = (change: number | null) => {
    if (change === null) return null;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const styles = getSeverityStyles(alert.severity);

  return (
    <div
      className={`p-4 rounded-lg border ${styles.bg} ${styles.border} ${
        alert.is_read ? "opacity-60" : ""
      }`}
      role="article"
      aria-label={`${alert.severity} alert: ${alert.title}`}
      aria-live={!alert.is_read ? "polite" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-xl flex-shrink-0">
            {getAlertTypeIcon(alert.alert_type)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-surface-900 dark:text-surface-100">
                {alert.title}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                {alert.severity}
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
              <span>{formatDate(alert.created_at)}</span>
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
}

interface MarketAlertListProps {
  alerts: MarketAlert[];
  onMarkRead?: (id: number) => void;
  onMarkAllRead?: () => void;
  loading?: boolean;
}

export function MarketAlertList({
  alerts = [],
  onMarkRead,
  onMarkAllRead,
  loading = false,
}: MarketAlertListProps) {
  const unreadCount = (alerts ?? []).filter((a) => !a.is_read).length;

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading market alerts">
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
        No market alerts at this time.
      </div>
    );
  }

  return (
    <div className="space-y-3" role="feed" aria-label="Market alerts">
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
}
