export default function BuilderLoading() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background" role="status" aria-label="Loading editor">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
        <div className="border-r border-border/70 p-5">
          <div className="h-full animate-pulse rounded-md bg-muted/50" />
        </div>
        <div className="p-5">
          <div className="h-full animate-pulse rounded-lg border border-border/70 bg-muted/30" />
        </div>
      </div>
    </main>
  );
}