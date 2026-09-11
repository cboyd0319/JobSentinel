//! Exercises Schema.org job-page parsing and conservative native-pay extraction.

use super::*;
use jobsentinel_domain::{CountryObservation, JobGeography, LocationObservation};
use serde_json::json;

fn parse_job(base_salary: serde_json::Value, salary_currency: Option<&str>) -> ParsedJobPage {
    let posting = json!({
        "@context": "https://schema.org", "@type": "JobPosting", "title": "Salary test role",
        "hiringOrganization": { "name": "Example employer" }, "baseSalary": base_salary,
        "salaryCurrency": salary_currency
    });
    parse_single_job_page(&format!(
        "<script type=\"application/ld+json\">{posting}</script>"
    ))
    .unwrap()
}

fn raw_only(parsed: ParsedJobPage) {
    let pay = parsed
        .listed_pay
        .as_ref()
        .expect("raw evidence is retained");
    assert_eq!((pay.min, pay.max), (None, None));
    assert_eq!(
        pay.period,
        jobsentinel_domain::v3_contracts::PayPeriod::NotDisclosed
    );
    assert_eq!((parsed.salary_min, parsed.salary_max), (None, None));
}

#[test]
fn parses_simple_job_posting() {
    let html = r#"<script type="application/ld+json">{
        "@context":"https://schema.org", "@type":"JobPosting", "title":"Customer Support Lead",
        "hiringOrganization":{"name":"Example Services"}}
    </script>"#;
    assert_eq!(
        parse_schema_org_job_posting(html).unwrap()[0]
            .title
            .as_deref(),
        Some("Customer Support Lead")
    );
}

#[test]
fn rejects_missing_schema_data() {
    assert!(matches!(
        parse_schema_org_job_posting("<html></html>"),
        Err(JobPageParseError::NoSchemaOrgData)
    ));
}

#[test]
fn formats_employment_types_and_html() {
    assert_eq!(format_employment_type("FULL_TIME"), "Full-time");
    assert_eq!(format_employment_type("CONTRACTOR"), "Contract");
    assert_eq!(format_employment_type("Unknown"), "Unknown");
    assert_eq!(
        strip_html_tags("<p>Hello <strong>world</strong>!</p>"),
        "Hello world !"
    );
}

#[test]
fn truncates_on_unicode_boundaries() {
    let truncated = truncate(&"é".repeat(501), 500);
    assert_eq!(truncated.chars().count(), 503);
    assert!(truncated.ends_with("..."));
}

#[test]
fn structured_monthly_eur_stays_native() {
    let parsed = parse_job(
        json!({"currency":"EUR", "value":{"minValue":3500, "maxValue":4200, "unitText":"MONTH"}}),
        None,
    );
    let pay = parsed.listed_pay.as_ref().unwrap();
    assert_eq!(
        (pay.min, pay.max, pay.currency.as_deref()),
        (Some(3500.0), Some(4200.0), Some("EUR"))
    );
    assert_eq!(
        pay.period,
        jobsentinel_domain::v3_contracts::PayPeriod::Monthly
    );
    assert_eq!((parsed.salary_min, parsed.salary_max), (None, None));
}

#[test]
fn nested_quantitative_usd_annual_is_comparable() {
    let parsed = parse_job(
        json!({"currency":"USD", "value":{"value":120000, "unitText":"YEAR"}}),
        Some("USD"),
    );
    assert_eq!(
        (parsed.salary_min, parsed.salary_max),
        (Some(120000), Some(120000))
    );
    let fractional = parse_job(
        json!({"currency":"USD", "value":{"minValue":100000.5, "maxValue":120000, "unitText":"YEAR"}}),
        Some("USD"),
    );
    assert_eq!(
        (fractional.salary_min, fractional.salary_max),
        (None, None),
        "a whole-dollar projection cannot discard only one fractional bound",
    );
}

#[test]
fn missing_currency_or_unit_is_unknown() {
    let parsed = parse_job(json!(120000), None);
    let pay = parsed.listed_pay.as_ref().unwrap();
    assert_eq!(pay.currency, None);
    assert_eq!(
        pay.period,
        jobsentinel_domain::v3_contracts::PayPeriod::NotDisclosed
    );
    assert_eq!((parsed.salary_min, parsed.salary_max), (None, None));
}

#[test]
fn regional_text_preserves_native_periods_and_qualifiers() {
    let uk = parse_job(json!("£450 per day pro rata"), None);
    let india = parse_job(json!("₹12 LPA CTC"), None);
    let stipend = parse_job(json!("INR 25,000 stipend"), None);
    let uk_pay = uk.listed_pay.as_ref().unwrap();
    assert_eq!(
        (
            uk_pay.currency.as_deref(),
            uk_pay.period,
            uk_pay.qualifiers.as_slice()
        ),
        (
            Some("GBP"),
            jobsentinel_domain::v3_contracts::PayPeriod::Daily,
            &[jobsentinel_domain::PayQualifier::ProRata][..]
        )
    );
    assert_eq!(uk_pay.raw_text.as_deref(), Some("£450 per day pro rata"));
    let india_pay = india.listed_pay.as_ref().unwrap();
    assert_eq!(
        (india_pay.min, india_pay.max, india_pay.currency.as_deref()),
        (Some(1_200_000.0), Some(1_200_000.0), Some("INR"))
    );
    assert_eq!(
        india_pay.qualifiers,
        vec![jobsentinel_domain::PayQualifier::Ctc]
    );
    assert_eq!(
        stipend.listed_pay.as_ref().unwrap().period,
        jobsentinel_domain::v3_contracts::PayPeriod::Stipend
    );
}

#[test]
fn explicit_non_eur_and_bare_dollar_remain_non_comparable() {
    let eur = parse_job(json!("EUR 3500 per month"), None);
    let chf = parse_job(json!("CHF 120,000 per year"), None);
    let dollar = parse_job(json!("$120,000 per year"), None);
    assert_eq!(
        eur.listed_pay.as_ref().unwrap().period,
        jobsentinel_domain::v3_contracts::PayPeriod::Monthly
    );
    assert_eq!(
        chf.listed_pay.as_ref().unwrap().currency.as_deref(),
        Some("CHF")
    );
    assert_eq!(dollar.listed_pay.as_ref().unwrap().currency, None);
    assert_eq!(
        (eur.salary_min, chf.salary_min, dollar.salary_min),
        (None, None, None)
    );
}

#[test]
fn conflicting_and_ambiguous_metadata_never_synthesizes_bounds() {
    let currency = parse_job(
        json!({"currency":"EUR", "value":{"value":5000, "unitText":"MONTH"}}),
        Some("USD"),
    );
    let units = parse_job(
        json!({"unitText":"YEAR", "value":{"value":5000, "unitText":"MONTH"}}),
        None,
    );
    let malformed = parse_job(
        json!({"currency":"EUR", "value":{"minValue":"3500", "maxValue":4200, "unitText":"MONTH"}}),
        None,
    );
    assert_eq!(
        (currency.listed_pay, units.listed_pay, malformed.listed_pay),
        (None, None, None)
    );
    raw_only(parse_job(json!("EUR 3,500 per month per year"), None));
    raw_only(parse_job(json!("EUR 3,500 per month"), None));
}

#[test]
fn invalid_amounts_and_qualified_usd_are_not_comparable() {
    for text in [
        "USD -1 per year",
        "USD 200,000-100,000 per year",
        "USD 9007199254740992 per year",
    ] {
        raw_only(parse_job(json!(text), None));
    }
    let ctc = parse_job(json!("USD 120,000 per year CTC"), None);
    assert_eq!((ctc.salary_min, ctc.salary_max), (None, None));
}

#[test]
fn partial_or_unknown_text_grammar_stays_raw_only() {
    for text in [
        "USD 50k per year",
        "USD 50 to 60 per hour",
        "USD 50-60,00 per hour",
        "INR 10,000-2,00,000 per month",
        "INR 50 helparate",
    ] {
        raw_only(parse_job(json!(text), None));
    }
}

#[test]
fn structured_metadata_rejects_conflicts_and_accepts_aliases() {
    let alias = parse_job(
        json!({"currency":"USD", "value":{"value":120000, "unitCode":"ANN"}}),
        None,
    );
    assert_eq!(
        (alias.salary_min, alias.salary_max),
        (Some(120000), Some(120000))
    );
    let conflicts = parse_job(
        json!({"currency":"USD", "value":{"value":120000, "unitText":"YEAR", "unitCode":"MON"}}),
        None,
    );
    assert_eq!(conflicts.listed_pay, None);
    let html = r#"<script type="application/ld+json">{
        "@context":"https://schema.org", "@type":"JobPosting", "title":"Malformed currency",
        "hiringOrganization":{"name":"Example employer"}, "salaryCurrency":123,
        "baseSalary":{"value":{"value":120000,"unitText":"YEAR"}}}</script>"#;
    assert_eq!(parse_single_job_page(html).unwrap().listed_pay, None);
}

fn format_address(address: serde_json::Value) -> Option<String> {
    let location = json!({ "address": address });
    format_location_object(location.as_object().unwrap())
}

#[test]
fn location_display_preserves_disclosed_regional_postal_codes() {
    for (address, expected) in [
        (
            json!({
                "addressLocality": "London", "addressRegion": "England",
                "addressCountry": "GB", "postalCode": "M1 1AE"
            }),
            Some("London, England, GB, M1 1AE"),
        ),
        (
            json!({
                "addressLocality": "Brno", "addressRegion": "South Moravian",
                "addressCountry": "CZ", "postalCode": "602 00"
            }),
            Some("Brno, South Moravian, CZ, 602 00"),
        ),
        (
            json!({
                "addressLocality": "Bengaluru", "addressRegion": "Karnataka",
                "addressCountry": "IN", "postalCode": "560001"
            }),
            Some("Bengaluru, Karnataka, IN, 560001"),
        ),
    ] {
        assert_eq!(format_address(address).as_deref(), expected);
    }
}

#[test]
fn location_display_keeps_existing_parts_and_allows_postal_code_only() {
    assert_eq!(
        format_address(json!({
            "addressLocality": "Leeds", "addressRegion": "England", "addressCountry": "GB"
        }))
        .as_deref(),
        Some("Leeds, England, GB")
    );
    assert_eq!(
        format_address(json!({ "postalCode": "560001" })).as_deref(),
        Some("560001")
    );
}

fn parse_geography_job(
    job_location: serde_json::Value,
    applicant_location_requirements: serde_json::Value,
) -> ParsedJobPage {
    let posting = json!({
        "@context": "https://schema.org", "@type": "JobPosting", "title": "Regional role",
        "hiringOrganization": {"name": "Example"}, "jobLocation": job_location,
        "applicantLocationRequirements": applicant_location_requirements,
    });
    parse_single_job_page(&format!(
        r#"<script type="application/ld+json">{posting}</script>"#
    ))
    .unwrap()
}

fn country(raw_country: &str, alpha2: Option<&str>) -> CountryObservation {
    CountryObservation {
        raw_country: raw_country.to_string(),
        alpha2: alpha2.map(str::to_string),
    }
}

#[test]
fn parser_separates_explicit_worksites_from_remote_applicant_locations() {
    let parsed = parse_geography_job(
        json!([
            {"address": {"addressLocality": "New York", "addressRegion": "NY",
                "addressCountry": {"@type": "Country", "name": "United States"}}},
            {"address": {"addressLocality": "London", "addressCountry": "GB"}},
        ]),
        json!([
            {"@type": "Country", "name": "United Kingdom"},
            {"@type": "AdministrativeArea", "name": "California"},
        ]),
    );

    assert_eq!(parsed.location.as_deref(), Some("New York, NY"));
    assert_eq!(
        parsed.geography,
        Some(JobGeography {
            worksite_locations: vec![
                LocationObservation {
                    raw_location: "New York, NY".to_string(),
                    country: Some(country("United States", Some("US"))),
                },
                LocationObservation {
                    raw_location: "London, GB".to_string(),
                    country: Some(country("GB", Some("GB"))),
                },
            ],
            remote_applicant_locations: vec![
                LocationObservation {
                    raw_location: "United Kingdom".to_string(),
                    country: Some(country("United Kingdom", Some("GB"))),
                },
                LocationObservation {
                    raw_location: "California".to_string(),
                    country: None,
                },
            ],
        })
    );
}

#[test]
fn parser_keeps_explicit_unknown_geography_raw_without_country_inference() {
    let parsed = parse_geography_job(
        json!({"address": {"addressLocality": "Sacramento", "addressCountry": "California"}}),
        json!({"@type": "AdministrativeArea", "name": "California"}),
    );

    assert_eq!(
        parsed.geography,
        Some(JobGeography {
            worksite_locations: vec![LocationObservation {
                raw_location: "Sacramento, California".to_string(),
                country: Some(country("California", None)),
            }],
            remote_applicant_locations: vec![LocationObservation {
                raw_location: "California".to_string(),
                country: None,
            }],
        })
    );
}

#[test]
fn parser_rejects_oversized_geography_without_partial_observations() {
    let parsed = parse_geography_job(
        serde_json::Value::Array(
            (0..17)
                .map(|index| json!({"address": {"addressLocality": format!("City {index}")}}))
                .collect(),
        ),
        serde_json::Value::Null,
    );

    assert_eq!(parsed.geography, None);
}

#[test]
fn parser_retains_named_worksites_and_unknown_applicant_areas() {
    let parsed = parse_geography_job(
        json!({"@type": "Place", "name": "London office"}),
        json!([
            {"@type": "Country", "name": "GB"},
            {"@type": "State", "name": "California"},
            {"@type": "City", "name": "Toronto"},
            {"name": "Unspecified area"}
        ]),
    );
    let geography = parsed
        .geography
        .expect("named places must not erase country evidence");
    assert_eq!(parsed.location.as_deref(), Some("London office"));
    assert_eq!(
        geography.worksite_locations[0].raw_location,
        "London office"
    );
    assert_eq!(geography.worksite_locations[0].country, None);
    assert_eq!(
        geography.remote_applicant_locations[0].country,
        Some(country("GB", Some("GB")))
    );
    for (observation, expected) in geography.remote_applicant_locations[1..].iter().zip([
        "California",
        "Toronto",
        "Unspecified area",
    ]) {
        assert_eq!(observation.raw_location, expected);
        assert_eq!(observation.country, None);
    }
}

#[test]
fn parser_applies_the_encoded_geography_budget_before_import() {
    let mut worksites = vec![json!({"address": {"addressCountry": "GB"}})];
    worksites.extend((0..15).map(|_| {
        json!({"address": {
            "addressLocality": "\"".repeat(766), "addressCountry": "\"".repeat(256)
        }})
    }));
    let areas = (0..16)
        .map(|_| {
            json!({
                "@type": "AdministrativeArea", "name": "\"".repeat(1024)
            })
        })
        .collect::<Vec<_>>();
    let parsed = parse_geography_job(json!(worksites), json!(areas));

    assert_eq!(parsed.location.as_deref(), Some("GB"));
    assert!(
        parsed.geography.is_none(),
        "oversized canonical JSON must not enter a pending import"
    );
}

#[test]
fn parser_retains_text_addresses_and_missing_country_metadata() {
    for (location, raw, code) in [
        (json!({"address": "London, GB"}), "London, GB", None),
        (
            json!({"address": {"addressLocality": "London", "addressCountry": null}}),
            "London",
            None,
        ),
        (
            json!({"address": {"addressCountry": {"name": "GB"}}}),
            "GB",
            Some("GB"),
        ),
    ] {
        let parsed = parse_geography_job(location, json!({"@type": "Country", "name": "GB"}));
        let geography = parsed
            .geography
            .expect("missing structured details remain unknown");
        assert_eq!(geography.worksite_locations[0].raw_location, raw);
        assert_eq!(
            geography.worksite_locations[0]
                .country
                .as_ref()
                .and_then(|value| value.alpha2.as_deref()),
            code
        );
        assert_eq!(
            geography.remote_applicant_locations[0].country,
            Some(country("GB", Some("GB")))
        );
    }
}
