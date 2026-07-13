//! Type-safe ATS types using strong type wrappers
//!
//! This module provides enhanced type safety for ATS operations.
//! Original types in types.rs are preserved for backward compatibility.

use crate::core::types::{ApplicationId, JobHash, MatchScore, Minutes, Salary};
use crate::core::ats::types::{ApplicationStatus, parse_sqlite_datetime};
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Type-safe application data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypedApplication {
    pub id: ApplicationId,
    pub job_hash: JobHash,
    pub status: ApplicationStatus,
    pub applied_at: Option<DateTime<Utc>>,
    pub last_contact: Option<DateTime<Utc>>,
    pub next_followup: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub recruiter_name: Option<String>,
    pub recruiter_email: Option<String>,
    pub recruiter_phone: Option<String>,
    pub salary_expectation: Option<Salary>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl TypedApplication {
    /// Convert from raw database application
    pub fn from_raw(app: crate::core::ats::types::Application) -> Result<Self> {
        Ok(Self {
            id: ApplicationId::from(app.id),
            job_hash: JobHash::unchecked(app.job_hash),
            status: app.status,
            applied_at: app.applied_at,
            last_contact: app.last_contact,
            next_followup: app.next_followup,
            notes: app.notes,
            recruiter_name: app.recruiter_name,
            recruiter_email: app.recruiter_email,
            recruiter_phone: app.recruiter_phone,
            salary_expectation: app.salary_expectation.map(Salary::new),
            created_at: app.created_at,
            updated_at: app.updated_at,
        })
    }

    /// Convert to raw database application
    pub fn to_raw(self) -> crate::core::ats::types::Application {
        crate::core::ats::types::Application {
            id: self.id.0,
            job_hash: self.job_hash.0,
            status: self.status,
            applied_at: self.applied_at,
            last_contact: self.last_contact,
            next_followup: self.next_followup,
            notes: self.notes,
            recruiter_name: self.recruiter_name,
            recruiter_email: self.recruiter_email,
            recruiter_phone: self.recruiter_phone,
            salary_expectation: self.salary_expectation.map(|s| s.0),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

/// Type-safe interview data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypedInterview {
    pub id: crate::core::types::InterviewId,
    pub application_id: ApplicationId,
    pub interview_type: crate::core::ats::types::InterviewType,
    pub scheduled_at: DateTime<Utc>,
    pub duration_minutes: Minutes,
    pub location: Option<String>,
    pub interviewer_name: Option<String>,
    pub interviewer_title: Option<String>,
    pub notes: Option<String>,
    pub completed: bool,
    pub outcome: Option<String>,
    pub post_interview_notes: Option<String>,
}

/// Type-safe application with job details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypedApplicationWithJob {
    pub id: ApplicationId,
    pub job_hash: JobHash,
    pub status: ApplicationStatus,
    pub applied_at: Option<DateTime<Utc>>,
    pub last_contact: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub job_title: String,
    pub company: String,
    pub score: MatchScore,
}

impl TypedApplicationWithJob {
    /// Convert from raw database type
    pub fn from_raw_parts(
        id: i64,
        job_hash: String,
        status: String,
        applied_at: Option<String>,
        last_contact: Option<String>,
        notes: Option<String>,
        job_title: String,
        company: String,
        score: f64,
    ) -> Result<Self> {
        Ok(Self {
            id: ApplicationId::from(id),
            job_hash: JobHash::unchecked(job_hash),
            status: status.parse()?,
            applied_at: applied_at.and_then(|s| parse_sqlite_datetime(&s).ok()),
            last_contact: last_contact.and_then(|s| parse_sqlite_datetime(&s).ok()),
            notes,
            job_title,
            company,
            score: MatchScore::unchecked(score),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_typed_application_conversion() {
        let raw = crate::core::ats::types::Application {
            id: 1,
            job_hash: "a".repeat(64),
            status: ApplicationStatus::Applied,
            applied_at: None,
            last_contact: None,
            next_followup: None,
            notes: None,
            recruiter_name: None,
            recruiter_email: None,
            recruiter_phone: None,
            salary_expectation: Some(120000),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let typed = TypedApplication::from_raw(raw.clone()).unwrap();
        assert_eq!(typed.id.0, 1);
        assert_eq!(typed.job_hash.as_str().len(), 64);
        assert_eq!(typed.salary_expectation.unwrap().amount(), 120000);

        let back_to_raw = typed.to_raw();
        assert_eq!(back_to_raw.id, raw.id);
        assert_eq!(back_to_raw.job_hash, raw.job_hash);
        assert_eq!(back_to_raw.salary_expectation, raw.salary_expectation);
    }
}
