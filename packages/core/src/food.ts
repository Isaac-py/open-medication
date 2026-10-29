import type { FoodRequirement } from "./types";

export function foodReminder(requirement: FoodRequirement): string {
  switch (requirement) {
    case "with_food":
      return "Take with food";
    case "empty_stomach":
      return "Take without food";
    case "no_preference":
      return "With or without food";
  }
}

/** Value stored when a reminder is accepted without opening the window. */
export function usualWithFood(requirement: FoodRequirement): boolean | null {
  switch (requirement) {
    case "with_food":
      return true;
    case "empty_stomach":
      return false;
    case "no_preference":
      return null;
  }
}
