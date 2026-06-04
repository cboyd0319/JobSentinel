pub(super) fn get_power_words() -> Vec<&'static str> {
    vec![
        // Leadership
        "led",
        "managed",
        "directed",
        "coordinated",
        "supervised",
        "mentored",
        "trained",
        // Achievement
        "achieved",
        "accomplished",
        "delivered",
        "exceeded",
        "surpassed",
        "completed",
        // Creation
        "developed",
        "created",
        "designed",
        "built",
        "implemented",
        "launched",
        "established",
        // Improvement
        "improved",
        "optimized",
        "enhanced",
        "streamlined",
        "modernized",
        "automated",
        "refactored",
        // Impact
        "increased",
        "reduced",
        "decreased",
        "saved",
        "generated",
        "accelerated",
        // Analysis
        "analyzed",
        "researched",
        "evaluated",
        "assessed",
        "investigated",
        "identified",
        // Collaboration
        "collaborated",
        "partnered",
        "contributed",
        "participated",
        "supported",
        "facilitated",
    ]
}

pub(super) fn append_interview_defense_prompt(text: &mut String) {
    let prompt = "problem, your role, action, result, and evidence";
    if !text.contains(prompt) {
        text.push_str(&format!(
            " (before using, make sure you can explain the {prompt})"
        ));
    }
}

pub(super) fn append_role_specific_evidence_prompt(text: &mut String, job_desc: &str) {
    let Some(prompt) = role_specific_evidence_prompt(job_desc) else {
        return;
    };

    if !text.contains(prompt) {
        text.push_str(&format!(" ({prompt})"));
    }
}

fn role_specific_evidence_prompt(job_desc: &str) -> Option<&'static str> {
    let lower = job_desc.to_lowercase();
    let healthcare_terms = [
        "patient care",
        "healthcare",
        "nursing",
        "rn license",
        "registered nurse",
        "lpn",
        "cna",
        "medication administration",
        "clinical",
        "medical record",
        "vital sign",
        "care plan",
        "home health",
        "hospital",
        "clinic",
    ];

    if healthcare_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "healthcare evidence to check: scope of practice, patient safety, documentation, and required credentials",
        );
    }

    let trades_field_terms = [
        "maintenance technician",
        "equipment repair",
        "field service",
        "forklift",
        "osha",
        "work order",
        "work orders",
        "installation",
        "installer",
        "hvac",
        "plumbing",
        "electrical",
        "welding",
        "machine operator",
        "warehouse safety",
    ];

    if trades_field_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "trades-field evidence to check: equipment or tools used, safety rules, work orders, downtime or quality impact, and required licenses",
        );
    }

    let career_change_terms = [
        "career change",
        "career-change",
        "career transition",
        "career-transition",
        "transitioning careers",
        "returnship",
        "return to work",
        "transferable skills",
        "transferable experience",
    ];

    if career_change_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "career-change evidence to check: transferable work, training, adjacent experience, scope, and truthful gaps or transitions",
        );
    }

    let early_career_terms = [
        "entry-level",
        "entry level",
        "new graduate",
        "new grad",
        "recent graduate",
        "trainee",
        "apprentice",
        "apprenticeship",
        "internship",
    ];

    if early_career_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "early-career evidence to check: training or coursework, projects or volunteer work, supervised responsibilities, transferable skills, and readiness to learn",
        );
    }

    let education_academic_terms = [
        "teaching",
        "teacher",
        "classroom",
        "student",
        "curriculum",
        "lesson plan",
        "instructional design",
        "academic",
        "faculty",
        "university",
        "school counselor",
        "research methods",
        "publication",
        "thesis",
        "dissertation",
    ];

    if education_academic_terms
        .iter()
        .any(|term| lower.contains(term))
    {
        return Some(
            "education-academic evidence to check: learner or research audience, standards or methods, outcomes, collaboration, and ethics",
        );
    }

    let federal_terms = [
        "federal",
        "usajobs",
        "specialized experience",
        "grade level",
        "gs-",
        "public trust",
        "occupational series",
        "job announcement",
        "announcement number",
        "required documents",
    ];

    if federal_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "federal evidence to check: specialized experience, grade level, announcement duties, dates and hours, citizenship or clearance, and required documents",
        );
    }

    let regulated_work_terms = [
        "legal research",
        "case files",
        "case file",
        "document review",
        "records management",
        "policy analysis",
        "grant administration",
        "financial reconciliation",
        "loan processing",
        "compliance",
        "audit",
        "government",
        "public sector",
    ];

    if regulated_work_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "regulated-work evidence to check: records accuracy, deadlines, confidentiality, compliance, and audit trail",
        );
    }

    let executive_leadership_terms = [
        "executive",
        "director-level",
        "director level",
        "vice president",
        "senior leadership",
        "executive leadership",
        "people management",
        "budget ownership",
        "p&l",
        "organizational strategy",
        "change management",
        "board",
        "chief",
        "c-suite",
    ];

    if executive_leadership_terms
        .iter()
        .any(|term| lower.contains(term))
    {
        return Some(
            "executive-leadership evidence to check: scope of ownership, team or budget size, decision authority, measurable business impact, and change risk",
        );
    }

    let security_terms = [
        "cybersecurity",
        "information security",
        "security operations",
        "soc analyst",
        "incident response",
        "vulnerability management",
        "risk management framework",
        "nist",
        "fedramp",
        "siem",
        "threat detection",
    ];

    if security_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "security evidence to check: authorized scope, risk reduced, controls or incidents handled, compliance context, and sensitive-data handling",
        );
    }

    let service_operations_terms = [
        "customer service",
        "customer support",
        "client service",
        "client support",
        "guest service",
        "guest services",
        "front desk",
        "front-desk",
        "reception",
        "receptionist",
        "case management",
        "case coordination",
        "scheduling",
        "appointment setting",
        "calendar management",
        "client intake",
        "operations",
        "escalation",
        "service quality",
    ];

    if service_operations_terms
        .iter()
        .any(|term| lower.contains(term))
    {
        return Some(
            "service-operations evidence to check: customer impact, volume, escalation path, documentation, and response quality",
        );
    }

    let design_creative_terms = [
        "product design",
        "user experience",
        "ux",
        "ui design",
        "interaction design",
        "visual design",
        "graphic design",
        "content design",
        "brand design",
        "creative direction",
        "design portfolio",
        "designer",
        "figma",
        "prototype",
        "accessibility",
    ];

    if design_creative_terms
        .iter()
        .any(|term| lower.contains(term))
    {
        return Some(
            "design-creative evidence to check: user problem, audience, constraints, decisions, accessibility, and shipped outcome",
        );
    }

    let technical_data_terms = [
        "software",
        "developer",
        "engineering",
        "data analysis",
        "data analyst",
        "machine learning",
        "model monitoring",
        "analytics",
        "sql",
        "python",
        "dashboard",
        "api",
        "product",
    ];

    if technical_data_terms.iter().any(|term| lower.contains(term)) {
        return Some(
            "technical-data evidence to check: shipped work, users or decisions supported, reliability, data sources, and measurable outcomes",
        );
    }

    let sales_marketing_terms = [
        "sales",
        "pipeline",
        "account",
        "quota",
        "renewal",
        "retention",
        "marketing",
        "campaign",
        "audience",
        "conversion",
        "revenue",
        "lead generation",
        "channel",
    ];

    if sales_marketing_terms
        .iter()
        .any(|term| lower.contains(term))
    {
        return Some(
            "sales-marketing evidence to check: quota or pipeline, audience or account scope, conversion or revenue impact, retention, and budget",
        );
    }

    None
}
