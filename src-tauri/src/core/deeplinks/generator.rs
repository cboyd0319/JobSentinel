//! Deep Link URL Generator
//!
//! Generates pre-filled search URLs for job sites.

use super::sites::{get_all_sites, get_site_by_id};
use super::types::{DeepLink, JobType, RemoteType, SearchCriteria};
use anyhow::{Context, Result};
use std::borrow::Cow;
use url::Url;
use urlencoding::encode;

/// Generate deep links for all supported sites
pub fn generate_all_links(criteria: &SearchCriteria) -> Result<Vec<DeepLink>> {
    let query = criteria.query.trim();
    let portal_url = criteria
        .governmentjobs_portal_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    if query.is_empty() && portal_url.is_none() {
        anyhow::bail!("Provide keywords, or a GovernmentJobs portal URL for an area-only tracker");
    }

    let sites = if query.is_empty() {
        get_all_sites()
            .into_iter()
            .filter(|site| site.id == "governmentjobs")
            .collect()
    } else {
        get_all_sites()
    };
    let mut links = Vec::with_capacity(sites.len());

    for site in sites {
        if let Ok(url) = generate_url_for_site(&site.id, criteria) {
            links.push(DeepLink { site, url });
        }
    }

    Ok(links)
}

/// Generate deep link for a specific site
pub fn generate_link_for_site(site_id: &str, criteria: &SearchCriteria) -> Result<DeepLink> {
    let site = get_site_by_id(site_id).with_context(|| format!("Unknown site ID: {}", site_id))?;

    let url = generate_url_for_site(site_id, criteria)?;

    Ok(DeepLink { site, url })
}

/// Generate URL for a specific site
fn generate_url_for_site(site_id: &str, criteria: &SearchCriteria) -> Result<String> {
    match site_id {
        "indeed" => generate_indeed_url(criteria),
        "linkedin" => generate_linkedin_url(criteria),
        "glassdoor" => generate_glassdoor_url(criteria),
        "monster" => generate_monster_url(criteria),
        "careerbuilder" => generate_careerbuilder_url(criteria),
        "simplyhired" => generate_simplyhired_url(criteria),
        "ziprecruiter" => generate_ziprecruiter_url(criteria),
        "dice" => generate_dice_url(criteria),
        "stackoverflow" => generate_stackoverflow_url(criteria),
        "usajobs" => generate_usajobs_url(criteria),
        "governmentjobs" => generate_governmentjobs_url(criteria),
        "cajobs" => generate_cajobs_url(criteria),
        "texasjobs" => generate_texasjobs_url(criteria),
        "clearancejobs" => generate_clearancejobs_url(criteria),
        "flexjobs" => generate_flexjobs_url(criteria),
        "weworkremotely" => generate_weworkremotely_url(criteria),
        "remoteok" => generate_remoteok_url(criteria),
        "wellfound" => generate_wellfound_url(criteria),
        "ycombinator" => generate_ycombinator_url(criteria),
        _ => anyhow::bail!("Unsupported site: {}", site_id),
    }
}

// URL generators for each site

fn generate_indeed_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!("https://www.indeed.com/jobs?q={}", encode(&criteria.query));

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&l={}", encode(location)));
    }

    if let Some(job_type) = criteria.job_type {
        let jt = match job_type {
            JobType::FullTime => "fulltime",
            JobType::PartTime => "parttime",
            JobType::Contract => "contract",
            JobType::Temporary => "temporary",
            JobType::Internship => "internship",
            _ => "",
        };
        if !jt.is_empty() {
            url.push_str(&format!("&jt={}", jt));
        }
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11");
    }

    Ok(url)
}

fn generate_linkedin_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.linkedin.com/jobs/search/?keywords={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    // LinkedIn uses f_JT for job type
    if let Some(job_type) = criteria.job_type {
        let f_jt = match job_type {
            JobType::FullTime => "F",
            JobType::PartTime => "P",
            JobType::Contract => "C",
            JobType::Temporary => "T",
            JobType::Internship => "I",
            _ => "",
        };
        if !f_jt.is_empty() {
            url.push_str(&format!("&f_JT={}", f_jt));
        }
    }

    // LinkedIn uses f_WT for remote
    if let Some(remote_type) = criteria.remote_type {
        let f_wt = match remote_type {
            RemoteType::Remote => "2",
            RemoteType::Hybrid => "3",
            RemoteType::Onsite => "1",
        };
        url.push_str(&format!("&f_WT={}", f_wt));
    }

    Ok(url)
}

fn generate_glassdoor_url(criteria: &SearchCriteria) -> Result<String> {
    let url = format!(
        "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={}",
        encode(&criteria.query)
    );

    // Note: Glassdoor location requires location ID lookup, which we can't do
    // without an API. Users can manually set location on the site.

    Ok(url)
}

fn generate_monster_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.monster.com/jobs/search?q={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&where={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&jobtype=WORK_FROM_HOME");
    }

    Ok(url)
}

fn generate_careerbuilder_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.careerbuilder.com/jobs?keywords={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&emp=JTFT,JTFR");
    }

    Ok(url)
}

fn generate_simplyhired_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.simplyhired.com/search?q={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&l={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&job=z-remote");
    }

    Ok(url)
}

fn generate_ziprecruiter_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.ziprecruiter.com/jobs-search?search={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&refine_by_location_type=only_remote");
    }

    Ok(url)
}

fn generate_dice_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!("https://www.dice.com/jobs?q={}", encode(&criteria.query));

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&filters.isRemote=true");
    }

    Ok(url)
}

fn generate_stackoverflow_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://stackoverflow.com/jobs?q={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&l={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&r=true");
    }

    Ok(url)
}

fn generate_usajobs_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.usajobs.gov/Search/Results?k={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&l={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&p=1"); // Page 1, remote filter applied in UI
    }

    Ok(url)
}

fn generate_governmentjobs_url(criteria: &SearchCriteria) -> Result<String> {
    let query = criteria.query.trim();
    let location = criteria
        .location
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    if let Some(portal_url) = criteria
        .governmentjobs_portal_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let mut url = normalize_governmentjobs_portal_url(portal_url)?;
        let mut has_params = false;

        if !query.is_empty() {
            push_query_param(&mut url, &mut has_params, "keywords", query);
        }

        if let Some(location) = location {
            push_query_param(&mut url, &mut has_params, "location[0]", location);
        }

        if has_params {
            push_query_param(
                &mut url,
                &mut has_params,
                "pagetype",
                "jobOpportunitiesJobs",
            );
        }

        return Ok(url);
    }

    if query.is_empty() {
        anyhow::bail!("GovernmentJobs searches need keywords or a careers portal URL");
    }

    let mut url = format!(
        "https://www.governmentjobs.com/jobs?keyword={}",
        encode(query)
    );

    if let Some(location) = location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    Ok(url)
}

fn generate_cajobs_url(criteria: &SearchCriteria) -> Result<String> {
    let url = format!(
        "https://www.calcareers.ca.gov/CalHrPublic/Jobs/JobPosting.aspx?searchStr={}",
        encode(&criteria.query)
    );

    Ok(url)
}

fn generate_texasjobs_url(criteria: &SearchCriteria) -> Result<String> {
    let url = format!(
        "https://capps.taleo.net/careersection/ex/jobsearch.ftl?lang=en&keyword={}",
        encode(&criteria.query)
    );

    Ok(url)
}

fn generate_clearancejobs_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.clearancejobs.com/jobs?keywords={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    Ok(url)
}

fn generate_flexjobs_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://www.flexjobs.com/search?search={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    Ok(url)
}

fn generate_weworkremotely_url(criteria: &SearchCriteria) -> Result<String> {
    let url = format!(
        "https://weworkremotely.com/remote-jobs/search?term={}",
        encode(&criteria.query)
    );

    Ok(url)
}

fn generate_remoteok_url(criteria: &SearchCriteria) -> Result<String> {
    let url = format!(
        "https://remoteok.com/remote-jobs?search={}",
        encode(&criteria.query)
    );

    Ok(url)
}

fn generate_wellfound_url(criteria: &SearchCriteria) -> Result<String> {
    let mut url = format!(
        "https://wellfound.com/jobs?keywords={}",
        encode(&criteria.query)
    );

    if let Some(location) = &criteria.location {
        url.push_str(&format!("&location={}", encode(location)));
    }

    if criteria.remote_type == Some(RemoteType::Remote) {
        url.push_str("&remote=true");
    }

    Ok(url)
}

fn generate_ycombinator_url(criteria: &SearchCriteria) -> Result<String> {
    let url = format!(
        "https://www.ycombinator.com/jobs?q={}",
        encode(&criteria.query)
    );

    Ok(url)
}

fn normalize_governmentjobs_portal_url(portal_url: &str) -> Result<String> {
    let candidate = if portal_url.starts_with("http://") || portal_url.starts_with("https://") {
        portal_url.to_string()
    } else if portal_url.starts_with("careers/") {
        format!("https://www.governmentjobs.com/{}", portal_url.trim_start_matches('/'))
    } else {
        format!(
            "https://www.governmentjobs.com/careers/{}",
            portal_url.trim_matches('/')
        )
    };

    let parsed = Url::parse(&candidate)
        .with_context(|| format!("Invalid GovernmentJobs portal URL: {}", portal_url))?;

    if parsed.scheme() != "https" {
        anyhow::bail!("GovernmentJobs portal URLs must use https");
    }

    match parsed.host_str() {
        Some("governmentjobs.com" | "www.governmentjobs.com") => {}
        _ => anyhow::bail!("GovernmentJobs portal URLs must use governmentjobs.com"),
    }

    let path = parsed.path().trim_end_matches('/');
    if !path.starts_with("/careers/") || path == "/careers" {
        anyhow::bail!("GovernmentJobs portal URLs must point to a /careers/<portal> path");
    }

    Ok(format!("https://www.governmentjobs.com{}", path))
}

fn push_query_param(url: &mut String, has_params: &mut bool, key: &str, value: &str) {
    url.push(if *has_params { '&' } else { '?' });
    url.push_str(key);
    url.push('=');
    url.push_str(&encode(value));
    *has_params = true;
}

/// URL-encode helper for locations with special characters
#[allow(dead_code)]
fn normalize_location(location: &str) -> Cow<'_, str> {
    let trimmed = location.trim();
    if trimmed.is_empty() {
        return Cow::Borrowed("");
    }

    // Common remote variants
    if trimmed.eq_ignore_ascii_case("remote")
        || trimmed.eq_ignore_ascii_case("anywhere")
        || trimmed.eq_ignore_ascii_case("work from home")
    {
        return Cow::Borrowed("remote");
    }

    Cow::Borrowed(trimmed)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_basic_criteria() -> SearchCriteria {
        SearchCriteria {
            query: "Software Engineer".to_string(),
            location: Some("San Francisco, CA".to_string()),
            governmentjobs_portal_url: None,
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
        assert!(url.contains("Software%20Engineer"));
        assert!(url.contains("San%20Francisco"));
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
        assert!(url.contains("keywords=Software%20Engineer"));
        assert!(url.contains("location=San%20Francisco"));
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
            query: "Senior Software Engineer (C++)".to_string(),
            location: Some("New York, NY".to_string()),
            governmentjobs_portal_url: None,
            experience_level: None,
            job_type: None,
            remote_type: None,
        };

        let url = generate_indeed_url(&criteria).unwrap();
        assert!(url.contains("Senior%20Software%20Engineer"));
        assert!(url.contains("New%20York"));
    }

    #[test]
    fn test_normalize_location_remote_variants() {
        assert_eq!(normalize_location("remote"), "remote");
        assert_eq!(normalize_location("Remote"), "remote");
        assert_eq!(normalize_location("REMOTE"), "remote");
        assert_eq!(normalize_location("anywhere"), "remote");
        assert_eq!(normalize_location("work from home"), "remote");
    }

    #[test]
    fn test_normalize_location_empty() {
        assert_eq!(normalize_location(""), "");
        assert_eq!(normalize_location("   "), "");
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

    #[test]
    fn test_generate_governmentjobs_url_generic_search() {
        let criteria = create_basic_criteria();
        let url = generate_governmentjobs_url(&criteria).unwrap();
        assert_eq!(
            url,
            "https://www.governmentjobs.com/jobs?keyword=Software%20Engineer&location=San%20Francisco%2C%20CA"
        );
    }

    #[test]
    fn test_generate_governmentjobs_url_scoped_portal_with_keywords_and_location() {
        let mut criteria = create_basic_criteria();
        criteria.governmentjobs_portal_url = Some("pabureau".to_string());
        criteria.location = Some("Luzerne County".to_string());

        let url = generate_governmentjobs_url(&criteria).unwrap();
        assert_eq!(
            url,
            "https://www.governmentjobs.com/careers/pabureau?keywords=Software%20Engineer&location[0]=Luzerne%20County&pagetype=jobOpportunitiesJobs"
        );
    }

    #[test]
    fn test_generate_governmentjobs_url_scoped_portal_only() {
        let mut criteria = create_basic_criteria();
        criteria.query.clear();
        criteria.location = None;
        criteria.governmentjobs_portal_url =
            Some("https://www.governmentjobs.com/careers/pabureau".to_string());

        let url = generate_governmentjobs_url(&criteria).unwrap();
        assert_eq!(url, "https://www.governmentjobs.com/careers/pabureau");
    }

    #[test]
    fn test_generate_governmentjobs_url_scoped_portal_area_only() {
        let mut criteria = create_basic_criteria();
        criteria.query.clear();
        criteria.location = Some("PA".to_string());
        criteria.governmentjobs_portal_url = Some("careers/pabureau".to_string());

        let url = generate_governmentjobs_url(&criteria).unwrap();
        assert_eq!(
            url,
            "https://www.governmentjobs.com/careers/pabureau?location[0]=PA&pagetype=jobOpportunitiesJobs"
        );
    }

    #[test]
    fn test_generate_governmentjobs_url_rejects_invalid_portal_url() {
        let mut criteria = create_basic_criteria();
        criteria.governmentjobs_portal_url = Some("https://example.com/careers/pabureau".to_string());

        let error = generate_governmentjobs_url(&criteria).unwrap_err().to_string();
        assert!(error.contains("governmentjobs.com"));
    }

    #[test]
    fn test_generate_all_links_with_area_only_governmentjobs_tracker() {
        let criteria = SearchCriteria {
            query: String::new(),
            location: None,
            governmentjobs_portal_url: Some("pabureau".to_string()),
            experience_level: None,
            job_type: None,
            remote_type: None,
        };

        let links = generate_all_links(&criteria).unwrap();
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].site.id, "governmentjobs");
        assert_eq!(links[0].url, "https://www.governmentjobs.com/careers/pabureau");
    }
}
