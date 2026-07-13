import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { PostDetail, type PreviewItem } from "@/components/content/PostDetail";
import { APEX_POSTS, APEX_SOCIAL_POSTS } from "@/lib/data/fixtures/apex";

export const metadata = { title: "Content — Lead Answered" };

/** Posts AND Facebook posts share this route — one preview surface (04 §2). */
export default async function ContentPreviewPage({ params }: { params: Promise<{ postId: string }> }) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "content", demo);

  if (status === "coming_soon") {
    return <GatedState label="Content" promise={MODULES.content.promise ?? ""} />;
  }

  const { postId } = await params;

  const post = APEX_POSTS.find((p) => p.id === postId);
  const social = APEX_SOCIAL_POSTS.find((s) => s.id === postId);
  if (!post && !social) notFound();

  const item: PreviewItem = post
    ? { kind: "post", post, photos: post.photos }
    : { kind: "social", social: social!, photos: APEX_POSTS.find((p) => p.id === social!.postId)?.photos ?? [] };

  return <PostDetail item={item} />;
}
