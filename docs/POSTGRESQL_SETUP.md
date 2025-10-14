# PostgreSQL Setup Guide for JobSentinel

**Version:** 0.6.0+  
**Last Updated:** October 14, 2025  
**Purpose:** Complete PostgreSQL installation and setup guide for all platforms

---

## Overview

JobSentinel uses PostgreSQL as its database engine for cross-platform compatibility, better performance, and industry-standard reliability. This guide will help you install and configure PostgreSQL on your system.

**Why PostgreSQL?**
- ✅ Works on macOS, Linux, and Windows
- ✅ Better performance and scalability than SQLite
- ✅ 100% local and private (no cloud required)
- ✅ Industry-standard database with excellent tooling
- ✅ Better concurrency handling for future features

---

## Quick Start (Recommended)

The easiest way to get started is to use JobSentinel's interactive setup wizard:

```bash
python -m jsa.cli setup
```

The wizard will:
1. Check if PostgreSQL is installed
2. Provide installation instructions for your OS
3. Help you create the database and user
4. Test the database connection
5. Save your configuration

---

## Manual Installation

### macOS

#### Option 1: Homebrew (Recommended)

```bash
# 1. Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install PostgreSQL 17 (latest stable)
brew install postgresql@17

# 3. Start PostgreSQL service
brew services start postgresql@17

# 4. Verify installation
psql --version
# Should output: psql (PostgreSQL) 17.x
```

#### Option 2: Postgres.app (GUI)

1. Download from: https://postgresapp.com/
2. Drag Postgres.app to Applications folder
3. Open Postgres.app and click "Initialize"
4. Add to PATH (optional):
   ```bash
   echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

### Linux (Ubuntu/Debian)

```bash
# 1. Update package list
sudo apt update

# 2. Install PostgreSQL 17 (latest stable)
sudo apt install postgresql-17 postgresql-contrib

# 3. Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Start on boot

# 4. Verify installation
psql --version
# Should output: psql (PostgreSQL) 17.x
```

### Linux (Fedora/RHEL/CentOS)

```bash
# 1. Install PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# 2. Install PostgreSQL 17 (latest stable)
sudo dnf install -y postgresql17-server

# 3. Initialize database
sudo /usr/pgsql-17/bin/postgresql-17-setup initdb

# 4. Start PostgreSQL service
sudo systemctl start postgresql-17
sudo systemctl enable postgresql-17  # Start on boot

# 5. Verify installation
psql --version
```

### Windows

#### Option 1: Official Installer (Recommended)

1. Download PostgreSQL 17 installer from: https://www.postgresql.org/download/windows/
2. Run the installer (`postgresql-17.x-windows-x64.exe`)
3. Follow the installation wizard:
   - Installation directory: Default (`C:\Program Files\PostgreSQL\17`)
   - Components: Select all (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)
   - Data directory: Default
   - **Password:** Set a strong password for the postgres superuser (remember this!)
   - Port: 5432 (default)
   - Locale: Default
4. Click "Next" through the rest of the wizard
5. Verify installation:
   ```powershell
   # Open PowerShell or Command Prompt
   psql --version
   # Should output: psql (PostgreSQL) 17.x
   ```

#### Option 2: Chocolatey (Package Manager)

```powershell
# 1. Install Chocolatey (if not already installed)
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Install PostgreSQL
choco install postgresql17

# 3. PostgreSQL service starts automatically
```

---

## Database Setup

After installing PostgreSQL, you need to create a database and user for JobSentinel.

### Quick Setup (Automatic)

Run the setup wizard and let it handle everything:

```bash
python -m jsa.cli setup
```

When prompted, choose "Yes" for automatic database setup. You may be asked for the postgres superuser password.

### Manual Setup

#### 1. Connect to PostgreSQL

**macOS/Linux:**
```bash
# Connect as postgres superuser
psql -U postgres

# If that doesn't work, try:
sudo -u postgres psql
```

**Windows:**
```powershell
# Open Command Prompt or PowerShell
psql -U postgres
# Enter the password you set during installation
```

#### 2. Create Database and User

Run these SQL commands in the psql prompt:

```sql
-- Create the database
CREATE DATABASE jobsentinel;

-- Create the application user
CREATE USER jobsentinel WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE jobsentinel TO jobsentinel;

-- Connect to the database
\c jobsentinel

-- Grant schema permissions (PostgreSQL 17+)
GRANT ALL ON SCHEMA public TO jobsentinel;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO jobsentinel;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO jobsentinel;

-- Exit psql
\q
```

#### 3. Test Connection

```bash
# Test connection with the new user
psql -U jobsentinel -d jobsentinel -h localhost

# If successful, you'll see:
# jobsentinel=>

# Exit with \q
```

---

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Edit the DATABASE_URL
DATABASE_URL=postgresql+asyncpg://jobsentinel:your_password@localhost:5432/jobsentinel
```

### 2. Connection String Format

```
postgresql+asyncpg://username:password@host:port/database
```

**Components:**
- `postgresql+asyncpg`: Database driver (asyncpg for async operations)
- `username`: PostgreSQL user (default: `jobsentinel`)
- `password`: User password (set during setup)
- `host`: Database host (default: `localhost` for local installations)
- `port`: PostgreSQL port (default: `5432`)
- `database`: Database name (default: `jobsentinel`)

### 3. Connection Pool Settings (Optional)

For better performance, you can configure connection pooling:

```bash
# .env file
DB_POOL_SIZE=10            # Number of connections to maintain
DB_POOL_MAX_OVERFLOW=5     # Extra connections allowed during high load
DB_POOL_PRE_PING=true      # Test connections before use
```

---

## Verification & Testing

### 1. Check PostgreSQL Status

**macOS (Homebrew):**
```bash
brew services list | grep postgresql
# Should show: postgresql@15  started
```

**Linux:**
```bash
sudo systemctl status postgresql
# Should show: active (running)
```

**Windows:**
```powershell
# Check Windows Services
Get-Service -Name postgresql*
# Should show: Running
```

### 2. Test Database Connection

```bash
# Test with psql
psql -U jobsentinel -d jobsentinel -h localhost -c "SELECT version();"

# Should output PostgreSQL version information
```

### 3. Test JobSentinel Connection

```bash
# Run the health check
python -m jsa.cli health

# Should show:
# ✓ Database: Connected (PostgreSQL)
```

---

## Common Issues & Troubleshooting

### Issue 1: "psql: command not found"

**Cause:** PostgreSQL binaries not in PATH

**Solution (macOS):**
```bash
# Add PostgreSQL to PATH
echo 'export PATH="/usr/local/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Solution (Linux):**
```bash
# Usually installed correctly, but if needed:
export PATH="/usr/lib/postgresql/15/bin:$PATH"
```

**Solution (Windows):**
1. Open System Properties → Environment Variables
2. Edit PATH variable
3. Add: `C:\Program Files\PostgreSQL\15\bin`

### Issue 2: "Connection refused" or "Could not connect to server"

**Cause:** PostgreSQL service not running

**Solution:**
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows (PowerShell as Admin)
Start-Service postgresql-x64-15
```

### Issue 3: "FATAL: password authentication failed"

**Cause:** Incorrect password or user doesn't exist

**Solution:**
1. Reset password:
   ```sql
   -- As postgres superuser
   psql -U postgres
   ALTER USER jobsentinel WITH PASSWORD 'new_password';
   ```
2. Update `.env` file with new password

### Issue 4: "FATAL: database 'jobsentinel' does not exist"

**Cause:** Database not created

**Solution:**
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE jobsentinel;"
```

### Issue 5: "permission denied for schema public"

**Cause:** User doesn't have schema permissions

**Solution:**
```sql
-- As postgres superuser
psql -U postgres -d jobsentinel

-- Grant permissions
GRANT ALL ON SCHEMA public TO jobsentinel;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO jobsentinel;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO jobsentinel;
```

### Issue 6: "SSL connection required"

**Cause:** PostgreSQL requires SSL (common with cloud databases)

**Solution:**
Add `?sslmode=require` to your connection string:
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db?sslmode=require
```

---

## Security Best Practices

### 1. Strong Passwords

Use strong, unique passwords for PostgreSQL users:

```bash
# Generate a secure password (macOS/Linux)
openssl rand -base64 32

# Or use a password manager
```

### 2. Limited Permissions

The `jobsentinel` user should only have access to the `jobsentinel` database:

```sql
-- Revoke unnecessary permissions
REVOKE ALL ON DATABASE postgres FROM jobsentinel;
REVOKE ALL ON DATABASE template1 FROM jobsentinel;
```

### 3. Local-Only Access (Default)

By default, PostgreSQL only accepts local connections. Keep it this way for privacy:

```bash
# pg_hba.conf should have:
# TYPE  DATABASE     USER          ADDRESS       METHOD
# local all          all                         peer
# host  all          all           127.0.0.1/32  md5
# host  all          all           ::1/128       md5
```

### 4. Regular Backups

Create regular backups of your job data:

```bash
# Backup database
pg_dump -U jobsentinel jobsentinel > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U jobsentinel jobsentinel < backup_20251014.sql
```

---

## Performance Tuning (Optional)

For better performance with JobSentinel:

### 1. Increase Shared Buffers

Edit `postgresql.conf`:

```ini
# Allocate 25% of system RAM to PostgreSQL
shared_buffers = 256MB  # For 1GB RAM
shared_buffers = 512MB  # For 2GB RAM
shared_buffers = 1GB    # For 4GB RAM
```

### 2. Optimize for SSDs

```ini
# In postgresql.conf
random_page_cost = 1.1  # Down from default 4.0 for SSDs
effective_io_concurrency = 200  # Up from default 1 for SSDs
```

### 3. Restart PostgreSQL

After making changes:

```bash
# macOS
brew services restart postgresql@15

# Linux
sudo systemctl restart postgresql

# Windows
Restart-Service postgresql-x64-15
```

---

## Uninstallation (If Needed)

### macOS (Homebrew)

```bash
# Stop service
brew services stop postgresql@15

# Uninstall PostgreSQL
brew uninstall postgresql@15

# Remove data directory (optional)
rm -rf /usr/local/var/postgresql@15
```

### Linux (Ubuntu/Debian)

```bash
# Stop service
sudo systemctl stop postgresql

# Remove PostgreSQL
sudo apt remove --purge postgresql-17

# Remove data directory (optional)
sudo rm -rf /var/lib/postgresql/17
```

### Windows

1. Open Control Panel → Programs → Uninstall a program
2. Select "PostgreSQL 17"
3. Click "Uninstall"
4. Delete data directory (optional): `C:\Program Files\PostgreSQL\17\data`

---

## Next Steps

After setting up PostgreSQL:

1. **Run Setup Wizard:** `python -m jsa.cli setup`
2. **Test Connection:** `python -m jsa.cli health`
3. **Start Scraping:** `python -m jsa.cli run-once`
4. **Launch Web UI:** `python -m jsa.cli api` (then visit http://localhost:8000)

---

## Additional Resources

- **PostgreSQL Documentation:** https://www.postgresql.org/docs/15/
- **PostgreSQL Tutorial:** https://www.postgresqltutorial.com/
- **pgAdmin (GUI Tool):** https://www.pgadmin.org/
- **DBeaver (Alternative GUI):** https://dbeaver.io/

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Logs:**
   - macOS: `/usr/local/var/log/postgresql@17.log`
   - Linux: `/var/log/postgresql/postgresql-17-main.log`
   - Windows: `C:\Program Files\PostgreSQL\17\data\log\`

2. **PostgreSQL Status:**
   ```bash
   # Check if PostgreSQL is running
   pg_isready
   ```

3. **JobSentinel Health Check:**
   ```bash
   python -m jsa.cli health
   ```

4. **Community Support:**
   - GitHub Issues: https://github.com/cboyd0319/JobSentinel/issues
   - PostgreSQL Community: https://www.postgresql.org/community/

---

**Remember:** All data stays local on your machine. PostgreSQL is running locally, and no data is sent to external servers unless you explicitly configure cloud deployment.
