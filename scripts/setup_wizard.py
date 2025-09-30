#!/usr/bin/env python3
"""
Interactive setup wizard for the enhanced job scraper.
Includes resume analysis for personalized job matching.
"""

from utils.logging import get_logger, console
from src.unified_database import init_unified_db
from sources.job_scraper_base import GenericJobExtractor
import sys
import json
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from InquirerPy import prompt
from InquirerPy.validator import EmptyInput, PathValidator, NumberValidator

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))


logger = get_logger("setup_wizard")


class SetupWizard:
    """Interactive setup wizard for job scraper personalization."""

    def __init__(self):
        self.extractor = GenericJobExtractor()
        self.user_profile = {}
        self.config_path = Path("config/user_profile.json")

    @staticmethod
    def _sanitize_board_url(raw_url: str) -> str:
        """Validate and normalize a custom job board URL."""
        candidate = raw_url.strip()
        if not candidate:
            raise ValueError("empty URL")

        if "://" not in candidate:
            candidate = f"https://{candidate}"

        parsed = urlparse(candidate)

        if parsed.scheme not in {"http", "https"}:
            raise ValueError(f"unsupported scheme: {parsed.scheme}")

        if not parsed.hostname:
            raise ValueError("missing hostname")

        normalized = parsed._replace(
            scheme=parsed.scheme.lower(),
            netloc=(parsed.hostname or "").lower(),
            fragment="",
            params="",
        )

        return urlunparse(normalized)

    def welcome(self):
        """Display welcome message and overview."""
        console.print("[bold blue]🚀 ENHANCED JOB SCRAPER SETUP WIZARD[/bold blue]")
        console.print("[blue]=[/blue]" * 50)
        console.print("Welcome to your personalized job scraper!")
        console.print("\nThis wizard will help you:")
        console.print("• [green]📄[/green] Analyze your resume for skills and preferences")
        console.print("• [green]🎯[/green] Set up personalized job matching")
        console.print("• [green]📍[/green] Configure location and remote work preferences")
        console.print("• [green]💰[/green] Set salary expectations and career goals")
        console.print("• [green]🔍[/green] Choose which job boards to monitor")
        console.print("\n[bold green]Let's get started! 🎉[/bold green]\n")

    def collect_basic_info(self):
        """Collect basic user information."""
        console.print("[bold blue]1️⃣ BASIC INFORMATION[/bold blue]")
        console.print("[blue]-[/blue]" * 25)

        questions = [
            {
                "type": "input",
                "message": "📝 Your name:",
                "validate": EmptyInput("Name cannot be empty"),
                "default": self.user_profile.get("name", ""),
                "name": "name",
            },
            {
                "type": "input",
                "message": "👔 Current job title:",
                "validate": EmptyInput("Job title cannot be empty"),
                "default": self.user_profile.get("current_title", ""),
                "name": "current_title",
            },
            {
                "type": "input",
                "message": "📅 Years of experience:",
                "validate": NumberValidator("Please enter a valid number"),
                "default": str(self.user_profile.get("experience_years", 0)),
                "name": "experience_years",
            },
            {
                "type": "input",
                "message": "📍 Current location (city, state):",
                "validate": EmptyInput("Location cannot be empty"),
                "default": self.user_profile.get("location", ""),
                "name": "location",
            },
            {
                "type": "list",
                "message": "🌍 Work arrangement preferences:",
                "choices": [
                    {"name": "On-site only", "value": "On-site"},
                    {"name": "Remote only", "value": "Remote"},
                    {"name": "Hybrid (mix of on-site and remote)", "value": "Hybrid"},
                    {"name": "Open to all arrangements", "value": "Any"},
                ],
                "default": self.user_profile.get("work_arrangement_preference", "Any"),
                "name": "work_arrangement_preference",
            },
        ]
        answers = prompt(questions=questions)
        self.user_profile.update(answers)
        console.print()

    def analyze_resume(self):
        """Analyze user's resume for skills extraction."""
        console.print("[bold blue]2️⃣ RESUME ANALYSIS[/bold blue]")
        console.print("[blue]-[/blue]" * 20)

        has_resume = prompt(
            {
                "type": "confirm",
                "message": "📄 Do you have a resume you'd like to analyze?",
                "default": False,
                "name": "has_resume",
            }
        )["has_resume"]

        if has_resume:
            console.print("\nYou can provide your resume in two ways:")
            console.print("1. Paste resume text directly")
            console.print("2. Provide path to resume file (PDF/TXT)")

            method = prompt(
                {
                    "type": "list",
                    "message": "Choose method:",
                    "choices": [{"name": "Paste text", "value": "paste"}, {"name": "File path", "value": "file"}],
                    "name": "method",
                }
            )["method"]

            resume_text = ""

            if method == "paste":
                console.print("\n[bold yellow]📝 Please paste your resume text below.[/bold yellow]")
                console.print("[bold yellow]When finished, type 'DONE' on a new line and press Enter:[/bold yellow]")

                lines = []
                while True:
                    line = input()
                    if line.strip().upper() == "DONE":
                        break
                    lines.append(line)
                resume_text = "\n".join(lines)

            elif method == "file":
                file_path = prompt(
                    {
                        "type": "input",
                        "message": "📁 Enter path to resume file:",
                        "validate": PathValidator(is_file=True, message="Invalid file path"),
                        "name": "file_path",
                    }
                )["file_path"]
                try:
                    if file_path.endswith(".pdf"):
                        console.print(
                            "[yellow]📄 PDF analysis requires additional setup. For now, please copy/paste the text.[/yellow]"
                        )
                        return self.analyze_resume()
                    else:
                        with open(file_path, "r", encoding="utf-8") as f:
                            resume_text = f.read()
                except Exception as e:
                    console.print(f"[bold red]❌ Error reading file:[/bold red] {e}")
                    return self.analyze_resume()

            if resume_text:
                console.print("\n[cyan]🔍 Analyzing your resume...[/cyan]")
                self._extract_skills_from_resume(resume_text)
            else:
                console.print("[yellow]⚠️ No resume text provided, skipping automatic analysis.[/yellow]")
                self._manual_skills_entry()
        else:
            console.print("[green]📝 No problem! Let's manually configure your skills and preferences.[/green]")
            self._manual_skills_entry()

    def _extract_skills_from_resume(self, resume_text: str):
        """Extract skills from resume text."""
        try:
            skills_data = self.extractor.extract_skills_from_description(resume_text)

            # Extract seniority from current title
            current_title = self.user_profile.get("current_title", "")
            seniority = self.extractor.extract_seniority_from_title(current_title)

            self.user_profile["seniority_level"] = seniority
            self.user_profile["skills"] = skills_data.get("technologies", [])
            self.user_profile["technical_skills"] = [
                skill
                for skill in skills_data.get("technologies", [])
                if any(tech in skill.lower() for tech in ["python", "javascript", "sql", "aws", "react"])
            ]
            self.user_profile["marketing_skills"] = [
                skill
                for skill in skills_data.get("technologies", [])
                if any(marketing in skill.lower() for marketing in ["seo", "analytics", "ads", "marketing"])
            ]

            console.print(f"[green]✅ Analysis complete! Found {len(self.user_profile['skills'])} skills[/green]")
            console.print(f"[cyan]📊 Detected seniority level: {seniority}[/cyan]")

            if self.user_profile["skills"]:
                console.print("\n[bold blue]🎯 Top skills identified:[/bold blue]")
                for skill in self.user_profile["skills"][:10]:
                    console.print(f"   • [green]{skill}[/green]")

                if len(self.user_profile["skills"]) > 10:
                    console.print(f"   ... and {len(self.user_profile['skills']) - 10} more")

                confirm_accuracy = prompt(
                    {
                        "type": "confirm",
                        "message": "✅ Does this look accurate?",
                        "default": True,
                        "name": "confirm_accuracy",
                    }
                )["confirm_accuracy"]
                if not confirm_accuracy:
                    self._manual_skills_entry()
            else:
                console.print("[yellow]⚠️ No skills detected automatically. Let's add them manually.[/yellow]")
                self._manual_skills_entry()

        except Exception as e:
            logger.error(f"[bold red]Resume analysis failed:[/bold red] {e}")
            console.print(f"[bold red]❌ Resume analysis failed:[/bold red] {e}")
            self._manual_skills_entry()

    def _manual_skills_entry(self):
        """Allow manual entry of skills."""
        console.print("\n[bold blue]📝 MANUAL SKILLS ENTRY[/bold blue]")
        console.print("Enter your key skills, separated by commas:")
        console.print("Example: Python, JavaScript, SEO, Google Analytics, Project Management")

        skills_input = prompt(
            {
                "type": "input",
                "message": "🎯 Your skills:",
                "default": ", ".join(self.user_profile.get("skills", [])),
                "name": "skills_input",
            }
        )["skills_input"]
        if skills_input:
            manual_skills = [skill.strip() for skill in skills_input.split(",")]
            self.user_profile["skills"] = manual_skills
            console.print(f"[green]✅ Added {len(manual_skills)} skills[/green]")

    def configure_career_goals(self):
        """Configure career goals and salary expectations."""
        console.print("\n[bold blue]3️⃣ CAREER GOALS & COMPENSATION[/bold blue]")
        console.print("[blue]-[/blue]" * 35)

        # Career level aspirations
        career_goal = prompt(
            {
                "type": "list",
                "message": "🎯 What type of roles are you targeting?",
                "choices": [
                    {"name": "Same level (lateral moves)", "value": "lateral"},
                    {"name": "Next level up (promotions)", "value": "promotion"},
                    {"name": "Leadership roles", "value": "leadership"},
                    {"name": "Open to all levels", "value": "open"},
                ],
                "default": self.user_profile.get("career_goal", "open"),
                "name": "career_goal",
            }
        )["career_goal"]
        self.user_profile["career_goal"] = career_goal

        # Salary expectations
        salary_min = prompt(
            {
                "type": "input",
                "message": "💰 Minimum salary expectation (e.g., 80000, or leave blank to skip):",
                "validate": NumberValidator("Please enter a valid number or leave blank"),
                "filter": lambda val: int(val) if val else None,
                "default": str(self.user_profile.get("salary_min", "")),
                "name": "salary_min",
            }
        )["salary_min"]
        salary_max = prompt(
            {
                "type": "input",
                "message": "💰 Maximum salary expectation (e.g., 120000, or leave blank to skip):",
                "validate": NumberValidator("Please enter a valid number or leave blank"),
                "filter": lambda val: int(val) if val else None,
                "default": str(self.user_profile.get("salary_max", "")),
                "name": "salary_max",
            }
        )["salary_max"]

        if salary_min is not None:
            self.user_profile["salary_min"] = salary_min
        if salary_max is not None:
            self.user_profile["salary_max"] = salary_max

    def configure_job_boards(self):
        """Configure which job boards to monitor."""
        console.print("\n[bold blue]4️⃣ JOB BOARD SELECTION[/bold blue]")
        console.print("[blue]-[/blue]" * 25)

        console.print("📋 Which job boards would you like to monitor?")
        console.print("[green]✅ Greenhouse (automatic)[/green]")
        console.print("[green]✅ Microsoft Careers (automatic)[/green]")
        console.print("[green]✅ SpaceX Careers (automatic)[/green]")
        console.print("[green]✅ Workday sites (automatic)[/green]")

        # Company-specific boards
        console.print("\n[bold blue]🏢 Any specific companies you're interested in?[/bold blue]")
        console.print("Enter company career page URLs (one per line, or press Enter to finish):")

        custom_urls = self.user_profile.get("custom_job_boards", [])
        while True:
            url = prompt(
                {
                    "type": "input",
                    "message": f"🔗 Company URL (leave blank to finish, current: {len(custom_urls)}):",
                    "name": "url",
                }
            )["url"]
            if not url:
                break
            try:
                sanitized = self._sanitize_board_url(url)
            except ValueError as exc:
                console.print(f"[bold red]⚠️ Invalid URL ({exc}). Please try again.[/bold red]")
                continue

            if sanitized in custom_urls:
                console.print("[yellow]⚠️ URL already added, skipping duplicate[/yellow]")
                continue

            custom_urls.append(sanitized)
            console.print(f"[green]Added:[/green] {sanitized}")

        self.user_profile["custom_job_boards"] = custom_urls

        if custom_urls:
            console.print(f"[green]✅ Added {len(custom_urls)} custom job boards[/green]")

    def configure_notifications(self):
        """Configure notification preferences."""
        console.print("\n[bold blue]5️⃣ NOTIFICATION PREFERENCES[/bold blue]")
        console.print("[blue]-[/blue]" * 30)

        # Match threshold
        threshold_choice = prompt(
            {
                "type": "list",
                "message": "🎯 What's the minimum match score for notifications?",
                "choices": [
                    {"name": "90%+ (only excellent matches)", "value": 90},
                    {"name": "75%+ (good matches)", "value": 75},
                    {"name": "60%+ (decent matches)", "value": 60},
                    {"name": "50%+ (all potential matches)", "value": 50},
                ],
                "default": self.user_profile.get("notification_threshold", 75),
                "name": "notification_threshold",
            }
        )["notification_threshold"]
        self.user_profile["notification_threshold"] = threshold_choice

        # Notification frequency
        frequency_choice = prompt(
            {
                "type": "list",
                "message": "📬 How often should we check for new jobs?",
                "choices": [
                    {"name": "Real-time (as soon as found)", "value": "realtime"},
                    {"name": "Daily digest", "value": "daily"},
                    {"name": "Weekly summary", "value": "weekly"},
                ],
                "default": self.user_profile.get("notification_frequency", "daily"),
                "name": "notification_frequency",
            }
        )["notification_frequency"]
        self.user_profile["notification_frequency"] = frequency_choice

    def save_configuration(self):
        """Save user configuration to file."""
        console.print("\n[bold blue]💾 SAVING CONFIGURATION[/bold blue]")
        console.print("[blue]-[/blue]" * 25)

        # Create config directory if it doesn't exist
        self.config_path.parent.mkdir(exist_ok=True)

        try:
            # Save to JSON file
            with open(self.config_path, "w") as f:
                json.dump(self.user_profile, f, indent=2)

            # Initialize database with user profile
            init_unified_db()

            console.print(f"[green]✅ Configuration saved to {self.config_path}[/green]")
            console.print("[green]✅ Database initialized[/green]")

        except Exception as e:
            logger.error(f"[bold red]Failed to save configuration:[/bold red] {e}")
            console.print(f"[bold red]❌ Failed to save configuration:[/bold red] {e}")

    def display_summary(self):
        """Display setup summary."""
        console.print("\n[bold blue]🎉 SETUP COMPLETE![/bold blue]")
        console.print("[blue]=[/blue]" * 25)

        console.print(f"👤 Name: [green]{self.user_profile.get('name', 'Not specified')}[/green]")
        console.print(f"👔 Title: [green]{self.user_profile.get('current_title', 'Not specified')}[/green]")
        console.print(f"⭐ Level: [green]{self.user_profile.get('seniority_level', 'Not specified')}[/green]")
        console.print(f"📍 Location: [green]{self.user_profile.get('location', 'Not specified')}[/green]")
        console.print(f"🌍 Work Style: [green]{self.user_profile.get('work_arrangement_preference', 'Any')}[/green]")

        skills = self.user_profile.get("skills", [])
        if skills:
            console.print(f"🎯 Skills: [green]{len(skills)} identified[/green]")

        salary_min = self.user_profile.get("salary_min")
        salary_max = self.user_profile.get("salary_max")
        if salary_min or salary_max:
            console.print("💰 Salary preferences captured (values hidden for privacy)")

        custom_boards = self.user_profile.get("custom_job_boards", [])
        if custom_boards:
            console.print(f"🏢 Custom Boards: [green]{len(custom_boards)} companies[/green]")

        console.print(
            f"📬 Notifications: [green]{self.user_profile.get('notification_threshold', 75)}% threshold[/green]"
        )

        console.print("\n[bold green]🚀 Your personalized job scraper is ready![/bold green]")
        console.print("\nNext steps:")
        console.print("• Run job scraper to find matching opportunities")
        console.print("• Check config/user_profile.json to modify preferences")
        console.print("• View docs/ folder for advanced configuration")

    def run(self):
        """Run the complete setup wizard."""
        try:
            self.welcome()
            self.collect_basic_info()
            self.analyze_resume()
            self.configure_career_goals()
            self.configure_job_boards()
            self.configure_notifications()
            self.save_configuration()
            self.display_summary()

        except KeyboardInterrupt:
            console.print("\n\n[bold red]❌ Setup cancelled by user[/bold red]")
            sys.exit(1)
        except Exception as e:
            logger.error(f"[bold red]Setup wizard failed:[/bold red] {e}")
            console.print("\n[bold red]❌ Setup failed:[/bold red] {e}")
            sys.exit(1)


def main():
    """Main entry point."""
    wizard = SetupWizard()
    wizard.run()


if __name__ == "__main__":
    main()
