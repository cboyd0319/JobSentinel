use super::*;

#[test]
fn test_seniority_from_negative_years() {
    assert_eq!(
        SeniorityLevel::from_years_of_experience(-5),
        SeniorityLevel::Principal
    );
    assert_eq!(
        SeniorityLevel::from_years_of_experience(-1),
        SeniorityLevel::Principal
    );
}

#[test]
fn test_seniority_from_title_with_unicode() {
    assert_eq!(
        SeniorityLevel::from_job_title("Senior Case Manager™"),
        SeniorityLevel::Senior
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Principal Analýst"),
        SeniorityLevel::Principal
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Júnior Coordinator"),
        SeniorityLevel::Mid
    );
}

#[test]
fn test_seniority_from_title_multiple_keywords() {
    assert_eq!(
        SeniorityLevel::from_job_title("Principal Staff Coordinator"),
        SeniorityLevel::Principal
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Senior Lead Architect"),
        SeniorityLevel::Staff
    );
    assert_eq!(
        SeniorityLevel::from_job_title("Staff Senior Coordinator"),
        SeniorityLevel::Staff
    );
}
