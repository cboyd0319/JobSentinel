// Core UI Components
export { Button } from "./Button";
export { Input } from "./Input";
export { Card, CardHeader, CardDivider } from "./Card";
export { Badge } from "./Badge";
export { LoadingSpinner, LoadingDots } from "./LoadingSpinner";
export { ScoreDisplay, ScoreBar } from "./ScoreDisplay";
export { ScoreBreakdownModal } from "./ScoreBreakdownModal";
export { JobCard } from "./JobCard";
export { EmptyState } from "./EmptyState";
export { StatCard } from "./StatCard";
export { FocusTrap } from "./FocusTrap";
export { SkipToContent } from "./SkipToContent";
export { ThemeToggle } from "./ThemeToggle";
export { Modal, ModalFooter } from "./Modal";
export { Tooltip } from "./Tooltip";
export { HelpIcon } from "./HelpIcon";
export { Dropdown } from "./Dropdown";
export { Skeleton, SkeletonCard, SkeletonJobCard, SkeletonStatCard, SkeletonJobList, ResumeSkeleton, DashboardSkeleton } from "./Skeleton";
export { ChartSkeleton, ModalSkeleton, PanelSkeleton, AnalyticsSkeleton, WidgetSkeleton, SettingsSkeleton, FormSkeleton, CompactLoadingSpinner } from "./LoadingFallbacks";
export { CommandPalette } from "./CommandPalette";
export { Progress, ProgressIndeterminate } from "./Progress";
export { default as ErrorBoundary } from "./ErrorBoundary";
export { default as ModalErrorBoundary } from "./ModalErrorBoundary";
export { default as PageErrorBoundary } from "./PageErrorBoundary";
export { default as ComponentErrorBoundary } from "./ComponentErrorBoundary";
export { OnboardingProvider, TourHelpButton } from "./OnboardingTour";
export { useOnboarding } from "../hooks/useOnboarding";
export { VirtualJobList } from "./VirtualJobList";
export { AnalyticsPanel } from "./AnalyticsPanel";
export { InterviewScheduler } from "./InterviewScheduler";
export { ErrorLogPanel } from "./ErrorLogPanel";
export { CoverLetterTemplates } from "./CoverLetterTemplates";
export { fillTemplatePlaceholders } from "../utils/coverLetterUtils";
export type { JobForTemplate } from "../utils/coverLetterUtils";
export { NotificationPreferences } from "./NotificationPreferences";
export { loadNotificationPreferences, shouldNotifyForJob } from "../utils/notificationPreferences";
export type { NotificationPreferences as NotificationPreferencesType, SourceNotificationConfig, AdvancedFilters, JobForNotification } from "../utils/notificationPreferences";
export { CompanyResearchPanel } from "./CompanyResearchPanel";
export { CompanyAutocomplete } from "./CompanyAutocomplete";
export { COMPANY_SUGGESTIONS } from "../utils/companySuggestions";
export { KeyboardShortcutsHelp, ShortcutKey } from "./KeyboardShortcutsHelp";
export { CareerProfileSelector } from "./CareerProfileSelector";
export { GhostIndicator, GhostIndicatorCompact } from "./GhostIndicator";
export { ScraperHealthDashboard } from "./ScraperHealthDashboard";
export { ResumeMatchScoreBreakdown } from "./ResumeMatchScoreBreakdown";
export { AtsLiveScorePanel } from "./AtsLiveScorePanel";
export type { AtsAnalysisResult } from "./AtsLiveScorePanel";
export { SkillCategoryFilter } from "./SkillCategoryFilter";

// Market Intelligence (v2.5)
export { MarketSnapshotCard } from "./MarketSnapshotCard";
export { TrendChart } from "./TrendChart";
export { MarketAlertCard, MarketAlertList } from "./MarketAlertCard";
export { LocationHeatmap } from "./LocationHeatmap";

// Analytics Dashboard (v2.5.5)
export { DashboardWidgets } from "./DashboardWidgets";

// Automation (One-Click Apply)
export { ProfileForm, ScreeningAnswersForm, ApplyButton, AtsBadge, ApplicationPreview } from "./automation";
export { Navigation } from './Navigation';

// Browser Integration (v2.6)
export { BookmarkletGenerator } from './BookmarkletGenerator';
