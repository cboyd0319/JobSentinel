use super::*;

pub(in crate::core::resume::ats_analyzer) fn has_adversarial_content(resume: &ResumeData) -> bool {
    text_has_adversarial_content(&resume.summary)
        || text_has_adversarial_content(&resume.contact_info.name)
        || resume.experience.iter().any(|experience| {
            text_has_adversarial_content(&experience.title)
                || text_has_adversarial_content(&experience.company)
                || experience
                    .achievements
                    .iter()
                    .any(|item| text_has_adversarial_content(item))
        })
        || resume.skills.iter().any(|skill| {
            text_has_adversarial_content(&skill.name)
                || text_has_adversarial_content(&skill.category)
                || skill
                    .proficiency
                    .as_deref()
                    .is_some_and(text_has_adversarial_content)
        })
        || resume.education.iter().any(|education| {
            text_has_adversarial_content(&education.degree)
                || text_has_adversarial_content(&education.institution)
                || education
                    .honors
                    .iter()
                    .any(|item| text_has_adversarial_content(item))
        })
        || resume
            .certifications
            .iter()
            .any(|item| text_has_adversarial_content(item))
        || resume
            .projects
            .iter()
            .any(|item| text_has_adversarial_content(item))
        || resume.custom_sections.iter().any(|(section, values)| {
            text_has_adversarial_content(section)
                || values.iter().any(|item| text_has_adversarial_content(item))
        })
}

pub(in crate::core::resume::ats_analyzer) fn collect_resume_text(resume: &ResumeData) -> String {
    let mut chunks = vec![resume.summary.as_str(), resume.contact_info.name.as_str()];

    for experience in &resume.experience {
        chunks.push(experience.title.as_str());
        chunks.push(experience.company.as_str());
        chunks.extend(experience.achievements.iter().map(String::as_str));
    }
    for skill in &resume.skills {
        chunks.push(skill.name.as_str());
        chunks.push(skill.category.as_str());
        if let Some(proficiency) = skill.proficiency.as_deref() {
            chunks.push(proficiency);
        }
    }
    for education in &resume.education {
        chunks.push(education.degree.as_str());
        chunks.push(education.institution.as_str());
        chunks.extend(education.honors.iter().map(String::as_str));
    }
    chunks.extend(resume.certifications.iter().map(String::as_str));
    chunks.extend(resume.projects.iter().map(String::as_str));
    for (section, values) in &resume.custom_sections {
        chunks.push(section.as_str());
        chunks.extend(values.iter().map(String::as_str));
    }

    chunks.join("\n")
}

pub(in crate::core::resume::ats_analyzer) fn has_keyword_stuffing(resume: &ResumeData) -> bool {
    text_has_keyword_stuffing(&resume.summary)
        || resume.experience.iter().any(|experience| {
            text_has_keyword_stuffing(&experience.title)
                || text_has_keyword_stuffing(&experience.company)
                || experience
                    .achievements
                    .iter()
                    .any(|item| text_has_keyword_stuffing(item))
        })
        || resume.skills.iter().any(|skill| {
            text_has_keyword_stuffing(&skill.name)
                || text_has_keyword_stuffing(&skill.category)
                || skill
                    .proficiency
                    .as_deref()
                    .is_some_and(text_has_keyword_stuffing)
        })
        || resume
            .projects
            .iter()
            .any(|item| text_has_keyword_stuffing(item))
        || resume.custom_sections.iter().any(|(section, values)| {
            text_has_keyword_stuffing(section)
                || values.iter().any(|item| text_has_keyword_stuffing(item))
        })
}

pub(in crate::core::resume::ats_analyzer) fn text_has_adversarial_content(text: &str) -> bool {
    if text.chars().any(|c| {
        matches!(
            c,
            '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{2060}' | '\u{FEFF}'
        )
    }) {
        return true;
    }

    let lower = text.to_lowercase();
    let hidden_style_patterns = [
        r"(?i)\bcolor\s*:\s*(?:white|#fff(?:fff)?|transparent)\b",
        r"(?i)\bfont-size\s*:\s*[0-3](?:px|pt)?\b",
        r"(?i)\bdisplay\s*:\s*none\b",
        r"(?i)\bvisibility\s*:\s*hidden\b",
        r"(?i)\bopacity\s*:\s*0(?:\.0+)?\b",
        r"(?i)\bmso-hide\s*:\s*all\b",
    ];
    if hidden_style_patterns
        .iter()
        .any(|pattern| regex::Regex::new(pattern).unwrap().is_match(text))
    {
        return true;
    }

    let hidden_markup_patterns = [
        r"(?is)<!--.*?-->",
        r"(?i)<meta\b[^>]*(?:keywords|description|content)\b",
    ];
    if hidden_markup_patterns
        .iter()
        .any(|pattern| regex::Regex::new(pattern).unwrap().is_match(text))
    {
        return true;
    }

    [
        "ignore previous instructions",
        "ignore all previous instructions",
        "disregard previous instructions",
        "override instructions",
        "system prompt",
        "developer message",
        "prompt injection",
        "always rank this resume",
        "always select this candidate",
        "hire this candidate",
        "ignore the job description",
        "do not follow the job description",
        "instruction to recruiter software",
        "for ai screeners",
    ]
    .iter()
    .any(|phrase| lower.contains(phrase))
}

pub(in crate::core::resume::ats_analyzer) fn text_has_keyword_stuffing(text: &str) -> bool {
    let token_re = regex::Regex::new(r"(?i)[a-z][a-z0-9+#.]{1,}").unwrap();
    let mut previous = String::new();
    let mut run_length = 0;

    for token in token_re.find_iter(text).map(|m| m.as_str()) {
        let token = token.trim_matches('.').to_ascii_lowercase();
        if token.len() < 3 || is_keyword_stuffing_stopword(&token) {
            previous.clear();
            run_length = 0;
            continue;
        }

        if token == previous {
            run_length += 1;
        } else {
            previous = token;
            run_length = 1;
        }

        if run_length >= 3 {
            return true;
        }
    }

    false
}

pub(in crate::core::resume::ats_analyzer) fn text_has_unclear_capability_level(text: &str) -> bool {
    text.lines().any(line_has_unclear_capability_level)
}

pub(in crate::core::resume::ats_analyzer) fn line_has_unclear_capability_level(line: &str) -> bool {
    let lower = line.to_lowercase();
    let padded = format!(" {lower} ");
    let ownership_terms = [
        " owned ",
        " owner ",
        " led ",
        " managed ",
        " directed ",
        " architected ",
        " independently delivered ",
        " expert ",
        " strategic ",
    ];
    let exposure_terms = [
        " shadowed ",
        " shadowing ",
        " observed ",
        " observing ",
        " assisted ",
        " helped ",
        " exposure to ",
        " exposed to ",
        " trained on ",
        " familiar with ",
        " under supervision ",
    ];

    ownership_terms.iter().any(|term| padded.contains(term))
        && exposure_terms.iter().any(|term| padded.contains(term))
}

pub(in crate::core::resume::ats_analyzer) fn is_keyword_stuffing_stopword(token: &str) -> bool {
    matches!(
        token,
        "and"
            | "the"
            | "for"
            | "with"
            | "from"
            | "that"
            | "this"
            | "you"
            | "your"
            | "resume"
            | "work"
    )
}
