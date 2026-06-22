use super::*;

#[test]
fn test_detect_greenhouse() {
    assert_eq!(
        AtsDetector::detect_from_url("https://boards.greenhouse.io/company/jobs/123"),
        AtsPlatform::Greenhouse
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://greenhouse.io/company"),
        AtsPlatform::Greenhouse
    );
}

#[test]
fn test_detect_lever() {
    assert_eq!(
        AtsDetector::detect_from_url("https://jobs.lever.co/company/abc-123-def"),
        AtsPlatform::Lever
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://www.lever.co/careers"),
        AtsPlatform::Lever
    );
}

#[test]
fn test_detect_workday() {
    assert_eq!(
        AtsDetector::detect_from_url("https://company.wd1.myworkdayjobs.com/en-US/Careers/job/123"),
        AtsPlatform::Workday
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://workday.com/company/job/12345"),
        AtsPlatform::Workday
    );
}

#[test]
fn test_detect_taleo() {
    assert_eq!(
        AtsDetector::detect_from_url(
            "https://company.taleo.net/careersection/jobdetail.ftl?job=123"
        ),
        AtsPlatform::Taleo
    );
}

#[test]
fn test_detect_icims() {
    assert_eq!(
        AtsDetector::detect_from_url("https://careers.company.icims.com/jobs/12345"),
        AtsPlatform::Icims
    );
}

#[test]
fn test_detect_bamboohr() {
    assert_eq!(
        AtsDetector::detect_from_url("https://company.bamboohr.com/careers/123"),
        AtsPlatform::BambooHr
    );
}

#[test]
fn test_detect_ashby() {
    assert_eq!(
        AtsDetector::detect_from_url("https://jobs.ashbyhq.com/company/abc-123"),
        AtsPlatform::AshbyHq
    );
}

#[test]
fn detects_expanded_source_platform_families() {
    let cases = [
            (
                "https://jobs.smartrecruiters.com/Example/123-product-manager",
                AtsPlatform::SmartRecruiters,
            ),
            ("https://apply.workable.com/example/j/ABC123", AtsPlatform::Workable),
            ("https://example.recruitee.com/o/security-engineer", AtsPlatform::Recruitee),
            ("https://example.breezy.hr/p/abc123", AtsPlatform::BreezyHr),
            ("https://example.applytojob.com/apply/abc123", AtsPlatform::JazzHr),
            (
                "https://jobs.bullhornstaffing.com/job/123",
                AtsPlatform::Bullhorn,
            ),
            ("https://jobs.jobvite.com/example/job/abc123", AtsPlatform::Jobvite),
            ("https://example.teamtailor.com/jobs/123", AtsPlatform::Teamtailor),
            (
                "https://example.successfactors.com/career/job/123",
                AtsPlatform::SuccessFactors,
            ),
            (
                "https://example.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/123",
                AtsPlatform::OracleRecruiting,
            ),
            ("https://jobs.personio.de/example/job/123", AtsPlatform::Personio),
            ("https://www.comeet.com/jobs/example/123", AtsPlatform::Comeet),
            ("https://example.jobylon.com/jobs/123", AtsPlatform::Jobylon),
            (
                "https://careers.microsoft.com/v2/global/en/job/123",
                AtsPlatform::Eightfold,
            ),
            (
                "https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html",
                AtsPlatform::AdpRecruiting,
            ),
            ("https://example.ultipro.com/job/123", AtsPlatform::Ukg),
            ("https://hiring.rippling.com/example/jobs/123", AtsPlatform::Rippling),
            ("https://example.zohorecruit.com/jobs/Careers/123", AtsPlatform::ZohoRecruit),
            ("https://example.freshteam.com/jobs/123", AtsPlatform::Freshteam),
            ("https://example.pinpointhq.com/jobs/123", AtsPlatform::Pinpoint),
            ("https://jobs.jobscore.com/careers/example/jobs/123", AtsPlatform::JobScore),
        ];

    for (url, expected) in cases {
        assert_eq!(AtsDetector::detect_from_url(url), expected, "{url}");
    }
}

#[test]
fn test_detect_unknown() {
    assert_eq!(
        AtsDetector::detect_from_url("https://company.com/careers/job/123"),
        AtsPlatform::Unknown
    );
}

#[test]
fn test_detect_from_url_ignores_query_string_mentions() {
    assert_eq!(
        AtsDetector::detect_from_url(
            "https://example.com/jobs/123?next=https://boards.greenhouse.io/company/jobs/123"
        ),
        AtsPlatform::Unknown
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://example.com/apply?redirect=jobs.lever.co"),
        AtsPlatform::Unknown
    );
}

#[test]
fn test_detect_from_url_rejects_lookalike_hosts() {
    assert_eq!(
        AtsDetector::detect_from_url("https://greenhouse.io.evil.example/jobs/123"),
        AtsPlatform::Unknown
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://notlever.co/jobs/123"),
        AtsPlatform::Unknown
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://jobs.smartrecruiters.com.evil.example/jobs/123"),
        AtsPlatform::Unknown
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://oracle.com/about"),
        AtsPlatform::Unknown
    );
}

#[test]
fn test_detect_from_html() {
    let greenhouse_html = r#"
            <html>
            <body>
                <div id="grnhse_app"></div>
                <script src="https://boards.greenhouse.io/embed.js"></script>
            </body>
            </html>
        "#;

    assert_eq!(
        AtsDetector::detect_from_html(greenhouse_html),
        AtsPlatform::Greenhouse
    );

    let lever_html = r#"
            <html>
            <body>
                <button data-qa="btn-apply">Apply</button>
            </body>
            </html>
        "#;

    assert_eq!(
        AtsDetector::detect_from_html(lever_html),
        AtsPlatform::Lever
    );

    let smartrecruiters_html = r#"
            <html>
              <script src="https://jobs.smartrecruiters.com/widgets"></script>
            </html>
        "#;

    assert_eq!(
        AtsDetector::detect_from_html(smartrecruiters_html),
        AtsPlatform::SmartRecruiters
    );
}

#[test]
fn test_get_common_fields() {
    let fields = AtsDetector::get_common_fields(&AtsPlatform::Greenhouse);
    assert!(fields.contains(&"first_name"));
    assert!(fields.contains(&"email"));

    let workday_fields = AtsDetector::get_common_fields(&AtsPlatform::Workday);
    assert!(workday_fields.contains(&"input-1"));

    let smartrecruiters_fields = AtsDetector::get_common_fields(&AtsPlatform::SmartRecruiters);
    assert!(smartrecruiters_fields.contains(&"firstName"));
    assert!(smartrecruiters_fields.contains(&"resume"));
}

#[test]
fn test_get_automation_notes() {
    let notes = AtsDetector::get_automation_notes(&AtsPlatform::Greenhouse);
    assert!(notes.contains("iframe"));
    assert!(notes.contains("grnhse_app"));
}

#[test]
fn platform_string_roundtrip_covers_expanded_platforms() {
    let platforms = [
        AtsPlatform::Greenhouse,
        AtsPlatform::Lever,
        AtsPlatform::Workday,
        AtsPlatform::SmartRecruiters,
        AtsPlatform::Workable,
        AtsPlatform::Recruitee,
        AtsPlatform::Taleo,
        AtsPlatform::Icims,
        AtsPlatform::BambooHr,
        AtsPlatform::AshbyHq,
        AtsPlatform::BreezyHr,
        AtsPlatform::JazzHr,
        AtsPlatform::Bullhorn,
        AtsPlatform::Jobvite,
        AtsPlatform::Teamtailor,
        AtsPlatform::SuccessFactors,
        AtsPlatform::OracleRecruiting,
        AtsPlatform::Phenom,
        AtsPlatform::Personio,
        AtsPlatform::Comeet,
        AtsPlatform::Jobylon,
        AtsPlatform::Eightfold,
        AtsPlatform::AdpRecruiting,
        AtsPlatform::Ukg,
        AtsPlatform::Rippling,
        AtsPlatform::ZohoRecruit,
        AtsPlatform::Freshteam,
        AtsPlatform::Pinpoint,
        AtsPlatform::JobScore,
    ];

    for platform in platforms {
        assert_eq!(AtsPlatform::from_str(platform.as_str()), platform);
    }
}
