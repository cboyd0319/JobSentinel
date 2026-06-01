export interface JobSourceGuidance {
  label: string;
  description: string;
}

const EMPLOYER_SOURCE_DESCRIPTION =
  "Closer to the employer source. Still verify before tailoring.";
const JOB_BOARD_SOURCE_DESCRIPTION =
  "Job-board source. Verify on the employer page before tailoring.";
const COMMUNITY_SOURCE_DESCRIPTION =
  "Community job source. Verify on the employer page before tailoring.";

const SOURCE_GUIDANCE_BY_KEY: Record<string, JobSourceGuidance> = {
  greenhouse: {
    label: "Greenhouse hiring page",
    description: EMPLOYER_SOURCE_DESCRIPTION,
  },
  lever: {
    label: "Lever hiring page",
    description: EMPLOYER_SOURCE_DESCRIPTION,
  },
  ashby: {
    label: "Ashby hiring page",
    description: EMPLOYER_SOURCE_DESCRIPTION,
  },
  smartrecruiters: {
    label: "SmartRecruiters hiring page",
    description: EMPLOYER_SOURCE_DESCRIPTION,
  },
  usajobs: {
    label: "USAJobs official source",
    description: EMPLOYER_SOURCE_DESCRIPTION,
  },
  yc_startup: {
    label: "Y Combinator hiring page",
    description: EMPLOYER_SOURCE_DESCRIPTION,
  },
  linkedin: {
    label: "LinkedIn job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  indeed: {
    label: "Indeed job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  glassdoor: {
    label: "Glassdoor job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  ziprecruiter: {
    label: "ZipRecruiter job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  dice: {
    label: "Dice job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  simplyhired: {
    label: "SimplyHired job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  remoteok: {
    label: "Remote OK job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  weworkremotely: {
    label: "We Work Remotely job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  monster: {
    label: "Monster job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  careerbuilder: {
    label: "CareerBuilder job board",
    description: JOB_BOARD_SOURCE_DESCRIPTION,
  },
  hn_hiring: {
    label: "Who's Hiring thread",
    description: COMMUNITY_SOURCE_DESCRIPTION,
  },
  jobswithgpt: {
    label: "Connected job source",
    description: "From a connected local source. Verify on the employer page before tailoring.",
  },
  import: {
    label: "Saved by you",
    description: "Saved from a link you chose. Check the original posting before tailoring.",
  },
  manual: {
    label: "Saved by you",
    description: "Saved from a link you chose. Check the original posting before tailoring.",
  },
  manual_import: {
    label: "Saved by you",
    description: "Saved from a link you chose. Check the original posting before tailoring.",
  },
  builtin: {
    label: "Sample job",
    description: "Sample data for local review. Replace it with current postings before tailoring.",
  },
  test: {
    label: "Sample job",
    description: "Sample data for local review. Replace it with current postings before tailoring.",
  },
};

export function normalizeJobSourceKey(source: string) {
  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function titleCaseSource(source: string) {
  const cleaned = source.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!cleaned) {
    return "Unknown source";
  }

  return cleaned
    .split(" ")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "usa") return "USA";
      if (lower === "ok") return "OK";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function getJobSourceGuidance(source: string): JobSourceGuidance {
  const key = normalizeJobSourceKey(source);
  return SOURCE_GUIDANCE_BY_KEY[key] ?? {
    label: titleCaseSource(source),
    description:
      "Source label from this posting. Verify on the employer page before tailoring.",
  };
}

export function formatJobSourceLabel(source: string) {
  return getJobSourceGuidance(source).label;
}
