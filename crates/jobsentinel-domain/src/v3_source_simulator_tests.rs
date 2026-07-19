use chrono::{NaiveDate, TimeZone, Utc};

use crate::{
    v3_foundation::{SourceAccess, SourcePolicy},
    v3_manifests::SourceClass,
    v3_source_authorization::{SourceActionDecision, SourceGrantState},
    v3_source_manifest::{parse_source_manifest, SourceOperation, SourceStopCondition},
};

const MANIFEST: &str = include_str!("fixtures/v3_source_manifest_v1.json");
const LIST_PATH: &str =
    "crates/jobsentinel-domain/src/fixtures/source_simulator/synthetic_official_list.json";
const DETAIL_PATH: &str =
    "crates/jobsentinel-domain/src/fixtures/source_simulator/synthetic_official_detail.json";
const POLICY_PATH: &str =
    "crates/jobsentinel-domain/src/fixtures/source_reviews/synthetic_official_v1.json";

fn policy() -> SourcePolicy {
    SourcePolicy {
        source_id: "synthetic-official-jobs".to_string(),
        source_class: SourceClass::OfficialPublicApi,
        access: SourceAccess::ScheduledPublic,
        request_limit_per_hour: 60,
        user_review_required: false,
        policy_ref: "synthetic-official-jobs-v1".to_string(),
        revision: 1,
        restriction_reason_code: None,
        reviewed_at: Utc.with_ymd_and_hms(2026, 7, 19, 0, 0, 0).unwrap(),
    }
}

fn fixtures() -> [(&'static str, &'static [u8]); 3] {
    [
        (
            LIST_PATH,
            include_bytes!("fixtures/source_simulator/synthetic_official_list.json").as_slice(),
        ),
        (
            DETAIL_PATH,
            include_bytes!("fixtures/source_simulator/synthetic_official_detail.json").as_slice(),
        ),
        (
            POLICY_PATH,
            include_bytes!("fixtures/source_reviews/synthetic_official_v1.json").as_slice(),
        ),
    ]
}

#[test]
fn source_simulator_reuses_authorization_and_reports_expiry() {
    let policy = policy();
    let report = parse_source_manifest(MANIFEST, &policy)
        .unwrap()
        .simulate(
            &policy,
            SourceOperation::ScheduledCheck,
            NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
            SourceGrantState::NotRequired,
            &fixtures(),
        )
        .unwrap();

    assert_eq!(
        report.decision,
        SourceActionDecision::Allowed {
            request_limit_per_hour: 60,
            connectivity_required: true,
        }
    );
    assert_eq!(
        report.manifest_expires_on,
        NaiveDate::from_ymd_opt(2026, 10, 17).unwrap()
    );
    assert_eq!(report.review_expires_on, Some(report.manifest_expires_on));
    assert_eq!(
        report.risk_note_refs,
        ["source-risk.synthetic-official-jobs.coverage"]
    );
}

#[test]
fn source_simulator_blocks_missing_changed_extra_and_duplicate_fixtures() {
    let policy = policy();
    let manifest = parse_source_manifest(MANIFEST, &policy).unwrap();
    let [list, detail, review] = fixtures();

    for fixtures in [
        vec![list, detail],
        vec![(LIST_PATH, b"{}".as_slice()), detail, review],
        vec![list, detail, review, ("extra.json", b"{}".as_slice())],
        vec![list, list, review],
    ] {
        assert_eq!(
            manifest
                .simulate(
                    &policy,
                    SourceOperation::ScheduledCheck,
                    NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
                    SourceGrantState::NotRequired,
                    &fixtures,
                )
                .unwrap()
                .decision,
            SourceActionDecision::Blocked(SourceStopCondition::ParserDrift)
        );
    }
}
