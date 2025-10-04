#!/usr/bin/env python3
"""Environment & project diagnostics (Alpha).

Provides a quick health report for zero-knowledge users to verify setup:
- Python version & platform
- Core vs optional dependency availability
- Writable directories
- Key config files presence
- Taxonomy + parser resource detection

Usage:
  python scripts/diagnostics.py
  python scripts/diagnostics.py --json
"""
from __future__ import annotations
import sys, json, importlib, platform, shutil
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Dict, Any

CORE_MODULES = [
    'aiohttp', 'requests', 'sqlmodel', 'pydantic', 'playwright'
]
OPTIONAL_RESUME = [
    'pdfplumber', 'docx', 'spacy', 'rapidfuzz'
]
CONFIG_FILES = [
    'config/resume_parser.json',
    'config/skills_taxonomy.json',
    'config/skills_taxonomy_v1.json'
]
WRITE_DIRS = [
    'data/cache', 'data/logs'
]

@dataclass
class Section:
    name: str
    status: str
    details: Dict[str, Any]


def _probe_module(name: str) -> bool:
    try:
        importlib.import_module(name)
        return True
    except Exception:
        return False


def gather() -> List[Section]:
    sections: List[Section] = []

    # Runtime
    sections.append(Section(
        name='runtime',
        status='ok',
        details={
            'python_version': sys.version.split()[0],
            'platform': platform.platform(),
            'executable': sys.executable,
        }
    ))

    # Core deps
    core_status = {m: _probe_module(m) for m in CORE_MODULES}
    sections.append(Section(
        name='core_dependencies',
        status='ok' if all(core_status.values()) else 'partial',
        details=core_status
    ))

    # Optional resume deps
    opt_status = {m: _probe_module(m) for m in OPTIONAL_RESUME}
    sections.append(Section(
        name='optional_resume_dependencies',
        status='ok' if opt_status else 'n/a',
        details=opt_status
    ))

    # Config files
    cfg_details = {}
    for cf in CONFIG_FILES:
        p = Path(cf)
        cfg_details[cf] = p.exists()
    sections.append(Section(
        name='config_files',
        status='ok',
        details=cfg_details
    ))

    # Writable dirs
    dir_details = {}
    for d in WRITE_DIRS:
        p = Path(d)
        p.mkdir(parents=True, exist_ok=True)
        test_file = p / '.write_test'
        try:
            test_file.write_text('ok', encoding='utf-8')
            dir_details[d] = 'writable'
        except Exception as e:
            dir_details[d] = f'error: {e}'
        finally:
            if test_file.exists():
                try: test_file.unlink()
                except Exception: pass
    sections.append(Section(
        name='storage_permissions',
        status='ok' if all(v == 'writable' for v in dir_details.values()) else 'partial',
        details=dir_details
    ))

    # Playwright browsers (optional sanity)
    pw_browsers = 'not installed'
    if _probe_module('playwright'):  # approximate
        pw_cache = Path.home() / 'Library' / 'Caches' / 'ms-playwright'
        if pw_cache.exists():
            pw_browsers = ','.join(p.name for p in pw_cache.iterdir() if p.is_dir()) or 'installed (unknown)'
        else:
            pw_browsers = 'missing (run: playwright install)'
    sections.append(Section(
        name='playwright',
        status='ok',
        details={'browsers': pw_browsers}
    ))

    return sections


def main(argv: list[str]) -> int:
    json_mode = '--json' in argv
    sections = gather()
    if json_mode:
        print(json.dumps([asdict(s) for s in sections], indent=2))
        return 0

    print("Environment Diagnostics:\n")
    for s in sections:
        print(f"[{s.name}] status={s.status}")
        for k, v in s.details.items():
            print(f"  - {k}: {v}")
        print()

    print("Alpha disclaimer: absence of optional modules limits certain features (e.g., PDF or fuzzy analysis).")
    return 0

if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
