#!/usr/bin/env python3
"""
JobSentinel GUI Launcher - Zero-Knowledge User Interface

A simple, intuitive graphical interface for users with ZERO technical knowledge.
Uses only tkinter (included with Python) - no additional dependencies required.

Features:
- One-click launch buttons
- Visual status indicators
- Automatic configuration detection
- Helpful error messages with solutions
- System tray icon support
- Windows-friendly (no command line needed)

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | User interface design
- Microsoft Windows Design Guidelines | https://docs.microsoft.com | High | Desktop UI patterns
- WCAG 2.1 Level AA | https://www.w3.org/WAI/WCAG21/quickref/ | High | Accessibility

Author: JobSentinel Team
License: MIT
"""

import json
import os
import platform
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path
from tkinter import (
    Button,
    Frame,
    Label,
    Tk,
    messagebox,
    scrolledtext,
    ttk,
)
from typing import Optional

# Version
VERSION = "1.0.0"


class JobSentinelGUI:
    """Main GUI Application for JobSentinel."""

    def __init__(self, root: Tk) -> None:
        """Initialize the GUI.

        Args:
            root: The root Tkinter window
        """
        self.root = root
        self.root.title(f"JobSentinel Launcher v{VERSION}")
        self.root.geometry("800x600")
        self.root.resizable(True, True)

        # Set window icon (if available)
        try:
            icon_path = Path(__file__).parent / "static" / "favicon.ico"
            if icon_path.exists():
                self.root.iconbitmap(str(icon_path))
        except (OSError, IOError, RuntimeError) as e:
            # Icon not critical - continue without it
            # Common errors: file not found, invalid icon format, tkinter errors
            pass

        # Configure colors - Modern, professional palette
        self.bg_color = "#f8fafc"  # Softer, lighter background
        self.card_bg = "#ffffff"
        self.primary_color = "#0073e6"  # Professional blue
        self.success_color = "#10b981"  # Modern green
        self.error_color = "#ef4444"
        self.warning_color = "#f59e0b"
        self.text_primary = "#1e293b"  # Dark slate for text
        self.text_secondary = "#64748b"  # Medium slate for secondary text

        # State
        self.server_process: Optional[subprocess.Popen] = None
        self.config_path = Path("config/user_prefs.json")
        self.project_root = Path(__file__).parent

        # Build UI
        self._setup_ui()
        self._add_button_hover_effects()
        self._check_status()

    def _add_button_hover_effects(self) -> None:
        """Add hover effects to buttons for better visual feedback."""

        def on_enter(e):
            widget = e.widget
            if str(widget["state"]) != "disabled":
                current_bg = widget["bg"]
                # Darken the button slightly on hover
                if current_bg == self.success_color:
                    widget["bg"] = "#059669"
                elif current_bg == self.error_color:
                    widget["bg"] = "#dc2626"
                elif current_bg == self.primary_color:
                    widget["bg"] = "#0056b3"
                elif current_bg == self.card_bg:
                    widget["bg"] = "#f1f5f9"

        def on_leave(e):
            widget = e.widget
            if str(widget["state"]) != "disabled":
                # Restore original color
                if "Start" in widget["text"]:
                    widget["bg"] = self.success_color
                elif "Stop" in widget["text"]:
                    widget["bg"] = self.error_color
                elif "Web UI" in widget["text"]:
                    widget["bg"] = self.primary_color
                else:
                    widget["bg"] = self.card_bg

        # Apply to all buttons
        for widget in self.root.winfo_children():
            self._apply_hover_recursive(widget, on_enter, on_leave)

    def _apply_hover_recursive(self, widget, on_enter, on_leave):
        """Recursively apply hover effects to all buttons."""
        if isinstance(widget, Button):
            widget.bind("<Enter>", on_enter)
            widget.bind("<Leave>", on_leave)
        for child in widget.winfo_children():
            self._apply_hover_recursive(child, on_enter, on_leave)

    def _setup_ui(self) -> None:
        """Set up the user interface."""
        # Configure root
        self.root.configure(bg=self.bg_color)

        # Main container
        main_frame = Frame(self.root, bg=self.bg_color, padx=20, pady=20)
        main_frame.pack(fill="both", expand=True)

        # Header
        header_frame = Frame(main_frame, bg=self.bg_color)
        header_frame.pack(fill="x", pady=(0, 20))

        title_label = Label(
            header_frame,
            text="🎯 JobSentinel",
            font=("Segoe UI", 28, "bold"),
            bg=self.bg_color,
            fg=self.text_primary,
        )
        title_label.pack()

        subtitle_label = Label(
            header_frame,
            text="Your AI-Powered Job Search Assistant",
            font=("Segoe UI", 13),
            bg=self.bg_color,
            fg=self.text_secondary,
        )
        subtitle_label.pack(pady=(5, 0))

        # Status section - Card style with subtle shadow effect
        status_frame = Frame(
            main_frame,
            bg=self.card_bg,
            relief="flat",
            borderwidth=0,
            highlightthickness=1,
            highlightbackground="#e2e8f0",
        )
        status_frame.pack(fill="x", pady=(0, 20), ipady=20, ipadx=20)

        status_title = Label(
            status_frame,
            text="System Status",
            font=("Segoe UI", 15, "bold"),
            bg=self.card_bg,
            fg=self.text_primary,
        )
        status_title.pack(anchor="w", pady=(0, 15))

        # Status indicators
        self.status_labels = {}
        status_items = [
            ("python", "Python Installation"),
            ("config", "Configuration File"),
            ("database", "Database"),
            ("server", "API Server"),
        ]

        for key, label_text in status_items:
            item_frame = Frame(status_frame, bg=self.card_bg)
            item_frame.pack(fill="x", pady=4)

            status_indicator = Label(
                item_frame,
                text="⚫",
                font=("Segoe UI", 14),
                bg=self.card_bg,
                width=2,
            )
            status_indicator.pack(side="left", padx=(0, 8))

            status_label = Label(
                item_frame,
                text=label_text,
                font=("Segoe UI", 11),
                bg=self.card_bg,
                fg=self.text_primary,
                anchor="w",
            )
            status_label.pack(side="left", fill="x", expand=True)

            self.status_labels[key] = status_indicator

        # Main action buttons
        button_frame = Frame(main_frame, bg=self.bg_color)
        button_frame.pack(fill="x", pady=(0, 20))

        # Start button - Larger, more prominent
        self.start_button = Button(
            button_frame,
            text="🚀 Start JobSentinel",
            font=("Segoe UI", 14, "bold"),
            bg=self.success_color,
            fg="white",
            activebackground="#059669",
            activeforeground="white",
            relief="flat",
            padx=25,
            pady=18,
            cursor="hand2",
            command=self._start_server,
            borderwidth=0,
        )
        self.start_button.pack(fill="x", pady=(0, 12))

        # Stop button
        self.stop_button = Button(
            button_frame,
            text="⏹️ Stop JobSentinel",
            font=("Segoe UI", 13, "bold"),
            bg=self.error_color,
            fg="white",
            activebackground="#dc2626",
            activeforeground="white",
            relief="flat",
            padx=25,
            pady=16,
            cursor="hand2",
            command=self._stop_server,
            state="disabled",
            borderwidth=0,
        )
        self.stop_button.pack(fill="x", pady=(0, 12))

        # Open browser button
        self.browser_button = Button(
            button_frame,
            text="🌐 Open Web UI",
            font=("Segoe UI", 13),
            bg=self.primary_color,
            fg="white",
            activebackground="#0056b3",
            activeforeground="white",
            relief="flat",
            padx=25,
            pady=14,
            cursor="hand2",
            command=self._open_browser,
            state="disabled",
            borderwidth=0,
        )
        self.browser_button.pack(fill="x", pady=(0, 20))

        # Utility buttons in a grid
        util_frame = Frame(button_frame, bg=self.bg_color)
        util_frame.pack(fill="x")

        util_buttons = [
            ("⚙️ Setup Wizard", self._run_setup),
            ("📊 Run Job Scraper", self._run_scraper),
            ("🔧 Edit Configuration", self._edit_config),
            ("📧 Test Email Alerts", self._test_email),
            ("💾 Backup Data", self._backup_data),
            ("❓ Help & Docs", self._open_help),
        ]

        for i, (text, command) in enumerate(util_buttons):
            row = i // 2
            col = i % 2
            btn = Button(
                util_frame,
                text=text,
                font=("Segoe UI", 10),
                bg=self.card_bg,
                fg=self.primary_color,
                activebackground="#f1f5f9",
                relief="solid",
                borderwidth=1,
                padx=14,
                pady=10,
                cursor="hand2",
                command=command,
                highlightthickness=0,
            )
            btn.grid(
                row=row,
                column=col,
                sticky="ew",
                padx=(0 if col == 0 else 5, 5 if col == 0 else 0),
                pady=4,
            )

        util_frame.columnconfigure(0, weight=1)
        util_frame.columnconfigure(1, weight=1)

        # Log viewer
        log_frame = Frame(main_frame, bg=self.bg_color)
        log_frame.pack(fill="both", expand=True)

        log_title = Label(
            log_frame,
            text="Activity Log",
            font=("Segoe UI", 13, "bold"),
            bg=self.bg_color,
            fg=self.text_primary,
        )
        log_title.pack(anchor="w", pady=(0, 8))

        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            font=("Consolas", 10),
            bg=self.card_bg,
            fg=self.text_primary,
            relief="flat",
            borderwidth=0,
            highlightthickness=1,
            highlightbackground="#e2e8f0",
            wrap="word",
            height=10,
        )
        self.log_text.pack(fill="both", expand=True)
        self.log_text.config(state="disabled")

        # Footer
        footer_frame = Frame(main_frame, bg=self.bg_color)
        footer_frame.pack(fill="x", pady=(10, 0))

        footer_label = Label(
            footer_frame,
            text="JobSentinel v0.6.1 | 100% Local • 100% Private • 100% Free",
            font=("Segoe UI", 9),
            bg=self.bg_color,
            fg=self.text_secondary,
        )
        footer_label.pack()

    def _log(self, message: str, level: str = "info") -> None:
        """Add message to log viewer.

        Args:
            message: The message to log
            level: Log level (info, success, warning, error)
        """
        self.log_text.config(state="normal")

        # Add timestamp
        from datetime import datetime

        timestamp = datetime.now().strftime("%H:%M:%S")

        # Color code based on level
        prefix = {
            "info": "ℹ️",
            "success": "✅",
            "warning": "⚠️",
            "error": "❌",
        }.get(level, "•")

        self.log_text.insert("end", f"[{timestamp}] {prefix} {message}\n")
        self.log_text.see("end")
        self.log_text.config(state="disabled")

    def _check_status(self) -> None:
        """Check system status and update indicators."""
        self._log("Checking system status...", "info")

        # Check Python
        try:
            python_version = sys.version.split()[0]
            self.status_labels["python"].config(text="✅", fg=self.success_color)
            self._log(f"Python {python_version} detected", "success")
        except Exception as e:
            self.status_labels["python"].config(text="❌", fg=self.error_color)
            self._log(f"Python check failed: {e}", "error")

        # Check config
        if self.config_path.exists():
            self.status_labels["config"].config(text="✅", fg=self.success_color)
            self._log("Configuration file found", "success")
        else:
            self.status_labels["config"].config(text="⚠️", fg=self.warning_color)
            self._log("Configuration file not found - run Setup Wizard", "warning")

        # Check database
        db_path = Path("data/jobs.sqlite")
        if db_path.parent.exists():
            self.status_labels["database"].config(text="✅", fg=self.success_color)
            self._log("Database directory ready", "success")
        else:
            self.status_labels["database"].config(text="⚠️", fg=self.warning_color)
            self._log("Database directory will be created on first run", "info")

        # Server status
        self.status_labels["server"].config(text="⚫", fg="#999999")
        self._log("Server not running", "info")

    def _start_server(self) -> None:
        """Start the JobSentinel API server."""
        if self.server_process and self.server_process.poll() is None:
            messagebox.showinfo("Already Running", "JobSentinel is already running!")
            return

        # Check config exists
        if not self.config_path.exists():
            result = messagebox.askyesno(
                "Configuration Required",
                "No configuration file found. Would you like to run the Setup Wizard?",
            )
            if result:
                self._run_setup()
            return

        self._log("Starting JobSentinel API server...", "info")

        try:
            # Start the server in a separate thread
            def start_in_thread():
                try:
                    # Security: Bind to localhost only for local-first deployment
                    # This prevents remote access to the API server
                    self.server_process = subprocess.Popen(
                        [
                            sys.executable,
                            "-m",
                            "uvicorn",
                            "jsa.fastapi_app:app",
                            "--host",
                            "127.0.0.1",  # localhost only - no remote access
                            "--port",
                            "8000",
                        ],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        cwd=str(self.project_root),
                    )

                    # Update UI in main thread
                    self.root.after(0, self._on_server_started)

                except Exception as e:
                    self.root.after(0, lambda: self._log(f"Failed to start server: {e}", "error"))

            thread = threading.Thread(target=start_in_thread, daemon=True)
            thread.start()

        except Exception as e:
            self._log(f"Error starting server: {e}", "error")
            messagebox.showerror("Start Failed", f"Could not start JobSentinel:\n\n{e}")

    def _on_server_started(self) -> None:
        """Called when server successfully starts."""
        self.status_labels["server"].config(text="✅", fg=self.success_color)
        self._log("JobSentinel API server started on http://localhost:8000", "success")
        self._log("You can now open the Web UI!", "success")

        # Update buttons
        self.start_button.config(state="disabled")
        self.stop_button.config(state="normal")
        self.browser_button.config(state="normal")

        # Ask if user wants to open browser
        result = messagebox.askyesno(
            "Server Started!",
            "JobSentinel is now running!\n\nWould you like to open the web interface?",
        )
        if result:
            self._open_browser()

    def _stop_server(self) -> None:
        """Stop the JobSentinel API server."""
        if not self.server_process or self.server_process.poll() is not None:
            messagebox.showinfo("Not Running", "JobSentinel is not currently running.")
            return

        self._log("Stopping JobSentinel API server...", "info")

        try:
            self.server_process.terminate()
            self.server_process.wait(timeout=5)
            self.server_process = None

            self.status_labels["server"].config(text="⚫", fg="#999999")
            self._log("JobSentinel API server stopped", "success")

            # Update buttons
            self.start_button.config(state="normal")
            self.stop_button.config(state="disabled")
            self.browser_button.config(state="disabled")

        except subprocess.TimeoutExpired:
            self.server_process.kill()
            self.server_process = None
            self._log("Server forcefully terminated", "warning")
        except Exception as e:
            self._log(f"Error stopping server: {e}", "error")

    def _open_browser(self) -> None:
        """Open the web UI in default browser."""
        url = "http://localhost:8000"
        try:
            webbrowser.open(url)
            self._log(f"Opening {url} in browser...", "info")
        except Exception as e:
            self._log(f"Failed to open browser: {e}", "error")
            messagebox.showerror(
                "Browser Error", f"Could not open browser.\n\nPlease manually navigate to:\n{url}"
            )

    def _run_setup(self) -> None:
        """Run the interactive setup wizard."""
        self._log("Launching setup wizard...", "info")

        try:
            # Run setup wizard in new window
            # Security: Using sys.executable (trusted) with hardcoded module path
            subprocess.Popen(  # nosec B603 - controlled input (sys.executable + literal args)
                [sys.executable, "-m", "jsa.cli", "setup"],
                cwd=str(self.project_root),
            )
            self._log("Setup wizard launched in separate window", "success")
        except Exception as e:
            self._log(f"Failed to launch setup wizard: {e}", "error")
            messagebox.showerror("Setup Error", f"Could not launch setup wizard:\n\n{e}")

    def _run_scraper(self) -> None:
        """Run the job scraper once."""
        self._log("Running job scraper...", "info")

        result = messagebox.askyesno(
            "Run Job Scraper",
            "This will scrape jobs from configured sources.\n\n"
            "It may take several minutes depending on the number of sources.\n\n"
            "Continue?",
        )

        if not result:
            return

        try:
            # Run scraper in background
            # Security: Using sys.executable (trusted) with hardcoded module path
            subprocess.Popen(  # nosec B603 - controlled input (sys.executable + literal args)
                [sys.executable, "-m", "jsa.cli", "run-once"],
                cwd=str(self.project_root),
            )
            self._log("Job scraper started in background", "success")
            messagebox.showinfo(
                "Scraper Started",
                "Job scraper is running in the background.\n\n"
                "Check the Activity Log for progress.",
            )
        except Exception as e:
            self._log(f"Failed to run scraper: {e}", "error")
            messagebox.showerror("Scraper Error", f"Could not run job scraper:\n\n{e}")

    def _edit_config(self) -> None:
        """Open configuration file in default editor."""
        self._log("Opening configuration file...", "info")

        if not self.config_path.exists():
            result = messagebox.askyesno(
                "Configuration Not Found",
                "No configuration file exists yet.\n\n"
                "Would you like to run the Setup Wizard to create one?",
            )
            if result:
                self._run_setup()
            return

        try:
            # Security: Validate path is within project directory
            resolved_path = self.config_path.resolve()
            project_root_resolved = self.project_root.resolve()
            if not str(resolved_path).startswith(str(project_root_resolved)):
                raise ValueError("Configuration file must be within project directory")
            
            if platform.system() == "Windows":
                # nosec: os.startfile is safe here - path is validated above
                os.startfile(str(resolved_path))  # nosec B606
            elif platform.system() == "Darwin":  # macOS
                subprocess.run(["open", str(resolved_path)], check=False)
            else:  # Linux
                subprocess.run(["xdg-open", str(resolved_path)], check=False)

            self._log("Configuration file opened", "success")
        except (OSError, ValueError, subprocess.SubprocessError) as e:
            self._log(f"Failed to open config: {e}", "error")
            messagebox.showerror(
                "Config Error",
                f"Could not open configuration file:\n\n{e}\n\n"
                f"File location: {self.config_path}",
            )

    def _test_email(self) -> None:
        """Test email notification configuration."""
        self._log("Testing email configuration...", "info")

        # Check if .env exists
        env_path = Path(".env")
        if not env_path.exists():
            messagebox.showinfo(
                "Email Not Configured",
                "Email alerts are not configured yet.\n\n"
                "Run the Setup Wizard to configure email notifications.",
            )
            return

        try:
            # Run email test
            # Security: Using sys.executable (trusted) with controlled code string
            result = subprocess.run(  # nosec B603 - controlled input (sys.executable + literal code)
                [
                    sys.executable,
                    "-c",
                    "from notify.emailer import test_email_config; "
                    "import sys; sys.exit(0 if test_email_config() else 1)",
                ],
                cwd=str(self.project_root),
                capture_output=True,
                timeout=30,
                check=False,
            )

            if result.returncode == 0:
                self._log("Email test successful! Check your inbox.", "success")
                messagebox.showinfo(
                    "Email Test Success!",
                    "Test email sent successfully!\n\n"
                    "Check your inbox to confirm email alerts are working.",
                )
            else:
                self._log("Email test failed. Check configuration.", "error")
                messagebox.showerror(
                    "Email Test Failed",
                    "Could not send test email.\n\n"
                    "Check your email configuration in .env file.\n\n"
                    "For Gmail users:\n"
                    "- Enable 2-factor authentication\n"
                    "- Generate App Password\n"
                    "- Use App Password in SMTP_PASS",
                )
        except subprocess.TimeoutExpired:
            self._log("Email test timed out", "error")
            messagebox.showerror("Timeout", "Email test timed out after 30 seconds.")
        except Exception as e:
            self._log(f"Email test error: {e}", "error")
            messagebox.showerror("Test Error", f"Could not test email:\n\n{e}")

    def _backup_data(self) -> None:
        """Create a backup of JobSentinel data."""
        self._log("Creating backup...", "info")

        result = messagebox.askyesno(
            "Create Backup",
            "This will create a backup of all JobSentinel data:\n"
            "• Job database\n"
            "• Configuration files\n"
            "• Environment variables\n\n"
            "The backup will be saved as a .tar.gz file.\n\n"
            "Continue?",
        )

        if not result:
            return

        try:
            # Run backup command
            # Security: Using sys.executable (trusted) with hardcoded module path
            process = subprocess.Popen(  # nosec B603 - controlled input (sys.executable + literal args)
                [sys.executable, "-m", "jsa.cli", "backup", "create"],
                cwd=str(self.project_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            stdout, stderr = process.communicate(timeout=60)

            if process.returncode == 0:
                self._log("Backup created successfully!", "success")
                # Try to extract backup filename from output
                backup_file = "backup file in backups/ directory"
                for line in stdout.split("\n"):
                    if "backup" in line.lower() and ".tar.gz" in line:
                        backup_file = line.strip()
                        break

                messagebox.showinfo(
                    "Backup Created!",
                    f"Backup created successfully!\n\n"
                    f"Location: {backup_file}\n\n"
                    "Store this file in a safe location.",
                )
            else:
                self._log(f"Backup failed: {stderr}", "error")
                messagebox.showerror(
                    "Backup Failed",
                    f"Could not create backup.\n\n{stderr}",
                )
        except subprocess.TimeoutExpired:
            self._log("Backup timed out", "error")
            messagebox.showerror("Timeout", "Backup operation timed out after 60 seconds.")
        except Exception as e:
            self._log(f"Backup error: {e}", "error")
            messagebox.showerror("Backup Error", f"Could not create backup:\n\n{e}")

    def _open_help(self) -> None:
        """Open help documentation."""
        self._log("Opening documentation...", "info")

        # Try to open local docs first
        docs_path = Path("docs/README.md")
        if docs_path.exists():
            try:
                if platform.system() == "Windows":
                    os.startfile(str(docs_path))  # nosec B606 - safe, validated path
                elif platform.system() == "Darwin":
                    subprocess.run(["open", str(docs_path)], check=False)  # nosec B603 - literal args
                else:
                    subprocess.run(["xdg-open", str(docs_path)], check=False)  # nosec B603 - literal args
                return
            except (OSError, subprocess.SubprocessError):
                # Fall back to GitHub if local docs can't be opened
                pass

        # Open GitHub docs
        try:
            webbrowser.open("https://github.com/cboyd0319/JobSentinel#readme")
            self._log("Documentation opened in browser", "success")
        except Exception as e:
            self._log(f"Failed to open help: {e}", "error")
            messagebox.showerror("Help Error", f"Could not open documentation:\n\n{e}")

    def on_closing(self) -> None:
        """Handle window close event."""
        if self.server_process and self.server_process.poll() is None:
            result = messagebox.askyesno(
                "Server Running",
                "JobSentinel is still running.\n\n" "Do you want to stop it and exit?",
            )
            if result:
                self._stop_server()
                self.root.destroy()
        else:
            self.root.destroy()


def main() -> int:
    """Main entry point for GUI launcher.

    Returns:
        Exit code (0 for success)
    """
    try:
        root = Tk()
        app = JobSentinelGUI(root)
        root.protocol("WM_DELETE_WINDOW", app.on_closing)
        root.mainloop()
        return 0
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
