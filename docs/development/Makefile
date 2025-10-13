# Convenience Makefile (Alpha)
# Targets assume virtual environment is already active (or rely on `python` on PATH).

.PHONY: help install dev test test-core test-fast test-all lint type analyze clean fmt cov mut security

help:
	@echo 'Common targets:'
	@echo '  make install     - Install core package editable'
	@echo '  make dev         - Install with dev & resume extras'
	@echo '  make test        - Run full test suite'
	@echo '  make test-core   - Run tests for new core (src/jsa)'
	@echo '  make test-fast   - Alias of test'
	@echo '  make test-all    - Run full + optional example tests (RUN_EXAMPLE_TESTS=1)'
	@echo '  make lint        - Ruff lint (src/jsa, tests/unit_jsa)'
	@echo '  make type        - mypy type check (src/jsa)'
	@echo '  make fmt         - Run black formatter'
	@echo '  make cov         - Coverage for src/jsa (fail-under=85)'
	@echo '  make mut         - Run mutation tests (if mutmut installed)'
	@echo '  make security    - Run PyGuard security & quality checks'
	@echo '  make analyze     - Run sample ATS analysis (examples/sample_resume.txt)' 
	@echo '  make clean       - Remove caches/build artifacts'

install:
	pip install -e .

dev:
	pip install -e .[dev,resume]

PYTHON?=python

test:
	$(PYTHON) -m pytest -q tests

test-core:
	$(PYTHON) -m pytest -q tests/unit_jsa

test-fast: test

test-all:
	RUN_EXAMPLE_TESTS=1 $(PYTHON) -m pytest -q tests

lint:
	ruff check src/jsa tests/unit_jsa

type:
	mypy

fmt:
	black .

cov:
	pytest --cov=src/jsa --cov-report=term-missing --cov-fail-under=85

mut:
	@if command -v mutmut >/dev/null 2>&1; then \
	  mutmut run --paths-to-mutate src/jsa --tests-dir tests; \
	else \
	  echo 'mutmut not installed; install with: pip install mutmut'; \
	fi

security:
	@echo "Running PyGuard security scan..."
	@if command -v pyguard >/dev/null 2>&1; then \
	  for file in src/jsa/*.py; do \
	    echo "Scanning $$file..."; \
	    pyguard "$$file" --scan-only 2>&1 | grep -E "(Perfect|issues found|Security issues)" || true; \
	  done; \
	else \
	  echo 'PyGuard not installed; install with: pip install pyguard'; \
	fi

analyze:
	python scripts/ats_cli.py scan --resume examples/sample_resume.txt || echo 'Provide sample resume at examples/sample_resume.txt'

clean:
	rm -rf .mypy_cache .pytest_cache build dist *.egg-info
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +

# Pre-commit integration
.PHONY: precommit-install precommit-run

precommit-install:
	@echo "Installing pre-commit hooks..."
	pre-commit install
	@echo "Pre-commit hooks installed!"

precommit-run:
	@echo "Running all pre-commit hooks..."
	pre-commit run --all-files
