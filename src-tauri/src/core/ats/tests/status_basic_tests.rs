use super::*;

// ========================================
// Unit tests (no database required)
// ========================================

#[test]
fn test_application_status_display() {
    assert_eq!(ApplicationStatus::ToApply.to_string(), "to_apply");
    assert_eq!(ApplicationStatus::Applied.to_string(), "applied");
    assert_eq!(
        ApplicationStatus::ScreeningCall.to_string(),
        "screening_call"
    );
    assert_eq!(
        ApplicationStatus::PhoneInterview.to_string(),
        "phone_interview"
    );
    assert_eq!(
        ApplicationStatus::TechnicalInterview.to_string(),
        "technical_interview"
    );
    assert_eq!(
        ApplicationStatus::OnsiteInterview.to_string(),
        "onsite_interview"
    );
    assert_eq!(
        ApplicationStatus::OfferReceived.to_string(),
        "offer_received"
    );
    assert_eq!(
        ApplicationStatus::OfferAccepted.to_string(),
        "offer_accepted"
    );
    assert_eq!(
        ApplicationStatus::OfferRejected.to_string(),
        "offer_rejected"
    );
    assert_eq!(ApplicationStatus::Rejected.to_string(), "rejected");
    assert_eq!(ApplicationStatus::Ghosted.to_string(), "ghosted");
    assert_eq!(ApplicationStatus::Withdrawn.to_string(), "withdrawn");
}

#[test]
fn test_application_status_from_str_valid() {
    assert_eq!(
        "to_apply".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::ToApply
    );
    assert_eq!(
        "applied".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::Applied
    );
    assert_eq!(
        "screening_call".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::ScreeningCall
    );
    assert_eq!(
        "phone_interview".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::PhoneInterview
    );
    assert_eq!(
        "technical_interview".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::TechnicalInterview
    );
    assert_eq!(
        "onsite_interview".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::OnsiteInterview
    );
    assert_eq!(
        "offer_received".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::OfferReceived
    );
    assert_eq!(
        "offer_accepted".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::OfferAccepted
    );
    assert_eq!(
        "offer_rejected".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::OfferRejected
    );
    assert_eq!(
        "rejected".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::Rejected
    );
    assert_eq!(
        "ghosted".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::Ghosted
    );
    assert_eq!(
        "withdrawn".parse::<ApplicationStatus>().unwrap(),
        ApplicationStatus::Withdrawn
    );
}

#[test]
fn test_application_status_from_str_invalid() {
    assert!("invalid".parse::<ApplicationStatus>().is_err());
    assert!("".parse::<ApplicationStatus>().is_err());
    assert!("APPLIED".parse::<ApplicationStatus>().is_err());
}

#[test]
fn test_application_status_roundtrip() {
    let statuses = vec![
        ApplicationStatus::ToApply,
        ApplicationStatus::Applied,
        ApplicationStatus::ScreeningCall,
        ApplicationStatus::PhoneInterview,
        ApplicationStatus::TechnicalInterview,
        ApplicationStatus::OnsiteInterview,
        ApplicationStatus::OfferReceived,
        ApplicationStatus::OfferAccepted,
        ApplicationStatus::OfferRejected,
        ApplicationStatus::Rejected,
        ApplicationStatus::Ghosted,
        ApplicationStatus::Withdrawn,
    ];

    for status in statuses {
        let string = status.to_string();
        let parsed: ApplicationStatus = string.parse().unwrap();
        assert_eq!(status, parsed);
    }
}

#[test]
fn test_applications_by_status_default() {
    let default = ApplicationsByStatus::default();
    assert!(default.to_apply.is_empty());
    assert!(default.applied.is_empty());
    assert!(default.screening_call.is_empty());
    assert!(default.phone_interview.is_empty());
    assert!(default.technical_interview.is_empty());
    assert!(default.onsite_interview.is_empty());
    assert!(default.offer_received.is_empty());
    assert!(default.offer_accepted.is_empty());
    assert!(default.offer_rejected.is_empty());
    assert!(default.rejected.is_empty());
    assert!(default.ghosted.is_empty());
    assert!(default.withdrawn.is_empty());
}
