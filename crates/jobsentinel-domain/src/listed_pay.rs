//! Defines native listed-pay evidence and its conservative comparison boundary.

use serde::{Deserialize, Serialize};

use crate::{normalization::contains_unsafe_source_control, v3_contracts};

const MAX_EXACT_INTEGER: f64 = 9_007_199_254_740_991.0;
const MAX_RAW_TEXT_BYTES: usize = 1024;
const MAX_CANONICAL_JSON_BYTES: usize = 4096;

/// A qualifier that prevents treating a listed amount as ordinary base pay.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Ord, PartialOrd, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PayQualifier {
    Ctc,
    ProRata,
    Stipend,
}

/// Native pay evidence exactly as published by a job source.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ListedPay {
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub currency: Option<String>,
    pub period: v3_contracts::PayPeriod,
    pub qualifiers: Vec<PayQualifier>,
    pub raw_text: Option<String>,
}

impl ListedPay {
    /// Validates bounded native pay evidence before it is persisted or compared.
    pub fn validate(&self) -> Result<(), String> {
        for amount in [self.min, self.max].into_iter().flatten() {
            if !amount.is_finite() || !(0.0..=MAX_EXACT_INTEGER).contains(&amount) {
                return Err(
                    "Listed pay amount must be finite and within the exact integer range"
                        .to_string(),
                );
            }
        }

        if self.min.zip(self.max).is_some_and(|(min, max)| min > max) {
            return Err("Listed pay minimum cannot exceed maximum".to_string());
        }

        if let Some(currency) = &self.currency {
            if currency.len() != 3 || !currency.bytes().all(|byte| byte.is_ascii_uppercase()) {
                return Err(
                    "Listed pay currency must be a three-letter uppercase ASCII code".to_string(),
                );
            }
        }

        if self.qualifiers.len() > 3 || !qualifiers_are_unique(&self.qualifiers) {
            return Err(
                "Listed pay qualifiers must contain at most three unique values".to_string(),
            );
        }

        if let Some(raw_text) = &self.raw_text {
            if raw_text.trim().is_empty() || raw_text.len() > MAX_RAW_TEXT_BYTES {
                return Err(
                    "Listed pay raw text must be nonempty and at most 1024 UTF-8 bytes".to_string(),
                );
            }
            if contains_unsafe_source_control(raw_text) {
                return Err("Listed pay raw text contains a hidden control".to_string());
            }
        }

        if self.min.is_none() && self.max.is_none() && self.raw_text.is_none() {
            return Err("Listed pay requires an amount or raw text".to_string());
        }

        Ok(())
    }

    /// Returns directly comparable annual USD bounds without converting or guessing.
    #[must_use]
    pub fn usd_annual_bounds(&self) -> Option<(Option<f64>, Option<f64>)> {
        (self.validate().is_ok()
            && self.currency.as_deref() == Some("USD")
            && self.period == v3_contracts::PayPeriod::Annual
            && self.qualifiers.is_empty()
            && (self.min.is_some() || self.max.is_some()))
        .then_some((self.min, self.max))
    }

    /// Projects annual USD evidence into legacy whole-dollar fields without losing a bound.
    #[must_use]
    pub fn usd_annual_integer_bounds(&self) -> (Option<i64>, Option<i64>) {
        let Some((min, max)) = self.usd_annual_bounds() else {
            return (None, None);
        };
        if [min, max]
            .into_iter()
            .flatten()
            .any(|amount| amount.fract() != 0.0)
        {
            return (None, None);
        }
        (
            min.map(|amount| amount as i64),
            max.map(|amount| amount as i64),
        )
    }

    /// Encodes validated evidence in the canonical persisted JSON representation.
    pub fn canonical_json(&self) -> Result<String, String> {
        self.validate()?;
        serde_json::to_string(self).map_err(|_| "Listed pay could not be encoded".to_string())
    }

    /// Decodes and validates canonical persisted JSON without accepting malformed evidence.
    pub fn from_canonical_json(json: &str) -> Result<Self, String> {
        if json.len() > MAX_CANONICAL_JSON_BYTES {
            return Err("Listed pay JSON exceeds 4096 UTF-8 bytes".to_string());
        }
        let listed_pay: Self =
            serde_json::from_str(json).map_err(|_| "Listed pay JSON is malformed".to_string())?;
        listed_pay.validate()?;
        Ok(listed_pay)
    }

    /// Formats validated native amounts without emitting untrusted raw source text.
    #[must_use]
    pub fn format_amounts(&self) -> Option<String> {
        self.validate().ok()?;
        let amount = match (self.min, self.max) {
            (Some(min), Some(max)) if min.partial_cmp(&max) == Some(std::cmp::Ordering::Equal) => {
                display_amount(min)
            }
            (Some(min), Some(max)) => format!("{}–{}", display_amount(min), display_amount(max)),
            (Some(min), None) => format!("From {}", display_amount(min)),
            (None, Some(max)) => format!("Up to {}", display_amount(max)),
            (None, None) => return None,
        };
        let currency = self.currency.as_deref().unwrap_or("Currency unknown");
        let qualifiers = self
            .qualifiers
            .iter()
            .map(|qualifier| match qualifier {
                PayQualifier::Ctc => "ctc",
                PayQualifier::ProRata => "pro rata",
                PayQualifier::Stipend => "stipend",
            })
            .collect::<Vec<_>>();
        let period = match self.period {
            v3_contracts::PayPeriod::Hourly => "hourly",
            v3_contracts::PayPeriod::Daily => "daily",
            v3_contracts::PayPeriod::Weekly => "weekly",
            v3_contracts::PayPeriod::Monthly => "monthly",
            v3_contracts::PayPeriod::Annual => "annual",
            v3_contracts::PayPeriod::Contract => "contract",
            v3_contracts::PayPeriod::Stipend => "stipend",
            v3_contracts::PayPeriod::NotDisclosed => "period not disclosed",
        };

        if qualifiers.is_empty() {
            Some(format!("{currency} {amount} {period}"))
        } else {
            Some(format!(
                "{currency} {amount} {period} ({})",
                qualifiers.join(", ")
            ))
        }
    }
}

fn qualifiers_are_unique(qualifiers: &[PayQualifier]) -> bool {
    qualifiers.iter().enumerate().all(|(index, qualifier)| {
        !qualifiers[..index]
            .iter()
            .any(|previous| previous == qualifier)
    })
}

fn display_amount(amount: f64) -> String {
    if amount.fract() == 0.0 {
        format!("{amount:.0}")
    } else {
        amount.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::{ListedPay, PayQualifier};
    use crate::v3_contracts::PayPeriod;

    #[test]
    fn validates_and_compares_only_unqualified_usd_annual_evidence() {
        let listed_pay = ListedPay {
            min: Some(120_000.0),
            max: Some(150_000.0),
            currency: Some("USD".to_string()),
            period: PayPeriod::Annual,
            qualifiers: Vec::new(),
            raw_text: Some("$120k-$150k annually".to_string()),
        };

        assert_eq!(listed_pay.validate(), Ok(()));
        assert_eq!(
            listed_pay.usd_annual_bounds(),
            Some((Some(120_000.0), Some(150_000.0)))
        );

        let qualified = ListedPay {
            qualifiers: vec![PayQualifier::Ctc],
            ..listed_pay
        };
        assert_eq!(qualified.usd_annual_bounds(), None);
        assert_eq!(
            qualified.format_amounts(),
            Some("USD 120000–150000 annual (ctc)".to_string())
        );
    }

    #[test]
    fn rejects_noncanonical_or_hidden_native_evidence() {
        let invalid = ListedPay {
            min: Some(2.0),
            max: Some(1.0),
            currency: Some("usd".to_string()),
            period: PayPeriod::Annual,
            qualifiers: vec![PayQualifier::Ctc, PayQualifier::Ctc],
            raw_text: Some("\u{202e}".to_string()),
        };

        assert!(invalid.validate().is_err());
        assert!(ListedPay::from_canonical_json("not-json").is_err());
        assert!(ListedPay::from_canonical_json(&"x".repeat(4097))
            .unwrap_err()
            .contains("exceeds 4096"));
    }

    #[test]
    fn formatter_never_emits_raw_text_without_amounts() {
        let raw_only = ListedPay {
            min: None,
            max: None,
            currency: Some("USD".to_string()),
            period: PayPeriod::NotDisclosed,
            qualifiers: Vec::new(),
            raw_text: Some("Compensation discussed later".to_string()),
        };

        assert_eq!(raw_only.format_amounts(), None);

        let whitespace_only = ListedPay {
            raw_text: Some(" \t\n".to_string()),
            ..raw_only
        };
        assert!(whitespace_only.validate().is_err());
    }

    #[test]
    fn formatter_distinguishes_single_bounds_and_preserves_fractional_rates() {
        let mut pay = ListedPay {
            min: Some(25.125),
            max: None,
            currency: Some("GBP".to_string()),
            period: PayPeriod::Hourly,
            qualifiers: Vec::new(),
            raw_text: None,
        };
        assert_eq!(
            pay.format_amounts().as_deref(),
            Some("GBP From 25.125 hourly")
        );
        pay.max = pay.min.take();
        assert_eq!(
            pay.format_amounts().as_deref(),
            Some("GBP Up to 25.125 hourly")
        );
    }
}
