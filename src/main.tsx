import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  ThemeProvider,
  ToastProvider,
  UndoProvider,
  AnnouncerProvider,
  ErrorReportingProvider,
} from "./contexts";
import "./index.css";

// Lazy-load Web Vitals to reduce main bundle size
if (import.meta.env.DEV) {
  import("./utils/vitals").then(({ reportWebVitals }) => {
    reportWebVitals();
  });
}

// Enable API mocking in development (when running in browser without Tauri)
async function enableMocking() {
  // Use setupMocking which auto-detects when mocking is needed
  // (either VITE_MOCK_API=true or running in browser without Tauri in DEV mode)
  if (import.meta.env.DEV) {
    const { setupMocking } = await import("./mocks");
    await setupMocking();
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
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
    </React.StrictMode>
  );
});
