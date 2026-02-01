# Smart Screening Answers Learning - Implementation Plan

## Overview

Add learning capabilities to JobSentinel's screening answers system to improve accuracy over time based on user behavior.

## Current State

- ✅ `screening_answers` table with regex patterns
- ✅ Basic pattern matching in form_filler.rs
- ✅ Frontend CRUD for screening answers
- ❌ No usage tracking
- ❌ No learning from corrections
- ❌ No suggestion system with confidence

## Implementation Steps

### 1. Database Schema (Migration)

**File:** `src-tauri/migrations/00000000000002_screening_answer_learning.sql`

Add tables:

- `screening_answer_history` - Track each time an answer is used
  - id, screening_answer_id, question_text_normalized, answer_used, was_modified, modified_to, job_hash, created_at
- Update `screening_answers` table:
  - Add `times_used INTEGER DEFAULT 0`
  - Add `times_modified INTEGER DEFAULT 0`
  - Add `last_used_at TEXT`
  - Add `confidence_score REAL DEFAULT 1.0`

### 2. Rust Backend - Core Learning Logic

**File:** `src-tauri/src/core/automation/answer_learning.rs` (NEW)

Structs:

- `AnswerSuggestion` - Suggested answer with confidence score
- `AnswerUsageRecord` - Record of answer usage
- `AnswerLearningManager` - Main logic

Methods:

- `normalize_question(text: &str) -> String` - Lowercase, trim, collapse whitespace
- `calculate_similarity(q1: &str, q2: &str) -> f64` - Levenshtein or Jaro-Winkler
- `get_suggested_answers(question: &str, limit: usize) -> Vec<AnswerSuggestion>`
- `record_answer_usage(question: &str, answer: &str, was_modified: bool, modified_to: Option<String>)`
- `update_confidence_scores()` - Recalculate based on modification rate
- `get_answer_statistics(pattern: &str) -> AnswerStatistics`

### 3. Update FormFiller

**File:** `src-tauri/src/core/automation/form_filler.rs`

Changes:

- After filling screening question, call `record_answer_usage()`
- Detect if user modified the answer (requires comparison after page load)
- Store original filled answer for comparison

### 4. Tauri Commands

**File:** `src-tauri/src/commands/automation.rs`

New commands:

- `get_suggested_answers(question: String) -> Vec<AnswerSuggestion>`
- `record_answer_usage(question: String, answer: String, was_modified: bool, modified_to: Option<String>)`
- `get_answer_statistics(pattern: String) -> AnswerStatistics`
- `clear_answer_history(pattern: Option<String>)`

### 5. Frontend - Suggestion UI

**File:** `src/components/automation/ScreeningAnswerSuggestions.tsx` (NEW)

Component for showing suggested answers with:

- Confidence badge (0-100%)
- "Based on X previous uses"
- Multiple suggestions ranked by confidence
- Quick-select buttons

### 6. Frontend - Usage Statistics

**File:** `src/components/automation/ScreeningAnswersForm.tsx`

Updates:

- Show usage stats per answer (times used, modification rate)
- Confidence score indicator
- "Learn from modifications" toggle

### 7. Frontend - Learning Indicator

**File:** `src/components/automation/ApplyButton.tsx` or Application Preview

Add indicator:

- "Learning enabled" badge
- Show which answers will be auto-filled
- Preview mode showing suggestions

### 8. Testing

**Files:**

- `src-tauri/src/core/automation/answer_learning.rs` - Unit tests
- `src/components/automation/ScreeningAnswerSuggestions.test.tsx` - Component tests

Tests for:

- Question normalization
- Similarity calculation
- Confidence scoring algorithm
- Usage recording
- Suggestion ranking

## Confidence Scoring Algorithm

```
confidence = base_confidence * usage_weight * recency_weight * modification_penalty

base_confidence = 1.0 (initial)
usage_weight = min(1.0, times_used / 10)  // Caps at 10 uses
recency_weight = 1.0 - (days_since_last_use / 365)  // Decays over a year
modification_penalty = 1.0 - (times_modified / times_used)  // 0% modified = 1.0, 100% modified = 0.0
```

## Question Matching Strategy

1. **Exact pattern match** (existing regex) - confidence 1.0
2. **Normalized text similarity** - confidence based on Jaro-Winkler score
3. **Keyword overlap** - confidence based on shared meaningful words

## Migration Strategy

1. Add new tables/columns without breaking existing data
2. Backfill confidence_score = 1.0 for all existing answers
3. Start recording usage going forward
4. No immediate UI changes required (graceful degradation)

## Timeline Estimate

- Schema + migration: 30 min
- Rust learning logic: 2-3 hours
- Tauri commands: 30 min
- Frontend suggestions component: 1-2 hours
- Frontend integration: 1 hour
- Testing: 1-2 hours
- **Total: 6-9 hours**

## Future Enhancements (NOT IN SCOPE)

- Machine learning model for question classification
- Collaborative filtering (learn from other users - privacy concerns)
- Answer templates with variables (e.g., "I have {years} years of experience")
- Integration with LM Studio for answer generation
