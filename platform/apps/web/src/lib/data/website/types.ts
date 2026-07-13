/** Website-owned types (03-website §4). All `map from: none (new)` — no tables exist yet. */

export interface Site {
  id: string;
  organizationId: string;
  domain: string; // "apexroofingma.com"
  status: "building" | "live";
  publishedVersionId: string;
  draftVersionId?: string; // at most ONE open draft
  previewUrl: string; // tokenized /p/[token] — serves the in-app iframe AND Sarah's texted link
  visits30d: number;
  visitsSeries: number[]; // daily, last 30 days
  leadsFromSite30d: number; // derived: count Lead.source='website' in window
  leadsSeries: number[]; // daily new site leads; the card charts the cumulative climb
}

export interface SitePage {
  id: string;
  siteId: string;
  title: string; // "Home", "Roof Replacement", "Gallery"
  path: string; // "/", "/roof-replacement"
  status: "live" | "building";
  updatedAt: string;
  updatedBy: "sarah" | "system";
}

export interface SiteVersion {
  id: string;
  siteId: string;
  number: number; // v14
  summary: string; // "Added a Copper gutters section to Services"
  createdAt: string;
  publishedAt?: string; // unset = the open draft or a superseded draft
  editIds: string[];
}

/** One instruction Sarah applied. */
export interface SiteEdit {
  id: string;
  versionId: string;
  instruction: string; // the owner's words, verbatim
  summary: string; // what Sarah actually did
  pageIds: string[];
  status: "draft" | "published" | "discarded";
  approvalId?: string; // set only for off-page asks (Approval kind 'site_edit')
  at: string;
}

export interface SeoSnapshot {
  siteId: string;
  checkedAt: string;
  keywords: Array<{ term: string; position: number | null; delta: number }>;
  gbp: { connected: boolean; rating?: number; reviewCount?: number };
  aiAnswers: { visible: boolean; sentence: string }; // the one human sentence
  plumbing: Array<{ label: string; ok: boolean }>; // structured data, llms.txt, sitemap…
}
