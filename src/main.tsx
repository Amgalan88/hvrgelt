
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { initInstallCapture, registerServiceWorker } from "./app/lib/install";

  // Апп суулгах санал эрт ирдэг тул React-аас өмнө барьж авна
  initInstallCapture();
  registerServiceWorker();

  createRoot(document.getElementById("root")!).render(<App />);
  