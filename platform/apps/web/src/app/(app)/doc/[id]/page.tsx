import { requireOrganization } from "@/lib/dashboard-auth";
import { DocViewer } from "@/components/library/DocViewer";

/**
 * /doc/[id] — the Notion-style document viewer (docs/product.md §3): the page size of a
 * Library document. Every Library card/row and doc chat card clicks through to here.
 * Auth-gated; data comes from the same live dock proxies the rest of the app polls.
 */
export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrganization();
  const { id } = await params;
  return (
    <div className="p-2 sm:p-6">
      <DocViewer docId={id} />
    </div>
  );
}
