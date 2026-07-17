use super::*;

fn create_basic_criteria() -> SearchCriteria {
    SearchCriteria {
        query: "Customer Support Lead".to_string(),
        location: Some("Chicago, IL".to_string()),
        experience_level: None,
        job_type: None,
        remote_type: None,
    }
}

#[test]
fn test_generate_indeed_url() {
    let criteria = create_basic_criteria();
    let url = generate_indeed_url(&criteria).unwrap();
    assert!(url.contains("indeed.com"));
    assert!(url.contains("Customer%20Support%20Lead"));
    assert!(url.contains("Chicago"));
}

#[test]
fn test_generate_indeed_url_with_remote() {
    let mut criteria = create_basic_criteria();
    criteria.remote_type = Some(RemoteType::Remote);
    let url = generate_indeed_url(&criteria).unwrap();
    assert!(url.contains("remotejob="));
}

#[test]
fn test_generate_linkedin_url() {
    let criteria = create_basic_criteria();
    let url = generate_linkedin_url(&criteria).unwrap();
    assert!(url.contains("linkedin.com"));
    assert!(url.contains("keywords=Customer%20Support%20Lead"));
    assert!(url.contains("location=Chicago"));
}

#[test]
fn test_generate_linkedin_url_with_job_type() {
    let mut criteria = create_basic_criteria();
    criteria.job_type = Some(JobType::FullTime);
    let url = generate_linkedin_url(&criteria).unwrap();
    assert!(url.contains("f_JT=F"));
}

#[test]
fn test_generate_linkedin_url_with_remote() {
    let mut criteria = create_basic_criteria();
    criteria.remote_type = Some(RemoteType::Remote);
    let url = generate_linkedin_url(&criteria).unwrap();
    assert!(url.contains("f_WT=2"));
}

#[test]
fn test_generate_all_links() {
    let criteria = create_basic_criteria();
    let links = generate_all_links(&criteria).unwrap();
    assert!(!links.is_empty());
    assert!(links.len() >= 15);

    // Verify each link has valid URL and site info
    for link in &links {
        assert!(link.url.starts_with("http"));
        assert!(!link.site.name.is_empty());
        assert!(!link.site.id.is_empty());
    }
}

#[test]
fn test_generate_link_for_specific_site() {
    let criteria = create_basic_criteria();
    let link = generate_link_for_site("indeed", &criteria).unwrap();
    assert_eq!(link.site.id, "indeed");
    assert!(link.url.contains("indeed.com"));
}

#[test]
fn test_generate_link_for_unknown_site() {
    let criteria = create_basic_criteria();
    let result = generate_link_for_site("nonexistent", &criteria);
    assert!(result.is_err());
}

#[test]
fn test_url_encoding() {
    let criteria = SearchCriteria {
        query: "Care Coordinator (Bilingual)".to_string(),
        location: Some("Austin, TX".to_string()),
        experience_level: None,
        job_type: None,
        remote_type: None,
    };

    let url = generate_indeed_url(&criteria).unwrap();
    assert!(url.contains("Care%20Coordinator"));
    assert!(url.contains("Austin"));
}

#[test]
fn test_all_site_generators() {
    let criteria = create_basic_criteria();

    // Test that all sites have working generators
    let sites = get_all_sites();
    for site in sites {
        let result = generate_url_for_site(&site.id, &criteria);
        assert!(
            result.is_ok(),
            "Generator for {} failed: {:?}",
            site.id,
            result
        );
    }
}

#[test]
fn test_job_type_filters() {
    let mut criteria = create_basic_criteria();

    let job_types = vec![
        JobType::FullTime,
        JobType::PartTime,
        JobType::Contract,
        JobType::Internship,
    ];

    for jt in job_types {
        criteria.job_type = Some(jt);
        let url = generate_linkedin_url(&criteria).unwrap();
        assert!(url.contains("f_JT="));
    }
}

#[test]
fn test_remote_type_filters() {
    let mut criteria = create_basic_criteria();

    let remote_types = vec![RemoteType::Remote, RemoteType::Hybrid, RemoteType::Onsite];

    for rt in remote_types {
        criteria.remote_type = Some(rt);
        let url = generate_linkedin_url(&criteria).unwrap();
        assert!(url.contains("f_WT="));
    }
}
