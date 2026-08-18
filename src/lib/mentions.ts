export type MentionSegment = { type: "text" | "mention"; value: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits a chat/comment body into plain-text and @mention segments, so the
 * renderer can highlight mentions without needing a rich-text editor or a
 * stored markup format — mentions are just "@ExactMemberName" in the plain
 * text, matched back against the project's current member list.
 */
export function parseMentionSegments(text: string, memberNames: string[]): MentionSegment[] {
  const names = memberNames.filter(Boolean);
  if (names.length === 0) return [{ type: "text", value: text }];

  // Longest names first so "Ann" doesn't shadow a match for "Ann Marie".
  const pattern = new RegExp(
    `@(${[...names].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})\\b`,
    "g"
  );

  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "mention", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

/** Just the distinct names actually @mentioned in `text` — for hooking up
 * mention notifications without re-implementing the matching logic. */
export function extractMentionedNames(text: string, memberNames: string[]): string[] {
  const names = parseMentionSegments(text, memberNames)
    .filter((s) => s.type === "mention")
    .map((s) => s.value.slice(1));
  return [...new Set(names)];
}
