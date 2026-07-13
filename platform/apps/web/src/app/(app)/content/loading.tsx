import { Skeleton } from "@/components/ui/skeleton";

/** Drafts-first shimmer (04 §7): header + tabs + a wide draft card. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-7 w-48 rounded-full" />
      </div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
