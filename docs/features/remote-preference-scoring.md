# Remote Work Preference Scoring

**Status:** Implemented (v1.7)
**Module:** `src-tauri/src/core/scoring/remote.rs`

## Overview

JobSentinel now includes graduated scoring for remote/hybrid/onsite job preferences.
Instead of binary allow/reject logic, the system assigns partial scores based on
how well a job's work arrangement matches the user's preferences.

## Features

### 1. Enhanced Job Type Detection

The system detects a job's remote status from multiple sources:

- **Explicit `remote` field** in the job posting
- **Location string** (e.g., "Remote - US", "New York (Hybrid)")
- **Job title** (e.g., "Remote Software Engineer")
- **Job description** with keywords like:
  - Remote: "remote", "work from home", "WFH", "distributed", "fully remote"
  - Hybrid: "hybrid", "flexible location", "remote with occasional office"
  - Onsite: "on-site", "in-office", "office-based"

**Job types:**

- `Remote` - Fully remote position
- `Hybrid` - Mix of remote and on-site work
- `Onsite` - Fully on-site position
- `Unspecified` - Work arrangement not clearly stated

### 2. User Preference Modes

Users can express their work preference through config flags (`allow_remote`, `allow_hybrid`, `allow_onsite`):

| Flags | Derived Preference | Meaning |
|-------|-------------------|---------|
| `(true, false, false)` | `RemoteOnly` | Only accept remote jobs |
| `(true, true, false)` | `RemotePreferred` | Prefer remote, accept hybrid/onsite with penalty |
| `(false, true, false)` | `HybridPreferred` | Prefer hybrid, accept remote/onsite with slight penalty |
| `(false, false, true)` | `OnsitePreferred` | Prefer onsite, accept hybrid/remote with penalty |
| `(true, true, true)` | `Flexible` | Accept all work arrangements equally |

### 3. Graduated Scoring Matrix

Instead of 0 or 1.0, jobs receive graduated scores based on preference match:

#### RemoteOnly Preference

| Job Type | Score | Reason |
|----------|-------|--------|
| Remote | 1.0 | ✓ Perfect match |
| Hybrid | 0.5 | ⚠ Prefer remote-only |
| Onsite | 0.1 | ✗ Remote-only preferred |
| Unspecified | 0.3 | ⚠ Not specified (remote-only preferred) |

#### RemotePreferred

| Job Type | Score | Reason |
|----------|-------|--------|
| Remote | 1.0 | ✓ Preferred |
| Hybrid | 0.7 | ✓ Acceptable |
| Onsite | 0.4 | ⚠ Remote preferred |
| Unspecified | 0.6 | ⚠ Not specified |

#### HybridPreferred

| Job Type | Score | Reason |
|----------|-------|--------|
| Hybrid | 1.0 | ✓ Preferred |
| Remote | 0.8 | ✓ Acceptable |
| Onsite | 0.6 | ✓ Acceptable |
| Unspecified | 0.7 | ⚠ Not specified |

#### OnsitePreferred

| Job Type | Score | Reason |
|----------|-------|--------|
| Onsite | 1.0 | ✓ Preferred |
| Hybrid | 0.7 | ✓ Acceptable |
| Remote | 0.5 | ⚠ Onsite preferred |
| Unspecified | 0.6 | ⚠ Not specified |

#### Flexible

| Job Type | Score | Reason |
|----------|-------|--------|
| Remote | 1.0 | ✓ Remote job |
| Hybrid | 1.0 | ✓ Hybrid job |
| Onsite | 1.0 | ✓ Onsite job |
| Unspecified | 0.8 | ⚠ Not specified (assuming flexible) |

## Implementation Details

### Module Structure

- **`remote.rs`**: Core remote preference logic
  - `RemoteStatus` enum: Detected job type
  - `UserRemotePreference` enum: User's work preference
  - `detect_remote_status(job)`: Detect job type from multiple sources
  - `score_remote_match(pref, status)`: Calculate score multiplier

- **`mod.rs`**: Integration with scoring engine
  - `score_location()` method updated to use graduated scoring
  - Exports remote types for use elsewhere

### Scoring Weight

The remote preference scoring accounts for **20% of the total job score** (unchanged from previous implementation).

Example: A job with RemoteOnly preference and Hybrid job type:

- Location score: `0.20 * 0.5 = 0.10` (10% of total)

### Backward Compatibility

The implementation preserves the existing `LocationPreferences` config structure.
The existing boolean flags (`allow_remote`, `allow_hybrid`, `allow_onsite`) are
automatically converted to preference modes.

## Usage Example

```rust
use jobsentinel::core::scoring::{
    detect_remote_status, score_remote_match,
    RemoteStatus, UserRemotePreference
};

// Detect job type
let job_status = detect_remote_status(&job);

// Get user preference from config
let user_pref = UserRemotePreference::from_flags(
    config.location_preferences.allow_remote,
    config.location_preferences.allow_hybrid,
    config.location_preferences.allow_onsite,
);

// Calculate score
let (multiplier, reason) = score_remote_match(user_pref, job_status);
let location_score = 0.20 * multiplier;
```

## Testing

The module includes comprehensive tests covering:

- Job type detection from various sources (title, location, description)
- User preference derivation from config flags
- All preference × job type combinations
- Edge cases (unspecified work arrangements, conflicting keywords)

**Test file:** `src-tauri/src/core/scoring/remote.rs` (tests module)

**Run tests:**

```bash
cargo test --lib scoring::remote
```

## Benefits

1. **Flexibility:** Users no longer need to strictly filter out jobs that don't perfectly match
2. **Discovery:** Jobs that aren't ideal but still acceptable get scored (vs. hidden)
3. **Gradual migration:** Someone preferring remote but open to hybrid gets both, with remote scored higher
4. **Unspecified handling:** Jobs that don't mention work arrangement get partial credit instead of being rejected

## Future Enhancements

Potential improvements for v2.0+:

1. **Explicit RemotePreference enum in config** - Replace boolean flags with explicit preference selection
2. **Custom score multipliers** - Let users customize the penalty for non-preferred arrangements
3. **Location-aware scoring** - Combine remote preference with city/state preferences for hybrid/onsite jobs
4. **Resume-based detection** - Use resume's remote work experience to suggest preference

---

**Version:** 2.6.3 | **Last Updated:** January 25, 2026
