/** Mounts private application providers behind native privacy admission. */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorReportingProvider } from "./providers/ErrorReportingProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { UndoProvider } from "./providers/UndoProvider";
import { AppPrivacy } from "./AppPrivacy";

async function prepareDevelopmentRuntime() {
  if (!import.meta.env.DEV) return;

  const runtime = await import("../dev-runtime/prepare");
  await runtime.prepareDevelopmentRuntime();
}

export async function startApp(root: HTMLElement) {
  await prepareDevelopmentRuntime();
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorReportingProvider>
        <ThemeProvider>
          <AppPrivacy>
            <ToastProvider>
              <UndoProvider>
                <App />
              </UndoProvider>
            </ToastProvider>
          </AppPrivacy>
        </ThemeProvider>
      </ErrorReportingProvider>
    </React.StrictMode>,
  );
}
