# Synonym Matching for Smart Scoring

> **Module:** `src-tauri/src/core/scoring/synonyms.rs`

## Overview

JobSentinel includes **local synonym matching** for keyword scoring,
allowing flexible matching of job descriptions without requiring exact keyword
matches.

Synonyms are intentionally broad-audience. Healthcare, office, operations,
public-sector, customer support, accounting, education, retail, and technical
roles are all treated as first-class examples.

## Key Features

### 1. Bidirectional Synonym Matching

When you configure a work phrase like "Customer Support" or "EMR",
JobSentinel can also match common nearby wording:

- Customer Service
- Client Support
- Client Service
- EHR
- Electronic Health Record

And vice versa: searching for "Client Service" can also match "Customer
Support", and searching for "EHR" can also match "EMR".

### 2. Avoids Partial-Word Matches

The system is smart enough to avoid false positives:

- Match: "RN" matches "RN evening shift"
- Match: "RN" matches "Registered Nurse"
- No match: "RN" does not match "internship"

### 3. Case Insensitivity

All matching is case-insensitive:

- "customer service" matches "Customer Service" and "CUSTOMER SERVICE".

### 4. Pre-populated Synonym Groups

The system comes with synonym groups for common job titles, work areas, and
tools across technical and non-technical searches.

The list starts with broad customer, office, care, public-sector, business, and
creative examples before technical examples so the default mental model stays
job-seeker wide.

#### Customer, Office, and Coordination Roles

- **Customer Support**: Customer Support, Customer Service, Client Support,
  Client Service, Member Support, Support Specialist, Help Desk, Call Center,
  Contact Center, Customer Care
- **Administrative Assistant**: Administrative Assistant, Admin Assistant,
  Office Assistant, Office Administrator, Office Coordinator, Front Desk,
  Receptionist, Administrative Coordinator
- **Project Coordinator**: Project Coordinator, Program Coordinator, Project
  Administrator, Project Specialist, Program Specialist, Program Assistant
- **Operations**: Operations, Ops, Operations Coordinator, Operations Specialist,
  Business Operations, Office Operations, Operations Assistant

#### Sales, People, and Finance Roles

- **Sales Representative**: Sales Representative, Sales Rep, Sales Associate,
  Account Executive, Business Development Representative, BDR
- **Human Resources**: Human Resources, HR, People Operations, People Ops,
  Talent Acquisition, Recruiting
- **Bookkeeper**: Bookkeeper, Bookkeeping, Accounting, Accounting Clerk,
  Accounting Assistant, Accounts Payable, Accounts Receivable, AP, AR, Payroll

#### Healthcare, Education, and Care Roles

- **Registered Nurse**: Registered Nurse, RN, Staff Nurse, Clinical Nurse, Nurse
- **Certified Nursing Assistant**: Certified Nursing Assistant, CNA, Nursing
  Assistant, Patient Care Assistant, Patient Care Aide, Caregiver
- **Medical Assistant**: Medical Assistant, Clinical Assistant, Patient Care
  Technician, PCT, Clinic Assistant
- **Care Coordination**: Care Coordination, Care Coordinator, Patient Navigator,
  Care Navigator, Case Management, Case Manager, Service Coordinator
- **Healthcare Administration**: Healthcare Administration, Medical Office,
  Medical Receptionist, Patient Access, Patient Services, Clinic Coordinator,
  Practice Coordinator
- **Teacher**: Teacher, Educator, Instructor, Tutor, Training Specialist,
  Trainer
- **Instructional Designer**: Instructional Designer, Curriculum Developer,
  Learning Designer, Course Developer
- **Training**: Training, Training Coordinator, Learning and Development, L&D,
  Staff Development, Workforce Development

#### Common Business, Healthcare, Education, and Public-Sector Tools

- **EMR**: EMR, EHR, Electronic Medical Record, Electronic Health Record,
  Medical Records System, Charting System
- **LMS**: LMS, Learning Management System, Training Platform, Course Platform
- **CRM**: CRM, Customer Relationship Management, Salesforce, Client Database,
  Donor Database, Constituent Database
- **POS**: POS, Point of Sale, Cash Register, Register System, Retail System
- **Inventory**: Inventory, Inventory Control, Stock Control, Stockroom,
  Warehouse Inventory, Materials Management
- **QuickBooks**: QuickBooks, Quick Books, QuickBooks Online, QBO, NetSuite,
  Oracle NetSuite, Accounting Software
- **Scheduling**: Scheduling, Appointment Scheduling, Calendar Management,
  Staff Scheduling, Dispatch, Rostering
- **Compliance**: Compliance, Regulatory Compliance, Policy Compliance,
  Audit Readiness, Records Compliance
- **Public Sector**: Public Sector, Government, Municipal, County, State Agency,
  Public Health, Social Services, Human Services

#### Creative, Marketing, and Product Roles

- **Graphic Designer**: Graphic Designer, Visual Designer, Brand Designer,
  Creative Designer
- **User Experience**: User Experience, UX, UX Designer, Product Designer
- **Marketing Coordinator**: Marketing Coordinator, Marketing Specialist,
  Digital Marketing, Growth Marketing

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

### Saved Setting Example

For a broad search, saved settings can include work phrases such as:

```json
{
  "keywords_boost": ["Customer Support", "Care Coordination", "Scheduling"],
  "keywords_exclude": ["overnight"]
}
```

### Matching Behavior

**Job Description:**

> "We are hiring a client service care navigator for patient scheduling and
> front desk support."

**Matches:**

- "Customer Support" matches "client service"
- "Care Coordination" matches "care navigator"
- "Scheduling" matches directly

**Result:** JobSentinel has more evidence that this role matches the user's
saved work interests.

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
- **Matching Time:** O(n\*m) where n is number of keyword occurrences, m is average synonym group size
- **Memory:** Minimal - synonym groups are pre-computed at startup

## Potential Follow-Ups

### Configurable Custom Synonyms

The code supports custom synonym groups through `SynonymMap::add_synonym_group`.
A future config surface could expose user-defined groups like this:

```json
{
  "custom_synonyms": {
    "Care Coordinator": ["Care Navigator", "Patient Navigator"],
    "Grant Writer": ["Proposal Writer", "Development Writer"]
  }
}
```

### Database-Backed Synonyms

Store user-defined synonyms in SQLite for persistence across sessions.

### Fuzzy Matching

Extend to include edit-distance-based fuzzy matching for typos:

- "Custmer Service" to "Customer Service"
- "Scheduing" to "Scheduling"

## Testing

Comprehensive test suite in `src-tauri/src/core/scoring/synonyms.rs`:

- Basic synonym matching
- Case insensitivity
- Word boundary detection
- Bidirectional matching
- Multiple synonyms in one text
- Punctuation boundaries
- Special characters (`C++`, `C#`)
- Empty input handling

Run tests:

```bash
cd src-tauri && cargo test --lib scoring::synonyms
```

## Examples

### Example 1: Customer Support Variants

**Config:**

```json
{
  "keywords_boost": ["Customer Support"]
}
```

**Matches:**

- "Customer Service Representative"
- "Client Support Specialist"
- "Member Support Associate"
- "Contact Center Representative"

### Example 2: Healthcare and Care Coordination Variants

**Config:**

```json
{
  "keywords_boost": ["EMR", "Care Coordination", "Scheduling"]
}
```

**Matches:**

- "EHR experience"
- "Electronic Health Record chart review"
- "Patient Navigator"
- "Appointment Scheduling"

### Example 3: Accounting, Retail, and Operations Variants

**Config:**

```json
{
  "keywords_boost": ["QuickBooks", "POS", "Inventory", "Operations"]
}
```

**Matches:**

- "QBO bookkeeping assistant"
- "Point of Sale register system"
- "Stock control coordinator"
- "Business operations assistant"

### Example 4: Technical Variants

**Config:**

```json
{
  "keywords_boost": ["Python", "React", "Kubernetes"]
}
```

**Matches:**

- "Python3 automation"
- "ReactJS frontend"
- "K8s deployment"

## Compatibility

No configuration changes are needed. Synonym matching is additive:

- Existing keywords continue to work
- Synonym matching is additive (more matches, never fewer)
- No breaking changes to scoring algorithm

## See Also

- [Smart Scoring](./smart-scoring.md) - Overview of the scoring system
- [Changelog](../../CHANGELOG.md) - Version history
