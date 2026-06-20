import * as model from "./jobSourceDiscoveryModel";

const LONG_TAIL_REVIEW_NOTE =
  "Treat as a source-intelligence fingerprint first. Use employer-opened pages, pasted links, Browser Import, or manual entry until a source-specific public endpoint, feed, terms posture, robots behavior, rate limit, and parser fixture are reviewed.";

function atsLongTailEntry(
  id: string,
  label: string,
  hostPatterns: readonly string[],
  examples: readonly string[],
): model.JobSourceDiscoveryEntry {
  return {
    id,
    label,
    category: "ats-platform",
    accessModel: "employer-career-system",
    status: "research",
    regions: ["global"],
    careerProfileIds: "all",
    hostPatterns,
    examples,
    implementationPath:
      "Detect the platform fingerprint and keep native scheduled discovery disabled until reviewed for this employer tenant.",
    notes: `${LONG_TAIL_REVIEW_NOTE} ${model.EMPLOYER_CAREER_SYSTEM_NOTES}`,
  };
}

export const JOB_SOURCE_ATS_LONG_TAIL_DISCOVERY_ENTRIES: readonly model.JobSourceDiscoveryEntry[] = [
  atsLongTailEntry("clearcompany", "ClearCompany", [
    "clearcompany.com",
    "clearco.com",
  ], [
    "ClearCompany employer career portals",
  ]),
  atsLongTailEntry("dayforce", "Dayforce / Ceridian", [
    "dayforcehcm.com",
    "ceridian.com",
  ], [
    "Dayforce and Ceridian recruiting portals",
  ]),
  atsLongTailEntry("avature", "Avature", ["avature.net", "avature.com"], [
    "Avature enterprise career portals",
  ]),
  atsLongTailEntry("jobdiva", "JobDiva", ["jobdiva.com"], [
    "JobDiva staffing and recruiting portals",
  ]),
  atsLongTailEntry("ceipal", "CEIPAL", ["ceipal.com"], [
    "CEIPAL staffing and recruiting portals",
  ]),
  atsLongTailEntry("crelate", "Crelate", ["crelate.com"], [
    "Crelate staffing and recruiting portals",
  ]),
  atsLongTailEntry("trackerrms", "TrackerRMS", ["trackerrms.com"], [
    "TrackerRMS staffing and recruiting portals",
  ]),
  atsLongTailEntry("vincere", "Vincere", ["vincere.io"], [
    "Vincere recruiting agency portals",
  ]),
  atsLongTailEntry("applicantpro", "ApplicantPro", ["applicantpro.com"], [
    "ApplicantPro employer career pages",
  ]),
  atsLongTailEntry("applicantstack", "ApplicantStack", [
    "applicantstack.com",
  ], [
    "ApplicantStack employer career pages",
  ]),
  atsLongTailEntry("homerun", "Homerun", ["homerun.co"], [
    "Homerun employer career pages",
  ]),
  atsLongTailEntry("manatal", "Manatal", ["manatal.com"], [
    "Manatal recruiting portals",
  ]),
  atsLongTailEntry("recruit-crm", "Recruit CRM", ["recruitcrm.io"], [
    "Recruit CRM staffing portals",
  ]),
  atsLongTailEntry("loxo", "Loxo", ["loxo.co"], [
    "Loxo recruiting CRM and ATS portals",
  ]),
  atsLongTailEntry("hibob", "HiBob Hiring / Bob", ["hibob.com", "bob.com"], [
    "HiBob and Bob hiring surfaces",
  ]),
  atsLongTailEntry("factorial", "Factorial Recruiting", ["factorialhr.com"], [
    "Factorial employer career pages",
  ]),
  atsLongTailEntry("join", "JOIN", ["join.com"], [
    "JOIN job posting and employer career pages",
  ]),
  atsLongTailEntry("polymer", "Polymer", ["polymer.co"], [
    "Polymer public career pages",
  ]),
  atsLongTailEntry("recooty", "Recooty", ["recooty.com"], [
    "Recooty public career pages",
  ]),
] as const;
