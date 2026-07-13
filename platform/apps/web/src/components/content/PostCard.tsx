"use client";

import { MessageCircle, Share2, ThumbsUp } from "lucide-react";
import type { Post, PostPhoto, SocialPost } from "@/lib/data/content/types";
import { PhotoTile } from "@/components/app/PhotoStrip";
import { KIND_META } from "@/components/app/ApprovalCard";
import { statusChip } from "@/lib/dashboard-ui";
import { FacebookMark } from "./FacebookMark";
import { cn } from "@/lib/utils";

/**
 * The one post-shaped card (04 §2): blog and Facebook items are siblings —
 * same anatomy (avatar · Apex Roofing · time · kind chip → the text → the
 * photo → a kind-true footer). The card shows the CONTENT; clicking opens the
 * phone preview where approve/edit live.
 */

export type FeedItem =
  | { kind: "post"; post: Post; photos: PostPhoto[] }
  | { kind: "social"; social: SocialPost; photos: PostPhoto[] };

const timeLabel = (iso: string) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function PostCard({ item, onOpen }: { item: FeedItem; onOpen: () => void }) {
  const isPost = item.kind === "post";
  const status = isPost ? item.post.status : item.social.status;
  const createdAt = isPost ? item.post.createdAt : item.social.createdAt;
  const kindMeta = KIND_META[isPost ? "post" : "social_post"];
  const chip = statusChip(status);
  const lead = item.photos[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-lift flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left text-card-foreground"
    >
      {/* identity row */}
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-xs font-bold text-white">
          A
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">Apex Roofing</p>
          <p className="text-[11px] text-muted-foreground">
            {timeLabel(createdAt)} · by Sarah
          </p>
        </div>
        <span
          className={cn(
            "ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            kindMeta.chip,
          )}
        >
          {isPost ? kindMeta.label : (
            <>
              <FacebookMark className="size-3" /> Facebook post
            </>
          )}
        </span>
      </div>

      {/* the content itself */}
      {isPost ? (
        <div>
          <p className="text-sm font-semibold leading-snug">{item.post.title}</p>
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.post.excerpt}</p>
        </div>
      ) : (
        <p className="line-clamp-4 text-sm leading-relaxed">{item.social.body}</p>
      )}

      {lead && <PhotoTile photo={lead} className="aspect-[2/1]" />}

      {/* kind-true footer */}
      <div className="mt-auto flex items-center gap-2 border-t pt-2.5 text-[11px] text-muted-foreground">
        {isPost ? (
          <span className="truncate">apexroofingma.com/blog/{item.post.slug}</span>
        ) : (
          <span className="flex items-center gap-3" aria-hidden>
            <span className="flex items-center gap-1">
              <ThumbsUp className="size-3" /> {item.social.stats ? item.social.stats.likes : "Like"}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3" /> {item.social.stats ? item.social.stats.comments : "Comment"}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="size-3" /> {item.social.stats ? item.social.stats.shares : "Share"}
            </span>
          </span>
        )}
        <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", chip.chip)}>
          {status === "draft" ? "Waiting on you" : chip.label}
        </span>
        {isPost && item.post.status === "published" && item.post.stats && (
          <span className="shrink-0">{item.post.stats.views} views</span>
        )}
      </div>
    </button>
  );
}
