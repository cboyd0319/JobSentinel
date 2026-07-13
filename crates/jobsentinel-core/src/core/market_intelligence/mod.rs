//! Job Market Intelligence Dashboard
//!
//! Provides real-time analytics on job market trends, skill demand,
//! salary movements, company hiring velocity, and geographic distribution.

use anyhow::Result;
use sqlx::SqlitePool;

pub mod alerts;
pub mod analytics;
pub mod trends;

mod computations;
mod queries;
mod utils;

#[cfg(test)]
mod tests;

pub use alerts::{mark_alert_read, mark_all_read, AlertSeverity, AlertType, MarketAlert};
pub use analytics::{MarketAnalyzer, MarketSnapshot};
pub use queries::{CompanyActivity, LocationHeat, SkillTrend};
pub use trends::{RoleDemandTrend, SalaryTrend, SkillDemandTrend};

/// Market intelligence manager
pub struct MarketIntelligence {
    db: SqlitePool,
    analyzer: MarketAnalyzer,
}

impl MarketIntelligence {
    pub fn new(db: SqlitePool) -> Self {
        let analyzer = MarketAnalyzer::new(db.clone());
        Self { db, analyzer }
    }

    /// Run daily market analysis (should be scheduled)
    pub async fn run_daily_analysis(&self) -> Result<MarketSnapshot> {
        tracing::info!("Running daily market analysis...");

        let snapshot = self.analyzer.create_daily_snapshot().await?;

        // Compute all trends
        self.compute_skill_demand_trends().await?;
        self.compute_salary_trends().await?;
        self.compute_company_hiring_velocity().await?;
        self.compute_location_job_density().await?;
        self.compute_role_demand_trends().await?;

        // Detect market alerts
        self.detect_market_alerts().await?;

        tracing::info!("Daily market analysis complete");
        Ok(snapshot)
    }

    /// Get unread market alerts
    pub async fn get_unread_alerts(&self) -> Result<Vec<MarketAlert>> {
        alerts::get_unread_alerts(&self.db).await
    }

    /// Get market snapshot (latest)
    pub async fn get_market_snapshot(&self) -> Result<Option<MarketSnapshot>> {
        self.analyzer.get_latest_snapshot().await
    }

    /// Get historical snapshots
    pub async fn get_historical_snapshots(&self, days: usize) -> Result<Vec<MarketSnapshot>> {
        self.analyzer.get_historical_snapshots(days).await
    }

    /// Mark alert as read
    pub async fn mark_alert_read(&self, id: i64) -> Result<bool> {
        alerts::mark_alert_read(&self.db, id).await
    }

    /// Mark all alerts as read
    pub async fn mark_all_alerts_read(&self) -> Result<u64> {
        alerts::mark_all_read(&self.db).await
    }
}
