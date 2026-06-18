use std::collections::HashSet;

pub(super) fn extract_keywords_from_text(text: &str) -> Vec<String> {
    let mut keywords = HashSet::new();

    let keyword_patterns = [
        r"(?i)\b(customer service|client service|client services|guest services?|front[- ]desk|reception|receptionist|case management|case coordination|case notes|case documentation)\b",
        r"(?i)\b(scheduling|calendar management|appointment setting|intake|onboarding|training)\b",
        r"(?i)\b(sales|account management|crm|salesforce|hubspot|pipeline|prospecting)\b",
        r"(?i)\b(payroll|bookkeeping|bookkeeper|quickbooks|qbo|accounts payable|accounts receivable|a/p|a/r|billing)\b",
        r"(?i)\b(inventory|inventory[- ]control|inventory[- ]management|stock control|stock management|stockroom|logistics|shipping|receiving|procurement|purchasing|vendor management|supplier management)\b",
        r"(?i)\b(reporting|budgeting|budget tracking|grant reporting|grant writing|program evaluation)\b",
        r"(?i)\b(compliance|hipaa|osha|quality assurance|qa|data[- ]entry|data[- ]analysis|data[- ]analytics|analytics|excel)\b",
        r"(?i)\b(patient[- ]care|medication[- ]administration|vital[- ]signs?|care[- ]plans?|medical[- ]records?|charting)\b",
        r"(?i)\b(lesson planning|classroom management|curriculum|iep|student support|student services|parent communication|family communication|guardian communication)\b",
        r"(?i)\b(forklift|welding|equipment maintenance|safety inspections|food safety|cash handling|cashier|point of sale|pos systems?)\b",
        r"(?i)\b(document[- ]review|case[- ]files|legal[- ]research|records[- ]management|policy[- ]analysis|grant[- ]administration|public benefits)\b",
        r"(?i)\b(financial[- ]reconciliation|reconciliation|invoicing|loan[- ]processing|financial reporting)\b",
        r"(?i)\b(rust|python|javascript|typescript|java|c\+\+|go|kotlin|swift)\b",
        r"(?i)\b(react|vue|angular|node\.?js|django|flask|spring|express)\b",
        r"(?i)\b(aws|azure|gcp|docker|kubernetes|terraform|ansible)\b",
        r"(?i)\b(sql|postgresql|mysql|mongodb|redis|elasticsearch)\b",
        r"(?i)\b(git|ci/cd|agile|scrum|rest|graphql|microservices)\b",
    ];

    for pattern in &keyword_patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            for cap in re.captures_iter(text) {
                if let Some(m) = cap.get(0) {
                    keywords.insert(canonical_requirement_keyword(&m.as_str().to_lowercase()));
                }
            }
        }
    }
    for keyword in super::requirement_rules::extract_supplemental_keywords(text) {
        keywords.insert(keyword);
    }

    let mut sorted_keywords = keywords.into_iter().collect::<Vec<_>>();
    sorted_keywords.sort();
    sorted_keywords
}

pub(super) fn canonical_requirement_keyword(keyword: &str) -> String {
    match keyword {
        "bookkeeper" => "bookkeeping".to_string(),
        "qbo" => "quickbooks".to_string(),
        "a/p" => "accounts payable".to_string(),
        "a/r" => "accounts receivable".to_string(),
        "pos system" | "pos systems" => "point of sale".to_string(),
        _ => keyword.to_string(),
    }
}

pub(super) fn industry_keywords() -> Vec<String> {
    let mut keywords = [
        // Development
        "agile",
        "scrum",
        "ci/cd",
        "devops",
        "microservices",
        "rest",
        "graphql",
        "api",
        // Cloud
        "aws",
        "azure",
        "gcp",
        "cloud",
        "docker",
        "kubernetes",
        "serverless",
        // Data
        "sql",
        "nosql",
        "database",
        "data pipeline",
        "etl",
        "data analysis",
        "data analytics",
        "analytics",
        // General
        "customer service",
        "client services",
        "guest service",
        "guest services",
        "front desk",
        "front-desk",
        "reception",
        "receptionist",
        "case management",
        "scheduling",
        "intake",
        "training",
        "onboarding",
        "new hire orientation",
        "employee orientation",
        "sales",
        "account management",
        "crm",
        "pmp",
        "project management professional",
        "payroll",
        "bookkeeping",
        "bookkeeper",
        "quickbooks",
        "qbo",
        "accounts payable",
        "accounts receivable",
        "a/p",
        "a/r",
        "inventory",
        "inventory control",
        "inventory management",
        "stock control",
        "stock management",
        "stockroom",
        "logistics",
        "procurement",
        "purchasing",
        "vendor management",
        "supplier management",
        "reporting",
        "budgeting",
        "budget tracking",
        "compliance",
        "quality assurance",
        "data entry",
        "excel",
        "patient care",
        "cna",
        "certified nursing assistant",
        "lpn",
        "licensed practical nurse",
        "medication administration",
        "vital signs",
        "care plans",
        "medical records",
        "charting",
        "lesson planning",
        "classroom management",
        "curriculum",
        "iep",
        "student support",
        "student services",
        "parent communication",
        "family communication",
        "guardian communication",
        "forklift",
        "welding",
        "equipment maintenance",
        "safety inspections",
        "food safety",
        "food safety certification",
        "point of sale",
        "pos system",
        "pos systems",
        "servsafe",
        "food handler certification",
        "first aid",
        "first aid certification",
        "cash handling",
        "cashier",
        "forklift certification",
        "osha 10",
        "osha 10 certification",
        "osha 30",
        "osha 30 certification",
        "document review",
        "case files",
        "legal research",
        "records management",
        "policy analysis",
        "grant administration",
        "public benefits",
        "financial reconciliation",
        "reconciliation",
        "billing",
        "invoicing",
        "loan processing",
        "financial reporting",
        "tdd",
        "testing",
        "automation",
        "performance",
        "scalability",
        "security",
    ]
    .into_iter()
    .map(str::to_string)
    .collect::<Vec<_>>();
    keywords.extend(super::requirement_rules::supplemental_keyword_canonicals());
    keywords
}
