#!/usr/bin/env python3
"""
Validate GitHub Actions Workflows

This script validates all workflow YAML files for:
- YAML syntax correctness
- Required fields (concurrency, timeout)
- Security best practices
- Naming conventions

Usage:
    python .github/scripts/validate-workflows.py
"""

import sys
from pathlib import Path
from typing import Dict, List, Tuple

try:
    import yaml
except ImportError:
    print("❌ PyYAML not installed. Run: pip install pyyaml")
    sys.exit(1)


class WorkflowValidator:
    """Validates GitHub Actions workflow files."""

    def __init__(self, workflows_dir: Path):
        self.workflows_dir = workflows_dir
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate_all(self) -> bool:
        """Validate all workflow files."""
        workflow_files = sorted(self.workflows_dir.glob("*.yml"))

        if not workflow_files:
            self.errors.append(f"No workflow files found in {self.workflows_dir}")
            return False

        print(f"🔍 Validating {len(workflow_files)} workflow files...\n")

        all_valid = True
        for wf_file in workflow_files:
            if not self._validate_workflow(wf_file):
                all_valid = False

        return all_valid

    def _validate_workflow(self, wf_file: Path) -> bool:
        """Validate a single workflow file."""
        print(f"📄 {wf_file.name}")

        # Load YAML
        try:
            with open(wf_file) as f:
                workflow = yaml.safe_load(f)
        except yaml.YAMLError as e:
            error = f"{wf_file.name}: YAML syntax error: {e}"
            self.errors.append(error)
            print(f"  ❌ YAML syntax error")
            return False

        if not workflow:
            error = f"{wf_file.name}: Empty workflow file"
            self.errors.append(error)
            print(f"  ❌ Empty file")
            return False

        # Validate structure
        is_valid = True
        is_valid &= self._check_name(wf_file, workflow)
        is_valid &= self._check_triggers(wf_file, workflow)
        is_valid &= self._check_permissions(wf_file, workflow)
        is_valid &= self._check_concurrency(wf_file, workflow)
        is_valid &= self._check_jobs(wf_file, workflow)

        if is_valid:
            print(f"  ✅ Valid")
        print()

        return is_valid

    def _check_name(self, wf_file: Path, workflow: Dict) -> bool:
        """Check workflow has a name."""
        if "name" not in workflow:
            warning = f"{wf_file.name}: Missing 'name' field"
            self.warnings.append(warning)
            print(f"  ⚠️  No name")
            return True  # Warning, not error
        print(f"  ✓ Name: {workflow['name']}")
        return True

    def _check_triggers(self, wf_file: Path, workflow: Dict) -> bool:
        """Check workflow has valid triggers."""
        # YAML can use 'on' or 'true' (when on: is parsed)
        on_config = workflow.get("on") or workflow.get(True)
        
        if not on_config:
            error = f"{wf_file.name}: Missing 'on' triggers"
            self.errors.append(error)
            print(f"  ❌ No triggers")
            return False

        if isinstance(on_config, str):
            triggers = [on_config]
        elif isinstance(on_config, dict):
            triggers = list(on_config.keys())
        elif isinstance(on_config, list):
            triggers = on_config
        else:
            triggers = [str(on_config)]

        print(f"  ✓ Triggers: {', '.join(str(t) for t in triggers)}")
        return True

    def _check_permissions(self, wf_file: Path, workflow: Dict) -> bool:
        """Check workflow has explicit permissions."""
        if "permissions" not in workflow:
            warning = f"{wf_file.name}: No explicit permissions (uses defaults)"
            self.warnings.append(warning)
            print(f"  ⚠️  No explicit permissions")
            return True  # Warning, not error

        print(f"  ✓ Permissions defined")
        return True

    def _check_concurrency(self, wf_file: Path, workflow: Dict) -> bool:
        """Check workflow has concurrency control."""
        if "concurrency" not in workflow:
            warning = f"{wf_file.name}: No concurrency control"
            self.warnings.append(warning)
            print(f"  ⚠️  No concurrency control")
            return True  # Warning for now, could be error

        concurrency = workflow["concurrency"]
        if isinstance(concurrency, dict):
            group = concurrency.get("group", "")
            cancel = concurrency.get("cancel-in-progress", False)
            print(f"  ✓ Concurrency: cancel-in-progress={cancel}")
        else:
            print(f"  ✓ Concurrency: {concurrency}")

        return True

    def _check_jobs(self, wf_file: Path, workflow: Dict) -> bool:
        """Check workflow jobs have timeouts and proper configuration."""
        if "jobs" not in workflow:
            error = f"{wf_file.name}: No jobs defined"
            self.errors.append(error)
            print(f"  ❌ No jobs")
            return False

        jobs = workflow["jobs"]
        all_valid = True

        for job_name, job_config in jobs.items():
            if not isinstance(job_config, dict):
                continue

            # Check timeout
            if "timeout-minutes" not in job_config:
                warning = f"{wf_file.name}: Job '{job_name}' has no timeout"
                self.warnings.append(warning)
                print(f"  ⚠️  Job '{job_name}': no timeout")
                # Not setting all_valid = False since it's a warning

        print(f"  ✓ Jobs: {len(jobs)}")
        return all_valid

    def print_summary(self, all_valid: bool) -> None:
        """Print validation summary."""
        print("=" * 70)
        print("VALIDATION SUMMARY")
        print("=" * 70)

        if self.errors:
            print(f"\n❌ Errors ({len(self.errors)}):")
            for error in self.errors:
                print(f"  - {error}")

        if self.warnings:
            print(f"\n⚠️  Warnings ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  - {warning}")

        if not self.errors and not self.warnings:
            print("\n✅ All workflows are valid with no warnings!")
        elif all_valid:
            print(f"\n✅ All workflows are valid ({len(self.warnings)} warnings)")
        else:
            print(f"\n❌ Validation failed ({len(self.errors)} errors)")


def main() -> int:
    """Main entry point."""
    # Find workflows directory
    repo_root = Path(__file__).parent.parent.parent
    workflows_dir = repo_root / ".github" / "workflows"

    if not workflows_dir.exists():
        print(f"❌ Workflows directory not found: {workflows_dir}")
        return 1

    # Validate
    validator = WorkflowValidator(workflows_dir)
    all_valid = validator.validate_all()
    validator.print_summary(all_valid)

    return 0 if all_valid else 1


if __name__ == "__main__":
    sys.exit(main())
