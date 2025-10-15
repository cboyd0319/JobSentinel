# JobSentinel Common Application Code

This directory contains the **complete JobSentinel application** - all code, assets, and resources shared across all deployment platforms (Windows, macOS, Linux, Cloud).

## 📁 Directory Structure

```
deploy/common/
├── app/                    # Core application code
│   ├── src/               # Main source code (Python)
│   ├── models/            # Data models
│   ├── sources/           # Job board scrapers
│   └── utils/             # Shared utilities
├── web/                    # Web interface
│   ├── frontend/          # React/Vite frontend
│   ├── static/            # Static assets (CSS, JS, images)
│   └── templates/         # HTML templates (Flask/Jinja2)
├── config/                 # Configuration files
│   ├── user_prefs.example.json
│   ├── user_prefs.schema.json
│   ├── skills_taxonomy_v1.json
│   └── resume_parser.json
├── tests/                  # Test suite
│   ├── unit/              # Unit tests
│   ├── unit_jsa/          # Tests for src/jsa
│   └── smoke/             # Smoke tests
├── scripts/                # Operational scripts
│   ├── setup_wizard.py
│   ├── install.py
│   └── ...
├── examples/               # Example code and demos
│   ├── fixtures/          # Test fixtures
│   └── *.py               # Demo scripts
├── extensions/             # Browser extensions
│   └── browser/           # Chrome/Firefox extension
├── constraints/            # Dependency constraints
└── launcher_gui.py         # Cross-platform GUI launcher
```

## 🎯 Key Components

### 1. Core Application (`app/`)

**`app/src/`** - Main source code
- `jsa/` - Core application (CLI, web, database)
- `domains/` - Domain logic (ATS, ML, LLM, resume analysis)
- `sources/` - Job board integrations
- `notify/` - Alert systems (Slack, email)
- `matchers/` - Job scoring algorithms

**`app/models/`** - Data models and schemas

**`app/sources/`** - Job board scrapers (Greenhouse, Lever, Reed, etc.)

**`app/utils/`** - Shared utilities (logging, security, caching)

### 2. Web Interface (`web/`)

**`web/frontend/`** - Modern React/Vite UI
- TypeScript
- Tailwind CSS
- Real-time updates
- Responsive design

**`web/static/`** - Static assets
- CSS stylesheets
- JavaScript files
- Images and fonts

**`web/templates/`** - Server-side templates
- Jinja2 templates for Flask
- Base layouts
- Component templates

### 3. Configuration (`config/`)

- **`user_prefs.example.json`** - Template configuration
- **`user_prefs.schema.json`** - JSON schema validation
- **`skills_taxonomy_v1.json`** - Skills database
- **`resume_parser.json`** - Resume analysis configuration

### 4. Tests (`tests/`)

Comprehensive test suite with 85%+ coverage:
- **Unit tests** - Isolated component tests
- **Integration tests** - Multi-component tests
- **Smoke tests** - Quick validation tests
- **Property tests** - Generative testing

### 5. Scripts (`scripts/`)

Operational and setup scripts:
- `setup_wizard.py` - Interactive setup
- `install.py` - Automated installation
- `ats_cli.py` - Resume ATS analysis
- `resume_enhancer.py` - Resume optimization
- And more...

### 6. Examples (`examples/`)

Demonstration code and fixtures:
- `ml_and_mcp_demo.py` - ML/MCP features
- `detection_and_autofix_demo.py` - Scam detection + auto-fix
- `fixtures/` - Test data for scrapers

### 7. Extensions (`extensions/`)

Browser extensions for enhanced functionality:
- Chrome/Firefox extension
- Job board integration
- One-click applications

## 🚀 Usage

### Running from Common Directory

The application can be run directly from this location:

```bash
# From project root
cd /path/to/JobSentinel

# Run CLI (adjust paths in deployment scripts)
python -m deploy.common.app.src.jsa.cli run-once

# Or use platform-specific wrappers in deploy/local/{platform}/
```

### Platform-Specific Wrappers

Each deployment platform has wrapper scripts that reference this code:

**Windows:** `deploy/local/windows/launch-gui.ps1`
```powershell
python ../../common/launcher_gui.py
```

**macOS:** `deploy/local/macos/launch-gui.sh`
```bash
python ../../common/launcher_gui.py
```

**Cloud:** Docker containers mount this directory

## 🔧 Development

### Installing Dependencies

From project root:

```bash
# Install in development mode
pip install -e .

# With extras (resume analysis, ML features)
pip install -e ".[resume,ml,mcp]"
```

### Running Tests

```bash
# All tests
pytest deploy/common/tests/

# Specific test suite
pytest deploy/common/tests/unit/
pytest deploy/common/tests/unit_jsa/

# With coverage
pytest deploy/common/tests/ --cov=deploy/common/app/src --cov-report=term-missing
```

### Code Quality

```bash
# Format code
black deploy/common/app/

# Lint
ruff check deploy/common/app/

# Type check
mypy deploy/common/app/src/jsa/
```

## 📦 Architecture Principles

This directory follows these design principles:

### 1. **Platform Agnostic**
All code works on Windows, macOS, and Linux without modification.

```python
# ✅ Good: Cross-platform paths
from pathlib import Path
config_path = Path(__file__).parent / "config" / "user_prefs.json"

# ❌ Bad: Platform-specific paths
config_path = "C:\\Users\\config\\user_prefs.json"  # Windows only
```

### 2. **Single Source of Truth**
The code here is the **only copy**. Platform-specific deployments reference it, never duplicate it.

### 3. **Separation of Concerns**
- **Application code** (here) is separate from **deployment scripts** (`deploy/local/`, `deploy/cloud/`)
- Configuration is in `config/`, not hardcoded
- Tests are comprehensive and isolated

### 4. **Dependency Injection**
Services are injected rather than using global state.

```python
# ✅ Good: Dependency injection
def analyze_resume(resume_text: str, config: ResumeConfig) -> Score:
    analyzer = ResumeAnalyzer(config)
    return analyzer.analyze(resume_text)

# ❌ Bad: Global state
def analyze_resume(resume_text: str) -> Score:
    global_config = load_global_config()  # Hidden dependency
    ...
```

### 5. **Explicit Error Handling**
No silent failures. All errors are explicit and informative.

## 🔐 Security

Security-critical resources in this directory:

- **No secrets committed** - Use environment variables or `.env`
- **Input validation** - All external data validated
- **Dependency pinning** - Exact versions in constraints
- **Security scanning** - Regular audits with Bandit

## 📚 Documentation

For detailed information:

- **Architecture:** `../../docs/ARCHITECTURE.md`
- **API Integration:** `../../docs/API_INTEGRATION_GUIDE.md`
- **Best Practices:** `../../docs/BEST_PRACTICES.md`
- **Development:** `../../docs/development/README.md`

## 🤝 Contributing

When adding code to this directory:

### Do ✅
- Use `pathlib.Path` for cross-platform paths
- Add type hints to all public functions
- Write tests for new features (85%+ coverage)
- Update documentation
- Follow PEP 8 style guide (Black formatted)
- Handle errors explicitly
- Test on all target platforms

### Don't ❌
- Use Windows-only APIs (e.g., `winreg`)
- Use Unix-only features (e.g., `fork`)
- Hardcode paths with `/` or `\`
- Assume bash/PowerShell availability
- Add platform-specific code (put in deployment scripts)
- Commit secrets or API keys
- Use global state

## 🔄 Migration Notes

**October 14, 2025:** Major reorganization completed
- Moved all application code from project root to `deploy/common/`
- Organized into logical subdirectories (`app/`, `web/`, `config/`, etc.)
- Maintained backward compatibility with existing imports
- Updated all documentation references

**Impact on existing code:**
- Import paths remain unchanged (Python's import system handles this)
- Deployment scripts updated to reference new locations
- No breaking changes to user-facing APIs

## 🆘 Support

- [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
- [Documentation Index](../../docs/DOCUMENTATION_INDEX.md)
- [Contributing Guide](../../CONTRIBUTING.md)

---

**Purpose:** Complete application codebase shared across all platforms  
**Last Updated:** October 14, 2025  
**Maintained By:** Core Team (@cboyd0319)

**Note:** This directory contains the **actual application**. The platform-specific directories (`deploy/local/*`, `deploy/cloud/*`) contain only deployment scripts that reference this code.
