use crate::{AtsAnalyzer, RequirementMatchState};

#[test]
fn test_requirement_review_uses_point_of_sale_pos_system_equivalence() {
    let point_of_sale = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nUsed POS systems for returns and daily drawer close.",
            &[],
            "Required: point of sale",
        );

    let point_of_sale_review = point_of_sale
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "point of sale")
        .expect("point of sale");
    assert_eq!(
        point_of_sale_review.match_state,
        RequirementMatchState::Direct
    );
    assert!(point_of_sale_review
        .evidence_sections
        .contains(&"experience".to_string()));

    let pos_system = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nUsed point of sale tools for returns and daily drawer close.",
            &[],
            "Required: POS system",
        );

    let pos_system_review = pos_system
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "point of sale")
        .expect("point of sale");
    assert_eq!(pos_system_review.match_state, RequirementMatchState::Direct);
    assert!(pos_system_review
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_cashier_cash_handling_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled cash handling for front counter orders.",
            &[],
            "Required: cashier",
        );

    let cashier = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "cashier")
        .expect("cashier");
    assert_eq!(cashier.match_state, RequirementMatchState::Direct);
    assert!(cashier
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nWorked as cashier for front counter orders.",
        &[],
        "Required: cash handling",
    );

    let cash_handling = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "cash handling")
        .expect("cash handling");
    assert_eq!(cash_handling.match_state, RequirementMatchState::Direct);
    assert!(cash_handling
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_procurement_purchasing_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nSupported purchasing for clinic supplies.",
        &[],
        "Required: procurement",
    );

    let procurement = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "procurement")
        .expect("procurement");
    assert_eq!(procurement.match_state, RequirementMatchState::Direct);
    assert!(procurement
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nSupported procurement for clinic supplies.",
        &[],
        "Required: purchasing",
    );

    let purchasing = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "purchasing")
        .expect("purchasing");
    assert_eq!(purchasing.match_state, RequirementMatchState::Direct);
    assert!(purchasing
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_logistics_shipping_receiving_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled shipping and receiving for clinic supply orders.",
            &[],
            "Required: logistics",
        );

    let logistics = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "logistics")
        .expect("logistics review");
    assert_eq!(logistics.match_state, RequirementMatchState::Direct);
    assert!(logistics
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_inventory_stockroom_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nTracked stockroom counts and stock management for supply orders.",
            &[],
            "Required: inventory",
        );

    let inventory = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "inventory")
        .expect("inventory review");
    assert_eq!(inventory.match_state, RequirementMatchState::Strong);
    assert!(inventory
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_vendor_supplier_management_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported supplier management for clinic supplies.",
            &[],
            "Required: vendor management",
        );

    let vendor_management = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "vendor management")
        .expect("vendor management");
    assert_eq!(vendor_management.match_state, RequirementMatchState::Direct);
    assert!(vendor_management
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported vendor management for clinic supplies.",
            &[],
            "Required: supplier management",
        );

    let supplier_management = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "supplier management")
        .expect("supplier management");
    assert_eq!(
        supplier_management.match_state,
        RequirementMatchState::Direct
    );
    assert!(supplier_management
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_budgeting_budget_tracking_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported budget tracking for clinic supplies.",
            &[],
            "Required: budgeting",
        );

    let budgeting = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "budgeting")
        .expect("budgeting");
    assert_eq!(budgeting.match_state, RequirementMatchState::Direct);
    assert!(budgeting
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nSupported budgeting for clinic supplies.",
        &[],
        "Required: budget tracking",
    );

    let budget_tracking = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "budget tracking")
        .expect("budget tracking");
    assert_eq!(budget_tracking.match_state, RequirementMatchState::Direct);
    assert!(budget_tracking
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_loan_processing_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported loan-processing checks for client accounts.",
            &[],
            "Required: loan processing",
        );

    let loan_processing = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "loan processing")
        .expect("loan processing");
    assert_eq!(loan_processing.match_state, RequirementMatchState::Direct);
    assert!(loan_processing
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported loan processing checks for client accounts.",
            &[],
            "Required: loan-processing",
        );

    let loan_processing_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "loan-processing")
        .expect("loan-processing");
    assert_eq!(
        loan_processing_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(loan_processing_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}
