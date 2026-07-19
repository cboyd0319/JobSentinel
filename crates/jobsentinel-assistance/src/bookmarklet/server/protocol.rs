use super::*;

pub(super) fn http_response_data(status: &str, content_type: &str, response: &str) -> String {
    format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nPragma: no-cache\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nCross-Origin-Resource-Policy: same-origin\r\nConnection: close\r\n\r\n{}",
        status,
        content_type,
        response.len(),
        response
    )
}

pub(super) fn has_valid_bookmarklet_token(request: &str, auth_token: &str) -> bool {
    !auth_token.is_empty()
        && request_header_value(request, BOOKMARKLET_TOKEN_HEADER)
            .is_some_and(|value| constant_time_ascii_eq(value, auth_token))
}

pub(super) fn body_has_valid_bookmarklet_token(body: &serde_json::Value, auth_token: &str) -> bool {
    !auth_token.is_empty()
        && body
            .get("token")
            .and_then(serde_json::Value::as_str)
            .is_some_and(|value| constant_time_ascii_eq(value, auth_token))
}

pub(super) fn bookmarklet_body_or_header_has_token(
    request: &str,
    body: &serde_json::Value,
    auth_token: &str,
) -> bool {
    has_valid_bookmarklet_token(request, auth_token)
        || body_has_valid_bookmarklet_token(body, auth_token)
}

pub(super) fn consume_valid_bookmarklet_token(
    auth_state: &Arc<RwLock<BookmarkletAuthState>>,
    request: &str,
    body: &serde_json::Value,
    now: DateTime<Utc>,
) -> bool {
    let mut state = match auth_state.write() {
        Ok(state) => state,
        Err(poisoned) => poisoned.into_inner(),
    };

    let valid = now <= state.auth_token_expires_at
        && bookmarklet_body_or_header_has_token(request, body, &state.auth_token);

    if valid {
        state.auth_token.clear();
        state.auth_token_expires_at = now - TimeDelta::seconds(1);
    }

    valid
}

pub(super) fn bookmarklet_job_value(body: &serde_json::Value) -> serde_json::Value {
    if let Some(job) = body.get("job") {
        return job.clone();
    }

    let mut body = body.clone();
    if let serde_json::Value::Object(ref mut map) = body {
        map.remove("token");
    }

    body
}

pub(super) fn bookmarklet_job_values(
    body: &serde_json::Value,
) -> Result<Vec<serde_json::Value>, String> {
    let Some(jobs) = body.get("jobs") else {
        return Ok(vec![bookmarklet_job_value(body)]);
    };

    let Some(jobs) = jobs.as_array() else {
        return Err(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE.to_string());
    };

    if jobs.is_empty() || jobs.len() > MAX_BOOKMARKLET_JOBS_PER_REQUEST {
        return Err(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE.to_string());
    }

    Ok(jobs.clone())
}

pub(super) fn request_header_value<'a>(request: &'a str, header_name: &str) -> Option<&'a str> {
    for line in request.lines().skip(1) {
        let line = line.trim_end_matches('\r');
        if line.is_empty() {
            return None;
        }

        if let Some((name, value)) = line.split_once(':') {
            if name.trim().eq_ignore_ascii_case(header_name) {
                return Some(value.trim());
            }
        }
    }

    None
}

pub(super) fn has_valid_bookmarklet_host(request: &str, port: u16) -> bool {
    request_header_value(request, "host").is_some_and(|value| {
        let normalized = value.trim().to_ascii_lowercase();
        normalized == format!("localhost:{port}")
            || normalized == format!("127.0.0.1:{port}")
            || normalized == format!("[::1]:{port}")
    })
}

pub(super) fn has_allowed_bookmarklet_origin(request: &str) -> bool {
    request_header_value(request, "origin").is_none_or(is_http_or_https_url)
        && request_header_value(request, "referer").is_none_or(is_http_or_https_url)
}

pub(super) fn is_http_or_https_url(value: &str) -> bool {
    http_or_https_origin(value).is_some()
}

pub(super) fn http_or_https_origin(value: &str) -> Option<(String, String, u16)> {
    let Ok(url) = url::Url::parse(value.trim()) else {
        return None;
    };

    if !matches!(url.scheme(), "http" | "https") {
        return None;
    }

    Some((
        url.scheme().to_string(),
        url.host_str()?.trim_end_matches('.').to_ascii_lowercase(),
        url.port_or_known_default()?,
    ))
}

pub(super) fn bookmarklet_job_url_values(body: &serde_json::Value) -> Vec<&str> {
    if let Some(jobs) = body.get("jobs").and_then(serde_json::Value::as_array) {
        return jobs
            .iter()
            .filter_map(|job| job.get("url").and_then(serde_json::Value::as_str))
            .collect();
    }

    body.get("job")
        .and_then(|job| job.get("url"))
        .or_else(|| body.get("url"))
        .and_then(serde_json::Value::as_str)
        .into_iter()
        .collect()
}

pub(super) fn bookmarklet_payload_matches_request_origin(
    request: &str,
    body: &serde_json::Value,
) -> bool {
    bookmarklet_job_url_values(body).into_iter().all(|job_url| {
        let Some(job_origin) = http_or_https_origin(job_url) else {
            return true;
        };

        request_header_value(request, "origin").is_none_or(|origin| {
            http_or_https_origin(origin).is_some_and(|request_origin| request_origin == job_origin)
        }) && request_header_value(request, "referer").is_none_or(|referer| {
            http_or_https_origin(referer).is_some_and(|request_origin| request_origin == job_origin)
        })
    })
}

pub(super) fn request_buffer_has_complete_body(buffer: &[u8]) -> bool {
    let Some((body_start, content_length)) = request_body_start_and_content_length(buffer) else {
        return false;
    };

    buffer.len() >= body_start + content_length
}

pub(super) fn request_buffer_has_declared_oversized_body(buffer: &[u8], max_bytes: usize) -> bool {
    let Some((body_start, content_length)) = request_body_start_and_content_length(buffer) else {
        return false;
    };

    body_start
        .checked_add(content_length)
        .is_none_or(|declared_size| declared_size > max_bytes)
}

pub(super) fn request_buffer_should_stop_reading(buffer: &[u8], max_bytes: usize) -> bool {
    request_buffer_has_complete_body(buffer)
        || request_buffer_has_declared_oversized_body(buffer, max_bytes)
}

pub(super) fn request_body_start_and_content_length(buffer: &[u8]) -> Option<(usize, usize)> {
    let header_end = buffer
        .windows(HEADER_BODY_SEPARATOR.len())
        .position(|window| window == HEADER_BODY_SEPARATOR)?;

    let headers = String::from_utf8_lossy(&buffer[..header_end]);
    let body_start = header_end + HEADER_BODY_SEPARATOR.len();
    let content_length = request_header_value(&headers, CONTENT_LENGTH_HEADER)
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);

    Some((body_start, content_length))
}

pub(super) fn is_bookmarklet_import_request(request: &str) -> bool {
    request.starts_with("POST /api/bookmarklet/import ")
        || request.starts_with("POST /api/bookmarklet/import?")
}

pub(super) fn bookmarklet_error_label(error: &BookmarkletError) -> &'static str {
    match error {
        BookmarkletError::AlreadyRunning => "already_running",
        BookmarkletError::NotRunning => "not_running",
        BookmarkletError::BindError { .. } => "bind_error",
        BookmarkletError::DatabaseError(_) => "database_error",
        BookmarkletError::InvalidData(_) => "invalid_data",
    }
}

pub(super) fn json_error_response(message: impl AsRef<str>) -> String {
    json!({ "error": message.as_ref() }).to_string()
}
