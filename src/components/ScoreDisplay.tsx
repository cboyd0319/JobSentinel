interface ScoreDisplayProps {
  score: number; // 0-1 range
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

export function ScoreDisplay({
  score,
  size = "md",
  showLabel = true,
  animate = true,
}: ScoreDisplayProps) {
  const percentage = Math.round(score * 100);
  
  // Color based on score
  const getScoreColor = () => {
    if (score >= 0.9) return { ring: "stroke-alert-500", text: "text-alert-600", glow: "shadow-alert-glow" };
    if (score >= 0.7) return { ring: "stroke-sentinel-500", text: "text-sentinel-600", glow: "" };
    if (score >= 0.5) return { ring: "stroke-surface-400", text: "text-surface-600", glow: "" };
    return { ring: "stroke-surface-300", text: "text-surface-500", glow: "" };
  };

  const colors = getScoreColor();

  const sizeConfig = {
    sm: { container: "w-12 h-12", strokeWidth: 3, fontSize: "text-xs", radius: 18 },
    md: { container: "w-16 h-16", strokeWidth: 4, fontSize: "text-sm", radius: 26 },
    lg: { container: "w-20 h-20", strokeWidth: 5, fontSize: "text-base", radius: 34 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (score * circumference);

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className={`relative ${config.container} ${score >= 0.9 ? colors.glow : ""} rounded-full`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          {/* Background ring */}
          <circle
            cx="40"
            cy="40"
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-surface-100"
          />
          {/* Score ring */}
          <circle
            cx="40"
            cy="40"
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : strokeDashoffset}
            className={`${colors.ring} transition-all duration-1000 ease-out`}
            style={{
              strokeDashoffset: strokeDashoffset,
              transitionDelay: animate ? "200ms" : "0ms",
            }}
          />
        </svg>
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono font-semibold ${config.fontSize} ${colors.text}`}>
            {percentage}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${colors.text}`}>
          {score >= 0.9 ? "Excellent" : score >= 0.7 ? "Good" : score >= 0.5 ? "Fair" : "Low"}
        </span>
      )}
    </div>
  );
}

// Simple horizontal score bar
interface ScoreBarProps {
  score: number;
  className?: string;
}

export function ScoreBar({ score, className = "" }: ScoreBarProps) {
  const percentage = Math.round(score * 100);
  
  const getColor = () => {
    if (score >= 0.9) return "bg-alert-500";
    if (score >= 0.7) return "bg-sentinel-500";
    if (score >= 0.5) return "bg-surface-400";
    return "bg-surface-300";
  };

  return (
    <div className={`relative h-2 bg-surface-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${getColor()}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
