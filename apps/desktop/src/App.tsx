import { useState } from "react";
import { History } from "./screens/History";
import { Medicines } from "./screens/Medicines";
import { Today } from "./screens/Today";

type Screen = "today" | "medicines" | "history";

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
        <button type="button" className={screen === "history" ? "" : "quiet"} onClick={() => setScreen("history")}>
          History
        </button>
      </nav>
      {screen === "today" ? <Today /> : null}
      {screen === "medicines" ? <Medicines /> : null}
      {screen === "history" ? <History /> : null}
    </main>
  );
}
