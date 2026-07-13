import React from "react";
import ReactDOM from "react-dom/client";
import {
  AnnouncerProvider,
  ErrorReportingProvider,
  ThemeProvider,
  ToastProvider,
  UndoProvider,
} from "../contexts";
import App from "./App";

async function prepareDevelopmentRuntime() {
  if (!import.meta.env.DEV) return;

  void import("../utils/vitals").then(({ reportWebVitals }) => {
    reportWebVitals();
  });
  const { setupMocking } = await import("../mocks");
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
              <AnnouncerProvider>
                <App />
              </AnnouncerProvider>
            </UndoProvider>
          </ToastProvider>
        </ThemeProvider>
      </ErrorReportingProvider>
    </React.StrictMode>,
  );
}
