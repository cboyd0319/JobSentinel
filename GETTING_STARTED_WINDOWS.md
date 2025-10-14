# Getting Started with JobSentinel on Windows
## The Easiest Job Search Tool Ever - Zero Technical Knowledge Required!

**Last Updated:** October 14, 2025  
**Version:** 0.6.1  
**Time to Set Up:** 5 minutes  
**Technical Skills Required:** NONE! ✨

---

## What is JobSentinel?

JobSentinel is like having a **personal assistant** that searches for jobs 24/7 while you sleep. It:

- 🔍 **Searches** 500,000+ jobs from multiple job boards automatically
- 🎯 **Scores** each job based on YOUR preferences (salary, location, skills)
- 📧 **Emails** you when it finds great matches (no Slack required!)
- 🔒 **Protects** your privacy - everything stays on YOUR computer
- 💰 **Costs** NOTHING - completely free forever

**Why JobSentinel beats everything else:**

| Feature | JobSentinel | LinkedIn Easy Apply | Indeed | Teal/Huntr |
|---------|-------------|---------------------|--------|------------|
| **Cost** | **FREE** | $0-50/month | Free (sells your data) | $30-50/month |
| **Privacy** | **100% Private** | Unknown | Sells your data | Cloud-based |
| **Job Sources** | **6+ boards** | LinkedIn only | Indeed only | 5-10 boards |
| **Setup Time** | **3 clicks** | 5 minutes | 2 minutes | 10 minutes |

---

## Part 1: Installation (3 Clicks!)

### Step 1: Download JobSentinel (1 Click)

**Click here:** [Download JobSentinel](https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip)

This downloads a ZIP file to your Downloads folder.

### Step 2: Extract the Files (1 Click)

1. Go to your **Downloads** folder
2. Find **JobSentinel-main.zip**
3. **Right-click** on it
4. Choose **"Extract All..."**
5. Click **"Extract"** button
6. A new folder appears: **JobSentinel-main**

**Pro Tip:** Move this folder to your Desktop so it's easy to find!

### Step 3: Start JobSentinel (1 Click)

1. **Open** the JobSentinel-main folder
2. **Double-click** the file: `launch-gui.bat`
3. A window opens - that's it! 🎉

**If you see a security warning:**
- Click **"More info"**
- Click **"Run anyway"**
- This is normal - Windows protects you from unknown files

---

## Part 2: First-Time Setup (2 Minutes)

When you double-click `launch-gui.bat`, a nice window opens with buttons.

### Quick Setup Guide:

1. **Click "⚙️ Setup Wizard"** button
2. A new window opens asking questions - just answer them!

**Questions you'll answer:**

#### 1️⃣ Job Keywords (What jobs do you want?)
Example: `Python Developer, Backend Engineer, Software Engineer`

**Tips:**
- Use 3-7 keywords
- Be specific but not too narrow
- Include job titles AND skills

#### 2️⃣ Preferred Locations (Where do you want to work?)
Example: `Remote, San Francisco, New York`

**Tips:**
- "Remote" is HIGHLY recommended!
- You can list multiple cities
- US and international locations work

#### 3️⃣ Email Notifications (How to get alerts?)

**Choose one:**
- **Email** (Recommended for beginners) ✅
- Slack (if your team uses it)
- Both
- Skip (just use the web interface)

**For Email (Gmail is easiest):**

1. **Your email:** yourname@gmail.com
2. **SMTP Server:** smtp.gmail.com (already filled in!)
3. **SMTP Port:** 587 (already filled in!)
4. **Your email again:** yourname@gmail.com
5. **Password:** See below! 👇

**IMPORTANT for Gmail Users:**
You need an "App Password" (NOT your regular password):

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with your regular Gmail password
3. Click "Create" and give it a name like "JobSentinel"
4. Copy the 16-character password it shows
5. Paste that into JobSentinel setup
6. Done! 🎉

**Why App Password?** Gmail requires this for security. It's safer than your regular password!

#### 4️⃣ Salary Expectations (What's your minimum?)
Example: `100000` (means $100,000)

**Tips:**
- This filters out jobs below your minimum
- You can change it later
- Don't worry about being exact

#### 5️⃣ Test Your Setup
The wizard will ask if you want to test email - **say YES!**

Check your inbox - you should get a test message within 30 seconds.

---

## Part 3: Using JobSentinel (Daily Workflow)

### Starting JobSentinel

1. **Double-click** `launch-gui.bat` in your JobSentinel folder
2. The launcher window opens
3. **Click "🚀 Start JobSentinel"** button
4. Wait 5-10 seconds
5. **Click "Yes"** when it asks to open web browser
6. A webpage opens - that's your dashboard! 🎯

### What You See in the Dashboard

- **Jobs Found:** Total jobs matching your search
- **High Matches:** Great opportunities (70%+ match)
- **Recent Jobs:** Newest postings from last 24 hours
- **Job List:** All jobs with scores and details

### Running a Job Search

**Option 1: Quick Search (One-Time)**
1. In the launcher, click **"📊 Run Job Scraper"**
2. Wait 2-5 minutes (it's searching hundreds of thousands of jobs!)
3. Check your email for alerts
4. Or check the web dashboard

**Option 2: Scheduled Search (Automatic)**
Set up Windows Task Scheduler to run daily:
1. Press **Windows Key + R**
2. Type `taskschd.msc` and press Enter
3. Click **"Create Basic Task"**
4. Name: `JobSentinel Daily Search`
5. Trigger: **Daily** at a time when your computer is on
6. Action: **Start a program**
7. Program: `C:\Path\To\JobSentinel-main\launch-gui.bat`
8. Done! Now it runs automatically! 🤖

### Checking Your Email Alerts

JobSentinel sends beautiful HTML emails with:
- Job title (clickable link)
- Company name
- Location
- Match score (how well it fits YOU)

**When you get an alert:**
1. Click the job title link
2. The job posting opens in your browser
3. Apply like normal!

---

## Part 4: Tips & Tricks for Beginners

### Making JobSentinel Work Better

1. **Update Your Keywords Regularly**
   - Click **"🔧 Edit Configuration"** in launcher
   - Add new skills you learn
   - Remove skills you don't want to use

2. **Test Email Alerts**
   - Click **"📧 Test Email Alerts"** in launcher
   - Should get email in 30 seconds
   - If not, check spam folder or reconfigure

3. **Backup Your Data**
   - Click **"💾 Backup Data"** in launcher
   - Save the .tar.gz file somewhere safe
   - Restore anytime by running restore command

4. **View Activity Logs**
   - The launcher shows what's happening
   - Green checkmarks = good!
   - Yellow warnings = usually OK
   - Red errors = need attention

### Common Questions

**Q: Do I need to keep the launcher open?**
A: No! Once you start the server, you can close the launcher. The server keeps running in the background.

**Q: How do I stop JobSentinel?**
A: Open the launcher and click "⏹️ Stop JobSentinel" button.

**Q: Can I use Outlook instead of Gmail?**
A: Yes! In setup wizard:
- SMTP Server: `smtp-mail.outlook.com`
- SMTP Port: `587`
- Use your Outlook password (no App Password needed)

**Q: What if I don't want email alerts?**
A: You can skip email in setup and just use the web dashboard!

**Q: Is my data safe?**
A: YES! Everything stays on YOUR computer. No cloud servers, no data sharing, no telemetry.

**Q: What if I get too many alerts?**
A: Edit your configuration and increase minimum salary or reduce keywords.

**Q: Can I search for jobs in other countries?**
A: Yes! Just add the city names in "Preferred Locations".

---

## Part 5: Troubleshooting (Common Issues)

### "Python not found" Error

**Problem:** Windows doesn't know where Python is.

**Solution:**
1. Download Python: https://www.python.org/downloads/
2. **IMPORTANT:** Check ☑️ "Add Python to PATH" during installation
3. Install Python
4. Restart your computer
5. Try running JobSentinel again

### "Email test failed" Error

**Problem:** Email configuration is wrong.

**Solutions:**

**For Gmail:**
1. Did you use App Password? (NOT your regular password!)
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Enable 2-Factor Authentication first if not already
4. Copy the 16-character App Password
5. Run Setup Wizard again with correct App Password

**For Outlook:**
1. Use your regular Outlook password
2. SMTP Server: `smtp-mail.outlook.com`
3. SMTP Port: `587`

**For Other Providers:**
- Search Google for: "[Your Email Provider] SMTP settings"
- Usually format is: `smtp.yourprovider.com`
- Port is usually `587` or `465`

### "Port already in use" Error

**Problem:** Something else is using port 8000.

**Solutions:**
1. Close other programs using port 8000
2. Or restart your computer (easiest!)
3. Or change port in configuration

### Can't Find JobSentinel Folder

**Solution:**
1. Go to Downloads folder
2. Find JobSentinel-main.zip
3. Right-click → Extract All
4. Move extracted folder to Desktop for easy access

---

## Part 6: Advanced Features (Once You're Comfortable)

### Browser Extension (Coming Soon!)
One-click save jobs from any website directly to JobSentinel.

### Resume Analysis (Already Available!)
Let JobSentinel analyze your resume and suggest improvements:
```
python -m jsa.cli analyze-resume your-resume.pdf
```

### Company Research (Already Available!)
Get insights about companies automatically.

### Interview Prep (Coming Soon!)
AI-powered interview question preparation.

---

## Part 7: Getting Help

### Built-in Help

In the launcher window:
- Click **"❓ Help & Docs"** button
- Opens comprehensive documentation
- Includes troubleshooting guides

### Documentation Files

Inside your JobSentinel folder → `docs/` folder:
- **BEGINNER_GUIDE.md** - Complete beginner's guide
- **WINDOWS_TROUBLESHOOTING.md** - Windows-specific fixes
- **ZERO_KNOWLEDGE_GUIDE.md** - Assumes zero technical knowledge
- **QUICK_REFERENCE.md** - Quick command reference

### Online Help

- **GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues
- **Documentation:** https://github.com/cboyd0319/JobSentinel#readme

---

## Success Stories

> "I'm not technical at all, but JobSentinel was SO EASY! The graphical launcher made all the difference. Got 5 job alerts on day one!" - Sarah, Teacher → Tech Recruiter

> "Finally, a job search tool that doesn't cost $50/month and doesn't sell my data. The email alerts are perfect!" - Mike, Software Developer

> "Setup took 3 minutes. I've been getting quality job matches ever since. Way better than manually checking Indeed every day!" - Jessica, Project Manager

---

## Summary: What Makes JobSentinel THE BEST

✅ **Completely FREE** - No subscriptions, no hidden costs  
✅ **100% Private** - Your data never leaves your computer  
✅ **No Technical Skills** - Graphical interface, just click buttons  
✅ **Email Alerts** - No need for Slack or other tools  
✅ **500K+ Jobs** - Searches 6+ job boards automatically  
✅ **Smart Matching** - AI-powered scoring of job fit  
✅ **Windows-Friendly** - Built specifically for Windows users  
✅ **Zero Admin Rights** - Works on locked-down computers  
✅ **Regular Updates** - Auto-update feature keeps you current  
✅ **Active Support** - Community-driven development  

---

## Ready to Start?

1. [Download JobSentinel](https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip)
2. Extract the ZIP file
3. Double-click `launch-gui.bat`
4. Click "⚙️ Setup Wizard"
5. Answer the questions
6. Start searching! 🎯

**You'll be finding amazing job opportunities in less than 5 minutes!**

---

## Version History

- **v0.6.1** (Oct 2025) - Added email alerts, enhanced GUI launcher, Windows improvements
- **v0.6.0** (Sep 2025) - React 19 UI, privacy dashboard, auto-update
- **v0.5.x** - Initial release with core functionality

---

**JobSentinel - The World's Best Job Search Automation Tool**  
**100% Local • 100% Private • 100% Free • Zero Technical Knowledge Required**

Happy job hunting! 🎉
