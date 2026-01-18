# Market Intelligence UI - Complete Wiring Plan

## Status: READY FOR IMPLEMENTATION

## Overview

Wire up the Market Intelligence backend (95% complete, 15 tables, 5,300 lines) to a fully functional UI.

**Current State:**
- Backend: 8 modules, 15 database tables, 5 Tauri commands, 158 tests
- Frontend: Market.tsx (355 lines) with basic lists, type mismatches, no visualizations

**Target State:**
- Fixed type interfaces
- 4 new visualization components
- Tabbed page layout with charts
- Alert interaction (mark as read)
- Market snapshot display
- Full documentation

---

## Phase 1: Backend Enhancements (Parallel - 4 tasks)

### 1A: Enhanced SkillTrend Query
**File:** `src-tauri/src/core/market_intelligence/queries.rs`
**Agent:** rust-expert
**Lines:** +30

Add fields to compute from historical data:
```rust
pub struct SkillTrend {
    pub skill_name: String,
    pub total_jobs: i64,
    pub avg_salary: Option<i64>,
    pub change_percent: f64,      // NEW: 7-day change
    pub trend_direction: String,  // NEW: "up" | "down" | "flat"
}
```

### 1B: Enhanced CompanyActivity Query
**File:** `src-tauri/src/core/market_intelligence/queries.rs`
**Agent:** rust-expert
**Lines:** +25

Add salary data via join:
```rust
pub struct CompanyActivity {
    pub company_name: String,
    pub total_posted: i64,
    pub avg_active: f64,
    pub hiring_trend: Option<String>,
    pub avg_salary: Option<i64>,  // NEW: from salary predictions
    pub growth_rate: f64,         // NEW: computed
}
```

### 1C: Enhanced LocationHeat Query
**File:** `src-tauri/src/core/market_intelligence/queries.rs`
**Agent:** rust-expert
**Lines:** +15

Add remote percentage:
```rust
pub struct LocationHeat {
    pub location: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub total_jobs: i64,
    pub avg_median_salary: Option<i64>,
    pub remote_percent: f64,  // NEW: computed from remote_job_count
}
```

### 1D: New Tauri Commands
**File:** `src-tauri/src/commands/market.rs`
**Agent:** rust-expert
**Lines:** +80

Add commands:
- `get_market_snapshot() -> MarketSnapshot`
- `get_historical_snapshots(days: i64) -> Vec<MarketSnapshot>`
- `get_salary_trends(role: Option<String>, location: Option<String>) -> Vec<SalaryTrend>`
- `get_role_demand(limit: usize) -> Vec<RoleDemandTrend>`
- `mark_alert_read(id: i64) -> bool`
- `mark_all_alerts_read() -> u64`

---

## Phase 2: Frontend Type Alignment (1 task)

### 2A: Update TypeScript Interfaces
**File:** `src/pages/Market.tsx`
**Agent:** typescript-expert
**Lines:** +50

Align interfaces with enhanced backend:
```typescript
interface SkillTrend {
  skill_name: string;
  total_jobs: number;
  avg_salary: number | null;
  change_percent: number;
  trend_direction: "up" | "down" | "flat";
}

interface CompanyActivity {
  company_name: string;
  total_posted: number;
  avg_active: number;
  hiring_trend: string | null;
  avg_salary: number | null;
  growth_rate: number;
}

interface LocationHeat {
  location: string;
  city: string | null;
  state: string | null;
  total_jobs: number;
  avg_median_salary: number | null;
  remote_percent: number;
}

interface MarketAlert {
  id: number;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  related_entity: string | null;
  metric_value: number | null;
  metric_change_pct: number | null;
  is_read: boolean;
  created_at: string;
}

interface MarketSnapshot {
  date: string;
  total_jobs: number;
  new_jobs_today: number;
  jobs_filled_today: number;
  avg_salary: number | null;
  median_salary: number | null;
  remote_job_percentage: number;
  top_skill: string | null;
  top_company: string | null;
  top_location: string | null;
  total_companies_hiring: number;
  market_sentiment: "bullish" | "neutral" | "bearish";
}
```

---

## Phase 3: New Components (Parallel - 4 tasks)

### 3A: MarketSnapshotCard
**File:** `src/components/MarketSnapshotCard.tsx` (NEW)
**Agent:** typescript-expert
**Lines:** ~100

Daily market summary card with:
- Total jobs, new today, filled today
- Remote percentage
- Market sentiment indicator (bullish/neutral/bearish)
- Top skill, company, location badges

### 3B: TrendChart (Recharts)
**File:** `src/components/TrendChart.tsx` (NEW)
**Agent:** typescript-expert
**Lines:** ~200

Configurable chart component:
- Line chart for skill demand over time
- Bar chart for company hiring velocity
- Props: data, type, title, xKey, yKey

### 3C: MarketAlertCard
**File:** `src/components/MarketAlertCard.tsx` (NEW)
**Agent:** typescript-expert
**Lines:** ~100

Rich alert display:
- Severity color coding (Critical=red, Warning=yellow, Info=blue)
- Alert type icon
- Related entity badge
- Metric value with change percentage
- "Mark as Read" button

### 3D: LocationHeatmap
**File:** `src/components/LocationHeatmap.tsx` (NEW)
**Agent:** typescript-expert
**Lines:** ~150

Grid-based location visualization:
- Job count intensity coloring
- Remote percentage indicator per location
- Salary display on hover/click
- Responsive grid layout

---

## Phase 4: Market Page Overhaul (1 task)

### 4A: Complete Market.tsx Rewrite
**File:** `src/pages/Market.tsx`
**Agent:** typescript-expert
**Lines:** ~600 (current 355)

New layout:
```
┌────────────────────────────────────────────────────────────┐
│  Market Intelligence                   [Refresh] [30d ▼]  │
├────────────────────────────────────────────────────────────┤
│  [Overview] [Skills] [Companies] [Locations] [Alerts (3)] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  MarketSnapshotCard                                 │  │
│  │  10,500 Jobs | 150 New | 35% Remote | 📈 Bullish    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │  TrendChart: Skills  │  │  TrendChart: Companies│      │
│  │  [Line Chart]        │  │  [Bar Chart]          │      │
│  │                      │  │                       │      │
│  │  1. Python +15%      │  │  1. Google ▲          │      │
│  │  2. React  +22%      │  │  2. Meta   ─          │      │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  LocationHeatmap                                    │  │
│  │  [Grid: Remote | SF | NYC | Seattle | Austin | ...] │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Market Alerts (3 unread)                           │  │
│  │  📈 Rust demand surging! (+75%)       [Mark Read]   │  │
│  │  💰 DevOps salaries spiking (+28%)    [Mark Read]   │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

Features:
- Tab navigation (Overview, Skills, Companies, Locations, Alerts)
- Date range filter (7d, 30d, 90d)
- Auto-refresh toggle
- Keyboard navigation

---

## Phase 5: Documentation (Parallel - 3 tasks)

### 5A: Update Feature Docs
**File:** `docs/features/market-intelligence.md`
**Agent:** docs-expert
**Lines:** +40

- Add UI section with component descriptions
- Update implementation status checklist
- Add code examples for new components

### 5B: Update CHANGELOG
**File:** `CHANGELOG.md`
**Agent:** docs-expert
**Lines:** +25

Add v2.5.0 section with all Market Intelligence UI enhancements.

### 5C: Update ROADMAP
**File:** `docs/ROADMAP.md`
**Agent:** docs-expert
**Lines:** +15

- Mark Market Intelligence UI as complete
- Update version to 2.5.0

---

## Phase 6: Component Exports (1 task)

### 6A: Update Index
**File:** `src/components/index.ts`
**Agent:** typescript-expert
**Lines:** +5

Export new components:
```typescript
export { MarketSnapshotCard } from "./MarketSnapshotCard";
export { TrendChart } from "./TrendChart";
export { MarketAlertCard } from "./MarketAlertCard";
export { LocationHeatmap } from "./LocationHeatmap";
```

---

## Execution Waves

```
WAVE 1 (4 parallel rust-expert agents)
├── 1A: SkillTrend enhancement
├── 1B: CompanyActivity enhancement
├── 1C: LocationHeat enhancement
└── 1D: New Tauri commands

WAVE 2 (1 agent, depends on Wave 1)
└── 2A: TypeScript interface alignment

WAVE 3 (4 parallel typescript-expert agents)
├── 3A: MarketSnapshotCard
├── 3B: TrendChart
├── 3C: MarketAlertCard
└── 3D: LocationHeatmap

WAVE 4 (1 agent, depends on Wave 2+3)
└── 4A: Market.tsx overhaul

WAVE 5 (4 parallel agents)
├── 5A: market-intelligence.md (docs-expert)
├── 5B: CHANGELOG.md (docs-expert)
├── 5C: ROADMAP.md (docs-expert)
└── 6A: index.ts exports (typescript-expert)

FINAL: Build verification + commit
```

---

## Files Summary

| Phase | File | Action | Lines |
|-------|------|--------|-------|
| 1A | `src-tauri/src/core/market_intelligence/queries.rs` | Modify | +30 |
| 1B | `src-tauri/src/core/market_intelligence/queries.rs` | Modify | +25 |
| 1C | `src-tauri/src/core/market_intelligence/queries.rs` | Modify | +15 |
| 1D | `src-tauri/src/commands/market.rs` | Modify | +80 |
| 2A | `src/pages/Market.tsx` | Modify | +50 |
| 3A | `src/components/MarketSnapshotCard.tsx` | Create | ~100 |
| 3B | `src/components/TrendChart.tsx` | Create | ~200 |
| 3C | `src/components/MarketAlertCard.tsx` | Create | ~100 |
| 3D | `src/components/LocationHeatmap.tsx` | Create | ~150 |
| 4A | `src/pages/Market.tsx` | Rewrite | ~600 |
| 5A | `docs/features/market-intelligence.md` | Modify | +40 |
| 5B | `CHANGELOG.md` | Modify | +25 |
| 5C | `docs/ROADMAP.md` | Modify | +15 |
| 6A | `src/components/index.ts` | Modify | +5 |

**Total New Code:** ~1,000+ lines

---

## Verification Plan

1. **Rust Build:** `cargo build --release` - no errors
2. **Rust Tests:** `cargo test core::market` - all pass
3. **TypeScript Build:** `npm run build` - no errors
4. **Manual Testing:**
   - Open Market page (Cmd+5)
   - Verify snapshot card displays
   - Verify charts render with data
   - Verify location heatmap shows
   - Click "Mark as Read" on alert
   - Switch tabs
   - Change date range filter

---

## Dependencies

- Recharts (already in package.json)
- No new npm packages needed
- No new Rust crates needed
