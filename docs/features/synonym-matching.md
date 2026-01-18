# Synonym Matching for Smart Scoring

## Overview

JobSentinel now includes **intelligent synonym matching** for keyword scoring,
allowing flexible matching of job descriptions without requiring exact keyword matches.

## Key Features

### 1. Bidirectional Synonym Matching

When you configure a keyword like "Python", the system automatically matches:

- Python
- Python3
- py

And vice versa - searching for "py" will also match "Python" and "Python3".

### 2. Word Boundary Detection

The system is smart enough to avoid false positives:

- ✅ "py" matches "py script"
- ✅ "py" matches "Experience with py"
- ❌ "py" does NOT match "spy" or "espionage"

### 3. Case Insensitivity

All matching is case-insensitive:

- "python" matches "PYTHON", "Python", "PyThOn", etc.

### 4. Pre-populated Synonym Groups

The system comes with synonym groups for common tech terms:

#### Programming Languages

- **Python**: Python, Python3, py, python3
- **JavaScript**: JavaScript, JS, js, JavaScript
- **TypeScript**: TypeScript, TS, ts, TypeScript
- **C++**: C++, CPP, Cpp, cpp, c++
- **C#**: C#, CSharp, csharp, c#
- **Go**: Golang, Go, golang, go
- **Rust**: Rust, rust, rustlang

#### Job Titles

- **Senior**: Senior, Sr., Sr, sr, senior
- **Junior**: Junior, Jr., Jr, jr, junior
- **Engineer**: Engineer, Developer, Dev, SWE, engineer, developer, dev, swe
- **Lead**: Lead, Principal, Staff, lead, principal, staff
- **Manager**: Manager, Mgr, mgr, manager

#### Frameworks & Libraries

- **React**: React, ReactJS, React.js, react, reactjs
- **Node**: Node, NodeJS, Node.js, node, nodejs
- **Vue**: Vue, VueJS, Vue.js, vue, vuejs
- **Angular**: Angular, AngularJS, angular, angularjs
- **Django**: Django, django
- **Flask**: Flask, flask
- **Spring**: Spring, SpringBoot, spring, springboot

#### Cloud & DevOps

- **AWS**: AWS, Amazon Web Services, aws
- **GCP**: GCP, Google Cloud, Google Cloud Platform, gcp
- **Azure**: Azure, Microsoft Azure, azure
- **Kubernetes**: Kubernetes, K8s, k8s, kubernetes
- **Docker**: Docker, docker
- **CI/CD**: CI/CD, CICD, cicd, continuous integration, continuous deployment
- **Terraform**: Terraform, terraform, TF

#### Skills & Concepts

- **Machine Learning**: Machine Learning, ML, ml, machine learning
- **Artificial Intelligence**: Artificial Intelligence, AI, ai, artificial intelligence
- **Deep Learning**: Deep Learning, DL, dl, deep learning
- **Natural Language Processing**: Natural Language Processing, NLP, nlp
- **Computer Vision**: Computer Vision, CV, cv, computer vision
- **Backend**: Backend, Back-end, backend, back-end
- **Frontend**: Frontend, Front-end, frontend, front-end
- **Full Stack**: Full Stack, Fullstack, full-stack, fullstack
- **DevOps**: DevOps, Dev Ops, devops
- **SRE**: SRE, Site Reliability Engineer, Site Reliability Engineering, sre

#### Databases

- **PostgreSQL**: PostgreSQL, Postgres, postgres, postgresql
- **MySQL**: MySQL, mysql
- **MongoDB**: MongoDB, Mongo, mongo, mongodb
- **Redis**: Redis, redis
- **SQL**: SQL, sql
- **NoSQL**: NoSQL, nosql, no-sql

#### Security

- **Security**: Security, Cybersecurity, InfoSec, security, cybersecurity, infosec
- **AppSec**: AppSec, Application Security, appsec, application security
- **DevSecOps**: DevSecOps, devsecops

#### Testing

- **Test**: Test, Testing, QA, Quality Assurance, test, testing, qa
- **Automation**: Automation, automation, automated testing

## How It Works

### Configuration Example

In your `config.json`:

```json
{
  "keywords_boost": ["Python", "Kubernetes", "Machine Learning"],
  "keywords_exclude": ["sales"]
}
```

### Matching Behavior

**Job Description:**

> "We're looking for a Sr. Python3 developer with K8s experience and ML background."

**Matches:**

- ✅ "Python" → matches "Python3"
- ✅ "Kubernetes" → matches "K8s"
- ✅ "Machine Learning" → matches "ML"
- ✅ "Senior" (if in keywords) → matches "Sr."

**Result:** High score boost from 3 matched keywords!

### Architecture

The synonym matching system consists of:

1. **SynonymMap** - Core data structure (`src-tauri/src/core/scoring/synonyms.rs`)
   - HashMap-based for O(1) lookups
   - Stores bidirectional synonym mappings
   - Efficient word boundary detection

2. **Integration** - Scoring engine integration (`src-tauri/src/core/scoring/mod.rs`)
   - Used in `score_skills()` for boost keywords
   - Used in excluded keywords detection
   - Transparent to existing configuration

## Performance

- **Lookup Time:** O(1) - HashMap-based synonym lookup
- **Matching Time:** O(n*m) where n is number of keyword occurrences, m is average synonym group size
- **Memory:** Minimal - synonym groups are pre-computed at startup

## Future Enhancements

### Custom Synonyms (v2.1+)

Users will be able to add custom synonym groups:

```json
{
  "custom_synonyms": {
    "Rust": ["Rust", "rustlang", "rust-lang"],
    "API": ["API", "REST", "GraphQL", "gRPC"]
  }
}
```

### Database-backed Synonyms (v2.2+)

Store user-defined synonyms in SQLite for persistence across sessions.

### Fuzzy Matching (v2.3+)

Extend to include edit-distance-based fuzzy matching for typos:

- "Kuberntes" → "Kubernetes"
- "Pythoon" → "Python"

## Testing

Comprehensive test suite in `src-tauri/src/core/scoring/synonyms.rs`:

- ✅ Basic synonym matching
- ✅ Case insensitivity
- ✅ Word boundary detection
- ✅ Bidirectional matching
- ✅ Multiple synonyms in one text
- ✅ Punctuation boundaries
- ✅ Special characters (C++, C#)
- ✅ Empty input handling

Run tests:

```bash
cargo test scoring::synonyms --lib
```

## Examples

### Example 1: Language Variants

**Config:**

```json
{
  "keywords_boost": ["Python"]
}
```

**Matches:**

- "Python developer needed"
- "Python3 experience required"
- "Strong py skills"

### Example 2: Title Abbreviations

**Config:**

```json
{
  "title_allowlist": ["Senior Engineer"]
}
```

**Matches:**

- "Senior Engineer"
- "Sr. Engineer"
- "Sr Engineer"

### Example 3: Cloud Platforms

**Config:**

```json
{
  "keywords_boost": ["Kubernetes", "AWS"]
}
```

**Matches:**

- "K8s deployment experience"
- "Amazon Web Services infrastructure"
- "kubernetes and aws certified"

## Migration from v1.5

No configuration changes needed! Synonym matching is **backward compatible**:

- Existing keywords continue to work
- Synonym matching is additive (more matches, never fewer)
- No breaking changes to scoring algorithm

## See Also

- [Smart Scoring](./smart-scoring.md) - Overview of the scoring system
- [Configuration Guide](../user/configuration.md) - How to configure keywords
- [Changelog](../../CHANGELOG.md) - Version history
