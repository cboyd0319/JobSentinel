//! Tests for the import module

#[cfg(test)]
mod tests {
    use super::super::*;

    const SAMPLE_SCHEMA_ORG_HTML: &str = r#"
<!DOCTYPE html>
<html>
<head>
    <title>Software Engineer at Example Corp</title>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Software Engineer",
        "description": "We are looking for a talented software engineer to join our team.",
        "hiringOrganization": {
            "@type": "Organization",
            "name": "Example Corp",
            "logo": "https://example.com/logo.png"
        },
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "San Francisco",
                "addressRegion": "CA",
                "addressCountry": "US"
            }
        },
        "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": {
                "@type": "QuantitativeValue",
                "minValue": 100000,
                "maxValue": 150000
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
    <h1>Software Engineer</h1>
    <p>Example Corp is hiring!</p>
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
        assert_eq!(posting.title.as_deref(), Some("Software Engineer"));
        assert!(posting.hiring_organization.is_some());
        assert_eq!(
            posting
                .hiring_organization
                .as_ref()
                .unwrap()
                .name
                .as_deref(),
            Some("Example Corp")
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
            title: Some("Software Engineer".to_string()),
            description: Some(
                "We are looking for a talented software engineer to join our team.".to_string(),
            ),
            hiring_organization: Some(types::HiringOrganization {
                name: Some("Example Corp".to_string()),
                logo: None,
                same_as: None,
            }),
            job_location: Some(serde_json::json!({
                "address": {
                    "addressLocality": "San Francisco",
                    "addressRegion": "CA"
                }
            })),
            base_salary: Some(serde_json::json!({
                "currency": "USD",
                "value": {
                    "minValue": 100000,
                    "maxValue": 150000
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
        assert_eq!(preview.title, "Software Engineer");
        assert_eq!(preview.company, "Example Corp");
        assert_eq!(preview.url, "https://example.com/jobs/1");
        assert!(preview.remote);
        assert_eq!(preview.location, Some("San Francisco, CA".to_string()));
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
            "title": "Engineer",
            "hiringOrganization": {"name": "Test Corp"},
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
