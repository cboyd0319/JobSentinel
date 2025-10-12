# JobSentinel Installation Guide
## For Complete Beginners (No Technical Experience Required!)

**Last Updated:** January 12, 2025  
**Estimated Time:** 15-20 minutes  
**Difficulty:** 🟢 Beginner-friendly

---

## 📋 What You'll Need

Before we start, make sure you have:

- [ ] A computer with internet connection
- [ ] Windows 11+, macOS 15+, or Ubuntu 22.04+
- [ ] About 2 GB of free disk space
- [ ] Administrator/Admin access (ability to install programs)
- [ ] Basic skills: Can copy and paste, can download files

**Don't worry if you don't know what "Python" or "Git" is - we'll install everything you need!**

---

## 🪟 Windows Installation (Step-by-Step)

### Step 1: Download JobSentinel

**Option A: Easy Way (Recommended for Beginners)**

1. Open your web browser (Chrome, Edge, Firefox)
2. Go to: https://github.com/cboyd0319/JobSentinel
3. Look for a green button that says **"Code"**
4. Click it, then click **"Download ZIP"**
5. The file will download (usually goes to your Downloads folder)

**Option B: Using Git (If You Know How)**
```bash
git clone https://github.com/cboyd0319/JobSentinel.git
```

### Step 2: Extract the ZIP File

1. Open your **Downloads** folder
2. Find the file called `JobSentinel-main.zip`
3. **Right-click** on it
4. Choose **"Extract All..."**
5. Click **"Extract"**
6. A new folder called `JobSentinel-main` will appear

### Step 3: Run the Installer

1. Open the `JobSentinel-main` folder
2. Look for a folder called `scripts`
3. Inside, find a file called `install.py`
4. **Right-click** on `install.py`
5. Choose **"Open With" → "Python"**
   - If you don't see Python, that's okay! The installer will help you get it.

**What Happens Next:**
- A black window will appear (this is normal!)
- You'll see messages like "Installing Python..." or "Setting up JobSentinel..."
- This takes about 10-15 minutes
- **Do not close this window!** Just wait for it to finish.

### Step 4: First-Time Setup

Once the installation finishes, you'll see:
```
✅ Installation Complete!
Would you like to configure JobSentinel now? (y/n):
```

1. Type `y` and press Enter
2. You'll be asked some questions:

**Question 1: What kind of jobs are you looking for?**
```
Example answers:
- "Software Engineer"
- "Accountant"
- "Marketing Manager"
- "Remote Customer Support"

Your answer: 
```
Type the job title(s) you're interested in, separated by commas.

**Question 2: Where do you want to work?**
```
Example answers:
- "Remote" (work from anywhere)
- "New York, NY"
- "London, UK"
- "Remote, San Francisco"

Your answer:
```

**Question 3: Minimum salary (optional)?**
```
Example: 50000
(Leave blank if you don't have a minimum)

Your answer:
```

**Question 4: Do you have a Slack account for job alerts?**
```
Answer: y (yes) or n (no)
```

If yes, you'll need a "webhook URL" (don't worry, we'll show you how to get this in the FAQ).

### Step 5: Test It!

Let's make sure everything works:

1. Press the **Windows key** (⊞) on your keyboard
2. Type `cmd` and press Enter (opens Command Prompt)
3. Type this and press Enter:
```bash
cd Downloads\JobSentinel-main
python -m jsa.cli run-once
```

**What You Should See:**
```
🔍 Starting job search...
🌐 Scraping job boards...
✅ Found 47 jobs!
📊 Processing matches...
🎯 3 high-quality matches found!
```

**Congratulations!** 🎉 JobSentinel is now searching for jobs!

---

## 🍎 macOS Installation (Step-by-Step)

### Step 1: Download JobSentinel

1. Open Safari (or your favorite browser)
2. Go to: https://github.com/cboyd0319/JobSentinel
3. Click the green **"Code"** button
4. Click **"Download ZIP"**

### Step 2: Extract the ZIP File

1. The ZIP file automatically extracts on Mac
2. Look in your **Downloads** folder
3. You'll see a folder called `JobSentinel-main`

### Step 3: Open Terminal

**What's Terminal?** It's a way to give instructions to your Mac using text commands.

1. Press `Command + Space` (this opens Spotlight)
2. Type `terminal` and press Enter
3. A window with a black or white background opens - this is Terminal!

### Step 4: Navigate to JobSentinel

In Terminal, type these commands **exactly** (press Enter after each line):

```bash
cd ~/Downloads/JobSentinel-main
ls
```

You should see a list of files and folders. If you see `install.py`, you're in the right place!

### Step 5: Run the Installer

Type this command and press Enter:
```bash
python3 scripts/install.py
```

**What Happens:**
- Terminal will show messages like "Installing dependencies..."
- Takes about 10-15 minutes
- You might see some red text - that's usually okay!
- Wait until you see "Installation Complete!"

### Step 6: First-Time Setup

Follow the same setup questions as Windows (Step 4 above).

### Step 7: Test It!

In Terminal, type:
```bash
python3 -m jsa.cli run-once
```

You should see job search results!

---

## 🐧 Ubuntu/Linux Installation (Step-by-Step)

### Step 1: Open Terminal

1. Press `Ctrl + Alt + T` (opens Terminal)
2. You'll see a window with a command prompt

### Step 2: Install Git (if needed)

Type this and press Enter:
```bash
sudo apt update && sudo apt install -y git python3 python3-venv
```

You'll need to enter your password.

### Step 3: Download JobSentinel

```bash
cd ~
git clone https://github.com/cboyd0319/JobSentinel.git
cd JobSentinel
```

### Step 4: Run the Installer

```bash
python3 scripts/install.py
```

### Step 5: First-Time Setup & Testing

Same as macOS steps above!

---

## ❓ Common Questions

### "I don't have Python installed. What do I do?"

**Don't worry!** The installer (`install.py`) will automatically install Python for you. Just double-click it and follow the prompts.

### "The installer says 'Permission Denied'"

**On Windows:**
- Right-click `install.py` → "Run as Administrator"

**On Mac/Linux:**
```bash
chmod +x scripts/install.py
python3 scripts/install.py
```

### "I see a lot of red text during installation"

Most of the time, red text is just warnings - not errors. The installer will tell you if something actually failed. Look for:
- ❌ (red X) = Something went wrong
- ✅ (green check) = Everything is fine

### "How do I know if it's working?"

Run this command:
```bash
python -m jsa.cli health
```

If you see:
```
HEALTH ok total_jobs=0 high_score_jobs=0
```
Everything is working! The zeros are normal - you haven't searched for jobs yet.

### "What if I make a mistake during setup?"

**No problem!** You can always reconfigure:

**Windows:**
```bash
cd JobSentinel-main
python -m jsa.cli config-validate
```

**Mac/Linux:**
```bash
cd JobSentinel
python3 -m jsa.cli config-validate
```

---

## 🆘 Something Went Wrong?

### Error: "Python not found"

**Windows:**
1. Download Python from: https://www.python.org/downloads/
2. **Important:** Check "Add Python to PATH" during installation
3. Restart your computer
4. Try again

**Mac:**
```bash
# Install Homebrew first (package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Python
brew install python@3.13
```

**Linux:**
```bash
sudo apt install python3.13 python3.13-venv
```

### Error: "Not enough disk space"

You need at least 2 GB free. To free up space:

**Windows:**
1. Open **Settings** → **System** → **Storage**
2. Click **"Temporary files"**
3. Check the boxes and click **"Remove files"**

**Mac:**
1. Open **Finder** → **Go** → **Computer**
2. Right-click your hard drive → **Get Info**
3. Empty Trash and delete old files

### Error: "Antivirus blocked installation"

This is common with security software. Tell your antivirus that JobSentinel is safe:

**Windows Defender:**
1. Open **Windows Security**
2. Go to **Virus & threat protection** → **Manage settings**
3. Under **Exclusions**, click **"Add or remove exclusions"**
4. Click **"Add an exclusion"** → **"Folder"**
5. Select your `JobSentinel-main` folder

**Other Antivirus:**
- Look for "Exceptions" or "Exclusions" in settings
- Add the JobSentinel folder

---

## 🎓 Next Steps

Once installation is complete:

1. **Read the Quickstart Guide:** `docs/quickstart.md`
2. **Set up job alerts:** Configure Slack or email notifications
3. **Run your first search:** `python -m jsa.cli run-once`
4. **Schedule automatic searches:** See automation guide

---

## 📞 Need More Help?

- **FAQ:** See `docs/FAQ.md` for common questions
- **Troubleshooting:** See `docs/ERROR_RECOVERY_GUIDE.md`
- **GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues
- **Community:** Join our discussions for help from other users

---

## ✅ Installation Checklist

Use this to track your progress:

- [ ] Downloaded JobSentinel
- [ ] Extracted ZIP file
- [ ] Ran `install.py` successfully
- [ ] Completed first-time setup questions
- [ ] Tested with `python -m jsa.cli health`
- [ ] Ran first job search with `run-once`
- [ ] Received job results
- [ ] (Optional) Configured Slack alerts
- [ ] (Optional) Set up automatic scheduling

**All done?** 🎉 You're ready to start finding your dream job!

---

*Remember: This guide assumes ZERO technical knowledge. If anything is confusing, it's our fault - not yours! Please let us know so we can make it clearer.*
