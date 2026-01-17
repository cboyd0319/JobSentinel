//! Salary prediction and negotiation Tauri commands
//!
//! Commands for salary prediction, benchmarking, and offer comparison.

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
        "Command: predict_salary (job: {}, years: {:?})",
        job_hash,
        years_experience
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .predict_salary_for_job(&job_hash, years_experience)
        .await
        .map_err(|e| format!("Failed to predict salary: {}", e))
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
        "Command: get_salary_benchmark (title: {}, location: {})",
        job_title,
        location
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    let seniority_level = SeniorityLevel::parse(&seniority);

    match analyzer
        .get_benchmark(&job_title, &location, seniority_level)
        .await
    {
        Ok(Some(benchmark)) => serde_json::to_value(&benchmark)
            .map(Some)
            .map_err(|e| format!("Failed to serialize benchmark: {}", e)),
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get benchmark: {}", e)),
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
        "Command: generate_negotiation_script (scenario: {})",
        scenario
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .generate_negotiation_script(&scenario, params)
        .await
        .map_err(|e| format!("Failed to generate script: {}", e))
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
        .map_err(|e| format!("Failed to compare offers: {}", e))
}
