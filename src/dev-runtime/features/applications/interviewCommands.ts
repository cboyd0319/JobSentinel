import {
  getMockInterviewFollowup,
  getMockInterviewPrepChecklist,
  saveMockInterviewFollowup,
  saveMockInterviewPrepItem,
} from "./interviewProgress";
import type {
  MockInterviewFollowUpState,
  MockInterviewPrepState,
} from "./interviewProgress";

interface MockInterviewProgressState {
  interviewPrepChecklists: MockInterviewPrepState;
  interviewFollowups: MockInterviewFollowUpState;
}

interface MockInterviewCommandResult {
  handled: boolean;
  value: unknown;
  state: MockInterviewProgressState;
  shouldSave: boolean;
}

export function handleMockInterviewCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockInterviewProgressState,
): MockInterviewCommandResult {
  switch (command) {
    case "get_interview_prep_checklist":
      return result(
        getMockInterviewPrepChecklist(args, state.interviewPrepChecklists),
        state,
      );
    case "save_interview_prep_item":
      return result(
        undefined,
        {
          ...state,
          interviewPrepChecklists: saveMockInterviewPrepItem(
            args,
            state.interviewPrepChecklists,
          ),
        },
        true,
      );
    case "get_interview_followup":
      return result(getMockInterviewFollowup(args, state.interviewFollowups), state);
    case "save_interview_followup": {
      const saved = saveMockInterviewFollowup(args, state.interviewFollowups);
      return result(
        saved.followup,
        { ...state, interviewFollowups: saved.state },
        true,
      );
    }
    default:
      return { handled: false, value: undefined, state, shouldSave: false };
  }
}

function result(
  value: unknown,
  state: MockInterviewProgressState,
  shouldSave = false,
): MockInterviewCommandResult {
  return { handled: true, value, state, shouldSave };
}
