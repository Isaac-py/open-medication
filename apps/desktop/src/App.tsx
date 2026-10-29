import { useState } from "react";
import { Medicines } from "./screens/Medicines";
import { Today } from "./screens/Today";

type Screen = "today" | "medicines";

export function App() {
  const [screen, setScreen] = useState<Screen>("today");

  return (
    <main className="shell">
      <nav className="nav">
        <button type="button" className={screen === "today" ? "" : "quiet"} onClick={() => setScreen("today")}>
          Today
        </button>
        <button type="button" className={screen === "medicines" ? "" : "quiet"} onClick={() => setScreen("medicines")}>
          Medicines
        </button>
      </nav>
      {screen === "today" ? <Today /> : <Medicines />}
    </main>
  );
}
