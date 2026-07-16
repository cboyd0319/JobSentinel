import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorReportingProvider } from "./providers/ErrorReportingProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { UndoProvider } from "./providers/UndoProvider";

async function prepareDevelopmentRuntime() {
  if (!import.meta.env.DEV) return;

  void import("./vitals").then(({ reportWebVitals }) => {
    reportWebVitals();
  });
  const { setupMocking } = await import("../test-support/mocks");
  await setupMocking();
}

export async function startApp(root: HTMLElement) {
  await prepareDevelopmentRuntime();
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorReportingProvider>
        <ThemeProvider>
          <ToastProvider>
            <UndoProvider>
              <App />
            </UndoProvider>
          </ToastProvider>
        </ThemeProvider>
      </ErrorReportingProvider>
    </React.StrictMode>,
  );
}
