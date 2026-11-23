import { CourseCardSkeleton } from "@/components/course-card";
import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container className="py-10 sm:py-14" aria-busy="true" aria-label="Đang tải khóa học">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-10 w-56" />
      <Skeleton className="mt-8 h-14 w-full rounded-full" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  );
}
