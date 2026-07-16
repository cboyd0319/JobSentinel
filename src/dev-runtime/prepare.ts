import { setupMocking } from "./mocks";
import { reportWebVitals } from "./vitals";

export async function prepareDevelopmentRuntime(): Promise<void> {
  reportWebVitals();
  await setupMocking();
}
