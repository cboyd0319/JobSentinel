#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFrontendBoundaries } from "./check-frontend-boundaries.mjs";
import {
  checkSecuritySensors,
  formatSecuritySensorSummary,
} from "./check-security-sensors.mjs";
import { checkRepoBloat } from "./check-repo-bloat.mjs";
import { checkTauriInvokes } from "./check-tauri-invokes.mjs";
import { checkTestQuality } from "./check-test-quality.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ignoredPathParts = new Set([
  ".git",
  ".vale",
  "node_modules",
  "dist",
  "target",
  ".claude",
  "browser-extension",
  "playwright-report",
  "test-results",
]);

const requiredFiles = [
  "AGENTS.md",
  "PRIVACY.md",
  "RESPONSIBLE_AI.md",
  "docs/architecture/privacy-first-ai-gateway.md",
  "docs/harness/README.md",
  "docs/harness/sources.md",
  "docs/harness/agent-operating-model.md",
  "docs/harness/change-contract.md",
  "docs/harness/verification-matrix.md",
  "docs/harness/entropy-control.md",
  "docs/exec-plans.md",
  "docs/plans/README.md",
  "docs/plans/templates/exec-plan-template.md",
  "docs/plans/templates/change-contract-template.md",
  "docs/plans/tech-debt-tracker.md",
  "docs/research/README.md",
  "src/services/aiGateway.ts",
];

const requiredHarnessSnippets = {
  "README.md": [
    "Core workflows work locally.",
    "Rule 0: user privacy and security are non-negotiable.",
    "External AI, including OpenAI or another provider,",
    "is optional, disabled by default,",
    "privacy-first AI gateway",
    "payload preview, redaction, cancellation, approval, and local request logging",
  ],
  "PRIVACY.md": [
    "Rule 0: user privacy and security are non-negotiable.",
    "Core JobSentinel workflows work locally",
    "External AI is optional and disabled by default.",
    "No full database uploads.",
    "Research and grant evaluation use public postings",
    "synthetic candidate data",
    "JobSentinel does not train models on user data.",
  ],
  "RESPONSIBLE_AI.md": [
    "Rule 0: user privacy and security are non-negotiable.",
    "External AI is optional, disabled by default, and routed through one AI gateway.",
    "Candidate-side explainability",
    "Manipulate ATS systems.",
    "AI outputs are advisory. Users remain in control.",
  ],
  "docs/architecture/privacy-first-ai-gateway.md": [
    "Rule 0: user privacy and security are non-negotiable.",
    "External AI is optional, disabled by default,",
    "must be routed through one gateway.",
    "external_ai.enabled = false",
    "Feature Privacy Labels",
    "No raw full database dumps.",
    "TODO before shipping any user-facing external AI feature:",
  ],
  "docs/harness/README.md": [
    "## Rule 0",
    "User privacy and security are non-negotiable.",
    "## Session Start Checklist",
    "## When To Add Harness",
    "Experience contract",
    "Support path",
    "Privacy/AI boundary",
  ],
  "docs/harness/change-contract.md": [
    "Rule 0 evidence:",
    "Rule 0 risk:",
    "Audience and ease:",
    "Harness impact:",
    "User-ease evidence:",
  ],
  "docs/harness/verification-matrix.md": [
    "## Experience And Support",
    "External AI provider path",
  ],
  "docs/harness/sources.md": [
    "AgentPatterns.ai",
    "Epsilla",
    "Local Sibling Repo Patterns",
  ],
  "docs/research/README.md": [
    "Synthetic-data-first",
    "Public-postings-only default",
    "Requires Explicit Informed Consent",
  ],
  "docs/plans/templates/change-contract-template.md": [
    "## Audience And Ease",
    "## Harness Impact",
    "User-ease evidence:",
  ],
  "docs/plans/templates/exec-plan-template.md": [
    "## Success Criteria",
    "## Audience And Ease",
    "## Handoff",
  ],
  "src/services/aiGateway.ts": [
    "DEFAULT_EXTERNAL_AI_SETTINGS",
    "enabled: false",
    "provider: \"none\"",
    "payload_preview_required",
    "full_database_blocked",
    "sensitive_payload_blocked",
  ],
};

const externalAiProviderCallPatterns = [
  /api\.openai\.com/i,
  /chat\/completions/i,
  /\/v1\/responses/i,
  /from\s+["']openai["']/i,
  /new\s+OpenAI\s*\(/i,
];

const externalAiProviderAllowedPaths = new Set([
  "src/services/aiGateway.ts",
  "src/services/aiGateway.test.ts",
]);

const readmeReferenceHeading = "## References and external sources";

// Research packet URLs are intentionally portable: no local file paths and no
// grant packet content. User explicitly excluded the grant application packet.
const requiredReadmeReferenceUrls = [
  "http://www.pon.harvard.edu/courses-and-training/3-day/special-three-day-combined-program/",
  "https://arxiv.org/abs/2006.16099",
  "https://arxiv.org/abs/2202.03602",
  "https://arxiv.org/abs/2203.03565",
  "https://arxiv.org/abs/2302.04119",
  "https://arxiv.org/abs/2304.02019",
  "https://arxiv.org/abs/2307.02157",
  "https://arxiv.org/abs/2409.15567",
  "https://arxiv.org/abs/2410.21771",
  "https://arxiv.org/abs/2410.23432",
  "https://arxiv.org/abs/2412.00615",
  "https://arxiv.org/abs/2501.10371",
  "https://arxiv.org/abs/2502.05099",
  "https://arxiv.org/abs/2503.06035",
  "https://arxiv.org/abs/2504.00961",
  "https://arxiv.org/abs/2504.02870",
  "https://arxiv.org/abs/2505.07653",
  "https://arxiv.org/abs/2505.20312",
  "https://arxiv.org/abs/2505.21733",
  "https://arxiv.org/abs/2509.00462",
  "https://arxiv.org/abs/2510.10315",
  "https://arxiv.org/abs/2511.02537",
  "https://arxiv.org/abs/2511.03377",
  "https://arxiv.org/abs/2511.08637",
  "https://arxiv.org/abs/2512.20164",
  "https://arxiv.org/abs/2601.11884",
  "https://arxiv.org/abs/2602.18550",
  "https://arxiv.org/abs/2603.14558",
  "https://arxiv.org/abs/2603.18390",
  "https://arxiv.org/abs/2603.22714",
  "https://business.vanderbilt.edu/news/2023/09/05/stop-blaming-women-for-the-gender-pay-gap/",
  "https://boards-api.greenhouse.io/v1/boards/{company}/jobs",
  "https://ceur-ws.org/Vol-3908/paper_26.pdf",
  "https://ceur-ws.org/Vol-4046/RecSysHR2025-paper_9.pdf",
  "https://clarifycapital.com/ghost-jobs",
  "https://clarifycapital.com/job-seekers-beware-of-ghost-jobs-survey",
  "https://columbialawreview.org/content/ghost-jobs/",
  "https://commoncrawl.org/blog/balancing-discovery-and-privacy-a-look-into-opt-out-protocols",
  "https://commoncrawl.org/faq",
  "https://consumer.ftc.gov/articles/job-scams",
  "https://datatracker.ietf.org/doc/html/rfc9309",
  "https://developers.ashbyhq.com/docs/public-job-posting-api",
  "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec",
  "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
  "https://developers.greenhouse.io/job-board.html",
  "https://developers.smartrecruiters.com/docs/customer-overview",
  "https://developers.smartrecruiters.com/docs/endpoints",
  "https://developers.smartrecruiters.com/docs/posting-api",
  "https://dl.acm.org/doi/10.1145/3711038",
  "https://dl.acm.org/doi/full/10.1145/3696457",
  "https://docs.iza.org/dp16781.pdf",
  "https://docs.iza.org/dp17198.pdf",
  "https://docs.iza.org/dp17520.pdf",
  "https://docs.iza.org/dp17761.pdf",
  "https://docs.iza.org/dp18437.pdf",
  "https://gap.hks.harvard.edu/do-women-avoid-salary-negotiations-evidence-large-scale-natural-field-experiment",
  "https://gap.hks.harvard.edu/social-incentives-gender-differences-propensity-initiate-negotiations-sometimes-it-does-hurt-ask",
  "https://github.com/lever/postings-api",
  "https://hbr.org/2018/06/research-women-ask-for-raises-as-often-as-men-but-are-less-likely-to-get-them",
  "https://help.workable.com/hc/en-us/articles/115012771647-Using-the-Workable-API-to-create-a-careers-page",
  "https://help.workable.com/hc/en-us/articles/115013356548-Workable-API-Documentation",
  "https://hire.lever.co/developer",
  "https://hire.lever.co/developer/documentation",
  "https://icccr.tc.columbia.edu/blog/negotiating-the-wage-gap-the-role-of-race-in-salary-negotiations/",
  "https://iwpr.org/wp-content/uploads/2022/01/Equal-Pay-Policies-and-the-Gender-Wage-Gap_Compilation_20220125_FINAL.pdf",
  "https://journals.aom.org/doi/10.5465/amd.2022.0021",
  "https://link.springer.com/chapter/10.1007/978-3-030-75645-1_17",
  "https://news.bloomberglaw.com/daily-labor-report/state-job-ad-bills-shift-from-pay-ranges-to-ghost-jobs-ai-use",
  "https://nwlc.org/resource/wage-gap-state-black-women/",
  "https://nwlc.org/wp-content/uploads/2023/01/NWLC-Pay-Range-Transparency-Factsheet_2023-1.pdf",
  "https://nwlc.org/wp-content/uploads/2024/03/Wage-Gap-State-by-State-Black-Women-2.12.2025.pdf",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC12537773/",
  "https://psycnet.apa.org/record/2006-08981-013",
  "https://pubmed.ncbi.nlm.nih.gov/30335407/",
  "https://repository.lsu.edu/cgi/viewcontent.cgi?article=5986&context=gradschool_theses",
  "https://stateline.org/2024/07/10/more-states-enact-salary-transparency-laws-to-fight-gender-racial-pay-gaps/",
  "https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview",
  "https://vcresearch.berkeley.edu/news/new-research-shatters-outdated-pay-gap-myth-women-dont-negotiate",
  "https://www.americanprogress.org/article/women-of-color-and-the-wage-gap/",
  "https://www.apa.org/pubs/journals/releases/apl-apl0000363.pdf",
  "https://www.ashbyhq.com/job-board-embed-examples",
  "https://www.axios.com/2021/06/15/supreme-court-linkedin-data-scraper",
  "https://www.businessinsider.com/hiring-slowdown-companies-take-longer-fill-open-roles-ghost-jobs-2025-5",
  "https://www.colorado.edu/business/faculty-research/2020/04/29/role-race-salary-negotiations",
  "https://www.columbialawreview.org/wp-content/uploads/2025/11/November-2025-Forum-Grimm.pdf",
  "https://www.datasociety.net/pubs/fow/EmploymentDiscrimination.pdf",
  "https://www.employinc.com/resources/2025-job-seeker-nation-report/",
  "https://www.epi.org/unequalpower/publications/understanding-black-white-disparities-in-labor-market-outcomes/",
  "https://www.greenhouse.com/blog/greenhouse-2024-state-of-job-hunting-report",
  "https://www.hbs.edu/managing-the-future-of-work/Documents/research/hiddenworkers09032021.pdf",
  "https://www.hiringlab.org/2026/04/28/job-seeker-searches-for-ai-roles-have-grown/",
  "https://www.indeed.com/legal",
  "https://www.library.hbs.edu/working-knowledge/salary-negotiations-a-catch-22-for-women",
  "https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions",
  "https://www.linkedin.com/legal/user-agreement",
  "https://www.loeb.com/en/insights/publications/2022/05/ninth-circuit-provides-path-forward-for-web-scraping-of-public-data",
  "https://www.mdpi.com/2079-9292/14/4/794",
  "https://www.metaverselaw.com/hiq-v-linkedin-user-agreements-in-the-age-of-data-scraping/",
  "https://www.nber.org/digest/apr13/do-women-avoid-salary-negotiations",
  "https://www.nber.org/system/files/working_papers/w32171/revisions/w32171.rev0.pdf",
  "https://www.nber.org/system/files/working_papers/w32320/w32320.pdf",
  "https://www.nber.org/system/files/working_papers/w33433/w33433.pdf",
  "https://www.pewresearch.org/short-reads/2016/07/01/racial-gender-wage-gaps-persist-in-u-s-despite-some-progress/",
  "https://www.pewresearch.org/short-reads/2023/03/01/gender-pay-gap-facts/",
  "https://www.pewresearch.org/short-reads/2025/03/04/gender-pay-gap-in-us-has-narrowed-slightly-over-2-decades/",
  "https://www.pewresearch.org/social-trends/2023/03/01/the-enduring-grip-of-the-gender-pay-gap/",
  "https://www.pon.harvard.edu/daily/leadership-skills-daily/counteracting-racial-and-gender-bias-in-job-negotiations-nb/",
  "https://www.pon.harvard.edu/daily/salary-negotiations/ask-a-negotiation-expert-to-narrow-the-wage-gap-take-a-wider-view-nb/",
  "https://www.pon.harvard.edu/daily/salary-negotiations/in-salary-negotiations-women-do-ask/",
  "https://www.pon.harvard.edu/daily/salary-negotiations/negotiating-a-salary-when-compensation-is-public/",
  "https://www.pon.harvard.edu/daily/salary-negotiations/salary-negotiation-skills-different-for-men-and-women/",
  "https://www.pon.harvard.edu/daily/salary-negotiations/salary-negotiations-a-lesson-from-meryl-streep/",
  "https://www.pon.harvard.edu/daily/salary-negotiations/the-backlash-effect-for-women-negotiators-in-hollywood-and-beyond-nb/",
  "https://www.pon.harvard.edu/author/pon_staff/",
  "https://www.pon.harvard.edu/blog/",
  "https://www.pon.harvard.edu/category/daily/salary-negotiations/",
  "https://www.pon.harvard.edu/events/",
  "https://www.pon.harvard.edu/executive-education/",
  "https://www.pon.harvard.edu/faculty-and-research/",
  "https://www.pon.harvard.edu/teaching-materials-publications/",
  "https://www.resumebuilder.com/3-in-10-companies-currently-have-fake-job-posting-listed/",
  "https://www.sciencedirect.com/science/article/abs/pii/S0167268124002312",
  "https://www.sciencedirect.com/science/article/abs/pii/S0749597806000884",
  "https://www.sciencedirect.com/science/article/pii/S0167268123000653",
  "https://www.sciencedirect.com/science/article/pii/S0267364924000335",
  "https://www.sciencedirect.com/science/article/pii/S0927537122000951",
  "https://www.sciencedirect.com/science/article/pii/S0927537124000137",
  "https://www.sciencedirect.com/science/article/pii/S0927537124000320",
  "https://www.shrm.org/topics-tools/news/benefits-compensation/black-workers-still-earn-less-white-counterparts",
  "https://www.swlaw.com/publication/legal-landscape-of-web-scraping-and-practice-tips/",
  "https://www.theguardian.com/money/2024/oct/30/ghost-jobs-why-do-40-of-companies-advertise-positions-that-dont-exist",
  "https://www.theguardian.com/society/2021/nov/18/campaigners-urge-bosses-to-stop-asking-job-applicants-for-salary-history",
  "https://www.upturn.org/static/reports/2018/hiring-algorithms/files/Upturn%20--%20Help%20Wanted%20-%20An%20Exploration%20of%20Hiring%20Algorithms%2C%20Equity%20and%20Bias.pdf",
  "https://www.urban.org/sites/default/files/2022-12/Pay%20Inequities%20among%20Black%20Women.pdf",
  "https://www.whitecase.com/insight-our-thinking/web-scraping-website-terms-and-cfaa-hiqs-preliminary-injunction-affirmed-again",
  "https://www.workable.com/developers",
  "https://www.wsj.com/lifestyle/careers/ghost-jobs-2c0dcd4e",
];

const errors = [];

function repoPath(path) {
  return join(root, path);
}

function read(path) {
  return readFileSync(repoPath(path), "utf8");
}

const externalUrlPattern = /https?:\/\/[^\s<>"'`]+/g;

function normalizeExternalUrl(rawUrl) {
  return rawUrl
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/[)\].,;:]+$/g, "")
    .split("#")[0];
}

function shouldIgnoreExternalReference(url) {
  const lowerUrl = url.toLowerCase();

  return (
    lowerUrl.includes("example.com") ||
    lowerUrl.includes("example.org") ||
    lowerUrl.includes("localhost") ||
    lowerUrl.includes("127.0.0.1") ||
    lowerUrl.includes("0.0.0.0") ||
    lowerUrl.includes("webhook.site") ||
    lowerUrl.includes("token") ||
    lowerUrl.includes("secret") ||
    lowerUrl.includes("password") ||
    lowerUrl.includes("github_pat") ||
    /:\/\/[^/\s]+@/.test(url) ||
    /\$\{|<[^>]+>/.test(url)
  );
}

function extractExternalUrls(text) {
  return [...text.matchAll(externalUrlPattern)]
    .map((match) => normalizeExternalUrl(match[0]))
    .filter((url) => url !== "" && !shouldIgnoreExternalReference(url));
}

function collectMarkdownFiles(dir = root) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(rel);
    }
  }

  return files.sort();
}

function collectCodeFiles(dir = root) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  const codeExtensions = new Set([".js", ".jsx", ".mjs", ".rs", ".ts", ".tsx"]);

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectCodeFiles(fullPath));
    } else if (entry.isFile() && codeExtensions.has(extname(entry.name))) {
      files.push(rel);
    }
  }

  return files.sort();
}

for (const path of requiredFiles) {
  if (!existsSync(repoPath(path))) {
    errors.push(`missing required harness file: ${path}`);
  }
}

for (const [path, snippets] of Object.entries(requiredHarnessSnippets)) {
  if (!existsSync(repoPath(path))) {
    continue;
  }

  const text = read(path);
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      errors.push(`${path} must include harness snippet: ${snippet}`);
    }
  }
}

if (existsSync(repoPath("README.md"))) {
  const readmeText = read("README.md");
  const readmeReferenceText = readmeText.split(readmeReferenceHeading)[1] ?? "";

  if (!readmeText.includes(readmeReferenceHeading)) {
    errors.push(`README.md must include ${readmeReferenceHeading}`);
  }

  if (!readmeReferenceText.includes("Security test payloads")) {
    errors.push("README.md reference index must explain excluded test and placeholder URLs");
  }

  const readmeExternalReferences = new Set(extractExternalUrls(readmeReferenceText));

  for (const url of requiredReadmeReferenceUrls) {
    if (!readmeExternalReferences.has(normalizeExternalUrl(url))) {
      errors.push(`README.md reference index missing required research source: ${url}`);
    }
  }
}

for (const path of collectCodeFiles()) {
  if (externalAiProviderAllowedPaths.has(path)) {
    continue;
  }

  const text = read(path);
  if (externalAiProviderCallPatterns.some((pattern) => pattern.test(text))) {
    errors.push(`external AI provider calls must go through src/services/aiGateway.ts: ${path}`);
  }
}

if (existsSync(repoPath("AGENTS.md"))) {
  const lineCount = read("AGENTS.md").split(/\r?\n/).length;
  if (lineCount > 160) {
    errors.push(`AGENTS.md has ${lineCount} lines; keep it at or below 160 lines`);
  }
}

const localLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

for (const path of collectMarkdownFiles()) {
  if (!existsSync(repoPath(path))) {
    continue;
  }

  const text = read(path);
  let match;

  while ((match = localLinkPattern.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    const target = rawTarget.replace(/^<|>$/g, "").split("#")[0];

    if (
      target === "" ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#")
    ) {
      continue;
    }

    const resolved = normalize(resolve(root, dirname(path), target));
    if (!resolved.startsWith(root)) {
      errors.push(`${path} links outside repo: ${rawTarget}`);
      continue;
    }

    if (!existsSync(resolved)) {
      const displayPath = relative(root, resolved);
      errors.push(`${path} has broken local link: ${rawTarget} -> ${displayPath}`);
      continue;
    }

    if (statSync(resolved).isDirectory()) {
      const indexPath = join(resolved, "README.md");
      if (!existsSync(indexPath)) {
        errors.push(`${path} links to directory without README.md: ${rawTarget}`);
      }
    }
  }
}

const packageJson = JSON.parse(read("package.json"));
const packageLockJson = JSON.parse(read("package-lock.json"));
const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargoToml = read("src-tauri/Cargo.toml");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

if (packageJson.version !== tauriConfig.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, src-tauri/tauri.conf.json=${tauriConfig.version}`,
  );
}

if (packageLockJson.version !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, package-lock.json=${packageLockJson.version}`,
  );
}

if (packageLockJson.packages?.[""]?.version !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, package-lock.json root package=${packageLockJson.packages?.[""]?.version}`,
  );
}

if (cargoVersion !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, src-tauri/Cargo.toml=${cargoVersion ?? "missing"}`,
  );
}

const currentVersion = packageJson.version;
const versionClaims = {
  "README.md": [`Version-${currentVersion}`, `alt="Version ${currentVersion}"`],
  "docs/README.md": [`Current Version: ${currentVersion}`, `Release version:** ${currentVersion}`],
  "docs/ROADMAP.md": ["Use `package.json` for the current release package version."],
};

for (const [path, claims] of Object.entries(versionClaims)) {
  const text = read(path);
  for (const claim of claims) {
    if (!text.includes(claim)) {
      errors.push(`${path} must include current version claim: ${claim}`);
    }
  }
}

const mainRs = read("src-tauri/src/main.rs");
const generateHandlerMatch = mainRs.match(/tauri::generate_handler!\[\s*([\s\S]*?)\s*\]\)/);
if (!generateHandlerMatch) {
  errors.push("could not find tauri::generate_handler! block in src-tauri/src/main.rs");
}

const registeredCommandCount = (generateHandlerMatch?.[1].match(/commands::/g) ?? []).length;
const measuredCommandClaim = `${registeredCommandCount} registered Tauri commands`;

for (const path of ["README.md", "docs/README.md", "docs/ROADMAP.md"]) {
  if (!read(path).includes(measuredCommandClaim)) {
    errors.push(`${path} must include current command claim: ${measuredCommandClaim}`);
  }
}

const currentTestCountDocs = [
  "README.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/TESTING.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/INTEGRATION_TESTING.md",
];

const hardcodedTestCountPattern =
  /\b(?:\d+\+?\s+(?:unit|integration|component|frontend|e2e|rust|js)?\s*tests?\b|(?:unit|integration|component|frontend|e2e|rust|js)\s+tests?:\s*\d+\+?)/i;

for (const path of currentTestCountDocs) {
  const lines = read(path).split(/\r?\n/);

  lines.forEach((line, index) => {
    const normalizedLine = line.trim();

    if (!hardcodedTestCountPattern.test(normalizedLine)) {
      return;
    }

    if (/\bnew\s+(?:component\s+)?tests?\b/i.test(normalizedLine)) {
      return;
    }

    errors.push(
      `${path}:${index + 1} has hardcoded current test-count claim; reference fresh command output instead`,
    );
  });
}

const rustLintPolicyDocs = [
  "AGENTS.md",
  "README.md",
  "docs/harness/agent-operating-model.md",
  "docs/harness/verification-matrix.md",
  "docs/developer/CONTRIBUTING.md",
  "docs/developer/CI_CD.md",
  "docs/developer/TESTING.md",
];

const allTargetClippyHardGatePattern =
  /cargo\s+clippy(?=[^\n`]*--all-targets)(?=[^\n`]*-D\s+warnings)/;

for (const path of rustLintPolicyDocs) {
  const lines = read(path).split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!allTargetClippyHardGatePattern.test(line)) {
      return;
    }

    errors.push(
      `${path}:${index + 1} uses all-target clippy as a hard gate; use production clippy policy instead`,
    );
  });
}

for (const violation of checkFrontendBoundaries(root)) {
  errors.push(violation);
}

for (const violation of checkSecuritySensors(root)) {
  errors.push(violation);
}

for (const violation of checkRepoBloat(root)) {
  errors.push(violation);
}

for (const violation of checkTauriInvokes(root)) {
  errors.push(violation);
}

for (const violation of checkTestQuality(root)) {
  errors.push(violation);
}

if (errors.length > 0) {
  console.error("Harness check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(formatSecuritySensorSummary());
console.log("Harness check passed.");
