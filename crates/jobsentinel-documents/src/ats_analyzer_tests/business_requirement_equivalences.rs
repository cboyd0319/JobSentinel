use crate::{AtsAnalyzer, RequirementMatchState};

#[test]
fn test_requirement_review_recognizes_legal_finance_and_government_terms() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nCompleted document review.\nHandled records management.\nManaged financial reconciliation.",
            &[],
            "Required: document review, records management, financial reconciliation",
        );

    for keyword in [
        "document review",
        "records management",
        "financial reconciliation",
    ] {
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == keyword)
            .expect("recognized legal finance government review");
        assert!(matches!(
            review.match_state,
            RequirementMatchState::Direct | RequirementMatchState::Strong
        ));
        assert!(review.evidence_sections.contains(&"experience".to_string()));
    }
}

#[test]
fn test_requirement_review_recognizes_shared_supplemental_keyword_taxonomy() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nCoordinated expense reports and used MS Office to prepare team documents.\nTracked KPIs for risk management reviews.",
        &[],
        "Required: Microsoft Office, expense reports, risk management, KPIs",
    );

    for keyword in [
        "microsoft office",
        "expense reports",
        "risk management",
        "kpis",
    ] {
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == keyword)
            .expect("shared supplemental taxonomy review");
        assert!(matches!(
            review.match_state,
            RequirementMatchState::Direct | RequirementMatchState::Strong
        ));
        assert!(review.evidence_sections.contains(&"experience".to_string()));
    }
}

#[test]
fn test_requirement_review_uses_document_review_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported document-review checks for client files.",
            &[],
            "Required: document review",
        );

    let document_review = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "document review")
        .expect("document review");
    assert_eq!(document_review.match_state, RequirementMatchState::Direct);
    assert!(document_review
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported document review checks for client files.",
            &[],
            "Required: document-review",
        );

    let document_review_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "document-review")
        .expect("document-review");
    assert_eq!(
        document_review_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(document_review_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_records_management_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported records-management checks for client files.",
            &[],
            "Required: records management",
        );

    let records_management = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "records management")
        .expect("records management");
    assert_eq!(
        records_management.match_state,
        RequirementMatchState::Direct
    );
    assert!(records_management
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported records management checks for client files.",
            &[],
            "Required: records-management",
        );

    let records_management_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "records-management")
        .expect("records-management");
    assert_eq!(
        records_management_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(records_management_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_case_files_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported case-files checks for client intake.",
            &[],
            "Required: case files",
        );

    let case_files = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "case files")
        .expect("case files");
    assert_eq!(case_files.match_state, RequirementMatchState::Direct);
    assert!(case_files
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported case files checks for client intake.",
            &[],
            "Required: case-files",
        );

    let case_files_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "case-files")
        .expect("case-files");
    assert_eq!(case_files_hyphen.match_state, RequirementMatchState::Direct);
    assert!(case_files_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_legal_research_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported legal-research checks for client files.",
            &[],
            "Required: legal research",
        );

    let legal_research = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "legal research")
        .expect("legal research");
    assert_eq!(legal_research.match_state, RequirementMatchState::Direct);
    assert!(legal_research
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported legal research checks for client files.",
            &[],
            "Required: legal-research",
        );

    let legal_research_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "legal-research")
        .expect("legal-research");
    assert_eq!(
        legal_research_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(legal_research_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_policy_analysis_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported policy-analysis checks for client programs.",
            &[],
            "Required: policy analysis",
        );

    let policy_analysis = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "policy analysis")
        .expect("policy analysis");
    assert_eq!(policy_analysis.match_state, RequirementMatchState::Direct);
    assert!(policy_analysis
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported policy analysis checks for client programs.",
            &[],
            "Required: policy-analysis",
        );

    let policy_analysis_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "policy-analysis")
        .expect("policy-analysis");
    assert_eq!(
        policy_analysis_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(policy_analysis_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_grant_administration_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported grant-administration checks for client programs.",
            &[],
            "Required: grant administration",
        );

    let grant_administration = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "grant administration")
        .expect("grant administration");
    assert_eq!(
        grant_administration.match_state,
        RequirementMatchState::Direct
    );
    assert!(grant_administration
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported grant administration checks for client programs.",
            &[],
            "Required: grant-administration",
        );

    let grant_administration_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "grant-administration")
        .expect("grant-administration");
    assert_eq!(
        grant_administration_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(grant_administration_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_financial_reconciliation_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported financial-reconciliation checks for client accounts.",
            &[],
            "Required: financial reconciliation",
        );

    let financial_reconciliation = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "financial reconciliation")
        .expect("financial reconciliation");
    assert_eq!(
        financial_reconciliation.match_state,
        RequirementMatchState::Direct
    );
    assert!(financial_reconciliation
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported financial reconciliation checks for client accounts.",
            &[],
            "Required: financial-reconciliation",
        );

    let financial_reconciliation_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "financial-reconciliation")
        .expect("financial-reconciliation");
    assert_eq!(
        financial_reconciliation_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(financial_reconciliation_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_billing_invoicing_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nSupported invoicing for client accounts.",
        &[],
        "Required: billing",
    );

    let billing = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "billing")
        .expect("billing");
    assert_eq!(billing.match_state, RequirementMatchState::Direct);
    assert!(billing
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nSupported billing for client accounts.",
        &[],
        "Required: invoicing",
    );

    let invoicing = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "invoicing")
        .expect("invoicing");
    assert_eq!(invoicing.match_state, RequirementMatchState::Direct);
    assert!(invoicing
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_accounts_payable_receivable_shorthand_equivalence() {
    let payable = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nProcessed A/P batches and reconciled vendor statements.",
            &[],
            "Required: accounts payable",
        );

    let accounts_payable = payable
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "accounts payable")
        .expect("accounts payable");
    assert_eq!(accounts_payable.match_state, RequirementMatchState::Direct);
    assert!(accounts_payable
        .evidence_sections
        .contains(&"experience".to_string()));

    let receivable = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled accounts receivable aging for client payments.",
            &[],
            "Required: A/R",
        );

    let accounts_receivable = receivable
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "accounts receivable")
        .expect("accounts receivable");
    assert_eq!(
        accounts_receivable.match_state,
        RequirementMatchState::Direct
    );
    assert!(accounts_receivable
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_bookkeeping_bookkeeper_equivalence() {
    let bookkeeping = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nWorked as bookkeeper for monthly close and vendor files.",
            &[],
            "Required: bookkeeping",
        );

    let bookkeeping_review = bookkeeping
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bookkeeping")
        .expect("bookkeeping");
    assert_eq!(
        bookkeeping_review.match_state,
        RequirementMatchState::Direct
    );
    assert!(bookkeeping_review
        .evidence_sections
        .contains(&"experience".to_string()));

    let bookkeeper = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled bookkeeping for monthly close and vendor files.",
            &[],
            "Required: bookkeeper",
        );

    let bookkeeper_review = bookkeeper
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bookkeeping")
        .expect("bookkeeping");
    assert_eq!(bookkeeper_review.match_state, RequirementMatchState::Direct);
    assert!(bookkeeper_review
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_quickbooks_qbo_equivalence() {
    let quickbooks = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nUsed QBO for invoice entry and vendor files.",
            &[],
            "Required: QuickBooks",
        );

    let quickbooks_review = quickbooks
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "quickbooks")
        .expect("quickbooks");
    assert_eq!(quickbooks_review.match_state, RequirementMatchState::Direct);
    assert!(quickbooks_review
        .evidence_sections
        .contains(&"experience".to_string()));

    let qbo = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nUsed QuickBooks for invoice entry and vendor files.",
            &[],
            "Required: QBO",
        );

    let qbo_review = qbo
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "quickbooks")
        .expect("quickbooks");
    assert_eq!(qbo_review.match_state, RequirementMatchState::Direct);
    assert!(qbo_review
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[path = "business_requirement_equivalences/retail_and_operations_equivalences.rs"]
mod retail_and_operations_equivalences;
