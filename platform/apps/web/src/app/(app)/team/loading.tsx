import { Skeleton } from "@/components/ui/skeleton";

/** Header + stat line + two department groups of teammate cards, shimmering. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-7 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-8">
        {Array.from({ length: 2 }, (_, g) => (
          <div key={g} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
