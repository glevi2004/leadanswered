import type { LuModelProvider } from "@/lib/lu-models";

/**
 * Provider brand marks for the model picker — inline SVG so they're self-contained (no
 * external asset, CSP-safe) and theme-aware (they inherit `currentColor`, so they read in
 * light and dark without per-theme art). Monochrome by design: the app is editorial
 * monochrome, and a recognizable silhouette + the model label carry the brand.
 */

/** Anthropic — the Claude sunburst (an eight-point spark). */
function AnthropicMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {[0, 45, 90, 135].map((a) => (
        <rect key={a} x="10.85" y="2.5" width="2.3" height="19" rx="1.15" transform={`rotate(${a} 12 12)`} />
      ))}
    </svg>
  );
}

/** OpenAI — the interlocking knot. */
function OpenAIMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-3.997 2.9 6.05 6.05 0 0 0 .743 7.097 5.98 5.98 0 0 0 .52 4.91 6.05 6.05 0 0 0 6.51 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.06 6.06 0 0 0-.747-7.073zM13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 22.05a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071.006l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.11 7.2a.076.076 0 0 1 .071-.006l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.398-.671zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zM8.31 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v3l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

/** Google — the Gemini four-point star. */
function GeminiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2c.3 4.94 4.76 9.4 9.7 9.7v.6C16.76 12.6 12.3 17.06 12 22h-.6C11.1 17.06 6.64 12.6 1.7 12.3v-.6C6.64 11.4 11.1 6.94 11.4 2h.6z" />
    </svg>
  );
}

/** One provider's brand mark, sized by className, colored by currentColor. */
export function ProviderLogo({ provider, className }: { provider: LuModelProvider; className?: string }) {
  if (provider === "openai") return <OpenAIMark className={className} />;
  if (provider === "google") return <GeminiMark className={className} />;
  return <AnthropicMark className={className} />;
}
