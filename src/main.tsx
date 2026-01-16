import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, ToastProvider, UndoProvider } from "./contexts";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <UndoProvider>
          <App />
        </UndoProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
