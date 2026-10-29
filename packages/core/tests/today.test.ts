import { describe, expect, it } from "vitest";
import { buildToday } from "../src/today";
import { doseLog, medication, schedule } from "./support";

describe("buildToday", () => {
  it("lists an upcoming dose with its food reminder", () => {
    const now = new Date(2026, 9, 29, 8, 0, 0);
    const [dose] = buildToday([medication()], [schedule()], [], now);

    expect(dose?.state).toBe("upcoming");
    expect(dose?.foodText).toBe("Take with food");
    expect(dose?.medicationName).toBe("Lisinopril");
    expect(dose?.streak).toBeNull();
  });

  it("marks a dose due inside the grace window", () => {
    const now = new Date(2026, 9, 29, 9, 20, 0);
    const [dose] = buildToday([medication()], [schedule()], [], now);
    expect(dose?.state).toBe("due");
  });

  it("shows a taken dose and a streak once two days are complete", () => {
    const now = new Date(2026, 9, 29, 9, 10, 0);
    const logs = [
      doseLog({
        id: "d27",
        scheduledFor: new Date(2026, 9, 27, 9, 0, 0).toISOString(),
        status: "taken",
      }),
      doseLog({
        id: "d28",
        scheduledFor: new Date(2026, 9, 28, 9, 0, 0).toISOString(),
        status: "taken",
      }),
      doseLog({ status: "taken", withFood: false }),
    ];
    const [dose] = buildToday([medication()], [schedule()], logs, now);

    expect(dose?.state).toBe("taken");
    expect(dose?.withFood).toBe(false);
    expect(dose?.streak).toBe(3);
  });

  it("hides an archived medicine", () => {
    const now = new Date(2026, 9, 29, 8, 0, 0);
    const doses = buildToday([medication({ archivedAt: "2026-10-01T00:00:00.000Z" })], [schedule()], [], now);
    expect(doses).toEqual([]);
  });
});
