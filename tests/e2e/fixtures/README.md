# Test Fixtures

This directory contains test fixtures for E2E tests.

## Files Needed

To run resume upload tests, add the following files:

- `sample-resume.pdf` - Valid PDF resume for upload tests
- `sample-resume.docx` - Valid DOCX resume for upload tests
- `invalid.txt` - Invalid file type for error handling tests
- `large-resume.pdf` - Resume larger than size limit (>10MB) for error handling tests
- `corrupted.pdf` - Corrupted PDF file for error handling tests

## Creating Fixtures

### Sample Resume (PDF)

```bash
# Create a simple PDF resume
echo "Sample Resume" | ps2pdf - sample-resume.pdf
```

### Sample Resume (DOCX)

Create a simple Word document with resume content and save as `sample-resume.docx`.

### Invalid File

```bash
echo "This is not a resume" > invalid.txt
```

### Large File

```bash
# Create a 15MB file
dd if=/dev/zero of=large-resume.pdf bs=1M count=15
```

### Corrupted PDF

```bash
# Create a corrupted PDF
echo "Not a real PDF" > corrupted.pdf
```

## Notes

- Tests will skip gracefully if fixture files are missing
- Fixtures are not committed to Git (see .gitignore)
- Add real resume samples for more thorough testing
