use super::*;

fn create_test_job_created_at(days_ago: i64) -> DateTime<Utc> {
    Utc::now() - chrono::Duration::days(days_ago)
}

#[test]
fn test_fresh_job_low_ghost_score() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5); // 5 days ago

    let analysis = detector.analyze(
        "Senior Case Manager",
        Some(
            "We are looking for a Senior Case Manager to join our team. \
             You will coordinate client schedules, document case plans, and manage referrals. \
             Requirements: - 5+ years of experience - Strong documentation skills - Experience with community resources",
        ),
        Some(150000),
        Some(200000),
        Some("San Francisco, CA"),
        Some(false),
        created_at,
        0, // no reposts
        10, // small company
    );

    assert!(
        analysis.score < 0.3,
        "Fresh job with good details should have low ghost score, got {}",
        analysis.score
    );
}

#[test]
fn test_stale_job_increases_score() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(90); // 90 days ago

    let analysis = detector.analyze(
        "Case Manager",
        Some("A normal job description that is reasonably long."),
        None,
        None,
        Some("Remote"),
        Some(true),
        created_at,
        0,
        10,
    );

    assert!(
        analysis.score >= 0.2,
        "90-day old job should have ghost score >= 0.2, got {}",
        analysis.score
    );
    assert!(analysis
        .reasons
        .iter()
        .any(|r| r.category == GhostCategory::Stale));
}

#[test]
fn test_repost_increases_score() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze(
        "Case Manager",
        Some("A normal job description."),
        None,
        None,
        Some("NYC"),
        None,
        created_at,
        5, // reposted 5 times
        10,
    );

    assert!(
        analysis.score >= 0.07,
        "Job reposted 5 times should have increased ghost score, got {}",
        analysis.score
    );
    assert!(analysis
        .reasons
        .iter()
        .any(|r| r.category == GhostCategory::Repost));
}

#[test]
fn test_repost_aging_reduces_weight() {
    let detector = GhostDetector::new(GhostConfig::default());

    // Recent repost (30 days old) - full weight
    let recent_created = create_test_job_created_at(30);
    let recent_analysis = detector.analyze(
        "Case Manager",
        Some("A normal job description."),
        None,
        None,
        Some("NYC"),
        None,
        recent_created,
        5, // reposted 5 times
        10,
    );

    // Old repost (120 days old) - 50% weight
    let old_created = create_test_job_created_at(120);
    let old_analysis = detector.analyze(
        "Case Manager",
        Some("A normal job description."),
        None,
        None,
        Some("NYC"),
        None,
        old_created,
        5, // reposted 5 times
        10,
    );

    // Very old repost (200 days old) - 25% weight
    let very_old_created = create_test_job_created_at(200);
    let very_old_analysis = detector.analyze(
        "Case Manager",
        Some("A normal job description."),
        None,
        None,
        Some("NYC"),
        None,
        very_old_created,
        5, // reposted 5 times
        10,
    );

    // Get repost weights
    let recent_repost_weight = recent_analysis
        .reasons
        .iter()
        .find(|r| r.category == GhostCategory::Repost)
        .map(|r| r.weight)
        .expect("Should have repost reason");

    let old_repost_weight = old_analysis
        .reasons
        .iter()
        .find(|r| r.category == GhostCategory::Repost)
        .map(|r| r.weight)
        .expect("Should have repost reason");

    let very_old_repost_weight = very_old_analysis
        .reasons
        .iter()
        .find(|r| r.category == GhostCategory::Repost)
        .map(|r| r.weight)
        .expect("Should have repost reason");

    // Recent should be highest
    assert!(
        recent_repost_weight > old_repost_weight,
        "Recent repost should have higher weight than old: {} vs {}",
        recent_repost_weight,
        old_repost_weight
    );

    // Old should be higher than very old
    assert!(
        old_repost_weight > very_old_repost_weight,
        "Old repost should have higher weight than very old: {} vs {}",
        old_repost_weight,
        very_old_repost_weight
    );

    // Verify approximate decay factors (allowing for rounding)
    let decay_120 = old_repost_weight / recent_repost_weight;
    let decay_200 = very_old_repost_weight / recent_repost_weight;

    assert!(
        (decay_120 - 0.5).abs() < 0.01,
        "120-day decay should be ~0.5, got {}",
        decay_120
    );
    assert!(
        (decay_200 - 0.25).abs() < 0.01,
        "200-day decay should be ~0.25, got {}",
        decay_200
    );
}

#[test]
fn test_generic_phrases_detected() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze(
        "Case Manager",
        Some(
            "We're looking for a rockstar ninja who can hit the ground running \
             in our fast-paced environment. We work hard play hard and are like a family. \
             Must be a self-starter passionate about making an impact.",
        ),
        None,
        None,
        Some("Remote"),
        Some(true),
        created_at,
        0,
        10,
    );

    assert!(analysis
        .reasons
        .iter()
        .any(|r| r.category == GhostCategory::Generic));
}

#[test]
fn test_vague_title_high_score() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze(
        "Various Positions Available",
        Some("We're hiring for multiple roles. Apply now!"),
        None,
        None,
        None,
        None,
        created_at,
        0,
        10,
    );

    assert!(
        analysis.score >= 0.25,
        "Vague title should have high ghost score, got {}",
        analysis.score
    );
}

#[test]
fn test_unrealistic_requirements() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze(
        "Junior Customer Support Specialist",
        Some("Entry-level position requiring 10+ years of CRM and bilingual support experience."),
        None,
        None,
        Some("NYC"),
        None,
        created_at,
        0,
        10,
    );

    assert!(analysis
        .reasons
        .iter()
        .any(|r| r.category == GhostCategory::Unrealistic));
}

#[test]
fn test_company_with_many_open_jobs() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze(
        "Case Manager",
        Some("A normal job description with good details."),
        Some(100000),
        Some(150000),
        Some("NYC"),
        None,
        created_at,
        0,
        100, // company has 100 open positions
    );

    assert!(analysis
        .reasons
        .iter()
        .any(|r| r.category == GhostCategory::CompanyBehavior));
}

#[test]
fn test_combined_signals_add_up() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(120); // 120 days old

    let analysis = detector.analyze(
        "Various Positions", // vague title
        Some("Fast-paced environment. Work hard play hard. Like a family."), // short + generic
        None,                // no salary
        None,
        None, // no location
        None,
        created_at,
        6,  // reposted 6 times
        60, // many open positions
    );

    assert!(
        analysis.score >= 0.5,
        "Job with multiple ghost signals should have high score, got {}",
        analysis.score
    );
    assert!(
        analysis.reasons.len() >= 3,
        "Should have multiple reasons, got {}",
        analysis.reasons.len()
    );
}

#[test]
fn test_score_capped_at_one() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(200); // very old

    let analysis = detector.analyze(
        "Join Our Team!!!", // vague
        Some(
            "We want passionate rockstars who can hit the ground running in our fast-paced, \
              dynamic environment. We're like a family and work hard play hard!",
        ), // very generic
        None,
        None,
        None,
        None,
        created_at,
        10,  // many reposts
        200, // tons of open positions
    );

    assert!(
        analysis.score <= 1.0,
        "Ghost score should be capped at 1.0, got {}",
        analysis.score
    );
}

#[test]
fn test_confidence_increases_with_data() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    // Minimal data
    let analysis_minimal = detector.analyze(
        "Coordinator",
        Some("Job."),
        None,
        None,
        None,
        None,
        created_at,
        0,
        10,
    );

    // Full data
    let analysis_full = detector.analyze(
        "Senior Case Manager",
        Some(&"x".repeat(600)), // long description
        Some(150000),
        Some(200000),
        Some("NYC"),
        Some(false),
        created_at,
        0,
        10,
    );

    assert!(
        analysis_full.confidence > analysis_minimal.confidence,
        "More data should increase confidence: {} vs {}",
        analysis_full.confidence,
        analysis_minimal.confidence
    );
}

// ==================== ML-Enhanced Tests (v2.5.5) ====================

#[test]
fn test_ml_urgency_detection() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze_enhanced(
        "Case Manager - URGENT",
        Some(
            "We are hiring now! This position is filling fast. Apply today and \
             interview this week. Don't miss this opportunity - act fast!",
        ),
        Some(100000),
        Some(150000),
        Some("NYC"),
        None,
        created_at,
        0,
        10,
    );

    // Should detect urgency patterns
    assert!(
        analysis
            .reasons
            .iter()
            .any(|r| r.description.contains("urgency")),
        "Should detect urgency patterns"
    );
}

#[test]
fn test_ml_promotional_language() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze_enhanced(
        "Amazing Opportunity - Dream Job",
        Some(
            "This is an incredible opportunity at the best company in the industry. \
             Join our world-class team and change your life with unlimited potential. \
             This groundbreaking role offers explosive growth.",
        ),
        Some(100000),
        Some(150000),
        Some("Remote"),
        Some(true),
        created_at,
        0,
        10,
    );

    // Should detect promotional language
    assert!(
        analysis
            .reasons
            .iter()
            .any(|r| r.description.contains("promotional")),
        "Should detect overly promotional language"
    );
}

#[test]
fn test_ml_substance_ratio() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    // Low substance (all fluff)
    let low_substance = detector.analyze_enhanced(
        "Program Coordinator",
        Some(
            "We offer an exciting, dynamic, innovative, cutting-edge opportunity \
             in a vibrant, energetic environment. We're looking for passionate, \
             exceptional candidates to join our world-class team. Competitive \
             salary and outstanding benefits in our state-of-the-art workplace.",
        ),
        None,
        None,
        Some("NYC"),
        None,
        created_at,
        0,
        10,
    );

    // High substance (detailed and specific)
    let high_substance = detector.analyze_enhanced(
        "Senior Case Manager",
        Some(
            "You will coordinate intake schedules, maintain CRM case notes, \
             track referral deadlines, and prepare weekly service reports. \
             Review documentation for accuracy, support partner handoffs, \
             and monitor follow-up timelines for clients.",
        ),
        Some(150000),
        Some(200000),
        Some("NYC"),
        None,
        created_at,
        0,
        10,
    );

    assert!(
        low_substance.score > high_substance.score,
        "Low substance should have higher ghost score: {} vs {}",
        low_substance.score,
        high_substance.score
    );
}

#[test]
fn test_ml_template_matching() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let analysis = detector.analyze_enhanced(
        "Case Manager",
        Some(
            "We are looking for a motivated individual to join our growing team. \
             The ideal candidate will have experience working with community programs. \
             Great opportunity to work with amazing people. Competitive salary \
             and benefits. Room for growth and be part of something special.",
        ),
        None,
        None,
        Some("Remote"),
        Some(true),
        created_at,
        0,
        10,
    );

    // Should match ghost templates
    assert!(
        analysis
            .reasons
            .iter()
            .any(|r| r.description.contains("template")),
        "Should detect ghost job templates"
    );
}

#[test]
fn test_ml_sigmoid_transform() {
    let detector = GhostDetector::new(GhostConfig::default());

    // Test sigmoid at different points
    let low = detector.sigmoid_transform(0.1);
    let mid = detector.sigmoid_transform(0.4);
    let high = detector.sigmoid_transform(0.7);

    // Should be monotonically increasing
    assert!(low < mid, "Sigmoid should increase: {} < {}", low, mid);
    assert!(mid < high, "Sigmoid should increase: {} < {}", mid, high);

    // Should be bounded 0-1
    assert!(low >= 0.0 && low <= 1.0, "Low value bounded");
    assert!(mid >= 0.0 && mid <= 1.0, "Mid value bounded");
    assert!(high >= 0.0 && high <= 1.0, "High value bounded");

    // Mid value should be around 0.5 (sigmoid centered at 0.4)
    assert!(
        (mid - 0.5).abs() < 0.1,
        "Sigmoid should be ~0.5 at center, got {}",
        mid
    );
}

#[test]
fn test_ml_enhanced_vs_basic() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(5);

    let description = Some(
        "Amazing opportunity at our exciting company! We're hiring now - don't miss out! \
         Join our incredible team in this life-changing role. We offer unlimited potential \
         and competitive salary. Looking for a motivated self-starter to hit the ground running.",
    );

    let basic = detector.analyze(
        "Case Manager",
        description,
        None,
        None,
        Some("NYC"),
        None,
        created_at,
        0,
        10,
    );

    let enhanced = detector.analyze_enhanced(
        "Case Manager",
        description,
        None,
        None,
        Some("NYC"),
        None,
        created_at,
        0,
        10,
    );

    // Enhanced should detect more signals
    assert!(
        enhanced.reasons.len() >= basic.reasons.len(),
        "Enhanced should find at least as many reasons: {} vs {}",
        enhanced.reasons.len(),
        basic.reasons.len()
    );

    // Enhanced should have higher confidence
    assert!(
        enhanced.confidence >= basic.confidence,
        "Enhanced should have equal or higher confidence: {} vs {}",
        enhanced.confidence,
        basic.confidence
    );
}

#[test]
fn test_ml_real_job_low_score() {
    let detector = GhostDetector::new(GhostConfig::default());
    let created_at = create_test_job_created_at(3);

    let analysis = detector.analyze_enhanced(
        "Senior Operations Coordinator",
        Some(
            "We're improving service operations across community offices. \
             \n\nResponsibilities:\n\
             - Coordinate scheduling across regional teams\n\
             - Maintain CRM follow-up records and escalation queues\n\
             - Prepare weekly staffing and service reports\n\
             - Review intake handoffs and process updates with managers\n\
             - Track vendor invoices and program deadlines\n\
             \nRequirements:\n\
             - 5+ years of operations or program support experience\n\
             - Strong proficiency with scheduling, CRM, and reporting\n\
             - Experience with inventory planning or multi-site coordination\n\
             - Familiarity with staff training and vendor follow-up\n\
             \nBenefits: $180k-$220k base + bonus",
        ),
        Some(180000),
        Some(220000),
        Some("San Francisco, CA"),
        Some(false),
        created_at,
        0,
        25,
    );

    assert!(
        analysis.score < 0.3,
        "Well-written real job should have low ghost score, got {}",
        analysis.score
    );
}
