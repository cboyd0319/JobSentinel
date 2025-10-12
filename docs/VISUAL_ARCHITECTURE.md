# Visual Architecture Guide

**Version:** 0.6.1  
**Date:** October 12, 2025  
**Purpose:** Visual documentation of JobSentinel architecture and workflows

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JobSentinel System                               │
│                                                                          │
│  ┌────────────┐   ┌─────────────┐   ┌──────────┐   ┌──────────────┐   │
│  │   Users    │──▶│   CLI/Web   │──▶│  Engine  │──▶│  Databases   │   │
│  │            │   │  Interface  │   │  Layer   │   │  & Storage   │   │
│  └────────────┘   └─────────────┘   └──────────┘   └──────────────┘   │
│                          │                  │                            │
│                          ▼                  ▼                            │
│                   ┌─────────────┐   ┌──────────────┐                   │
│                   │  External   │   │  ML/AI       │                   │
│                   │  Services   │   │  Components  │                   │
│                   └─────────────┘   └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Job Search Workflow                              │
└──────────────────────────────────────────────────────────────────────────┘

1. Configuration Loading
   ┌─────────────────┐
   │ user_prefs.json │──▶ Validation ──▶ Configuration Object
   └─────────────────┘

2. Job Scraping (with Resilience)
   ┌─────────────┐
   │ Job Sources │
   │  • Indeed   │
   │  • LinkedIn │──▶ Circuit ──▶ Rate ──▶ Jobs JSON
   │  • Reed     │    Breaker    Limiter
   │  • Custom   │
   └─────────────┘

3. Job Analysis (Multi-Stage)
   Jobs JSON
      │
      ├─▶ Quality Detection ──▶ Scam Score (0-100)
      │     • FBI IC3 patterns
      │     • Salary validation
      │     • Company verification
      │
      ├─▶ Semantic Matching ──▶ Relevance Score (0-100)
      │     • BERT embeddings
      │     • Keyword matching
      │     • Skill alignment
      │
      ├─▶ Market Intelligence ──▶ Insights
      │     • Salary benchmarking
      │     • Trend detection
      │     • Career paths
      │
      └─▶ Intelligent Ranking ──▶ Final Score
            • Skills: 40%
            • Salary: 25%
            • Location: 20%
            • Company: 10%
            • Recency: 5%

4. Storage & Notification
   Ranked Jobs
      │
      ├─▶ SQLite Database ──▶ History & Analytics
      │
      └─▶ Slack Alert ──▶ Top Matches (score > threshold)
```

---

## Resume Analysis Workflow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Resume Optimization Pipeline                          │
└──────────────────────────────────────────────────────────────────────────┘

Input: Resume Text (.pdf, .docx, or .txt)
   │
   ▼
┌─────────────────┐
│  Parser Layer   │
│  • PDF Parser   │──▶ Plain Text
│  • DOCX Parser  │
│  • Text Parser  │
└─────────────────┘
   │
   ▼
┌──────────────────────────┐
│  Content Analyzer        │
│  • Section detection     │──▶ Structured Content
│  • Bullet extraction     │
│  • Keyword extraction    │
└──────────────────────────┘
   │
   ├──▶ Quality Detection (6 dimensions)
   │    ┌──────────────────────────┐
   │    │ 1. Content Depth: 0-100  │
   │    │ 2. Quantification: 0-100 │
   │    │ 3. Action Verbs: 0-100   │
   │    │ 4. Keywords: 0-100       │──▶ Quality Report
   │    │ 5. Formatting: 0-100     │
   │    │ 6. Length: 0-100         │
   │    └──────────────────────────┘
   │
   ├──▶ ATS Analysis
   │    ┌────────────────────────────┐
   │    │ • Format compatibility     │
   │    │ • Keyword density (2-3%)   │──▶ ATS Score
   │    │ • Section structure        │
   │    │ • Font & styling check     │
   │    └────────────────────────────┘
   │
   └──▶ Auto-Fix Engine
        ┌─────────────────────────┐
        │ • Spelling correction   │
        │ • Action verb upgrades  │──▶ Enhanced Resume
        │ • Quantification inject │
        │ • STAR/CAR formatting   │
        │ • Keyword optimization  │
        └─────────────────────────┘
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Security Layers (OWASP ASVS 5.0)                 │
└──────────────────────────────────────────────────────────────────────────┘

External Input
   │
   ▼
┌─────────────────────────────────────────────────────┐
│  Layer 1: Input Validation (V5.1)                   │
│  ────────────────────────────────────────           │
│  • Email validation (regex + DNS check)             │
│  • URL sanitization (protocol + domain whitelist)   │
│  • Text sanitization (HTML escape, length limits)   │
│  • Injection detection (SQL, XSS patterns)          │
└─────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2: Rate Limiting (V4.2)                      │
│  ────────────────────────────────                   │
│  • Token bucket algorithm                           │
│  • 100 requests/minute default                      │
│  • IP-based tracking                                │
│  • Exponential backoff on breach                    │
└─────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────┐
│  Layer 3: Authentication & Secrets (V2.3, V8.1)     │
│  ────────────────────────────────────────           │
│  • PBKDF2-HMAC-SHA256 password hashing              │
│  • Secure token generation (32 bytes)               │
│  • Secret redaction in logs                         │
│  • Environment variable storage only                │
└─────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────┐
│  Layer 4: Encryption (V8.2, V9.1)                   │
│  ────────────────────────────────                   │
│  • TLS 1.2+ for all external connections            │
│  • Certificate validation enforced                  │
│  • AES-256 for data at rest (optional)              │
└─────────────────────────────────────────────────────┘
   │
   ▼
Application Logic
```

---

## Resilience Patterns

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Resilience & Reliability Patterns                    │
└──────────────────────────────────────────────────────────────────────────┘

Circuit Breaker Pattern
────────────────────────
        Request
           │
           ▼
    ┌────────────┐
    │  Circuit   │
    │  Breaker   │
    └────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
  CLOSED      OPEN ──▶ Fail Fast
     │           ▲
     │           │
     │      HALF_OPEN
     │           │
     └───────────┘
   (5 failures → OPEN)
   (2 successes → CLOSED)

Retry with Exponential Backoff
────────────────────────────────
Attempt 1: ✗ Wait 1s
Attempt 2: ✗ Wait 2s
Attempt 3: ✗ Wait 4s
Attempt 4: ✓ Success!

Rate Limiting (Token Bucket)
─────────────────────────────
┌───────────────┐
│  Token Bucket │  Capacity: 100 tokens
│  ███████░░░░░ │  Refill: 100/minute
└───────────────┘
  Each request consumes 1 token
  No tokens? → 429 Too Many Requests

Graceful Degradation
────────────────────
  Full Service
      │
      ├─ Component A fails → Disable A, continue with B & C
      ├─ Component B fails → Disable B, continue with C
      └─ Component C fails → Minimal service mode
```

---

## ML/AI Pipeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ML/AI Processing Pipeline                         │
└──────────────────────────────────────────────────────────────────────────┘

Input: Job Description or Resume Text
   │
   ▼
┌─────────────────────────────────────┐
│  Pre-processing                     │
│  • Text cleaning                    │
│  • Tokenization                     │──▶ Clean Text
│  • Stop word removal                │
│  • Lemmatization                    │
└─────────────────────────────────────┘
   │
   ├──▶ Semantic Analysis (BERT)
   │    ┌─────────────────────────┐
   │    │  sentence-transformers  │
   │    │  • Text → Embeddings    │──▶ 768-dim Vector
   │    │  • Cosine similarity    │
   │    └─────────────────────────┘
   │
   ├──▶ Sentiment Analysis (VADER)
   │    ┌─────────────────────────┐
   │    │  vaderSentiment         │
   │    │  • Compound: -1 to +1   │──▶ Sentiment Score
   │    │  • Pos/Neg/Neu scores   │
   │    └─────────────────────────┘
   │
   ├──▶ Keyword Extraction (TF-IDF)
   │    ┌─────────────────────────┐
   │    │  scikit-learn           │
   │    │  • TF-IDF vectorization │──▶ Top Keywords
   │    │  • Importance scoring   │
   │    └─────────────────────────┘
   │
   └──▶ Scam Detection (Classifier)
        ┌─────────────────────────┐
        │  Custom ML Classifier   │
        │  • FBI IC3 patterns     │──▶ Scam Score
        │  • Feature engineering  │    + Confidence
        │  • Ensemble prediction  │
        └─────────────────────────┘
```

---

## Adaptive Learning Loop

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Continuous Improvement Loop                            │
└──────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────┐
   │              Production System                    │
   │                                                   │
   │   Predictions ──▶ User ──▶ Feedback              │
   └───────────────────────│───────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Feedback Store  │
                  │  (JSONL file)   │
                  └─────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ Performance Tracker │
                  │  • Accuracy         │
                  │  • Precision        │
                  │  • Recall           │
                  │  • F1 Score         │
                  └─────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Drift Detector  │
                  │  Threshold?     │
                  └─────────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
              No Drift        Drift Detected
                    │              │
                    │              ▼
                    │     ┌─────────────────┐
                    │     │ Trigger Retrain │
                    │     └─────────────────┘
                    │              │
                    │              ▼
                    │     ┌─────────────────┐
                    │     │ Model Update    │
                    │     │  • New training │
                    │     │  • Validation   │
                    │     │  • A/B test     │
                    │     └─────────────────┘
                    │              │
                    └──────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Deploy Champion │
                  └─────────────────┘
```

---

## Monitoring & Observability

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Observability Stack (SRE Principles)                  │
└──────────────────────────────────────────────────────────────────────────┘

Application
    │
    ├──▶ Metrics (Counters, Gauges, Histograms)
    │    ┌────────────────────────────────┐
    │    │ • jobs_scraped_total           │
    │    │ • analysis_duration_seconds    │
    │    │ • alert_latency_seconds        │──▶ Prometheus
    │    │ • error_rate                   │    Grafana
    │    │ • circuit_breaker_state        │
    │    └────────────────────────────────┘
    │
    ├──▶ Logs (Structured JSON)
    │    ┌────────────────────────────────┐
    │    │ • timestamp                    │
    │    │ • level (INFO/WARN/ERROR)      │
    │    │ • component                    │──▶ ELK Stack
    │    │ • trace_id                     │    or Splunk
    │    │ • message                      │
    │    │ • context (JSON)               │
    │    └────────────────────────────────┘
    │
    └──▶ Traces (Distributed Tracing)
         ┌────────────────────────────────┐
         │ • Operation start/end          │
         │ • Span duration                │──▶ Jaeger
         │ • Parent/child relationships   │    Zipkin
         │ • Tags & annotations           │
         └────────────────────────────────┘

Service Level Objectives (SLOs)
────────────────────────────────
1. Scraping Success: 95% of jobs scraped successfully
2. Analysis Latency: p95 < 5 seconds
3. Alert Delivery: p99 < 30 seconds
4. Availability: 99.9% uptime

Error Budget
────────────
Monthly budget: 0.1% (43.2 minutes downtime)
Current burn rate: ▓▓▓░░░░░░░ 30% used
```

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Deployment Options                                │
└──────────────────────────────────────────────────────────────────────────┘

Option 1: Local Deployment
───────────────────────────
┌─────────────────────┐
│   Local Machine     │
│  ┌───────────────┐  │
│  │  Python App   │  │
│  │  (venv)       │  │
│  ├───────────────┤  │
│  │  SQLite DB    │  │
│  ├───────────────┤  │
│  │  Data Files   │  │
│  └───────────────┘  │
└─────────────────────┘

Option 2: Docker Container
───────────────────────────
┌─────────────────────┐
│   Docker Host       │
│  ┌───────────────┐  │
│  │  Container    │  │
│  │ ┌───────────┐ │  │
│  │ │   App     │ │  │
│  │ └───────────┘ │  │
│  │  Volumes:     │  │
│  │  • /config    │◀─┼─── Config
│  │  • /data      │◀─┼─── Data
│  └───────────────┘  │
└─────────────────────┘

Option 3: Cloud Run (GCP)
──────────────────────────
┌──────────────────────────────┐
│     Google Cloud Platform     │
│  ┌────────────────────────┐  │
│  │    Cloud Run Service   │  │
│  │  (Auto-scaling)        │  │
│  │  ┌──────────────────┐  │  │
│  │  │  Container Inst. │  │  │
│  │  │  Container Inst. │  │  │
│  │  │  Container Inst. │  │  │
│  │  └──────────────────┘  │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Cloud Storage         │  │
│  │  • Config              │  │
│  │  • Database            │  │
│  │  • Logs                │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Cloud Scheduler       │  │
│  │  Trigger: 0 */2 * * *  │  │
│  └────────────────────────┘  │
└──────────────────────────────┘

Option 4: AWS Fargate
──────────────────────
┌──────────────────────────────┐
│  Amazon Web Services          │
│  ┌────────────────────────┐  │
│  │    ECS Fargate         │  │
│  │  ┌──────────────────┐  │  │
│  │  │  Task Definition │  │  │
│  │  │  (Container)     │  │  │
│  │  └──────────────────┘  │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  S3 Bucket             │  │
│  │  • Config              │  │
│  │  • Database            │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  EventBridge           │  │
│  │  Schedule: rate(2h)    │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

---

## MCP Integration Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│              Model Context Protocol (MCP) Integration                     │
└──────────────────────────────────────────────────────────────────────────┘

JobSentinel Core
    │
    ├──▶ MCP Client
    │    ┌────────────────────────────────┐
    │    │  • Server discovery            │
    │    │  • Connection management       │
    │    │  • Request/response handling   │
    │    │  • Error handling & retries    │
    │    └────────────────────────────────┘
    │         │
    │         ├──▶ Context7 MCP Server
    │         │    ┌──────────────────────┐
    │         │    │  Knowledge Base      │
    │         │    │  • Documentation     │
    │         │    │  • Best practices    │
    │         │    │  • Code analysis     │
    │         │    └──────────────────────┘
    │         │
    │         ├──▶ BLS MCP Server (Custom)
    │         │    ┌──────────────────────┐
    │         │    │  Labor Statistics    │
    │         │    │  • Salary data       │
    │         │    │  • Job trends        │
    │         │    │  • Industry outlook  │
    │         │    └──────────────────────┘
    │         │
    │         └──▶ Future MCP Servers
    │              ┌──────────────────────┐
    │              │  • GitHub            │
    │              │  • Jira              │
    │              │  • Confluence        │
    │              │  • Custom tools      │
    │              └──────────────────────┘
    │
    └──▶ Knowledge Enhancer
         ┌────────────────────────────────┐
         │  Enriches predictions with:    │
         │  • External knowledge          │
         │  • Best practices              │
         │  • Market intelligence         │
         └────────────────────────────────┘
```

---

## Testing Pyramid

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Testing Strategy                                 │
└──────────────────────────────────────────────────────────────────────────┘

              /\
             /  \
            / E2E\         ← 10% (Full user flows)
           /      \           ~50 tests, 5-10 min
          /--------\
         /          \
        / Integration\      ← 20% (Component interactions)
       /              \        ~200 tests, 2-5 min
      /----------------\
     /                  \
    /   Unit Tests       \   ← 70% (Business logic)
   /______________________\     ~700 tests, < 30 sec

Coverage Targets:
─────────────────
• Core business logic: ≥85%
• API endpoints: ≥75%
• Utilities: ≥80%
• Overall: ≥80%

Test Types:
───────────
1. Unit Tests (pytest)
   • Fast, isolated
   • Mock external dependencies
   • Test one function/class

2. Integration Tests (pytest)
   • Database interactions
   • API calls (test fixtures)
   • File I/O

3. E2E Tests (playwright)
   • Full user workflows
   • Browser automation
   • Real environment
```

---

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Error Handling & Recovery                            │
└──────────────────────────────────────────────────────────────────────────┘

Exception Raised
    │
    ▼
┌─────────────────┐
│ Error Classifier│
└─────────────────┘
    │
    ├──▶ Transient Error (network timeout, 503)
    │    └──▶ Retry with exponential backoff
    │         (1s, 2s, 4s, 8s...)
    │
    ├──▶ Rate Limit (429, quota exceeded)
    │    └──▶ Circuit Breaker → OPEN
    │         Wait 60s, then HALF_OPEN
    │
    ├──▶ Authentication Error (401, 403)
    │    └──▶ Fail Fast → Alert user
    │
    ├──▶ Validation Error (400, 422)
    │    └──▶ Fail Fast → Return error details
    │
    ├──▶ Resource Error (memory, disk)
    │    └──▶ Graceful Degradation
    │         • Disable non-critical features
    │         • Reduce batch sizes
    │         • Alert operations
    │
    └──▶ Unknown Error
         └──▶ Log full context
              Alert operations
              Return generic error

All Errors:
───────────
• Logged with structured format
• Tagged with trace_id
• PII redacted
• Metrics incremented
• Health status updated
```

---

## Conclusion

This visual guide provides a comprehensive overview of JobSentinel's architecture, data flows, and operational patterns. All designs follow industry best practices from SWEBOK, Google SRE, and other authoritative sources.

**For More Details:**
- [Technical Architecture](ARCHITECTURE.md)
- [SRE Runbook](SRE_RUNBOOK.md)
- [Best Practices](BEST_PRACTICES.md)
- [API Specification](API_SPECIFICATION.md)
