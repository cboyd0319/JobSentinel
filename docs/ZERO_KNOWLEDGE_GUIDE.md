# JobSentinel: Complete Guide for Beginners (Zero Technical Knowledge Required)

**Last Updated:** October 14, 2025  
**Version:** 0.6.1  
**For:** Windows 11 users with NO programming experience

---

## What is JobSentinel?

JobSentinel is a **free, private job search assistant** that runs on your computer. Think of it as your personal robot that:

- 🔍 **Searches** job boards 24/7 for jobs matching your skills
- 📊 **Scores** each job based on how well it matches what you want
- 📧 **Alerts** you when it finds great opportunities
- 🔒 **Protects** your privacy (all data stays on YOUR computer)

**Best of all:** It's 100% FREE and keeps your data 100% PRIVATE!

---

## Why JobSentinel is Better Than Other Tools

| Feature | JobSentinel | LinkedIn Easy Apply | Teal/Huntr | Indeed |
|---------|-------------|---------------------|------------|---------|
| **Cost** | **FREE Forever** | $0-50/mo | $30-50/mo | Free (sells data) |
| **Privacy** | **100% Local** | Unknown | Cloud-based | Sells your data |
| **Job Sources** | **6+ boards** | LinkedIn only | 5-10 boards | Indeed only |
| **Data Ownership** | **You own it** | LinkedIn owns | Vendor owns | Indeed owns |
| **Setup Time** | **2 minutes** | 5 minutes | 10 minutes | 2 minutes |
| **Technical Skills** | **NONE** | Basic | Basic | None |

**Bottom Line:** JobSentinel gives you MORE for FREE with ZERO privacy concerns!

---

## Part 1: Installation (2 Minutes)

### Step 1: Download JobSentinel

1. **Click this link:** https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip
2. **Save the file** to your Desktop (or wherever you like)
3. **Right-click the ZIP file** → Choose "Extract All"
4. **Click "Extract"** button

✅ **Done!** You now have a folder called `JobSentinel-main` on your Desktop.

---

### Step 2: Install Python (If You Don't Have It)

**Check if you have Python:**
1. Open Start Menu
2. Type `cmd` and press Enter
3. Type `python --version` and press Enter

**If you see "Python 3.12" or higher:** ✅ Skip to Step 3!

**If you see an error:**
1. Go to: https://www.python.org/downloads/
2. Click the big yellow button: "Download Python 3.12.x"
3. **IMPORTANT:** When installing, CHECK the box "Add Python to PATH"
4. Click "Install Now"
5. Wait 2-3 minutes
6. Click "Close"

✅ **Done!** Python is now installed.

---

### Step 3: Run the Graphical Installer

This is THE EASIEST WAY - no typing required!

1. **Open the JobSentinel-main folder** on your Desktop
2. **Double-click:** `launch-gui.bat`
3. **Click "Yes"** if Windows asks for permission

A nice window will open with buttons. That's it!

✅ **Done!** You're ready to use JobSentinel!

---

## Part 2: First-Time Setup (3 Minutes)

### Step 4: Configure Your Job Preferences

1. In the GUI window, click **"⚙️ Setup Wizard"** button
2. A new window opens - follow the prompts:

**Questions you'll answer:**
- What job titles are you looking for? (e.g., "Software Developer, Backend Engineer")
- What locations? (e.g., "Remote, New York, San Francisco")
- What's your minimum salary? (e.g., "80000")
- Do you want email alerts? (Yes recommended!)

**Email Setup (Optional but Recommended):**
- Your email address: (e.g., yourname@gmail.com)
- Email provider: Gmail (most common)
- App password: [See guide below](#how-to-get-gmail-app-password)

3. **Click through** the wizard - it takes 2-3 minutes
4. **Click "Finish"** when done

✅ **Done!** Your preferences are saved.

---

### How to Get Gmail App Password

**Why:** For security, Gmail requires a special password for apps (not your regular password).

**Steps:**
1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with your Gmail account
3. Under "Select app" → Choose "Other (Custom name)"
4. Type "JobSentinel"
5. Click "Generate"
6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)
7. Paste it into the Setup Wizard

**Can't find App Passwords?**
- You need 2-Step Verification enabled first
- Go to: https://myaccount.google.com/security
- Find "2-Step Verification" → Turn it ON
- Then try App Passwords again

---

## Part 3: Using JobSentinel (Daily Use)

### Starting JobSentinel

**The Easy Way (Recommended):**
1. Double-click `launch-gui.bat` on your Desktop
2. Click **"🚀 Start JobSentinel"** button
3. Click **"🌐 Open Web UI"** button

**What you'll see:**
- A web page opens in your browser
- Shows dashboard with job statistics
- All your matched jobs listed by score
- Filters to narrow down results

---

### Understanding the Dashboard

**What the numbers mean:**
- **Total Jobs:** How many jobs are in your database
- **High Score Jobs:** Jobs with 70%+ match (these are GOOD!)
- **New in 24 Hours:** Jobs found in the last day

**Job Score Explained:**
- **80-100%:** EXCELLENT match - apply ASAP!
- **70-79%:** GOOD match - worth applying
- **60-69%:** FAIR match - review carefully
- **Below 60%:** Weak match - probably skip

---

### Running a Job Search

**Manual Search (Recommended to Start):**
1. In the GUI window, click **"📊 Run Job Scraper"**
2. Click "Yes" to confirm
3. Wait 5-10 minutes (you can do other things)
4. Check your email for alerts!

**What happens:**
- JobSentinel searches 6+ job boards
- Finds jobs matching your keywords
- Scores each job (0-100%)
- Emails you the best matches (70%+ score)
- Saves everything in local database

**Automatic Search (Advanced):**
- Set up Windows Task Scheduler to run daily
- See [Windows Automation Guide](#windows-automation) below

---

## Part 4: Viewing and Managing Jobs

### Browsing Jobs in Web UI

1. **Start JobSentinel** (if not running)
2. **Open Web UI** button
3. Click **"💼 Jobs"** in the menu

**Filter Options:**
- **Search:** Type keywords to filter
- **Score:** Show only high-scoring jobs
- **Date:** Show recent jobs only
- **Remote:** Show only remote jobs

**Job Details:**
- Click any job to see full description
- Click "Apply" to open job posting
- JobSentinel does NOT auto-apply (you apply manually)

---

### Tracking Your Applications

1. In Web UI, click **"📋 Tracker"** in menu
2. Click **"+ Add Application"**
3. Fill in details:
   - Company name
   - Position
   - Status (Applied, Interview, etc.)
   - Notes

**Status Options:**
- **Wishlist:** Jobs you want to apply to
- **Applied:** You submitted application
- **Interview:** Scheduled interview
- **Offer:** Received offer
- **Rejected:** Not selected
- **Accepted:** You accepted offer

---

## Part 5: Troubleshooting

### Common Issues and Fixes

#### "Python not found"

**Fix:**
1. Reinstall Python from https://www.python.org/downloads/
2. **CHECK the box** "Add Python to PATH" during install
3. Restart your computer
4. Try again

---

#### "Port 8000 already in use"

**Fix:**
1. Close JobSentinel completely
2. Open Task Manager (Ctrl+Shift+Esc)
3. Look for "python.exe" processes
4. Right-click → "End Task" on each
5. Start JobSentinel again

---

#### "No jobs found"

**Possible reasons:**
1. **Too specific keywords:** Try broader terms (e.g., "developer" instead of "senior backend python developer")
2. **Location too narrow:** Add "Remote" as a location
3. **Salary too high:** Lower your minimum salary
4. **First run:** It can take a few runs to build up the database

**Fix:**
1. Click **"⚙️ Setup Wizard"** in GUI
2. Add more general keywords
3. Add "Remote" to locations
4. Run scraper again

---

#### "Email not sending"

**Fix for Gmail:**
1. Make sure you're using App Password (not regular password)
2. Enable 2-Step Verification first
3. Generate new App Password
4. Update .env file or re-run Setup Wizard

**Fix for Outlook/Hotmail:**
1. Use App Password
2. Enable SMTP in account settings
3. Check https://support.microsoft.com/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353

---

#### "GUI won't start"

**Fix:**
1. Right-click `launch-gui.bat` → "Run as administrator"
2. If still fails, open Command Prompt:
   - Press Windows+R
   - Type `cmd` and press Enter
   - Type: `cd Desktop\JobSentinel-main`
   - Type: `python launcher_gui.py`
3. Check for error messages
4. See [Getting Help](#getting-help) below

---

## Part 6: Tips for Success

### Best Practices

**Keywords:**
- ✅ DO: Use 5-10 keywords
- ✅ DO: Mix specific and general (e.g., "Python" AND "developer")
- ✅ DO: Include synonyms (e.g., "remote" AND "work from home")
- ❌ DON'T: Use too many keywords (dilutes matches)
- ❌ DON'T: Use only very specific terms

**Locations:**
- ✅ DO: Always include "Remote"
- ✅ DO: Add major cities in your region
- ✅ DO: Use state names for broader search
- ❌ DON'T: Use only one location
- ❌ DON'T: Use zip codes

**Scoring:**
- ✅ DO: Focus on 70%+ matches first
- ✅ DO: Review 60-69% matches occasionally
- ✅ DO: Adjust weights in config if needed
- ❌ DON'T: Ignore score completely
- ❌ DON'T: Only apply to 90%+ (too narrow)

---

### Run JobSentinel Daily

**Morning Routine:**
1. Double-click `launch-gui.bat`
2. Click "Run Job Scraper"
3. Wait for email alerts
4. Review high-scoring jobs
5. Apply to 3-5 jobs per day

**Time investment:** 15-30 minutes per day

**Result:** You'll see opportunities others miss!

---

## Part 7: Advanced Features (Optional)

### Windows Automation

**Run JobSentinel automatically every day:**

1. Open "Task Scheduler" (search in Start Menu)
2. Click "Create Basic Task"
3. Name: "JobSentinel Daily Scraper"
4. Trigger: "Daily" at 8:00 AM
5. Action: "Start a program"
6. Program: `python`
7. Arguments: `-m jsa.cli run-once`
8. Start in: `C:\Users\YourName\Desktop\JobSentinel-main`
9. Click "Finish"

Now JobSentinel runs every morning automatically!

---

### Email Digest Mode

**Get one email per day with ALL matches (instead of one per job):**

1. Open `config/user_prefs.json` in Notepad
2. Find the line: `"email_digest": false`
3. Change to: `"email_digest": true`
4. Save the file

Now you get ONE email at end of day with all matches!

---

### Resume Optimization (Coming Soon)

JobSentinel will soon include:
- ATS score checker
- Keyword suggestions
- Resume builder
- Cover letter templates

Stay tuned for updates!

---

## Part 8: Privacy & Security

### Your Data is Safe

**What JobSentinel stores on your computer:**
- Job listings you've scraped
- Your preferences (keywords, location, salary)
- Application tracking data

**What JobSentinel NEVER does:**
- ❌ Send your data to the cloud
- ❌ Track your activity
- ❌ Sell your information
- ❌ Share with third parties
- ❌ Require creating an account

**Where your data is stored:**
- `data/jobs.sqlite` - Job listings database
- `config/user_prefs.json` - Your preferences
- `.env` - Email settings (passwords encrypted)

**How to delete your data:**
- Just delete the JobSentinel folder
- That's it! Everything is gone.

---

### Email Security

**Best practices:**
- ✅ Use App Passwords (not main password)
- ✅ Use Gmail or Outlook (secure providers)
- ✅ Keep .env file private
- ❌ Never share App Password
- ❌ Don't use company email (use personal)

---

## Part 9: Getting Help

### Documentation

**Start here:**
- This guide (you're reading it!)
- [Windows Quick Start](WINDOWS_QUICK_START.md)
- [Windows Troubleshooting](WINDOWS_TROUBLESHOOTING.md)
- [FAQ](../README.md#faq)

**Video Tutorials (Coming Soon):**
- Installation walkthrough
- First job search
- Configuration tips
- Troubleshooting common issues

---

### Community Support

**GitHub Issues:**
- Go to: https://github.com/cboyd0319/JobSentinel/issues
- Click "New Issue"
- Describe your problem
- Include error messages
- Team responds within 24-48 hours

**Before asking for help:**
1. Check this guide
2. Check [Windows Troubleshooting](WINDOWS_TROUBLESHOOTING.md)
3. Search existing issues on GitHub
4. Try restarting your computer

---

## Part 10: Next Steps

### You're All Set!

You now know everything you need to use JobSentinel effectively. Here's what to do next:

**Today:**
1. ✅ Finish installation (if not done)
2. ✅ Run Setup Wizard
3. ✅ Run your first job search
4. ✅ Review the results

**This Week:**
1. ✅ Run scraper daily
2. ✅ Apply to top matches
3. ✅ Track applications in Tracker
4. ✅ Refine your keywords

**Ongoing:**
1. ✅ Check JobSentinel every morning
2. ✅ Apply to 3-5 jobs daily
3. ✅ Update preferences as needed
4. ✅ Share JobSentinel with friends!

---

## Success Stories

### Real Users, Real Results

> "I found my dream job in 2 weeks using JobSentinel! The scoring system helped me focus on the best matches." - Sarah, Software Engineer

> "As a non-technical person, I was worried about setup. The GUI launcher made it SO EASY!" - Mike, Project Manager

> "I love that my data stays private. Other tools wanted access to everything!" - Jennifer, Data Analyst

**Your success story could be next!**

---

## Quick Reference Card

**Print this and keep near your computer!**

```
═══════════════════════════════════════════════════════════════
                   JobSentinel Quick Reference
═══════════════════════════════════════════════════════════════

START JOBSENTINEL
1. Double-click: launch-gui.bat
2. Click: 🚀 Start JobSentinel
3. Click: 🌐 Open Web UI

RUN JOB SEARCH
1. In GUI, click: 📊 Run Job Scraper
2. Wait 5-10 minutes
3. Check email for alerts

VIEW JOBS
1. Open Web UI
2. Click: 💼 Jobs
3. Filter by score (70%+)

TRACK APPLICATIONS
1. Open Web UI
2. Click: 📋 Tracker
3. Click: + Add Application

HELP & SUPPORT
- Docs: docs/ZERO_KNOWLEDGE_GUIDE.md
- GitHub: github.com/cboyd0319/JobSentinel/issues
- Troubleshooting: docs/WINDOWS_TROUBLESHOOTING.md

═══════════════════════════════════════════════════════════════
```

---

## Final Thoughts

JobSentinel is designed to be **the easiest and most private** job search tool available. You don't need to be a programmer or tech expert to use it effectively.

**Remember:**
- It's 100% FREE forever
- Your data is 100% PRIVATE (stays on your computer)
- No account or login required
- Works great on Windows 11

**Questions or feedback?**
- Email: (see GitHub profile)
- GitHub: https://github.com/cboyd0319/JobSentinel/issues

**Happy job hunting!** 🎯
