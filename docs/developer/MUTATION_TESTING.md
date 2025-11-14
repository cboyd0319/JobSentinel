# Mutation Testing Guide

**Using cargo-mutants to verify test effectiveness**

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Running Mutation Tests](#running-mutation-tests)
- [Understanding Results](#understanding-results)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Common Mutations](#common-mutations)

---

## Overview

### What is Mutation Testing?

Mutation testing is a technique to measure the **quality** of your test suite by:
1. Introducing intentional bugs (mutations) into your code
2. Running your test suite against each mutation
3. Checking if tests catch the bug (mutant is "caught")
4. Identifying gaps where mutations survive (mutants "escape")

### Why Mutation Testing?

**Code coverage tells you what code is executed, but not if it's properly tested.**

Example:
```rust
// Code with 100% line coverage
fn is_positive(x: i32) -> bool {
    x > 0  // ✅ Line covered
}

#[test]
fn test_is_positive() {
    is_positive(5);  // ❌ No assertion! Bug would slip through
}
```

Mutation testing would change `>` to `>=` and detect that no test fails!

---

## Installation

```bash
# Install cargo-mutants
cargo install cargo-mutants

# Verify installation
cargo mutants --version
```

---

## Running Mutation Tests

### Run All Mutations

```bash
cd src-tauri
cargo mutants
```

This will:
- Find all testable code
- Generate mutations
- Run tests against each mutation
- Report caught vs. escaped mutants

**⚠️ Warning:** Full mutation testing can take 30-60+ minutes!

### Run Mutations for Specific Module

```bash
# Test only config module
cargo mutants -- --file src/core/config/mod.rs

# Test only database module
cargo mutants -- --file src/core/db/mod.rs
```

### Run Mutations with Verbose Output

```bash
cargo mutants --show-caught --show-missed
```

### Run Mutations in Parallel

```bash
# Use 8 parallel jobs
cargo mutants -j 8
```

### Quick Check (Incremental)

```bash
# Only test mutants in files changed since last run
cargo mutants --in-diff
```

---

## Understanding Results

### Sample Output

```
Running mutation tests...

src/core/config/mod.rs:138: replaced > with >= in validate
  ✅ CAUGHT by test_negative_salary_floor_fails

src/core/config/mod.rs:148: replaced < with <= in validate
  ❌ MISSED - no test caught this mutation

Summary:
  Total mutants: 150
  Caught: 142 (94.7%)
  Missed: 8 (5.3%)
  Unviable: 0
```

### Result Categories

| Category | Meaning | Action |
|----------|---------|--------|
| **Caught** ✅ | Test suite detected the mutation | Good! Tests working correctly |
| **Missed** ❌ | Mutation survived (no test failed) | Add/improve tests for this case |
| **Unviable** ⚠️ | Mutation caused compile error | Ignore (artifact of mutation) |
| **Timeout** ⏱️ | Tests took too long | Adjust timeout multiplier |

---

## Configuration

### Project Configuration (`.cargo-mutants.toml`)

Located at: `src-tauri/.cargo-mutants.toml`

```toml
# Key settings
timeout_multiplier = 5.0     # Allow 5x normal test time
show_caught = false          # Hide caught mutants
show_missed = true           # Show escaped mutants
exclude_globs = ["tests/**"] # Skip test files

exclude_functions = [
    "::new",     # Skip simple constructors
    "::clone",   # Skip derived traits
]
```

### Timeout Issues

If you see timeout errors:
```toml
# Increase timeout multiplier
timeout_multiplier = 10.0
```

### Performance Tuning

```toml
# Run tests in isolation (slower but more accurate)
isolate_tests = true

# Limit parallel jobs
jobs = 4
```

---

## Best Practices

### 1. Start Small

Don't run all mutations at once. Start with:
```bash
# Test critical modules first
cargo mutants -- --file src/core/config/mod.rs
cargo mutants -- --file src/core/db/mod.rs
```

### 2. Aim for 90%+ Caught Rate

**Good:** 90-95% caught (some mutations may be semantically equivalent)
**Excellent:** 95%+ caught
**Poor:** <85% caught (indicates test gaps)

### 3. Focus on Missed Mutants

```bash
# Show only missed mutants
cargo mutants --show-missed --no-show-caught
```

For each missed mutant:
1. Understand what the mutation changed
2. Ask: "Would this break my application?"
3. If yes → write a test to catch it
4. If no → consider excluding the function

### 4. Exclude Trivial Functions

```toml
exclude_functions = [
    "::new",
    "::default",
    "::fmt",
    "::clone",
]
```

### 5. Run in CI (Selectively)

Don't run all mutations in CI (too slow). Instead:
```bash
# Only test files changed in this PR
cargo mutants --in-diff
```

---

## Common Mutations

### Arithmetic Operators

```rust
// Original
x + 1

// Mutations
x - 1
x + 0
x + 2
```

**How to catch:** Assert exact output values

### Comparison Operators

```rust
// Original
x > 0

// Mutations
x >= 0
x < 0
x == 0
```

**How to catch:** Test boundary conditions

### Boolean Operators

```rust
// Original
a && b

// Mutations
a || b
a
b
!a && !b
```

**How to catch:** Test all combinations (true/true, true/false, etc.)

### Return Values

```rust
// Original
return Ok(value);

// Mutations
return Err(anyhow!("mutant"));
return Ok(Default::default());
```

**How to catch:** Assert return values and error cases

### Constants

```rust
// Original
const MAX: i64 = 10_000_000;

// Mutations
const MAX: i64 = 10_000_001;
const MAX: i64 = 9_999_999;
const MAX: i64 = 0;
```

**How to catch:** Test boundary values

---

## Example Workflow

### 1. Run Mutation Tests

```bash
cd src-tauri
cargo mutants -- --file src/core/config/mod.rs
```

### 2. Review Missed Mutants

```
MISSED src/core/config/mod.rs:156: replaced 168 with 169
  in function validate, line: if self.scraping_interval_hours > 168
```

### 3. Add Missing Test

```rust
#[test]
fn test_scraping_interval_exactly_169_fails() {
    let mut config = create_valid_config();
    config.scraping_interval_hours = 169;

    assert!(config.validate().is_err());
}
```

### 4. Re-run Mutations

```bash
cargo mutants -- --file src/core/config/mod.rs
```

```
CAUGHT src/core/config/mod.rs:156: replaced 168 with 169
  ✅ by test_scraping_interval_exactly_169_fails
```

---

## CI Integration

### GitHub Actions Example

```yaml
name: Mutation Testing

on:
  pull_request:
    paths:
      - 'src-tauri/src/**'

jobs:
  mutants:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install cargo-mutants
        run: cargo install cargo-mutants

      - name: Run mutation tests on changed files
        run: cd src-tauri && cargo mutants --in-diff

      - name: Check mutation score
        run: |
          # Fail if catch rate < 90%
          if [ "$(cargo mutants --json | jq '.caught_percent')" -lt 90 ]; then
            echo "Mutation catch rate below 90%"
            exit 1
          fi
```

---

## Interpreting Mutation Scores

### Module Scores (Example)

| Module | Mutations | Caught | Score | Status |
|--------|-----------|--------|-------|--------|
| `core/config` | 85 | 83 | 97.6% | ✅ Excellent |
| `core/db` | 42 | 40 | 95.2% | ✅ Excellent |
| `core/scrapers` | 38 | 32 | 84.2% | ⚠️ Needs work |
| `core/notify` | 15 | 15 | 100% | ✅ Perfect |

### When to Improve

- **Score < 85%**: Immediate action needed
- **Score 85-90%**: Add tests for critical paths
- **Score 90-95%**: Good, but room for improvement
- **Score 95%+**: Excellent test coverage

---

## Troubleshooting

### "Tests timeout frequently"

```toml
# Increase timeout multiplier
timeout_multiplier = 10.0
```

### "Too many unviable mutants"

This is normal. cargo-mutants tries many mutations; some won't compile.

### "Mutation testing is too slow"

```bash
# Run in parallel
cargo mutants -j 8

# Test only changed files
cargo mutants --in-diff

# Exclude slow test modules
exclude_globs = ["src/slow_module/**"]
```

### "False positives (semantically equivalent mutants)"

Some mutations don't change behavior:
```rust
// These may be equivalent
x > 0  vs.  x >= 1  (for integers)
```

**Solution:** Exclude the function if truly equivalent:
```toml
exclude_functions = ["::function_name"]
```

---

## Resources

- [cargo-mutants documentation](https://mutants.rs/)
- [Mutation testing on Wikipedia](https://en.wikipedia.org/wiki/Mutation_testing)
- [Testing guide](./TESTING.md)

---

## Summary

**Mutation testing complements traditional testing:**

| Metric | What it measures |
|--------|------------------|
| **Code coverage** | Which lines are executed |
| **Mutation score** | Which lines are *properly* tested |

**Goal:** 90%+ mutation catch rate for critical modules

**Use cases:**
- Validate test suite quality
- Find gaps in test coverage
- Ensure boundary conditions are tested
- Verify error handling is tested

---

**Last Updated**: November 14, 2025
**Maintained By**: The Rust Mac Overlord 🦀
