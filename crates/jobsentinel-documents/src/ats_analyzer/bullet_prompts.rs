pub(super) fn get_power_words() -> Vec<&'static str> {
    super::requirement_rules::bullet_power_words()
        .iter()
        .map(String::as_str)
        .collect()
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
    super::requirement_rules::role_specific_evidence_prompt(&lower)
}
