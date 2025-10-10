"""Google Cloud Platform update workflow."""

from __future__ import annotations

from pathlib import Path

from cloud.utils import (
    choose,
    create_or_update_secret,
    print_header,
)


class GCPUpdate:
    """Interactive updater for Google Cloud Run Jobs."""

    def __init__(self, project_id: str) -> None:
        self.project_id = project_id

    async def run(self) -> None:
        self._print_welcome()

        update_options = {
            "User Preferences": self._update_user_preferences,
        }

        selection = choose("What would you like to update?", list(update_options.keys()))
        update_function = update_options[selection]
        await update_function()

        self._print_summary()

    def _print_welcome(self) -> None:
        print_header(f"Google Cloud Updater for project: {self.project_id}")

    async def _update_user_preferences(self) -> None:
        print_header("Updating User Preferences")

        while True:
            prefs_path_str = input("Enter the path to your user_prefs.json file: ").strip()
            prefs_path = Path(prefs_path_str)
            if prefs_path.is_file():
                break
            print(f"File not found at '{prefs_path_str}'. Please enter a valid path.")

        prefs_content = prefs_path.read_text(encoding="utf-8")
        await create_or_update_secret(self.project_id, "job-scraper-prefs", prefs_content)

    def _print_summary(self) -> None:
        print_header("Update Summary")
        print("The selected configuration has been updated.")
