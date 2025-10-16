# GitHub Actions Version Reference

**Last Updated:** October 15, 2025

This file documents the standardized GitHub Actions versions used across all workflows in this repository. All actions are pinned to **commit SHAs** for maximum security and determinism per [GitHub Security Hardening Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions).

## 📌 Pinned Action Versions

### Core Actions
```yaml
actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0
actions/setup-python@e797f83bcb11b83ae66e0230d6156d7c80228e7c # v6.0.0  
actions/setup-node@2028fbc5c25fe9cf00d9f06a71cc4710d4507903 # v6.0.0
actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830 # v4.3.0
actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
codecov/codecov-action@5a1091511ad55cbe89839c7260b706298ca349f7 # v5.5.1
```

### Security & Code Quality
```yaml
github/codeql-action/init@f443b600d91635bebf5b0d9ebc620189c0d6fba5 # v4.30.8
github/codeql-action/analyze@f443b600d91635bebf5b0d9ebc620189c0d6fba5 # v4.30.8
github/codeql-action/upload-sarif@f443b600d91635bebf5b0d9ebc620189c0d6fba5 # v4.30.8
ossf/scorecard-action@62b2cac7ed8198b15735ed49ab1e5cf35480ba46 # v2.4.0
```

### Dependency Management
```yaml
dependabot/fetch-metadata@08eff52bf64351f401fb50d4972fa95b9f2c2d1b # v2.4.0
actions/dependency-review-action@5a2ce3f5b92ee19cbb1541a4984c76d921601d7c # v4.5.0
```

### Documentation & Utilities
```yaml
errata-ai/vale-action@d89dee975228ae261d22c15adcd03578634d429c # v2.1.1
lycheeverse/lychee-action@885c65f3dc543b57c898c8099f4e08c8afd178a2 # v2.6.1
dorny/paths-filter@de90cc6fb38fc0963ad72b210f1f284cd68cea36 # v3.0.2
actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8.0.0
```

## 🔄 Update Process

When Dependabot creates PRs for action updates:

1. **Patch/Minor Updates**: Auto-merged after CI passes
2. **Major Updates**: Require manual review for breaking changes
3. **Security Updates**: Auto-merged immediately regardless of semver

## 🔐 Security Rationale

**Why SHA Pinning?**
- Prevents supply chain attacks via tag manipulation
- Ensures deterministic builds (same SHA = identical code)
- Dependabot automatically updates SHAs with security patches

**Verification:**
```bash
# Verify action integrity
git verify-commit 08c6903cd8c0fde910a37f88322edcfb5dd907a8
```

## 📚 References

- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Dependabot Version Updates](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates)
- [OSSF Scorecard](https://github.com/ossf/scorecard)
