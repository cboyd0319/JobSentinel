export interface MockAtsDetectionResponse {
  platform: string;
  commonFields: string[];
  automationNotes: string | null;
}

export function getMockAtsPlatformDetection(url: string): MockAtsDetectionResponse {
  const platform = getMockAtsPlatform(url);
  return {
    platform,
    commonFields: getMockAtsCommonFields(platform),
    automationNotes: getMockAtsAutomationNotes(platform),
  };
}

export function getMockAtsPlatform(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "unknown";
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (hostMatches(host, "greenhouse.io")) return "greenhouse";
  if (hostMatches(host, "lever.co")) return "lever";
  if (hostMatches(host, "myworkdayjobs.com") || hostMatches(host, "workday.com")) return "workday";
  if (host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") {
    return "smartrecruiters";
  }
  if (host === "apply.workable.com" || host === "jobs.workable.com") return "workable";
  if (hostMatches(host, "recruitee.com")) return "recruitee";
  if (hostMatches(host, "icims.com")) return "icims";
  if (hostMatches(host, "bamboohr.com")) return "bamboohr";
  if (hostMatches(host, "ashbyhq.com")) return "ashbyhq";
  if (hostMatches(host, "taleo.net")) return "taleo";
  if (hostMatches(host, "breezy.hr")) return "breezyhr";
  if (hostMatches(host, "applytojob.com") || hostMatches(host, "jazzhr.com") || hostMatches(host, "jazz.co")) {
    return "jazzhr";
  }
  if (hostMatches(host, "bullhornstaffing.com") || (hostMatches(host, "bullhorn.com") && path.includes("job"))) {
    return "bullhorn";
  }
  if (host === "jobs.jobvite.com" || (hostMatches(host, "jobvite.com") && path.includes("job"))) {
    return "jobvite";
  }
  if (hostMatches(host, "teamtailor.com")) return "teamtailor";
  if (hostMatches(host, "successfactors.com") || hostMatches(host, "sapsf.com")) return "successfactors";
  if (host === "careers.oracle.com" || (hostMatches(host, "oraclecloud.com") && /career|recruit|job/.test(path))) {
    return "oracle_recruiting";
  }
  if (hostMatches(host, "phenompeople.com")) return "phenom";
  if (hostMatches(host, "personio.de") || hostMatches(host, "personio.com")) return "personio";
  if (hostMatches(host, "comeet.com") || hostMatches(host, "comeet.co") || hostMatches(host, "sparkhire.com")) {
    return "comeet";
  }
  if (hostMatches(host, "jobylon.com")) return "jobylon";
  if (host === "careers.microsoft.com" || hostMatches(host, "eightfold.ai")) return "eightfold";
  if (hostMatches(host, "workforcenow.adp.com")) return "adp_recruiting";
  if (hostMatches(host, "ultipro.com") || (hostMatches(host, "ukg.com") && path.includes("career"))) return "ukg";
  if (host === "hiring.rippling.com") return "rippling";
  if (hostMatches(host, "zohorecruit.com") || hostMatches(host, "zohorecruit.in") || hostMatches(host, "zohorecruit.eu")) {
    return "zoho_recruit";
  }
  if (hostMatches(host, "freshteam.com") || hostMatches(host, "freshteam.io")) return "freshteam";
  if (hostMatches(host, "pinpointhq.com")) return "pinpoint";
  if (hostMatches(host, "jobscore.com")) return "jobscore";
  return "unknown";
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function getMockAtsCommonFields(platform: string): string[] {
  const baseFields = ["firstName", "lastName", "email", "phone", "resume"];
  if (platform === "greenhouse" || platform === "lever") {
    return [...baseFields, "coverLetter", "linkedin"];
  }
  if (platform === "workday") {
    return [...baseFields, "address", "workAuthorization"];
  }
  return baseFields;
}

function getMockAtsAutomationNotes(platform: string): string {
  if (platform === "unknown") {
    return "Unknown application form. Review fields carefully before submitting.";
  }
  return `${platform} supports guided form filling. Review before submitting.`;
}
