#!/usr/bin/env python3
"""
Interactive setup wizard for the enhanced job scraper.
Includes resume analysis for personalized job matching.
"""

from utils.logging import get_logger
from src.unified_database import init_unified_db
from sources.job_scraper_base import GenericJobExtractor
import sys
import json
from pathlib import Path
from urllib.parse import urlparse, urlunparse

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
        print("🚀 ENHANCED JOB SCRAPER SETUP WIZARD")
        print("=" * 50)
        print("Welcome to your personalized job scraper!")
        print("\nThis wizard will help you:")
        print("• 📄 Analyze your resume for skills and preferences")
        print("• 🎯 Set up personalized job matching")
        print("• 📍 Configure location and remote work preferences")
        print("• 💰 Set salary expectations and career goals")
        print("• 🔍 Choose which job boards to monitor")
        print("\nLet's get started! 🎉\n")

    def collect_basic_info(self):
        """Collect basic user information."""
        print("1️⃣ BASIC INFORMATION")
        print("-" * 25)

        self.user_profile['name'] = input("📝 Your name: ").strip()
        self.user_profile['current_title'] = input(
            "👔 Current job title: ").strip()
        self.user_profile['experience_years'] = input(
            "📅 Years of experience: ").strip()
        self.user_profile['location'] = input(
            "📍 Current location (city, state): ").strip()

        # Remote work preferences
        print("\n🌍 Work arrangement preferences:")
        print("1. On-site only")
        print("2. Remote only")
        print("3. Hybrid (mix of on-site and remote)")
        print("4. Open to all arrangements")

        work_pref = input("Choose (1-4): ").strip()
        work_arrangements = {
            '1': 'On-site',
            '2': 'Remote',
            '3': 'Hybrid',
            '4': 'Any'
        }
        self.user_profile['work_arrangement_preference'] = work_arrangements.get(
            work_pref, 'Any')
        print()

    def analyze_resume(self):
        """Analyze user's resume for skills extraction."""
        print("2️⃣ RESUME ANALYSIS")
        print("-" * 20)

        has_resume = input(
            "📄 Do you have a resume you'd like to analyze? (y/n): ").strip().lower()

        if has_resume in ['y', 'yes']:
            print("\nYou can provide your resume in two ways:")
            print("1. Paste resume text directly")
            print("2. Provide path to resume file (PDF/TXT)")

            method = input("Choose method (1-2): ").strip()

            resume_text = ""

            if method == '1':
                print("\n📝 Please paste your resume text below.")
                print("When finished, type 'DONE' on a new line:")

                lines = []
                while True:
                    line = input()
                    if line.strip() == 'DONE':
                        break
                    lines.append(line)
                resume_text = '\n'.join(lines)

            elif method == '2':
                file_path = input("📁 Enter path to resume file: ").strip()
                try:
                    if file_path.endswith('.pdf'):
                        print(
                            "📄 PDF analysis requires additional setup. For now, please copy/paste the text.")
                        return self.analyze_resume()
                    else:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            resume_text = f.read()
                except Exception as e:
                    print(f"❌ Error reading file: {e}")
                    return self.analyze_resume()

            if resume_text:
                print("\n🔍 Analyzing your resume...")
                self._extract_skills_from_resume(resume_text)
            else:
                print("⚠️ No resume text provided, skipping automatic analysis.")
                self._manual_skills_entry()
        else:
            print("📝 No problem! Let's manually configure your skills and preferences.")
            self._manual_skills_entry()

    def _extract_skills_from_resume(self, resume_text: str):
        """Extract skills from resume text."""
        try:
            skills_data = self.extractor.extract_skills_from_description(
                resume_text)

            # Extract seniority from current title
            current_title = self.user_profile.get('current_title', '')
            seniority = self.extractor.extract_seniority_from_title(
                current_title)

            self.user_profile['seniority_level'] = seniority
            self.user_profile['skills'] = skills_data.get('technologies', [])
            self.user_profile['technical_skills'] = [
                skill for skill in skills_data.get('technologies', [])
                if any(tech in skill.lower() for tech in ['python', 'javascript', 'sql', 'aws', 'react'])
            ]
            self.user_profile['marketing_skills'] = [
                skill for skill in skills_data.get('technologies', [])
                if any(marketing in skill.lower() for marketing in ['seo', 'analytics', 'ads', 'marketing'])
            ]

            print(
                f"✅ Analysis complete! Found {len(self.user_profile['skills'])} skills")
            print(f"📊 Detected seniority level: {seniority}")

            if self.user_profile['skills']:
                print("\n🎯 Top skills identified:")
                for skill in self.user_profile['skills'][:10]:
                    print(f"   • {skill}")

                if len(self.user_profile['skills']) > 10:
                    print(
                        f"   ... and {len(self.user_profile['skills']) - 10} more")

                confirm = input(
                    f"\n✅ Does this look accurate? (y/n): ").strip().lower()
                if confirm not in ['y', 'yes']:
                    self._manual_skills_entry()
            else:
                print("⚠️ No skills detected automatically. Let's add them manually.")
                self._manual_skills_entry()

        except Exception as e:
            logger.error(f"Resume analysis failed: {e}")
            print(f"❌ Resume analysis failed: {e}")
            self._manual_skills_entry()

    def _manual_skills_entry(self):
        """Allow manual entry of skills."""
        print("\n📝 MANUAL SKILLS ENTRY")
        print("Enter your key skills, separated by commas:")
        print("Example: Python, JavaScript, SEO, Google Analytics, Project Management")

        skills_input = input("🎯 Your skills: ").strip()
        if skills_input:
            manual_skills = [skill.strip()
                             for skill in skills_input.split(',')]
            self.user_profile['skills'] = manual_skills
            print(f"✅ Added {len(manual_skills)} skills")

    def configure_career_goals(self):
        """Configure career goals and salary expectations."""
        print("\n3️⃣ CAREER GOALS & COMPENSATION")
        print("-" * 35)

        # Career level aspirations
        print("🎯 What type of roles are you targeting?")
        print("1. Same level (lateral moves)")
        print("2. Next level up (promotions)")
        print("3. Leadership roles")
        print("4. Open to all levels")

        career_goal = input("Choose (1-4): ").strip()
        career_goals = {
            '1': 'lateral',
            '2': 'promotion',
            '3': 'leadership',
            '4': 'open'
        }
        self.user_profile['career_goal'] = career_goals.get(
            career_goal, 'open')

        # Salary expectations
        salary_min = input(
            "💰 Minimum salary expectation (or press Enter to skip): ").strip()
        salary_max = input(
            "💰 Maximum salary expectation (or press Enter to skip): ").strip()

        if salary_min:
            try:
                self.user_profile['salary_min'] = int(
                    salary_min.replace(
                        ',', '').replace(
                        '$', ''))
            except ValueError:
                print("⚠️ Invalid salary format, skipping")

        if salary_max:
            try:
                self.user_profile['salary_max'] = int(
                    salary_max.replace(
                        ',', '').replace(
                        '$', ''))
            except ValueError:
                print("⚠️ Invalid salary format, skipping")

    def configure_job_boards(self):
        """Configure which job boards to monitor."""
        print("\n4️⃣ JOB BOARD SELECTION")
        print("-" * 25)

        print("📋 Which job boards would you like to monitor?")
        print("✅ Greenhouse (automatic)")
        print("✅ Microsoft Careers (automatic)")
        print("✅ SpaceX Careers (automatic)")
        print("✅ Workday sites (automatic)")

        # Company-specific boards
        print("\n🏢 Any specific companies you're interested in?")
        print("Enter company career page URLs (one per line, or press Enter to finish):")

        custom_urls = []
        while True:
            url = input("🔗 Company URL: ").strip()
            if not url:
                break
            try:
                sanitized = self._sanitize_board_url(url)
            except ValueError as exc:
                print(f"⚠️ Invalid URL ({exc}). Please try again.")
                continue

            if sanitized in custom_urls:
                print("⚠️ URL already added, skipping duplicate")
                continue

            custom_urls.append(sanitized)

        self.user_profile['custom_job_boards'] = custom_urls

        if custom_urls:
            print(f"✅ Added {len(custom_urls)} custom job boards")

    def configure_notifications(self):
        """Configure notification preferences."""
        print("\n5️⃣ NOTIFICATION PREFERENCES")
        print("-" * 30)

        # Match threshold
        print("🎯 What's the minimum match score for notifications?")
        print("1. 90%+ (only excellent matches)")
        print("2. 75%+ (good matches)")
        print("3. 60%+ (decent matches)")
        print("4. 50%+ (all potential matches)")

        threshold_choice = input("Choose (1-4): ").strip()
        thresholds = {'1': 90, '2': 75, '3': 60, '4': 50}
        self.user_profile['notification_threshold'] = thresholds.get(
            threshold_choice, 75)

        # Notification frequency
        print("\n📬 How often should we check for new jobs?")
        print("1. Real-time (as soon as found)")
        print("2. Daily digest")
        print("3. Weekly summary")

        frequency_choice = input("Choose (1-3): ").strip()
        frequencies = {'1': 'realtime', '2': 'daily', '3': 'weekly'}
        self.user_profile['notification_frequency'] = frequencies.get(
            frequency_choice, 'daily')

    def save_configuration(self):
        """Save user configuration to file."""
        print("\n💾 SAVING CONFIGURATION")
        print("-" * 25)

        # Create config directory if it doesn't exist
        self.config_path.parent.mkdir(exist_ok=True)

        try:
            # Save to JSON file
            with open(self.config_path, 'w') as f:
                json.dump(self.user_profile, f, indent=2)

            # Initialize database with user profile
            init_unified_db()

            print(f"✅ Configuration saved to {self.config_path}")
            print("✅ Database initialized")

        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
            print(f"❌ Failed to save configuration: {e}")

    def display_summary(self):
        """Display setup summary."""
        print("\n🎉 SETUP COMPLETE!")
        print("=" * 25)

        print(f"👤 Name: {self.user_profile.get('name', 'Not specified')}")
        print(
            f"👔 Title: {self.user_profile.get('current_title', 'Not specified')}")
        print(
            f"⭐ Level: {self.user_profile.get('seniority_level', 'Not specified')}")
        print(
            f"📍 Location: {self.user_profile.get('location', 'Not specified')}")
        print(
            f"🌍 Work Style: {self.user_profile.get('work_arrangement_preference', 'Any')}")

        skills = self.user_profile.get('skills', [])
        if skills:
            print(f"🎯 Skills: {len(skills)} identified")

        salary_min = self.user_profile.get('salary_min')
        salary_max = self.user_profile.get('salary_max')
        if salary_min or salary_max:
            print(f"💰 Salary: ${salary_min or '?'} - ${salary_max or '?'}")

        custom_boards = self.user_profile.get('custom_job_boards', [])
        if custom_boards:
            print(f"🏢 Custom Boards: {len(custom_boards)} companies")

        print(
            f"📬 Notifications: {self.user_profile.get('notification_threshold', 75)}% threshold")

        print("\n🚀 Your personalized job scraper is ready!")
        print("\nNext steps:")
        print("• Run job scraper to find matching opportunities")
        print("• Check config/user_profile.json to modify preferences")
        print("• View docs/ folder for advanced configuration")

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
            print("\n\n❌ Setup cancelled by user")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Setup wizard failed: {e}")
            print(f"\n❌ Setup failed: {e}")
            sys.exit(1)


def main():
    """Main entry point."""
    wizard = SetupWizard()
    wizard.run()


if __name__ == "__main__":
    main()
