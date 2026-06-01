export interface NoJobsEmptyStateCopy {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  helperText: string;
  firstStepTitle: string;
  firstStepDescription: string;
}

export function getNoJobsEmptyStateCopy(
  anyJobSourceEnabled: boolean | null,
): NoJobsEmptyStateCopy {
  if (anyJobSourceEnabled === false) {
    return {
      title: "Turn on job sources",
      subtitle:
        "JobSentinel needs at least one source before it can find roles for you.",
      primaryLabel: "Turn On Job Sources",
      secondaryLabel: "Import a Job Posting",
      helperText:
        "In Settings, open More Settings and turn on Additional Job Boards. You can also paste a job posting now.",
      firstStepTitle: "Choose sources",
      firstStepDescription: "Turn on sources that fit your search",
    };
  }

  return {
    title: "No jobs yet",
    subtitle: "Search for fresh roles, import a posting, or adjust your preferences.",
    primaryLabel: "Search Now",
    secondaryLabel: "Adjust Search Preferences",
    helperText:
      "If a search comes back empty, broaden the role title, location, or pay floor.",
    firstStepTitle: "Search selected job sites",
    firstStepDescription: "JobSentinel checks them on your schedule",
  };
}
