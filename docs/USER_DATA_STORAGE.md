# 📊 User Profile Data Storage Architecture

## 🎯 **Answer: YES, Stored in Database + JSON Backup**

User profile data is stored in **two complementary locations** for optimal performance and portability:

## 📍 **Storage Locations**

### **1. PRIMARY: SQLite Database** 📊

```
📁 File: data/jobs_unified.sqlite
📋 Table: UserProfile
🔧 Engine: SQLModel + SQLite
```

**Database Schema (25+ fields):**

```sql
UserProfile Table:
├── Core Info
│   ├── id (Primary Key)
│   ├── name
│   ├── email
│   └── current_title
├── Experience
│   ├── experience_years
│   ├── seniority_level ("Junior", "Senior", "Principal")
│   └── location
├── Skills (JSON Arrays)
│   ├── skills ["SEO", "Google Analytics", "Shopify"]
│   ├── technical_skills ["JavaScript", "HTML", "AWS"]
│   └── marketing_skills ["SEO", "PPC", "Analytics"]
├── Career Goals
│   ├── career_goal ("promotion", "lateral", "leadership")
│   ├── salary_min (95000)
│   ├── salary_max (130000)
│   └── target_seniority
├── Preferences
│   ├── work_arrangement_preference ("Remote", "Hybrid")
│   ├── preferred_departments ["Marketing", "Engineering"]
│   ├── custom_job_boards ["https://company.com/careers"]
│   └── notification_threshold (75)
└── Timestamps
    ├── created_at
    ├── updated_at
    └── last_active
```

### **2. BACKUP: JSON Configuration** 💾

```
📁 File: config/user_profile.json
📄 Format: Human-readable JSON
🔄 Purpose: Backup, portability, manual editing
```

**JSON Structure:**

```json
{
  "name": "John Smith",
  "current_title": "SEO Manager",
  "experience_years": 10,
  "seniority_level": "Senior",
  "location": "Major City, State",
  "work_arrangement_preference": "Hybrid",
  "skills": [
    "SEO", "Google Analytics", "Shopify",
    "JavaScript", "HTML", "CSS", "AWS"
  ],
  "career_goal": "promotion",
  "salary_min": 95000,
  "salary_max": 130000,
  "notification_threshold": 75,
  "notification_frequency": "daily",
  "custom_job_boards": [
    "https://company1.com/careers",
    "https://company2.com/jobs"
  ]
}
```

## 🏗️ **Storage Architecture Flow**

```
Setup Wizard Input
        ↓
    Database Storage (Primary)
        ↓
    JSON Backup (Secondary)
        ↓
Job Matching Engine (Uses Database)
        ↓
    Personalized Results
```

### **Data Flow Details**

**1. Initial Setup:**

```python
# Setup wizard collects data
profile_data = {
    'name': 'John Smith',
    'skills': ['SEO', 'Google Analytics'],
    'salary_min': 95000
}

# Stored in database
save_user_profile(profile_data)  # → SQLite

# Backed up to JSON
with open('config/user_profile.json', 'w') as f:
    json.dump(profile_data, f)
```

**2. Job Matching:**

```python
# Fast database queries for matching
user_profile = get_user_profile()  # From SQLite
job_matches = get_personalized_job_matches(min_score=75)
```

**3. Profile Updates:**

```python
# Update both locations
update_user_profile({'salary_min': 100000})
# → Updates database + regenerates JSON backup
```

## 📊 **Why Dual Storage?**

### **Database Benefits (Primary)**

✅ **Performance**: Fast queries for job matching
✅ **Concurrency**: Thread-safe concurrent access
✅ **ACID Compliance**: Data integrity guarantees
✅ **Indexing**: Optimized lookups for skills/preferences
✅ **Relationships**: Links with job data for analytics

### **JSON Benefits (Backup)**

✅ **Human Readable**: Easy to view and edit manually
✅ **Version Control**: Git-friendly plain text format
✅ **Portability**: Easy to backup, share, or migrate
✅ **Configuration**: Can be edited directly if needed
✅ **Debugging**: Clear visibility into stored preferences

## 🛡️ **Security & Privacy**

### **Local Storage Only**

- ✅ **No Cloud**: All data stays on user's machine
- ✅ **No Network**: No transmission to external services
- ✅ **No Tracking**: Zero telemetry or analytics collection
- ✅ **Full Control**: User owns and controls all data

### **File Protection**

- ✅ **OS Permissions**: Standard file system security
- ✅ **SQLite Encryption**: Available for sensitive data
- ✅ **Local Access**: Only local applications can read
- ✅ **Backup Control**: User decides what to backup/share

## 📁 **File Locations Summary**

```
project/
├── data/
│   └── jobs_unified.sqlite        # Main database (UserProfile table)
├── config/
│   └── user_profile.json         # JSON backup/config
└── scripts/
    └── setup_wizard.py           # Creates both files
```

## 🔄 **Data Lifecycle**

### **Creation (Setup Wizard)**

1. User runs `python3 scripts/setup_wizard.py`
2. Resume analysis extracts skills automatically
3. User confirms preferences and goals
4. Data saved to `data/jobs_unified.sqlite` (UserProfile table)
5. Backup created at `config/user_profile.json`

### **Usage (Job Matching)**

1. Job scraper finds new opportunities
2. Matching algorithm queries UserProfile from database
3. Calculates match scores based on stored preferences
4. Returns personalized job recommendations

### **Updates (Profile Changes)**

1. User can modify preferences anytime
2. Database updated with new values
3. JSON backup regenerated automatically
4. Next job run uses updated preferences

## 🎯 **Real Example: Sample Data**

**Database Record:**

```sql
SELECT * FROM UserProfile WHERE name = 'John Smith';

id: 1
name: "John Smith"
current_title: "SEO Manager"
seniority_level: "Senior"
skills: '["SEO","Google Analytics","Shopify","JavaScript"]'
location: "Major City, State"
salary_min: 95000
notification_threshold: 75
work_arrangement_preference: "Hybrid"
```

**JSON Backup:**

```json
{
  "name": "John Smith",
  "current_title": "SEO Manager",
  "skills": ["SEO", "Google Analytics", "Shopify", "JavaScript"],
  "location": "Major City, State",
  "salary_min": 95000,
  "work_arrangement_preference": "Hybrid"
}
```

## 🎉 **Benefits of This Architecture**

✅ **Performance**: Database provides fast job matching queries
✅ **Reliability**: ACID transactions ensure data consistency
✅ **Portability**: JSON backup enables easy migration/sharing
✅ **Transparency**: Human-readable config for user confidence
✅ **Privacy**: 100% local storage with no external dependencies
✅ **Flexibility**: Can be edited manually or programmatically
✅ **Backup**: Dual storage provides redundancy and safety

**The dual storage approach gives you the best of both worlds: database performance for real-time job matching and JSON simplicity for configuration management!** 🌟
