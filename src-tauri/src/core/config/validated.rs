//! Validated configuration types with compile-time guarantees
//!
//! Provides newtype wrappers for config values that enforce constraints.

use serde::{Deserialize, Serialize};
use std::fmt;

// ============================================================================
// Validated Config Values
// ============================================================================

/// SMTP port with validation (must be 1-65535)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SmtpPort(u16);

impl SmtpPort {
    pub fn new(port: u16) -> anyhow::Result<Self> {
        if port == 0 {
            anyhow::bail!("SMTP port cannot be 0");
        }
        Ok(Self(port))
    }

    #[inline]
    pub fn unchecked(port: u16) -> Self {
        Self(port)
    }

    #[inline]
    pub fn value(&self) -> u16 {
        self.0
    }

    /// Common SMTP ports
    pub const STARTTLS: Self = Self(587);
    pub const SSL: Self = Self(465);
    pub const LEGACY: Self = Self(25);
}

impl From<u16> for SmtpPort {
    fn from(port: u16) -> Self {
        Self(port)
    }
}

impl fmt::Display for SmtpPort {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Email address with basic validation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn new(email: String) -> anyhow::Result<Self> {
        if !Self::is_valid(&email) {
            anyhow::bail!("Invalid email address: {}", email);
        }
        Ok(Self(email))
    }

    #[inline]
    pub fn unchecked(email: String) -> Self {
        Self(email)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Basic email validation (not RFC 5322 compliant, but good enough)
    fn is_valid(email: &str) -> bool {
        email.contains('@')
            && email.len() >= 3
            && email.split('@').count() == 2
            && !email.starts_with('@')
            && !email.ends_with('@')
    }
}

impl fmt::Display for EmailAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// URL with validation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Url(String);

impl Url {
    pub fn new(url: String) -> anyhow::Result<Self> {
        if !Self::is_valid(&url) {
            anyhow::bail!("Invalid URL: {}", url);
        }
        Ok(Self(url))
    }

    #[inline]
    pub fn unchecked(url: String) -> Self {
        Self(url)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Basic URL validation
    fn is_valid(url: &str) -> bool {
        url.starts_with("http://") || url.starts_with("https://")
    }
}

impl fmt::Display for Url {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Webhook URL with validation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct WebhookUrl(String);

impl WebhookUrl {
    pub fn new(url: String) -> anyhow::Result<Self> {
        if !url.starts_with("http://") && !url.starts_with("https://") {
            anyhow::bail!("Webhook URL must start with http:// or https://");
        }
        Ok(Self(url))
    }

    #[inline]
    pub fn unchecked(url: String) -> Self {
        Self(url)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for WebhookUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Threshold value (0.0 - 1.0)
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Threshold(f64);

impl Threshold {
    pub fn new(value: f64) -> anyhow::Result<Self> {
        if !(0.0..=1.0).contains(&value) {
            anyhow::bail!("Threshold must be between 0.0 and 1.0, got {}", value);
        }
        Ok(Self(value))
    }

    #[inline]
    pub fn unchecked(value: f64) -> Self {
        Self(value)
    }

    #[inline]
    pub fn value(&self) -> f64 {
        self.0
    }
}

impl From<f64> for Threshold {
    fn from(value: f64) -> Self {
        Self(value)
    }
}

/// Non-empty string
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct NonEmptyString(String);

impl NonEmptyString {
    pub fn new(s: String) -> anyhow::Result<Self> {
        if s.trim().is_empty() {
            anyhow::bail!("String cannot be empty");
        }
        Ok(Self(s))
    }

    #[inline]
    pub fn unchecked(s: String) -> Self {
        Self(s)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for NonEmptyString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Positive integer
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct PositiveInt(u32);

impl PositiveInt {
    pub fn new(value: u32) -> anyhow::Result<Self> {
        if value == 0 {
            anyhow::bail!("Value must be positive (> 0)");
        }
        Ok(Self(value))
    }

    #[inline]
    pub fn unchecked(value: u32) -> Self {
        Self(value)
    }

    #[inline]
    pub fn value(&self) -> u32 {
        self.0
    }
}

impl From<u32> for PositiveInt {
    fn from(value: u32) -> Self {
        Self(value)
    }
}

/// Auto-refresh interval (minutes, must be >= 1)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RefreshInterval(u32);

impl RefreshInterval {
    pub fn new(minutes: u32) -> anyhow::Result<Self> {
        if minutes == 0 {
            anyhow::bail!("Refresh interval must be at least 1 minute");
        }
        Ok(Self(minutes))
    }

    #[inline]
    pub fn unchecked(minutes: u32) -> Self {
        Self(minutes)
    }

    #[inline]
    pub fn minutes(&self) -> u32 {
        self.0
    }

    /// Convert to milliseconds for frontend timers
    #[inline]
    pub fn as_milliseconds(&self) -> u64 {
        self.0 as u64 * 60 * 1000
    }
}

/// Scraping interval (hours, must be >= 1)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ScrapingInterval(u64);

impl ScrapingInterval {
    pub fn new(hours: u64) -> anyhow::Result<Self> {
        if hours == 0 {
            anyhow::bail!("Scraping interval must be at least 1 hour");
        }
        Ok(Self(hours))
    }

    #[inline]
    pub fn unchecked(hours: u64) -> Self {
        Self(hours)
    }

    #[inline]
    pub fn hours(&self) -> u64 {
        self.0
    }
}

/// Result limit (must be 1-1000)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ResultLimit(usize);

impl ResultLimit {
    pub fn new(limit: usize) -> anyhow::Result<Self> {
        if limit == 0 {
            anyhow::bail!("Result limit must be at least 1");
        }
        if limit > 1000 {
            anyhow::bail!("Result limit cannot exceed 1000");
        }
        Ok(Self(limit))
    }

    #[inline]
    pub fn unchecked(limit: usize) -> Self {
        Self(limit)
    }

    #[inline]
    pub fn value(&self) -> usize {
        self.0
    }
}

impl From<usize> for ResultLimit {
    fn from(limit: usize) -> Self {
        Self(limit)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_smtp_port_validation() {
        assert!(SmtpPort::new(0).is_err());
        assert!(SmtpPort::new(587).is_ok());
        assert_eq!(SmtpPort::STARTTLS.value(), 587);
    }

    #[test]
    fn test_email_validation() {
        assert!(EmailAddress::new("valid@example.com".to_string()).is_ok());
        assert!(EmailAddress::new("invalid".to_string()).is_err());
        assert!(EmailAddress::new("@invalid.com".to_string()).is_err());
        assert!(EmailAddress::new("invalid@".to_string()).is_err());
    }

    #[test]
    fn test_url_validation() {
        assert!(Url::new("https://example.com".to_string()).is_ok());
        assert!(Url::new("http://example.com".to_string()).is_ok());
        assert!(Url::new("ftp://example.com".to_string()).is_err());
        assert!(Url::new("not-a-url".to_string()).is_err());
    }

    #[test]
    fn test_threshold_validation() {
        assert!(Threshold::new(0.5).is_ok());
        assert!(Threshold::new(0.0).is_ok());
        assert!(Threshold::new(1.0).is_ok());
        assert!(Threshold::new(-0.1).is_err());
        assert!(Threshold::new(1.1).is_err());
    }

    #[test]
    fn test_non_empty_string() {
        assert!(NonEmptyString::new("valid".to_string()).is_ok());
        assert!(NonEmptyString::new("".to_string()).is_err());
        assert!(NonEmptyString::new("   ".to_string()).is_err());
    }

    #[test]
    fn test_positive_int() {
        assert!(PositiveInt::new(1).is_ok());
        assert!(PositiveInt::new(0).is_err());
    }

    #[test]
    fn test_refresh_interval() {
        let interval = RefreshInterval::new(30).unwrap();
        assert_eq!(interval.minutes(), 30);
        assert_eq!(interval.as_milliseconds(), 1_800_000);
        assert!(RefreshInterval::new(0).is_err());
    }

    #[test]
    fn test_result_limit() {
        assert!(ResultLimit::new(50).is_ok());
        assert!(ResultLimit::new(0).is_err());
        assert!(ResultLimit::new(1001).is_err());
    }
}
