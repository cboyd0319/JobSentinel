import { lazy, Suspense } from "react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { ChartSkeleton } from "../../ui/LoadingFallbacks";
import { formatCurrency } from "../../utils/formatUtils";
import { LocationHeatmap } from "./LocationHeatmap";
import { MarketAlertList } from "./MarketAlertCard";
import { MarketSnapshotCard } from "./MarketSnapshotCard";
import { TrendIndicator } from "./MarketPrimitives";
import type {
  CompanyActivity,
  LocationHeat,
  MarketAlert,
  MarketSnapshot,
  SkillTrend,
} from "./model";

const TrendChart = lazy(() => import("./TrendChart").then((module) => ({ default: module.TrendChart })));

interface OverviewPanelProps {
  alerts: MarketAlert[];
  companies: CompanyActivity[];
  companyEmptyMessage: string;
  locationEmptyMessage: string;
  locations: LocationHeat[];
  onMarkAlertRead: (id: number) => void;
  onShowAlerts: () => void;
  skillEmptyMessage: string;
  skills: SkillTrend[];
  snapshot: MarketSnapshot | null;
  snapshotEmptyMessage: string;
  unreadAlertCount: number;
}

export function MarketOverviewPanel({
  alerts,
  companies,
  companyEmptyMessage,
  locationEmptyMessage,
  locations,
  onMarkAlertRead,
  onShowAlerts,
  skillEmptyMessage,
  skills,
  snapshot,
  snapshotEmptyMessage,
  unreadAlertCount,
}: OverviewPanelProps) {
  return (
    <div className="space-y-6">
      <MarketSnapshotCard snapshot={snapshot} emptyMessage={snapshotEmptyMessage} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <TrendChart
            data={skills.slice(0, 8)}
            type="bar"
            title="Skills Appearing More Often"
            xKey="skill_name"
            yKey="total_jobs"
            yLabel="Jobs"
            color="#6366f1"
            emptyMessage={skillEmptyMessage}
          />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <TrendChart
            data={companies.slice(0, 8)}
            type="bar"
            title="Company Hiring Activity"
            xKey="company_name"
            yKey="total_posted"
            yLabel="Jobs Posted"
            color="#10b981"
            emptyMessage={companyEmptyMessage}
          />
        </Suspense>
      </div>
      <LocationHeatmap locations={locations} emptyMessage={locationEmptyMessage} />
      {unreadAlertCount > 0 && (
        <Card className="dark:bg-surface-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-display-sm text-surface-900 dark:text-white">
              Recent Alerts ({unreadAlertCount} unread)
            </h3>
            <Button variant="ghost" onClick={onShowAlerts}>View All</Button>
          </div>
          <MarketAlertList alerts={alerts.slice(0, 3)} onMarkRead={onMarkAlertRead} />
        </Card>
      )}
    </div>
  );
}

export function MarketSkillsPanel({ skills, emptyMessage }: { skills: SkillTrend[]; emptyMessage: string }) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ChartSkeleton />}>
        <TrendChart
          data={skills}
          type="bar"
          title="Skills by Demand"
          xKey="skill_name"
          yKey="total_jobs"
          yLabel="Total Jobs"
          color="#6366f1"
          height={350}
          emptyMessage={emptyMessage}
        />
      </Suspense>
      <Card className="dark:bg-surface-800">
        <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">Skill Trends</h3>
        {skills.length === 0 ? (
          <p className="text-surface-500 dark:text-surface-400 text-center py-8">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill, index) => (
              <div
                key={skill.skill_name}
                className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-full flex items-center justify-center text-sm font-medium text-sentinel-600 dark:text-sentinel-400">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">{skill.skill_name}</p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {skill.total_jobs.toLocaleString()} jobs
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <TrendIndicator direction={skill.trend_direction} percent={skill.change_percent} />
                  {skill.avg_salary && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      {formatCurrency(skill.avg_salary)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function MarketCompaniesPanel({
  companies,
  emptyMessage,
}: {
  companies: CompanyActivity[];
  emptyMessage: string;
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ChartSkeleton />}>
        <TrendChart
          data={companies}
          type="bar"
          title="Companies by Hiring Volume"
          xKey="company_name"
          yKey="total_posted"
          yLabel="Jobs Posted"
          color="#10b981"
          height={350}
          emptyMessage={emptyMessage}
        />
      </Suspense>
      <Card className="dark:bg-surface-800">
        <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">Hiring Activity</h3>
        {companies.length === 0 ? (
          <p className="text-surface-500 dark:text-surface-400 text-center py-8">{emptyMessage}</p>
        ) : (
          <div className="overflow-visible">
            <table className="app-responsive-table w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="text-left py-3 px-4 font-medium text-surface-500 dark:text-surface-400">Company</th>
                  <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">Jobs Posted</th>
                  <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">Average Open Roles</th>
                  <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">Avg Salary</th>
                  <th className="text-right py-3 px-4 font-medium text-surface-500 dark:text-surface-400">Change in Local Sample</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.company_name}
                    className="border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    <td className="px-4 py-3 font-medium text-surface-900 dark:text-white" data-label="Company">{company.company_name}</td>
                    <td className="px-4 py-3 text-right text-surface-700 dark:text-surface-300" data-label="Jobs Posted">{company.total_posted}</td>
                    <td className="px-4 py-3 text-right text-surface-700 dark:text-surface-300" data-label="Average Open Roles">{company.avg_active.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right text-surface-700 dark:text-surface-300" data-label="Avg Salary">{formatCurrency(company.avg_salary)}</td>
                    <td className="px-4 py-3 text-right" data-label="Change in Local Sample">
                      <TrendIndicator
                        direction={company.growth_rate > 5 ? "up" : company.growth_rate < -5 ? "down" : "flat"}
                        percent={company.growth_rate}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
