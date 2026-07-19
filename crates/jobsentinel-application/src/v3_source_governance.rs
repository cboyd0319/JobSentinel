use chrono::{DateTime, NaiveDate, Utc};
use jobsentinel_domain::{
    v3_foundation::{SourceAccess, SourcePolicy},
    v3_manifests::SourceClass,
    v3_source_authorization::{SourceActionDecision, SourceGrantState},
    v3_source_manifest::{
        parse_source_manifest, SourceOperation, HN_HIRING_REQUEST_LIMIT_PER_HOUR,
        HN_HIRING_SOURCE_MANIFEST_V1, REMOTEOK_REQUEST_LIMIT_PER_HOUR, REMOTEOK_SOURCE_MANIFEST_V1,
        USAJOBS_REQUEST_LIMIT_PER_HOUR, USAJOBS_SOURCE_MANIFEST_V1,
        WEWORKREMOTELY_REQUEST_LIMIT_PER_HOUR, WEWORKREMOTELY_SOURCE_MANIFEST_V1,
    },
};
use jobsentinel_storage::Database;

use crate::v3_foundation::{map_error, set_source_policy, FoundationError};

const POLICY_REVIEWED_AT: &str = "2026-07-19T00:00:00Z";

fn reviewed_policy(
    source_id: &str,
    policy_ref: &str,
    request_limit_per_hour: u16,
) -> Result<SourcePolicy, FoundationError> {
    Ok(SourcePolicy {
        source_id: source_id.to_string(),
        source_class: SourceClass::OfficialPublicApi,
        access: SourceAccess::ScheduledPublic,
        request_limit_per_hour,
        user_review_required: false,
        policy_ref: policy_ref.to_string(),
        revision: 1,
        restriction_reason_code: None,
        reviewed_at: POLICY_REVIEWED_AT
            .parse::<DateTime<Utc>>()
            .map_err(|_| FoundationError::InvalidInput)?,
    })
}

pub(crate) fn usajobs_policy() -> Result<SourcePolicy, FoundationError> {
    reviewed_policy(
        "usajobs",
        "jobsentinel.source-policy.usajobs.api",
        USAJOBS_REQUEST_LIMIT_PER_HOUR,
    )
}

pub(crate) fn remoteok_policy() -> Result<SourcePolicy, FoundationError> {
    reviewed_policy(
        "remoteok",
        "jobsentinel.source-policy.remoteok.api",
        REMOTEOK_REQUEST_LIMIT_PER_HOUR,
    )
}

pub(crate) fn weworkremotely_policy() -> Result<SourcePolicy, FoundationError> {
    reviewed_policy(
        "weworkremotely",
        "jobsentinel.source-policy.weworkremotely.rss",
        WEWORKREMOTELY_REQUEST_LIMIT_PER_HOUR,
    )
}

pub(crate) fn hn_hiring_policy() -> Result<SourcePolicy, FoundationError> {
    reviewed_policy(
        "hn_hiring",
        "jobsentinel.source-policy.hn-hiring.algolia",
        HN_HIRING_REQUEST_LIMIT_PER_HOUR,
    )
}

async fn install_reviewed(
    database: &Database,
    expected: SourcePolicy,
    raw_manifest: &str,
) -> Result<(), FoundationError> {
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
    let manifest = parse_source_manifest(raw_manifest, &expected)
        .map_err(|_| FoundationError::InvalidInput)?;
    database
        .store_source_manifest(&manifest)
        .await
        .map_err(map_error)
}

async fn authorize_reviewed(
    database: &Database,
    expected_policy: SourcePolicy,
    raw_manifest: &str,
    operation: SourceOperation,
    today: NaiveDate,
) -> Result<SourceActionDecision, FoundationError> {
    let policy = database
        .get_source_policy(&expected_policy.source_id)
        .await
        .map_err(map_error)?
        .ok_or(FoundationError::Conflict)?;
    if policy != expected_policy {
        return Err(FoundationError::Conflict);
    }
    let expected_manifest = parse_source_manifest(raw_manifest, &expected_policy)
        .map_err(|_| FoundationError::InvalidInput)?;
    let manifest = database
        .get_source_manifest(&expected_policy.source_id)
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

pub(crate) async fn install_usajobs(database: &Database) -> Result<(), FoundationError> {
    install_reviewed(database, usajobs_policy()?, USAJOBS_SOURCE_MANIFEST_V1).await
}

pub(crate) async fn authorize_usajobs(
    database: &Database,
    operation: SourceOperation,
    today: NaiveDate,
) -> Result<SourceActionDecision, FoundationError> {
    authorize_reviewed(
        database,
        usajobs_policy()?,
        USAJOBS_SOURCE_MANIFEST_V1,
        operation,
        today,
    )
    .await
}

pub(crate) async fn install_remoteok(database: &Database) -> Result<(), FoundationError> {
    install_reviewed(database, remoteok_policy()?, REMOTEOK_SOURCE_MANIFEST_V1).await
}

pub(crate) async fn authorize_remoteok(
    database: &Database,
    operation: SourceOperation,
    today: NaiveDate,
) -> Result<SourceActionDecision, FoundationError> {
    authorize_reviewed(
        database,
        remoteok_policy()?,
        REMOTEOK_SOURCE_MANIFEST_V1,
        operation,
        today,
    )
    .await
}

pub(crate) async fn install_weworkremotely(database: &Database) -> Result<(), FoundationError> {
    install_reviewed(
        database,
        weworkremotely_policy()?,
        WEWORKREMOTELY_SOURCE_MANIFEST_V1,
    )
    .await
}

pub(crate) async fn authorize_weworkremotely(
    database: &Database,
    operation: SourceOperation,
    today: NaiveDate,
) -> Result<SourceActionDecision, FoundationError> {
    authorize_reviewed(
        database,
        weworkremotely_policy()?,
        WEWORKREMOTELY_SOURCE_MANIFEST_V1,
        operation,
        today,
    )
    .await
}

pub(crate) async fn install_hn_hiring(database: &Database) -> Result<(), FoundationError> {
    install_reviewed(database, hn_hiring_policy()?, HN_HIRING_SOURCE_MANIFEST_V1).await
}

pub(crate) async fn authorize_hn_hiring(
    database: &Database,
    operation: SourceOperation,
    today: NaiveDate,
) -> Result<SourceActionDecision, FoundationError> {
    authorize_reviewed(
        database,
        hn_hiring_policy()?,
        HN_HIRING_SOURCE_MANIFEST_V1,
        operation,
        today,
    )
    .await
}
