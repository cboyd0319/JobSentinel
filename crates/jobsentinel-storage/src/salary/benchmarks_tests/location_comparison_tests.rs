use super::*;

#[test]
fn test_different_locations_same_title() {
    let chicago_benchmark = SalaryBenchmark {
        job_title: "Case Manager".to_string(),
        location: "Chicago, IL".to_string(),
        seniority_level: SeniorityLevel::Mid,
        min_salary: 140000,
        p25_salary: 160000,
        median_salary: 180000,
        p75_salary: 220000,
        max_salary: 300000,
        average_salary: 190000,
        sample_size: 1000,
        last_updated: Utc::now(),
    };

    let atlanta_benchmark = SalaryBenchmark {
        job_title: "Case Manager".to_string(),
        location: "Atlanta, GA".to_string(),
        seniority_level: SeniorityLevel::Mid,
        min_salary: 90000,
        p25_salary: 110000,
        median_salary: 130000,
        p75_salary: 150000,
        max_salary: 200000,
        average_salary: 135000,
        sample_size: 500,
        last_updated: Utc::now(),
    };

    let offer = 140000;
    assert_eq!(chicago_benchmark.is_competitive(offer), "below_market");
    assert_eq!(atlanta_benchmark.is_competitive(offer), "competitive");
}
