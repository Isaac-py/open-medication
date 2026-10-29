import type { DoseLog } from "./types";

const statusRank: Record<DoseLog["status"], number> = {
  taken: 3,
  skipped: 2,
  missed: 1,
};

export function mergeDoseLog(left: DoseLog, right: DoseLog): DoseLog {
  if (left.status === "taken" && right.status === "taken") {
    const leftTaken = left.takenAt ? Date.parse(left.takenAt) : Number.POSITIVE_INFINITY;
    const rightTaken = right.takenAt ? Date.parse(right.takenAt) : Number.POSITIVE_INFINITY;
    if (leftTaken !== rightTaken) return leftTaken < rightTaken ? left : right;
  } else if (left.status !== right.status) {
    return statusRank[left.status] >= statusRank[right.status] ? left : right;
  }
  return Date.parse(left.updatedAt) >= Date.parse(right.updatedAt) ? left : right;
}

export function mergeByUpdatedAt<T extends { updatedAt: string }>(left: T, right: T): T {
  return Date.parse(left.updatedAt) >= Date.parse(right.updatedAt) ? left : right;
}
