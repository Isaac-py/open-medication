import { describe, expect, it } from "vitest";
import { foodReminder, usualWithFood } from "../src/food";

describe("food rules", () => {
  it("describes how a dose should be taken", () => {
    expect(foodReminder("with_food")).toBe("Take with food");
    expect(foodReminder("empty_stomach")).toBe("Take without food");
    expect(foodReminder("no_preference")).toBe("With or without food");
  });

  it("uses the usual food rule when a dose is logged from a reminder", () => {
    expect(usualWithFood("with_food")).toBe(true);
    expect(usualWithFood("empty_stomach")).toBe(false);
    expect(usualWithFood("no_preference")).toBeNull();
  });
});
