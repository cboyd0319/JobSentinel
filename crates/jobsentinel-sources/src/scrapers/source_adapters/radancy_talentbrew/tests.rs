use super::*;

fn source() -> SyscoRadancySource {
    SyscoRadancySource {
        rank: 56,
        company: "Sysco".to_string(),
        careers_url: "https://careers.sysco.com/en".to_string(),
        search_url: "https://careers.sysco.com/en/search-jobs".to_string(),
        detail_url: Some(
            "https://careers.sysco.com/en/job/knoxville/new-business-developer/1105/96011044768"
                .to_string(),
        ),
    }
}

#[test]
fn request_url_and_cache_key_match_search_contract() {
    let mut request = SyscoRadancyRequest::new("https://careers.sysco.com/en/search-jobs");
    assert_eq!(request.url(), "https://careers.sysco.com/en/search-jobs");
    assert!(request
        .cache_key()
        .starts_with("sysco-radancy:careers.sysco.com:/en/search-jobs:"));

    request.page = 2;
    request.keyword = "driver".to_string();
    assert_eq!(
        request.url(),
        "https://careers.sysco.com/en/search-jobs?k=driver&p=2"
    );
}

#[test]
fn parses_sysco_radancy_listing_rows_and_metadata() {
    let request = SyscoRadancyRequest::new("https://careers.sysco.com/en/search-jobs");
    let html = r#"
        <html>
          <head><title>Search Jobs - Sysco</title></head>
          <body>
            <section id="search-results" data-current-page="1" data-records-per-page="15"
              data-total-results="1289" data-total-job-results="1289" data-total-pages="86"
              data-keywords="" data-search-type="external" data-results-type="jobs">
              <a href="/en/job/knoxville/new-business-developer/1105/96011044768" data-job-id="96011044768">
                <h2>New Business Developer</h2>
                <span class="job-location">Knoxville, TN</span>
              </a>
              <a href="https://careers.sysco.com/en/job/farmington/cdl-a-local-delivery-truck-driver/1105/96670296992?token=secret">
                <h2>CDL A Local Delivery Truck Driver</h2>
                <span class="job-location">Farmington, NM</span>
              </a>
            </section>
          </body>
        </html>
    "#;

    let listing = parse_sysco_radancy_listing(html, &source(), &request);

    assert_eq!(listing.page_title, "Search Jobs - Sysco");
    assert_eq!(listing.metadata.current_page, Some(1));
    assert_eq!(listing.metadata.total_job_results, Some(1289));
    assert_eq!(listing.jobs.len(), 2);
    assert!(listing.parse_warnings.is_empty());
    assert_eq!(listing.jobs[0].source_job_id, "96011044768");
    assert_eq!(listing.jobs[0].dedupe_key, "sysco-radancy:96011044768");
    assert_eq!(listing.jobs[0].location.as_deref(), Some("Knoxville, TN"));
    assert_eq!(
        listing.jobs[1].url,
        "https://careers.sysco.com/en/job/farmington/cdl-a-local-delivery-truck-driver/1105/96670296992?token=%5BREDACTED%5D"
    );
    assert!(listing.jobs.iter().all(|job| job.validate().is_empty()));
}

#[test]
fn parses_detail_json_ld_without_fetching_workday_apply_target() {
    let html = r#"
        <html>
          <head>
            <title>New Business Developer</title>
            <script type="application/ld+json">
              {
                "@type": "JobPosting",
                "title": "New Business Developer",
                "identifier": {"value": "96011044768"},
                "url": "https://careers.sysco.com/en/job/knoxville/new-business-developer/1105/96011044768",
                "datePosted": "2026-06-19",
                "hiringOrganization": {"name": "Sysco"},
                "description": "Sales role",
                "baseSalary": {"@type": "MonetaryAmount"}
              }
            </script>
          </head>
          <body>
            <a href="https://wd5.myworkdaysite.com/sysco/apply/96011044768?token=secret">Apply</a>
          </body>
        </html>
    "#;

    let detail = parse_sysco_radancy_detail(html);

    assert_eq!(detail.page_title, "New Business Developer");
    assert!(detail.parse_warnings.is_empty());
    assert_eq!(detail.json_ld_jobpostings.len(), 1);
    assert_eq!(
        detail.json_ld_jobpostings[0].identifier.as_deref(),
        Some("96011044768")
    );
    assert!(detail.json_ld_jobpostings[0].description_present);
    assert!(detail.json_ld_jobpostings[0].base_salary_present);
    assert_eq!(
        detail.workday_apply_urls,
        ["https://wd5.myworkdaysite.com/sysco/apply/96011044768?token=%5BREDACTED%5D"]
    );
}
