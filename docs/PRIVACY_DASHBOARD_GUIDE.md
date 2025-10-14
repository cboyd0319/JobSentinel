# Privacy Dashboard Guide

**NEW in v0.6.1** - Complete transparency into your data

## Overview

The Privacy Dashboard is a unique feature that gives you 100% visibility into every piece of data stored by JobSentinel. Unlike other job search tools that hide data collection or send telemetry, JobSentinel's Privacy Dashboard proves our privacy-first commitment with complete transparency.

## Why It Matters

### Industry Problem
Most job search automation tools:
- Hide what data they collect
- Send telemetry without disclosure
- Store data on third-party servers
- Lack transparency reports
- Provide no data export/deletion tools

### JobSentinel Solution
- **Complete inventory** - See every file, database table, and config
- **Zero telemetry verification** - Proof that no tracking happens
- **Local-only storage** - All data on your machine
- **Easy export** - Full data portability
- **Open source** - Verify our claims yourself

## Features

### 1. Data Inventory
View complete list of all stored data:
- **Database tables** - Job postings, applications, scores, contacts
- **Configuration files** - Your preferences and settings
- **Log files** - Application activity logs
- **Environment files** - API keys and webhooks

For each item, you see:
- Category (Job Data, User Preferences, System Logs, etc.)
- Exact file path
- Size in KB/MB
- Number of records
- Creation and modification dates
- Purpose (why this data exists)
- PII indicator (whether it contains personal info)

### 2. Telemetry Verification
Automatically checks for:
- Google Analytics
- Sentry error tracking
- Mixpanel analytics
- Amplitude tracking
- Segment analytics
- Custom telemetry endpoints

**Result**: ✅ No telemetry or tracking (always)

### 3. Data Lifecycle
Track when data was created and last modified:
- Oldest data timestamp
- Newest data timestamp
- Per-item modification dates
- Storage growth over time

### 4. Privacy Guarantees
Clear, verifiable guarantees:
- ✅ All data stored locally
- ✅ No telemetry or analytics
- ✅ No third-party tracking
- ✅ You own 100% of your data
- ✅ Easy export and deletion
- ✅ Open source verification

## Usage

### View Privacy Dashboard

```bash
python -m jsa.cli privacy
```

**Output**:
```
╭──────────────────────────────────────╮
│ 🔒 Privacy Dashboard                 │
│ Complete transparency into your data │
╰──────────────────────────────────────╯

Data Summary
Total Data Items: 12
Total Size: 45.3 MB
Items with PII: 3 items
Telemetry Status: ✅ No telemetry or tracking

📁 Data Storage Locations
├── Job Data
│   ├── Database Table: jobs (2,451 records, 42.1 MB)
│   │   ├── Location: /path/to/data/jobs.sqlite
│   │   └── Purpose: Scraped job postings from public sources
│   ├── Database Table: scores (2,451 records, 1.2 MB)
│   │   ├── Location: /path/to/data/jobs.sqlite
│   │   └── Purpose: Job scoring and ranking data
│   └── Database Table: applications 🔐 (47 records, 156 KB)
│       ├── Location: /path/to/data/jobs.sqlite
│       └── Purpose: Your job application tracking data
└── User Preferences
    └── Configuration File 🔐 (1 record, 2.4 KB)
        ├── Location: /path/to/config/user_prefs.json
        └── Purpose: Your job search preferences and settings

╭──────────── Your Data, Your Control ────────────╮
│ ✅ Privacy Guarantees                           │
│                                                 │
│ • All data stored locally on your machine       │
│ • No telemetry or analytics sent anywhere       │
│ • No third-party tracking scripts               │
│ • You own and control 100% of your data         │
│ • Easy export and deletion at any time          │
│ • Open source - verify our privacy claims       │
╰─────────────────────────────────────────────────╯
```

### Export Privacy Report

Export complete data inventory to JSON:

```bash
python -m jsa.cli privacy --export
```

Creates file: `privacy_report_YYYYMMDD_HHMMSS.json`

**Use cases**:
- Compliance documentation
- Personal data audit
- Share with data protection officer
- Verify privacy before enterprise deployment

### Export Format

```json
{
  "total_items": 12,
  "total_size_bytes": 47483392,
  "data_categories": {
    "Job Data": 8,
    "User Preferences": 2,
    "System Logs": 2
  },
  "pii_items": 3,
  "oldest_data": "2025-09-15T10:30:00",
  "newest_data": "2025-10-14T08:45:00",
  "telemetry_status": "✅ No telemetry or tracking",
  "external_connections": [],
  "inventory": [
    {
      "category": "Job Data",
      "item_type": "Database Table: jobs",
      "location": "/path/to/data/jobs.sqlite",
      "size_bytes": 44138496,
      "count": 2451,
      "created_at": "2025-09-15T10:30:00",
      "last_modified": "2025-10-14T08:45:00",
      "purpose": "Scraped job postings from public sources",
      "contains_pii": false
    }
  ]
}
```

## Competitive Advantage

### vs AIHawk
- AIHawk: No privacy dashboard, unknown data collection
- JobSentinel: **Complete transparency** ✅

### vs Teal/Huntr (Commercial)
- Teal/Huntr: Cloud storage, privacy policy (no verification)
- JobSentinel: **Verifiable local-only storage** ✅

### vs LazyApply/Sonara
- LazyApply/Sonara: Third-party servers, unknown telemetry
- JobSentinel: **Proof of zero telemetry** ✅

## Privacy Guarantees Implementation

### How We Verify "No Telemetry"

The Privacy Dashboard actively scans for:

1. **Config file checks** - No `telemetry` or `analytics` keys
2. **Environment checks** - No tracking service API keys
3. **Code inspection** - No external tracking libraries loaded
4. **Network monitoring** - No unexpected external connections

### Data Storage Locations

All data stored in predictable locations:
- `data/` - SQLite database files
- `config/` - JSON configuration files
- `logs/` - Application logs (optional)
- `.env` - Secrets and API keys (never committed)

### PII Identification

The dashboard marks data as PII if it contains:
- Slack webhooks (can identify your workspace)
- Email addresses
- Phone numbers
- API keys (personal credentials)
- Application tracking data (your behavior)

## Integration with Backup System

The Privacy Dashboard works seamlessly with the backup system:

```bash
# View what will be backed up
python -m jsa.cli privacy

# Create backup
python -m jsa.cli backup create

# Both commands show identical file lists
```

## API Access

Privacy dashboard data is also available via REST API:

```bash
GET /api/v1/privacy/inventory
```

Returns JSON inventory of all stored data.

## Best Practices

### For Individual Users
1. Run privacy dashboard before sharing your machine
2. Export privacy report quarterly for personal records
3. Verify zero telemetry after each update
4. Review PII items before cloud deployment

### For Enterprise Users
1. Generate privacy report for compliance team
2. Include in data protection impact assessment (DPIA)
3. Verify against GDPR/CCPA requirements
4. Document local-only storage in security review

### For Open Source Contributors
1. Check privacy dashboard after adding features
2. Ensure new data storage is documented
3. Update PII detection if new sensitive data added
4. Maintain zero telemetry guarantee

## Troubleshooting

### "No data items found"
- Run `python -m jsa.cli run-once` to populate database
- Check that `data/` directory exists
- Verify `config/user_prefs.json` exists

### "Cannot read database"
- Ensure SQLite file is not corrupted
- Try backup and restore
- Check file permissions

### "Telemetry detected" (should never happen!)
- File a GitHub issue immediately
- Include privacy report export
- This would be a critical bug

## Privacy Philosophy

JobSentinel is built on three privacy principles:

1. **Local-First** - All processing on your machine
2. **Zero Telemetry** - No data sent anywhere without your explicit action
3. **Complete Transparency** - You can see and verify everything

The Privacy Dashboard makes these principles verifiable, not just promises.

## Future Enhancements

Planned privacy features:
- [ ] Encrypted storage option
- [ ] Automatic PII redaction tools
- [ ] Privacy score calculation
- [ ] Compliance report generator (GDPR, CCPA)
- [ ] Data retention policy enforcement
- [ ] Automatic data minimization suggestions

## Related Documentation

- [Backup & Restore Guide](BACKUP_RESTORE_GUIDE.md) - Data portability
- [Security Guide](SECURITY.md) - Security architecture
- [Architecture](ARCHITECTURE.md) - System design
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production setup

## Support

Questions about privacy?
- GitHub Issues: https://github.com/cboyd0319/JobSentinel/issues
- Security Contact: See [SECURITY.md](../SECURITY.md)
- Documentation: See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

**Remember**: JobSentinel's privacy-first architecture is a competitive advantage. No other job search tool offers this level of transparency. Use it as a selling point when recommending JobSentinel to others.
