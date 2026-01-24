// Dashboard Widgets - Visual analytics for job search progress
// Uses Recharts for charts

import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, FunnelChart, Funnel, LabelList
} from 'recharts';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { logError } from '../utils/errorUtils';

// Types matching backend
interface ApplicationStats {
  total: number;
  by_status: StatusCounts;
  response_rate: number;
  offer_rate: number;
  weekly_applications: WeeklyData[];
}

interface StatusCounts {
  to_apply: number;
  applied: number;
  screening_call: number;
  phone_interview: number;
  technical_interview: number;
  onsite_interview: number;
  offer_received: number;
  offer_accepted: number;
  offer_rejected: number;
  rejected: number;
  ghosted: number;
  withdrawn: number;
}

interface WeeklyData {
  week: string;
  count: number;
}

interface JobsBySource {
  source: string;
  count: number;
}

interface SalaryRange {
  range: string;
  count: number;
}

// Color palette
const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  surface: '#64748b',
};

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

interface DashboardWidgetsProps {
  className?: string;
}

export function DashboardWidgets({ className = '' }: DashboardWidgetsProps) {
  const [appStats, setAppStats] = useState<ApplicationStats | null>(null);
  const [jobsBySource, setJobsBySource] = useState<JobsBySource[]>([]);
  const [salaryRanges, setSalaryRanges] = useState<SalaryRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch application stats
      const stats = await invoke<ApplicationStats>('get_application_stats');
      setAppStats(stats);

      // Fetch jobs by source (optional, degrade gracefully)
      const jobs = await invoke<{ source: string; count: number }[]>('get_jobs_by_source').catch((err) => {
        logError('Failed to load jobs by source (non-critical):', err);
        return [];
      });
      setJobsBySource(jobs);

      // Calculate salary ranges from jobs (optional, degrade gracefully)
      const salaryData = await invoke<SalaryRange[]>('get_salary_distribution').catch((err) => {
        logError('Failed to load salary distribution (non-critical):', err);
        return [];
      });
      setSalaryRanges(salaryData);
    } catch (error) {
      logError('Failed to load widget data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  // Build funnel data from status counts
  const funnelData = appStats ? [
    { name: 'Applied', value: appStats.by_status.applied, fill: COLORS.primary },
    { name: 'Screening', value: appStats.by_status.screening_call, fill: COLORS.info },
    { name: 'Phone', value: appStats.by_status.phone_interview, fill: '#8b5cf6' },
    { name: 'Technical', value: appStats.by_status.technical_interview, fill: '#ec4899' },
    { name: 'Onsite', value: appStats.by_status.onsite_interview, fill: COLORS.warning },
    { name: 'Offers', value: appStats.by_status.offer_received, fill: COLORS.success },
  ].filter(d => d.value > 0) : [];

  // Source data for pie chart
  const sourceData = jobsBySource.map((s, i) => ({
    name: formatSourceName(s.source),
    value: s.count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className={className}>
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors mb-4"
      >
        <div className="flex items-center gap-2">
          <ChartIcon className="w-5 h-5 text-sentinel-500" />
          <span className="font-medium text-surface-800 dark:text-surface-200">Analytics Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {appStats && (
            <div className="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
              <span>{appStats.total} applications</span>
              <span>{Math.round(appStats.response_rate * 100)}% response rate</span>
            </div>
          )}
          <ChevronIcon className={`w-5 h-5 text-surface-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Application Funnel */}
          {funnelData.length > 0 && (
            <Card className="p-4 dark:bg-surface-800">
              <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-4">Application Funnel</h4>
              <ResponsiveContainer width="100%" height={200}>
                <FunnelChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-800)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="center" fill="#fff" stroke="none" fontSize={12} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2 text-xs text-surface-500 dark:text-surface-400">
                {funnelData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Weekly Activity */}
          {appStats?.weekly_applications && appStats.weekly_applications.length > 0 && (
            <Card className="p-4 dark:bg-surface-800">
              <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-4">Weekly Activity</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={appStats.weekly_applications}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-800)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActivity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Jobs by Source */}
          {sourceData.length > 0 && (
            <Card className="p-4 dark:bg-surface-800">
              <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-4">Jobs by Source</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-800)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-surface-600 dark:text-surface-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Salary Distribution */}
          {salaryRanges.length > 0 && (
            <Card className="p-4 dark:bg-surface-800">
              <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-4">Salary Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salaryRanges}>
                  <XAxis
                    dataKey="range"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-800)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="count" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Quick Stats Cards */}
          {appStats && (
            <Card className="p-4 dark:bg-surface-800 md:col-span-2">
              <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-4">Quick Stats</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBox
                  label="Response Rate"
                  value={`${Math.round(appStats.response_rate * 100)}%`}
                  color={appStats.response_rate > 0.3 ? 'success' : appStats.response_rate > 0.15 ? 'warning' : 'danger'}
                />
                <StatBox
                  label="Offer Rate"
                  value={`${Math.round(appStats.offer_rate * 100)}%`}
                  color={appStats.offer_rate > 0.1 ? 'success' : appStats.offer_rate > 0.05 ? 'warning' : 'surface'}
                />
                <StatBox
                  label="Active"
                  value={String(
                    appStats.by_status.applied +
                    appStats.by_status.screening_call +
                    appStats.by_status.phone_interview +
                    appStats.by_status.technical_interview +
                    appStats.by_status.onsite_interview
                  )}
                  color="info"
                />
                <StatBox
                  label="Ghosted"
                  value={String(appStats.by_status.ghosted)}
                  color={appStats.by_status.ghosted > 5 ? 'danger' : 'surface'}
                />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: keyof typeof COLORS }) {
  const bgColors = {
    primary: 'bg-indigo-50 dark:bg-indigo-900/20',
    success: 'bg-green-50 dark:bg-green-900/20',
    warning: 'bg-amber-50 dark:bg-amber-900/20',
    danger: 'bg-red-50 dark:bg-red-900/20',
    info: 'bg-blue-50 dark:bg-blue-900/20',
    surface: 'bg-surface-50 dark:bg-surface-700',
  };

  const textColors = {
    primary: 'text-indigo-700 dark:text-indigo-300',
    success: 'text-green-700 dark:text-green-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
    info: 'text-blue-700 dark:text-blue-300',
    surface: 'text-surface-700 dark:text-surface-300',
  };

  return (
    <div className={`p-3 rounded-lg ${bgColors[color]}`}>
      <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${textColors[color]}`}>{value}</p>
    </div>
  );
}

function formatSourceName(source: string): string {
  const names: Record<string, string> = {
    greenhouse: 'Greenhouse',
    lever: 'Lever',
    linkedin: 'LinkedIn',
    indeed: 'Indeed',
    remoteok: 'RemoteOK',
    hn_hiring: 'HN Hiring',
    weworkremotely: 'WWR',
    ziprecruiter: 'ZipRecruiter',
    builtin: 'BuiltIn',
    dice: 'Dice',
    wellfound: 'Wellfound',
  };
  return names[source.toLowerCase()] || source;
}

function ChartIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
