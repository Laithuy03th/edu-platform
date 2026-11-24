import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/ids";
import { requireViewer } from "@/server/auth";
import { AppError } from "@/lib/errors";
import { articleProblems, KIND_LABEL, loadEditableArticle } from "@/modules/articles/service";
import { listActiveTechnologies } from "@/modules/technologies/service";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { ArticleEditor } from "./editor";
import { ArticleAdminPanel } from "./admin-panel";

export const metadata = { title: "Soạn bài" };

export default async function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const oid = parseId(id);
  if (!oid) notFound();
  const viewer = await requireViewer();
  const a = await loadEditableArticle(viewer, oid).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const techs = await listActiveTechnologies();
  const problems = articleProblems(a.draft);
  const isAdmin = viewer.roles.includes("admin");
  return (
    <>
      <PageHeader
        breadcrumb={[{ href: "/instructor/articles", label: "Bài hướng dẫn" }, { label: a.draft.title }]}
        title={a.draft.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{KIND_LABEL[a.draft.kind]}</Badge>
            {a.status === "published" ? (
              <Link href={`/huong-dan/${a.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">
                Xem bản công khai ↗
              </Link>
            ) : (
              <span className="text-sm text-ink-faint">Chưa công khai</span>
            )}
          </span>
        }
      />
      {a.review.state === "rejected" && a.review.rejectReason ? (
        <Alert tone="danger" title="Bị từ chối" className="mb-6">
          {a.review.rejectReason}
        </Alert>
      ) : null}
      {a.review.state === "pending" ? (
        <Alert tone="warning" className="mb-6">
          Đang chờ admin duyệt — sửa bài sẽ bị khóa tới khi duyệt xong hoặc bạn rút lại.
        </Alert>
      ) : null}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <ArticleEditor
            id={a._id.toHexString()}
            slug={a.slug}
            revision={a.draftRevision}
            locked={a.review.state === "pending"}
            pending={a.review.state === "pending"}
            problems={problems}
            techOptions={techs.map((t) => ({ id: t.id, name: t.name }))}
            initial={{
              kind: a.draft.kind,
              title: a.draft.title,
              summary: a.draft.summary,
              content: a.draft.content,
              level: a.draft.level,
              technologyIds: a.draft.technologyIds.map((x) => x.toHexString()),
              testedOn: a.draft.testedOn.map((t) => ({ os: t.os, tools: t.tools, testedAt: new Date(t.testedAt).toISOString().slice(0, 10) })),
            }}
          />
          {a.draft.content.trim() ? (
            <Card className="p-6">
              <p className="text-caption mb-4 text-ink-faint">Xem trước bản nháp đã lưu</p>
              <div className="text-[1.0625rem] leading-[1.8]">
                <LessonMarkdown>{a.draft.content}</LessonMarkdown>
              </div>
            </Card>
          ) : null}
        </div>
        {isAdmin ? (
          <ArticleAdminPanel
            id={a._id.toHexString()}
            pendingRevision={a.review.state === "pending" ? a.review.submittedRevision : null}
            status={a.status}
            hasPublished={Boolean(a.published)}
            review={a.contentReview ? { reviewerName: a.contentReview.reviewerName, outdated: a.contentReview.publishedVersion !== a.publishedVersion } : null}
          />
        ) : null}
      </div>
    </>
  );
}
