pub(super) fn conservative_keyword_search_terms(keyword_lower: &str) -> Vec<String> {
    let mut terms = vec![keyword_lower.to_string()];
    let equivalence_groups: &[&[&str]] = &[
        &["crm", "customer relationship management"],
        &["security clearance", "clearance"],
        &["security+", "security plus"],
        &[
            "us citizenship",
            "u.s. citizenship",
            "us citizen",
            "u.s. citizen",
        ],
        &["work authorization", "authorized to work"],
        &[
            "customer service",
            "customer support",
            "client service",
            "client services",
            "client support",
            "guest service",
            "guest services",
        ],
        &["case management", "case coordination"],
        &["scheduling", "calendar management", "appointment setting"],
        &["onboarding", "new hire orientation", "employee orientation"],
        &[
            "training",
            "trained",
            "staff training",
            "employee training",
            "team training",
        ],
        &["quality assurance", "qa"],
        &["front desk", "front-desk", "reception", "receptionist"],
        &["cash handling", "cashier"],
        &["point of sale", "pos system", "pos systems"],
        &["patient care", "patient-care"],
        &[
            "medical record",
            "medical records",
            "medical-record",
            "medical-records",
        ],
        &["care plan", "care plans", "care-plan", "care-plans"],
        &["vital sign", "vital signs", "vital-sign", "vital-signs"],
        &["medication administration", "medication-administration"],
        &["data entry", "data-entry"],
        &[
            "data analysis",
            "data analytics",
            "data-analysis",
            "data-analytics",
            "analytics",
        ],
        &["student support", "student services"],
        &[
            "parent communication",
            "family communication",
            "guardian communication",
        ],
        &["bookkeeping", "bookkeeper"],
        &["quickbooks", "qbo"],
        &["accounts payable", "a/p"],
        &["accounts receivable", "a/r"],
        &[
            "inventory",
            "inventory control",
            "inventory management",
            "stock control",
            "stock management",
            "stockroom",
        ],
        &["budgeting", "budget tracking"],
        &[
            "logistics",
            "shipping",
            "receiving",
            "shipping and receiving",
        ],
        &["procurement", "purchasing"],
        &["vendor management", "supplier management"],
        &["document review", "document-review"],
        &["records management", "records-management"],
        &["case files", "case-files"],
        &["legal research", "legal-research"],
        &["policy analysis", "policy-analysis"],
        &["grant administration", "grant-administration"],
        &["financial reconciliation", "financial-reconciliation"],
        &["billing", "invoicing"],
        &["loan processing", "loan-processing"],
        &["onsite", "on-site", "on site"],
        &[
            "remote",
            "remote work",
            "remote-work",
            "remote role",
            "remote position",
            "remote job",
        ],
        &[
            "hybrid",
            "hybrid work",
            "hybrid-work",
            "hybrid role",
            "hybrid schedule",
            "hybrid position",
            "hybrid job",
        ],
        &["relocation", "relocate", "willing to relocate"],
        &["reliable transportation", "own transportation"],
        &["commute", "commuting"],
        &["night shift", "overnight shift", "third shift", "3rd shift"],
        &["weekend availability", "weekend shift", "weekend shifts"],
        &["evening shift", "second shift", "2nd shift"],
        &["day shift", "first shift", "1st shift"],
        &[
            "overtime availability",
            "overtime",
            "overtime shift",
            "overtime shifts",
        ],
        &[
            "holiday availability",
            "holiday",
            "holiday shift",
            "holiday shifts",
        ],
        &[
            "background check",
            "background checks",
            "background screening",
            "background screenings",
        ],
        &[
            "pre-employment screening",
            "pre employment screening",
            "employment screening",
        ],
        &[
            "drug screen",
            "drug screens",
            "drug screening",
            "drug test",
            "drug tests",
            "drug testing",
        ],
        &["availability", "available"],
        &[
            "full-time availability",
            "full time availability",
            "full-time",
            "full time",
        ],
        &[
            "part-time availability",
            "part time availability",
            "part-time",
            "part time",
        ],
        &[
            "bilingual spanish",
            "bilingual",
            "spanish fluency",
            "fluent spanish",
            "fluent in spanish",
            "spanish language",
            "english/spanish",
            "english and spanish",
        ],
        &["bls", "basic life support"],
        &["acls", "advanced cardiovascular life support"],
        &["cpr", "cardiopulmonary resuscitation"],
        &["driver's license", "drivers license", "driver license"],
        &[
            "cdl",
            "commercial driver's license",
            "commercial drivers license",
            "commercial driver license",
        ],
        &[
            "rn",
            "rn license",
            "registered nurse",
            "registered nurse license",
        ],
        &[
            "lpn",
            "licensed practical nurse",
            "lvn",
            "licensed vocational nurse",
        ],
        &[
            "pmp",
            "project management professional",
            "pmp certification",
            "project management professional certification",
        ],
        &[
            "cna",
            "certified nursing assistant",
            "certified nurse assistant",
            "certified nurse aide",
        ],
        &[
            "food safety",
            "food safety certification",
            "servsafe",
            "food handler certification",
            "food-handler certification",
            "food handler's certification",
            "food-handler's certification",
            "food handlers certification",
            "food-handlers certification",
            "food handler certificate",
            "food-handler certificate",
            "food handler's certificate",
            "food-handler's certificate",
            "food handlers certificate",
            "food-handlers certificate",
            "food handler permit",
            "food-handler permit",
            "food handler's permit",
            "food-handler's permit",
            "food handlers permit",
            "food-handlers permit",
            "food handler card",
            "food-handler card",
            "food handler's card",
            "food-handler's card",
            "food handlers card",
            "food-handlers card",
        ],
        &[
            "first aid",
            "first-aid",
            "first aid certification",
            "first-aid certification",
            "first aid certified",
            "first-aid certified",
            "first aid certificate",
            "first-aid certificate",
        ],
        &[
            "forklift",
            "forklift certification",
            "forklift certified",
            "forklift operator certification",
            "forklift operator certified",
            "forklift license",
            "forklift operator license",
        ],
        &[
            "osha 10",
            "osha10",
            "osha 10 certification",
            "osha10 certification",
            "osha 10-hour",
            "osha 10-hour certification",
            "osha 10 hour",
            "osha 10 hour certification",
        ],
        &[
            "osha 30",
            "osha30",
            "osha 30 certification",
            "osha30 certification",
            "osha 30-hour",
            "osha 30-hour certification",
            "osha 30 hour",
            "osha 30 hour certification",
        ],
        &[
            "cissp",
            "certified information systems security professional",
        ],
        &[
            "high school diploma",
            "high-school diploma",
            "high school degree",
            "high-school degree",
            "ged",
            "high school equivalency",
            "high-school equivalency",
            "general education development",
        ],
        &[
            "associate's degree",
            "associate degree",
            "associate of applied science",
            "associate of arts",
            "associate of science",
            "associates degree",
        ],
        &[
            "bachelor's degree",
            "baccalaureate degree",
            "bachelor degree",
            "bachelors degree",
            "bachelor of applied science",
            "bachelor of arts",
            "bachelor of business administration",
            "bachelor of education",
            "bachelor of engineering",
            "bachelor of fine arts",
            "bachelor of science",
            "bachelor of social work",
        ],
        &[
            "master's degree",
            "master degree",
            "masters degree",
            "master of arts",
            "master of business administration",
            "master of education",
            "master of engineering",
            "master of fine arts",
            "master of science",
            "master of social work",
        ],
        &[
            "phd",
            "ph.d",
            "ph.d.",
            "phd degree",
            "ph.d degree",
            "ph.d. degree",
            "doctorate",
            "doctorate degree",
            "doctoral degree",
        ],
        &[
            "stand for long period",
            "stand for long periods",
            "standing for long period",
            "standing for long periods",
        ],
    ];

    for group in equivalence_groups {
        if group.contains(&keyword_lower) {
            for term in *group {
                if !terms.iter().any(|existing| existing == term) {
                    terms.push(term.to_string());
                }
            }
        }
    }
    extend_lift_weight_unit_terms(keyword_lower, &mut terms);
    extend_language_fluency_terms(keyword_lower, &mut terms);

    match keyword_lower {
        "senior-level experience" => {
            terms.extend(
                [
                    "senior", "sr.", "lead", "5 years", "5+ years", "5 yrs", "5+ yrs",
                ]
                .into_iter()
                .map(str::to_string),
            );
            terms.extend(experience_year_search_terms(6));
        }
        "mid-level experience" => {
            terms.extend(
                [
                    "mid-level",
                    "intermediate",
                    "3 years",
                    "3+ years",
                    "3 yrs",
                    "3+ yrs",
                ]
                .into_iter()
                .map(str::to_string),
            );
            terms.extend(experience_year_search_terms(4));
        }
        "lead-level experience" => {
            terms.extend(
                [
                    "lead",
                    "team lead",
                    "shift lead",
                    "crew lead",
                    "lead worker",
                    "lead experience",
                    "leadership experience",
                    "supervised",
                    "supervisor",
                ]
                .into_iter()
                .map(str::to_string),
            );
            terms.extend(experience_year_search_terms(5));
        }
        "staff/principal-level experience" => {
            terms.extend(
                ["staff", "principal", "architect", "10 years", "10+ years"]
                    .into_iter()
                    .map(str::to_string),
            );
            terms.extend(experience_year_search_terms(11));
        }
        "management experience" => {
            terms.extend(
                [
                    "management",
                    "manager",
                    "managed",
                    "managed a team",
                    "managed team",
                    "managed staff",
                    "managed people",
                    "managed employees",
                    "people management",
                    "supervisor experience",
                    "supervised",
                    "supervised staff",
                    "supervising staff",
                    "supervisor",
                    "team supervision",
                ]
                .into_iter()
                .map(str::to_string),
            );
        }
        "director-level experience" => {
            terms.extend(
                [
                    "director",
                    "head of",
                    "department lead",
                    "10 years",
                    "10+ years",
                ]
                .into_iter()
                .map(str::to_string),
            );
            terms.extend(experience_year_search_terms(11));
        }
        "executive-level experience" => {
            terms.extend(
                [
                    "executive",
                    "vp",
                    "vice president",
                    "chief",
                    "c-level",
                    "10 years",
                    "10+ years",
                ]
                .into_iter()
                .map(str::to_string),
            );
            terms.extend(experience_year_search_terms(11));
        }
        "degree or equivalent experience" => {
            terms.extend(
                [
                    "degree",
                    "bachelor's degree",
                    "bachelor degree",
                    "bachelor",
                    "ba",
                    "bs",
                    "master's degree",
                    "master degree",
                    "master",
                    "ma",
                    "ms",
                    "equivalent experience",
                    "work experience",
                    "experience",
                ]
                .into_iter()
                .map(str::to_string),
            );
        }
        _ => {}
    }

    terms
}

fn extend_lift_weight_unit_terms(keyword_lower: &str, terms: &mut Vec<String>) {
    let Ok(lift_re) = regex::Regex::new(r"(?i)\blift(?:\s+up\s+to)?\s+(\d+)\s*(?:lbs?|pounds?)\b")
    else {
        return;
    };
    let Some(captures) = lift_re.captures(keyword_lower) else {
        return;
    };
    let Some(amount) = captures.get(1).map(|capture| capture.as_str()) else {
        return;
    };

    for prefix in [format!("lift {amount}"), format!("lift up to {amount}")] {
        for unit in ["lb", "lbs", "pound", "pounds"] {
            let term = format!("{prefix} {unit}");
            if !terms.iter().any(|existing| existing == &term) {
                terms.push(term);
            }
        }
    }
}

fn experience_year_search_terms(min_years: usize) -> Vec<String> {
    let mut terms = Vec::new();
    for years in min_years..=50 {
        terms.push(format!("{years} years"));
        terms.push(format!("{years}+ years"));
        terms.push(format!("{years} yrs"));
        terms.push(format!("{years}+ yrs"));
    }
    terms
}

fn known_language_names() -> &'static [&'static str] {
    &[
        "spanish",
        "french",
        "mandarin",
        "cantonese",
        "arabic",
        "portuguese",
        "german",
        "japanese",
        "korean",
    ]
}

pub(super) fn known_human_language_requirement(lower: &str) -> bool {
    if lower.contains("bilingual") {
        return true;
    }

    known_language_names().iter().any(|language| {
        lower.contains(&format!("{language} fluency"))
            || lower.contains(&format!("fluent {language}"))
            || lower.contains(&format!("fluent in {language}"))
            || lower.contains(&format!("{language} language"))
            || lower.contains(&format!("english/{language}"))
            || lower.contains(&format!("english and {language}"))
    })
}

fn extend_language_fluency_terms(keyword_lower: &str, terms: &mut Vec<String>) {
    for language in known_language_names() {
        if !keyword_lower.contains(language) {
            continue;
        }

        for term in [
            format!("bilingual {language}"),
            format!("{language} fluency"),
            format!("fluent {language}"),
            format!("fluent in {language}"),
            format!("{language} language"),
            format!("english/{language}"),
            format!("english and {language}"),
            language.to_string(),
        ] {
            if !terms.iter().any(|existing| existing == &term) {
                terms.push(term);
            }
        }
    }
}
