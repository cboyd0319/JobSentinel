/** Composes opportunity case actions with the resume military wording review. */

import { OpportunityCaseAction as CaseAction } from "../features/opportunity-case/OpportunityCaseAction";
import { MilitaryTransitionReviewModal } from "../features/resumes/library/MilitaryTransitionReviewModal";

export function OpportunityCaseAction({ jobHash }: { jobHash: string }) {
  return <CaseAction jobHash={jobHash} MilitaryReview={MilitaryTransitionReviewModal} />;
}
