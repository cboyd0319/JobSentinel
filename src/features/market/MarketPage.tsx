import { useState } from "react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { LoadingSpinner } from "../../ui/LoadingSpinner";
import { LocationHeatmap } from "./LocationHeatmap";
import { MarketAlertList } from "./MarketAlertCard";
import { MarketHeader } from "./MarketHeader";
import {
  MarketCompaniesPanel,
  MarketOverviewPanel,
  MarketSkillsPanel,
} from "./MarketPanels";
import type { MarketTabId } from "./model";
import { useMarketData } from "./useMarketData";

interface MarketPageProps {
  onBack: () => void;
}

const NO_TREND_INPUTS_MESSAGE = "Turn on job sources or import job postings to build trends.";

export default function MarketPage({ onBack }: MarketPageProps) {
  const [activeTab, setActiveTab] = useState<MarketTabId>("overview");
  const market = useMarketData();

  if (market.loading) return <LoadingSpinner message="Loading hiring trends..." />;

  if (market.error) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-6">
        <Card className="dark:bg-surface-800 max-w-md w-full text-center">
          <div className="p-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-2">
              Could not load hiring trends
            </h2>
            <p className="text-surface-600 dark:text-surface-400 mb-6">{market.error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={onBack}>Go Back</Button>
              <Button onClick={() => market.fetchData()}>Try Again</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const skillEmptyMessage = market.hasTrendInputs ? "No skill trends yet for saved jobs." : NO_TREND_INPUTS_MESSAGE;
  const companyEmptyMessage = market.hasTrendInputs ? "No company activity yet for saved jobs." : NO_TREND_INPUTS_MESSAGE;
  const locationEmptyMessage = market.hasTrendInputs ? "No location trends yet for saved jobs." : NO_TREND_INPUTS_MESSAGE;
  const snapshotEmptyMessage = market.hasTrendInputs
    ? "Trend snapshot is not ready yet. Other trend signals are available below."
    : NO_TREND_INPUTS_MESSAGE;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <MarketHeader
        activeTab={activeTab}
        analyzing={market.analyzing}
        lastFetched={market.lastFetched}
        onBack={onBack}
        onRefresh={market.runAnalysis}
        onTabChange={setActiveTab}
        unreadAlertCount={market.unreadAlertCount}
      />
      <main
        className="max-w-7xl mx-auto p-6"
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={`${activeTab}-tab`}
        tabIndex={0}
      >
        {activeTab === "overview" && (
          <MarketOverviewPanel
            alerts={market.alerts}
            companies={market.companies}
            companyEmptyMessage={companyEmptyMessage}
            locationEmptyMessage={locationEmptyMessage}
            locations={market.locations}
            onMarkAlertRead={market.markAlertRead}
            onShowAlerts={() => setActiveTab("alerts")}
            skillEmptyMessage={skillEmptyMessage}
            skills={market.skills}
            snapshot={market.snapshot}
            snapshotEmptyMessage={snapshotEmptyMessage}
            unreadAlertCount={market.unreadAlertCount}
          />
        )}
        {activeTab === "skills" && <MarketSkillsPanel skills={market.skills} emptyMessage={skillEmptyMessage} />}
        {activeTab === "companies" && (
          <MarketCompaniesPanel companies={market.companies} emptyMessage={companyEmptyMessage} />
        )}
        {activeTab === "locations" && (
          <LocationHeatmap locations={market.locations} emptyMessage={locationEmptyMessage} />
        )}
        {activeTab === "alerts" && (
          <Card className="dark:bg-surface-800">
            <h3 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Hiring Trend Alerts
            </h3>
            <MarketAlertList
              alerts={market.alerts}
              onMarkRead={market.markAlertRead}
              onMarkAllRead={market.markAllAlertsRead}
            />
          </Card>
        )}
      </main>
    </div>
  );
}
