export default function ManualLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <div className="h-8 w-8 animate-pulse rounded bg-secondary" />
          <div className="h-6 w-48 animate-pulse rounded bg-secondary" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Title */}
        <div className="mb-2 h-10 w-72 animate-pulse rounded bg-secondary" />
        <div className="mb-8 h-5 w-96 animate-pulse rounded bg-secondary" />

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>

        {/* Content blocks */}
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 h-6 w-40 animate-pulse rounded bg-secondary" />
              <div className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
