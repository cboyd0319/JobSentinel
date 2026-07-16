import { getArg } from "../../mocks/handlers/commandHelpers";
import type { MockConfig } from "../../mocks/handlers/types";

interface MockOnboardingCommandState {
  config: MockConfig;
}

export interface MockOnboardingCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockOnboardingCommandState;
  value: unknown;
}

export function handleMockOnboardingCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockOnboardingCommandState,
): MockOnboardingCommandResult {
  switch (command) {
    case "is_first_run":
      return withoutSave(state, false);
    case "complete_setup": {
      const setupConfig = getArg(args, "config");
      if (!setupConfig || typeof setupConfig !== "object") {
        return withoutSave(state, undefined);
      }
      return {
        handled: true,
        shouldSave: true,
        state: {
          config: { ...state.config, ...(setupConfig as Partial<MockConfig>) },
        },
        value: undefined,
      };
    }
    default:
      return { handled: false, shouldSave: false, state, value: undefined };
  }
}

function withoutSave(
  state: MockOnboardingCommandState,
  value: unknown,
): MockOnboardingCommandResult {
  return { handled: true, shouldSave: false, state, value };
}
