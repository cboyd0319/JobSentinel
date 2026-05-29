//! Salary prediction and negotiation Tauri commands
//!
//! Commands for salary prediction, benchmarking, and offer comparison.

use crate::commands::errors::user_friendly_error;
use crate::commands::AppState;
use crate::core::salary::{OfferComparison, SalaryAnalyzer, SalaryPrediction, SeniorityLevel};
use serde_json::Value;
use std::collections::HashMap;
use tauri::State;

/// Predict salary for a job
#[tauri::command]
pub async fn predict_salary(
    job_hash: String,
    years_experience: Option<i32>,
    state: State<'_, AppState>,
) -> Result<SalaryPrediction, String> {
    tracing::info!(
        job_hash_len = job_hash.len(),
        years_provided = years_experience.is_some(),
        "Command: predict_salary"
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .predict_salary_for_job(&job_hash, years_experience)
        .await
        .map_err(|e| user_friendly_error("Failed to predict salary", e))
}

/// Get salary benchmark for a role
#[tauri::command]
pub async fn get_salary_benchmark(
    job_title: String,
    location: String,
    seniority: String,
    state: State<'_, AppState>,
) -> Result<Option<Value>, String> {
    tracing::info!(
        job_title_len = job_title.len(),
        location_len = location.len(),
        seniority_requested = !seniority.trim().is_empty(),
        "Command: get_salary_benchmark"
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    let seniority_level = SeniorityLevel::parse(&seniority);

    match analyzer
        .get_benchmark(&job_title, &location, seniority_level)
        .await
    {
        Ok(Some(benchmark)) => serde_json::to_value(&benchmark)
            .map(Some)
            .map_err(|e| user_friendly_error("Failed to serialize benchmark", e)),
        Ok(None) => Ok(None),
        Err(e) => Err(user_friendly_error("Failed to get benchmark", e)),
    }
}

/// Generate negotiation script
#[tauri::command]
pub async fn generate_negotiation_script(
    scenario: String,
    params: HashMap<String, String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    tracing::info!(
        scenario_chars = scenario.chars().count(),
        "Command: generate_negotiation_script"
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .generate_negotiation_script(&scenario, params)
        .await
        .map_err(|e| user_friendly_error("Failed to generate script", e))
}

/// Compare multiple job offers
#[tauri::command]
pub async fn compare_offers(
    offer_ids: Vec<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<OfferComparison>, String> {
    tracing::info!("Command: compare_offers (count: {})", offer_ids.len());

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .compare_offers(offer_ids)
        .await
        .map_err(|e| user_friendly_error("Failed to compare offers", e))
}
