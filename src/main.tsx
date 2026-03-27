import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error logging for debugging "Preview failed" on Lovable
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global window error:", { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = (event) => {
  console.error("Unhandled promise rejection:", event.reason);
};

createRoot(document.getElementById("root")!).render(<App />);

