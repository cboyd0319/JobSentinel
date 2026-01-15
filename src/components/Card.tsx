interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
  onClick,
}: CardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={`
        bg-white dark:bg-surface-800 rounded-card 
        border border-surface-100 dark:border-surface-700 
        shadow-soft dark:shadow-none
        transition-all duration-200 ease-out
        ${paddingStyles[padding]}
        ${hover || isInteractive 
          ? "hover:shadow-card-hover hover:-translate-y-0.5 hover:border-surface-200 dark:hover:border-surface-600" 
          : ""
        }
        ${isInteractive ? "cursor-pointer hover:border-sentinel-200 dark:hover:border-sentinel-700" : ""}
        ${className}
      `}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}

// Card subcomponents for structured content
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-display text-display-md text-surface-900 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardDivider() {
  return <hr className="border-surface-100 dark:border-surface-700 my-4" />;
}
