import React from "react";
import ReactDOM from "react-dom/client";
import LiveLookIn from "./live-look-in-v4.jsx";

// Inject global pulse animation
const style = document.createElement("style");
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LiveLookIn />
  </React.StrictMode>
);
