use super::*;

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

    assert!(
        analysis
            .reasons
            .iter()
            .any(|r| r.description.contains("low-detail posting patterns")),
        "Should detect repeated low-detail posting patterns"
    );
    assert_review_first_descriptions(&analysis);
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
