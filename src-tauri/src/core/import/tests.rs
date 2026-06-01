//! Tests for the import module

#[cfg(test)]
mod tests {
    use super::super::*;

    const SAMPLE_SCHEMA_ORG_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head>
    <title>Customer Support Lead at Example Services</title>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Customer Support Lead",
        "description": "We are looking for a customer support lead to coordinate service requests.",
        "hiringOrganization": {
            "@type": "Organization",
            "name": "Example Services",
            "logo": "https://example.com/logo.png"
        },
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Chicago",
                "addressRegion": "IL",
                "addressCountry": "US"
            }
        },
        "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": {
                "@type": "QuantitativeValue",
                "minValue": 45000,
                "maxValue": 65000
            }
        },
        "employmentType": "FULL_TIME",
        "datePosted": "2024-01-15T00:00:00Z",
        "validThrough": "2024-03-15T00:00:00Z",
        "jobLocationType": "TELECOMMUTE"
    }
    </script>
</head>
<body>
    <h1>Customer Support Lead</h1>
    <p>Example Services is hiring!</p>
</body>
</html>
"#;

    #[test]
    fn test_parse_schema_org_simple() {
        let result = parse_schema_org_job_posting(SAMPLE_SCHEMA_ORG_HTML);
        assert!(
            result.is_ok(),
            "Failed to parse Schema.org data: {:?}",
            result
        );

        let postings = result.unwrap();
        assert_eq!(postings.len(), 1);

        let posting = &postings[0];
        assert_eq!(posting.title.as_deref(), Some("Customer Support Lead"));
        assert!(posting.hiring_organization.is_some());
        assert_eq!(
            posting
                .hiring_organization
                .as_ref()
                .unwrap()
                .name
                .as_deref(),
            Some("Example Services")
        );
    }

    #[test]
    fn test_parse_schema_org_no_data() {
        let html = "<html><body>No Schema.org data here</body></html>";
        let result = parse_schema_org_job_posting(html);
        assert!(matches!(result, Err(ImportError::NoSchemaOrgData)));
    }

    #[test]
    fn test_create_preview() {
        let posting = SchemaOrgJobPosting {
            title: Some("Customer Support Lead".to_string()),
            description: Some(
                "We are looking for a customer support lead to coordinate service requests."
                    .to_string(),
            ),
            hiring_organization: Some(types::HiringOrganization {
                name: Some("Example Services".to_string()),
                logo: None,
                same_as: None,
            }),
            job_location: Some(serde_json::json!({
                "address": {
                    "addressLocality": "Chicago",
                    "addressRegion": "IL"
                }
            })),
            base_salary: Some(serde_json::json!({
                "currency": "USD",
                "value": {
                    "minValue": 45000,
                    "maxValue": 65000
                }
            })),
            date_posted: Some("2024-01-15T00:00:00Z".to_string()),
            valid_through: None,
            employment_type: Some(serde_json::json!("FULL_TIME")),
            direct_apply: None,
            url: None,
            industry: None,
            occupational_category: None,
            qualifications: None,
            responsibilities: None,
            benefits: None,
            job_location_type: Some("TELECOMMUTE".to_string()),
        };

        let preview =
            schema_org::create_preview(&posting, "https://example.com/jobs/1".to_string(), false);

        assert!(preview.is_ok(), "Failed to create preview: {:?}", preview);

        let preview = preview.unwrap();
        assert_eq!(preview.title, "Customer Support Lead");
        assert_eq!(preview.company, "Example Services");
        assert_eq!(preview.url, "https://example.com/jobs/1");
        assert!(preview.remote);
        assert_eq!(preview.location, Some("Chicago, IL".to_string()));
        assert!(preview.missing_fields.is_empty());
    }

    #[test]
    fn test_create_preview_missing_fields() {
        let posting = SchemaOrgJobPosting {
            title: None, // Missing required field
            description: Some("Description".to_string()),
            hiring_organization: Some(types::HiringOrganization {
                name: Some("Example Corp".to_string()),
                logo: None,
                same_as: None,
            }),
            job_location: None,
            base_salary: None,
            date_posted: None,
            valid_through: None,
            employment_type: None,
            direct_apply: None,
            url: None,
            industry: None,
            occupational_category: None,
            qualifications: None,
            responsibilities: None,
            benefits: None,
            job_location_type: None,
        };

        let preview =
            schema_org::create_preview(&posting, "https://example.com/jobs/1".to_string(), false);

        assert!(preview.is_ok());
        let preview = preview.unwrap();
        assert!(!preview.is_valid());
        assert!(preview.missing_fields.contains(&"title".to_string()));
    }

    #[test]
    fn test_parse_multiple_employment_types() {
        let html = r#"
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Program Coordinator",
            "hiringOrganization": {"name": "FreshMart"},
            "employmentType": ["FULL_TIME", "PART_TIME"]
        }
        </script>
        "#;

        let result = parse_schema_org_job_posting(html);
        assert!(result.is_ok());

        let postings = result.unwrap();
        assert_eq!(postings.len(), 1);
    }
}
