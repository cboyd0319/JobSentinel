import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, ToastProvider } from "./contexts";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
