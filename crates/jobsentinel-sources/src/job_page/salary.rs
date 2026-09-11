//! Parses bounded Schema.org and explicitly formatted native salary evidence.

use jobsentinel_domain::{v3_contracts::PayPeriod, ListedPay, PayQualifier};
use regex::Regex;
use serde_json::{Map, Value};

const MAX_RAW_SALARY_BYTES: usize = 1024;
const TEXT_SALARY_PATTERN: &str = concat!(
    r"^(?P<currency>GBP|EUR|INR|[A-Z]{3}|£|€|₹|\$)\s*",
    r"(?P<min>\d[\d,]*(?:\.\d+)?)",
    r"(?:\s*[-–]\s*(?P<max>\d[\d,]*(?:\.\d+)?))?\s*",
    r"(?P<suffix>.*)$"
);

pub(super) fn parse_schema_org_salary(
    base_salary: &Option<Value>,
    salary_currency: Option<&Value>,
) -> Option<ListedPay> {
    let salary = base_salary.as_ref()?;
    let top_currency = read_json_currency(salary_currency).ok()?;

    match salary {
        Value::String(raw_text) => parse_text_salary(raw_text, top_currency.as_deref()),
        Value::Number(amount) => native_pay(
            Some(amount.as_f64()?),
            Some(amount.as_f64()?),
            top_currency,
            PayPeriod::NotDisclosed,
            Vec::new(),
            None,
        ),
        Value::Object(object) => parse_structured_salary(object, top_currency.as_deref()),
        _ => None,
    }
}

fn parse_structured_salary(
    salary: &Map<String, Value>,
    top_currency: Option<&str>,
) -> Option<ListedPay> {
    let source_currency = read_currency_field(salary, "currency").ok()?;
    let currency = resolve_currency(source_currency, top_currency).ok()?;
    let (min, max, nested, has_values) = salary_values(salary)?;
    if !has_values {
        return None;
    }
    let period = resolve_period(salary, nested)?;

    native_pay(min, max, currency, period, Vec::new(), None)
}

fn salary_values(
    salary: &Map<String, Value>,
) -> Option<(Option<f64>, Option<f64>, Option<&Map<String, Value>>, bool)> {
    let direct = read_bounds(salary).ok()?;
    if direct.2 {
        return Some((direct.0, direct.1, None, true));
    }

    let value = salary.get("value")?;
    match value {
        Value::Number(amount) => {
            let amount = amount.as_f64()?;
            Some((Some(amount), Some(amount), None, true))
        }
        Value::Object(quantity) => {
            let bounds = read_bounds(quantity).ok()?;
            if bounds.2 {
                return Some((bounds.0, bounds.1, Some(quantity), true));
            }
            let amount = quantity.get("value")?.as_f64()?;
            Some((Some(amount), Some(amount), Some(quantity), true))
        }
        _ => None,
    }
}

fn read_bounds(value: &Map<String, Value>) -> Result<(Option<f64>, Option<f64>, bool), ()> {
    let min = read_bound(value, "minValue")?;
    let max = read_bound(value, "maxValue")?;
    Ok((min, max, min.is_some() || max.is_some()))
}

fn read_bound(value: &Map<String, Value>, name: &str) -> Result<Option<f64>, ()> {
    match value.get(name) {
        Some(value) => value.as_f64().map(Some).ok_or(()),
        None => Ok(None),
    }
}

fn resolve_currency(
    salary_currency: Option<&str>,
    top_currency: Option<&str>,
) -> Result<Option<String>, ()> {
    let salary_currency = normalize_currency(salary_currency)?;
    let top_currency = normalize_currency(top_currency)?;
    match (salary_currency, top_currency) {
        (Some(salary), Some(top)) if salary != top => Err(()),
        (Some(salary), _) => Ok(Some(salary)),
        (None, Some(top)) => Ok(Some(top)),
        (None, None) => Ok(None),
    }
}

fn read_json_currency(value: Option<&Value>) -> Result<Option<String>, ()> {
    match value {
        Some(Value::String(currency)) => normalize_currency(Some(currency)),
        Some(_) => Err(()),
        None => Ok(None),
    }
}

fn read_currency_field<'a>(
    value: &'a Map<String, Value>,
    name: &str,
) -> Result<Option<&'a str>, ()> {
    match value.get(name) {
        Some(Value::String(currency)) => Ok(Some(currency)),
        Some(_) => Err(()),
        None => Ok(None),
    }
}

fn normalize_currency(value: Option<&str>) -> Result<Option<String>, ()> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.len() != 3 || !value.bytes().all(|byte| byte.is_ascii_alphabetic()) {
        return Err(());
    }
    Ok(Some(value.to_ascii_uppercase()))
}

fn resolve_period(
    salary: &Map<String, Value>,
    nested: Option<&Map<String, Value>>,
) -> Option<PayPeriod> {
    let outer = read_salary_period(salary).ok()?;
    let inner = match nested {
        Some(nested) => read_salary_period(nested).ok()?,
        None => None,
    };
    match (outer, inner) {
        (Some(outer), Some(inner)) if outer != inner => None,
        (Some(period), _) | (_, Some(period)) => Some(period),
        (None, None) => Some(PayPeriod::NotDisclosed),
    }
}

fn read_salary_period(value: &Map<String, Value>) -> Result<Option<PayPeriod>, ()> {
    let unit_text = read_unit(value.get("unitText"))?;
    let unit_code = read_unit(value.get("unitCode"))?;
    match (unit_text, unit_code) {
        (Some(text), Some(code)) if text != code => Err(()),
        (Some(period), _) | (_, Some(period)) => Ok(Some(period)),
        (None, None) => Ok(None),
    }
}

fn read_unit(value: Option<&Value>) -> Result<Option<PayPeriod>, ()> {
    match value {
        Some(Value::String(unit)) => parse_schema_unit(unit).map(Some).ok_or(()),
        Some(_) => Err(()),
        None => Ok(None),
    }
}

fn parse_schema_unit(unit: &str) -> Option<PayPeriod> {
    match unit.trim().to_ascii_uppercase().as_str() {
        "YEAR" | "ANNUAL" | "ANN" | "YEARLY" | "ANNUALLY" | "YR" => Some(PayPeriod::Annual),
        "MONTH" | "MON" | "MONTHLY" => Some(PayPeriod::Monthly),
        "WEEK" | "WEE" | "WEEKLY" | "WK" => Some(PayPeriod::Weekly),
        "DAY" | "DAILY" => Some(PayPeriod::Daily),
        "HOUR" | "HUR" | "HOURLY" | "HR" => Some(PayPeriod::Hourly),
        _ => None,
    }
}

fn parse_text_salary(raw_text: &str, top_currency: Option<&str>) -> Option<ListedPay> {
    let raw_fallback = || raw_salary(raw_text);
    let top_currency = normalize_currency(top_currency).ok()?;
    let regex = Regex::new(TEXT_SALARY_PATTERN).ok()?;
    let Some(captures) = regex.captures(raw_text.trim()) else {
        return raw_fallback();
    };
    let currency = text_currency(captures.name("currency")?.as_str());
    let currency = match resolve_currency(currency.as_deref(), top_currency.as_deref()) {
        Ok(currency) => currency,
        Err(()) => return raw_fallback(),
    };
    if currency.as_deref() == Some("EUR")
        && [captures.name("min"), captures.name("max")]
            .into_iter()
            .flatten()
            .any(|amount| amount.as_str().contains(','))
    {
        return raw_fallback();
    }
    let Some(min) = parse_amount(captures.name("min")?.as_str()) else {
        return raw_fallback();
    };
    let max = match captures.name("max") {
        Some(capture) => match parse_amount(capture.as_str()) {
            Some(amount) => Some(amount),
            None => return raw_fallback(),
        },
        None => None,
    };
    let suffix = captures
        .name("suffix")
        .map_or("", |capture| capture.as_str());
    let Some((period, qualifiers, multiplier)) = text_details(suffix) else {
        return raw_fallback();
    };
    let min = min * multiplier;
    let max = max.map(|amount| amount * multiplier);

    native_pay(
        Some(min),
        max.or(Some(min)),
        currency,
        period,
        qualifiers,
        Some(raw_text.to_string()),
    )
    .or_else(raw_fallback)
}

fn raw_salary(raw_text: &str) -> Option<ListedPay> {
    (raw_text.len() <= MAX_RAW_SALARY_BYTES && !raw_text.trim().is_empty())
        .then(|| ListedPay {
            min: None,
            max: None,
            currency: None,
            period: PayPeriod::NotDisclosed,
            qualifiers: Vec::new(),
            raw_text: Some(raw_text.to_string()),
        })
        .filter(|pay| pay.validate().is_ok())
}

fn text_currency(currency: &str) -> Option<String> {
    match currency {
        "£" => Some("GBP".to_string()),
        "€" => Some("EUR".to_string()),
        "₹" => Some("INR".to_string()),
        "$" => None,
        currency => normalize_currency(Some(currency)).ok().flatten(),
    }
}

fn parse_amount(amount: &str) -> Option<f64> {
    let (whole, fraction) = match amount.split_once('.') {
        Some((whole, fraction)) if !fraction.is_empty() && !fraction.contains('.') => {
            (whole, Some(fraction))
        }
        Some(_) => return None,
        None => (amount, None),
    };
    if fraction.is_some_and(|fraction| !fraction.bytes().all(|byte| byte.is_ascii_digit())) {
        return None;
    }
    let whole = normalize_grouped_integer(whole)?;
    let normalized = match fraction {
        Some(fraction) => format!("{whole}.{fraction}"),
        None => whole,
    };
    normalized.parse().ok()
}

fn normalize_grouped_integer(integer: &str) -> Option<String> {
    if !integer.contains(',') {
        return integer
            .bytes()
            .all(|byte| byte.is_ascii_digit())
            .then(|| integer.to_string());
    }
    let mut groups = integer.split(',');
    let first = groups.next()?;
    if first.is_empty() || first.len() > 3 || !first.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    let remaining = groups.collect::<Vec<_>>();
    (!remaining.is_empty()
        && remaining
            .iter()
            .all(|group| group.len() == 3 && group.bytes().all(|byte| byte.is_ascii_digit())))
    .then(|| format!("{first}{}", remaining.concat()))
}

fn text_details(suffix: &str) -> Option<(PayPeriod, Vec<PayQualifier>, f64)> {
    let normalized = suffix.trim().to_ascii_lowercase().replace(['(', ')'], " ");
    let tokens = normalized.split_whitespace().collect::<Vec<_>>();
    let (period, multiplier, mut index) = match tokens.as_slice() {
        [] => (PayPeriod::NotDisclosed, 1.0, 0),
        ["per", "year" | "annum", ..] => (PayPeriod::Annual, 1.0, 2),
        ["/year" | "annual" | "yearly" | "p.a.", ..] => (PayPeriod::Annual, 1.0, 1),
        ["per", "month", ..] => (PayPeriod::Monthly, 1.0, 2),
        ["/month" | "monthly", ..] => (PayPeriod::Monthly, 1.0, 1),
        ["per", "week", ..] => (PayPeriod::Weekly, 1.0, 2),
        ["/week" | "weekly", ..] => (PayPeriod::Weekly, 1.0, 1),
        ["per", "day", ..] | ["day", "rate", ..] => (PayPeriod::Daily, 1.0, 2),
        ["/day" | "daily", ..] => (PayPeriod::Daily, 1.0, 1),
        ["per", "hour", ..] => (PayPeriod::Hourly, 1.0, 2),
        ["/hour" | "hourly", ..] => (PayPeriod::Hourly, 1.0, 1),
        ["contract", "rate", ..] => (PayPeriod::Contract, 1.0, 2),
        ["lpa", ..] => (PayPeriod::Annual, 100_000.0, 1),
        ["lakh", "per", "annum", ..] => (PayPeriod::Annual, 100_000.0, 3),
        ["stipend", ..] => (PayPeriod::Stipend, 1.0, 0),
        ["ctc" | "pro-rata", ..] | ["pro", "rata", ..] => (PayPeriod::NotDisclosed, 1.0, 0),
        _ => return None,
    };
    let mut qualifiers = Vec::new();
    while index < tokens.len() {
        match tokens[index..] {
            ["ctc", ..] if !qualifiers.contains(&PayQualifier::Ctc) => {
                qualifiers.push(PayQualifier::Ctc);
                index += 1;
            }
            ["stipend", ..] if !qualifiers.contains(&PayQualifier::Stipend) => {
                qualifiers.push(PayQualifier::Stipend);
                index += 1;
            }
            ["pro", "rata", ..] if !qualifiers.contains(&PayQualifier::ProRata) => {
                qualifiers.push(PayQualifier::ProRata);
                index += 2;
            }
            ["pro-rata", ..] if !qualifiers.contains(&PayQualifier::ProRata) => {
                qualifiers.push(PayQualifier::ProRata);
                index += 1;
            }
            _ => return None,
        }
    }
    Some((period, qualifiers, multiplier))
}

fn native_pay(
    min: Option<f64>,
    max: Option<f64>,
    currency: Option<String>,
    period: PayPeriod,
    qualifiers: Vec<PayQualifier>,
    raw_text: Option<String>,
) -> Option<ListedPay> {
    let pay = ListedPay {
        min,
        max,
        currency,
        period,
        qualifiers,
        raw_text,
    };
    pay.validate().ok().map(|()| pay)
}
