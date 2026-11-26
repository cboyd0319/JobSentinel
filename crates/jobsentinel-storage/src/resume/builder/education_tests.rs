//! Verifies strict education and skill inputs, unchanged failed drafts and canonical JSON Resume import.

use super::*;
use serde_json::{json, Value};

fn education() -> Value {
    json!({
        "id": 7, "institution": "Metro College", "degree": "BA",
        "field_of_study": "Public Administration", "location": null,
        "graduation_date": "2020-05", "gpa": "3.8", "honors": ["Dean's List"]
    })
}

fn invalid_education() -> Vec<Value> {
    let mut invalid = Vec::new();
    for mixed in [false, true] {
        let mut value = education();
        if !mixed {
            value.as_object_mut().unwrap().remove("graduation_date");
        }
        value["graduation_year"] = json!(2020);
        invalid.push(value);
    }
    for field in ["graduation_date", "gpa"] {
        for malformed in [json!(2020), json!(true), json!([]), json!({})] {
            let mut value = education();
            value[field] = malformed;
            invalid.push(value);
        }
    }
    for malformed in [
        json!("Dean's List"),
        json!(2020),
        json!(true),
        Value::Null,
        json!(["Honors", 1]),
        json!([true]),
        json!([null]),
        json!([{}]),
    ] {
        let mut value = education();
        value["honors"] = malformed;
        invalid.push(value);
    }
    invalid
}

#[test]
fn canonical_education_round_trips_with_nullable_strings_and_array_honors() {
    let value = education();
    let decoded: DraftEducation = serde_json::from_value(value.clone()).unwrap();
    assert_eq!(serde_json::to_value(decoded).unwrap(), value);
    let mut nullable = value;
    nullable["graduation_date"] = Value::Null;
    nullable["gpa"] = Value::Null;
    nullable["honors"] = json!([]);
    let decoded: DraftEducation = serde_json::from_value(nullable.clone()).unwrap();
    assert_eq!(serde_json::to_value(decoded).unwrap(), nullable);
}

#[test]
fn retired_education_keys_and_scalar_coercions_are_rejected() {
    for value in invalid_education() {
        assert!(serde_json::from_value::<DraftEducation>(value).is_err());
    }
    for category in [json!(42), json!(true), Value::Null, json!([]), json!({})] {
        assert!(serde_json::from_value::<DraftSkill>(
            json!({"name": "Rust", "category": category})
        )
        .is_err());
    }
    let defaulted: DraftSkill = serde_json::from_value(json!({"name": "Rust"})).unwrap();
    assert_eq!(defaulted.category, "");
}

#[tokio::test]
async fn invalid_education_cannot_replace_persisted_draft_data() {
    let pool = setup_test_db().await;
    let builder = ResumeBuilder::new(pool.clone());
    let resume_id = builder.create_resume().await.unwrap();
    let canonical =
        serde_json::to_value(builder.get_resume(resume_id).await.unwrap().unwrap()).unwrap();
    for invalid in invalid_education() {
        let mut saved = canonical.clone();
        saved["education"] = json!([invalid]);
        sqlx::query(
            "UPDATE resume_drafts SET data = ?, updated_at = '2026-10-28 01:02:03' WHERE id = ?",
        )
        .bind(serde_json::to_string(&saved).unwrap())
        .bind(resume_id)
        .execute(&pool)
        .await
        .unwrap();
        let before: (String, String) =
            sqlx::query_as("SELECT data, updated_at FROM resume_drafts WHERE id = ?")
                .bind(resume_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert!(builder.get_resume(resume_id).await.is_err());
        assert!(builder
            .update_summary(resume_id, "must not replace saved data".into())
            .await
            .is_err());
        let after: (String, String) =
            sqlx::query_as("SELECT data, updated_at FROM resume_drafts WHERE id = ?")
                .bind(resume_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(after, before);
    }
}

#[tokio::test]
async fn json_resume_import_still_produces_canonical_builder_education() {
    let pool = setup_test_db().await;
    let matcher = crate::resume::ResumeMatcher::new(pool.clone());
    let document = json!({
        "basics": {"name": "Jordan Lee", "email": "jordan@example.test"},
        "education": [{"institution": "Metro College", "studyType": "BA", "area": "Public Administration",
            "endDate": "2020-05", "score": "3.8", "courses": ["Dean's List"]}],
        "skills": [{"name": "Operations", "keywords": ["Scheduling"]}]
    });
    let resume_id = matcher
        .import_json_resume("Imported resume".into(), &document.to_string())
        .await
        .unwrap();
    let stored = ResumeBuilder::new(pool)
        .get_resume(resume_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(
        stored.resume.education[0].graduation_date.as_deref(),
        Some("2020-05")
    );
    assert_eq!(stored.resume.education[0].gpa.as_deref(), Some("3.8"));
    assert_eq!(stored.resume.education[0].honors, ["Dean's List"]);
    let round_trip: ResumeDraft =
        serde_json::from_value(serde_json::to_value(&stored).unwrap()).unwrap();
    assert_eq!(
        serde_json::to_value(&round_trip.resume.education).unwrap(),
        serde_json::to_value(&stored.resume.education).unwrap()
    );
    assert_eq!(round_trip.resume.skills[0].name, "Operations");
}
