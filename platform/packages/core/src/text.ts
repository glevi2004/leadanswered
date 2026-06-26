/**
 * Sanitize an outgoing SMS so it reads like a person texting. Deterministically
 * removes em/en dashes (the no-em-dash hard rule the model keeps slipping on) and
 * tidies whitespace. Applied to every Sarah-authored message before it's sent.
 */
export function sanitizeReply(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, " - ") // em/en dash → spaced hyphen
    .replace(/[ \t]{2,}/g, " ") // collapse runs of spaces/tabs
    .replace(/ +\n/g, "\n") // trailing spaces before newlines
    .trim();
}
