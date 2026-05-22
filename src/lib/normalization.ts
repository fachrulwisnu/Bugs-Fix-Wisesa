/**
 * Normalization utilities for Wisesa BugTracker Pro
 */

export const STATUS_PATTERNS = {
  DONE: /(don|done|doone|donee|dne|selesai|finish|finished|closed|close)/i,
  ON_PROGRESS: /(on[- ]?progress|progress|sedang|jalan|progres|prog|dev|work)/i,
  ON_QUEUE: /(on[- ]?queue|queue|waiting|onQueueu|antre|tunggu|pending|hold)/i,
};

export function normalizeStatus(val: string | null | undefined): string {
  const s = String(val || "").trim();
  if (!s) return "UNMAPPED";

  if (STATUS_PATTERNS.DONE.test(s)) return "DONE";
  if (STATUS_PATTERNS.ON_PROGRESS.test(s)) return "ON PROGRESS";
  if (STATUS_PATTERNS.ON_QUEUE.test(s)) return "ON QUEUE";

  return "UNMAPPED";
}

export function isPeriodeMissing(val: string | null | undefined): boolean {
  if (!val) return true;
  const s = String(val).trim().toUpperCase();
  return s === "" || s === "ORPHANED" || s === "-";
}
