use chrono::{DateTime, NaiveDate, Utc};
use jobsentinel_domain::{
    v3_foundation::{SourceAccess, SourcePolicy},
    v3_manifests::SourceClass,
    v3_source_authorization::{SourceActionDecision, SourceGrantState},
    v3_source_manifest::{
        parse_source_manifest, SourceOperation, USAJOBS_REQUEST_LIMIT_PER_HOUR,
        USAJOBS_SOURCE_MANIFEST_V1,
    },
};
use jobsentinel_storage::Database;

use crate::v3_foundation::{map_error, set_source_policy, FoundationError};

const POLICY_REVIEWED_AT: &str = "2026-07-19T00:00:00Z";

pub(crate) fn policy() -> Result<SourcePolicy, FoundationError> {
    Ok(SourcePolicy {
        source_id: "usajobs".to_string(),
        source_class: SourceClass::OfficialPublicApi,
        access: SourceAccess::ScheduledPublic,
        request_limit_per_hour: USAJOBS_REQUEST_LIMIT_PER_HOUR,
        user_review_required: false,
        policy_ref: "jobsentinel.source-policy.usajobs.api".to_string(),
        revision: 1,
        restriction_reason_code: None,
        reviewed_at: POLICY_REVIEWED_AT
            .parse::<DateTime<Utc>>()
            .map_err(|_| FoundationError::InvalidInput)?,
    })
}

pub(crate) async fn install(database: &Database) -> Result<(), FoundationError> {
    let expected = policy()?;
    match database
        .get_source_policy(&expected.source_id)
        .await
        .map_err(map_error)?
    {
        Some(current) if current.revision > expected.revision => return Ok(()),
        Some(current) if current.revision == expected.revision && current != expected => {
            return Err(FoundationError::Conflict);
        }
        Some(current) if current == expected => {}
        _ => {
            set_source_policy(database, &expected).await?;
        }
    }
    let manifest = parse_source_manifest(USAJOBS_SOURCE_MANIFEST_V1, &expected)
        .map_err(|_| FoundationError::InvalidInput)?;
    database
        .store_source_manifest(&manifest)
        .await
        .map_err(map_error)
}

pub(crate) async fn authorize(
    database: &Database,
    operation: SourceOperation,
    today: NaiveDate,
) -> Result<SourceActionDecision, FoundationError> {
    let expected_policy = policy()?;
    let policy = database
        .get_source_policy("usajobs")
        .await
        .map_err(map_error)?
        .ok_or(FoundationError::Conflict)?;
    if policy != expected_policy {
        return Err(FoundationError::Conflict);
    }
    let expected_manifest = parse_source_manifest(USAJOBS_SOURCE_MANIFEST_V1, &expected_policy)
        .map_err(|_| FoundationError::InvalidInput)?;
    let manifest = database
        .get_source_manifest("usajobs")
        .await
        .map_err(map_error)?
        .ok_or(FoundationError::Conflict)?;
    if manifest != expected_manifest {
        return Err(FoundationError::Conflict);
    }
    manifest
        .authorize(&policy, operation, today, SourceGrantState::NotRequired)
        .map_err(|_| FoundationError::InvalidInput)
}
