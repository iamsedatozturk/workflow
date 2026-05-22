import { createRoot } from "react-dom/client";
import { Dashboard } from "./components/Dashboard";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

try {
  createRoot(rootElement).render(<Dashboard />);
} catch (error) {
  const errorMessage =
    error instanceof Error ? error.stack || error.message : String(error);

  rootElement.innerHTML = `
    <main style="padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937">
      <h1>Sayfa yuklenemedi</h1>
      <pre style="white-space:pre-wrap;background:#fff;border:1px solid #d8dee8;border-radius:8px;padding:16px">${errorMessage}</pre>
    </main>
  `;
  throw error;
}
