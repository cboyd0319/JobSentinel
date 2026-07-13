import type { CompanyInfo } from "./companyInfo";
import { digitalEmployers } from "./directory/digitalEmployers";
import { serviceAndPublicEmployers } from "./directory/serviceAndPublicEmployers";
import { specializedEmployers } from "./directory/specializedEmployers";

const COMPANY_DIRECTORY: Readonly<Record<string, Partial<CompanyInfo>>> = {
  ...serviceAndPublicEmployers,
  ...digitalEmployers,
  ...specializedEmployers,
};

export function findCompanyDetails(companyName: string): CompanyInfo | null {
  const normalizedName = companyName.toLowerCase().trim();
  const match = Object.entries(COMPANY_DIRECTORY).find(
    ([key]) => normalizedName.includes(key) || key.includes(normalizedName),
  );

  return match ? { name: companyName, ...match[1] } : null;
}
