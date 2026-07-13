import { Skeleton } from "@/components/ui/skeleton";

/** Takeover shimmer (03 §7): top bar + chat column + floating canvas. */
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-sidebar">
      <div className="flex h-12 shrink-0 items-center gap-3 px-3">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-40 rounded-full" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 pt-1 lg:flex-row">
        <div className="flex w-full flex-col gap-2 lg:w-[340px]">
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
          <Skeleton className="h-16 w-2/3 self-end rounded-2xl" />
          <Skeleton className="mt-auto h-10 rounded-full" />
        </div>
        <Skeleton className="min-h-[50vh] flex-1 rounded-2xl" />
      </div>
    </div>
  );
}
