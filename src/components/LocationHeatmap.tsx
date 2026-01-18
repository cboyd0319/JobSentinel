import { useState } from "react";
import { Card, Badge } from "./";

interface LocationHeat {
  location: string;
  city: string | null;
  state: string | null;
  total_jobs: number;
  avg_median_salary: number | null;
  remote_percent: number;
}

interface LocationHeatmapProps {
  locations: LocationHeat[];
  loading?: boolean;
}

export function LocationHeatmap({ locations, loading = false }: LocationHeatmapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationHeat | null>(null);

  if (loading) {
    return (
      <Card className="dark:bg-surface-800">
        <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
          Job Market by Location
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="animate-pulse h-24 bg-surface-200 dark:bg-surface-700 rounded-lg"
            />
          ))}
        </div>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card className="dark:bg-surface-800">
        <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
          Job Market by Location
        </h3>
        <p className="text-center text-surface-500 dark:text-surface-400 py-8">
          No location data available. Run analysis to gather insights.
        </p>
      </Card>
    );
  }

  // Calculate max jobs for intensity scaling
  const maxJobs = Math.max(...locations.map((l) => l.total_jobs));

  const getIntensityColor = (jobs: number) => {
    const intensity = jobs / maxJobs;
    if (intensity > 0.75) return "bg-sentinel-100 dark:bg-sentinel-900/40 border-sentinel-300 dark:border-sentinel-700";
    if (intensity > 0.5) return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700";
    if (intensity > 0.25) return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700";
    return "bg-surface-100 dark:bg-surface-800 border-surface-300 dark:border-surface-600";
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLocationName = (loc: LocationHeat) => {
    if (loc.location.toLowerCase() === "remote") return "🌐 Remote";
    if (loc.city && loc.state) return `${loc.city}, ${loc.state}`;
    return loc.location;
  };

  return (
    <Card className="dark:bg-surface-800">
      <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
        Job Market by Location
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {locations.map((loc) => (
          <button
            key={loc.location}
            onClick={() => setSelectedLocation(selectedLocation?.location === loc.location ? null : loc)}
            className={`p-3 rounded-lg border transition-all text-left ${getIntensityColor(loc.total_jobs)} ${
              selectedLocation?.location === loc.location
                ? "ring-2 ring-sentinel-500 ring-offset-2 dark:ring-offset-surface-900"
                : "hover:scale-[1.02]"
            }`}
          >
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-surface-800 dark:text-surface-200 text-sm truncate">
                {formatLocationName(loc)}
              </h4>
            </div>
            <p className="text-lg font-bold text-surface-900 dark:text-white mt-1">
              {loc.total_jobs.toLocaleString()}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">jobs</p>
            <div className="flex items-center gap-2 mt-2">
              {loc.remote_percent > 0 && (
                <Badge variant="surface" className="text-xs">
                  {loc.remote_percent.toFixed(0)}% remote
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Selected location detail */}
      {selectedLocation && (
        <div className="mt-4 p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-surface-900 dark:text-white">
              {formatLocationName(selectedLocation)}
            </h4>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-surface-500 dark:text-surface-400">Total Jobs</p>
              <p className="font-medium text-surface-900 dark:text-white">
                {selectedLocation.total_jobs.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-surface-500 dark:text-surface-400">Median Salary</p>
              <p className="font-medium text-surface-900 dark:text-white">
                {formatCurrency(selectedLocation.avg_median_salary)}
              </p>
            </div>
            <div>
              <p className="text-surface-500 dark:text-surface-400">Remote %</p>
              <p className="font-medium text-surface-900 dark:text-white">
                {selectedLocation.remote_percent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400">
        <span>Job Density:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-surface-100 dark:bg-surface-800 border border-surface-300" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-sentinel-100 dark:bg-sentinel-900/40 border border-sentinel-300" />
          <span>Very High</span>
        </div>
      </div>
    </Card>
  );
}
