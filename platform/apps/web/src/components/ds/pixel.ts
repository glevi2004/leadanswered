import type { CSSProperties } from "react";

/** Shared pixel vocabulary — ramp color + the beveled/glowing LED cell style. */

export function rampColor(frac: number) {
  const hue = 135 - Math.min(Math.max(frac, 0), 1) * 131; // green(135)→amber→red(4)
  return `hsl(${hue} 72% 48%)`;
}

export const SOLID: Record<string, string> = {
  green: "hsl(145 64% 45%)",
  blue: "hsl(214 88% 58%)",
  violet: "hsl(258 80% 65%)",
  amber: "hsl(38 92% 52%)",
  ink: "var(--primary)",
};

/**
 * cellStyle — a single pixel cell. `screen` = the gameful LCD look: lit cells are
 * beveled + colored-glow LEDs, unlit cells are near-dark. Off-screen (editorial)
 * keeps the softer paper look for clean stat cards.
 */
export function cellStyle(color: string, on: boolean, screen: boolean): CSSProperties {
  if (!on) {
    return {
      background: screen ? "rgb(255 255 255 / 0.05)" : "color-mix(in oklab, var(--foreground) 12%, transparent)",
      boxShadow: screen ? "inset 0 0 0 1px rgb(0 0 0 / 0.35)" : "inset 0 1px 1px rgb(0 0 0 / 0.05)",
    };
  }
  return {
    background: color,
    // middle-ground: an embossed pixel (soft top-left light, bottom-right shade)
    // — depth + squarer game feel, but no dark screen / neon (that's the `screen` opt-in).
    boxShadow: screen
      ? `inset 1px 1px 0 rgb(255 255 255 / 0.6), inset -1px -1px 1px rgb(0 0 0 / 0.5), 0 0 4px ${color}, 0 0 1px ${color}`
      : "inset 1px 1px 0 rgb(255 255 255 / 0.45), inset -1px -1px 1px rgb(0 0 0 / 0.22)",
  };
}
