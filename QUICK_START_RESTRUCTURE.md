# Quick Start - After Restructure

**Last Updated:** 2025-10-09 (Phase 1 Complete)

---

## Installation (NEW)

### Basic Installation
```bash
# From project root
pip install -e .
```

### Development Setup
```bash
# Install with dev tools (recommended)
pip install -e .[dev,resume,mcp]

# Install pre-commit hooks
pre-commit install

# Verify setup
pre-commit run --all-files
```

### Python Version
**Requirement:** Python 3.11+
**Recommended:** Python 3.13 (Windows 11 compatible)

---

## Daily Workflow

### Before Committing
```bash
# Format code
black .

# Lint
ruff check .

# Type check (strict for jsa/)
mypy src/jsa

# Run tests
pytest tests/unit_jsa -q

# Or use pre-commit (runs all)
pre-commit run --all-files
```

### Running the Agent
```bash
# Dry run
python src/agent.py --dry-run

# Real run
python src/agent.py

# Background daemon
nohup python src/agent.py --daemon &
```

### Using Web UI
```bash
# New CLI (typed core)
jsa web --port 5000

# Or directly
python src/web_ui.py
```

---

## What Changed (Phase 1)

### Configuration
- ✅ **Use:** `pyproject.toml` (root)
- ❌ **Don't use:** `requirements.txt`, `config/pyproject.toml`

### Installation
- ✅ **Use:** `pip install -e .[dev,resume,mcp]`
- ❌ **Don't use:** `pip install -r requirements.txt`

### Structure
```
NEW:
├── pyproject.toml          # CANONICAL config
├── archive/                # Deprecated files (reversible)
│   ├── old_configs/
│   └── legacy/
└── docs/
    ├── RESTRUCTURE_ANALYSIS.md
    ├── RESTRUCTURE_ROADMAP.md
    └── ...
```

---

## Quick Commands

### Install
```bash
pip install -e .[dev,resume,mcp]  # Full dev setup
```

### Format & Lint
```bash
make fmt      # black formatter
make lint     # ruff linter
make type     # mypy strict
```

### Test
```bash
make test-core    # jsa core tests
make test         # all tests
make cov          # with coverage
```

### Clean
```bash
make clean        # remove caches/build
```

---

## Troubleshooting

### "Module not found" errors
```bash
# Reinstall in editable mode
pip install -e .[dev,resume]
```

### Pre-commit fails
```bash
# Update hooks
pre-commit autoupdate

# Skip a specific hook temporarily
SKIP=mypy git commit -m "message"
```

### Type errors in legacy code
**Expected!** Strict typing only enforced on `src/jsa/`.
Legacy code (`utils/`, `sources/`) has relaxed type checking.

### "Requirements.txt is empty"
**By design!** Now use:
```bash
pip install -e .[dev,resume,mcp]
```

---

## What's NOT Done Yet

Phase 1 cleaned up configuration and build artifacts. Still TODO:

### High Priority
- Database consolidation (3 files → 1 module)
- Fix ~50 ruff violations
- Type hints for legacy code

### Medium Priority
- Split large files (>500 lines)
- Reorganize utils/
- Comprehensive test suite

### Low Priority
- Mutation testing
- API documentation
- Advanced CI/CD

**See:** `docs/RESTRUCTURE_ROADMAP.md` for details

---

## Need Help?

1. **Quick overview:** `RESTRUCTURE_SUMMARY.md`
2. **Full analysis:** `docs/RESTRUCTURE_ANALYSIS.md`
3. **Next steps:** `docs/RESTRUCTURE_ROADMAP.md`
4. **Existing docs:** `README.md`, `docs/ARCHITECTURE.md`

---

## One-Liner Setup (Copy-Paste)

```bash
# Clean install with dev tools
pip install -e .[dev,resume,mcp] && pre-commit install && pre-commit run --all-files
```

**Expected:** All hooks should pass (or show fixable issues)

---

## Key Files

| File | Purpose |
|------|---------|
| `pyproject.toml` | All config (deps, tools, metadata) |
| `.gitignore` | Comprehensive ignore patterns |
| `.pre-commit-config.yaml` | Quality gate hooks |
| `Makefile` | Convenient shortcuts |
| `src/jsa/` | New typed core (strict) |
| `utils/` | Legacy utilities (relaxed) |
| `archive/` | Deprecated files (reversible) |

---

## Status Check

```bash
# Verify clean state
find . -name "__pycache__" -not -path "./.venv/*" | wc -l  # Should be 0

# Verify single config
find . -name "pyproject.toml" -not -path "./.venv/*"  # Should be 1 (root)

# Run quality checks
pre-commit run --all-files

# Run tests
pytest tests/unit_jsa -q
```

---

**Phase 1 Complete ✅ | Ready for Phase 2 🚀**
