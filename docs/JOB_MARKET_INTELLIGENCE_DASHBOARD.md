# Job Market Intelligence Dashboard
## Real-Time Analytics & Trend Visualization

> **Status:** ✅ Core Implementation Complete
> **Version:** 1.0.0
> **Last Updated:** 2025-11-15
> **Estimated Effort:** 3-4 weeks (Phase 1 Complete: 2 weeks)

---

## 🎯 Overview

JobSentinel's Market Intelligence Dashboard provides real-time analytics on job market trends, skill demand, salary movements, company hiring velocity, and geographic distribution. Make data-driven career decisions with comprehensive market insights.

### Key Features

- **📊 Skill Demand Trends** - Track which skills are rising/falling in demand
- **💰 Salary Trends** - Monitor salary changes by role and location
- **🔥 Company Hiring Velocity** - Identify which companies are hiring aggressively
- **📍 Geographic Heatmaps** - See where jobs are concentrated
- **🚨 Market Alerts** - Get notified of skill surges, salary spikes, hiring sprees
- **📈 Market Snapshots** - Daily market health indicators

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────┐
│      Job Market Intelligence Engine             │
│                                                  │
│  ┌──────────────┐      ┌──────────────────────┐│
│  │  Daily Data  │─────▶│  Trend Computation   ││
│  │  Aggregation │      │  (Skills, Salaries)  ││
│  └──────────────┘      └──────────────────────┘│
│         │                       │               │
│         ▼                       ▼               │
│  ┌──────────────┐      ┌──────────────────────┐│
│  │   Market     │      │   Alert Detection    ││
│  │  Snapshots   │      │   (Anomalies)        ││
│  └──────────────┘      └──────────────────────┘│
└─────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
       ┌────────────┐      ┌────────────────┐
       │  Dashboard │      │  Notifications │
       │   Charts   │      │   & Alerts     │
       └────────────┘      └────────────────┘
```

### Database Schema

```sql
-- Skill demand over time
skill_demand_trends
├── skill_name, date
├── mention_count, job_count
├── avg_salary, median_salary
└── top_company, top_location

-- Salary movements
salary_trends
├── job_title_normalized, location_normalized, date
├── min/p25/median/p75/max_salary
├── sample_size
└── salary_growth_pct

-- Company hiring activity
company_hiring_velocity
├── company_name, date
├── jobs_posted/filled/active_count
├── hiring_trend (increasing/stable/decreasing)
└── top_role, top_location

-- Geographic distribution
location_job_density
├── location_normalized, city, state
├── job_count, remote_job_count
├── avg/median_salary
└── top_skill, top_company, top_role

-- Daily market health
market_snapshots
├── date, total_jobs, new_jobs_today
├── avg/median_salary
├── remote_job_percentage
├── market_sentiment (bullish/neutral/bearish)
└── top_skill, top_company, top_location

-- Role demand trends
role_demand_trends
├── job_title_normalized, date
├── job_count, avg/median_salary
├── demand_trend (rising/stable/falling)
└── remote_percentage

-- Market alerts
market_alerts
├── alert_type (skill_surge, salary_spike, hiring_spree, etc.)
├── title, description, severity
├── related_entity (skill/company/location/role)
├── metric_value, metric_change_pct
└── is_read, created_at
```

---

## 🚀 Usage Guide

### 1. Run Daily Market Analysis

```rust
use jobsentinel::core::market_intelligence::MarketIntelligence;

let market_intel = MarketIntelligence::new(db_pool);

// Run full daily analysis (scheduled job)
let snapshot = market_intel.run_daily_analysis().await?;

println!("Market Snapshot: {}", snapshot.summary());
// Output: "150 new jobs posted today (10000 total). Market sentiment: bullish. Top skill: Python"
```

**What it does:**
- Computes skill demand trends
- Tracks salary changes by role/location
- Calculates company hiring velocity
- Aggregates location job density
- Creates daily market snapshot
- Detects market alerts (skill surges, salary spikes, hiring sprees)

### 2. Get Trending Skills

```rust
let trending_skills = market_intel.get_trending_skills(10).await?;

for skill in trending_skills {
    println!("{}: {} jobs (avg salary: ${})",
        skill.skill_name,
        skill.total_jobs,
        skill.avg_salary.unwrap_or(0)
    );
}
```

**Example Output:**
```
Python: 1,250 jobs (avg salary: $135,000)
React: 1,100 jobs (avg salary: $130,000)
TypeScript: 950 jobs (avg salary: $140,000)
AWS: 800 jobs (avg salary: $145,000)
Docker: 750 jobs (avg salary: $138,000)
```

### 3. Track Company Hiring Activity

```rust
let active_companies = market_intel.get_most_active_companies(10).await?;

for company in active_companies {
    println!("{}: {} jobs posted, {} active (trend: {})",
        company.company_name,
        company.total_posted,
        company.avg_active as i32,
        company.hiring_trend.unwrap_or("unknown".to_string())
    );
}
```

**Example Output:**
```
Google: 125 jobs posted, 450 active (trend: increasing)
Meta: 100 jobs posted, 380 active (trend: stable)
Amazon: 95 jobs posted, 520 active (trend: increasing)
Microsoft: 85 jobs posted, 410 active (trend: stable)
Netflix: 50 jobs posted, 180 active (trend: decreasing)
```

### 4. Identify Hot Job Markets

```rust
let hot_locations = market_intel.get_hottest_locations(10).await?;

for location in hot_locations {
    println!("{}: {} jobs (median salary: ${})",
        location.location,
        location.total_jobs,
        location.avg_median_salary.unwrap_or(0)
    );
}
```

**Example Output:**
```
remote: 3,500 jobs (median salary: $145,000)
san francisco, ca: 2,100 jobs (median salary: $165,000)
new york, ny: 1,800 jobs (median salary: $155,000)
seattle, wa: 1,200 jobs (median salary: $150,000)
austin, tx: 900 jobs (median salary: $135,000)
```

### 5. Get Market Alerts

```rust
let alerts = market_intel.get_unread_alerts().await?;

for alert in alerts {
    println!("{} {} {}",
        alert.severity_emoji(),
        alert.type_emoji(),
        alert.title
    );
    println!("  {}", alert.description);
    println!("  Change: {}\n", alert.change_description());
}
```

**Example Output:**
```
ℹ️ 📈 Rust demand surging!
  The skill 'Rust' saw a 75% increase in job postings this week (140 → 245 mentions).
  Change: +75.0%

ℹ️ 💰 Software Engineer salaries jumping in San Francisco, CA
  Salaries for 'software engineer' in san francisco, ca increased by 12.5% (median: $175,000).
  Change: +12.5%

ℹ️ 🔥 Google hiring aggressively
  Google posted 25 new jobs today (450 total active positions).
  Change: N/A
```

### 6. Get Latest Market Snapshot

```rust
use jobsentinel::core::market_intelligence::MarketAnalyzer;

let analyzer = MarketAnalyzer::new(db_pool);
let snapshot = analyzer.get_latest_snapshot().await?;

if let Some(snap) = snapshot {
    println!("Date: {}", snap.date);
    println!("Total Jobs: {}", snap.total_jobs);
    println!("New Today: {}", snap.new_jobs_today);
    println!("Sentiment: {} {}", snap.sentiment_emoji(), snap.market_sentiment);
    println!("Remote: {:.1}%", snap.remote_job_percentage);
    println!("Top Skill: {}", snap.top_skill.unwrap_or("N/A".to_string()));
    println!("Median Salary: ${}", snap.median_salary.unwrap_or(0));
}
```

**Example Output:**
```
Date: 2025-11-15
Total Jobs: 10,500
New Today: 150
Sentiment: 📈 bullish
Remote: 35.5%
Top Skill: Python
Median Salary: $145,000
```

### 7. Historical Market Analysis

```rust
// Get last 30 days of market data
let historical = analyzer.get_historical_snapshots(30).await?;

for snapshot in historical {
    println!("{}: {} jobs ({} new) - {}",
        snapshot.date,
        snapshot.total_jobs,
        snapshot.new_jobs_today,
        snapshot.market_sentiment
    );
}
```

---

## 📊 Analytics Queries

### Top Paying Locations

```sql
SELECT location_normalized, AVG(median_salary) as avg_median
FROM location_job_density
WHERE date >= date('now', '-30 days')
GROUP BY location_normalized
ORDER BY avg_median DESC
LIMIT 10;
```

### Fastest Growing Skills

```sql
SELECT
    curr.skill_name,
    curr.job_count as current_jobs,
    prev.job_count as prev_jobs,
    ((curr.job_count - prev.job_count) * 100.0 / prev.job_count) as growth_pct
FROM skill_demand_trends curr
LEFT JOIN skill_demand_trends prev ON
    curr.skill_name = prev.skill_name AND
    prev.date = date(curr.date, '-30 days')
WHERE curr.date = date('now')
  AND prev.job_count > 0
ORDER BY growth_pct DESC
LIMIT 10;
```

### Companies with Hiring Freezes

```sql
SELECT company_name, jobs_active_count
FROM company_hiring_velocity
WHERE date >= date('now', '-7 days')
  AND jobs_posted_count = 0
  AND jobs_active_count > 0
ORDER BY jobs_active_count DESC;
```

### Salary Growth by Role

```sql
SELECT
    job_title_normalized,
    location_normalized,
    median_salary,
    salary_growth_pct
FROM salary_trends
WHERE date = date('now')
  AND salary_growth_pct IS NOT NULL
ORDER BY salary_growth_pct DESC
LIMIT 20;
```

---

## 🔔 Market Alert Types

### 1. Skill Surge 📈

**Trigger:** Skill mentions increased by ≥50% in a week

**Example:**
```
Rust demand surging!
The skill 'Rust' saw a 75% increase in job postings this week (140 → 245 mentions).
```

**Action:** Consider learning this skill if it aligns with your career goals.

### 2. Salary Spike 💰

**Trigger:** Median salary increased by ≥25% for a role/location

**Example:**
```
DevOps Engineer salaries jumping in Austin, TX
Salaries for 'devops engineer' in austin, tx increased by 28.0% (median: $145,000).
```

**Action:** Great time to negotiate or switch roles in this market.

### 3. Hiring Spree 🔥

**Trigger:** Company posted ≥10 jobs in a single day

**Example:**
```
Meta hiring aggressively
Meta posted 35 new jobs today (520 total active positions).
```

**Action:** Prime opportunity to apply - company is scaling fast.

### 4. Hiring Freeze ❄️

**Trigger:** Company stopped posting jobs for ≥14 days (future implementation)

**Action:** Avoid applying - company may be restructuring.

### 5. Location Boom 📍

**Trigger:** New location sees ≥100 jobs in a month (future implementation)

**Action:** Consider relocating or targeting this market.

### 6. Role Obsolete 📉

**Trigger:** Job demand for a role decreased by ≥50% (future implementation)

**Action:** Upskill or pivot to related roles.

---

## 🧪 Testing

### Unit Tests

```bash
cargo test --lib market_intelligence

# Test coverage:
# ✅ Skill demand growth calculation
# ✅ Salary trend analysis
# ✅ Company hiring velocity
# ✅ Location job density
# ✅ Market snapshot creation
# ✅ Alert type conversion
# ✅ Alert formatting
```

**Test Statistics:**
- **Trends Module:** 5 tests
- **Analytics Module:** 2 tests
- **Alerts Module:** 4 tests
- **Total:** 11 unit tests

---

## 📈 Data Visualization (Frontend)

### Recommended Charts

**1. Skill Demand Line Chart**
- X-axis: Date (last 30 days)
- Y-axis: Job count
- Lines: Top 5 skills
- Library: Chart.js or Recharts

**2. Salary Trend Chart**
- X-axis: Date
- Y-axis: Median salary
- Lines: Different locations for same role
- Show growth percentage

**3. Company Hiring Velocity Bar Chart**
- X-axis: Company names
- Y-axis: Jobs posted (last 30 days)
- Color: Hiring trend (green=increasing, yellow=stable, red=decreasing)

**4. Geographic Heatmap**
- Map: U.S. states or cities
- Heat intensity: Job count
- Tooltip: Median salary, top skill

**5. Market Sentiment Gauge**
- Type: Semi-circle gauge
- Values: Bullish (green), Neutral (yellow), Bearish (red)
- Shows current market health

---

## 🔧 API Reference

### MarketIntelligence

```rust
pub struct MarketIntelligence {
    db: SqlitePool,
    analyzer: MarketAnalyzer,
}

impl MarketIntelligence {
    pub fn new(db: SqlitePool) -> Self;

    // Main analysis
    pub async fn run_daily_analysis(&self) -> Result<MarketSnapshot>;

    // Trends
    pub async fn get_trending_skills(&self, limit: usize) -> Result<Vec<SkillTrend>>;
    pub async fn get_most_active_companies(&self, limit: usize) -> Result<Vec<CompanyActivity>>;
    pub async fn get_hottest_locations(&self, limit: usize) -> Result<Vec<LocationHeat>>;

    // Alerts
    pub async fn get_unread_alerts(&self) -> Result<Vec<MarketAlert>>;
}
```

### MarketAnalyzer

```rust
pub struct MarketAnalyzer;

impl MarketAnalyzer {
    pub fn new(db: SqlitePool) -> Self;

    pub async fn create_daily_snapshot(&self) -> Result<MarketSnapshot>;
    pub async fn get_snapshot(&self, date: NaiveDate) -> Result<Option<MarketSnapshot>>;
    pub async fn get_latest_snapshot(&self) -> Result<Option<MarketSnapshot>>;
    pub async fn get_historical_snapshots(&self, days: usize) -> Result<Vec<MarketSnapshot>>;
}
```

### MarketSnapshot

```rust
pub struct MarketSnapshot {
    pub date: NaiveDate,
    pub total_jobs: i64,
    pub new_jobs_today: i64,
    pub jobs_filled_today: i64,
    pub avg_salary: Option<i64>,
    pub median_salary: Option<i64>,
    pub remote_job_percentage: f64,
    pub top_skill: Option<String>,
    pub top_company: Option<String>,
    pub top_location: Option<String>,
    pub total_companies_hiring: i64,
    pub market_sentiment: String,
    pub notes: Option<String>,
}

impl MarketSnapshot {
    pub fn summary(&self) -> String;
    pub fn is_healthy(&self) -> bool;
    pub fn sentiment_emoji(&self) -> &str;
}
```

### MarketAlert

```rust
pub struct MarketAlert {
    pub id: i64,
    pub alert_type: AlertType,
    pub title: String,
    pub description: String,
    pub severity: AlertSeverity,
    pub related_entity: Option<String>,
    pub related_entity_type: Option<EntityType>,
    pub metric_value: Option<f64>,
    pub metric_change_pct: Option<f64>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

impl MarketAlert {
    pub async fn mark_read(&self, db: &SqlitePool) -> Result<()>;
    pub fn change_description(&self) -> String;
    pub fn severity_emoji(&self) -> &str;
    pub fn type_emoji(&self) -> &str;
}
```

---

## ✅ Implementation Status

### Phase 1: Foundation ✅ COMPLETE

- [x] Database schema (7 tables, 4 views, 15 indexes)
- [x] Skill demand trend computation
- [x] Salary trend tracking
- [x] Company hiring velocity analysis
- [x] Location job density aggregation
- [x] Role demand trend tracking
- [x] Daily market snapshot creation
- [x] Market alert detection (3 types: skill surge, salary spike, hiring spree)
- [x] Alert management (mark read, cleanup)
- [x] Comprehensive unit tests (11 tests)
- [x] Full API documentation

### Phase 2: Enhanced Analytics 🔜

- [ ] Machine learning trend prediction
- [ ] Seasonality detection (hiring cycles)
- [ ] Industry-specific breakdowns (finance, tech, healthcare)
- [ ] Skill co-occurrence analysis (skills that appear together)
- [ ] Additional alert types (hiring freeze, location boom, role obsolete)

### Phase 3: Advanced Visualization 🔜

- [ ] Interactive Chart.js/Recharts components
- [ ] Real-time dashboard updates (WebSocket)
- [ ] Export to CSV/PDF reports
- [ ] Email digest of weekly market insights
- [ ] Custom alert configuration (user-defined thresholds)

---

## 🗓️ Scheduled Jobs

### Daily Analysis (Recommended: 2 AM)

```rust
// In your scheduler
scheduler.schedule_daily("0 2 * * *", || async {
    let market_intel = MarketIntelligence::new(db_pool);
    market_intel.run_daily_analysis().await?;
    Ok(())
});
```

**What it computes:**
- Skill demand trends (yesterday's data)
- Salary trends (updated benchmarks)
- Company hiring velocity (job posting counts)
- Location job density (geographic distribution)
- Market snapshot (daily aggregate stats)
- Market alerts (detect anomalies)

### Weekly Cleanup (Recommended: Sunday)

```rust
scheduler.schedule_weekly("0 3 * * 0", || async {
    // Delete read alerts older than 30 days
    alerts::cleanup_old_alerts(&db_pool, 30).await?;
    Ok(())
});
```

---

## 📊 Example Dashboard Mockup

```
┌────────────────────────────────────────────────────────────┐
│  Job Market Intelligence Dashboard                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Market Snapshot (Nov 15, 2025)        📈 Bullish         │
│  ────────────────────────────────────────────────────      │
│  Total Jobs:        10,500                                 │
│  New Today:         150                                    │
│  Median Salary:     $145,000                              │
│  Remote Jobs:       35.5%                                 │
│  Top Skill:         Python                                │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Trending Skills (Last 30 Days)                            │
│  ────────────────────────────────────────────────────      │
│  1. Python          1,250 jobs    $135k avg    +15%       │
│  2. React           1,100 jobs    $130k avg    +22%       │
│  3. TypeScript        950 jobs    $140k avg    +18%       │
│  4. AWS               800 jobs    $145k avg    +10%       │
│  5. Docker            750 jobs    $138k avg    +25%       │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Most Active Companies                                     │
│  ────────────────────────────────────────────────────      │
│  1. Google          125 posted    450 active   ▲          │
│  2. Meta            100 posted    380 active   ─          │
│  3. Amazon           95 posted    520 active   ▲          │
│  4. Microsoft        85 posted    410 active   ─          │
│  5. Netflix          50 posted    180 active   ▼          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Market Alerts (3 unread)                    🚨            │
│  ────────────────────────────────────────────────────      │
│  📈 Rust demand surging! (+75%)                           │
│  💰 DevOps salaries spiking in Austin (+28%)              │
│  🔥 Meta hiring aggressively (35 jobs today)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🎓 Use Cases

### 1. Career Decision Making

**Scenario:** You're deciding which skill to learn next.

**How Market Intelligence Helps:**
- Check trending skills (last 30 days)
- See average salaries for each skill
- Identify skills with highest growth rate
- Avoid skills with declining demand

**Example Query:**
```rust
let skills = market_intel.get_trending_skills(20).await?;
let fastest_growing = skills.iter()
    .filter(|s| s.total_jobs > 100) // At least 100 jobs
    .max_by_key(|s| s.avg_salary.unwrap_or(0));
```

### 2. Salary Negotiation Research

**Scenario:** You received an offer and want to negotiate.

**How Market Intelligence Helps:**
- Compare offered salary to market median
- Check if salaries are rising/falling for your role
- Identify top-paying locations
- See if company is hiring aggressively (more leverage)

**Example:**
```rust
// Is my offer competitive?
let trend = analyzer.get_salary_trend("software engineer", "san francisco, ca").await?;
if my_offer < trend.median_salary {
    println!("Below market median by ${}", trend.median_salary - my_offer);
}
```

### 3. Relocation Planning

**Scenario:** You're considering moving to a new city.

**How Market Intelligence Helps:**
- See job counts by location
- Compare median salaries across cities
- Identify emerging job markets (location booms)
- Check remote job availability

**Example:**
```rust
let locations = market_intel.get_hottest_locations(20).await?;
for loc in locations {
    println!("{}: {} jobs @ ${} median",
        loc.city.unwrap_or("Unknown".to_string()),
        loc.total_jobs,
        loc.avg_median_salary.unwrap_or(0)
    );
}
```

### 4. Company Research

**Scenario:** You want to know if a company is growing or struggling.

**How Market Intelligence Helps:**
- Track hiring velocity (posting trends)
- Detect hiring freezes (red flag)
- See if company is hiring aggressively (growth signal)
- Compare to competitors

**Example:**
```rust
let companies = market_intel.get_most_active_companies(50).await?;
let target_company = companies.iter()
    .find(|c| c.company_name == "MyTargetCompany");

if let Some(company) = target_company {
    if company.hiring_trend == Some("decreasing".to_string()) {
        println!("⚠️ Warning: Company hiring is slowing down");
    }
}
```

---

**Last Updated:** 2025-11-15
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ Phase 1 Complete (Data Infrastructure)
**Next Feature:** Browser Extension (P0)

💡 **Pro Tip:** Run daily analysis as a scheduled job to maintain up-to-date market insights. Enable market alerts to get notified of significant changes in your target skills or companies!
