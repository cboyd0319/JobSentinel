#!/usr/bin/env python3
"""
First-run validation script to check for common user issues.

This simulates a completely fresh installation to identify potential problems.
"""

import sys
import os
from pathlib import Path

def check_first_run_experience():
    """Simulate first-run experience and check for issues."""
    print("🔍 Simulating First-Run Experience")
    print("=" * 50)
    
    issues = []
    
    # Check 1: Python version
    python_version = sys.version_info
    if python_version < (3, 8):
        issues.append(f"❌ Python version {python_version.major}.{python_version.minor} too old (need 3.8+)")
    else:
        print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Check 2: Required directories exist or can be created
    required_dirs = ['config', 'data', 'data/logs', 'data/cache']
    for dir_path in required_dirs:
        path = Path(dir_path)
        if not path.exists():
            try:
                path.mkdir(parents=True, exist_ok=True)
                print(f"✅ Created directory: {dir_path}")
            except Exception as e:
                issues.append(f"❌ Cannot create {dir_path}: {e}")
        else:
            print(f"✅ Directory exists: {dir_path}")
    
    # Check 3: Configuration files
    config_example = Path('config/user_prefs.example.json')
    config_actual = Path('config/user_prefs.json')
    
    if not config_example.exists():
        issues.append("❌ Missing config/user_prefs.example.json")
    else:
        print("✅ Example configuration exists")
        
    if not config_actual.exists():
        print("⚠️  User configuration missing (expected for first run)")
        print("   → User needs to: cp config/user_prefs.example.json config/user_prefs.json")
    else:
        print("✅ User configuration exists")
    
    # Check 4: .env file setup
    env_example = Path('.env.example')
    env_actual = Path('.env')
    
    if not env_example.exists():
        issues.append("❌ Missing .env.example")
    else:
        print("✅ .env.example exists")
        
    if not env_actual.exists():
        print("⚠️  .env file missing (expected for first run)")
        print("   → User needs to copy .env.example to .env and configure")
    else:
        print("✅ .env file exists")
    
    # Check 5: Import critical modules
    sys.path.append('.')
    
    critical_modules = [
        ('utils.config', 'Configuration manager'),
        ('src.database', 'Database layer'),
        ('notify.slack', 'Slack notifications'),
        ('sources.concurrent_scraper', 'Job scraper'),
        ('scripts.slack_bootstrap', 'Slack setup wizard')
    ]
    
    for module_name, description in critical_modules:
        try:
            __import__(module_name)
            print(f"✅ {description}")
        except ImportError as e:
            issues.append(f"❌ Cannot import {module_name}: {e}")
        except Exception as e:
            print(f"⚠️  {description} import warning: {e}")
    
    # Check 6: Write permissions
    test_file = Path('data/test_write.tmp')
    try:
        test_file.write_text("test")
        test_file.unlink()
        print("✅ Write permissions OK")
    except Exception as e:
        issues.append(f"❌ Cannot write to data directory: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    if issues:
        print("❌ ISSUES FOUND:")
        for issue in issues:
            print(f"   {issue}")
        print(f"\n🔧 Fix these {len(issues)} issues before proceeding")
        return False
    else:
        print("✅ ALL CHECKS PASSED")
        print("🚀 System ready for first run!")
        return True

if __name__ == "__main__":
    success = check_first_run_experience()
    sys.exit(0 if success else 1)