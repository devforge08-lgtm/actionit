/**
 * Placeholder shown while a dashboard page loads its data, so a click
 * changes the screen right away instead of waiting on the server.
 */
export default function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded bg-white/[0.06]" />
        <div className="h-9 w-64 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="brand-panel h-24 rounded-2xl" />
        ))}
      </div>
      <div className="brand-panel h-64 rounded-2xl" />
    </div>
  );
}
