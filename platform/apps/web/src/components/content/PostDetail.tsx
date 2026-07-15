"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Globe, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import { FacebookMark } from "./FacebookMark";
import { toast } from "sonner";
import type { Post, PostPhoto, SocialPost } from "@/lib/data/content/types";
import { patchContent, withContentPatch } from "@/lib/data/content/state";
import { PhoneFrame } from "@/components/app/PhoneFrame";
import { PhotoTile } from "@/components/app/PhotoStrip";
import { MarkdownView } from "@/components/app/MarkdownView";
import { KIND_META } from "@/components/app/ApprovalCard";
import { statusChip } from "@/lib/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The preview surface (04 §2, redesigned): the artifact rendered in a
 * PhoneFrame — a Facebook post as the app shows it, a blog post as the mobile
 * article on apexroofingma.com. Approve / Edit / Schedule / Decline live
 * beside the phone; Edit flips the phone screen editable in place.
 */

export type PreviewItem =
  | { kind: "post"; post: Post; photos: PostPhoto[] }
  | { kind: "social"; social: SocialPost; photos: PostPhoto[] };

const CONTACT_NAMES: Record<string, string> = { ct_dana: "Dana Miller" };

/* ------------------------------ phone screens ------------------------------ */

function FacebookScreen({
  body,
  photos,
  stats,
  postedAt,
}: {
  body: string;
  photos: PostPhoto[];
  stats?: SocialPost["stats"];
  postedAt?: string;
}) {
  return (
    <div className="flex min-h-full flex-col bg-zinc-100">
      {/* app bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5">
        <span className="flex items-center gap-2">
          <FacebookMark className="size-7" />
          <span className="text-[22px] font-extrabold tracking-tight text-[#1877F2]">facebook</span>
        </span>
        <span className="flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-8 rounded-full bg-zinc-200" />
          ))}
        </span>
      </div>
      {/* the post */}
      <div className="mt-2 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-sm font-bold text-white">
            A
          </span>
          <div>
            <p className="text-[15px] font-semibold text-zinc-900">Apex Roofing</p>
            <p className="flex items-center gap-1 text-[12px] text-zinc-500">
              {postedAt
                ? new Date(postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Just now"}{" "}
              · <Globe className="size-3" />
            </p>
          </div>
        </div>
        <p className="mt-2.5 whitespace-pre-line text-[15px] leading-[1.4] text-zinc-900">{body}</p>
        {photos.length > 0 && (
          <div className={cn("mt-2.5 grid gap-1", photos.length > 1 && "grid-cols-2")}>
            {photos.map((p, i) => (
              <PhotoTile key={p.id} photo={p} index={i} className="aspect-[4/3] rounded-md" />
            ))}
          </div>
        )}
        <p className="mt-2.5 text-[12px] text-zinc-500">
          {stats ? `👍 ${stats.likes} · ${stats.comments} comments · ${stats.shares} shares` : "Be the first to like this"}
        </p>
        <div className="mt-2 flex items-center justify-around border-t border-zinc-100 pt-2 text-[13px] font-medium text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="size-4" /> Like
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="size-4" /> Comment
          </span>
          <span className="flex items-center gap-1.5">
            <Share2 className="size-4" /> Share
          </span>
        </div>
      </div>
      {/* the feed continues — a skeleton next post so the screen never dead-ends */}
      <div className="mt-2 flex-1 bg-white px-4 py-3" aria-hidden>
        <div className="flex items-center gap-2.5">
          <span className="size-10 rounded-full bg-zinc-200" />
          <div className="flex flex-col gap-1.5">
            <span className="h-2.5 w-28 rounded bg-zinc-200" />
            <span className="h-2 w-16 rounded bg-zinc-100" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <span className="block h-2.5 w-full rounded bg-zinc-100" />
          <span className="block h-2.5 w-4/5 rounded bg-zinc-100" />
        </div>
        <div className="mt-3 h-40 rounded-md bg-zinc-100" />
      </div>
    </div>
  );
}

function BlogScreen({ title, bodyMd, photos, publishedAt }: { title: string; bodyMd: string; photos: PostPhoto[]; publishedAt?: string }) {
  return (
    <div className="bg-zinc-50 pb-8">
      {/* the site's mobile header (matches SitePreview's language) */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="text-sm text-amber-600">▲</span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-900">Apex Roofing</span>
        </span>
        <span className="flex flex-col gap-[3px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[2px] w-4 rounded bg-zinc-700" />
          ))}
        </span>
      </div>
      <article className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">The Apex blog</p>
        <h1 className="mt-1.5 text-[26px] font-bold leading-tight text-zinc-900">{title}</h1>
        <p className="mt-1.5 text-[12px] text-zinc-500">
          {(publishedAt ? new Date(publishedAt) : new Date()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · Apex Roofing
        </p>
        {photos[0] && <PhotoTile photo={photos[0]} className="mt-4 aspect-[16/9]" />}
        <MarkdownView markdown={bodyMd} tone="light" className="mt-4 text-[15px]" />
        {photos.length > 1 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {photos.slice(1).map((p, i) => (
              <PhotoTile key={p.id} photo={p} index={i + 1} className="aspect-[4/3]" />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

/* -------------------------------- the surface ------------------------------- */

/**
 * The phone + actions, embeddable anywhere: the on-feed overlay dialog uses it
 * directly; the /content/[id] route wraps it with a back link (deep links from
 * approvals land there).
 */
export function ContentPreview({ item: initial }: { item: PreviewItem }) {
  const isPost = initial.kind === "post";
  const patched: PreviewItem =
    initial.kind === "post"
      ? { ...initial, post: withContentPatch(initial.post) }
      : { ...initial, social: withContentPatch(initial.social) };

  const [status, setStatus] = React.useState(patched.kind === "post" ? patched.post.status : patched.social.status);
  const [title, setTitle] = React.useState(isPost && initial.kind === "post" ? initial.post.title : "");
  const [body, setBody] = React.useState(initial.kind === "post" ? initial.post.bodyMd : initial.social.body);
  const [editing, setEditing] = React.useState(false);

  const id = initial.kind === "post" ? initial.post.id : initial.social.id;
  const kindMeta = KIND_META[isPost ? "post" : "social_post"];
  const kindLabel = isPost ? kindMeta.label : "Facebook post";
  const chip = statusChip(status);
  const isDraft = status === "draft";
  const photos =
    initial.kind === "social" ? initial.photos.filter((p) => initial.social.photoIds.includes(p.id)) : initial.photos;

  const approve = () => {
    const at = new Date().toISOString();
    if (isPost) {
      patchContent(id, { status: "published", publishedAt: at });
      setStatus("published");
      toast.success("Live on apexroofingma.com.", { description: title });
    } else {
      patchContent(id, { status: "posted", postedAt: at });
      setStatus("posted");
      toast.success("Posted to Facebook.", { description: "Apex Roofing" });
    }
    setEditing(false);
  };

  const decline = () => {
    patchContent(id, { status: "declined" });
    setStatus("declined");
    setEditing(false);
    toast("Dropped it — Sarah won't publish this one.", { description: "Ask her for a different angle anytime." });
  };

  const schedule = (date?: Date) => {
    if (!date) return;
    patchContent(id, { status: "scheduled", scheduledFor: date.toISOString() });
    setStatus("scheduled");
    toast.success(`Scheduled for ${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`, {
      description: isPost ? "Sarah publishes it that morning." : "Sarah posts it that morning.",
    });
  };

  const contactId = initial.kind === "post" ? initial.post.contactId : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", kindMeta.chip)}>
            {isPost ? kindLabel : (
              <>
                <FacebookMark className="size-3" /> Facebook post
              </>
            )}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</span>
          {initial.kind === "post" && initial.post.sourceSummary && (
            <span className="text-xs text-muted-foreground">
              {initial.post.sourceSummary}
              {contactId && CONTACT_NAMES[contactId] && (
                <>
                  {" · "}
                  <Link href={`/customers/${contactId}`} className="underline-offset-2 hover:text-foreground hover:underline">
                    {CONTACT_NAMES[contactId]}
                  </Link>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        {/* the artifact, as the customer sees it */}
        <PhoneFrame className="h-[min(84vh,900px)]" screenClassName="overflow-y-auto">
          {editing ? (
            <div className="flex flex-col gap-3 bg-white p-4">
              {isPost && (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="Post title"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-500"
                />
              )}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                aria-label={isPost ? "Post body (markdown)" : "Facebook post text"}
                className="min-h-[380px] border-zinc-300 bg-white text-[13px] text-zinc-900"
              />
            </div>
          ) : isPost ? (
            <BlogScreen
              title={title}
              bodyMd={body}
              photos={photos}
              publishedAt={initial.kind === "post" ? initial.post.publishedAt : undefined}
            />
          ) : (
            <FacebookScreen
              body={body}
              photos={photos}
              stats={initial.kind === "social" ? initial.social.stats : undefined}
              postedAt={initial.kind === "social" ? initial.social.postedAt : undefined}
            />
          )}
        </PhoneFrame>

        {/* actions beside the phone */}
        <div className="w-full max-w-xs lg:sticky lg:top-6">
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            {isDraft || status === "scheduled" ? (
              <>
                <Button size="sm" onClick={approve}>
                  {isPost ? "Put it on my site" : "Post to Facebook"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
                  {editing ? "Done — preview it" : "Edit"}
                </Button>
                <Popover>
                  <PopoverTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
                    <CalendarDays className="size-3.5" /> Schedule…
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <Calendar mode="single" onSelect={(d: Date | undefined) => schedule(d)} />
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={decline}>
                  Not this one
                </Button>
                <p className="pt-1 text-center text-[11px] text-muted-foreground">
                  Nothing goes out until you say so.
                </p>
              </>
            ) : status === "declined" ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                Declined — Sarah won't publish this. Ask her for a different take anytime.
              </p>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    isPost
                      ? window.open("/p/demo_v13", "_blank", "noopener")
                      : toast("Demo — the real post opens on Facebook.")
                  }
                >
                  {isPost ? "View on your site ↗" : "View on Facebook ↗"}
                </Button>
                {initial.kind === "post" && initial.post.stats && (
                  <p className="text-center text-xs text-muted-foreground">
                    {initial.post.stats.views} views · {initial.post.stats.clicks} clicks
                  </p>
                )}
                {initial.kind === "social" && initial.social.stats && (
                  <p className="text-center text-xs text-muted-foreground">
                    {initial.social.stats.likes} likes · {initial.social.stats.comments} comments ·{" "}
                    {initial.social.stats.shares} shares
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Route wrapper (/content/[id]) — a back link around the same preview. */
export function PostDetail({ item }: { item: PreviewItem }) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/content"
        className="inline-flex items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Content
      </Link>
      <ContentPreview item={item} />
    </div>
  );
}
