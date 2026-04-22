import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

import { SocketProvider } from "./context/SocketContext.jsx";

// Handle Vite chunk load errors gracefully after a new deployment
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason &&
    event.reason.message &&
    event.reason.message.includes("Failed to fetch dynamically imported module")
  ) {
    event.preventDefault();
    window.location.reload();
  }
});
createRoot(document.getElementById("root")).render(
  <SocketProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </SocketProvider>
);
