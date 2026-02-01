# Smart Screening Answers Learning - Implementation Complete

## Overview

Smart learning system for JobSentinel's screening question answers that improves accuracy over time based on user behavior.

**Status:** Backend ✅ Complete | Frontend ✅ Complete | Integration ⏳ Pending

---

## What Was Built

### 1. Database Layer (Migration 00000000000002)

**New Tables:**

- `screening_answer_history` - Records every answer usage with modification tracking
  - Links to screening_answers, job_hash, application_attempt
  - Stores normalized question text for fuzzy matching
  - Tracks whether user modified the auto-filled answer

- `screening_learned_answers` - Auto-generated patterns from user modifications
  - Built from user behavior patterns
  - Lower initial confidence, improves with usage
  - JSON array of source questions

**Enhanced Tables:**

- `screening_answers` now includes:
  - `times_used` - Usage counter
  - `times_modified` - Modification counter
  - `last_used_at` - Recency tracking
  - `confidence_score` - Dynamic confidence (0.0-1.0)

**Indexes:**

- Question normalization (fuzzy search)
- Confidence scores (ranking)
- Usage timestamps (recency weighting)

---

### 2. Core Learning Logic (answer_learning.rs)

**Key Features:**

#### Question Normalization

```rust
// Lowercase, remove punctuation, collapse spaces
normalize_question("What's your salary? (USD)")
// Result: "what s your salary usd"
```

#### Similarity Calculation

- Word overlap (Jaccard similarity)
- Fast and good enough for MVP
- 0.0 = completely different, 1.0 = identical

#### Confidence Scoring Algorithm

```text
confidence = base × usage_weight × recency_weight × modification_penalty

Where:
  usage_weight = min(1.0, times_used / 10)  // Caps at 10 uses
  recency_weight = 1.0 - (days_since_last_use / 365)  // Decays over a year, min 0.3
  modification_penalty = 1.0 - (times_modified / times_used)  // Perfect if never modified
```

#### Three Suggestion Sources

1. **Manual Patterns** - From screening_answers table (regex matching)
2. **Learned Patterns** - From screening_learned_answers (auto-generated from behavior)
3. **Historical Answers** - From screening_answer_history (similar questions)

#### Smart Ranking

- Sorts by confidence descending
- Deduplicates (keeps highest confidence)
- Returns top N suggestions

---

### 3. Tauri Commands (4 new commands)

#### `get_suggested_answers(question, limit)`

Returns ranked answer suggestions with confidence scores.

**Response:**

```typescript
interface AnswerSuggestion {
  answer: string;
  confidence: number; // 0.0-1.0
  source: "manual" | "learned" | "historical";
  timesUsed: number;
  timesModified: number;
  lastUsedDaysAgo: number | null;
  modificationRate: number; // 0.0-1.0
}
```

#### `record_answer_usage(params)`

Tracks answer usage and modifications for learning.

**Parameters:**

- `screening_answer_id` - Which pattern matched (null if none)
- `question_text` - Original question text
- `answer_filled` - Answer that was auto-filled
- `was_modified` - Did user change it?
- `modified_to` - New answer if modified
- `job_hash` - Optional job context
- `application_attempt_id` - Optional application context

#### `get_answer_statistics(pattern)`

Returns comprehensive metrics for a specific pattern.

**Response:**

```typescript
interface AnswerStatistics {
  pattern: string;
  answer: string;
  timesUsed: number;
  timesModified: number;
  modificationRate: number;
  confidenceScore: number;
  lastUsedAt: string | null;
  createdAt: string;
  recentModifications: ModificationExample[];
}
```

#### `clear_answer_history(pattern?)`

Clears usage history (for learning reset). Optional pattern filter.

Returns: Count of records deleted.

---

### 4. Frontend Components

#### ScreeningAnswerSuggestions.tsx

**Features:**

- Fetches suggestions on question change
- Displays ranked cards with confidence badges
- Shows source (Manual/Learned/Historical)
- Usage statistics (times used, modification rate)
- "Use" button to select an answer
- Loading states and error handling

**Visual Design:**

- Gradient background (sentinel/blue)
- Numbered rank badges (1, 2, 3)
- Color-coded confidence: Green (≥80%), Blue (≥50%), Gray (<50%)
- Source icons: User (manual), Sparkles (learned), Clock (historical)

#### ScreeningAnswersForm.tsx Updates

**Enhancements:**

- Shows usage statistics per answer
- Confidence badge display
- Modification rate warnings (yellow if >0%)
- Last used relative time ("2 days ago")
- Backward compatible (optional fields)

---

## How It Works (User Flow)

### 1. Initial State

- User configures screening answers with regex patterns
- All answers start with confidence = 1.0, times_used = 0

### 2. During Auto-Fill

- FormFiller matches question against patterns
- Calls `record_answer_usage()` with filled answer
- Updates usage counters and confidence scores

### 3. User Modification Detection

- Compare original filled answer with final submitted value
- If different, record `was_modified = true` and `modified_to`
- Confidence score decreases based on modification rate

### 4. Suggestion System

- User sees screening question in frontend
- Frontend calls `get_suggested_answers(question)`
- Shows top 3 ranked by confidence
- User can pick a suggestion or type manually

### 5. Learning Loop

- High-confidence answers used more frequently
- Low-confidence answers shown less often
- Consistently modified answers generate new learned patterns
- Recent answers weighted higher than old ones

---

## Technical Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **Word overlap similarity** | Faster than Levenshtein, good enough for screening questions |
| **365-day decay** | Business requirement: recent answers more valuable |
| **Linear modification penalty** | Simple and interpretable (100% modified = 0% confidence) |
| **10-use cap for usage weight** | Prevents overfitting to frequently used patterns |
| **0.3 minimum confidence** | Always show old answers with some visibility |
| **6-month historical cutoff** | Balance between data availability and relevance |
| **60% similarity threshold** | Empirical balance between recall and precision |

---

## Integration Points

### Backend Integration (form_filler.rs)

**Location:** `src-tauri/src/core/automation/form_filler.rs:314-363`

**Current State:**

- Finds questions via JavaScript selector scan
- Matches patterns against screening_answers
- Fills inputs with configured answers

**TODO:**

- Call `record_answer_usage()` after filling
- Store original answer for modification detection
- Compare before/after submission to detect changes

### Frontend Integration Points

#### 1. ApplicationPreview.tsx

**TODO:**

- Show ScreeningAnswerSuggestions when form has questions
- Allow user to preview what will be auto-filled
- Display learning status indicator

#### 2. ApplyButton.tsx

**TODO:**

- Badge showing "Learning enabled"
- Count of patterns that will match
- Link to answer statistics

#### 3. ScreeningAnswersForm.tsx (✅ Complete)

- Usage statistics display
- Confidence badges
- Modification tracking UI

---

## Testing Strategy

### Unit Tests (✅ Complete)

- `test_normalize_question()` - Punctuation, whitespace, case handling
- `test_calculate_similarity()` - Edge cases (empty, identical, partial)

### Integration Tests (⏳ Pending)

1. **Record usage flow**
   - Create screening answer
   - Call `record_answer_usage()`
   - Verify times_used increment
   - Check confidence recalculation

2. **Suggestion ranking**
   - Create answers with different confidence levels
   - Verify suggestions sorted by confidence
   - Check deduplication

3. **Learning from modifications**
   - Record usage with modification
   - Verify confidence decrease
   - Check modification rate calculation

4. **Historical matching**
   - Record multiple similar questions
   - Query with new similar question
   - Verify historical suggestions appear

### E2E Tests (⏳ Pending)

1. User configures screening answer
2. Auto-fill form with answer
3. User modifies the answer
4. Submit application
5. Verify learning recorded in database
6. Next time: verify confidence adjusted

---

## Database Schema Reference

### screening_answer_history

```sql
CREATE TABLE screening_answer_history (
    id INTEGER PRIMARY KEY,
    screening_answer_id INTEGER,  -- NULL if no pattern matched
    question_text TEXT NOT NULL,
    question_normalized TEXT NOT NULL,
    answer_filled TEXT NOT NULL,
    was_modified INTEGER DEFAULT 0,  -- Boolean
    modified_to TEXT,
    job_hash TEXT,
    application_attempt_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (screening_answer_id) REFERENCES screening_answers(id),
    FOREIGN KEY (job_hash) REFERENCES jobs(hash),
    FOREIGN KEY (application_attempt_id) REFERENCES application_attempts(id)
);
```

### screening_answers (updated)

```sql
ALTER TABLE screening_answers ADD COLUMN times_used INTEGER DEFAULT 0;
ALTER TABLE screening_answers ADD COLUMN times_modified INTEGER DEFAULT 0;
ALTER TABLE screening_answers ADD COLUMN last_used_at TEXT;
ALTER TABLE screening_answers ADD COLUMN confidence_score REAL DEFAULT 1.0;
```

### screening_learned_answers

```sql
CREATE TABLE screening_learned_answers (
    id INTEGER PRIMARY KEY,
    question_pattern TEXT NOT NULL UNIQUE,
    source_question_texts TEXT NOT NULL,  -- JSON array
    learned_answer TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.5,
    times_used INTEGER DEFAULT 0,
    times_modified INTEGER DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## Future Enhancements (Out of Scope)

### 1. Advanced NLP

- Use LM Studio for semantic similarity
- Better question classification
- Answer template variables (e.g., "{years} years of experience")

### 2. Collaborative Learning

- Aggregate anonymous usage data
- Community-contributed patterns
- Privacy-preserving federated learning

### 3. Active Learning

- Prompt user to confirm low-confidence suggestions
- Ask for feedback on modifications
- A/B test different answers

### 4. Context-Aware Suggestions

- Consider job type (e.g., "remote" for remote jobs)
- Salary expectations based on job level
- Location-specific answers

### 5. Multi-Language Support

- Normalize questions in multiple languages
- Translate patterns automatically
- Localized confidence scoring

---

## Deployment Checklist

### Before Merging

- ✅ Rust compilation passes
- ✅ Unit tests pass
- ⏳ Integration tests written and passing
- ⏳ Frontend TypeScript compilation
- ⏳ E2E test for full flow
- ⏳ Migration tested on dev database
- ⏳ Documentation reviewed

### Database Migration

1. Backup production database
2. Run migration: `00000000000002_screening_answer_learning.sql`
3. Verify new columns exist: `times_used`, `times_modified`, etc.
4. Check indexes created: `idx_screening_answer_history_question_normalized`
5. Verify default values backfilled

### Rollback Plan

```sql
-- Remove learning columns
ALTER TABLE screening_answers DROP COLUMN times_used;
ALTER TABLE screening_answers DROP COLUMN times_modified;
ALTER TABLE screening_answers DROP COLUMN last_used_at;
ALTER TABLE screening_answers DROP COLUMN confidence_score;

-- Drop learning tables
DROP TABLE screening_answer_history;
DROP TABLE screening_learned_answers;
```

---

## Metrics to Track

### Product Metrics

- **Adoption rate**: % of users with ≥1 screening answer configured
- **Learning effectiveness**: Average confidence score over time
- **Modification rate**: % of auto-filled answers modified
- **Suggestion acceptance**: % of suggestions clicked "Use"

### Technical Metrics

- **Query performance**: `get_suggested_answers()` latency
- **Database growth**: screening_answer_history table size
- **Confidence distribution**: Histogram of confidence scores
- **Pattern coverage**: % of questions matched by patterns

---

## Support & Debugging

### Common Issues

**Q: Suggestions not appearing?**

- Check if question length ≥ 3 characters
- Verify patterns in screening_answers table
- Check browser console for errors
- Confirm backend command registered in main.rs

**Q: Confidence scores all 0.0?**

- Check times_used > 0
- Verify last_used_at is recent (not too old)
- Examine modification_rate (should be < 1.0)
- Check calculation in `calculate_confidence()`

**Q: Historical matches not working?**

- Confirm similarity threshold (default 0.6)
- Check question normalization (are questions similar after normalize?)
- Verify screening_answer_history has records
- Ensure was_modified = 0 for historical matches

### Debug Commands

```bash
# Check migration applied
sqlite3 data/JobSentinel.db "PRAGMA table_info(screening_answers);"

# View usage history
sqlite3 data/JobSentinel.db "SELECT * FROM screening_answer_history ORDER BY created_at DESC LIMIT 10;"

# Check confidence scores
sqlite3 data/JobSentinel.db "SELECT question_pattern, confidence_score, times_used, times_modified FROM screening_answers;"

# Find learned patterns
sqlite3 data/JobSentinel.db "SELECT * FROM screening_learned_answers;"
```

---

## Credits

**Designed by:** Claude Opus 4.5 (2026-01-30)
**Implemented for:** JobSentinel v2.6.4
**Inspired by:** Machine learning recommendation systems, user behavior tracking

**Key Technologies:**

- Rust (backend logic)
- SQLite (storage)
- React (frontend UI)
- Tauri (IPC bridge)

---

## License & Usage

This feature is part of JobSentinel and subject to the project's license.

**Privacy Note:** All learning happens locally. No data is sent to external servers. User modifications are
stored only in the local database.
