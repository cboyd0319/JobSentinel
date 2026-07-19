use chrono::{DateTime, Utc};
use jobsentinel_domain::{
    v3_foundation::{SourceAccess, SourcePolicy},
    v3_manifests::{DataCategory, SourceClass},
    v3_source_consent::{
        SourceConsentContext, SourceConsentOperation, SourceConsentReviewReason,
        SourceConsentStatus,
    },
};
use jobsentinel_storage::Database;
use sha2::{Digest, Sha256};

use crate::{
    v3_foundation::{
        remember_source_consent, review_source_consent, revoke_source_consent, set_source_policy,
        FoundationError,
    },
    Config,
};

const RESTRICTED_SOURCE_IDS: [&str; 4] = ["builtin", "dice", "simplyhired", "glassdoor"];
const POLICY_REVISION: u32 = 1;
const WARNING_VERSION: u32 = 1;
const BEHAVIOR_REVISION: u32 = 1;
const POLICY_REVIEWED_AT: &str = "2026-07-19T00:00:00Z";

pub async fn review_restricted_source_consent(
    database: &Database,
    config: &Config,
    source_id: &str,
) -> Result<SourceConsentStatus, FoundationError> {
    let context = consent_context(config, source_id)?;
    review_source_consent(database, &context).await
}

pub async fn restricted_source_consent_remembered(
    database: &Database,
    config: &Config,
    source_id: &str,
) -> bool {
    matches!(
        review_restricted_source_consent(database, config, source_id).await,
        Ok(SourceConsentStatus::Remembered { .. })
    )
}

pub async fn refresh_restricted_source_acknowledgements(
    database: &Database,
    config: &mut Config,
) -> Result<(), FoundationError> {
    for source_id in RESTRICTED_SOURCE_IDS {
        ensure_current_policy(database, source_id).await?;
        let remembered = match review_restricted_source_consent(database, config, source_id).await?
        {
            SourceConsentStatus::Remembered { .. } => true,
            SourceConsentStatus::ReviewRequired {
                reason: SourceConsentReviewReason::ContextChanged,
                latest_event_id: Some(_),
            } => {
                revoke_source_consent(database, source_id).await?;
                false
            }
            SourceConsentStatus::ReviewRequired { .. } => false,
        };
        set_acknowledgement(config, source_id, remembered);
    }
    Ok(())
}

pub async fn reconcile_restricted_source_consents(
    database: &Database,
    previous: &Config,
    requested: &mut Config,
) -> Result<(), FoundationError> {
    for source_id in RESTRICTED_SOURCE_IDS {
        let was_acknowledged = acknowledgement(previous, source_id);
        let acknowledgement_requested = acknowledgement(requested, source_id);

        if was_acknowledged && !acknowledgement_requested {
            revoke_source_consent(database, source_id).await?;
        } else if !was_acknowledged && acknowledgement_requested {
            ensure_current_policy(database, source_id).await?;
            let context = consent_context(requested, source_id)?;
            match review_source_consent(database, &context).await? {
                SourceConsentStatus::Remembered { .. } => {}
                SourceConsentStatus::ReviewRequired {
                    latest_event_id, ..
                } => {
                    remember_source_consent(database, &context, latest_event_id.as_deref()).await?;
                }
            }
        }
    }

    refresh_restricted_source_acknowledgements(database, requested).await
}

fn consent_context(
    config: &Config,
    source_id: &str,
) -> Result<SourceConsentContext, FoundationError> {
    let policy = current_policy(source_id)?;
    Ok(SourceConsentContext {
        source_id: source_id.to_string(),
        operation: SourceConsentOperation::ScheduledCheck,
        warning_version: WARNING_VERSION,
        behavior_revision: BEHAVIOR_REVISION,
        policy_ref: policy.policy_ref,
        policy_revision: policy.revision,
        source_class: policy.source_class,
        data_categories: data_categories(source_id)?,
        destination_sha256: hash_parts(&[destination(source_id)?.as_bytes()])?,
        request_sha256: request_hash(config, source_id)?,
    })
}

fn current_policy(source_id: &str) -> Result<SourcePolicy, FoundationError> {
    let reviewed_at = POLICY_REVIEWED_AT
        .parse::<DateTime<Utc>>()
        .map_err(|_| FoundationError::InvalidInput)?;
    Ok(SourcePolicy {
        source_id: source_id.to_string(),
        source_class: SourceClass::RestrictedPublicScheduled,
        access: SourceAccess::ScheduledPublic,
        request_limit_per_hour: 1,
        user_review_required: true,
        policy_ref: format!("jobsentinel.source-policy.{source_id}.scheduled"),
        revision: POLICY_REVISION,
        restriction_reason_code: Some("restricted-public-scheduled".to_string()),
        reviewed_at,
    })
}

async fn ensure_current_policy(
    database: &Database,
    source_id: &str,
) -> Result<(), FoundationError> {
    let expected = current_policy(source_id)?;
    match database
        .get_source_policy(source_id)
        .await
        .map_err(|_| FoundationError::Storage("source-policy"))?
    {
        Some(stored) if stored == expected => Ok(()),
        Some(stored) if stored.revision >= expected.revision => Err(FoundationError::Conflict),
        _ => {
            let stored = set_source_policy(database, &expected).await?;
            if stored == expected {
                Ok(())
            } else {
                Err(FoundationError::Conflict)
            }
        }
    }
}

fn destination(source_id: &str) -> Result<&'static str, FoundationError> {
    match source_id {
        "builtin" => Ok("https://builtin.com"),
        "dice" => Ok("https://www.dice.com"),
        "simplyhired" => Ok("https://www.simplyhired.com"),
        "glassdoor" => Ok("https://www.glassdoor.com"),
        _ => Err(FoundationError::InvalidInput),
    }
}

fn data_categories(source_id: &str) -> Result<Vec<DataCategory>, FoundationError> {
    match source_id {
        "builtin" => Ok(vec![
            DataCategory::PublicJobPosting,
            DataCategory::CareerGoals,
        ]),
        "dice" | "simplyhired" | "glassdoor" => Ok(vec![
            DataCategory::PublicJobPosting,
            DataCategory::CareerGoals,
            DataCategory::LocationPreferences,
        ]),
        _ => Err(FoundationError::InvalidInput),
    }
}

fn request_hash(config: &Config, source_id: &str) -> Result<String, FoundationError> {
    match source_id {
        "builtin" => hash_parts(&[
            source_id.as_bytes(),
            bool_bytes(config.builtin.enabled),
            bool_bytes(config.builtin.remote_only),
            config.builtin.limit.to_string().as_bytes(),
        ]),
        "dice" => hash_query_request(
            source_id,
            config.dice.enabled,
            &config.dice.query,
            config.dice.location.as_deref(),
            config.dice.limit,
        ),
        "simplyhired" => hash_query_request(
            source_id,
            config.simplyhired.enabled,
            &config.simplyhired.query,
            config.simplyhired.location.as_deref(),
            config.simplyhired.limit,
        ),
        "glassdoor" => hash_query_request(
            source_id,
            config.glassdoor.enabled,
            &config.glassdoor.query,
            config.glassdoor.location.as_deref(),
            config.glassdoor.limit,
        ),
        _ => Err(FoundationError::InvalidInput),
    }
}

fn hash_query_request(
    source_id: &str,
    enabled: bool,
    query: &str,
    location: Option<&str>,
    limit: usize,
) -> Result<String, FoundationError> {
    let limit = limit.to_string();
    let (location_state, location) = match location {
        Some(location) => (b"some".as_slice(), location),
        None => (b"none".as_slice(), ""),
    };
    hash_parts(&[
        source_id.as_bytes(),
        bool_bytes(enabled),
        query.as_bytes(),
        location_state,
        location.as_bytes(),
        limit.as_bytes(),
    ])
}

fn hash_parts(parts: &[&[u8]]) -> Result<String, FoundationError> {
    let mut hasher = Sha256::new();
    for part in parts {
        let length = u64::try_from(part.len()).map_err(|_| FoundationError::InvalidInput)?;
        hasher.update(length.to_be_bytes());
        hasher.update(part);
    }
    Ok(hex::encode(hasher.finalize()))
}

const fn bool_bytes(value: bool) -> &'static [u8] {
    if value {
        b"true"
    } else {
        b"false"
    }
}

fn acknowledgement(config: &Config, source_id: &str) -> bool {
    config
        .restricted_source_acknowledgements
        .contains(source_id)
}

fn set_acknowledgement(config: &mut Config, source_id: &str, acknowledged: bool) {
    match source_id {
        "builtin" => config.restricted_source_acknowledgements.builtin = acknowledged,
        "dice" => config.restricted_source_acknowledgements.dice = acknowledged,
        "simplyhired" => config.restricted_source_acknowledgements.simplyhired = acknowledged,
        "glassdoor" => config.restricted_source_acknowledgements.glassdoor = acknowledged,
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use jobsentinel_domain::v3_source_consent::{SourceConsentReviewReason, SourceConsentStatus};
    use jobsentinel_storage::Database;

    use crate::Config;

    use super::{
        reconcile_restricted_source_consents, refresh_restricted_source_acknowledgements,
        review_restricted_source_consent,
    };

    async fn database() -> Database {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        database
    }

    fn dice_config() -> Config {
        let mut config = Config::first_run();
        config.dice.enabled = true;
        config.dice.query = "security analyst".to_string();
        config.dice.location = Some("Remote".to_string());
        config.dice.limit = 25;
        config
    }

    #[tokio::test]
    async fn legacy_boolean_cannot_authorize_a_restricted_source() {
        let database = database().await;
        let mut config = dice_config();
        config.restricted_source_acknowledgements.dice = true;

        let status = review_restricted_source_consent(&database, &config, "dice")
            .await
            .unwrap();
        assert!(matches!(
            status,
            SourceConsentStatus::ReviewRequired {
                reason: SourceConsentReviewReason::ContextChanged,
                latest_event_id: None
            }
        ));

        refresh_restricted_source_acknowledgements(&database, &mut config)
            .await
            .unwrap();
        assert!(!config.restricted_source_acknowledgements.dice);
    }

    #[tokio::test]
    async fn exact_user_review_is_remembered_and_request_drift_resets_it() {
        let database = database().await;
        let previous = dice_config();
        let mut reviewed = previous.clone();
        reviewed.restricted_source_acknowledgements.dice = true;

        reconcile_restricted_source_consents(&database, &previous, &mut reviewed)
            .await
            .unwrap();
        assert!(reviewed.restricted_source_acknowledgements.dice);
        assert!(matches!(
            review_restricted_source_consent(&database, &reviewed, "dice")
                .await
                .unwrap(),
            SourceConsentStatus::Remembered { .. }
        ));

        let mut changed = reviewed.clone();
        changed.dice.query = "incident responder".to_string();
        reconcile_restricted_source_consents(&database, &reviewed, &mut changed)
            .await
            .unwrap();

        assert!(!changed.restricted_source_acknowledgements.dice);
        assert!(matches!(
            review_restricted_source_consent(&database, &changed, "dice")
                .await
                .unwrap(),
            SourceConsentStatus::ReviewRequired {
                reason: SourceConsentReviewReason::Revoked,
                ..
            }
        ));
    }

    #[tokio::test]
    async fn request_drift_cannot_restore_an_old_grant_after_reload() {
        let database = database().await;
        let previous = dice_config();
        let mut reviewed = previous.clone();
        reviewed.restricted_source_acknowledgements.dice = true;
        reconcile_restricted_source_consents(&database, &previous, &mut reviewed)
            .await
            .unwrap();

        let mut changed = reviewed.clone();
        changed.dice.query = "incident responder".to_string();
        reconcile_restricted_source_consents(&database, &reviewed, &mut changed)
            .await
            .unwrap();

        let mut restored_after_reload = previous;
        refresh_restricted_source_acknowledgements(&database, &mut restored_after_reload)
            .await
            .unwrap();

        assert!(
            !restored_after_reload
                .restricted_source_acknowledgements
                .dice
        );
        assert!(matches!(
            review_restricted_source_consent(&database, &restored_after_reload, "dice")
                .await
                .unwrap(),
            SourceConsentStatus::ReviewRequired {
                reason: SourceConsentReviewReason::Revoked,
                ..
            }
        ));
    }

    #[tokio::test]
    async fn review_and_revocation_are_scoped_to_one_source() {
        let database = database().await;
        let previous = dice_config();
        let mut reviewed = previous.clone();
        reviewed.builtin.enabled = true;
        reviewed.restricted_source_acknowledgements.dice = true;

        reconcile_restricted_source_consents(&database, &previous, &mut reviewed)
            .await
            .unwrap();

        assert!(reviewed.restricted_source_acknowledgements.dice);
        assert!(!reviewed.restricted_source_acknowledgements.builtin);

        let mut revoked = reviewed.clone();
        revoked.restricted_source_acknowledgements.dice = false;
        reconcile_restricted_source_consents(&database, &reviewed, &mut revoked)
            .await
            .unwrap();

        assert!(!revoked.restricted_source_acknowledgements.dice);
        assert!(!revoked.restricted_source_acknowledgements.builtin);
    }
}
