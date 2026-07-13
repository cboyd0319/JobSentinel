import { readFileSync } from "node:fs";
import { join } from "node:path";
import { salaryAudienceExamplePaths } from "./broad-audience-fixture-paths.mjs";

export function hasSalaryAudienceExampleDrift(root, path) {
  if (!salaryAudienceExamplePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (
    path === "crates/jobsentinel-core/src/core/salary/benchmarks.rs" ||
    path === "crates/jobsentinel-core/src/core/salary/negotiation.rs"
  ) {
    const salaryLocationPatterns = [
      /location:\s*["']San Francisco,\s*CA["']/i,
      /location:\s*["']Seattle,\s*WA["']/i,
      /location:\s*["']Austin,\s*TX["']/i,
      /"San Francisco,\s*CA"\.to_string\(\)/i,
      /"Seattle,\s*WA"\.to_string\(\)/i,
      /"Austin,\s*TX"\.to_string\(\)/i,
      /assert_eq!\([^,]+,\s*["']San Francisco,\s*CA["']\)/i,
      /assert_eq!\([^,]+,\s*["']Seattle,\s*WA["']\)/i,
      /assert_eq!\([^,]+,\s*["']Austin,\s*TX["']\)/i,
    ];

    if (salaryLocationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "crates/jobsentinel-core/src/core/salary/predictor.rs") {
    const predictorPatterns = [
      /insert_test_job\([^)]*["'](?:Junior Developer|Staff Engineer|Principal Engineer|Backend Engineer|DevOps Engineer|ML Engineer)["']/i,
      /predictor\.normalize_title\(["'](?:DevOps Engineer|Machine Learning Engineer|Frontend Developer|C\+\+ Developer|ML\/AI Engineer)["']\)/i,
    ];

    return predictorPatterns.some((pattern) => pattern.test(text));
  }

  const salaryModuleTestPatterns = [
    /SeniorityLevel::from_job_title\(["']Software Architect["']\)/,
    /SeniorityLevel::from_job_title\(["'](?:Junior Software Engineer|Senior Software Engineer|Staff Engineer|Principal Engineer|Principal Software Engineer|Distinguished Engineer|Senior Engineer|Sr\. Developer|Lead Engineer|Junior Developer|Jr\. Software Engineer|Associate Engineer|Backend Developer|SENIOR SOFTWARE ENGINEER|principal engineer|StAfF EnGiNeEr|Principal Engineér|Júnior Developer|Principal Staff Engineer|Staff Senior Engineer)["']\)/,
    /analyzer\.normalize_job_title\(["'](?:DevOps Engineer|Jr\. Developer)["']\)/,
    /analyzer\.normalize_job_title\(["']Software\s{2,}Engineer["']\)/,
  ];

  return salaryModuleTestPatterns.some((pattern) => pattern.test(text));
}
