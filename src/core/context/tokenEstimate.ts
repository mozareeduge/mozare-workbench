/**
 * Deterministic conservative token estimate for local budgeting, ported from
 * scripts/context_compiler.py (TASK-P04-03). Provider-reported token counts
 * replace this estimate in telemetry when available; the estimate itself is a
 * budgeting input, not fake precision.
 */
export function estimateTokens(text: string): number {
  const words = countWords(text);
  const chars = [...text].length;
  return Math.max(1, Math.round(Math.max(words * 1.25, chars / 3.6)));
}

function countWords(text: string): number {
  // Word runs count as one token each; standalone symbols count individually
  // (matches Python re \w+|[^\w\s] with UNICODE semantics).
  const matches = text.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}\s_]/gu);
  return matches ? matches.length : 0;
}

/** Compact deterministic serialization used for packet size estimation. */
export function serializeCore(value: unknown): string {
  return JSON.stringify(value);
}
