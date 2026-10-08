export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-canvas" role="status" aria-label="Loading dashboard">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-10 w-52 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-8 h-32 animate-pulse border-y border-border/70 bg-background/55" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-md border border-border/70 bg-background/55" />
          ))}
        </div>
      </div>
    </main>
  );
}