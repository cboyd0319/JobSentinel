#[test]
fn test_compute_hash_deterministic() {
    let hash1 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Remote Engineer",
        Some("Worldwide"),
        "https://remoteok.com/job/123",
    );
    let hash2 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Remote Engineer",
        Some("Worldwide"),
        "https://remoteok.com/job/123",
    );

    assert_eq!(hash1, hash2);
    assert_eq!(hash1.len(), 64);
}

#[test]
fn test_compute_hash_unique_for_different_inputs() {
    let hash1 = jobsentinel_domain::calculate_job_hash(
        "CompanyA",
        "Engineer",
        Some("Remote"),
        "https://remoteok.com/job/1",
    );
    let hash2 = jobsentinel_domain::calculate_job_hash(
        "CompanyB",
        "Engineer",
        Some("Remote"),
        "https://remoteok.com/job/2",
    );

    assert_ne!(hash1, hash2);
}

#[test]
fn test_compute_hash_with_location_none() {
    let hash = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Developer",
        None,
        "https://remoteok.com/job/1",
    );

    assert_eq!(hash.len(), 64);
}

#[test]
fn test_compute_hash_canonicalizes_remote_location_synonyms() {
    let hash1 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Engineer",
        Some("Remote"),
        "https://example.com/job/1",
    );
    let hash2 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Engineer",
        Some("Worldwide"),
        "https://example.com/job/1",
    );

    assert_eq!(hash1, hash2);
}

#[test]
fn test_compute_hash_location_some_vs_none() {
    let hash1 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Engineer",
        Some("Remote"),
        "https://example.com/job/1",
    );
    let hash2 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Engineer",
        None,
        "https://example.com/job/1",
    );

    // Some(location) vs None should produce different hashes
    assert_ne!(hash1, hash2);
}
