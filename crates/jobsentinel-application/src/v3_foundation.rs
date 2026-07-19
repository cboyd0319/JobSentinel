use jobsentinel_domain::{
    v3_foundation::{
        CareerGraphLink, CaseFile, CaseFileEvent, CaseFileEventInput, CompatibilityMetadata,
        SourceGraphLink, SourcePolicy,
    },
    v3_manifests::PrivacyReceipt,
};
use jobsentinel_storage::Database;
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum FoundationError {
    #[error("The v3 foundation input is invalid.")]
    InvalidInput,
    #[error("Local v3 data is unavailable ({0}).")]
    Storage(&'static str),
}

pub async fn create_or_reuse_case_file(
    database: &Database,
    job_hash: &str,
) -> Result<CaseFile, FoundationError> {
    if job_hash.is_empty() || job_hash.len() > 128 {
        return Err(FoundationError::InvalidInput);
    }
    database.ensure_case_file(job_hash).await.map_err(map_error)
}

pub async fn record_case_file_event(
    database: &Database,
    input: &CaseFileEventInput,
) -> Result<CaseFileEvent, FoundationError> {
    input
        .validate()
        .map_err(|_| FoundationError::InvalidInput)?;
    database
        .append_case_file_event(input)
        .await
        .map_err(map_error)
}

pub async fn add_career_graph_link(
    database: &Database,
    link: &CareerGraphLink,
) -> Result<(), FoundationError> {
    link.validate().map_err(|_| FoundationError::InvalidInput)?;
    database
        .insert_career_graph_link(link)
        .await
        .map_err(map_error)
}

pub async fn add_source_graph_link(
    database: &Database,
    link: &SourceGraphLink,
) -> Result<(), FoundationError> {
    link.validate().map_err(|_| FoundationError::InvalidInput)?;
    database
        .insert_source_graph_link(link)
        .await
        .map_err(map_error)
}

pub async fn record_privacy_receipt(
    database: &Database,
    receipt: &PrivacyReceipt,
) -> Result<(), FoundationError> {
    receipt
        .validate()
        .map_err(|_| FoundationError::InvalidInput)?;
    database
        .store_privacy_receipt(receipt)
        .await
        .map_err(map_error)
}

pub async fn set_source_policy(
    database: &Database,
    policy: &SourcePolicy,
) -> Result<SourcePolicy, FoundationError> {
    policy
        .validate()
        .map_err(|_| FoundationError::InvalidInput)?;
    database
        .upsert_source_policy(policy)
        .await
        .map_err(map_error)
}

pub async fn read_compatibility_metadata(
    database: &Database,
) -> Result<CompatibilityMetadata, FoundationError> {
    database
        .read_compatibility_metadata()
        .await
        .map_err(map_error)
}

fn map_error(error: anyhow::Error) -> FoundationError {
    match jobsentinel_storage::v3_foundation::error_kind(&error) {
        "invalid" => FoundationError::InvalidInput,
        kind => FoundationError::Storage(kind),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use jobsentinel_domain::{
        v3_foundation::{CaseFileEventInput, CaseFileEventKind, EventMetadata, EventOrigin},
        PrivacyLabel,
    };
    use jobsentinel_storage::Database;

    use crate::test_support::test_job;

    #[tokio::test]
    async fn application_operations_create_and_reuse_a_sanitized_case() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        database
            .insert_job_if_new(&test_job("job-1", "Office Assistant", "Example"))
            .await
            .unwrap();

        let first = create_or_reuse_case_file(&database, "job-1").await.unwrap();
        let second = create_or_reuse_case_file(&database, "job-1").await.unwrap();
        assert_eq!(first.case_file_id, second.case_file_id);

        record_case_file_event(
            &database,
            &CaseFileEventInput {
                case_file_id: first.case_file_id,
                kind: CaseFileEventKind::EvidenceLinked,
                origin: EventOrigin::User,
                user_action: true,
                privacy_labels: [PrivacyLabel::LocalOnly, PrivacyLabel::Sensitive],
                metadata: EventMetadata::LocalReference {
                    reference_id: "evidence-1".to_string(),
                },
            },
        )
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn application_validation_rejects_mismatched_event_metadata() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let error = record_case_file_event(
            &database,
            &CaseFileEventInput {
                case_file_id: "case-1".to_string(),
                kind: CaseFileEventKind::StatusChanged,
                origin: EventOrigin::User,
                user_action: true,
                privacy_labels: [PrivacyLabel::LocalOnly, PrivacyLabel::Sensitive],
                metadata: EventMetadata::Empty,
            },
        )
        .await
        .unwrap_err();

        assert_eq!(error, FoundationError::InvalidInput);
    }
}
