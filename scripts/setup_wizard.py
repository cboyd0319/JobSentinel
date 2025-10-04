#!/usr/bin/env python3
"""Interactive setup wizard for the job scraper.

Provides an interactive CLI flow to capture user preferences, optionally
parse a resume for skill extraction, and persist a configuration file.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from InquirerPy import prompt  # type: ignore
from InquirerPy.validator import (  # type: ignore
	EmptyInputValidator,
	NumberValidator,
	PathValidator,
)

from utils.logging import console, get_logger
from src.unified_database import init_unified_db
from sources.job_scraper_base import GenericJobExtractor

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
	sys.path.append(str(PROJECT_ROOT))

logger = get_logger("setup_wizard")


class SetupWizard:
	"""Interactive setup wizard for job scraper personalization."""

	def __init__(self) -> None:
		self.extractor = GenericJobExtractor()
		self.user_profile: dict = {}
		self.config_path = Path("config/user_profile.json")

	@staticmethod
	def _sanitize_board_url(raw_url: str) -> str:
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

	def welcome(self) -> None:
		console.print("[bold blue] ENHANCED JOB SCRAPER SETUP WIZARD[/bold blue]")
		console.print("[blue]=[/blue]" * 50)
		console.print("Welcome to your personalized job scraper!")
		console.print("\nThis wizard will help you:")
		console.print("• [green]📄[/green] Analyze your resume for skills and preferences")
		console.print("• [green][/green] Set up personalized job matching")
		console.print("• [green][/green] Configure location and remote work preferences")
		console.print("• [green]💰[/green] Set salary expectations and career goals")
		console.print("• [green]🔍[/green] Choose which job boards to monitor")
		console.print("\n[bold green]Let's get started! 🎉[/bold green]\n")

	def collect_basic_info(self) -> None:
		console.print("[bold blue]1️⃣ BASIC INFORMATION[/bold blue]")
		console.print("[blue]-[/blue]" * 25)
		questions = [
			{
				"type": "input",
				"message": "📝 Your name:",
				"validate": EmptyInputValidator("Name cannot be empty"),
				"default": self.user_profile.get("name", ""),
				"name": "name",
			},
			{
				"type": "input",
				"message": "👔 Current job title:",
				"validate": EmptyInputValidator("Job title cannot be empty"),
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
				"type": "checkbox",
				"message": "🌍 Select your preferred work arrangements:",
				"choices": [
					{"name": "Remote", "value": "allow_remote", "enabled": True},
					{"name": "Hybrid", "value": "allow_hybrid", "enabled": True},
					{"name": "On-site", "value": "allow_onsite", "enabled": True},
				],
				"name": "work_arrangements",
			},
			{
				"type": "input",
				"message": " Enter preferred cities (comma-separated), or leave blank:",
				"name": "cities",
			},
			{
				"type": "input",
				"message": " Enter preferred states (comma-separated), or leave blank:",
				"name": "states",
			},
			{
				"type": "input",
				"message": " Enter preferred country (e.g., US), or leave blank:",
				"default": "US",
				"name": "country",
			},
		]
		answers = prompt(questions=questions)
		location_preferences = {
			"allow_remote": "allow_remote" in answers["work_arrangements"],
			"allow_hybrid": "allow_hybrid" in answers["work_arrangements"],
			"allow_onsite": "allow_onsite" in answers["work_arrangements"],
			"cities": [c.strip() for c in answers["cities"].split(",") if c.strip()],
			"states": [s.strip() for s in answers["states"].split(",") if s.strip()],
			"country": answers["country"],
		}
		self.user_profile["location_preferences"] = location_preferences
		for key in ["work_arrangements", "cities", "states", "country"]:
			answers.pop(key, None)
		self.user_profile.update(answers)
		console.print()

	def analyze_resume(self) -> None:
		console.print("[bold blue]2️⃣ RESUME ANALYSIS[/bold blue]")
		console.print("[blue]-[/blue]" * 20)
		has_resume = prompt(
			{
				"type": "confirm",
				"message": "📄 Do you have a resume you'd like to analyze?",
				"default": True,
				"name": "has_resume",
			}
		)["has_resume"]
		if has_resume:
			file_path = prompt(
				{
					"type": "input",
					"message": " Enter path to your resume file (PDF or DOCX):",
					"validate": PathValidator(is_file=True, message="Invalid file path"),
					"name": "file_path",
				}
			)["file_path"]
			try:
				from utils.resume_parser import (  # local import
					ResumeParser,
					interactive_skill_editor,
				)
				parser = ResumeParser()
				parsed_data = parser.parse_file(file_path)
				console.print(
					f"[green][OK] Resume analyzed successfully! Found {len(parsed_data['skills'])} skills.[/green]"
				)
				add_skills, remove_skills = interactive_skill_editor(
					parsed_data["skills"]
				)
				self.user_profile.update(
					parser.to_user_prefs(
						existing_prefs=self.user_profile,
						add_skills=add_skills,
						remove_skills=remove_skills,
					)
				)
			except Exception as exc:  # noqa: BLE001
				console.print(
					f"[bold red][ERROR] Error analyzing resume:[/bold red] {exc}"
				)
				self._manual_skills_entry()
		else:
			console.print(
				"[green]📝 No problem! Let's manually configure your skills and preferences.[/green]"
			)
			self._manual_skills_entry()

	def _extract_skills_from_resume(self, resume_text: str) -> None:
		try:
			skills_data = self.extractor.extract_skills_from_description(
				resume_text
			)
			current_title = self.user_profile.get("current_title", "")
			seniority = self.extractor.extract_seniority_from_title(current_title)
			self.user_profile["seniority_level"] = seniority
			technologies = skills_data.get("technologies", [])
			self.user_profile["skills"] = technologies
			self.user_profile["technical_skills"] = [
				s
				for s in technologies
				if any(t in s.lower() for t in ["python", "javascript", "sql", "aws", "react"])
			]
			self.user_profile["marketing_skills"] = [
				s
				for s in technologies
				if any(m in s.lower() for m in ["seo", "analytics", "ads", "marketing"])
			]
			console.print(
				f"[green][OK] Analysis complete! Found {len(self.user_profile['skills'])} skills[/green]"
			)
			console.print(f"[cyan] Detected seniority level: {seniority}[/cyan]")
			if self.user_profile["skills"]:
				console.print("\n[bold blue] Top skills identified:[/bold blue]")
				for skill in self.user_profile["skills"][:10]:
					console.print(f" • [green]{skill}[/green]")
				if len(self.user_profile["skills"]) > 10:
					console.print(
						f" ... and {len(self.user_profile['skills']) - 10} more"
					)
				confirm = prompt(
					{
						"type": "confirm",
						"message": "[OK] Does this look accurate?",
						"default": True,
						"name": "confirm_accuracy",
					}
				)["confirm_accuracy"]
				if not confirm:
					self._manual_skills_entry()
			else:
				console.print(
					"[yellow][WARNING] No skills detected automatically. Let's add them manually.[/yellow]"
				)
				self._manual_skills_entry()
		except Exception as exc:  # noqa: BLE001
			logger.error("Resume analysis failed: %s", exc)
			console.print(f"[bold red][ERROR] Resume analysis failed:[/bold red] {exc}")
			self._manual_skills_entry()

	def _manual_skills_entry(self) -> None:
		console.print("\n[bold blue]📝 MANUAL SKILLS ENTRY[/bold blue]")
		console.print("Enter your key skills, separated by commas:")
		console.print(
			"Example: Python, JavaScript, SEO, Google Analytics, Project Management"
		)
		skills_input = prompt(
			{
				"type": "input",
				"message": " Your skills:",
				"default": ", ".join(self.user_profile.get("skills", [])),
				"name": "skills_input",
			}
		)["skills_input"]
		if skills_input:
			manual = [s.strip() for s in skills_input.split(",") if s.strip()]
			self.user_profile["skills"] = manual
			console.print(f"[green][OK] Added {len(manual)} skills[/green]")

	def configure_career_goals(self) -> None:
		console.print("\n[bold blue]3️⃣ CAREER GOALS & COMPENSATION[/bold blue]")
		console.print("[blue]-[/blue]" * 35)
		career_goal = prompt(
			{
				"type": "list",
				"message": " What type of roles are you targeting?",
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
		salary_min = prompt(
			{
				"type": "input",
				"message": "💰 Minimum salary expectation (e.g., 80000, or leave blank to skip):",
				"validate": NumberValidator("Please enter a valid number or leave blank"),
				"filter": (lambda v: int(v) if v else None),
				"default": str(self.user_profile.get("salary_min", "")),
				"name": "salary_min",
			}
		)["salary_min"]
		salary_max = prompt(
			{
				"type": "input",
				"message": "💰 Maximum salary expectation (e.g., 120000, or leave blank to skip):",
				"validate": NumberValidator("Please enter a valid number or leave blank"),
				"filter": (lambda v: int(v) if v else None),
				"default": str(self.user_profile.get("salary_max", "")),
				"name": "salary_max",
			}
		)["salary_max"]
		if salary_min is not None:
			self.user_profile["salary_min"] = salary_min
		if salary_max is not None:
			self.user_profile["salary_max"] = salary_max

	def configure_job_boards(self) -> None:
		console.print("\n[bold blue]4️⃣ JOB BOARD SELECTION[/bold blue]")
		console.print("[blue]-[/blue]" * 25)
		console.print("📋 Which job boards would you like to monitor?")
		console.print("[green][OK] Greenhouse (automatic)[/green]")
		console.print("[green][OK] Microsoft Careers (automatic)[/green]")
		console.print("[green][OK] SpaceX Careers (automatic)[/green]")
		console.print("[green][OK] Workday sites (automatic)[/green]")
		console.print(
			"\n[bold blue]🏢 Any specific companies you're interested in?[/bold blue]"
		)
		console.print(
			"Enter company career page URLs (one per line, or press Enter to finish):"
		)
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
			except ValueError as exc:  # noqa: PERF203
				console.print(
					f"[bold red][WARNING] Invalid URL ({exc}). Please try again.[/bold red]"
				)
				continue
			if sanitized in custom_urls:
				console.print(
					"[yellow][WARNING] URL already added, skipping duplicate[/yellow]"
				)
				continue
			custom_urls.append(sanitized)
			console.print(f"[green]Added:[/green] {sanitized}")
		self.user_profile["custom_job_boards"] = custom_urls
		if custom_urls:
			console.print(
				f"[green][OK] Added {len(custom_urls)} custom job boards[/green]"
			)

	def configure_notifications(self) -> None:
		console.print("\n[bold blue]5️⃣ NOTIFICATION PREFERENCES[/bold blue]")
		console.print("[blue]-[/blue]" * 30)
		threshold_choice = prompt(
			{
				"type": "list",
				"message": " What's the minimum match score for notifications?",
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

	def save_configuration(self) -> None:
		console.print("\n[bold blue] SAVING CONFIGURATION[/bold blue]")
		console.print("[blue]-[/blue]" * 25)
		self.config_path.parent.mkdir(exist_ok=True)
		try:
			with open(self.config_path, "w", encoding="utf-8") as fh:
				json.dump(self.user_profile, fh, indent=2)
			init_unified_db()
			console.print(
				f"[green][OK] Configuration saved to {self.config_path}[/green]"
			)
			console.print("[green][OK] Database initialized[/green]")
		except Exception as exc:  # noqa: BLE001
			logger.error("Failed to save configuration: %s", exc)
			console.print(
				f"[bold red][ERROR] Failed to save configuration:[/bold red] {exc}"
			)

	def display_summary(self) -> None:
		console.print("\n[bold blue]🎉 SETUP COMPLETE![/bold blue]")
		console.print("[blue]=[/blue]" * 25)
		console.print(
			f"👤 Name: [green]{self.user_profile.get('name', 'Not specified')}[/green]"
		)
		console.print(
			f"👔 Title: [green]{self.user_profile.get('current_title', 'Not specified')}[/green]"
		)
		console.print(
			f"⭐ Level: [green]{self.user_profile.get('seniority_level', 'Not specified')}[/green]"
		)
		console.print(
			f" Location: [green]{self.user_profile.get('location', 'Not specified')}[/green]"
		)
		console.print(
			f"🌍 Work Style: [green]{self.user_profile.get('work_arrangement_preference', 'Any')}[/green]"
		)
		skills = self.user_profile.get("skills", [])
		if skills:
			console.print(f" Skills: [green]{len(skills)} identified[/green]")
		if self.user_profile.get("salary_min") or self.user_profile.get("salary_max"):
			console.print(
				"💰 Salary preferences captured (values hidden for privacy)"
			)
		if self.user_profile.get("custom_job_boards"):
			console.print(
				f"🏢 Custom Boards: [green]{len(self.user_profile['custom_job_boards'])} companies[/green]"
			)
		console.print(
			f"📬 Notifications: [green]{self.user_profile.get('notification_threshold', 75)}% threshold[/green]"
		)
		console.print(
			"\n[bold green] Your personalized job scraper is ready![/bold green]"
		)
		console.print("\nNext steps:")
		console.print("• Run job scraper to find matching opportunities")
		console.print("• Check config/user_profile.json to modify preferences")
		console.print("• View docs/ folder for advanced configuration")

	def run(self) -> None:
		try:
			self.welcome()
			self.collect_basic_info()
			self.analyze_resume()
			self.configure_career_goals()
			self.configure_job_boards()
			self.configure_notifications()
			self.save_configuration()
			self.display_summary()
		except KeyboardInterrupt:  # noqa: PIE786
			console.print("\n\n[bold red][ERROR] Setup cancelled by user[/bold red]")
			sys.exit(1)
		except Exception as exc:  # noqa: BLE001
			logger.error("Setup wizard failed: %s", exc)
			console.print(f"\n[bold red][ERROR] Setup failed:[/bold red] {exc}")
			sys.exit(1)


def main() -> None:  # noqa: D401
	"""Main entry point."""
	wizard = SetupWizard()
	wizard.run()


if __name__ == "__main__":  # pragma: no cover
	main()
