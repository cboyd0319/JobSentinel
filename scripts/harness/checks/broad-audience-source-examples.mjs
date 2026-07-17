import { readFileSync } from "node:fs";
import { join } from "node:path";
import { genericScraperFixturePaths } from "./broad-audience-fixture-paths.mjs";

export function hasBroadAudienceSourceExampleDrift(root, path, text) {
  if (path === "crates/jobsentinel-storage/src/market_intelligence/tests.rs") {
    const marketIntelligenceTestPatterns = [
      /Software Engineer/i,
      /Data Scientist/i,
      /Product Manager/i,
      /TechCorp|BigTech|StartupInc/i,
      /\bRust\b|\bPython\b|\bTypeScript\b/,
      /Figma|Airbnb|B2B SaaS|ML algorithms/i,
    ];

    return marketIntelligenceTestPatterns.some((pattern) => pattern.test(text));
  }

  if (
    path === "crates/jobsentinel-application/src/scoring/mod.rs" ||
    path === "crates/jobsentinel-application/src/scoring/remote.rs"
  ) {
    const scoringLocationFixturePatterns = [
      /create_test_job\(["']Engineer["']/i,
      /Some\(["']San Francisco(?:,\s*CA)?(?:\s*\(Hybrid\))?["']\)/i,
      /Some\(["']New York(?:,\s*NY)?(?:\s*\(Hybrid\))?["']\)/i,
      /job\.location\s*=\s*Some\(["']San Francisco,\s*CA(?:\s*\(Hybrid\))?["']\.to_string\(\)\)/i,
      /job\.location\s*=\s*Some\(["']New York,\s*NY["']\.to_string\(\)\)/i,
    ];

    return scoringLocationFixturePatterns.some((pattern) => pattern.test(text));
  }

  if (path === "crates/jobsentinel-application/src/scoring/synonyms.rs") {
    if (text.includes("job-scoring-synonyms.json")) {
      const taxonomy = JSON.parse(
        readFileSync(
          join(root, "resources/taxonomies/job-scoring-synonyms.json"),
          "utf8",
        ),
      );
      const synonymGroups = Array.isArray(taxonomy.synonymGroups)
        ? taxonomy.synonymGroups
        : [];
      const groupText = synonymGroups.map((group) =>
        Array.isArray(group) ? group.join(" ") : "",
      );
      const broadStartIndex = groupText.findIndex((group) =>
        /Customer Support|Administrative Assistant|Project Coordinator/i.test(
          group,
        ),
      );
      const technicalIndex = groupText.findIndex((group) =>
        /\bPython\b|JavaScript|TypeScript|Kubernetes|AWS/i.test(group),
      );

      return (
        broadStartIndex === -1 ||
        technicalIndex === -1 ||
        technicalIndex < broadStartIndex
      );
    }

    const broadStartIndex = text.indexOf(
      "// Customer, office, and coordination roles",
    );
    const technicalIndex = text.indexOf("// Programming Languages");

    if (
      broadStartIndex === -1 ||
      technicalIndex === -1 ||
      technicalIndex < broadStartIndex
    ) {
      return true;
    }
  }

  if (genericScraperFixturePaths.has(path)) {
    const genericScraperFixturePatterns = [
      /\bEngineer\b/,
      /\bDeveloper\b/,
      /Software Engineer/i,
      /Backend Engineer/i,
      /Frontend Developer/i,
      /Full Stack/i,
      /Senior Rust/i,
      /Rust Developer/i,
      /Rust Engineer/i,
      /Python Developer/i,
      /\bTypeScript\b/i,
      /\bKubernetes\b/i,
      /TechCorp|StartupXYZ|BigTech/i,
      /Developer at TechStartup/i,
      /rust developer/i,
    ];

    return genericScraperFixturePatterns.some((pattern) => pattern.test(text));
  }

  const stalePatterns = [
    /placeholder=["'][^"']*(?:Senior\s+)?Software Engineer/i,
    /placeholder=["'][^"']*John Doe/i,
    /placeholder=["'][^"']*San Francisco, CA/i,
    /placeholder=["'][^"']*San Francisco,\s*New York/i,
    /placeholder=["'][^"']*github\.com\/johndoe/i,
    /label=["']GitHub["']/i,
    /label:\s*["']GitHub["']/i,
    /name:\s*["']GitHub["']/i,
    /name:\s*["']John Doe["']/i,
    /name:\s*["']Jane Doe["']/i,
    /categories:\s*\[\s*["']Frontend["'],\s*["']Backend["'],\s*["']DevOps["']\s*\]/i,
    /["']John Doe["']/i,
    /["']Jane Doe["']/i,
    />\s*GitHub\s*</i,
    /linkedin:\s*["']linkedin\.com\/in\/johndoe["']/i,
    /linkedin\.com\/in\/johndoe/i,
    /location:\s*["']San Francisco, CA["']/i,
    /cities:\s*\[\s*["']Remote["'],\s*["']San Francisco["'],\s*["']New York["']\s*\]/i,
    /company:\s*["']TechCorp["']/i,
    /company:\s*["']Tech Corp["']/i,
    /companyName=["']TestCorp["']/i,
    /create_test_job\([^)]*["']TestCorp["']/i,
    /create_test_job\([^)]*["'](?:Rust Developer|Python Developer|Software Engineer)["']/i,
    /create_test_job\([^)]*["']TechCorp["']/i,
    /create_test_job\([^)]*["']Engineer["']/i,
    /calculate_job_hash\([^)]*["']Software Engineer["']/i,
    /create_test_job\([^)]*["'](?:Rust Engineer|Backend Engineer)["']/i,
    /["']Senior Engineer["']/i,
    /Title matches:\s*Senior Engineer/i,
    /https:\/\/github\.com\/(?:johndoe|caseysentinel)/i,
    /code\.example\.com/i,
    /GitHub profile link if relevant to your role/i,
    /placeholder=["'][^"']*React/i,
    /placeholder=["'][^"']*Frontend/i,
    /placeholder=["'][^"']*Remote Rust/i,
    /name:\s*["']Remote Rust["']/i,
    /rust remote/i,
    /setNewSearchName\(["']Remote Rust["']\)/i,
    /Unbookmarked:\s*Software Engineer/i,
    /Moved\s+Software Engineer\s+to Phone Screen/i,
    /Tech Cover Letter/i,
    /placeholder=["'][^"']*Tech Company Application/i,
    /Skill name \(e\.g\., Python, React\)/i,
    /Experienced software engineer/i,
    /AI-powered (?:ghost detection algorithm|engine)/i,
    /Resume Matcher commands/i,
    /e\.g\., ["']Software Engineer["']/i,
    /e\.g\., ["']San Francisco, CA["']/i,
    /JOHN DOE - Software Engineer/i,
    /Comma or OR:\s*react,\s*vue/i,
    /senior AND engineer/i,
    /["']?query["']?\s*:\s*["']software engineer["']/i,
    /software\+engineer/i,
    /title:\s*["'](?:Senior\s+)?Software Engineer["']/i,
    /title:\s*["']Remote Software Engineer["']/i,
    /\?\?\s*["']Software Engineer["']/i,
    /Worked on improving database performance/i,
    /The skill extractor recognizes \*\*\d+\+ skills\*\* across 6 categories/i,
    /Identify \d+\+ technical skills across 6 categories/i,
    /extracts technical and\s+soft skills/i,
    /Technical Skills-First/i,
    /Perfect for engineering roles/i,
    /Engineering roles - skills first/i,
    /Tech companies - clean and minimal/i,
    /Tech Stack\b/i,
    /Tech Stack Focus/i,
    /Try searching for "\{companyName\}" on LinkedIn or Glassdoor/i,
    /Technical & soft skills/i,
    /Technical and professional skills/i,
    /Enter your job title or keywords \(e\.g\., "Software Engineer"\)/i,
    /Optionally enter a location \(e\.g\., "San Francisco, CA" or "Remote"\)/i,
    /jobs\/software-engineer/i,
    /^- "Software Engineer"$/m,
    /Examples:\s*\n\s*- "Software Engineer"/i,
    /^\*\*Software Engineer in San Francisco\*\*$/m,
    /SWE Remote/i,
    /Build a professional resume in 7 easy steps/i,
    /LinkedIn URL \(highly recommended\)/i,
    /GitHub, portfolio, or personal website \(optional\)/i,
    /Security engineer with 8 years/i,
    /Poor fit for your current resume/i,
    /Responsible for managing the security team/i,
    /Led 12-person security team/i,
    /If they say "Python"/i,
    /top_skill:\s*["']React["']/i,
    /top_company:\s*["']TechCorp["']/i,
    /Top Skill:\s*TypeScript/i,
    /Top Company:\s*BigTech Inc/i,
    /React Demand Spike/i,
    /TechCorp Hiring Pause/i,
    /TechCorp is great/i,
    /\$ whoami/i,
    /JOHN DOE - Data Analyst/i,
    /\.\/experience/i,
    /B\.S\. CS/i,
    /Senior TypeScript role/i,
    /B2B SaaS/i,
    /ML algorithms/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}
