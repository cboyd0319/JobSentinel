use super::*;

#[tokio::test]
async fn test_with_timeout_actual_timeout() {
    // Test a future that takes longer than the timeout
    let result = tokio::time::timeout(std::time::Duration::from_millis(10), async {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        Ok::<i32, sqlx::Error>(42)
    })
    .await;

    // Should timeout
    assert!(result.is_err());
}

#[tokio::test]
async fn test_with_timeout_string_result() {
    let result = with_timeout(async { Ok::<String, sqlx::Error>("success".to_string()) }).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "success");
}

#[tokio::test]
async fn test_with_timeout_unit_result() {
    let result = with_timeout(async { Ok::<(), sqlx::Error>(()) }).await;

    assert!(result.is_ok());
}
