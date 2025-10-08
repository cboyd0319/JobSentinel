# Convenience Makefile (Alpha)
# Targets assume virtual environment is already active (or rely on `python` on PATH).

.PHONY: help install dev test test-fast test-all lint type analyze clean

help:
	@echo 'Common targets:'
	@echo '  make install     - Install core package editable'
	@echo '  make dev         - Install with dev & resume extras'
	@echo '  make test        - Run full test suite (core only)'
	@echo '  make test-fast   - Run core fast tests (alias of test)'
	@echo '  make test-all    - Run full + optional example tests (RUN_EXAMPLE_TESTS=1)'
	@echo '  make lint        - Ruff lint check'
	@echo '  make type        - mypy type check (subset)'
	@echo '  make analyze     - Run sample ATS analysis (examples/sample_resume.txt)' 
	@echo '  make clean       - Remove caches/build artifacts'

install:
	pip install -e .

dev:
	pip install -e .[dev,resume]

PYTHON?=python

test:
	$(PYTHON) -m pytest -q tests

test-fast: test

test-all:
	RUN_EXAMPLE_TESTS=1 $(PYTHON) -m pytest -q tests

lint:
	ruff check .

type:
	mypy utils/ats_analyzer.py scripts/ats_cli.py || true

analyze:
	python scripts/ats_cli.py scan --resume examples/sample_resume.txt || echo 'Provide sample resume at examples/sample_resume.txt'

clean:
	rm -rf .mypy_cache .pytest_cache build dist *.egg-info
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +

# PowerShell Quality Assurance - Use dedicated QA system
# Run: make -C qa help (for QA commands)
.PHONY: qa-help qa-analyze qa-fix qa-report qa-setup

qa-help:
	@echo "PowerShell QA System - Use dedicated commands:"
	@echo "  make -C qa setup     - Setup QA system"
	@echo "  make -C qa analyze   - Analyze PowerShell code"
	@echo "  make -C qa fix       - Auto-fix issues"
	@echo "  make -C qa report    - Generate reports"
	@echo "  make -C qa all       - Complete QA pipeline"
	@echo "  make -C qa help      - Full QA command list"

qa-analyze:
	@make -C qa analyze

qa-fix:
	@make -C qa fix

qa-report:
	@make -C qa report

qa-setup:
	@make -C qa setup

# Pre-commit integration
.PHONY: precommit-install precommit-run precommit-powershell

precommit-install:
	@echo "Installing pre-commit hooks..."
	pre-commit install
	@echo "Pre-commit hooks installed!"

precommit-run:
	@echo "Running all pre-commit hooks..."
	pre-commit run --all-files

precommit-powershell:
	@echo "Running PowerShell QA pre-commit hook..."
	./scripts/precommit-powershell-qa.sh

