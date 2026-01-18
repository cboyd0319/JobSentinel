//! Credential health tracking - especially LinkedIn cookie expiry

use crate::core::Database;
use anyhow::Result;
use chrono::{Duration, Utc};

use super::types::{CredentialHealth, CredentialStatus};

/// LinkedIn cookies typically last 1 year
const LINKEDIN_COOKIE_EXPIRY_DAYS: i64 = 365;

/// Warning threshold - alert when less than 30 days remaining
const WARNING_THRESHOLD_DAYS: i64 = 30;

/// Check LinkedIn cookie health status
pub async fn check_linkedin_cookie_health(db: &Database) -> Result<CredentialHealth> {
    let record = sqlx::query!(
        r#"
        SELECT credential_key, created_at, last_validated, expires_at, validation_status
        FROM credential_health
        WHERE credential_key = 'linkedin_cookie'
        "#,
    )
    .fetch_optional(db.pool())
    .await?;

    if let Some(r) = record {
        let now = Utc::now();

        // Calculate expiry based on creation date if not explicitly set
        let expires_at = r.expires_at.map(|dt| dt.and_utc()).or_else(|| {
            r.created_at
                .map(|c| c.and_utc() + Duration::days(LINKEDIN_COOKIE_EXPIRY_DAYS))
        });

        let days_left = expires_at
            .map(|exp| (exp - now).num_days())
            .unwrap_or(LINKEDIN_COOKIE_EXPIRY_DAYS);

        let status = if days_left < 0 {
            CredentialStatus::Expired
        } else if days_left < WARNING_THRESHOLD_DAYS {
            CredentialStatus::Expiring
        } else {
            CredentialStatus::Valid
        };

        Ok(CredentialHealth {
            key: "linkedin_cookie".to_string(),
            created_at: r.created_at.map(|dt| dt.and_utc()),
            last_validated: r.last_validated.map(|dt| dt.and_utc()),
            expires_at,
            status,
            days_until_expiry: Some(days_left.max(0)),
        })
    } else {
        // No record exists - credential not yet stored
        Ok(CredentialHealth {
            key: "linkedin_cookie".to_string(),
            created_at: None,
            last_validated: None,
            expires_at: None,
            status: CredentialStatus::Unknown,
            days_until_expiry: None,
        })
    }
}

/// Record when a credential is stored (call from credential store)
pub async fn record_credential_created(db: &Database, key: &str) -> Result<()> {
    let expiry_days = match key {
        "linkedin_cookie" => LINKEDIN_COOKIE_EXPIRY_DAYS,
        _ => 365, // Default 1 year for unknown credentials
    };

    let expiry_modifier = format!("+{} days", expiry_days);

    sqlx::query(
        r#"
        INSERT INTO credential_health (credential_key, created_at, expires_at, validation_status)
        VALUES (?, datetime('now'), datetime('now', ?), 'unknown')
        ON CONFLICT(credential_key) DO UPDATE SET
            created_at = datetime('now'),
            expires_at = datetime('now', ?),
            validation_status = 'unknown',
            warning_sent_at = NULL
        "#,
    )
    .bind(key)
    .bind(&expiry_modifier)
    .bind(&expiry_modifier)
    .execute(db.pool())
    .await?;

    tracing::info!("Recorded credential creation for: {}", key);
    Ok(())
}

/// Record when a credential is successfully used
pub async fn record_credential_validated(db: &Database, key: &str) -> Result<()> {
    sqlx::query!(
        r#"
        UPDATE credential_health
        SET last_validated = datetime('now'),
            validation_status = 'valid'
        WHERE credential_key = ?
        "#,
        key,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Mark a credential as expired
pub async fn mark_credential_expired(db: &Database, key: &str) -> Result<()> {
    sqlx::query!(
        r#"
        UPDATE credential_health
        SET validation_status = 'expired'
        WHERE credential_key = ?
        "#,
        key,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Check if warning has been sent for this credential
pub async fn should_send_expiry_warning(db: &Database, key: &str) -> Result<bool> {
    let record = sqlx::query!(
        r#"
        SELECT warning_sent_at, expires_at
        FROM credential_health
        WHERE credential_key = ?
        "#,
        key,
    )
    .fetch_optional(db.pool())
    .await?;

    if let Some(r) = record {
        // Check if within warning period and warning not sent
        if r.warning_sent_at.is_some() {
            return Ok(false); // Already sent
        }

        if let Some(expires_at) = r.expires_at {
            let now = Utc::now();
            let days_left = (expires_at.and_utc() - now).num_days();
            return Ok(days_left <= WARNING_THRESHOLD_DAYS && days_left > 0);
        }
    }

    Ok(false)
}

/// Mark that expiry warning has been sent
pub async fn mark_warning_sent(db: &Database, key: &str) -> Result<()> {
    sqlx::query!(
        r#"
        UPDATE credential_health
        SET warning_sent_at = datetime('now')
        WHERE credential_key = ?
        "#,
        key,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Get all credentials that need expiry warnings
pub async fn get_expiring_credentials(db: &Database) -> Result<Vec<CredentialHealth>> {
    let rows = sqlx::query!(
        r#"
        SELECT credential_key, created_at, last_validated, expires_at, validation_status
        FROM credential_health
        WHERE warning_sent_at IS NULL
        AND expires_at IS NOT NULL
        AND expires_at <= datetime('now', '+30 days')
        AND expires_at > datetime('now')
        "#,
    )
    .fetch_all(db.pool())
    .await?;

    let now = Utc::now();
    let credentials = rows
        .into_iter()
        .map(|r| {
            let expires_at = r.expires_at.map(|dt| dt.and_utc());
            let days_left = expires_at.map(|exp| (exp - now).num_days()).unwrap_or(0);

            CredentialHealth {
                key: r.credential_key.unwrap_or_default(),
                created_at: r.created_at.map(|dt| dt.and_utc()),
                last_validated: r.last_validated.map(|dt| dt.and_utc()),
                expires_at,
                status: if days_left <= 0 {
                    CredentialStatus::Expired
                } else if days_left <= WARNING_THRESHOLD_DAYS {
                    CredentialStatus::Expiring
                } else {
                    CredentialStatus::Valid
                },
                days_until_expiry: Some(days_left.max(0)),
            }
        })
        .collect();

    Ok(credentials)
}
