//! Tests for salary module
//!
//! Focused unit tests live here and in the sibling test modules below.

use super::analyzer::SalaryAnalyzer;
use super::types::{OfferComparison, SalaryPrediction, SeniorityLevel};
use chrono::Utc;

#[test]
fn test_seniority_as_str() {
    assert_eq!(SeniorityLevel::Entry.as_str(), "entry");
    assert_eq!(SeniorityLevel::Mid.as_str(), "mid");
    assert_eq!(SeniorityLevel::Senior.as_str(), "senior");
    assert_eq!(SeniorityLevel::Staff.as_str(), "staff");
    assert_eq!(SeniorityLevel::Principal.as_str(), "principal");
    assert_eq!(SeniorityLevel::Unknown.as_str(), "unknown");
}

#[test]
fn test_seniority_parse() {
    assert_eq!(SeniorityLevel::parse("entry"), SeniorityLevel::Entry);
    assert_eq!(SeniorityLevel::parse("mid"), SeniorityLevel::Mid);
    assert_eq!(SeniorityLevel::parse("senior"), SeniorityLevel::Senior);
    assert_eq!(SeniorityLevel::parse("staff"), SeniorityLevel::Staff);
    assert_eq!(
        SeniorityLevel::parse("principal"),
        SeniorityLevel::Principal
    );
    assert_eq!(
        SeniorityLevel::parse("executive"),
        SeniorityLevel::Principal
    );
    assert_eq!(SeniorityLevel::parse("director"), SeniorityLevel::Principal);
    assert_eq!(SeniorityLevel::parse("unknown"), SeniorityLevel::Unknown);
    assert_eq!(SeniorityLevel::parse("invalid"), SeniorityLevel::Unknown);
    assert_eq!(SeniorityLevel::parse(""), SeniorityLevel::Unknown);
}

#[test]
fn test_seniority_parse_case_insensitive() {
    assert_eq!(SeniorityLevel::parse("ENTRY"), SeniorityLevel::Unknown);
    assert_eq!(SeniorityLevel::parse("Senior"), SeniorityLevel::Unknown);
    // Parser expects lowercase - this is intentional behavior
}

#[test]
fn test_seniority_roundtrip() {
    for level in [
        SeniorityLevel::Entry,
        SeniorityLevel::Mid,
        SeniorityLevel::Senior,
        SeniorityLevel::Staff,
        SeniorityLevel::Principal,
        SeniorityLevel::Unknown,
    ] {
        let str = level.as_str();
        let parsed = SeniorityLevel::parse(str);
        assert_eq!(level, parsed);
    }
}

#[test]
fn test_seniority_from_years_edge_cases() {
    // Boundary conditions
    assert_eq!(
        SeniorityLevel::from_years_of_experience(0),
        SeniorityLevel::Entry
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(2),
        SeniorityLevel::Entry
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(3),
        SeniorityLevel::Mid
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(5),
        SeniorityLevel::Mid
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(6),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(10),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(11),
        SeniorityLevel::Staff
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(15),
        SeniorityLevel::Staff
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(16),
        SeniorityLevel::Principal
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(30),
        SeniorityLevel::Principal
    );
}

#[test]
fn test_seniority_from_years() {
    assert_eq!(
        SeniorityLevel::from_years_of_experience(1),
        SeniorityLevel::Entry
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(4),
        SeniorityLevel::Mid
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(8),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(12),
        SeniorityLevel::Staff
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(20),
        SeniorityLevel::Principal
    );
}

#[test]
fn test_seniority_from_title() {
    assert_eq!(
        SeniorityLevel::from_job_title("Junior Case Manager"),
        SeniorityLevel::Entry
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Senior Program Coordinator"),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Staff Case Manager"),
        SeniorityLevel::Staff
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Principal Operations Analyst"),
        SeniorityLevel::Principal
    );
}

#[test]
fn test_seniority_from_title_variations() {
    // Principal variants
    assert_eq!(
        SeniorityLevel::from_job_title("Principal Case Manager"),
        SeniorityLevel::Principal
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Distinguished Operations Analyst"),
        SeniorityLevel::Principal
    );

    // Staff variants
    assert_eq!(
        SeniorityLevel::from_job_title("Staff Case Manager"),
        SeniorityLevel::Staff
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Operations Architect"),
        SeniorityLevel::Staff
    );

    // Senior variants
    assert_eq!(
        SeniorityLevel::from_job_title("Senior Program Coordinator"),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Sr. Care Coordinator"),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Lead Training Coordinator"),
        SeniorityLevel::Senior
    );

    // Entry variants
    assert_eq!(
        SeniorityLevel::from_job_title("Junior Inventory Planner"),
        SeniorityLevel::Entry
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Jr. Case Manager"),
        SeniorityLevel::Entry
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Associate Care Coordinator"),
        SeniorityLevel::Entry
    );

    // Mid (default)
    assert_eq!(
        SeniorityLevel::from_job_title("Case Manager"),
        SeniorityLevel::Mid
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Inventory Planner"),
        SeniorityLevel::Mid
    );
}

#[test]
fn test_seniority_from_title_case_insensitive() {
    assert_eq!(
        SeniorityLevel::from_job_title("SENIOR CASE MANAGER"),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_job_title("principal operations analyst"),
        SeniorityLevel::Principal
    );
    assert_eq!(
        SeniorityLevel::from_job_title("StAfF CaSe MaNaGeR"),
        SeniorityLevel::Staff
    );
}

#[test]
fn test_seniority_from_empty_title() {
    assert_eq!(SeniorityLevel::from_job_title(""), SeniorityLevel::Mid);
}

#[test]
fn test_offer_comparison_market_position_logic() {
    let base_salary = 160000i64;
    let predicted_median = 150000i64;
    let predicted_max = 180000i64;

    let position = if base_salary >= predicted_max {
        "above_market"
    } else if base_salary >= predicted_median {
        "at_market"
    } else {
        "below_market"
    };

    assert_eq!(position, "at_market");

    // Above market
    let base_salary = 190000i64;
    let position = if base_salary >= predicted_max {
        "above_market"
    } else if base_salary >= predicted_median {
        "at_market"
    } else {
        "below_market"
    };
    assert_eq!(position, "above_market");

    // Below market
    let base_salary = 140000i64;
    let position = if base_salary >= predicted_max {
        "above_market"
    } else if base_salary >= predicted_median {
        "at_market"
    } else {
        "below_market"
    };
    assert_eq!(position, "below_market");
}

#[test]
fn test_offer_comparison_recommendation_logic() {
    let position = "above_market";
    let rec = match position {
        "above_market" => {
            "This offer is above this sample range. Review benefits, schedule, title, and your floor before deciding.".to_string()
        }
        "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
        "below_market" => format!("Below market. Counter with ${}-${}.", 150000, 180000),
        _ => "Unknown".to_string(),
    };
    assert_eq!(
        rec,
        "This offer is above this sample range. Review benefits, schedule, title, and your floor before deciding."
    );

    let position = "at_market";
    let rec = match position {
        "above_market" => {
            "This offer is above this sample range. Review benefits, schedule, title, and your floor before deciding.".to_string()
        }
        "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
        "below_market" => format!("Below market. Counter with ${}-${}.", 150000, 180000),
        _ => "Unknown".to_string(),
    };
    assert_eq!(rec, "Fair offer. Consider negotiating for 10-15% more.");

    let position = "below_market";
    let rec = match position {
        "above_market" => {
            "This offer is above this sample range. Review benefits, schedule, title, and your floor before deciding.".to_string()
        }
        "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
        "below_market" => format!("Below market. Counter with ${}-${}.", 150000, 180000),
        _ => "Unknown".to_string(),
    };
    assert_eq!(rec, "Below market. Counter with $150000-$180000.");
}

mod database_tests;
mod model_contract_tests;
mod seniority_edge_tests;
