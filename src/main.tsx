import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, ToastProvider, UndoProvider, AnnouncerProvider } from "./contexts";
import { reportWebVitals } from "./utils/vitals";
import "./index.css";

// Report Web Vitals in development mode
reportWebVitals();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <UndoProvider>
          <AnnouncerProvider>
            <App />
          </AnnouncerProvider>
        </UndoProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
