//! Defines bounded, source-preserving geography observations for a job.

use serde::{Deserialize, Serialize};

use crate::{normalization::contains_unsafe_source_control, normalize_country_code};

const MAX_RAW_LOCATION_BYTES: usize = 1024;
const MAX_RAW_COUNTRY_BYTES: usize = 256;
const MAX_CANONICAL_JSON_BYTES: usize = 65_536;

/// A source-observed country value with an optional confirmed ISO alpha-2 code.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CountryObservation {
    pub raw_country: String,
    pub alpha2: Option<String>,
}

/// A source-observed location with no inferred geography.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LocationObservation {
    pub raw_location: String,
    pub country: Option<CountryObservation>,
}

/// Bounded worksite and remote-applicant geography observed directly from a job source.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct JobGeography {
    pub worksite_locations: Vec<LocationObservation>,
    pub remote_applicant_locations: Vec<LocationObservation>,
}

impl JobGeography {
    /// Maximum observations retained for each distinct geographic role.
    pub const MAX_LOCATIONS_PER_KIND: usize = 16;

    /// Validates source-preserved job geography before persistence.
    pub fn validate(&self) -> Result<(), String> {
        let total = self.worksite_locations.len() + self.remote_applicant_locations.len();
        if total == 0 {
            return Err("Job geography requires at least one location observation".to_string());
        }
        if self.worksite_locations.len() > Self::MAX_LOCATIONS_PER_KIND
            || self.remote_applicant_locations.len() > Self::MAX_LOCATIONS_PER_KIND
        {
            return Err("Job geography allows at most 16 locations per kind".to_string());
        }

        self.worksite_locations
            .iter()
            .chain(&self.remote_applicant_locations)
            .try_for_each(LocationObservation::validate)
    }

    /// Encodes validated geography in the canonical persisted JSON representation.
    pub fn canonical_json(&self) -> Result<String, String> {
        self.validate()?;
        let json = serde_json::to_string(self)
            .map_err(|_| "Job geography could not be encoded".to_string())?;
        if json.len() > MAX_CANONICAL_JSON_BYTES {
            return Err("Job geography JSON exceeds 65536 UTF-8 bytes".to_string());
        }
        Ok(json)
    }

    /// Decodes and validates canonical persisted JSON without accepting malformed geography.
    pub fn from_canonical_json(json: &str) -> Result<Self, String> {
        if json.len() > MAX_CANONICAL_JSON_BYTES {
            return Err("Job geography JSON exceeds 65536 UTF-8 bytes".to_string());
        }
        let geography: Self = serde_json::from_str(json)
            .map_err(|_| "Job geography JSON is malformed".to_string())?;
        geography.validate()?;
        Ok(geography)
    }
}

impl LocationObservation {
    fn validate(&self) -> Result<(), String> {
        validate_raw_text(
            &self.raw_location,
            MAX_RAW_LOCATION_BYTES,
            "Job geography raw location",
        )?;
        self.country
            .as_ref()
            .map_or(Ok(()), CountryObservation::validate)
    }
}

impl CountryObservation {
    fn validate(&self) -> Result<(), String> {
        validate_raw_text(
            &self.raw_country,
            MAX_RAW_COUNTRY_BYTES,
            "Job geography raw country",
        )?;
        if let Some(alpha2) = &self.alpha2 {
            if normalize_country_code(&self.raw_country) != Some(alpha2.as_str()) {
                return Err("Job geography alpha2 must match its raw country".to_string());
            }
        }
        Ok(())
    }
}

fn validate_raw_text(value: &str, max_bytes: usize, field: &str) -> Result<(), String> {
    if value.trim().is_empty() || value.len() > max_bytes {
        return Err(format!(
            "{field} must be nonempty and at most {max_bytes} UTF-8 bytes"
        ));
    }
    if contains_unsafe_source_control(value) {
        return Err(format!("{field} contains a hidden control"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{CountryObservation, JobGeography, LocationObservation};

    fn observed_geography() -> JobGeography {
        JobGeography {
            worksite_locations: vec![LocationObservation {
                raw_location: "New York, NY".to_string(),
                country: Some(CountryObservation {
                    raw_country: "United States".to_string(),
                    alpha2: Some("US".to_string()),
                }),
            }],
            remote_applicant_locations: Vec::new(),
        }
    }

    #[test]
    fn canonical_json_round_trips_source_observations_without_inference() {
        let geography = observed_geography();
        let decoded =
            JobGeography::from_canonical_json(&geography.canonical_json().unwrap()).unwrap();

        assert_eq!(decoded, geography);
        let no_inference = JobGeography {
            worksite_locations: vec![LocationObservation {
                raw_location: "New York, USA".to_string(),
                country: None,
            }],
            remote_applicant_locations: Vec::new(),
        };
        assert!(no_inference.validate().is_ok());
    }

    #[test]
    fn validation_rejects_unbounded_controls_and_mismatched_country_codes() {
        let mut invalid = observed_geography();
        invalid.worksite_locations[0].raw_location = "\u{202e}".to_string();
        assert!(invalid.validate().is_err());

        let mut invalid = observed_geography();
        invalid.worksite_locations[0]
            .country
            .as_mut()
            .unwrap()
            .alpha2 = Some("CA".to_string());
        assert!(invalid.validate().is_err());

        let mut invalid = observed_geography();
        invalid.worksite_locations = vec![LocationObservation {
            raw_location: "x".repeat(1025),
            country: None,
        }];
        assert!(invalid.validate().is_err());

        let mut invalid = observed_geography();
        invalid.worksite_locations = vec![
            LocationObservation {
                raw_location: "Remote".to_string(),
                country: None,
            };
            17
        ];
        assert!(invalid.validate().is_err());

        assert!(JobGeography::from_canonical_json(&"x".repeat(65_537)).is_err());
        assert!(JobGeography::from_canonical_json(
            "{\"worksite_locations\":[],\"remote_applicant_locations\":[],\"inferred\":true}",
        )
        .is_err());
    }

    #[test]
    fn unknown_country_can_remain_unresolved() {
        let geography = JobGeography {
            worksite_locations: Vec::new(),
            remote_applicant_locations: vec![LocationObservation {
                raw_location: "Remote".to_string(),
                country: Some(CountryObservation {
                    raw_country: "United States".to_string(),
                    alpha2: None,
                }),
            }],
        };

        assert_eq!(geography.validate(), Ok(()));
    }
}
