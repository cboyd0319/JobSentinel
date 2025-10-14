@echo off
REM Windows Setup Launcher for JobSentinel
REM
REM This batch file makes it easy for Windows users to run the setup script.
REM Just double-click this file to start!
REM
REM Requirements:
REM - Windows 11 (build 22000+)
REM - Python 3.12+ installed and in PATH
REM
REM No admin rights needed!

echo.
echo ========================================================================
echo                     JobSentinel Windows Setup
echo ========================================================================
echo.
echo Checking for Python...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Please install Python 3.12 or newer from:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANT: When installing Python, check the box:
    echo "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo Python found!
echo.
echo Starting setup wizard...
echo.

REM Run the Python setup script
python scripts\windows_setup.py

REM Check if setup succeeded
if errorlevel 1 (
    echo.
    echo ========================================================================
    echo Setup encountered errors.
    echo.
    echo For help, see: docs\WINDOWS_TROUBLESHOOTING.md
    echo ========================================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo Setup completed successfully!
echo ========================================================================
echo.
pause
