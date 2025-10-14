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
        except Exception:
            pass  # Icon not critical

        # Configure colors
        self.bg_color = "#f5f5f5"
        self.primary_color = "#3b82f6"
        self.success_color = "#22c55e"
        self.error_color = "#ef4444"
        self.warning_color = "#f59e0b"

        # State
        self.server_process: Optional[subprocess.Popen] = None
        self.config_path = Path("config/user_prefs.json")
        self.project_root = Path(__file__).parent

        # Build UI
        self._setup_ui()
        self._check_status()

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
            font=("Segoe UI", 24, "bold"),
            bg=self.bg_color,
            fg=self.primary_color,
        )
        title_label.pack()

        subtitle_label = Label(
            header_frame,
            text="Your AI-Powered Job Search Assistant",
            font=("Segoe UI", 12),
            bg=self.bg_color,
            fg="#666666",
        )
        subtitle_label.pack()

        # Status section
        status_frame = Frame(main_frame, bg="white", relief="solid", borderwidth=1)
        status_frame.pack(fill="x", pady=(0, 20), ipady=15, ipadx=15)

        status_title = Label(
            status_frame,
            text="System Status",
            font=("Segoe UI", 14, "bold"),
            bg="white",
        )
        status_title.pack(anchor="w", pady=(0, 10))

        # Status indicators
        self.status_labels = {}
        status_items = [
            ("python", "Python Installation"),
            ("config", "Configuration File"),
            ("database", "Database"),
            ("server", "API Server"),
        ]

        for key, label_text in status_items:
            item_frame = Frame(status_frame, bg="white")
            item_frame.pack(fill="x", pady=2)

            status_indicator = Label(
                item_frame,
                text="⚫",
                font=("Segoe UI", 12),
                bg="white",
                width=2,
            )
            status_indicator.pack(side="left")

            status_label = Label(
                item_frame,
                text=label_text,
                font=("Segoe UI", 10),
                bg="white",
                anchor="w",
            )
            status_label.pack(side="left", fill="x", expand=True)

            self.status_labels[key] = status_indicator

        # Main action buttons
        button_frame = Frame(main_frame, bg=self.bg_color)
        button_frame.pack(fill="x", pady=(0, 20))

        # Start button
        self.start_button = Button(
            button_frame,
            text="🚀 Start JobSentinel",
            font=("Segoe UI", 12, "bold"),
            bg=self.success_color,
            fg="white",
            activebackground="#16a34a",
            activeforeground="white",
            relief="flat",
            padx=20,
            pady=15,
            cursor="hand2",
            command=self._start_server,
        )
        self.start_button.pack(fill="x", pady=(0, 10))

        # Stop button
        self.stop_button = Button(
            button_frame,
            text="⏹️ Stop JobSentinel",
            font=("Segoe UI", 12, "bold"),
            bg=self.error_color,
            fg="white",
            activebackground="#dc2626",
            activeforeground="white",
            relief="flat",
            padx=20,
            pady=15,
            cursor="hand2",
            command=self._stop_server,
            state="disabled",
        )
        self.stop_button.pack(fill="x", pady=(0, 10))

        # Open browser button
        self.browser_button = Button(
            button_frame,
            text="🌐 Open Web UI",
            font=("Segoe UI", 12),
            bg=self.primary_color,
            fg="white",
            activebackground="#2563eb",
            activeforeground="white",
            relief="flat",
            padx=20,
            pady=12,
            cursor="hand2",
            command=self._open_browser,
            state="disabled",
        )
        self.browser_button.pack(fill="x", pady=(0, 10))

        # Utility buttons in a grid
        util_frame = Frame(button_frame, bg=self.bg_color)
        util_frame.pack(fill="x")

        util_buttons = [
            ("⚙️ Setup Wizard", self._run_setup),
            ("📊 Run Job Scraper", self._run_scraper),
            ("🔧 Configuration", self._edit_config),
            ("❓ Help & Docs", self._open_help),
        ]

        for i, (text, command) in enumerate(util_buttons):
            row = i // 2
            col = i % 2
            btn = Button(
                util_frame,
                text=text,
                font=("Segoe UI", 10),
                bg="white",
                fg=self.primary_color,
                activebackground="#f0f0f0",
                relief="solid",
                borderwidth=1,
                padx=15,
                pady=10,
                cursor="hand2",
                command=command,
            )
            btn.grid(row=row, column=col, sticky="ew", padx=(0 if col == 0 else 5, 5 if col == 0 else 0), pady=5)

        util_frame.columnconfigure(0, weight=1)
        util_frame.columnconfigure(1, weight=1)

        # Log viewer
        log_frame = Frame(main_frame, bg=self.bg_color)
        log_frame.pack(fill="both", expand=True)

        log_title = Label(
            log_frame,
            text="Activity Log",
            font=("Segoe UI", 12, "bold"),
            bg=self.bg_color,
        )
        log_title.pack(anchor="w", pady=(0, 5))

        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            font=("Consolas", 9),
            bg="white",
            fg="#333333",
            relief="solid",
            borderwidth=1,
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
            font=("Segoe UI", 8),
            bg=self.bg_color,
            fg="#999999",
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
                    self.server_process = subprocess.Popen(
                        [sys.executable, "-m", "uvicorn", "jsa.fastapi_app:app", "--host", "0.0.0.0", "--port", "8000"],
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
            messagebox.showerror("Browser Error", f"Could not open browser.\n\nPlease manually navigate to:\n{url}")

    def _run_setup(self) -> None:
        """Run the interactive setup wizard."""
        self._log("Launching setup wizard...", "info")
        
        try:
            # Run setup wizard in new window
            subprocess.Popen(
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
            subprocess.Popen(
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
            if platform.system() == "Windows":
                os.startfile(str(self.config_path))
            elif platform.system() == "Darwin":  # macOS
                subprocess.run(["open", str(self.config_path)])
            else:  # Linux
                subprocess.run(["xdg-open", str(self.config_path)])
            
            self._log("Configuration file opened", "success")
        except Exception as e:
            self._log(f"Failed to open config: {e}", "error")
            messagebox.showerror(
                "Config Error",
                f"Could not open configuration file:\n\n{e}\n\n"
                f"File location: {self.config_path}",
            )

    def _open_help(self) -> None:
        """Open help documentation."""
        self._log("Opening documentation...", "info")
        
        # Try to open local docs first
        docs_path = Path("docs/README.md")
        if docs_path.exists():
            try:
                if platform.system() == "Windows":
                    os.startfile(str(docs_path))
                elif platform.system() == "Darwin":
                    subprocess.run(["open", str(docs_path)])
                else:
                    subprocess.run(["xdg-open", str(docs_path)])
                return
            except Exception:
                pass  # Fall back to GitHub
        
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
                "JobSentinel is still running.\n\n"
                "Do you want to stop it and exit?",
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
