export function InboxSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mt-4 flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}
