// Client analytics runtime (PostHog): a small self-hosted consent banner, the
// consent-gated PostHog loader, the auto-events, and the delegated data-track
// handler. See ANALYTICS-PLAN.md.
//
// Gated on PUBLIC_POSTHOG_KEY being set (env). With it unset the whole module is a
// no-op, so the site ships clean until the key is added in Vercel.

import { track, pageType } from "../lib/analytics";

const env = import.meta.env as unknown as Record<string, string | undefined>;
const POSTHOG_KEY = env.PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = env.PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

const analyticsConfigured = Boolean(POSTHOG_KEY);

const CONSENT_KEY = "la_consent"; // stored value: "granted" | "denied"
function readConsent(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}
function writeConsent(v: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* private mode */
  }
}

/* --------------------------- PostHog (loaded on consent) ------------------------- */
let posthogOn = false;
async function loadPostHog(key: string, host: string) {
  if (posthogOn) return;
  posthogOn = true;
  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    api_host: host,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
  });
  (window as unknown as { posthog: unknown }).posthog = posthog;
}

function applyConsent(granted: boolean) {
  track("consent_update", { analytics: granted });
  if (granted && POSTHOG_KEY) loadPostHog(POSTHOG_KEY, POSTHOG_HOST);
}

/* --------------------------------- consent banner -------------------------------- */
const BANNER_CSS = `
.la-consent{position:fixed;left:16px;bottom:16px;z-index:2147483000;max-width:370px;background:#fff;
  border:1px solid rgba(16,24,40,.08);border-radius:16px;box-shadow:0 20px 55px -20px rgba(16,24,40,.35);
  padding:18px;animation:la-consent-in .35s ease both;}
.la-consent p{font-size:13.5px;line-height:1.55;color:#5e616e;margin:0 0 14px;}
.la-consent a{color:#1a9c3e;font-weight:600;text-decoration:none;}
.la-consent a:hover{text-decoration:underline;}
.la-consent-btns{display:flex;gap:8px;justify-content:flex-end;}
.la-consent button{font-size:13px;font-weight:600;border-radius:9px;padding:8px 16px;cursor:pointer;
  border:1px solid #e3e7ee;background:#fff;color:#1c1d22;transition:background .15s,border-color .15s;}
.la-consent button:hover{background:#f5f7fa;}
.la-consent button.la-accept{background:linear-gradient(180deg,#4be06a,#30d158);border-color:#22b94a;color:#fff;}
.la-consent button.la-accept:hover{background:linear-gradient(180deg,#3ed95f,#22b94a);}
@keyframes la-consent-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (max-width:480px){.la-consent{left:12px;right:12px;bottom:12px;max-width:none}}
@media (prefers-reduced-motion:reduce){.la-consent{animation:none}}`;

function showBanner() {
  const style = document.createElement("style");
  style.textContent = BANNER_CSS;
  document.head.appendChild(style);

  const el = document.createElement("div");
  el.className = "la-consent";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Cookie consent");
  el.innerHTML = `
    <p>We use privacy-friendly analytics to see how the site is used and make it better.
       No ads, and we never sell your data. <a href="/privacy">Privacy policy</a>.</p>
    <div class="la-consent-btns">
      <button type="button" class="la-decline">Decline</button>
      <button type="button" class="la-accept">Accept</button>
    </div>`;
  document.body.appendChild(el);

  const decide = (granted: boolean) => {
    writeConsent(granted ? "granted" : "denied");
    applyConsent(granted);
    el.remove();
  };
  el.querySelector(".la-accept")!.addEventListener("click", () => decide(true));
  el.querySelector(".la-decline")!.addEventListener("click", () => decide(false));
}

function initConsent() {
  const stored = readConsent();
  if (stored === "granted" || stored === "denied") {
    applyConsent(stored === "granted"); // returning visitor — honor prior choice
    return;
  }
  if (document.body) showBanner();
  else document.addEventListener("DOMContentLoaded", showBanner, { once: true });
}

/* --------------------------------- auto events ---------------------------------- */
function initAutoEvents() {
  const path = location.pathname;
  track("page_view", {
    page_path: path,
    page_type: pageType(path),
    page_title: document.title,
    referrer: document.referrer || "(direct)",
  });

  const marks = [25, 50, 75, 90];
  const fired = new Set<number>();
  const onScroll = () => {
    const dh = document.documentElement.scrollHeight - window.innerHeight;
    if (dh <= 0) return;
    const pct = (window.scrollY / dh) * 100;
    for (const m of marks) {
      if (pct >= m && !fired.has(m)) {
        fired.add(m);
        track("scroll_depth", { percent: m, page_path: path });
      }
    }
    if (fired.size === marks.length) window.removeEventListener("scroll", onScroll);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  const sections = document.querySelectorAll<HTMLElement>("[data-section]");
  if (sections.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            track("section_view", { section: (e.target as HTMLElement).dataset.section, page_path: path });
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    sections.forEach((s) => io.observe(s));
  }
}

/* ----------------------- delegated data-track + outbound ------------------------ */
function initClickTracking() {
  document.addEventListener(
    "click",
    (ev) => {
      const target = ev.target as HTMLElement;

      const el = target.closest<HTMLElement>("[data-track]");
      if (el) {
        const event = el.dataset.track!;
        const params: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(el.dataset)) {
          if (k === "track") continue;
          params[k.replace(/([A-Z])/g, "_$1").toLowerCase()] = v;
        }
        track(event, params);
      }

      const a = target.closest<HTMLAnchorElement>("a[href]");
      if (a && a.href) {
        if (a.href.includes("cal.com")) {
          track("book_call_outbound", { cta_location: a.dataset.ctaLocation || "unknown" });
        } else if (a.host && a.host !== location.host && !a.href.startsWith("mailto:")) {
          track("outbound_click", { href: a.href, link_domain: a.host });
        }
      }
    },
    { capture: true },
  );
}

/* ------------------------------------ boot -------------------------------------- */
if (analyticsConfigured) {
  initConsent();
  initAutoEvents();
  initClickTracking();
}
