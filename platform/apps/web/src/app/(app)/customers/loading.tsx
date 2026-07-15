import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-6 w-96" />
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  );
}
