use super::FieldType;
use crate::automation::{has_generic_automation_contract, AtsPlatform};
use std::collections::HashMap;

fn insert_generic_contact_resume_selectors(selectors: &mut HashMap<FieldType, Vec<&'static str>>) {
    selectors.insert(
        FieldType::FirstName,
        vec!["input[name*='first']", "input[id*='first']", "#firstName"],
    );
    selectors.insert(
        FieldType::LastName,
        vec!["input[name*='last']", "input[id*='last']", "#lastName"],
    );
    selectors.insert(
        FieldType::FullName,
        vec!["input[name='name']", "input[id='name']", "#name"],
    );
    selectors.insert(
        FieldType::Email,
        vec!["input[type='email']", "input[name*='email']", "#email"],
    );
    selectors.insert(
        FieldType::Phone,
        vec!["input[type='tel']", "input[name*='phone']", "#phone"],
    );
    selectors.insert(
        FieldType::LinkedIn,
        vec!["input[name*='linkedin']", "input[id*='linkedin']"],
    );
    selectors.insert(
        FieldType::GitHub,
        vec!["input[name*='github']", "input[id*='github']"],
    );
    selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
}

pub(super) fn get_field_selectors(platform: &AtsPlatform) -> HashMap<FieldType, Vec<&'static str>> {
    let mut selectors = HashMap::new();

    if has_generic_automation_contract(platform) {
        insert_generic_contact_resume_selectors(&mut selectors);
        return selectors;
    }

    match platform {
        AtsPlatform::Greenhouse => {
            selectors.insert(
                FieldType::FirstName,
                vec![
                    "#first_name",
                    "input[name='first_name']",
                    "[data-field='first_name']",
                ],
            );
            selectors.insert(
                FieldType::LastName,
                vec![
                    "#last_name",
                    "input[name='last_name']",
                    "[data-field='last_name']",
                ],
            );
            selectors.insert(
                FieldType::Email,
                vec!["#email", "input[name='email']", "input[type='email']"],
            );
            selectors.insert(
                FieldType::Phone,
                vec!["#phone", "input[name='phone']", "input[type='tel']"],
            );
            selectors.insert(
                FieldType::LinkedIn,
                vec!["input[name*='linkedin']", "[data-field*='linkedin']"],
            );
            selectors.insert(
                FieldType::Resume,
                vec!["input[type='file'][name*='resume']", "input[type='file']"],
            );
            selectors.insert(
                FieldType::CoverLetter,
                vec![
                    "textarea[name*='cover_letter']",
                    "textarea[name*='cover-letter']",
                    "input[type='file'][name*='cover']",
                ],
            );
            selectors.insert(
                FieldType::WorkAuthorized,
                vec!["select[name*='authorized']", "input[name*='authorized']"],
            );
        }
        AtsPlatform::Lever => {
            selectors.insert(
                FieldType::FullName,
                vec!["input[name='name']", "[data-qa='name-input']"],
            );
            selectors.insert(
                FieldType::Email,
                vec![
                    "input[name='email']",
                    "[data-qa='email-input']",
                    "input[type='email']",
                ],
            );
            selectors.insert(
                FieldType::Phone,
                vec!["input[name='phone']", "[data-qa='phone-input']"],
            );
            selectors.insert(
                FieldType::LinkedIn,
                vec!["input[name*='linkedin']", "[data-qa='urls-input-linkedin']"],
            );
            selectors.insert(
                FieldType::GitHub,
                vec!["input[name*='github']", "[data-qa='urls-input-github']"],
            );
            selectors.insert(
                FieldType::Resume,
                vec!["input[type='file']", "[data-qa='resume-input']"],
            );
        }
        AtsPlatform::Workday => {
            // Workday uses dynamic IDs, so use generic fallbacks.
            selectors.insert(
                FieldType::FirstName,
                vec![
                    "input[data-automation-id='legalNameSection_firstName']",
                    "input[id*='firstName']",
                ],
            );
            selectors.insert(
                FieldType::LastName,
                vec![
                    "input[data-automation-id='legalNameSection_lastName']",
                    "input[id*='lastName']",
                ],
            );
            selectors.insert(
                FieldType::Email,
                vec!["input[data-automation-id='email']", "input[type='email']"],
            );
            selectors.insert(
                FieldType::Phone,
                vec![
                    "input[data-automation-id='phone-number']",
                    "input[type='tel']",
                ],
            );
            selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
        }
        AtsPlatform::Taleo => {
            selectors.insert(
                FieldType::FirstName,
                vec!["input[id*='FirstName']", "input[name*='firstName']"],
            );
            selectors.insert(
                FieldType::LastName,
                vec!["input[id*='LastName']", "input[name*='lastName']"],
            );
            selectors.insert(
                FieldType::Email,
                vec!["input[id*='Email']", "input[type='email']"],
            );
            selectors.insert(
                FieldType::Phone,
                vec!["input[id*='Phone']", "input[type='tel']"],
            );
            selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
        }
        AtsPlatform::AshbyHq => {
            selectors.insert(
                FieldType::FullName,
                vec!["input[name='name']", "[data-testid='name-input']"],
            );
            selectors.insert(
                FieldType::Email,
                vec!["input[name='email']", "input[type='email']"],
            );
            selectors.insert(
                FieldType::Phone,
                vec!["input[name='phone']", "input[type='tel']"],
            );
            selectors.insert(FieldType::LinkedIn, vec!["input[name*='linkedin']"]);
            selectors.insert(FieldType::Resume, vec!["input[type='file']"]);
        }
        AtsPlatform::Icims
        | AtsPlatform::BambooHr
        | AtsPlatform::SmartRecruiters
        | AtsPlatform::Workable
        | AtsPlatform::Recruitee => {
            insert_generic_contact_resume_selectors(&mut selectors);
        }
        _ => {}
    }

    selectors
}
