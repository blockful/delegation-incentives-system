const MAX_TITLE_LENGTH = 200;

/**
 * Extract a proposal title from a markdown description.
 *
 * Ported from anticapture/apps/indexer/src/eventHandlers/voting.ts.
 *
 * Strategy:
 *   1. Normalize literal "\n" sequences to real newlines (some proposers
 *      submit descriptions with escaped newlines).
 *   2. If the first non-empty line is an H1 ("# Title"), use it.
 *   3. Otherwise, use the first non-empty, non-header line, truncated to
 *      MAX_TITLE_LENGTH characters.
 */
export function parseProposalTitle(description: string): string {
  const normalized = description.replace(/\\n/g, "\n");
  const lines = normalized.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^# /.test(trimmed)) {
      return trimmed.replace(/^# +/, "");
    }
    break;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^#{1,6}\s/.test(trimmed)) continue;
    return trimmed.length > MAX_TITLE_LENGTH
      ? trimmed.substring(0, MAX_TITLE_LENGTH) + "..."
      : trimmed;
  }

  return "";
}
