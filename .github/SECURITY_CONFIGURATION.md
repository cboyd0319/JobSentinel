# Security Configuration Checklist

This document tracks security settings that need to be configured in GitHub repository settings to address Prowler CIS benchmark findings.

## ✅ Completed via Code/Files
- [x] CODEOWNERS file created
- [x] SECURITY.md exists (Security policy enabled)

## 🔧 Manual Repository Settings Required

### Branch Protection Rules (Critical)
Navigate to: **Settings > Branches > Add rule** for `main` branch:

- [x] **Branch name pattern**: `main`
- [ ] **Restrict pushes that create files**
- [ ] **Require a pull request before merging**
  - [ ] **Require approvals**: 2
  - [ ] **Require review from code owners**
  - [ ] **Restrict pushes that create files**
- [ ] **Require status checks to pass before merging**
  - [ ] **Require branches to be up to date before merging**
  - [ ] **Status checks**: Add security workflow checks
- [ ] **Require conversation resolution before merging**
- [ ] **Require signed commits**
- [ ] **Require linear history**
- [ ] **Include administrators** (enforce for admins)
- [ ] **Restrict pushes** (no direct pushes)
- [ ] **Allow force pushes**: ❌ Disabled
- [ ] **Allow deletions**: ❌ Disabled

### Repository Settings
Navigate to: **Settings > General**:

- [ ] **Default branch deletion**: ❌ Disabled
- [x] **Automatically delete head branches**: ✅ Enable
- [ ] **Merge button**: Configure merge options

### Security Features
Navigate to: **Settings > Security & analysis**:

- [ ] **Dependency alerts**: ✅ Enable
- [ ] **Dependabot security updates**: ✅ Enable
- [ ] **Secret scanning**: ✅ Enable
- [ ] **Push protection**: ✅ Enable

### Additional Security Settings
- [ ] **Deploy keys**: Review and remove unused keys
- [ ] **Secrets**: Audit repository secrets
- [ ] **Environments**: Configure branch protection for deployments

## 🔄 Actions Required

1. **Enable branch protection** with all security rules
2. **Enable security features** (secret scanning, vulnerability alerts)
3. **Configure merge settings** (delete branches on merge)
4. **Review and audit** existing access permissions

## 📊 Compliance Status

After implementing all settings above, this repository will be compliant with:
- CIS GitHub Benchmark v1.0
- GitHub Security Best Practices
- Branch protection requirements
- Code review requirements