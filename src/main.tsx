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
import { reportWebVitals } from "./utils/vitals";
import "./index.css";

// Report Web Vitals in development mode
reportWebVitals();

// Enable API mocking in development (when running in browser without Tauri)
async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API === "true") {
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
