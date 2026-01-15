interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-surface-400 dark:text-surface-500">{icon}</div>
        </div>
      )}
      <h3 className="font-display text-display-md text-surface-700 dark:text-surface-300 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
