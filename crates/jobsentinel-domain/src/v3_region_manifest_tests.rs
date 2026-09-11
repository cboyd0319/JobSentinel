//! Proves incomplete regional research manifests remain static local pack metadata.

use std::collections::BTreeSet;

use crate::{
    parse_region_starter_data, parse_v3_evaluation_set,
    v3_contracts::{parse_region_manifest, PayPeriod},
    v3_manifests::{
        AgentTaskKind, ApprovalGate, DataCategory, PackAction, PackExecutionClass, PackType,
        PrivacyLabel, SourceClass,
    },
    v3_pack_payload_tests::release,
    v3_pack_payloads::{parse_and_self_test_pack_payload, SelfTestedPackPayload},
    RegionPackContent,
};
use chrono::NaiveDate;
use serde_json::json;

const UK: &str = include_str!("fixtures/region_manifests/uk_v1.json");
const EU: &str = include_str!("fixtures/region_manifests/eu_v1.json");
const INDIA: &str = include_str!("fixtures/region_manifests/india_v1.json");
const EVALUATIONS: &str = include_str!("fixtures/v3_evaluation_set_v1.json");
const CONTRACT_BASELINE: &str = include_str!("fixtures/v3_contract_bundle_v1.json");

fn region_payload() -> String {
    serde_json::to_string(&json!({
        "schema": "jobsentinel.v3.pack-payload.v1",
        "pack_type": "region",
        "manifest_json": UK
    }))
    .unwrap()
}

fn region_payload_with_starter_data() -> String {
    serde_json::to_string(&json!({
        "schema": "jobsentinel.v3.pack-payload.v1",
        "pack_type": "region",
        "manifest_json": UK,
        "starter_data": {
            "schema": "jobsentinel.v3.region-starter-data.v1",
            "region_id": "uk",
            "reviewed_on": "2026-09-11",
            "taxonomy_mappings": [{
                "taxonomy_id": "uk_soc_2020_research",
                "source_code": "1111",
                "source_label": "Synthetic source label",
                "canonical_term": "Synthetic canonical term",
                "mapping_type": "exact",
                "confidence_note": "Reviewed terminology alignment.",
                "provenance_url": "https://www.ons.gov.uk/"
            }],
            "cv_profiles": [{
                "profile_id": "uk_cv_research",
                "label": "Synthetic CV profile",
                "sections": ["Experience"],
                "guidance": ["Describe relevant outcomes."],
                "provenance_urls": ["https://www.gov.uk/"]
            }],
            "source_notes": [{
                "source_id": "synthetic-uk-source",
                "label": "Synthetic source",
                "url": "https://www.gov.uk/",
                "access_note": "Public reference reviewed for this static pack."
            }]
        }
    }))
    .unwrap()
}

fn today() -> NaiveDate {
    NaiveDate::from_ymd_opt(2026, 7, 19).unwrap()
}

fn parse(input: &str) -> crate::v3_manifests::RegionManifest {
    parse_region_manifest(input, today()).unwrap()
}

#[test]
fn starter_regions_are_incomplete_metadata_without_native_source_claims() {
    for (input, region_id) in [(UK, "uk"), (EU, "eu"), (INDIA, "india")] {
        let manifest = parse(input);

        assert_eq!(manifest.region_id, region_id);
        assert_eq!(manifest.reviewed_on, today());
        assert!(manifest.incomplete_coverage);
        assert_eq!(
            manifest.source_classes,
            [SourceClass::RegionalBoard, SourceClass::UserImport]
        );
        assert!(manifest
            .policy_note_refs
            .iter()
            .any(|reference| reference == "docs/plans/v3/regional-readiness-framework.md"));
        assert!(manifest.provenance_refs.iter().any(|reference| reference
            .strip_prefix("https://")
            .is_some_and(|path| !path.is_empty())));
    }
}

#[test]
fn starter_regions_declare_research_profiles_and_pay_semantics() {
    let uk = parse(UK);
    assert_eq!(uk.country_codes, ["GB"]);
    assert_eq!(uk.languages, ["en"]);
    assert_eq!(uk.currencies, ["GBP"]);
    assert!(uk.pay_periods.contains(&PayPeriod::Daily));
    assert!(uk.pay_periods.contains(&PayPeriod::NotDisclosed));
    assert_eq!(uk.cv_profiles, ["uk_cv_research"]);
    assert_eq!(uk.taxonomy_ids, ["uk_soc_2020_research"]);

    let eu = parse(EU);
    assert_eq!(
        eu.country_codes,
        [
            "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
            "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"
        ]
    );
    assert_eq!(
        eu.country_codes.iter().collect::<BTreeSet<_>>().len(),
        eu.country_codes.len()
    );
    assert_eq!(eu.languages, ["en"]);
    assert_eq!(
        eu.currencies,
        ["EUR", "CZK", "DKK", "HUF", "PLN", "RON", "SEK"]
    );
    assert_eq!(eu.cv_profiles, ["europass_cv_research"]);
    assert_eq!(eu.taxonomy_ids, ["esco_research"]);

    let india = parse(INDIA);
    assert_eq!(india.country_codes, ["IN"]);
    assert_eq!(india.languages, ["en"]);
    assert_eq!(india.currencies, ["INR"]);
    assert!(india.pay_periods.contains(&PayPeriod::Stipend));
    assert!(india.pay_periods.contains(&PayPeriod::NotDisclosed));
    assert_eq!(india.cv_profiles, ["india_cv_research"]);
    assert_eq!(
        india.taxonomy_ids,
        ["india_nco_2015_research", "india_nsqf_nos_research"]
    );
}

#[test]
fn starter_regions_reference_real_frozen_evaluations() {
    let evaluation_ids = parse_v3_evaluation_set(EVALUATIONS)
        .unwrap()
        .cases
        .into_iter()
        .map(|case| case.id)
        .collect::<BTreeSet<_>>();

    for input in [UK, EU, INDIA] {
        let manifest = parse(input);
        assert!(manifest
            .evaluation_fixture_ids
            .iter()
            .all(|id| evaluation_ids.contains(id)));
    }

    let baseline: serde_json::Value = serde_json::from_str(CONTRACT_BASELINE).unwrap();
    let us = parse_region_manifest(&baseline["region_manifest"].to_string(), today()).unwrap();
    assert_eq!(us.reviewed_on, today());
    assert!(us
        .evaluation_fixture_ids
        .iter()
        .all(|id| evaluation_ids.contains(id)));
}

#[test]
fn starter_regions_reject_future_reviews_and_missing_provenance() {
    let mut future: serde_json::Value = serde_json::from_str(UK).unwrap();
    future["reviewed_on"] = json!("2026-07-20");
    assert!(parse_region_manifest(&future.to_string(), today()).is_err());

    let mut missing: serde_json::Value = serde_json::from_str(UK).unwrap();
    missing["provenance_refs"] = json!([]);
    assert!(parse_region_manifest(&missing.to_string(), today()).is_err());

    for invalid in [
        "",
        "http://example.com/research",
        "https:///research",
        "https://user:secret@example.com/research",
    ] {
        let mut unsafe_ref: serde_json::Value = serde_json::from_str(UK).unwrap();
        unsafe_ref["provenance_refs"] = json!([invalid]);
        assert!(
            parse_region_manifest(&unsafe_ref.to_string(), today()).is_err(),
            "{invalid} must fail closed"
        );
    }
}

#[test]
fn region_pack_self_test_retains_only_incomplete_local_research_metadata() {
    let tested = parse_and_self_test_pack_payload(
        &release(region_payload(), PackType::Region),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .unwrap()
    .into_payload();

    let SelfTestedPackPayload::Region {
        manifest,
        starter_data,
    } = tested
    else {
        panic!("region payload must remain local research metadata");
    };
    assert_eq!(manifest.region_id, "uk");
    assert!(manifest.incomplete_coverage);
    assert_eq!(manifest.reviewed_on, today());
    assert!(starter_data.is_none());
}

#[test]
fn region_pack_accepts_valid_signed_starter_data() {
    let tested = parse_and_self_test_pack_payload(
        &release(region_payload_with_starter_data(), PackType::Region),
        NaiveDate::from_ymd_opt(2026, 9, 11).unwrap(),
    )
    .unwrap()
    .into_payload();

    let SelfTestedPackPayload::Region {
        manifest,
        starter_data,
    } = tested
    else {
        panic!("region payload must remain local research metadata");
    };
    assert_eq!(manifest.region_id, "uk");
    assert_eq!(starter_data.as_ref().unwrap().taxonomy_mappings.len(), 1);
    let content = RegionPackContent {
        manifest: *manifest,
        starter_data,
    };
    let content = serde_json::to_value(content).unwrap();
    assert_eq!(content["region_id"], "uk");
    assert_eq!(content["starter_data"]["reviewed_on"], "2026-09-11");
}

#[test]
fn region_pack_rejects_mismatched_or_invalid_starter_data() {
    let mut mismatched_region: serde_json::Value =
        serde_json::from_str(&region_payload_with_starter_data()).unwrap();
    mismatched_region["starter_data"]["region_id"] = json!("eu");
    let mut unknown_taxonomy: serde_json::Value =
        serde_json::from_str(&region_payload_with_starter_data()).unwrap();
    unknown_taxonomy["starter_data"]["taxonomy_mappings"][0]["taxonomy_id"] = json!("not-declared");
    let mut future_review: serde_json::Value =
        serde_json::from_str(&region_payload_with_starter_data()).unwrap();
    future_review["starter_data"]["reviewed_on"] = json!("2026-09-12");
    let mut hidden_control: serde_json::Value =
        serde_json::from_str(&region_payload_with_starter_data()).unwrap();
    hidden_control["starter_data"]["source_notes"][0]["label"] = json!("bad\u{200b}label");
    let mut unknown_nested_field: serde_json::Value =
        serde_json::from_str(&region_payload_with_starter_data()).unwrap();
    unknown_nested_field["starter_data"]["taxonomy_mappings"][0]["unexpected"] = json!(true);

    for invalid in [
        mismatched_region,
        unknown_taxonomy,
        future_review,
        hidden_control,
        unknown_nested_field,
    ] {
        let release = release(serde_json::to_string(&invalid).unwrap(), PackType::Region);
        assert!(parse_and_self_test_pack_payload(
            &release,
            NaiveDate::from_ymd_opt(2026, 9, 11).unwrap(),
        )
        .is_err());
    }
}

#[test]
fn region_pack_rejects_explicit_null_starter_data_and_oversized_direct_input() {
    let mut explicit_null: serde_json::Value = serde_json::from_str(&region_payload()).unwrap();
    explicit_null["starter_data"] = serde_json::Value::Null;
    let release = release(
        serde_json::to_string(&explicit_null).unwrap(),
        PackType::Region,
    );
    assert!(parse_and_self_test_pack_payload(
        &release,
        NaiveDate::from_ymd_opt(2026, 9, 11).unwrap(),
    )
    .is_err());

    let starter_data: serde_json::Value =
        serde_json::from_str(&region_payload_with_starter_data()).unwrap();
    let oversized = format!(
        "{}{}",
        " ".repeat(64 * 1024 + 1),
        starter_data["starter_data"]
    );
    assert!(parse_region_starter_data(
        &oversized,
        &parse(UK),
        NaiveDate::from_ymd_opt(2026, 9, 11).unwrap(),
    )
    .is_err());
}

#[test]
fn region_pack_rejects_authority_escalation_future_and_malformed_metadata() {
    let mut future: serde_json::Value = serde_json::from_str(&region_payload()).unwrap();
    future["manifest_json"] = json!(UK.replace("2026-07-19", "2026-07-21"));
    let mut embedded_authority: serde_json::Value =
        serde_json::from_str(&region_payload()).unwrap();
    let mut manifest: serde_json::Value = serde_json::from_str(UK).unwrap();
    manifest["allowed_actions"] = json!(["open_browser_link"]);
    embedded_authority["manifest_json"] = json!(manifest.to_string());
    let mut malformed: serde_json::Value = serde_json::from_str(&region_payload()).unwrap();
    malformed["manifest_json"] = json!("{");

    let mut private_data = release(region_payload(), PackType::Region);
    private_data.manifest.allowed_data_categories = vec![DataCategory::ResumeEvidence];
    let mut task = release(region_payload(), PackType::Region);
    task.manifest.allowed_task_kinds = vec![AgentTaskKind::EvidenceReview];
    let mut action = release(region_payload(), PackType::Region);
    action.manifest.allowed_actions = vec![PackAction::OpenBrowserLink];
    let mut approval = release(region_payload(), PackType::Region);
    approval.manifest.approval_gates = vec![ApprovalGate::PerExecutionReview];
    let mut gateway = release(region_payload(), PackType::Region);
    gateway.manifest.gateway_policy_id = Some("jobsentinel.external-ai-gateway.v1".to_string());
    let mut external = release(region_payload(), PackType::Region);
    external.external_destinations = vec!["jobsentinel.external-ai-gateway.v1".to_string()];
    let mut non_local = release(region_payload(), PackType::Region);
    non_local.manifest.privacy_labels = vec![PrivacyLabel::LocalOnly, PrivacyLabel::Sensitive];
    let mut workflow = release(region_payload(), PackType::Region);
    workflow.manifest.execution_class = PackExecutionClass::ReviewedTypedWorkflow;

    for invalid in [
        release(serde_json::to_string(&future).unwrap(), PackType::Region),
        release(
            serde_json::to_string(&embedded_authority).unwrap(),
            PackType::Region,
        ),
        release(serde_json::to_string(&malformed).unwrap(), PackType::Region),
        private_data,
        task,
        action,
        approval,
        gateway,
        external,
        non_local,
        workflow,
        release(region_payload(), PackType::Source),
    ] {
        assert!(parse_and_self_test_pack_payload(&invalid, today()).is_err());
    }
}
