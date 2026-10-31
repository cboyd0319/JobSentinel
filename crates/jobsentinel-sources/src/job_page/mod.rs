//! Parses Schema.org JobPosting JSON-LD into import-preview data.

mod salary;
#[cfg(test)]
mod tests;
mod types;

pub use types::{JobPageParseError, ParsedJobPage};

use self::{salary::parse_schema_org_salary, types::SchemaOrgJobPosting};
use chrono::{DateTime, Utc};
use jobsentinel_domain::{
    normalize_country_code, CountryObservation, JobGeography, LocationObservation,
};
use scraper::{Html, Selector};

/// Parse exactly one Schema.org JobPosting from a page.
pub fn parse_single_job_page(html: &str) -> Result<ParsedJobPage, JobPageParseError> {
    let mut postings = parse_schema_org_job_posting(html)?;
    if postings.len() != 1 {
        return Err(JobPageParseError::MultipleJobPostings(postings.len()));
    }
    Ok(create_parsed_job_page(&postings.remove(0)))
}

/// Parses all Schema.org JobPosting JSON-LD objects on a page.
fn parse_schema_org_job_posting(html: &str) -> Result<Vec<SchemaOrgJobPosting>, JobPageParseError> {
    let document = Html::parse_document(html);
    let script_selector = Selector::parse("script[type='application/ld+json']")
        .map_err(|error| JobPageParseError::HtmlParseError(format!("{error:?}")))?;
    let mut job_postings = Vec::new();

    for script in document.select(&script_selector) {
        let json_value = match serde_json::from_str(&script.inner_html()) {
            Ok(value) => value,
            Err(error) => {
                tracing::debug!(
                    line = error.line(),
                    column = error.column(),
                    "Skipping invalid JSON-LD script tag"
                );
                continue;
            }
        };
        extract_job_postings(&json_value, &mut job_postings);
    }
    if job_postings.is_empty() {
        return Err(JobPageParseError::NoSchemaOrgData);
    }
    tracing::info!(count = job_postings.len(), "Found JobPosting objects");
    Ok(job_postings)
}

/// Extracts JobPosting objects from direct, array, and graph JSON-LD forms.
fn extract_job_postings(value: &serde_json::Value, output: &mut Vec<SchemaOrgJobPosting>) {
    match value {
        serde_json::Value::Object(object) => {
            if object.get("@type").is_some_and(is_job_posting_type) {
                if let Ok(posting) = serde_json::from_value(value.clone()) {
                    output.push(posting);
                    return;
                }
            }
            if let Some(graph) = object.get("@graph") {
                extract_job_postings(graph, output);
            }
        }
        serde_json::Value::Array(values) => {
            for value in values {
                extract_job_postings(value, output);
            }
        }
        _ => {}
    }
}

/// Returns whether a JSON-LD type declares JobPosting.
fn is_job_posting_type(type_value: &serde_json::Value) -> bool {
    match type_value {
        serde_json::Value::String(value) => value == "JobPosting",
        serde_json::Value::Array(values) => values
            .iter()
            .any(|value| value.as_str() == Some("JobPosting")),
        _ => false,
    }
}

/// Converts one decoded Schema.org JobPosting into an import preview.
fn create_parsed_job_page(posting: &SchemaOrgJobPosting) -> ParsedJobPage {
    let mut missing_fields = Vec::new();
    let title = required_text(&posting.title, "title", &mut missing_fields);
    let company = match &posting.hiring_organization {
        Some(organization) => {
            required_text(&organization.name, "company name", &mut missing_fields)
        }
        None => {
            missing_fields.push("company".to_string());
            String::new()
        }
    };
    let location = extract_location(&posting.job_location);
    let geography = extract_geography(
        &posting.job_location,
        &posting.applicant_location_requirements,
    );
    let description_preview = posting.description.as_ref().and_then(|description| {
        let stripped = strip_html_tags(description);
        (!stripped.is_empty()).then(|| truncate(&stripped, 500))
    });
    let listed_pay =
        parse_schema_org_salary(&posting.base_salary, posting.salary_currency.as_ref());
    let salary = listed_pay
        .as_ref()
        .and_then(|pay| pay.raw_text.clone().or_else(|| pay.format_amounts()));
    let (salary_min, salary_max) = listed_pay.as_ref().map_or(
        (None, None),
        jobsentinel_domain::ListedPay::usd_annual_integer_bounds,
    );
    let currency = listed_pay.as_ref().and_then(|pay| pay.currency.clone());

    ParsedJobPage {
        title,
        company,
        location,
        geography,
        description: posting
            .description
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string),
        description_preview,
        salary,
        listed_pay,
        salary_min,
        salary_max,
        currency,
        date_posted: parse_date(&posting.date_posted),
        valid_through: parse_date(&posting.valid_through),
        employment_types: extract_employment_types(&posting.employment_type),
        remote: posting.job_location_type.as_deref() == Some("TELECOMMUTE"),
        missing_fields,
    }
}

fn required_text(value: &Option<String>, name: &str, missing_fields: &mut Vec<String>) -> String {
    match value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(value) => value.to_string(),
        None => {
            missing_fields.push(name.to_string());
            String::new()
        }
    }
}

fn parse_date(value: &Option<String>) -> Option<DateTime<Utc>> {
    value
        .as_deref()
        .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
        .map(|date| date.with_timezone(&Utc))
}

/// Extracts a display location from one Schema.org JobLocation value.
fn extract_location(job_location: &Option<serde_json::Value>) -> Option<String> {
    let location = job_location.as_ref()?;
    if let Some(object) = location.as_object() {
        return format_location_object(object);
    }
    location
        .as_array()?
        .first()?
        .as_object()
        .and_then(format_location_object)
}

/// Formats a Schema.org location or postal address object.
fn format_location_object(object: &serde_json::Map<String, serde_json::Value>) -> Option<String> {
    if let Some(address) = object.get("address").and_then(serde_json::Value::as_object) {
        let parts = [
            "addressLocality",
            "addressRegion",
            "addressCountry",
            "postalCode",
        ]
        .into_iter()
        .filter_map(|name| address.get(name).and_then(serde_json::Value::as_str))
        .collect::<Vec<_>>();
        if !parts.is_empty() {
            return Some(parts.join(", "));
        }
    }
    object
        .get("name")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
}

fn extract_geography(
    job_location: &Option<serde_json::Value>,
    applicant_location_requirements: &Option<serde_json::Value>,
) -> Option<JobGeography> {
    let worksites = location_objects(job_location)?
        .into_iter()
        .map(worksite_location_observation)
        .collect::<Option<Vec<_>>>()?;
    let applicant_locations = location_objects(applicant_location_requirements)?
        .into_iter()
        .map(applicant_location_observation)
        .collect::<Option<Vec<_>>>()?;
    let geography = JobGeography {
        worksite_locations: worksites,
        remote_applicant_locations: applicant_locations,
    };
    (!geography.worksite_locations.is_empty() || !geography.remote_applicant_locations.is_empty())
        .then_some(geography)
        .filter(|value| value.canonical_json().is_ok())
}

fn location_objects(
    value: &Option<serde_json::Value>,
) -> Option<Vec<&serde_json::Map<String, serde_json::Value>>> {
    match value.as_ref() {
        None | Some(serde_json::Value::Null) => Some(Vec::new()),
        Some(serde_json::Value::Object(object)) => Some(vec![object]),
        Some(serde_json::Value::Array(values))
            if values.len() <= JobGeography::MAX_LOCATIONS_PER_KIND =>
        {
            values.iter().map(serde_json::Value::as_object).collect()
        }
        _ => None,
    }
}

fn worksite_location_observation(
    object: &serde_json::Map<String, serde_json::Value>,
) -> Option<LocationObservation> {
    let country = match object.get("address") {
        Some(serde_json::Value::Object(address)) => {
            address_country_observation(address.get("addressCountry")).ok()?
        }
        None | Some(serde_json::Value::String(_) | serde_json::Value::Null) => None,
        _ => return None,
    };
    let raw_location = object
        .get("address")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .or_else(|| format_location_object(object))
        .or_else(|| country.as_ref().map(|country| country.raw_country.clone()))?;
    Some(LocationObservation {
        raw_location,
        country,
    })
}

fn applicant_location_observation(
    object: &serde_json::Map<String, serde_json::Value>,
) -> Option<LocationObservation> {
    let location_type = object.get("@type");
    let raw_location = object.get("name")?.as_str()?;
    let country = if location_type.is_some_and(|kind| has_schema_type(kind, "Country")) {
        Some(country_observation(raw_location)?)
    } else if location_type.is_none_or(|kind| {
        ["AdministrativeArea", "State", "City"]
            .iter()
            .any(|name| has_schema_type(kind, name))
    }) {
        None
    } else {
        return None;
    };
    Some(LocationObservation {
        raw_location: raw_location.to_string(),
        country,
    })
}

fn address_country_observation(
    value: Option<&serde_json::Value>,
) -> Result<Option<CountryObservation>, ()> {
    let Some(value) = value.filter(|value| !value.is_null()) else {
        return Ok(None);
    };
    let raw_country = match value {
        serde_json::Value::String(value) => value.as_str(),
        serde_json::Value::Object(object)
            if object
                .get("@type")
                .is_none_or(|value| has_schema_type(value, "Country")) =>
        {
            object
                .get("name")
                .and_then(serde_json::Value::as_str)
                .ok_or(())?
        }
        _ => return Err(()),
    };
    Ok(Some(country_observation(raw_country).ok_or(())?))
}

fn country_observation(raw_country: &str) -> Option<CountryObservation> {
    (!raw_country.trim().is_empty()).then(|| CountryObservation {
        raw_country: raw_country.to_string(),
        alpha2: normalize_country_code(raw_country).map(str::to_string),
    })
}

fn has_schema_type(value: &serde_json::Value, expected: &str) -> bool {
    match value {
        serde_json::Value::String(value) => value == expected,
        serde_json::Value::Array(values) => {
            values.iter().any(|value| value.as_str() == Some(expected))
        }
        _ => false,
    }
}

/// Extracts one or more Schema.org employment-type values.
fn extract_employment_types(employment_type: &Option<serde_json::Value>) -> Vec<String> {
    let Some(value) = employment_type else {
        return Vec::new();
    };
    if let Some(value) = value.as_str() {
        return vec![format_employment_type(value)];
    }
    value.as_array().map_or_else(Vec::new, |values| {
        values
            .iter()
            .filter_map(|value| value.as_str().map(format_employment_type))
            .collect()
    })
}

/// Formats canonical Schema.org employment-type constants for preview display.
fn format_employment_type(value: &str) -> String {
    match value {
        "FULL_TIME" => "Full-time",
        "PART_TIME" => "Part-time",
        "CONTRACTOR" => "Contract",
        "TEMPORARY" => "Temporary",
        "INTERN" => "Internship",
        "VOLUNTEER" => "Volunteer",
        "PER_DIEM" => "Per Diem",
        "OTHER" => "Other",
        _ => value,
    }
    .to_string()
}

/// Strips markup while retaining human-readable whitespace.
fn strip_html_tags(html: &str) -> String {
    Html::parse_fragment(html)
        .root_element()
        .text()
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Truncates a string at a character boundary and appends an ellipsis marker.
fn truncate(value: &str, max_len: usize) -> String {
    let mut characters = value.chars();
    let preview = characters.by_ref().take(max_len).collect::<String>();
    if characters.next().is_none() {
        preview
    } else {
        format!("{preview}...")
    }
}
