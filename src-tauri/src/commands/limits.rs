//! Shared command-boundary limit validation.

const MAX_COMMAND_LIMIT: i64 = 1_000;

fn limit_error() -> String {
    format!("limit must be between 1 and {}", MAX_COMMAND_LIMIT)
}

/// Validate a required signed command limit.
pub fn validate_command_limit_i64(limit: i64) -> Result<i64, String> {
    if (1..=MAX_COMMAND_LIMIT).contains(&limit) {
        Ok(limit)
    } else {
        Err(limit_error())
    }
}

/// Validate an optional signed command limit.
pub fn validate_optional_command_limit_i64(
    limit: Option<i64>,
    default_limit: i64,
) -> Result<i64, String> {
    validate_command_limit_i64(limit.unwrap_or(default_limit))
}

/// Validate an optional 32-bit signed command limit.
pub fn validate_optional_command_limit_i32(
    limit: Option<i32>,
    default_limit: i32,
) -> Result<i32, String> {
    let limit = validate_command_limit_i64(i64::from(limit.unwrap_or(default_limit)))?;
    i32::try_from(limit).map_err(|_| "limit is outside supported range".to_string())
}

/// Validate a required unsigned command limit.
pub fn validate_command_limit_usize(limit: usize) -> Result<usize, String> {
    if limit == 0 || limit > MAX_COMMAND_LIMIT as usize {
        return Err(limit_error());
    }

    Ok(limit)
}

/// Validate an optional unsigned command limit.
pub fn validate_optional_command_limit_usize(
    limit: Option<usize>,
    default_limit: usize,
) -> Result<usize, String> {
    validate_command_limit_usize(limit.unwrap_or(default_limit))
}

/// Validate an unsigned command limit and convert it for SQL bindings.
pub fn validate_command_limit_usize_as_i64(limit: usize) -> Result<i64, String> {
    let limit = validate_command_limit_usize(limit)?;
    i64::try_from(limit).map_err(|_| "limit is outside supported range".to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        validate_command_limit_i64, validate_command_limit_usize,
        validate_command_limit_usize_as_i64, validate_optional_command_limit_i32,
        validate_optional_command_limit_i64, validate_optional_command_limit_usize,
    };

    #[test]
    fn validates_required_command_limits() {
        assert_eq!(validate_command_limit_i64(1).unwrap(), 1);
        assert_eq!(validate_command_limit_usize(1).unwrap(), 1);
        assert_eq!(validate_command_limit_usize_as_i64(1).unwrap(), 1);
    }

    #[test]
    fn validates_optional_command_limits_with_defaults() {
        assert_eq!(validate_optional_command_limit_i64(None, 10).unwrap(), 10);
        assert_eq!(validate_optional_command_limit_i32(None, 20).unwrap(), 20);
        assert_eq!(validate_optional_command_limit_usize(None, 5).unwrap(), 5);
    }

    #[test]
    fn rejects_zero_command_limits() {
        assert!(validate_command_limit_i64(0).is_err());
        assert!(validate_command_limit_usize(0).is_err());
        assert!(validate_optional_command_limit_i32(Some(0), 20).is_err());
    }

    #[test]
    fn rejects_unbounded_command_limits() {
        assert!(validate_command_limit_i64(1_001).is_err());
        assert!(validate_command_limit_usize(1_001).is_err());
        assert!(validate_optional_command_limit_i64(Some(1_001), 10).is_err());
    }
}
