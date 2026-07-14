//! Market intelligence Tauri commands
//!
//! Commands for skill trends, company activity, location analysis, and market alerts.

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_command_limit_usize;
use crate::commands::AppState;
use crate::core::market_intelligence::{
    CompanyActivity, LocationHeat, MarketAlert, MarketIntelligence, MarketSnapshot, SkillTrend,
};
use serde_json::Value;
use tauri::State;

const MAX_HISTORICAL_SNAPSHOT_DAYS: i64 = 3_650;

fn validate_historical_snapshot_days(days: i64) -> Result<usize, String> {
    if !(1..=MAX_HISTORICAL_SNAPSHOT_DAYS).contains(&days) {
        return Err(format!(
            "days must be between 1 and {}",
            MAX_HISTORICAL_SNAPSHOT_DAYS
        ));
    }

    usize::try_from(days).map_err(|_| "days is outside supported range".to_string())
}

/// Get trending skills
#[tauri::command]
pub(crate) async fn get_trending_skills(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<SkillTrend>, String> {
    tracing::info!("Command: get_trending_skills (limit: {})", limit);

    let limit = validate_command_limit_usize(limit)?;
    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_trending_skills(limit)
        .await
        .map_err(|e| user_friendly_error("Failed to get trending skills", e))
}

/// Get most active hiring companies
#[tauri::command]
pub(crate) async fn get_active_companies(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<CompanyActivity>, String> {
    tracing::info!("Command: get_active_companies (limit: {})", limit);

    let limit = validate_command_limit_usize(limit)?;
    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_most_active_companies(limit)
        .await
        .map_err(|e| user_friendly_error("Failed to get active companies", e))
}

/// Get hottest job market locations
#[tauri::command]
pub(crate) async fn get_hottest_locations(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<LocationHeat>, String> {
    tracing::info!("Command: get_hottest_locations (limit: {})", limit);

    let limit = validate_command_limit_usize(limit)?;
    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_hottest_locations(limit)
        .await
        .map_err(|e| user_friendly_error("Failed to get hottest locations", e))
}

/// Get unread market alerts
#[tauri::command]
pub(crate) async fn get_market_alerts(
    state: State<'_, AppState>,
) -> Result<Vec<MarketAlert>, String> {
    tracing::info!("Command: get_market_alerts");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_unread_alerts()
        .await
        .map_err(|e| user_friendly_error("Failed to get market alerts", e))
}

/// Run market analysis (manual trigger)
#[tauri::command]
pub(crate) async fn run_market_analysis(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: run_market_analysis");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    match intel.run_daily_analysis().await {
        Ok(snapshot) => serde_json::to_value(&snapshot)
            .map_err(|e| user_friendly_error("Failed to serialize snapshot", e)),
        Err(e) => Err(user_friendly_error("Failed to run market analysis", e)),
    }
}

/// Get current market snapshot
#[tauri::command]
pub(crate) async fn get_market_snapshot(
    state: State<'_, AppState>,
) -> Result<Option<MarketSnapshot>, String> {
    tracing::info!("Command: get_market_snapshot");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_market_snapshot()
        .await
        .map_err(|e| user_friendly_error("Failed to get market snapshot", e))
}

/// Get historical market snapshots
#[tauri::command]
pub(crate) async fn get_historical_snapshots(
    days: i64,
    state: State<'_, AppState>,
) -> Result<Vec<MarketSnapshot>, String> {
    tracing::info!("Command: get_historical_snapshots (days: {})", days);

    let days = validate_historical_snapshot_days(days)?;
    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_historical_snapshots(days)
        .await
        .map_err(|e| user_friendly_error("Failed to get historical snapshots", e))
}

/// Mark a single alert as read
#[tauri::command]
pub(crate) async fn mark_alert_read(id: i64, state: State<'_, AppState>) -> Result<bool, String> {
    tracing::info!("Command: mark_alert_read (id: {})", id);

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .mark_alert_read(id)
        .await
        .map_err(|e| user_friendly_error("Failed to mark alert as read", e))
}

/// Mark all alerts as read
#[tauri::command]
pub(crate) async fn mark_all_alerts_read(state: State<'_, AppState>) -> Result<u64, String> {
    tracing::info!("Command: mark_all_alerts_read");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .mark_all_alerts_read()
        .await
        .map_err(|e| user_friendly_error("Failed to mark all alerts as read", e))
}

#[cfg(test)]
mod tests {
    use super::{validate_historical_snapshot_days, MAX_HISTORICAL_SNAPSHOT_DAYS};

    #[test]
    fn validates_positive_historical_snapshot_days() {
        assert_eq!(validate_historical_snapshot_days(30).unwrap(), 30);
    }

    #[test]
    fn rejects_non_positive_historical_snapshot_days() {
        assert!(validate_historical_snapshot_days(0).is_err());
        assert!(validate_historical_snapshot_days(-1).is_err());
    }

    #[test]
    fn rejects_unbounded_historical_snapshot_days() {
        assert!(validate_historical_snapshot_days(MAX_HISTORICAL_SNAPSHOT_DAYS + 1).is_err());
    }
}
