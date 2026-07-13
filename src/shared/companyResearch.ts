import type { ReactNode } from "react";

export interface CompanyResearchPanelProps {
  companyName: string;
  onClose?: () => void;
}

export type RenderCompanyResearch = (
  props: CompanyResearchPanelProps,
) => ReactNode;
