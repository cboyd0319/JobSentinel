//! Proves native listed-pay evidence persists without unsafe legacy salary fallback.

use super::*;
use jobsentinel_domain::{v3_contracts::PayPeriod, ListedPay, PayQualifier};

#[tokio::test]
async fn native_listed_pay_round_trips_and_clears_incompatible_legacy_fields() {
    let database = crate::test_support::migrated_database().await;
    let mut job = create_test_job("native-pay", "Regional role", 0.9);
    job.listed_pay = Some(ListedPay {
        min: Some(50_000.5),
        max: Some(70_000.5),
        currency: Some("INR".to_string()),
        period: PayPeriod::Annual,
        qualifiers: vec![PayQualifier::Ctc],
        raw_text: Some("₹50,000.50–₹70,000.50 CTC annually".to_string()),
    });

    let id = database.upsert_job(&job).await.unwrap();
    let stored = database.get_job_by_id(id).await.unwrap().unwrap();

    assert_eq!(stored.listed_pay, job.listed_pay);
    assert_eq!(stored.salary_min, None);
    assert_eq!(stored.salary_max, None);
    assert_eq!(stored.currency.as_deref(), Some("INR"));

    job.listed_pay = Some(ListedPay {
        min: Some(120_000.0),
        max: Some(150_000.0),
        currency: Some("USD".to_string()),
        period: PayPeriod::Annual,
        qualifiers: Vec::new(),
        raw_text: None,
    });
    database.upsert_job(&job).await.unwrap();
    let updated = database.get_job_by_id(id).await.unwrap().unwrap();

    assert_eq!(updated.listed_pay, job.listed_pay);
    assert_eq!(updated.salary_min, Some(120_000));
    assert_eq!(updated.salary_max, Some(150_000));
    assert_eq!(updated.currency.as_deref(), Some("USD"));
}

#[tokio::test]
async fn native_listed_pay_rejects_invalid_writes_and_malformed_reads() {
    let database = crate::test_support::migrated_database().await;
    let mut job = create_test_job("invalid-native-pay", "Regional role", 0.9);
    job.listed_pay = Some(ListedPay {
        min: Some(2.0),
        max: Some(1.0),
        currency: Some("USD".to_string()),
        period: PayPeriod::Annual,
        qualifiers: Vec::new(),
        raw_text: None,
    });

    let error = database.upsert_job(&job).await.unwrap_err();
    assert!(error.to_string().contains("Invalid listed pay"));

    job.listed_pay = None;
    let id = database.upsert_job(&job).await.unwrap();
    sqlx::query("UPDATE jobs SET listed_pay = '{}' WHERE id = ?")
        .bind(id)
        .execute(database.pool())
        .await
        .unwrap();

    let error = database.get_job_by_id(id).await.unwrap_err();
    assert!(error
        .to_string()
        .contains("Stored listed pay JSON is invalid"));
}
