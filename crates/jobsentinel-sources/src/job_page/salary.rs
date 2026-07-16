//! Schema.org salary parsing shared by import preview and saved job fields.

use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SalaryPeriod {
    Year,
    Month,
    Week,
    Day,
    Hour,
    Unknown,
}

impl SalaryPeriod {
    fn from_unit(unit: Option<&str>) -> Self {
        let Some(unit) = unit else {
            return Self::Year;
        };
        let normalized = unit
            .trim()
            .to_ascii_lowercase()
            .replace(|c: char| !c.is_ascii_alphanumeric(), "");

        match normalized.as_str() {
            "ann" | "annual" | "annually" | "year" | "yearly" | "yr" => Self::Year,
            "mon" | "month" | "monthly" => Self::Month,
            "wee" | "week" | "weekly" | "wk" => Self::Week,
            "day" | "daily" => Self::Day,
            "hour" | "hourly" | "hr" | "hur" => Self::Hour,
            _ => Self::Unknown,
        }
    }

    fn yearly_multiplier(self) -> Option<f64> {
        match self {
            Self::Year => Some(1.0),
            Self::Month => Some(12.0),
            Self::Week => Some(52.0),
            Self::Day => Some(260.0),
            Self::Hour => Some(2080.0),
            Self::Unknown => None,
        }
    }

    fn display_suffix(self) -> &'static str {
        match self {
            Self::Year => "",
            Self::Month => " per month",
            Self::Week => " per week",
            Self::Day => " per day",
            Self::Hour => " per hour",
            Self::Unknown => "",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub(super) struct ParsedSchemaOrgSalary {
    currency: Option<String>,
    min: Option<f64>,
    max: Option<f64>,
    period: SalaryPeriod,
}

impl ParsedSchemaOrgSalary {
    pub(super) fn currency(&self) -> Option<String> {
        self.currency.clone()
    }

    pub(super) fn annual_bounds(&self) -> (Option<i64>, Option<i64>) {
        let Some(multiplier) = self.period.yearly_multiplier() else {
            return (None, None);
        };

        (
            self.min.map(|amount| annualize_amount(amount, multiplier)),
            self.max.map(|amount| annualize_amount(amount, multiplier)),
        )
    }

    pub(super) fn preview_text(&self) -> Option<String> {
        let amount = format_salary_range(self.min, self.max)?;
        let currency = self.currency.as_deref().unwrap_or("USD");
        Some(format!(
            "{currency} {amount}{}",
            self.period.display_suffix()
        ))
    }
}

pub(super) fn parse_schema_org_salary(
    base_salary: &Option<Value>,
) -> Option<ParsedSchemaOrgSalary> {
    let salary = base_salary.as_ref()?;
    let obj = salary.as_object()?;

    let currency = obj
        .get("currency")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let value = obj.get("value")?;

    if let Some(value_obj) = value.as_object() {
        let min = value_obj.get("minValue").and_then(Value::as_f64);
        let max = value_obj.get("maxValue").and_then(Value::as_f64);
        let period = SalaryPeriod::from_unit(read_salary_unit(value_obj, obj));

        if min.is_some() || max.is_some() {
            return Some(ParsedSchemaOrgSalary {
                currency,
                min,
                max,
                period,
            });
        }
    }

    value.as_f64().map(|amount| {
        let period = SalaryPeriod::from_unit(read_salary_unit(obj, obj));
        ParsedSchemaOrgSalary {
            currency,
            min: Some(amount),
            max: Some(amount),
            period,
        }
    })
}

fn read_salary_unit<'a>(
    value_obj: &'a serde_json::Map<String, Value>,
    salary_obj: &'a serde_json::Map<String, Value>,
) -> Option<&'a str> {
    value_obj
        .get("unitText")
        .or_else(|| value_obj.get("unitCode"))
        .or_else(|| salary_obj.get("unitText"))
        .or_else(|| salary_obj.get("unitCode"))
        .and_then(Value::as_str)
}

fn annualize_amount(amount: f64, multiplier: f64) -> i64 {
    (amount * multiplier).round() as i64
}

fn format_salary_range(min: Option<f64>, max: Option<f64>) -> Option<String> {
    match (min, max) {
        (Some(min), Some(max)) if amounts_equal(min, max) => Some(format_salary_amount(min)),
        (Some(min), Some(max)) => Some(format!(
            "{}-{}",
            format_salary_amount(min),
            format_salary_amount(max)
        )),
        (Some(amount), None) | (None, Some(amount)) => Some(format_salary_amount(amount)),
        (None, None) => None,
    }
}

fn amounts_equal(left: f64, right: f64) -> bool {
    (left - right).abs() < f64::EPSILON
}

fn format_salary_amount(amount: f64) -> String {
    if amount.fract().abs() < f64::EPSILON {
        return (amount as i64).to_string();
    }

    let mut text = format!("{amount:.2}");
    while text.ends_with('0') {
        text.pop();
    }
    if text.ends_with('.') {
        text.pop();
    }
    text
}
