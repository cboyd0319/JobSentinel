@echo off
REM JobSentinel GUI Launcher (Batch Version)
REM 
REM Double-click this file to start the JobSentinel GUI!
REM No command line or technical knowledge required.
REM
REM This is the EASIEST way to use JobSentinel on Windows.

echo.
echo ========================================================================
echo                      JobSentinel GUI Launcher
echo ========================================================================
echo.
echo Starting JobSentinel with graphical interface...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Please install Python 3.11 or newer from:
    echo https://www.python.org/downloads/
    echo ^(Python 3.12+ recommended for best compatibility^)
    echo.
    echo IMPORTANT: When installing Python, check the box:
    echo "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

REM Change to the repository root (3 levels up from deploy\local\windows\)
cd /d "%~dp0"
cd ..\..\..\

echo Repository root: %CD%
echo.

REM Launch the GUI
python -m jsa.gui_launcher

REM If we get here, the GUI closed
echo.
echo JobSentinel GUI closed.
echo.
pause
