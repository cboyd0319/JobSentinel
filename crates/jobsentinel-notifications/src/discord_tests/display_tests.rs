use super::super::discord_embed_color;
use super::notification_fixture;

#[test]
fn test_embed_color_for_high_score() {
    let notification = notification_fixture();
    let score = notification.score.total;

    let color = discord_embed_color(score);

    assert_eq!(color, 0x10b981, "Score of 95% should use green color");
}

#[test]
fn test_embed_color_for_medium_score() {
    let mut notification = notification_fixture();
    notification.score.total = 0.85;
    let score = notification.score.total;

    let color = discord_embed_color(score);

    assert_eq!(
        color, 0xf59e0b,
        "Score of 85% should use yellow/amber color"
    );
}

#[test]
fn test_embed_color_for_low_score() {
    let mut notification = notification_fixture();
    notification.score.total = 0.75;
    let score = notification.score.total;

    let color = discord_embed_color(score);

    assert_eq!(color, 0x3b82f6, "Score of 75% should use blue color");
}

#[test]
fn test_embed_color_boundary_90_percent() {
    let mut notification = notification_fixture();
    notification.score.total = 0.9;

    let color = discord_embed_color(notification.score.total);

    assert_eq!(color, 0x10b981, "Score of exactly 90% should use green");
}

#[test]
fn test_embed_color_boundary_80_percent() {
    let mut notification = notification_fixture();
    notification.score.total = 0.8;

    let color = discord_embed_color(notification.score.total);

    assert_eq!(
        color, 0xf59e0b,
        "Score of exactly 80% should use yellow/amber"
    );
}
