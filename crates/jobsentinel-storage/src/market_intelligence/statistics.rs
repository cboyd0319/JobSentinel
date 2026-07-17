use sqlx::{sqlite::SqliteRow, Row};

pub(super) struct SalarySummary {
    pub(super) average: Option<f64>,
    pub(super) median: Option<f64>,
}

pub(super) fn median(values: &mut [f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }

    values.sort_by(|left, right| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal));
    let midpoint = values.len() / 2;
    if values.len().is_multiple_of(2) {
        Some((values[midpoint - 1] + values[midpoint]) / 2.0)
    } else {
        Some(values[midpoint])
    }
}

pub(super) fn predicted_salary_summary(rows: &[SqliteRow]) -> SalarySummary {
    let mut salaries: Vec<f64> = rows
        .iter()
        .filter_map(|row| {
            row.try_get::<Option<f64>, _>("predicted_median")
                .ok()
                .flatten()
        })
        .collect();
    let average =
        (!salaries.is_empty()).then(|| salaries.iter().sum::<f64>() / salaries.len() as f64);
    let median = median(&mut salaries);

    SalarySummary { average, median }
}

#[cfg(test)]
mod tests {
    use super::{median, predicted_salary_summary};

    #[test]
    fn median_handles_empty_odd_and_even_samples() {
        assert_eq!(median(&mut []), None);
        assert_eq!(median(&mut [3.0, 1.0, 2.0]), Some(2.0));
        assert_eq!(median(&mut [4.0, 1.0, 3.0, 2.0]), Some(2.5));
    }

    #[tokio::test]
    async fn salary_summary_ignores_null_rows() {
        let database = crate::Database::connect_memory().await.unwrap();
        let rows = sqlx::query(
            "SELECT CAST(100 AS REAL) AS predicted_median
             UNION ALL SELECT NULL
             UNION ALL SELECT CAST(300 AS REAL)",
        )
        .fetch_all(database.pool())
        .await
        .unwrap();

        let summary = predicted_salary_summary(&rows);

        assert_eq!(summary.average, Some(200.0));
        assert_eq!(summary.median, Some(200.0));
    }
}
