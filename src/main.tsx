import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { fetchAppSettings, applyFavicon } from "./lib/appSettings";

fetchAppSettings().then((s) => applyFavicon(s.favicon_url)).catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
