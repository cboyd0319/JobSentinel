export interface CareerProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  salaryRange: string;
  salaryFloor: number;
  titleAllowlist: string[];
  titleBlocklist: string[];
  keywordsBoost: string[];
  keywordsExclude: string[];
  locationPreferences: {
    allow_remote: boolean;
    allow_hybrid: boolean;
    allow_onsite: boolean;
  };
  sampleTitles: string[];
}
