import { findCompanyDetails } from "./companyDirectory";
import type { CompanyInfo } from "./companyInfo";

export function getCompanyDetails(companyName: string): CompanyInfo {
  return (
    findCompanyDetails(companyName) ?? {
      name: companyName,
      description: `JobSentinel does not have local company details for ${companyName} yet.`,
    }
  );
}
