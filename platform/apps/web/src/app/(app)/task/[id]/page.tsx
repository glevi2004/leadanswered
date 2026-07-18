import { requireOrganization } from "@/lib/dashboard-auth";
import { TaskDetail } from "@/components/task/TaskDetail";

/**
 * /task/[id] — the Task Detail page (docs/product.md §8b; ladder step 0): the one hub every
 * task row and chat card clicks through to. Auth-gated; data comes from the same live dock
 * proxies the rest of the app polls, so the page is reload-safe and always current.
 */
export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrganization();
  const { id } = await params;
  return (
    <div className="p-2 sm:p-4">
      <TaskDetail taskId={id} />
    </div>
  );
}
