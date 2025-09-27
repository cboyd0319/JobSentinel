# Releases (simple)

I use tags to create releases. Keep it simple and frequent.

Versioning
- SemVer: MAJOR.MINOR.PATCH
- Bump PATCH for fixes, MINOR for features, MAJOR for breaking changes

Create a release

```bash
git tag v1.0.1
git push origin v1.0.1
```

This triggers the GitHub workflow to draft a release and attach basic assets. You can also trigger it from Actions manually.

Notes
- Keep commit messages clear — they help auto-generate notes
- Document breaking changes in the PR/release body

Hotfixes
- Make a small branch, fix, test, tag a new patch, push the tag

Check version at runtime

```bash
python agent.py --version
```