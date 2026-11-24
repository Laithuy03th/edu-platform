"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeArticleSlugAction, saveArticleAction, submitArticleAction, withdrawArticleAction } from "@/modules/articles/actions";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/overlays";
import { FormError } from "@/components/form-error";
import { IconTrash } from "@/components/icons";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Tested = { os: string; tools: string; testedAt: string };
type Init = { kind: string; title: string; summary: string; content: string; level: string; technologyIds: string[]; testedOn: Tested[] };

export function ArticleEditor({ id, slug, revision, locked, pending, problems, techOptions, initial }: { id: string; slug: string; revision: number; locked: boolean; pending: boolean; problems: string[]; techOptions: { id: string; name: string }[]; initial: Init }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<Init>(initial);
  const [newSlug, setNewSlug] = useState(slug);
  const save = useAction(saveArticleAction);
  const submit = useAction(submitArticleAction);
  const withdraw = useAction(withdrawArticleAction);
  const slugA = useAction(changeArticleSlugAction);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const set = <K extends keyof Init>(k: K, v: Init[K]) => setF((x) => ({ ...x, [k]: v }));
  const fe = save.fieldErrors;

  async function onSave() {
    const r = await save.run({ id, expectedRevision: revision, ...f });
    if (r?.ok) {
      toast({ tone: "success", message: "Đã lưu bản nháp." });
      router.refresh();
    } else if (r && !r.ok && r.error.code === "STALE_REVISION") router.refresh();
  }

  return (
    <Card className="space-y-5 p-6">
      <FormError error={save.error ?? submit.error ?? withdraw.error} />
      <div className="grid gap-4 sm:grid-cols-[1fr_200px_160px]">
        <Field id="ae-title" label="Tiêu đề" errors={fe.title}>
          <Input id="ae-title" value={f.title} disabled={locked} maxLength={140} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field id="ae-kind" label="Loại">
          <Select id="ae-kind" value={f.kind} disabled={locked} onChange={(e) => set("kind", e.target.value)}>
            <option value="tutorial">Hướng dẫn</option>
            <option value="recipe">Cài đặt môi trường</option>
            <option value="troubleshooting">Xử lý lỗi</option>
            <option value="reference">Tham khảo</option>
            <option value="cheatsheet">Cheatsheet</option>
          </Select>
        </Field>
        <Field id="ae-level" label="Cấp độ">
          <Select id="ae-level" value={f.level} disabled={locked} onChange={(e) => set("level", e.target.value)}>
            <option value="beginner">Cơ bản</option>
            <option value="intermediate">Trung cấp</option>
            <option value="advanced">Nâng cao</option>
          </Select>
        </Field>
      </div>
      <Field id="ae-summary" label="Tóm tắt" hint={`${f.summary.length}/300 — hiện ở danh sách và kết quả tìm kiếm`} errors={fe.summary}>
        <Textarea id="ae-summary" rows={2} value={f.summary} disabled={locked} maxLength={300} onChange={(e) => set("summary", e.target.value)} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Công nghệ</legend>
        <div className="flex flex-wrap gap-2">
          {techOptions.map((t) => {
            const on = f.technologyIds.includes(t.id);
            return (
              <label key={t.id} className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition ${on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line bg-surface text-ink-soft hover:border-brand-300"}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={locked || (!on && f.technologyIds.length >= 8)}
                  onChange={() => set("technologyIds", on ? f.technologyIds.filter((x) => x !== t.id) : [...f.technologyIds, t.id])}
                />
                {t.name}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Field id="ae-content" label="Nội dung (Markdown)" hint="Dùng ## cho mục (tạo mục lục), ```bash title=&quot;Windows (PowerShell)&quot; cho khối lệnh, ```output cho kết quả mong đợi." errors={fe.content}>
        <Textarea id="ae-content" rows={22} value={f.content} disabled={locked} maxLength={60000} onChange={(e) => set("content", e.target.value)} className="font-mono text-sm leading-relaxed" />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Môi trường đã chạy thử thật</legend>
        <p className="mb-3 text-xs text-ink-faint">Chỉ ghi môi trường bạn đã chạy đúng các lệnh/code trong bài. Bài “Cài đặt môi trường” bắt buộc có ít nhất một dòng.</p>
        <div className="space-y-2">
          {f.testedOn.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input aria-label={`Hệ điều hành ${i + 1}`} placeholder="Windows 11 (PowerShell)" value={t.os} disabled={locked} maxLength={60} className="w-56" onChange={(e) => set("testedOn", f.testedOn.map((x, j) => (j === i ? { ...x, os: e.target.value } : x)))} />
              <Input aria-label={`Công cụ & phiên bản ${i + 1}`} placeholder="Node 22.13.0, npm 10.9.2" value={t.tools} disabled={locked} maxLength={160} className="min-w-0 flex-1" onChange={(e) => set("testedOn", f.testedOn.map((x, j) => (j === i ? { ...x, tools: e.target.value } : x)))} />
              <Input aria-label={`Ngày chạy thử ${i + 1}`} type="date" value={t.testedAt} disabled={locked} className="w-40" onChange={(e) => set("testedOn", f.testedOn.map((x, j) => (j === i ? { ...x, testedAt: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="sm" disabled={locked} aria-label={`Xóa môi trường ${i + 1}`} onClick={() => set("testedOn", f.testedOn.filter((_, j) => j !== i))}>
                <IconTrash size={16} />
              </Button>
            </div>
          ))}
          {f.testedOn.length < 6 ? (
            <Button type="button" variant="outline" size="sm" disabled={locked} onClick={() => set("testedOn", [...f.testedOn, { os: "", tools: "", testedAt: new Date().toISOString().slice(0, 10) }])}>
              + Thêm môi trường
            </Button>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button pending={save.pending} disabled={locked || !dirty} onClick={onSave}>
          Lưu bản nháp
        </Button>
        {pending ? (
          <Button
            variant="outline"
            pending={withdraw.pending}
            onClick={async () => {
              const r = await withdraw.run({ id });
              if (r?.ok) router.refresh();
            }}
          >
            Rút lại
          </Button>
        ) : (
          <Button
            variant="soft"
            pending={submit.pending}
            disabled={dirty || problems.length > 0}
            onClick={async () => {
              const r = await submit.run({ id, expectedRevision: revision });
              if (r?.ok) {
                toast({ tone: "success", message: "Đã gửi duyệt." });
                router.refresh();
              }
            }}
          >
            Gửi duyệt
          </Button>
        )}
        {dirty ? <span className="text-xs text-warning-700">Có thay đổi chưa lưu</span> : null}
      </div>
      {problems.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-2 border-t border-line pt-5">
        <Field id="ae-slug" label="Đường dẫn" hint="Đổi slug của bài đã công khai: URL cũ tự chuyển (308) sang URL mới." errors={slugA.fieldErrors.slug}>
          <div className="flex items-center gap-1 text-sm text-ink-faint">
            /huong-dan/
            <Input id="ae-slug" value={newSlug} maxLength={90} onChange={(e) => setNewSlug(e.target.value)} className="w-72" />
          </div>
        </Field>
        <Button
          variant="outline"
          size="sm"
          disabled={newSlug === slug}
          pending={slugA.pending}
          onClick={async () => {
            const r = await slugA.run({ id, slug: newSlug });
            if (r?.ok) {
              toast({ tone: "success", message: "Đã đổi đường dẫn." });
              router.refresh();
            }
          }}
        >
          Đổi
        </Button>
      </div>
    </Card>
  );
}
