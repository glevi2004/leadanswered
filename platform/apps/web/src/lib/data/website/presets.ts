import type { ComponentType } from "react";
import { BookOpen, CalendarClock, LayoutTemplate, LockKeyhole } from "lucide-react";
import type { SeoSnapshot, Site, SiteBundle, SitePage, SitePresetId, SiteVersion } from "./types";

/**
 * Preset starters (03-website, multi-site): the generalization of the old single
 * `emptySiteBundle`. Each preset stamps out a light starter Site — a distinct
 * home-page (and a page or two) per template — that a freshly-created site opens
 * in the builder. Real content lands as the owner texts the assistant; the mock
 * seam previews every new site as the blank /p/demo_v0 canvas.
 *
 * Client-safe on purpose (types + lucide only) so the browse picker can import
 * the metadata directly — no server-only deps.
 */

export interface SitePreset {
  id: SitePresetId;
  label: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
  /** Build a fresh starter bundle for this org (unique ids per call). */
  build(orgId: string): SiteBundle;
}

/** Unique-enough ids for locally-created demo sites (mock seam — no real backend). */
let seq = 0;
const freshSiteId = (preset: SitePresetId) => `site_${preset}_${Date.now().toString(36)}${(++seq).toString(36)}`;

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site";

/** The shared starter skeleton — one published v0, a home page, empty SEO + chat. */
function starter(
  orgId: string,
  preset: SitePresetId,
  name: string,
  pages: Array<{ title: string; path: string }>,
): SiteBundle {
  const now = new Date().toISOString();
  const siteId = freshSiteId(preset);
  const versionId = `${siteId}_v0`;

  const site: Site = {
    id: siteId,
    organizationId: orgId,
    name,
    preset,
    published: false,
    customDomain: undefined,
    domain: `${slugify(name)}.lu.computer`,
    status: "building",
    publishedVersionId: versionId,
    previewUrl: "/p/demo_v0", // blank starter canvas (03 §5 mock token)
    visits30d: 0,
    visitsSeries: Array(30).fill(0),
    leadsFromSite30d: 0,
    leadsSeries: Array(30).fill(0),
  };

  const versions: SiteVersion[] = [
    { id: versionId, siteId, number: 0, summary: "Starter site", createdAt: now, publishedAt: now, editIds: [] },
  ];

  const sitePages: SitePage[] = pages.map((p, i) => ({
    id: `${siteId}_pg${i}`,
    siteId,
    title: p.title,
    path: p.path,
    status: "building",
    updatedAt: now,
    updatedBy: "system",
  }));

  const seo: SeoSnapshot = {
    siteId,
    checkedAt: now,
    keywords: [],
    gbp: { connected: false },
    aiAnswers: { visible: false, sentence: "" },
    plumbing: [],
  };

  return { site, versions, pages: sitePages, seo, chat: [] };
}

export const SITE_PRESETS: SitePreset[] = [
  {
    id: "marketing",
    label: "Marketing site",
    blurb: "A fast landing page that turns visitors into leads — hero, services, contact.",
    icon: LayoutTemplate,
    build: (orgId) =>
      starter(orgId, "marketing", "New marketing site", [
        { title: "Home", path: "/" },
        { title: "Services", path: "/services" },
        { title: "Contact", path: "/contact" },
      ]),
  },
  {
    id: "booking",
    label: "Booking site",
    blurb: "Let customers pick a time. Every booking flows straight to your schedule.",
    icon: CalendarClock,
    build: (orgId) =>
      starter(orgId, "booking", "New booking site", [
        { title: "Book", path: "/" },
        { title: "Services", path: "/services" },
      ]),
  },
  {
    id: "blog",
    label: "Blog",
    blurb: "Publish updates and job stories — the assistant drafts posts from your photos.",
    icon: BookOpen,
    build: (orgId) =>
      starter(orgId, "blog", "New blog", [
        { title: "Home", path: "/" },
        { title: "Posts", path: "/posts" },
      ]),
  },
  {
    id: "portal",
    label: "Client portal",
    blurb: "A signed-in space where customers see quotes, invoices, and job progress.",
    icon: LockKeyhole,
    build: (orgId) =>
      starter(orgId, "portal", "New client portal", [
        { title: "Dashboard", path: "/" },
        { title: "Documents", path: "/documents" },
      ]),
  },
];

export const getPreset = (id: SitePresetId): SitePreset | undefined => SITE_PRESETS.find((p) => p.id === id);

/** Card metadata for a preset id (label) — used to badge browse cards. */
export const presetLabel = (id?: SitePresetId): string =>
  (id && getPreset(id)?.label) || "Site";
