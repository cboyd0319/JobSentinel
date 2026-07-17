use jobsentinel_domain::normalization::infer_remote_status;

use super::GlassdoorScraper;

impl GlassdoorScraper {
    /// Extract salary information from job data
    pub(super) fn extract_salary(&self, data: &serde_json::Value) -> (Option<i64>, Option<i64>) {
        // Try Schema.org baseSalary format
        if let Some(base_salary) = data.get("baseSalary") {
            let min = base_salary["value"]["minValue"]
                .as_f64()
                .or_else(|| base_salary["value"]["value"].as_f64())
                .map(|v| v as i64);

            let max = base_salary["value"]["maxValue"]
                .as_f64()
                .or_else(|| base_salary["value"]["value"].as_f64())
                .map(|v| v as i64);

            if min.is_some() || max.is_some() {
                return (min, max);
            }
        }

        // Try Glassdoor-specific salary fields
        let min = data["salaryRange"]["min"]
            .as_f64()
            .or_else(|| data["payEstimate"]["min"].as_f64())
            .or_else(|| data["salary"]["min"].as_f64())
            .map(|v| v as i64);

        let max = data["salaryRange"]["max"]
            .as_f64()
            .or_else(|| data["payEstimate"]["max"].as_f64())
            .or_else(|| data["salary"]["max"].as_f64())
            .map(|v| v as i64);

        (min, max)
    }

    /// Check if job appears to be remote based on location
    #[allow(clippy::single_option_map)]
    pub(super) fn is_remote(&self, location: Option<&str>) -> Option<bool> {
        location.map(|value| infer_remote_status(&[value]).is_remote())
    }

    /// Strip HTML tags from text
    pub(super) fn strip_html(html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for c in html.chars() {
            match c {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(c),
                _ => {}
            }
        }

        // Clean up whitespace
        result.split_whitespace().collect::<Vec<_>>().join(" ")
    }
}
