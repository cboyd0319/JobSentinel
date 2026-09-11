//! Defines bounded, static regional starter data carried by signed region packs.

use std::collections::BTreeSet;

use chrono::NaiveDate;
use jobsentinel_security::{
    contains_review_required_invisible_control, validate_credential_free_external_https_url,
};
use serde::{Deserialize, Deserializer, Serialize};

use crate::{
    v3_contracts::parse_region_manifest,
    v3_manifests::{PackExecutionClass, PackType, PrivacyLabel, RegionManifest},
    v3_pack_payloads::{SelfTestedPackPayload, PACK_PAYLOAD_SCHEMA},
    v3_signed_packs::VerifiedPackRelease,
};

pub const REGION_STARTER_DATA_SCHEMA: &str = "jobsentinel.v3.region-starter-data.v1";

const MAX_ID_BYTES: usize = 64;
const MAX_LABEL_BYTES: usize = 256;
const MAX_NOTE_BYTES: usize = 512;
const MAX_URL_BYTES: usize = 2048;
const MAX_LIST_ENTRIES: usize = 16;
const MAX_MAPPINGS: usize = 64;
const MAX_PROFILES: usize = 8;
const MAX_SOURCE_NOTES: usize = 16;
const MAX_SERIALIZED_BYTES: usize = 64 * 1024;

/// A terminology mapping reviewed for one declared regional taxonomy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RegionTaxonomyMapping {
    pub taxonomy_id: String,
    pub source_code: String,
    pub source_label: String,
    pub canonical_term: String,
    pub mapping_type: RegionMappingType,
    pub confidence_note: String,
    pub provenance_url: String,
}

/// The relationship between a source entry and its canonical term.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RegionMappingType {
    Exact,
    Close,
    Broader,
    Narrower,
    RegionalSynonym,
}

/// Static CV guidance associated with one manifest-declared regional profile.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RegionCvProfile {
    pub profile_id: String,
    pub label: String,
    pub sections: Vec<String>,
    pub guidance: Vec<String>,
    pub provenance_urls: Vec<String>,
}

/// A reviewed public source note retained with starter data.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RegionSourceNote {
    pub source_id: String,
    pub label: String,
    pub url: String,
    pub access_note: String,
}

/// Signed, static starter data associated with a declared region manifest.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RegionStarterData {
    pub schema: String,
    pub region_id: String,
    pub reviewed_on: NaiveDate,
    pub taxonomy_mappings: Vec<RegionTaxonomyMapping>,
    pub cv_profiles: Vec<RegionCvProfile>,
    pub source_notes: Vec<RegionSourceNote>,
}

/// Backward-compatible flattened content for region-pack IPC projections.
#[derive(Debug, Clone, Serialize)]
pub struct RegionPackContent {
    #[serde(flatten)]
    pub manifest: RegionManifest,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub starter_data: Option<Box<RegionStarterData>>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct RegionPayloadV1 {
    schema: String,
    manifest_json: String,
    #[serde(default, deserialize_with = "deserialize_supplied_starter_data")]
    starter_data: Option<Box<RegionStarterData>>,
}

pub(crate) fn self_test_region(
    release: &VerifiedPackRelease,
    payload: RegionPayloadV1,
    today: NaiveDate,
) -> Result<SelfTestedPackPayload, String> {
    if payload.schema != PACK_PAYLOAD_SCHEMA
        || release.manifest.pack_type != PackType::Region
        || release.manifest.execution_class != PackExecutionClass::StaticContent
        || release.manifest.privacy_labels != [PrivacyLabel::LocalOnly]
        || !release.manifest.allowed_data_categories.is_empty()
        || !release.manifest.allowed_task_kinds.is_empty()
        || !release.manifest.allowed_actions.is_empty()
        || !release.manifest.approval_gates.is_empty()
        || release.manifest.gateway_policy_id.is_some()
        || !release.external_destinations.is_empty()
    {
        return Err("region pack self-test failed".to_string());
    }
    let manifest = parse_region_manifest(&payload.manifest_json, today)
        .map_err(|_| "region pack self-test failed".to_string())?;
    let starter_data = payload
        .starter_data
        .map(|starter_data| -> Result<_, String> {
            starter_data
                .validate(&manifest, today)
                .map_err(|_| "region pack self-test failed".to_string())?;
            Ok(starter_data)
        })
        .transpose()?;
    Ok(SelfTestedPackPayload::Region {
        manifest: Box::new(manifest),
        starter_data,
    })
}

/// Parses direct starter JSON and validates it against the signed region manifest.
pub fn parse_region_starter_data(
    input: &str,
    manifest: &RegionManifest,
    today: NaiveDate,
) -> Result<RegionStarterData, String> {
    if input.len() > MAX_SERIALIZED_BYTES {
        return Err("region starter data exceeds 64 KiB".to_string());
    }
    let starter_data: RegionStarterData =
        serde_json::from_str(input).map_err(|_| "region starter data is malformed".to_string())?;
    starter_data.validate(manifest, today)?;
    Ok(starter_data)
}

fn deserialize_supplied_starter_data<'de, D>(
    deserializer: D,
) -> Result<Option<Box<RegionStarterData>>, D::Error>
where
    D: Deserializer<'de>,
{
    Box::<RegionStarterData>::deserialize(deserializer).map(Some)
}

impl RegionStarterData {
    /// Validates static starter data without granting authority or inferring eligibility.
    pub fn validate(&self, manifest: &RegionManifest, today: NaiveDate) -> Result<(), String> {
        if self.schema != REGION_STARTER_DATA_SCHEMA
            || self.region_id != manifest.region_id
            || self.reviewed_on > today
        {
            return Err("region starter data is not bound to the signed region".to_string());
        }
        validate_text("starter region id", &self.region_id, MAX_ID_BYTES)?;
        validate_collection("taxonomy mappings", &self.taxonomy_mappings, MAX_MAPPINGS)?;
        validate_collection("CV profiles", &self.cv_profiles, MAX_PROFILES)?;
        validate_collection("source notes", &self.source_notes, MAX_SOURCE_NOTES)?;

        let mut mappings = BTreeSet::new();
        for mapping in &self.taxonomy_mappings {
            validate_mapping(mapping, manifest)?;
            if !mappings.insert((&mapping.taxonomy_id, &mapping.source_code)) {
                return Err("region starter taxonomy mappings must be unique".to_string());
            }
        }

        let mut profiles = BTreeSet::new();
        for profile in &self.cv_profiles {
            validate_profile(profile, manifest)?;
            if !profiles.insert(&profile.profile_id) {
                return Err("region starter CV profiles must be unique".to_string());
            }
        }

        let mut source_ids = BTreeSet::new();
        for source_note in &self.source_notes {
            validate_source_note(source_note)?;
            if !source_ids.insert(&source_note.source_id) {
                return Err("region starter source notes must be unique".to_string());
            }
        }

        if serde_json::to_vec(self)
            .map_err(|_| "region starter data could not be encoded".to_string())?
            .len()
            > MAX_SERIALIZED_BYTES
        {
            return Err("region starter data exceeds 64 KiB".to_string());
        }
        Ok(())
    }
}

fn validate_mapping(
    mapping: &RegionTaxonomyMapping,
    manifest: &RegionManifest,
) -> Result<(), String> {
    validate_text("taxonomy id", &mapping.taxonomy_id, MAX_ID_BYTES)?;
    validate_text("source code", &mapping.source_code, MAX_LABEL_BYTES)?;
    validate_text("source label", &mapping.source_label, MAX_LABEL_BYTES)?;
    validate_text("canonical term", &mapping.canonical_term, MAX_LABEL_BYTES)?;
    validate_text("confidence note", &mapping.confidence_note, MAX_NOTE_BYTES)?;
    validate_url("mapping provenance URL", &mapping.provenance_url)?;
    if !manifest.taxonomy_ids.contains(&mapping.taxonomy_id) {
        return Err("region starter taxonomy is not declared by the manifest".to_string());
    }
    Ok(())
}

fn validate_profile(profile: &RegionCvProfile, manifest: &RegionManifest) -> Result<(), String> {
    validate_text("CV profile id", &profile.profile_id, MAX_ID_BYTES)?;
    validate_text("CV profile label", &profile.label, MAX_LABEL_BYTES)?;
    validate_text_list("CV sections", &profile.sections)?;
    validate_text_list("CV guidance", &profile.guidance)?;
    validate_url_list("CV provenance URLs", &profile.provenance_urls)?;
    if !manifest.cv_profiles.contains(&profile.profile_id) {
        return Err("region starter CV profile is not declared by the manifest".to_string());
    }
    Ok(())
}

fn validate_source_note(source_note: &RegionSourceNote) -> Result<(), String> {
    validate_text("source id", &source_note.source_id, MAX_ID_BYTES)?;
    validate_text("source label", &source_note.label, MAX_LABEL_BYTES)?;
    validate_url("source URL", &source_note.url)?;
    validate_text(
        "source access note",
        &source_note.access_note,
        MAX_NOTE_BYTES,
    )
}

fn validate_collection<T>(name: &str, values: &[T], maximum: usize) -> Result<(), String> {
    if values.is_empty() || values.len() > maximum {
        return Err(format!(
            "region starter {name} must contain 1 through {maximum} entries"
        ));
    }
    Ok(())
}

fn validate_text_list(name: &str, values: &[String]) -> Result<(), String> {
    validate_collection(name, values, MAX_LIST_ENTRIES)?;
    values
        .iter()
        .try_for_each(|value| validate_text(name, value, MAX_NOTE_BYTES))
}

fn validate_url_list(name: &str, values: &[String]) -> Result<(), String> {
    validate_collection(name, values, MAX_LIST_ENTRIES)?;
    values
        .iter()
        .try_for_each(|value| validate_url(name, value))
}

fn validate_url(name: &str, value: &str) -> Result<(), String> {
    validate_text(name, value, MAX_URL_BYTES)?;
    validate_credential_free_external_https_url(value)
        .map(|_| ())
        .map_err(|_| format!("{name} must be credential-free HTTPS"))
}

fn validate_text(name: &str, value: &str, maximum: usize) -> Result<(), String> {
    if value.trim().is_empty() || value.len() > maximum || contains_forbidden_control(value) {
        return Err(format!("{name} is invalid"));
    }
    Ok(())
}

fn contains_forbidden_control(value: &str) -> bool {
    contains_review_required_invisible_control(value)
        || value.chars().any(|character| {
            character.is_control()
                || matches!(
                    character,
                    '\u{200C}'..='\u{200F}'
                        | '\u{202A}'..='\u{202E}'
                        | '\u{2066}'..='\u{206F}'
                        | '\u{FFF9}'..='\u{FFFB}'
                )
        })
}
