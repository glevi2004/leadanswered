/** Content-owned types (04-content §4). All `map from: none (new)` — no tables exist yet. */

export type PostStatus = "draft" | "scheduled" | "published" | "declined";

export interface PostPhoto {
  id: string;
  url: string; // maps from: Twilio MMS media (mock: "placeholder:" scheme → gradient tile)
  alt: string; // Sarah writes these (SEO)
  width?: number;
  height?: number;
}

export interface Post {
  id: string; // maps from: none (new Post table)
  title: string;
  slug: string;
  bodyMd: string; // markdown; rendered in-app and on the client site
  excerpt: string; // first-line teaser for cards
  photos: PostPhoto[];
  seo: { metaTitle: string; metaDescription: string };
  status: PostStatus;
  approvalId?: string; // pending Approval (kind 'post'); the drafts-list join
  contactId?: string; // the job's customer (e.g. ct_dana) — links to /customers/[id]
  sourceSummary?: string; // "From 4 photos Marcus texted after the Miller job"
  socialPostId?: string; // paired Facebook variant, if Sarah drafted one
  scheduledFor?: string; // ISO; set by Schedule…
  publishedAt?: string; // ISO
  publishedUrl?: string; // maps from: Site domain (03-website) + slug
  stats?: { views: number; clicks: number }; // stub; site analytics (later)
  createdAt: string;
}

export type SocialNetwork = "facebook" | "instagram" | "gbp"; // facebook only at launch

export type SocialPostStatus = "draft" | "scheduled" | "posted" | "declined" | "failed";

export interface SocialPost {
  id: string; // maps from: none (new SocialPost table)
  postId?: string; // parent blog post; optional → standalone posts later
  network: SocialNetwork;
  body: string; // the shorter, casual variant
  photoIds: string[]; // subset of the parent Post.photos
  status: SocialPostStatus;
  approvalId?: string; // pending Approval (kind 'social_post')
  scheduledFor?: string;
  postedAt?: string;
  permalink?: string; // maps from: Meta Graph API response (later)
  stats?: { likes: number; comments: number; shares: number }; // stub; Meta insights (later)
  createdAt: string;
}
