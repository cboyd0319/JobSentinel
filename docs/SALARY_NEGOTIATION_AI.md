# Salary Negotiation AI
## Data-Driven Compensation Intelligence & Negotiation Assistance

> **Status:** DEFERRED to v1.1+ - Module disabled pending compilation fixes
> **Completion:** ~50%
> **Last Updated:** 2026-01-14
> **Blocker:** SQLite MEDIAN() function not available, needs workaround

**Note:** This module is currently disabled in `src-tauri/src/core/mod.rs`. The documentation below describes the intended functionality.

---

## 🎯 Overview

JobSentinel's Salary Negotiation AI provides data-driven salary benchmarking, offer comparison, and AI-generated negotiation scripts to help you maximize your compensation.

### Key Features

- **📊 Salary Benchmarks** - H1B public database (500K+ salaries annually)
- **🎯 Salary Prediction** - Estimate fair market value for any job
- **💰 Offer Comparison** - Side-by-side analysis of multiple offers
- **📝 Negotiation Scripts** - AI-generated personalized templates
- **📈 Market Intelligence** - Identify top-paying locations and companies

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────┐
│          Salary Negotiation AI Engine           │
│                                                  │
│  ┌──────────────┐      ┌──────────────────────┐│
│  │   H1B Data   │─────▶│  Salary Benchmarks   ││
│  │   (500K+)    │      │  (Aggregated Stats)  ││
│  └──────────────┘      └──────────────────────┘│
│         │                       │               │
│         ▼                       ▼               │
│  ┌──────────────┐      ┌──────────────────────┐│
│  │   Salary     │      │   Negotiation        ││
│  │  Predictor   │      │   Script Generator   ││
│  └──────────────┘      └──────────────────────┘│
└─────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
       ┌────────────┐      ┌────────────────┐
       │Job Salary  │      │  Offer         │
       │Predictions │      │  Comparison    │
       └────────────┘      └────────────────┘
```

### Database Schema

```sql
-- H1B salary data (public DOL database)
h1b_salaries
├── job_title, employer_name
├── wage_rate_of_pay_from/to
├── work_city, work_state
├── soc_code, case_status
└── decision_date

-- Aggregated benchmarks
salary_benchmarks
├── job_title_normalized
├── location_normalized
├── seniority_level (entry, mid, senior, staff, principal)
├── min_salary, p25, median, p75, max
├── average_salary, sample_size
└── data_source (h1b, user_reported)

-- Job salary predictions
job_salary_predictions
├── job_hash (FK → jobs)
├── predicted_min, predicted_median, predicted_max
├── confidence_score (0.0-1.0)
└── prediction_method

-- Negotiation templates
negotiation_templates
├── template_name, scenario
├── template_text
├── placeholders (JSON)
└── is_default

-- Negotiation history
negotiation_history
├── offer_id (FK → offers)
├── negotiation_round
├── initial_offer, counter_offer, final_offer
└── outcome
```

---

## 🚀 Usage Guide

### 1. Predict Salary for a Job

```rust
use jobsentinel::core::salary::SalaryAnalyzer;

let analyzer = SalaryAnalyzer::new(db_pool);

// Predict salary based on job
let prediction = analyzer.predict_salary_for_job(
    "job_hash_123",
    Some(5) // years of experience
).await?;

println!("Salary Range: ${}-${}",
    prediction.predicted_min,
    prediction.predicted_max
);
println!("Market Median: ${}", prediction.predicted_median);
println!("Confidence: {:.0}%", prediction.confidence_score * 100.0);
println!("Data Points: {}", prediction.data_points_used);
```

**Example Output:**
```
Salary Range: $120,000-$180,000
Market Median: $150,000
Confidence: 90%
Data Points: 342
```

### 2. Get Salary Benchmark

```rust
use jobsentinel::core::salary::SeniorityLevel;

let benchmark = analyzer.get_benchmark(
    "Software Engineer",
    "San Francisco, CA",
    SeniorityLevel::Mid
).await?;

if let Some(b) = benchmark {
    println!("{}", b.range_description());
    // Output: $100,000-$250,000 (median: $150,000)

    println!("Your offer of $140,000 is: {}",
        b.is_competitive(140_000)
    );
    // Output: competitive

    println!("Negotiation target: ${}",
        b.negotiation_target(140_000)
    );
    // Output: Negotiation target: $150,000
}
```

### 3. Compare Multiple Offers

```rust
let comparisons = analyzer.compare_offers(vec![1, 2, 3]).await?;

for comp in comparisons {
    println!("\n{}", comp.company);
    println!("  Base: ${}", comp.base_salary);
    println!("  Total: ${}", comp.total_compensation);
    println!("  Market: {}", comp.market_position);
    println!("  → {}", comp.recommendation);
}
```

**Example Output:**
```
Google
  Base: $180,000
  Total: $250,000
  Market: above_market
  → Excellent offer! Accept or negotiate equity.

Meta
  Base: $170,000
  Total: $300,000
  Market: at_market
  → Fair offer. Consider negotiating for 10-15% more.

Startup XYZ
  Base: $130,000
  Total: $150,000
  Market: below_market
  → Below market. Counter with $150,000-$180,000.
```

### 4. Generate Negotiation Script

```rust
use std::collections::HashMap;

let mut params = HashMap::new();
params.insert("company".to_string(), "Google".to_string());
params.insert("current_offer".to_string(), "150,000".to_string());
params.insert("target_min".to_string(), "170,000".to_string());
params.insert("target_max".to_string(), "190,000".to_string());
params.insert("location".to_string(), "San Francisco".to_string());
params.insert("years_experience".to_string(), "5".to_string());

let script = analyzer.generate_negotiation_script(
    "initial_offer",
    params
).await?;

println!("{}", script);
```

**Output:**
```
Thank you for the offer! I'm excited about the opportunity to join Google.
Based on my research of market rates for this role in San Francisco and my
5 years of experience, I was hoping for a compensation package in the range
of $170,000-$190,000. Is there any flexibility in the current offer of $150,000?
```

### 5. Track Offer Negotiation

```rust
// Create initial offer
let offer_id = sqlx::query!(
    "INSERT INTO offers (application_id, base_salary, equity_shares) VALUES (?, ?, ?)",
    application_id,
    150_000,
    10_000
)
.execute(&db)
.await?
.last_insert_rowid();

// Log negotiation attempt
sqlx::query!(
    r#"
    INSERT INTO negotiation_history (offer_id, negotiation_round, initial_offer, counter_offer, outcome)
    VALUES (?, 1, 150000, 170000, 'pending')
    "#,
    offer_id
)
.execute(&db)
.await?;

// Update after successful negotiation
sqlx::query!(
    "UPDATE negotiation_history SET final_offer = ?, outcome = 'accepted' WHERE offer_id = ?",
    165_000,
    offer_id
)
.execute(&db)
.await?;
```

---

## 📊 Data Sources

### 1. H1B Salary Database (Primary)

**Source:** U.S. Department of Labor - Foreign Labor Certification Data Center
**URL:** https://www.flcdatacenter.com/
**Coverage:** 500,000+ certified H1B applications annually
**Legal:** ✅ Public domain (Freedom of Information Act)

**Why H1B Data:**
- ✅ Legally public and free
- ✅ Verified by U.S. government
- ✅ Includes exact salaries (not ranges)
- ✅ Covers all major tech hubs
- ✅ Updated quarterly

**Data Fields:**
- Job Title
- Employer Name
- Annual Salary ($)
- Work Location (City, State, ZIP)
- SOC Code (occupational classification)
- Decision Date

### 2. User-Reported Salaries (Secondary)

**Source:** JobSentinel users (opt-in crowdsourcing)
**Coverage:** Community-contributed
**Verification:** Optional offer letter upload

**Privacy:**
- Anonymized by default
- Company name optional
- Helps fill gaps in H1B data

---

## 🎯 Seniority Detection

### Automatic Inference

**From Years of Experience:**
```rust
let seniority = SeniorityLevel::from_years_of_experience(5);
// Output: SeniorityLevel::Mid

// 0-2 years  → Entry
// 3-5 years  → Mid
// 6-10 years → Senior
// 11-15 years → Staff
// 16+ years  → Principal
```

**From Job Title:**
```rust
let seniority = SeniorityLevel::from_job_title("Senior Software Engineer");
// Output: SeniorityLevel::Senior

// Detects: junior, associate → Entry
// Detects: senior, sr., lead → Senior
// Detects: staff, architect → Staff
// Detects: principal, distinguished → Principal
```

---

## 💬 Negotiation Templates

### Built-in Templates

| Template | Scenario | Use When |
|----------|----------|----------|
| **Initial Offer Response** | `initial_offer` | First time receiving offer |
| **Counter Offer** | `counter_offer` | Negotiating after initial response |
| **Competing Offer Leverage** | `competing_offer` | You have multiple offers |
| **Equity Focused** | `equity_focused` | Prioritizing stock/options |

### Template Placeholders

Common placeholders:
- `{{company}}` - Company name
- `{{current_offer}}` - Their current offer
- `{{target_salary}}` - Your target salary
- `{{years_experience}}` - Your experience level
- `{{key_skills}}` - Your relevant skills
- `{{location}}` - Job location
- `{{competing_company}}` - Name of competing offer
- `{{competing_offer}}` - Competing offer amount

### Custom Templates

```rust
use jobsentinel::core::salary::negotiation::NegotiationScriptGenerator;

let generator = NegotiationScriptGenerator::new(db_pool);

generator.add_template(
    "Remote Work Request",
    "remote_request",
    "I'm very excited about joining {{company}}. Given my {{years_experience}} years \
     of experience working remotely, would it be possible to work fully remote instead \
     of the hybrid arrangement? This would allow me to be most productive.",
    vec!["company".to_string(), "years_experience".to_string()]
).await?;
```

---

## 📈 Salary Prediction Algorithm

### Prediction Flow

1. **Extract Job Details**
   - Job title, location from database

2. **Infer Seniority**
   - From years of experience (if provided)
   - OR from job title keywords

3. **Query Benchmarks**
   ```sql
   SELECT median_salary, p75_salary, sample_size
   FROM salary_benchmarks
   WHERE job_title_normalized = ?
     AND location_normalized LIKE ?
     AND seniority_level = ?
   ORDER BY sample_size DESC
   LIMIT 1
   ```

4. **Fallback Strategy**
   - **Level 1:** Exact match (title + location + seniority) - confidence: 90%
   - **Level 2:** Title + seniority (any location, averaged) - confidence: 60%
   - **Level 3:** Industry defaults by seniority - confidence: 30%

5. **Store Prediction**
   - Cache in `job_salary_predictions` table
   - Avoid redundant calculations

### Default Salary Ranges (Level 3 Fallback)

| Seniority | Base Salary | Range |
|-----------|-------------|-------|
| Entry | $80,000 | $64,000 - $104,000 |
| Mid | $120,000 | $96,000 - $156,000 |
| Senior | $160,000 | $128,000 - $208,000 |
| Staff | $200,000 | $160,000 - $260,000 |
| Principal | $250,000 | $200,000 - $325,000 |

---

## 🧪 Testing

### Unit Tests

```bash
cargo test --lib salary

# Test coverage:
# ✅ Seniority inference from years
# ✅ Seniority inference from title
# ✅ Job title normalization
# ✅ Location normalization
# ✅ Salary formatting
# ✅ Competitiveness checking
# ✅ Negotiation target calculation
# ✅ Template placeholder replacement
```

**Test Statistics:**
- **Salary Module:** 4 tests
- **Benchmarks:** 3 tests
- **Negotiation:** 1 test
- **Total:** 8 unit tests

---

## 📊 Analytics Queries

### Top Paying Locations

```sql
SELECT location_normalized, median_salary
FROM salary_benchmarks
WHERE job_title_normalized = 'software engineer'
  AND seniority_level = 'senior'
ORDER BY median_salary DESC
LIMIT 10;
```

### Salary Trends Over Time

```sql
SELECT
  strftime('%Y', decision_date) as year,
  AVG(wage_rate_of_pay_from) as avg_salary
FROM h1b_salaries
WHERE job_title LIKE '%Software Engineer%'
  AND case_status = 'Certified'
GROUP BY year
ORDER BY year DESC;
```

### Offer Acceptance Rate

```sql
SELECT
  outcome,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM negotiation_history), 1) as percentage
FROM negotiation_history
GROUP BY outcome;
```

---

## 🚀 Future Enhancements

### Phase 2: Machine Learning (Weeks 3-4)

- [ ] **ML Salary Predictor** - Train on 500K+ H1B records
- [ ] **Feature Engineering** - Company size, funding, tech stack
- [ ] **Confidence Intervals** - Statistical prediction ranges
- [ ] **Trend Detection** - Identify rising/falling markets

### Phase 3: Advanced Data Sources (Weeks 4-5)

- [ ] **Levels.fyi Integration** - API or ethical scraping (if available)
- [ ] **Glassdoor Estimates** - Supplement H1B data
- [ ] **Company Funding Data** - Correlate with salary levels
- [ ] **Equity Valuation** - Calculate RSU/option worth

### Phase 4: AI-Powered Scripts (Week 5)

- [ ] **GPT Integration** - Generate custom negotiation scripts
- [ ] **Tone Analysis** - Professional, friendly, assertive modes
- [ ] **Multi-Round Negotiation** - Conversational flow
- [ ] **Email Generation** - Ready-to-send negotiation emails

---

## 🔧 API Reference

### SalaryAnalyzer

```rust
pub struct SalaryAnalyzer;

impl SalaryAnalyzer {
    pub fn new(db: SqlitePool) -> Self;

    pub async fn predict_salary_for_job(&self, job_hash: &str, years_of_experience: Option<i32>) -> Result<SalaryPrediction>;
    pub async fn get_benchmark(&self, job_title: &str, location: &str, seniority: SeniorityLevel) -> Result<Option<SalaryBenchmark>>;
    pub async fn generate_negotiation_script(&self, scenario: &str, params: HashMap<String, String>) -> Result<String>;
    pub async fn compare_offers(&self, offer_ids: Vec<i64>) -> Result<Vec<OfferComparison>>;
}
```

### SalaryBenchmark

```rust
pub struct SalaryBenchmark {
    pub job_title: String,
    pub location: String,
    pub seniority_level: SeniorityLevel,
    pub min_salary: i64,
    pub p25_salary: i64,
    pub median_salary: i64,
    pub p75_salary: i64,
    pub max_salary: i64,
    pub average_salary: i64,
    pub sample_size: i64,
    pub last_updated: DateTime<Utc>,
}

impl SalaryBenchmark {
    pub fn range_description(&self) -> String;
    pub fn is_competitive(&self, offered_salary: i64) -> &'static str;
    pub fn negotiation_target(&self, current_offer: i64) -> i64;
}
```

### SalaryPredictor

```rust
pub struct SalaryPredictor;

impl SalaryPredictor {
    pub fn new(db: SqlitePool) -> Self;

    pub async fn predict_for_job(&self, job_hash: &str, years_of_experience: Option<i32>) -> Result<SalaryPrediction>;
    pub async fn get_prediction(&self, job_hash: &str) -> Result<Option<SalaryPrediction>>;
}
```

---

## ✅ Implementation Status

### Phase 1: Foundation ✅ COMPLETE

- [x] Database schema (7 tables, 8 indexes)
- [x] H1B data structure
- [x] Salary benchmarks (aggregated stats)
- [x] Salary prediction algorithm (3-level fallback)
- [x] Seniority detection (years + title)
- [x] Offer comparison tool
- [x] Negotiation script generator (4 templates)
- [x] Negotiation history tracking
- [x] Comprehensive unit tests (8 tests)
- [x] Full documentation

### Phase 2-4: Future 🔜

- [ ] H1B data import tool (CSV → SQLite)
- [ ] ML-based salary prediction
- [ ] Levels.fyi integration
- [ ] GPT-powered script generation
- [ ] Equity valuation calculator
- [ ] UI components

---

**Last Updated:** 2025-11-15
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ Phase 1 Complete (Data Infrastructure)
**Next Feature:** Job Market Intelligence Dashboard (P0)

💡 **Pro Tip:** Always negotiate! Research shows 70% of employers expect it, and the average salary increase from negotiation is 10-15%.
