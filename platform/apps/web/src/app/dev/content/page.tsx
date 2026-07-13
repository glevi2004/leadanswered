/** DEV-ONLY visual check for the Content surfaces (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import {
  APEX,
  APEX_ACTIONS,
  APEX_APPROVALS,
  APEX_POSTS,
  APEX_SOCIAL_POSTS,
  APEX_THREAD,
} from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { ContentHome } from "@/components/content/ContentHome";
import { PostDetail } from "@/components/content/PostDetail";

export default async function DevContent({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const draftPost = APEX_POSTS.find((p) => p.id === "post_301")!;
  const draftSocial = APEX_SOCIAL_POSTS.find((s) => s.id === "sp_301")!;
  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 p-8">
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">/content home — the mixed feed</h2>
          <div className="flex flex-col gap-4">
            <PageHeader title="Content" description="Text Sarah the photos — she writes it, you say go." />
            <ContentHome posts={APEX_POSTS} socials={APEX_SOCIAL_POSTS} timezone={APEX.timezone} defaultTab={tab} />
          </div>
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">blog preview (phone)</h2>
          <PostDetail item={{ kind: "post", post: draftPost, photos: draftPost.photos }} />
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">facebook preview (phone)</h2>
          <PostDetail
            item={{ kind: "social", social: draftSocial, photos: APEX_POSTS.find((p) => p.id === draftSocial.postId)?.photos ?? [] }}
          />
        </section>
      </div>
    </SarahProvider>
  );
}
