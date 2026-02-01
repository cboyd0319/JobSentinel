# JSON Resume Import

Import resumes from the [JSON Resume](https://jsonresume.org/) format into JobSentinel.

## Overview

JSON Resume is an open-source standard for resume data. JobSentinel can import resumes in this format
and convert them to internal resume drafts for editing and ATS optimization.

## Supported Sections

| JSON Resume Section | JobSentinel Mapping | Notes |
|---------------------|---------------------|-------|
| `basics.name` | Contact name | |
| `basics.email` | Contact email | |
| `basics.phone` | Contact phone | |
| `basics.url` | Website | |
| `basics.summary` | Professional summary | |
| `basics.location` | Location (city, region) | Combines city + region |
| `basics.profiles` | LinkedIn, GitHub, Website | Detects by network name |
| `work[]` | Experience entries | |
| `volunteer[]` | Experience entries | Tagged as "(Volunteer)" |
| `education[]` | Education entries | Combines studyType + area |
| `skills[]` | Skills | Expands name + keywords |
| `certificates[]` | Certifications | |
| `awards[]` | Certifications | Treated as certifications |
| `projects[]` | Experience entries | Converted to project experience |
| `publications[]` | Not imported | v2.1 feature |
| `languages[]` | Not imported | v2.1 feature |
| `interests[]` | Not imported | v2.1 feature |
| `references[]` | Not imported | v2.1 feature |

## Field Mapping Details

### Basics Section

```json
{
  "basics": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "url": "https://johndoe.com",
    "summary": "Software engineer with 5 years of experience",
    "location": {
      "city": "San Francisco",
      "region": "CA"
    },
    "profiles": [
      {
        "network": "LinkedIn",
        "url": "https://linkedin.com/in/johndoe"
      },
      {
        "network": "GitHub",
        "url": "https://github.com/johndoe"
      }
    ]
  }
}
```

**Maps to:**

- Contact Info: name, email, phone, location ("San Francisco, CA")
- Social Links: LinkedIn, GitHub extracted from profiles
- Website: `basics.url` or first non-LinkedIn/GitHub profile

### Work Experience

```json
{
  "work": [
    {
      "name": "Acme Corp",
      "position": "Senior Engineer",
      "startDate": "2020-01-01",
      "endDate": "2024-12-31",
      "highlights": [
        "Led team of 5 engineers",
        "Built microservices architecture"
      ]
    }
  ]
}
```

**Maps to Experience:**

- Company: `work.name`
- Title: `work.position`
- Start/End dates: ISO 8601 format
- Achievements: `work.highlights`
- Current: `true` if `endDate` is empty

### Volunteer Experience

```json
{
  "volunteer": [
    {
      "organization": "Code.org",
      "position": "Mentor",
      "startDate": "2021-01-01",
      "endDate": "2021-12-31",
      "highlights": ["Taught coding to students"]
    }
  ]
}
```

**Maps to Experience:**

- Title: `"Mentor (Volunteer)"` (tagged with "(Volunteer)")
- Company: `volunteer.organization`
- Otherwise same as work experience

### Education

```json
{
  "education": [
    {
      "institution": "MIT",
      "studyType": "Bachelor",
      "area": "Computer Science",
      "endDate": "2019-05-15",
      "score": "3.8",
      "courses": ["Algorithms", "Databases"]
    }
  ]
}
```

**Maps to Education:**

- Degree: `"Bachelor in Computer Science"` (combines studyType + area)
- Institution: `education.institution`
- Graduation date: `education.endDate`
- GPA: Parsed from `education.score`
- Honors/Courses: `education.courses`

### Skills

```json
{
  "skills": [
    {
      "name": "Programming",
      "level": "Advanced",
      "keywords": ["Rust", "Python", "JavaScript"]
    }
  ]
}
```

**Maps to Skills:**

- Skill entries created for: `name` + all `keywords`
- For example above: 4 skills (Programming, Rust, Python, JavaScript)
- Proficiency mapping:
  - `"beginner"` / `"novice"` → Beginner
  - `"intermediate"` / `"proficient"` → Intermediate
  - `"advanced"` / `"expert"` → Advanced
  - `"master"` / `"guru"` → Expert
  - Default: Intermediate

### Projects

```json
{
  "projects": [
    {
      "name": "JobSentinel",
      "description": "Job search automation tool",
      "highlights": ["Built Rust backend", "Integrated 13 scrapers"],
      "startDate": "2024-01-01",
      "endDate": "",
      "url": "https://github.com/chad/jobsentinel",
      "roles": ["Lead Developer"],
      "entity": "Personal"
    }
  ]
}
```

**Maps to Experience:**

- Title: `"JobSentinel - Lead Developer"` (name + roles)
- Company: `"Project at Personal"` or `"Personal Project"`
- Achievements: `projects.highlights`
- Current: `true` if `endDate` is empty

### Certifications

```json
{
  "certificates": [
    {
      "name": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "date": "2023-01-01"
    }
  ]
}
```

**Maps to Certifications:**

- Name: `certificates.name`
- Issuer: `certificates.issuer`
- Date: `certificates.date`

### Awards (as Certifications)

```json
{
  "awards": [
    {
      "title": "Employee of the Year",
      "awarder": "Tech Corp",
      "date": "2022-12-01"
    }
  ]
}
```

**Maps to Certifications:**

- Name: `awards.title`
- Issuer: `awards.awarder`
- Date: `awards.date`

## Usage

### Backend (Rust)

```rust
use jobsentinel::core::resume::ResumeMatcher;

let matcher = ResumeMatcher::new(db_pool);
let json_string = r#"{ "basics": { "name": "John Doe" } }"#;

let resume_id = matcher
    .import_json_resume("My Resume".to_string(), json_string)
    .await?;

println!("Imported resume with ID: {}", resume_id);
```

### Frontend (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core';

const jsonString = JSON.stringify(jsonResumeData);

const resumeId = await invoke<number>('import_json_resume', {
  name: 'My Resume',
  jsonString
});

console.log('Imported resume:', resumeId);
```

## Edge Cases

### Partial Resumes

- Missing sections are gracefully ignored
- Empty strings are handled
- Optional fields default to `None` or empty arrays

### Date Formats

- ISO 8601 format preferred (`"2020-01-01"`)
- Empty `endDate` → "Present" / `current: true`
- Invalid dates → parsed as strings

### Empty Resume

```json
{}
```

- Valid! Creates empty resume draft
- All sections default to empty

## Error Handling

### Invalid JSON

```rust
import_json_resume(name, "invalid json")
// Returns: Err("Failed to parse JSON Resume")
```

### Missing Required Fields

- `basics.name` defaults to empty string
- All fields are optional in JSON Resume spec

## Validation

No validation is performed during import:

- ATS analysis can be run separately
- Resume Builder can be used to edit/fix issues
- Skill extraction happens after import

## Examples

### Minimal Resume

```json
{
  "basics": {
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
}
```

### Complete Resume

See [JSON Resume examples](https://jsonresume.org/schema/) for full examples.

## Testing

The importer includes 9 comprehensive tests:

- Parsing valid/partial/empty JSON
- Contact info conversion
- Experience conversion (work + volunteer + projects)
- Education conversion
- Skills conversion (with keyword expansion)
- Certifications conversion (certificates + awards)
- Full end-to-end conversion

Run tests:

```bash
cd src-tauri
cargo test core::resume::json_resume
```

## Future Enhancements (v2.1)

- Import publications
- Import languages (spoken languages)
- Import interests
- Import references
- Auto-detect resume format (JSON Resume vs other formats)
- Bulk import from directory
- JSON Resume export (reverse conversion)

## External Resources

- [JSON Resume Spec](https://jsonresume.org/schema/)
- [JSON Resume Examples](https://jsonresume.org/getting-started/)
- [JSON Resume Registry](https://registry.jsonresume.org/)
