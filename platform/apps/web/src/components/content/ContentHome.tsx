"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Post, SocialPost } from "@/lib/data/content/types";
import { patchContent, withContentPatch } from "@/lib/data/content/state";
import { CalendarMonth, type CalendarMonthItem } from "@/components/app/CalendarMonth";
import { KIND_META } from "@/components/app/ApprovalCard";
import { EmptyState } from "@/components/app/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostCard, type FeedItem } from "./PostCard";
import { ContentPreview } from "./PostDetail";

/**
 * 04-content (redesigned): ONE feed of decoupled content items — blog posts
 * and Facebook posts as sibling post-shaped cards. Drafts = waiting on you;
 * Published = the proof; Calendar = the rhythm. Approve/edit live on the
 * click-through phone preview, not here.
 */
export function ContentHome({
  posts,
  socials,
  timezone,
  defaultTab,
}: {
  posts: Post[];
  socials: SocialPost[];
  timezone: string;
  /** deep link / dev harness: "drafts" | "published" | "calendar" */
  defaultTab?: string;
}) {
  const postById = React.useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [, bump] = React.useReducer((n: number) => n + 1, 0);

  const items: FeedItem[] = [
    ...posts.map((p): FeedItem => {
      const post = withContentPatch(p);
      return { kind: "post", post, photos: post.photos };
    }),
    ...socials.map((s): FeedItem => {
      const social = withContentPatch(s);
      const parent = social.postId ? postById.get(social.postId) : undefined;
      const photos = (parent?.photos ?? []).filter((ph) => social.photoIds.includes(ph.id));
      return { kind: "social", social, photos };
    }),
  ].sort((a, b) => {
    const at = a.kind === "post" ? a.post.createdAt : a.social.createdAt;
    const bt = b.kind === "post" ? b.post.createdAt : b.social.createdAt;
    return bt.localeCompare(at);
  });

  const statusOf = (i: FeedItem) => (i.kind === "post" ? i.post.status : i.social.status);
  const drafts = items.filter((i) => statusOf(i) === "draft");
  const published = items.filter((i) => ["published", "posted", "scheduled"].includes(statusOf(i)));

  // Same calendar grammar as Schedule (04 §2): kind dots, click → preview
  // overlay, scheduled items drag to a new day.
  const calendarItems: CalendarMonthItem[] = published.map((i) => {
    const id = i.kind === "post" ? i.post.id : i.social.id;
    const status = statusOf(i);
    const at =
      i.kind === "post"
        ? ((i.post.status === "scheduled" ? i.post.scheduledFor : i.post.publishedAt) ?? i.post.createdAt)
        : ((i.social.status === "scheduled" ? i.social.scheduledFor : i.social.postedAt) ?? i.social.createdAt);
    return {
      id,
      at,
      label: i.kind === "post" ? i.post.title : `Facebook — ${i.social.body.slice(0, 40)}…`,
      dot: KIND_META[i.kind === "post" ? "post" : "social_post"].dot,
      onClick: () => setOpenId(id),
      draggable: status === "scheduled",
    };
  });

  const reschedule = (id: string, dateKey: string) => {
    const when = new Date(`${dateKey}T10:00:00`);
    patchContent(id, { status: "scheduled", scheduledFor: when.toISOString() });
    bump();
    toast.success(`Rescheduled — goes out ${when.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}.`);
  };

  return (
    <Tabs defaultValue={defaultTab ?? "drafts"} className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="drafts" className="px-3">
          Drafts{drafts.length > 0 ? ` (${drafts.length})` : ""}
        </TabsTrigger>
        <TabsTrigger value="published" className="px-3">
          Published
        </TabsTrigger>
        <TabsTrigger value="calendar" className="px-3">
          Calendar
        </TabsTrigger>
      </TabsList>

      <TabsContent value="drafts">
        {drafts.length === 0 ? (
          <EmptyState
            title="Nothing waiting on you."
            body="Text Sarah photos from your next finished job and her drafts will land here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Sarah drafted these — tap one to see it exactly as customers will, then say go.
            </p>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              {drafts.map((item) => {
                const id = item.kind === "post" ? item.post.id : item.social.id;
                return <PostCard key={id} item={item} onOpen={() => setOpenId(id)} />;
              })}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="published">
        {published.length === 0 ? (
          <EmptyState
            title="We're setting up your blog now."
            body="Your first post goes live the moment you approve one — ask Sarah for a post to get started."
            askSarah
          />
        ) : (
          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {published.map((item) => {
              const id = item.kind === "post" ? item.post.id : item.social.id;
              return <PostCard key={id} item={item} onOpen={() => setOpenId(id)} />;
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="calendar">
        <CalendarMonth items={calendarItems} timezone={timezone} onDropItem={reschedule} />
      </TabsContent>

      {/* the preview overlay — same page, no navigation (Levi 2026-07-12) */}
      <Dialog
        open={openId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOpenId(null);
            bump(); // re-read patches so card statuses reflect what happened in the preview
          }
        }}
      >
        <DialogContent className="max-h-[94vh] w-fit max-w-[96vw] overflow-y-auto p-6 sm:max-w-4xl">
          <DialogTitle className="sr-only">Content preview</DialogTitle>
          {(() => {
            const item = items.find((i) => (i.kind === "post" ? i.post.id : i.social.id) === openId);
            return item ? <ContentPreview key={openId} item={item} /> : null;
          })()}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
