use crate::AtsAnalyzer;

#[test]
fn test_get_power_words() {
    let words = AtsAnalyzer::get_power_words();

    assert!(words.contains(&"led"));
    assert!(words.contains(&"developed"));
    assert!(words.contains(&"improved"));
    assert!(words.len() > 30);
}

#[test]
fn test_improve_bullet_with_power_word() {
    let bullet = "Led client intake scheduling project";
    let improved = AtsAnalyzer::improve_bullet(bullet, None);

    // Already starts with power word
    assert!(improved.starts_with("Led"));
}

#[test]
fn test_improve_bullet_without_power_word() {
    let bullet = "Was responsible for updating intake schedules";
    let improved = AtsAnalyzer::improve_bullet(bullet, None);

    assert!(improved.starts_with(bullet));
    assert!(improved.contains("choose a clearer action verb only if it is true"));
    assert!(!improved.contains("Managed"));
    assert!(!improved.contains("Developed"));
}

#[test]
fn test_improve_bullet_does_not_invent_development_claim() {
    let bullet = "Worked on customer returns";
    let improved = AtsAnalyzer::improve_bullet(bullet, None);

    assert!(improved.starts_with(bullet));
    assert!(improved.contains("choose a clearer action verb only if it is true"));
    assert!(!improved.contains("Developed customer returns"));
}

#[test]
fn test_improve_bullet_missing_metrics() {
    let bullet = "Led intake scheduling";
    let improved = AtsAnalyzer::improve_bullet(bullet, None);

    // Should suggest adding a true concrete detail.
    assert!(improved.contains("true number"));
}

#[test]
fn test_improve_bullet_with_job_context() {
    let bullet = "Led intake coordination";
    let job_desc = "Required: case management, scheduling, CRM";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    // Should suggest reviewing truthful required language, not stuffing words.
    assert!(improved.contains("case management"));
    assert!(improved.contains("worth making visible"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
    assert!(!improved.contains("consider adding"));
}

#[test]
fn test_improve_bullet_adds_healthcare_evidence_prompt() {
    let bullet = "Supported patient care documentation";
    let job_desc = "Required: patient care, medication administration, RN license";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("healthcare evidence to check"));
    assert!(improved.contains("scope of practice"));
    assert!(improved.contains("patient safety"));
    assert!(improved.contains("required credentials"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_trades_field_evidence_prompt() {
    let bullet = "Completed maintenance work orders";
    let job_desc =
        "Required: maintenance technician, equipment repair, OSHA 10, forklift operation";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("trades-field evidence to check"));
    assert!(improved.contains("equipment or tools used"));
    assert!(improved.contains("safety rules"));
    assert!(improved.contains("work orders"));
    assert!(improved.contains("required licenses"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_career_change_evidence_prompt() {
    let bullet = "Supported customer onboarding during a career change";
    let job_desc =
            "Career change welcome. Required: transferable customer support skills and training program";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("career-change evidence to check"));
    assert!(improved.contains("transferable work"));
    assert!(improved.contains("training"));
    assert!(improved.contains("adjacent experience"));
    assert!(improved.contains("truthful gaps or transitions"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_early_career_evidence_prompt() {
    let bullet = "Completed capstone project and trainee rotations";
    let job_desc = "Entry-level trainee role for new graduate applicants";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("early-career evidence to check"));
    assert!(improved.contains("training or coursework"));
    assert!(improved.contains("projects or volunteer work"));
    assert!(improved.contains("supervised responsibilities"));
    assert!(improved.contains("readiness to learn"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_regulated_work_evidence_prompt() {
    let bullet = "Supported case files and reconciliation";
    let job_desc = "Required: legal research, case files, financial reconciliation";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("regulated-work evidence to check"));
    assert!(improved.contains("records accuracy"));
    assert!(improved.contains("deadlines"));
    assert!(improved.contains("confidentiality"));
    assert!(improved.contains("audit trail"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_service_operations_evidence_prompt() {
    let bullet = "Handled client intake scheduling";
    let job_desc = "Required: customer service, case management, appointment setting";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("service-operations evidence to check"));
    assert!(improved.contains("customer impact"));
    assert!(improved.contains("volume"));
    assert!(improved.contains("escalation path"));
    assert!(improved.contains("response quality"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_technical_data_evidence_prompt() {
    let bullet = "Built reporting dashboard";
    let job_desc = "Required: data analysis, SQL, machine learning model monitoring";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("technical-data evidence to check"));
    assert!(improved.contains("shipped work"));
    assert!(improved.contains("users or decisions supported"));
    assert!(improved.contains("data sources"));
    assert!(improved.contains("measurable outcomes"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_sales_marketing_evidence_prompt() {
    let bullet = "Supported campaign and account follow-up";
    let job_desc = "Required: sales pipeline, account retention, marketing campaign";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("sales-marketing evidence to check"));
    assert!(improved.contains("quota or pipeline"));
    assert!(improved.contains("audience or account scope"));
    assert!(improved.contains("conversion or revenue impact"));
    assert!(improved.contains("retention"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_design_creative_evidence_prompt() {
    let bullet = "Created prototypes for onboarding flow";
    let job_desc = "Required: product design, Figma, accessibility, design portfolio";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("design-creative evidence to check"));
    assert!(improved.contains("user problem"));
    assert!(improved.contains("audience"));
    assert!(improved.contains("accessibility"));
    assert!(improved.contains("shipped outcome"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_education_academic_evidence_prompt() {
    let bullet = "Developed curriculum for student workshops";
    let job_desc = "Required: teaching, curriculum design, student assessment";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("education-academic evidence to check"));
    assert!(improved.contains("learner or research audience"));
    assert!(improved.contains("standards or methods"));
    assert!(improved.contains("outcomes"));
    assert!(improved.contains("ethics"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_executive_leadership_evidence_prompt() {
    let bullet = "Led department change program";
    let job_desc =
        "Required: director-level people management, budget ownership, change management";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("executive-leadership evidence to check"));
    assert!(improved.contains("scope of ownership"));
    assert!(improved.contains("team or budget size"));
    assert!(improved.contains("decision authority"));
    assert!(improved.contains("business impact"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_security_evidence_prompt() {
    let bullet = "Supported incident response reviews";
    let job_desc = "Required: cybersecurity, incident response, vulnerability management";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("security evidence to check"));
    assert!(improved.contains("authorized scope"));
    assert!(improved.contains("risk reduced"));
    assert!(improved.contains("controls or incidents handled"));
    assert!(improved.contains("sensitive-data handling"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}

#[test]
fn test_improve_bullet_adds_federal_evidence_prompt() {
    let bullet = "Reviewed program case files";
    let job_desc = "Required: federal specialized experience, GS-09 grade level, public trust";
    let improved = AtsAnalyzer::improve_bullet(bullet, Some(job_desc));

    assert!(improved.contains("federal evidence to check"));
    assert!(improved.contains("specialized experience"));
    assert!(improved.contains("grade level"));
    assert!(improved.contains("announcement duties"));
    assert!(improved.contains("required documents"));
    assert!(improved.contains("problem, your role, action, result, and evidence"));
}
