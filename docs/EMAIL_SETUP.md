# Email Notifications Setup

Configure email notifications to receive daily job digests directly in your inbox.

---

## Quick Setup

### 1. Configure Email Settings

Add these variables to your `.env` file:

```bash
# SMTP Settings (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password
DIGEST_TO=recipient@example.com
```

### 2. Get an App Password (Gmail)

**Why:** Gmail requires app-specific passwords for third-party apps.

**Steps:**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll to **App passwords**
4. Click **Generate** → Select "Mail" and "Other (Custom name)"
5. Name it "Job Scraper" → Click **Generate**
6. Copy the 16-character password (remove spaces)
7. Paste it as `SMTP_PASS` in `.env`

### 3. Test Your Configuration

```bash
python -c "from notify.emailer import test_email_config; test_email_config()"
```

You should receive a test email within seconds.

---

## Supported Email Providers

### Gmail

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password  # See "Get an App Password" above
```

**Requirements:**
- 2-Factor Authentication enabled
- App-specific password generated

---

### Outlook/Hotmail

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your.email@outlook.com
SMTP_PASS=your_password
```

**Requirements:**
- Less secure apps enabled (or app password)

---

### Yahoo Mail

```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your.email@yahoo.com
SMTP_PASS=your_app_password
```

**Requirements:**
- App-specific password generated
- Go to Account Security → Generate app password

---

### Custom SMTP Server

```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=you@yourdomain.com
SMTP_PASS=your_password
```

**Note:** Port 587 uses STARTTLS, port 465 uses SSL (not supported yet)

---

## Email Digest Features

### What's Included

Each digest email contains:
- Number of new job opportunities
- Job title (clickable link to posting)
- Company name
- Location
- Match score percentage

### Email Format

- **Subject:** "Job Digest - X New Opportunities"
- **Format:** HTML (styled, mobile-friendly)
- **Frequency:** Daily (when jobs match your criteria)

### Example Email

```
📧 Job Digest
Found 5 new opportunities matching your criteria

┌─────────────────────────────────────────┐
│ Senior Software Engineer               │
│ Tech Company Inc - Remote              │
│ Match: 95%                             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ DevOps Engineer                        │
│ Cloud Startup - San Francisco, CA     │
│ Match: 87%                             │
└─────────────────────────────────────────┘

[...]
```

---

## Triggering Email Digests

### Manual Trigger

```bash
python -m src.agent --mode digest
```

### Automated (Cloud Deployment)

When deployed to GCP, emails are sent automatically:
- **Frequency:** Daily at configured time
- **Condition:** Only if new jobs match criteria
- **Trigger:** Cloud Scheduler

### Local Automation (macOS/Linux)

Set up a cron job:

```bash
# Edit crontab
crontab -e

# Add line (sends digest daily at 8 AM)
0 8 * * * cd /path/to/job-search-automation && .venv/bin/python -m src.agent --mode digest
```

---

## Troubleshooting

### "SMTP authentication failed"

**Problem:** Wrong username or password

**Fix:**
1. Double-check `SMTP_USER` matches your email
2. Verify `SMTP_PASS` is correct
3. For Gmail: Make sure you're using an app password, not your account password
4. For Outlook/Yahoo: Enable less secure apps or use app password

---

### "Email not configured"

**Problem:** Missing environment variables

**Fix:**
Ensure all required variables are set in `.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password
DIGEST_TO=recipient@example.com
```

---

### "Connection refused" or "Network unreachable"

**Problem:** Firewall or network issue

**Fix:**
1. Check if port 587 is open: `telnet smtp.gmail.com 587`
2. Try different port (587 or 465)
3. Check firewall settings
4. Try from different network (VPN may block SMTP)

---

### Emails go to spam

**Problem:** Email provider marks automated emails as spam

**Fix:**
1. Add sender (`SMTP_USER`) to contacts
2. Mark first email as "Not Spam"
3. Create filter to always allow emails from sender
4. Use a dedicated email for job alerts

---

### No emails received

**Checklist:**
1. ✓ All environment variables set correctly
2. ✓ Test email successful (`test_email_config()`)
3. ✓ Digest mode triggered (`--mode digest`)
4. ✓ Jobs exist in database matching criteria
5. ✓ Check spam folder
6. ✓ Verify `DIGEST_TO` email is correct

---

## Security Best Practices

### Protect Your Credentials

❌ **DON'T:**
- Commit `.env` to git (already in `.gitignore`)
- Share your SMTP password
- Use your main email account password

✅ **DO:**
- Use app-specific passwords
- Set restrictive file permissions: `chmod 600 .env`
- Rotate passwords periodically
- Use a dedicated email account for automation

---

### App Password vs. Account Password

**App Password (RECOMMENDED):**
- ✓ More secure (limited scope)
- ✓ Can be revoked without changing account password
- ✓ Required by Gmail, recommended by others

**Account Password:**
- ❌ Less secure (full account access)
- ❌ Requires enabling "less secure apps"
- ❌ Not recommended

---

## Disabling Email Notifications

To disable email notifications:

1. **Remove from `.env`:**
   ```bash
   # Comment out or delete SMTP variables
   #SMTP_HOST=smtp.gmail.com
   #SMTP_PORT=587
   #SMTP_USER=your.email@gmail.com
   #SMTP_PASS=your_app_password
   #DIGEST_TO=recipient@example.com
   ```

2. **Or set to empty:**
   ```bash
   SMTP_HOST=
   ```

The scraper will log "Email not configured" and continue without email.

---

## Advanced Configuration

### Custom Email Template

Edit `notify/emailer.py` → `_create_html_digest()` function

Example customizations:
- Add job descriptions
- Change color scheme
- Add more job metadata
- Include match reasons

### Send to Multiple Recipients

Currently supports one recipient. To send to multiple:

**Option 1:** Use email forwarding rules
**Option 2:** Modify `send_digest_email()` to accept list of recipients

### Attach Resume

Not currently supported. Feature request: Open GitHub issue.

---

## FAQ

### Q: How often are digest emails sent?

**A:** Once per day when running `--mode digest`. Frequency depends on how you schedule it (cron, Cloud Scheduler, etc.).

---

### Q: Can I customize the email subject?

**A:** Yes, edit `notify/emailer.py` line 50:
```python
msg["Subject"] = f"Job Digest - {len(jobs)} New Opportunities"
```

---

### Q: Will I get an email if no jobs match?

**A:** No. Emails are only sent when `len(jobs) > 0`.

---

### Q: Can I use a different SMTP port?

**A:** Yes, set `SMTP_PORT=465` for SSL or `SMTP_PORT=587` for STARTTLS. Note: Port 465 (SSL) is not currently supported, only 587 (STARTTLS).

---

### Q: Is my email password secure in .env?

**A:** The `.env` file is:
- Excluded from git (in `.gitignore`)
- Only readable by you (if you set `chmod 600 .env`)
- Only used locally or in secure cloud environments

For maximum security:
- Use app-specific passwords
- Set file permissions to 600
- Don't share `.env` file

---

## Support

**Email module not working?**
1. Run test: `python -c "from notify.emailer import test_email_config; test_email_config()"`
2. Check logs: `tail -f data/logs/*.log`
3. Verify environment variables: `cat .env | grep SMTP`
4. Review troubleshooting section above

**Still stuck?** Open a GitHub issue with:
- Email provider (Gmail, Outlook, etc.)
- Error message from logs
- What you've tried
