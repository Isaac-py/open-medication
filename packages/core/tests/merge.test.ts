import { describe, expect, it } from "vitest";
import { mergeByUpdatedAt, mergeDoseLog } from "../src/merge";
import { doseLog, medication } from "./support";

describe("mergeDoseLog", () => {
  it("keeps a taken log over a missed one", () => {
    const taken = doseLog({ status: "taken" });
    const missed = doseLog({ id: "missed", status: "missed", takenAt: null, updatedAt: "2026-10-29T18:00:00.000Z" });
    expect(mergeDoseLog(missed, taken).status).toBe("taken");
  });

  it("keeps the earlier taken time when both devices say taken", () => {
    const earlier = doseLog({ takenAt: "2026-10-29T13:01:00.000Z", updatedAt: "2026-10-29T13:01:00.000Z" });
    const later = doseLog({
      id: "later",
      takenAt: "2026-10-29T13:20:00.000Z",
      updatedAt: "2026-10-29T13:20:00.000Z",
    });
    expect(mergeDoseLog(later, earlier).id).toBe(earlier.id);
  });

  it("keeps a newer edit when the taken time is the same", () => {
    const original = doseLog({ withFood: true, updatedAt: "2026-10-29T13:01:00.000Z" });
    const corrected = doseLog({
      id: "corrected",
      withFood: false,
      updatedAt: "2026-10-29T15:00:00.000Z",
    });
    expect(mergeDoseLog(original, corrected).withFood).toBe(false);
  });
});

describe("mergeByUpdatedAt", () => {
  it("keeps the medicine record that was edited last", () => {
    const older = medication({ name: "Old", updatedAt: "2026-10-01T00:00:00.000Z" });
    const newer = medication({ name: "New", updatedAt: "2026-10-29T00:00:00.000Z" });
    expect(mergeByUpdatedAt(older, newer).name).toBe("New");
  });
});
