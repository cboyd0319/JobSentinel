use chrono::Utc;

use crate::core::{
    calculate_job_hash, db::Database, url_security::canonicalize_user_supplied_job_url, Job,
};

use super::{
    fetcher::fetch_job_page,
    pending::PendingUrlImports,
    salary::parse_schema_org_salary,
    schema_org::{create_preview, parse_schema_org_job_posting},
    types::{ImportError, ImportResult, ImportedJobSummary, JobImportPreview, SchemaOrgJobPosting},
};

pub async fn preview_job_import(
    database: &Database,
    pending: &PendingUrlImports,
    url: &str,
) -> ImportResult<JobImportPreview> {
    let canonical_url = canonicalize_user_supplied_job_url(url).map_err(ImportError::InvalidUrl)?;
    let html = fetch_job_page(&canonical_url).await?;
    preview_job_from_html(database, pending, canonical_url, &html).await
}

pub async fn confirm_job_import(
    database: &Database,
    pending: &PendingUrlImports,
    import_id: &str,
) -> ImportResult<ImportedJobSummary> {
    let now = Utc::now();
    let job = pending
        .find(import_id, now)
        .ok_or(ImportError::PendingImportNotFound)?;

    match database
        .insert_job_if_new(&job)
        .await
        .map_err(database_error)?
    {
        Some(job_id) => {
            pending.remove(import_id);
            tracing::info!(
                job_id,
                title_chars = job.title.chars().count(),
                company_chars = job.company.chars().count(),
                "Reviewed job import saved"
            );
            Ok(ImportedJobSummary { job_id })
        }
        None => {
            pending.remove(import_id);
            Err(ImportError::AlreadyExists)
        }
    }
}

async fn preview_job_from_html(
    database: &Database,
    pending: &PendingUrlImports,
    canonical_url: String,
    html: &str,
) -> ImportResult<JobImportPreview> {
    let posting = parse_single_job_posting(html)?;
    let mut preview = create_preview(&posting, canonical_url, false)?;
    if !preview.is_valid() {
        return Ok(preview);
    }

    let job = job_from_posting(&posting, &preview)?;
    preview.already_exists = database
        .job_exists_by_hash(&job.hash)
        .await
        .map_err(database_error)?;
    if !preview.already_exists {
        preview.import_id = Some(pending.queue(job, Utc::now()));
    }

    Ok(preview)
}

fn parse_single_job_posting(html: &str) -> ImportResult<SchemaOrgJobPosting> {
    let mut postings = parse_schema_org_job_posting(html)?;
    if postings.len() != 1 {
        return Err(ImportError::MultipleJobPostings(postings.len()));
    }
    Ok(postings.remove(0))
}

fn job_from_posting(
    posting: &SchemaOrgJobPosting,
    preview: &JobImportPreview,
) -> ImportResult<Job> {
    if !preview.is_valid() {
        let field = preview
            .missing_fields
            .first()
            .cloned()
            .unwrap_or_else(|| "job details".to_string());
        return Err(ImportError::MissingRequiredField { field });
    }

    let (salary_min, salary_max, currency) = parse_schema_org_salary(&posting.base_salary)
        .map(|salary| {
            let (min, max) = salary.annual_bounds();
            (min, max, salary.currency())
        })
        .unwrap_or((None, None, None));
    let discovered_at = Utc::now();
    let created_at = preview.date_posted.unwrap_or(discovered_at);
    let description = posting
        .description
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let hash = calculate_job_hash(
        &preview.company,
        &preview.title,
        preview.location.as_deref(),
        &preview.url,
    );

    Ok(Job {
        id: 0,
        hash,
        title: preview.title.clone(),
        company: preview.company.clone(),
        url: preview.url.clone(),
        location: preview.location.clone(),
        description,
        score: None,
        score_reasons: None,
        source: "import".to_string(),
        remote: Some(preview.remote),
        salary_min,
        salary_max,
        currency,
        created_at,
        updated_at: discovered_at,
        last_seen: discovered_at,
        times_seen: 1,
        immediate_alert_sent: false,
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: Some(discovered_at),
        repost_count: 0,
    })
}

fn database_error(error: sqlx::Error) -> ImportError {
    ImportError::DatabaseError(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const JOB_HTML: &str = r#"
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": " Office Manager ",
            "description": "Coordinate office operations and support staff.",
            "hiringOrganization": {"name": " Example Services "},
            "jobLocation": {"address": {"addressLocality": "Denver", "addressRegion": "CO"}},
            "baseSalary": {"currency": "USD", "value": {"minValue": 25, "maxValue": 30, "unitText": "HOUR"}},
            "datePosted": "2026-07-01T00:00:00Z"
        }
        </script>
    "#;

    async fn database() -> Database {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        database
    }

    #[tokio::test]
    async fn preview_stages_and_confirm_saves_the_reviewed_job() {
        let database = database().await;
        let pending = PendingUrlImports::default();
        let preview = preview_job_from_html(
            &database,
            &pending,
            "https://example.com/jobs/office-manager?query=care".to_string(),
            JOB_HTML,
        )
        .await
        .unwrap();

        assert_eq!(preview.title, "Office Manager");
        assert_eq!(preview.company, "Example Services");
        assert_eq!(preview.location.as_deref(), Some("Denver, CO"));
        assert_eq!(preview.salary.as_deref(), Some("USD 25-30 per hour"));
        let import_id = preview.import_id.expect("valid preview should be staged");

        let saved = confirm_job_import(&database, &pending, &import_id)
            .await
            .unwrap();
        let job = database.get_job_by_id(saved.job_id).await.unwrap().unwrap();
        assert_eq!(job.title, "Office Manager");
        assert_eq!(job.salary_min, Some(52_000));
        assert_eq!(job.salary_max, Some(62_400));
        assert_eq!(job.times_seen, 1);
    }

    #[tokio::test]
    async fn preview_marks_existing_jobs_without_staging_them() {
        let database = database().await;
        let pending = PendingUrlImports::default();
        let first = preview_job_from_html(
            &database,
            &pending,
            "https://example.com/jobs/office-manager".to_string(),
            JOB_HTML,
        )
        .await
        .unwrap();
        confirm_job_import(&database, &pending, first.import_id.as_deref().unwrap())
            .await
            .unwrap();

        let duplicate = preview_job_from_html(
            &database,
            &pending,
            "https://example.com/jobs/office-manager".to_string(),
            JOB_HTML,
        )
        .await
        .unwrap();

        assert!(duplicate.already_exists);
        assert!(duplicate.import_id.is_none());
    }

    #[tokio::test]
    async fn confirmation_reports_a_duplicate_created_after_preview() {
        let database = database().await;
        let pending = PendingUrlImports::default();
        let preview = preview_job_from_html(
            &database,
            &pending,
            "https://example.com/jobs/office-manager".to_string(),
            JOB_HTML,
        )
        .await
        .unwrap();
        let import_id = preview.import_id.unwrap();
        let staged = pending.find(&import_id, Utc::now()).unwrap();
        database.insert_job_if_new(&staged).await.unwrap().unwrap();

        let result = confirm_job_import(&database, &pending, &import_id).await;

        assert!(matches!(result, Err(ImportError::AlreadyExists)));
        assert!(pending.find(&import_id, Utc::now()).is_none());
    }

    #[tokio::test]
    async fn preview_does_not_mask_database_failures() {
        let database = database().await;
        database.pool().close().await;

        let result = preview_job_from_html(
            &database,
            &PendingUrlImports::default(),
            "https://example.com/jobs/office-manager".to_string(),
            JOB_HTML,
        )
        .await;

        assert!(matches!(result, Err(ImportError::DatabaseError(_))));
    }

    #[test]
    fn multiple_job_postings_require_a_more_specific_page() {
        let html = format!("{JOB_HTML}{JOB_HTML}");
        let result = parse_single_job_posting(&html);

        assert!(matches!(result, Err(ImportError::MultipleJobPostings(2))));
    }
}
