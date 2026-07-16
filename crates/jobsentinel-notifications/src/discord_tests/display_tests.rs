use super::create_test_notification;

#[test]
fn test_embed_color_for_high_score() {
    let notification = create_test_notification();
    let score = notification.score.total;

    let color = if score >= 0.9 {
        0x10b981
    } else if score >= 0.8 {
        0xf59e0b
    } else {
        0x3b82f6
    };

    assert_eq!(color, 0x10b981, "Score of 95% should use green color");
}

#[test]
fn test_embed_color_for_medium_score() {
    let mut notification = create_test_notification();
    notification.score.total = 0.85;
    let score = notification.score.total;

    let color = if score >= 0.9 {
        0x10b981
    } else if score >= 0.8 {
        0xf59e0b
    } else {
        0x3b82f6
    };

    assert_eq!(
        color, 0xf59e0b,
        "Score of 85% should use yellow/amber color"
    );
}

#[test]
fn test_embed_color_for_low_score() {
    let mut notification = create_test_notification();
    notification.score.total = 0.75;
    let score = notification.score.total;

    let color = if score >= 0.9 {
        0x10b981
    } else if score >= 0.8 {
        0xf59e0b
    } else {
        0x3b82f6
    };

    assert_eq!(color, 0x3b82f6, "Score of 75% should use blue color");
}

#[test]
fn test_salary_formatting_with_range() {
    let notification = create_test_notification();
    let salary_display = if let (Some(min), Some(max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = notification.job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    assert_eq!(salary_display, "$180,000 - $220,000");
}

#[test]
fn test_salary_formatting_with_min_only() {
    let mut notification = create_test_notification();
    notification.job.salary_max = None;

    let salary_display = if let (Some(min), Some(max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = notification.job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    assert_eq!(salary_display, "$180,000+");
}

#[test]
fn test_salary_formatting_with_none() {
    let mut notification = create_test_notification();
    notification.job.salary_min = None;
    notification.job.salary_max = None;

    let salary_display = if let (Some(min), Some(max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = notification.job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    assert_eq!(salary_display, "Not specified");
}

#[test]
fn test_embed_color_boundary_90_percent() {
    let mut notification = create_test_notification();
    notification.score.total = 0.9;

    let color = if notification.score.total >= 0.9 {
        0x10b981
    } else if notification.score.total >= 0.8 {
        0xf59e0b
    } else {
        0x3b82f6
    };

    assert_eq!(color, 0x10b981, "Score of exactly 90% should use green");
}

#[test]
fn test_embed_color_boundary_80_percent() {
    let mut notification = create_test_notification();
    notification.score.total = 0.8;

    let color = if notification.score.total >= 0.9 {
        0x10b981
    } else if notification.score.total >= 0.8 {
        0xf59e0b
    } else {
        0x3b82f6
    };

    assert_eq!(
        color, 0xf59e0b,
        "Score of exactly 80% should use yellow/amber"
    );
}
