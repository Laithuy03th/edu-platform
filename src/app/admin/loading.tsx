import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container className="py-10" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </Container>
  );
}
