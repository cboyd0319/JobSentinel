use super::{EducationRequirement, ExperienceRequirement};

#[cfg(test)]
pub(super) fn generate_gap_analysis(
    matching_skills: &[String],
    missing_skills: &[String],
    overall_score: f64,
) -> String {
    let match_percentage = (overall_score * 100.0).round() as i32;

    let mut analysis = format!("Match: {}%\n\n", match_percentage);

    if !matching_skills.is_empty() {
        analysis.push_str(&format!("Matching Skills ({}):\n", matching_skills.len()));
        for skill in matching_skills {
            analysis.push_str(&format!("  - {}\n", skill));
        }
        analysis.push('\n');
    }

    if !missing_skills.is_empty() {
        analysis.push_str(&format!("Missing Skills ({}):\n", missing_skills.len()));
        for skill in missing_skills {
            analysis.push_str(&format!("  - {}\n", skill));
        }
        analysis.push('\n');
    }

    append_next_step(&mut analysis, overall_score);
    analysis
}

#[allow(clippy::too_many_arguments)]
pub(super) fn generate_enhanced_gap_analysis(
    matching_skills: &[String],
    missing_skills: &[String],
    skills_score: f64,
    experience_score: f64,
    experience_reqs: &[ExperienceRequirement],
    education_score: f64,
    education_req: Option<&EducationRequirement>,
    overall_score: f64,
) -> String {
    let overall_pct = (overall_score * 100.0).round() as i32;
    let skills_pct = (skills_score * 100.0).round() as i32;
    let exp_pct = (experience_score * 100.0).round() as i32;
    let edu_pct = (education_score * 100.0).round() as i32;

    let skill_count = matching_skills.len() + missing_skills.len();
    let skill_line = if skill_count == 0 {
        "- Skills: not enough job-post skill detail recognized".to_string()
    } else {
        format!(
            "- Skills: {}% ({}/{} matched)",
            skills_pct,
            matching_skills.len(),
            skill_count
        )
    };

    let mut analysis = format!(
        "Match Score: {}%\n{}\n- Experience: {}%\n- Education: {}%\n\n",
        overall_pct, skill_line, exp_pct, edu_pct
    );

    append_skills_section(&mut analysis, "Matching Skills", matching_skills);
    append_skills_section(&mut analysis, "Missing Skills", missing_skills);
    append_experience_section(&mut analysis, experience_reqs);
    append_education_section(&mut analysis, education_req);
    append_next_step(&mut analysis, overall_score);

    analysis
}

fn append_skills_section(analysis: &mut String, label: &str, skills: &[String]) {
    if skills.is_empty() {
        return;
    }

    analysis.push_str(&format!("{label} ({}):\n", skills.len()));
    for skill in skills.iter().take(10) {
        analysis.push_str(&format!("  - {}\n", skill));
    }
    if skills.len() > 10 {
        analysis.push_str(&format!("  ... and {} more\n", skills.len() - 10));
    }
    analysis.push('\n');
}

fn append_experience_section(analysis: &mut String, experience_reqs: &[ExperienceRequirement]) {
    if experience_reqs.is_empty() {
        return;
    }

    analysis.push_str("Experience Requirements:\n");
    for req in experience_reqs.iter().take(5) {
        let skill_label = req.skill.as_deref().unwrap_or("General");
        let range = if let Some(max) = req.max_years {
            format!("{}-{}", req.min_years, max)
        } else {
            format!("{}+", req.min_years)
        };
        let required_label = if req.is_required {
            "required"
        } else {
            "preferred"
        };
        analysis.push_str(&format!(
            "  - {} years {} ({})\n",
            range, skill_label, required_label
        ));
    }
    analysis.push('\n');
}

fn append_education_section(analysis: &mut String, education_req: Option<&EducationRequirement>) {
    let Some(req) = education_req else {
        return;
    };

    let required_label = if req.is_required {
        "required"
    } else {
        "preferred"
    };
    let field_label = if req.fields.is_empty() {
        String::new()
    } else {
        format!("in {}", req.fields.join(", "))
    };
    analysis.push_str(&format!(
        "Education: {} {} ({})\n\n",
        req.degree_level.as_str(),
        field_label,
        required_label
    ));
}

fn append_next_step(analysis: &mut String, overall_score: f64) {
    if overall_score >= 0.8 {
        analysis.push_str(
            "Next step: If this role still fits your goals, review the missing items and decide whether to apply.",
        );
    } else if overall_score >= 0.6 {
        analysis.push_str(
            "Next step: Review transferable skills and add only experience you can support truthfully.",
        );
    } else if overall_score >= 0.4 {
        analysis.push_str(
            "Next step: Check whether the missing items are required. If related experience exists, add it truthfully.",
        );
    } else {
        analysis.push_str(
            "Next step: This role may need more review before tailoring. Compare it against your goals and constraints.",
        );
    }
}
