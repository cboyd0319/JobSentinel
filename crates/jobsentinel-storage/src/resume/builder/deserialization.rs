use serde::{de, Deserialize, Deserializer};
use serde_json::Value;

pub(super) fn optional_string_from_value<'de, D>(
    deserializer: D,
) -> std::result::Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<Value>::deserialize(deserializer)?;
    value_to_optional_string(value).map_err(de::Error::custom)
}

pub(super) fn string_from_value<'de, D>(deserializer: D) -> std::result::Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    Ok(optional_string_from_value(deserializer)?.unwrap_or_default())
}

pub(super) fn string_vec_from_value<'de, D>(
    deserializer: D,
) -> std::result::Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<Value>::deserialize(deserializer)?;
    let Some(value) = value else {
        return Ok(Vec::new());
    };

    match value {
        Value::Null => Ok(Vec::new()),
        Value::String(value) => Ok(split_legacy_honors_string(&value)),
        Value::Array(values) => values
            .into_iter()
            .filter_map(|value| match value_to_optional_string(Some(value)) {
                Ok(Some(value)) => Some(Ok(value)),
                Ok(None) => None,
                Err(error) => Some(Err(error)),
            })
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(de::Error::custom),
        other => value_to_optional_string(Some(other))
            .map(|value| value.into_iter().collect())
            .map_err(de::Error::custom),
    }
}

pub(super) fn split_legacy_honors_string(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

pub(super) fn value_to_optional_string(
    value: Option<Value>,
) -> std::result::Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };

    match value {
        Value::Null => Ok(None),
        Value::String(value) => Ok(Some(value)),
        Value::Number(value) => Ok(Some(value.to_string())),
        Value::Bool(value) => Ok(Some(value.to_string())),
        Value::Array(_) | Value::Object(_) => Err("expected string-compatible value".to_string()),
    }
}
