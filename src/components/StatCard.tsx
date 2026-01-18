interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: "sentinel" | "alert" | "surface";
}

const accentStyles = {
  sentinel: {
    icon: "bg-sentinel-50 dark:bg-sentinel-900/30 text-sentinel-500",
    bar: "from-sentinel-400 to-sentinel-500",
    value: "text-surface-900 dark:text-white",
  },
  alert: {
    icon: "bg-alert-50 dark:bg-alert-900/30 text-alert-500",
    bar: "from-alert-400 to-alert-500",
    value: "text-alert-600 dark:text-alert-400",
  },
  surface: {
    icon: "bg-surface-100 dark:bg-surface-700 text-surface-500",
    bar: "",
    value: "text-surface-900 dark:text-white",
  },
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  accentColor = "sentinel",
}: StatCardProps) {
  const styles = accentStyles[accentColor];

  return (
    <div className="relative bg-white dark:bg-surface-800 rounded-card border border-surface-100 dark:border-surface-700 shadow-soft dark:shadow-none overflow-hidden p-6" role="article" aria-label={`${label} statistic`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className={`font-display text-display-xl ${styles.value}`} aria-label={`${label} value: ${typeof value === "number" ? value.toLocaleString() : value}`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? "text-success" : "text-danger"
                }`}
                aria-label={`${trend.isPositive ? "increased" : "decreased"} by ${Math.abs(trend.value)} percent`}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${styles.icon}`} aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      {styles.bar && (
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.bar}`} aria-hidden="true" />
      )}
    </div>
  );
}
