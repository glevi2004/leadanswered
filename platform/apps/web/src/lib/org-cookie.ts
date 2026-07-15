import type { OrgProfile } from "./data/org-profile";

/**
 * Client-side helpers for the demo "org profile" cookies (VISION-LU). Plain util
 * (no "use client") imported by client components — these write `document.cookie`.
 * Mirrors the server reader in `data/org-profile.ts`.
 */

export const ORG_MODE_COOKIE = "la_org"; // "off" | "mature" | "new"
export const ORG_PROFILE_COOKIE = "la_org_profile"; // JSON OrgProfile
const LEGACY_DEMO_COOKIE = "la_demo";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function writeCookie(name: string, value: string, maxAge = THIRTY_DAYS): void {
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};samesite=lax`;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

/** Set the active profile selector. Keeps the legacy `la_demo` path consistent. */
export function setActiveProfile(mode: "off" | "mature" | "new"): void {
  writeCookie(ORG_MODE_COOKIE, mode);
  if (mode !== "new") {
    // legacy isDemoMode path: Mature = demo fixtures on, everything else off
    writeCookie(LEGACY_DEMO_COOKIE, mode === "mature" ? "1" : "0");
  }
}

/** Persist an onboarded New profile and switch to it. */
export function writeOnboardedProfile(profile: OrgProfile): void {
  writeCookie(ORG_MODE_COOKIE, "new");
  writeCookie(ORG_PROFILE_COOKIE, encodeURIComponent(JSON.stringify(profile)));
  writeCookie(LEGACY_DEMO_COOKIE, "0");
}

/** Read + decode the current New profile from `document.cookie`, or null. */
export function readOnboardedProfileClient(): OrgProfile | null {
  const raw = readCookie(ORG_PROFILE_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as OrgProfile;
  } catch {
    return null;
  }
}

/** Every localStorage key that holds New-org state (data + workspace UI). */
const NEW_STATE_LOCAL_KEYS = [
  "la_demo_campaigns", // reviews launched from the wizard
  "sarah_widget_open",
  "sarah_widget_mode",
  "sarah_dock_width",
  "builder_chat_width",
  "schedule_show_availability",
  "schedule_show_posts",
];

/**
 * Clear the onboarded New profile AND all other New-org state, then start over —
 * the dev "reset workspace" button. Wipes the profile cookie (installed tools,
 * team, config) plus every localStorage key that persists workspace state, so
 * onboarding runs from a genuinely clean slate. (In-memory patch stores —
 * quotes/invoices/content/team drafts — reset on the full navigation below.)
 */
export function resetWorkspace(): void {
  writeCookie(ORG_PROFILE_COOKIE, "", 0);
  writeCookie(ORG_MODE_COOKIE, "new");
  writeCookie(LEGACY_DEMO_COOKIE, "0");
  try {
    for (const key of NEW_STATE_LOCAL_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* localStorage may be unavailable — the cookie reset already covers the core state */
  }
  window.location.href = "/dev/onboarding";
}

/** Shallow-merge a patch into the stored profile (deep-merging modules + setupSteps; dashboard replaced wholesale), rewrite, and return it. */
export function patchOnboardedProfile(patch: Partial<OrgProfile>): OrgProfile | null {
  const current = readOnboardedProfileClient();
  if (!current) return null;
  const merged: OrgProfile = {
    ...current,
    ...patch,
    modules: { ...current.modules, ...(patch.modules ?? {}) },
    setupSteps: { ...current.setupSteps, ...(patch.setupSteps ?? {}) },
    dashboard: patch.dashboard ?? current.dashboard,
  };
  writeOnboardedProfile(merged);
  return merged;
}
