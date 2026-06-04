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
  const lower = url.toLowerCase();
  if (lower.includes("greenhouse.io")) return "greenhouse";
  if (lower.includes("lever.co")) return "lever";
  if (lower.includes("myworkdayjobs.com") || lower.includes("workday")) return "workday";
  if (lower.includes("icims.com")) return "icims";
  if (lower.includes("bamboohr.com")) return "bamboohr";
  if (lower.includes("ashbyhq.com")) return "ashbyhq";
  if (lower.includes("taleo.net")) return "taleo";
  return "unknown";
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
    return "Unknown ATS. Review fields carefully before submitting.";
  }
  return `${platform} supports guided form filling. Review before submitting.`;
}
