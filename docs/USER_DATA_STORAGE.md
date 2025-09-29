# User data storage

A few folks asked where the setup wizard keeps profile data, so here’s the answer.

## Where it lives

- Primary copy: `data/jobs_unified.sqlite` in the `UserProfile` table (powered by SQLModel/SQLite)
- Backup copy: `config/user_profile.json` so you can version it or edit by hand

```python
profile = load_user_profile()      # pulls from SQLite
dump_user_profile(profile)         # writes the JSON backup
```

The SQLite table holds basics like name, email, skills, seniority, salary range, work preferences, and notification thresholds. JSON mirrors the same fields for easy editing.

## Why two copies?

- SQLite gives quick lookups when the matcher needs your preferences
- JSON is human-readable and easy to stash in git or sync somewhere safe

## Privacy notes

Everything stays local. Nothing syncs to a server, and you can delete both files at any time if you want a fresh start.
