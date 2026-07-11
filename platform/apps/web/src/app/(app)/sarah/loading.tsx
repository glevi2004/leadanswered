import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="flex-1 rounded-3xl" />
    </div>
  );
}
