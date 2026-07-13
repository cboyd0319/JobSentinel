const APPLICATION_FORM_NAMES: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
  taleo: "Taleo",
  icims: "iCIMS",
  bamboohr: "BambooHR",
  ashbyhq: "Ashby",
  smartrecruiters: "SmartRecruiters",
  workable: "Workable",
  recruitee: "Recruitee",
  breezyhr: "Breezy HR",
  jazzhr: "JazzHR",
  bullhorn: "Bullhorn",
  jobvite: "Jobvite",
  teamtailor: "Teamtailor",
  successfactors: "SAP SuccessFactors",
  oracle_recruiting: "Oracle Recruiting",
  phenom: "Phenom",
  personio: "Personio",
  comeet: "Comeet",
  jobylon: "Jobylon",
  eightfold: "Eightfold",
  adp_recruiting: "ADP Recruiting",
  ukg: "UKG",
  rippling: "Rippling",
  zoho_recruit: "Zoho Recruit",
  freshteam: "Freshteam",
  pinpoint: "Pinpoint",
  jobscore: "JobScore",
};

function titleCasePlatformId(platform: string): string {
  return platform
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getApplicationFormDisplayName(platform: string | null | undefined): string | null {
  if (!platform || platform === "unknown") {
    return null;
  }

  return APPLICATION_FORM_NAMES[platform] ?? titleCasePlatformId(platform);
}
