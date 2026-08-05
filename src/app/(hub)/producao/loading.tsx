export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 md:px-10">
      <div className="h-10 w-56 animate-pulse rounded-md bg-white/[0.05]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-96 animate-pulse rounded-2xl border border-gold/10 bg-white/[0.02]" />
        ))}
      </div>
    </div>
  );
}
