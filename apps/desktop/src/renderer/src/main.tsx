import "@ride/ui/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import App from "./App";
import { MyDashboard } from "./components/MyDashboard";

loader.config({ monaco });

const isDashboardWindow = window.location.hash === "#dashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isDashboardWindow ? <MyDashboard /> : <App />}
  </React.StrictMode>,
);
