# Windows Local Installation Guide

**IMPORTANT: This guide is for users who want to run the Job Search Automation tool locally on their Windows computer. No technical knowledge required!**

## 🚀 One-Click Installation (Recommended)

The easiest way to install is using our automated installer:

### Option 1: Web-Based Installation

1. **Open PowerShell**
   - Press `Windows + R`
   - Type `powershell`
   - Press `Enter`

2. **Run the installer command**
   - Copy and paste this exact command:
   ```powershell
   irm https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/windows/bootstrap.ps1 | iex
   ```
   - Press `Enter`

3. **Follow the wizard**
   - The installer will guide you through each step
   - Answer the questions about your job preferences
   - Wait for installation to complete

### Option 2: Download and Run

1. **Download the installer**
   - Right-click [here](https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/windows/ultimate_installer.ps1) and select "Save link as..."
   - Save it to your Desktop as `installer.ps1`

2. **Run the installer**
   - Right-click on `installer.ps1`
   - Select "Run with PowerShell"
   - Follow the on-screen instructions

## 📋 What Gets Installed

The installer will automatically:

✅ **Check your system** - Ensures Windows compatibility  
✅ **Install Python** - Downloads and installs Python if needed  
✅ **Download the application** - Gets all necessary files  
✅ **Set up dependencies** - Installs required libraries  
✅ **Create shortcuts** - Adds desktop shortcuts for easy access  
✅ **Configure settings** - Guides you through job preferences  
✅ **Test everything** - Verifies the installation works  
✅ **Set up automation** - Optional daily job searches  

## 🎯 After Installation

Once installed, you'll have these desktop shortcuts:

### 📊 Job Search Automation
- **What it does**: Finds jobs that match your preferences
- **How to use**: Double-click the desktop shortcut
- **When to use**: Run daily or when you want to find new jobs

### 📝 Resume ATS Scanner
- **What it does**: Analyzes your resume for ATS compatibility
- **How to use**: Double-click the shortcut, then drag your resume file to it
- **When to use**: Before applying to jobs to optimize your resume

## ⚙️ Configuration

The installer creates a configuration file at:
```
%USERPROFILE%\JobSearchAutomation\config\user_prefs.json
```

You can edit this file to update:
- Job titles you're looking for
- Keywords and skills
- Preferred locations
- Salary requirements
- Companies to avoid

## 🔧 Troubleshooting

### Installation Issues

**Problem**: "Execution policy" error  
**Solution**: Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Problem**: Python installation fails  
**Solution**: 
1. Download Python manually from [python.org](https://python.org/downloads/)
2. Check "Add Python to PATH" during installation
3. Re-run the installer

**Problem**: "Access denied" errors  
**Solution**: Run PowerShell as Administrator

### Runtime Issues

**Problem**: Desktop shortcuts don't work  
**Solution**: 
1. Open PowerShell
2. Navigate to installation folder: `cd %USERPROFILE%\JobSearchAutomation`
3. Run manually: `.\venv\Scripts\python.exe -m src.agent`

**Problem**: No jobs found  
**Solution**: 
1. Check your configuration in `config\user_prefs.json`
2. Ensure job titles and keywords are not too specific
3. Try broader location settings

**Problem**: Resume scanner fails  
**Solution**: 
1. Ensure your resume is in PDF or DOCX format
2. File should be text-based (not scanned images)
3. Try converting to PDF if using DOCX

## 📞 Getting Help

If you run into issues:

1. **Check the log file**: `%TEMP%\JobSearchInstaller.log`
2. **Try manual installation**: Download the project ZIP and follow manual setup steps
3. **Restart and retry**: Sometimes a simple restart fixes things
4. **Seek community help**: Check the project GitHub issues

## 🔄 Updates

To update the application:

1. **Automatic updates**: The application checks for updates when run
2. **Manual updates**: Re-run the installer - it will update existing installations
3. **Fresh install**: Delete the installation folder and run the installer again

## 🗑️ Uninstalling

To remove the application:

1. **Delete the installation folder**: `%USERPROFILE%\JobSearchAutomation`
2. **Remove desktop shortcuts**: Delete from desktop
3. **Remove scheduled tasks**: Open Task Scheduler and delete "JobSearchAutomation"
4. **Remove Python**: If you don't need Python for other things, uninstall from Windows Apps

## 🔒 Privacy & Security

- **Local-only**: All data stays on your computer
- **No tracking**: No usage data is collected
- **Open source**: You can review all code
- **Secure**: Uses standard Python libraries and secure practices

## ✨ Advanced Usage

Once comfortable with the basics, you can:

- **Customize job sources**: Edit configuration to enable different job boards
- **Set up Slack notifications**: Get alerts when good jobs are found
- **Batch resume analysis**: Scan multiple resumes at once
- **Export job data**: Save found jobs to Excel or CSV
- **Custom matching rules**: Create advanced job filtering logic

---

## 📚 Quick Reference

### Essential Commands

Open PowerShell in the installation directory (`%USERPROFILE%\JobSearchAutomation`) and run:

```powershell
# Run job search
.\venv\Scripts\python.exe -m src.agent

# Scan a resume
.\venv\Scripts\python.exe -m scripts.resume_ats_scanner resume.pdf

# Show configuration
Get-Content config\user_prefs.json

# Check logs
Get-Content logs\application.log -Tail 20
```

### Important Files

- **Configuration**: `config\user_prefs.json`
- **Resume templates**: `templates\resume\`
- **Found jobs**: `data\jobs.db`
- **Logs**: `logs\application.log`

### Installation Locations

- **Main application**: `%USERPROFILE%\JobSearchAutomation\`
- **Python environment**: `%USERPROFILE%\JobSearchAutomation\venv\`
- **Desktop shortcuts**: `%USERPROFILE%\Desktop\`
- **Scheduled task**: Windows Task Scheduler > "JobSearchAutomation"

---

**Need help?** This is alpha software, but it works! If you encounter issues, check the troubleshooting section above or review the project documentation.