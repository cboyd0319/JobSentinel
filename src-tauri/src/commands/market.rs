//! Market intelligence Tauri commands
//!
//! Commands for skill trends, company activity, location analysis, and market alerts.

use crate::commands::AppState;
use crate::core::market_intelligence::{
    CompanyActivity, LocationHeat, MarketAlert, MarketIntelligence, SkillTrend,
};
use serde_json::Value;
use tauri::State;

/// Get trending skills
#[tauri::command]
pub async fn get_trending_skills(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<SkillTrend>, String> {
    tracing::info!("Command: get_trending_skills (limit: {})", limit);

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_trending_skills(limit)
        .await
        .map_err(|e| format!("Failed to get trending skills: {}", e))
}

/// Get most active hiring companies
#[tauri::command]
pub async fn get_active_companies(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<CompanyActivity>, String> {
    tracing::info!("Command: get_active_companies (limit: {})", limit);

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_most_active_companies(limit)
        .await
        .map_err(|e| format!("Failed to get active companies: {}", e))
}

/// Get hottest job market locations
#[tauri::command]
pub async fn get_hottest_locations(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<LocationHeat>, String> {
    tracing::info!("Command: get_hottest_locations (limit: {})", limit);

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_hottest_locations(limit)
        .await
        .map_err(|e| format!("Failed to get hottest locations: {}", e))
}

/// Get unread market alerts
#[tauri::command]
pub async fn get_market_alerts(state: State<'_, AppState>) -> Result<Vec<MarketAlert>, String> {
    tracing::info!("Command: get_market_alerts");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_unread_alerts()
        .await
        .map_err(|e| format!("Failed to get market alerts: {}", e))
}

/// Run market analysis (manual trigger)
#[tauri::command]
pub async fn run_market_analysis(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: run_market_analysis");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    match intel.run_daily_analysis().await {
        Ok(snapshot) => serde_json::to_value(&snapshot)
            .map_err(|e| format!("Failed to serialize snapshot: {}", e)),
        Err(e) => Err(format!("Failed to run market analysis: {}", e)),
    }
}
