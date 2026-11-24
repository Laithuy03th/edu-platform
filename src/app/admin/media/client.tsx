"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { processDeletionQueueAction, reconcileAction, refreshUsageAction, updateBudgetAction, updateKillSwitchesAction, updateLimitsAction } from "@/modules/media/actions";
import { FormError } from "@/components/form-error";
import { useConfirm, useToast } from "@/components/overlays";
import { Button, Card, Checkbox, Field, Input } from "@/components/ui";
import { useAction } from "@/components/use-action";

const MiB = 1024 * 1024;

export function RefreshUsageButton() {
  const router = useRouter();
  const toast = useToast();
  const a = useAction(refreshUsageAction, {
    onSuccess: (d) => {
      toast(d.cloudinaryOk && d.mongoOk ? { tone: "success", message: "Đã đồng bộ số liệu." } : { tone: "error", message: `Đồng bộ một phần: ${d.error ?? "lỗi"}` });
      router.refresh();
    },
  });
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" pending={a.pending} onClick={() => a.run({})}>
        Đồng bộ số liệu
      </Button>
      {a.error ? <p className="text-xs text-danger-700">{a.error.message}</p> : <p className="text-xs text-ink-faint">Giới hạn 1 lần / 15 phút (Admin API 500 req/giờ).</p>}
    </div>
  );
}

export function KillSwitchForm({ initial }: { initial: { uploadsEnabled: boolean; playbackIssuanceEnabled: boolean; eagerTransformationsEnabled: boolean; version: number } }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [s, setS] = useState(initial);
  const a = useAction(updateKillSwitchesAction, {
    onSuccess: () => {
      toast({ tone: "success", message: "Đã cập nhật kill switch (có audit)." });
      router.refresh();
    },
  });
  return (
    <Card className="space-y-3">
      <h2 className="text-h3">Kill switch</h2>
      <FormError error={a.error} />
      <Checkbox label="Cho phép upload mới" description="Tắt: ngừng cấp chữ ký upload mới; finalize cũng từ chối. Không chặn băng thông video đã có." checked={s.uploadsEnabled} onChange={(e) => setS({ ...s, uploadsEnabled: e.target.checked })} />
      <Checkbox label="Cho phép cấp link phát video mới" description="Tắt: không cấp link có chữ ký mới. Không thu hồi link đã cấp, không ảnh hưởng video học thử công khai." checked={s.playbackIssuanceEnabled} onChange={(e) => setS({ ...s, playbackIssuanceEnabled: e.target.checked })} />
      <Checkbox label="Cho phép eager transformation (poster video)" description="Tắt: upload mới không tạo poster. Không xóa poster đã có." checked={s.eagerTransformationsEnabled} onChange={(e) => setS({ ...s, eagerTransformationsEnabled: e.target.checked })} />
      <Button
        pending={a.pending}
        onClick={async () => {
          if ((await confirm({ title: "Áp dụng kill switch?", description: "Thay đổi có hiệu lực ngay với mọi người dùng và được ghi audit.", tone: "brand", confirmLabel: "Áp dụng" })).ok)
            a.run({ expectedVersion: s.version, uploadsEnabled: s.uploadsEnabled, playbackIssuanceEnabled: s.playbackIssuanceEnabled, eagerTransformationsEnabled: s.eagerTransformationsEnabled });
        }}
      >
        Lưu kill switch
      </Button>
    </Card>
  );
}

export function LimitsForm({ limits, budget }: { limits: { videoMaxBytes: number; videoMaxSeconds: number; imageMaxBytes: number; videosPerCourse: number; coursesWithVideo: number; storageBytes: number; version: number }; budget: { cloudinaryCredits: number; mongodbBytes: number; usageStaleAfterMinutes: number; version: number } }) {
  const router = useRouter();
  const toast = useToast();
  const [l, setL] = useState({ videoMiB: limits.videoMaxBytes / MiB, videoMin: limits.videoMaxSeconds / 60, imageMiB: limits.imageMaxBytes / MiB, perCourse: limits.videosPerCourse, courses: limits.coursesWithVideo, storageMiB: limits.storageBytes / MiB });
  const [b, setB] = useState({ credits: budget.cloudinaryCredits, mongoMiB: budget.mongodbBytes / MiB, stale: budget.usageStaleAfterMinutes });
  const lim = useAction(updateLimitsAction, { onSuccess: () => (toast({ tone: "success", message: "Đã cập nhật hạn mức." }), router.refresh()) });
  const bud = useAction(updateBudgetAction, { onSuccess: () => (toast({ tone: "success", message: "Đã cập nhật ngân sách." }), router.refresh()) });
  const num = (v: string) => Number(v);
  return (
    <Card className="space-y-4">
      <h2 className="text-h3">Hạn mức & ngân sách</h2>
      <p className="text-xs text-ink-faint">Đơn vị MiB = 1.048.576 byte. Mọi thay đổi có audit; admin không có đường tắt vượt quota.</p>
      <FormError error={lim.error ?? bud.error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field id="vmib" label="Video tối đa (MiB)"><Input id="vmib" type="number" value={l.videoMiB} onChange={(e) => setL({ ...l, videoMiB: num(e.target.value) })} /></Field>
        <Field id="vmin" label="Video tối đa (phút)"><Input id="vmin" type="number" value={l.videoMin} onChange={(e) => setL({ ...l, videoMin: num(e.target.value) })} /></Field>
        <Field id="imib" label="Ảnh tối đa (MiB)"><Input id="imib" type="number" step={0.1} value={l.imageMiB} onChange={(e) => setL({ ...l, imageMiB: num(e.target.value) })} /></Field>
        <Field id="vpc" label="Video / khóa"><Input id="vpc" type="number" value={l.perCourse} onChange={(e) => setL({ ...l, perCourse: num(e.target.value) })} /></Field>
        <Field id="cwv" label="Số khóa có video"><Input id="cwv" type="number" value={l.courses} onChange={(e) => setL({ ...l, courses: num(e.target.value) })} /></Field>
        <Field id="smib" label="Tổng lưu trữ (MiB)"><Input id="smib" type="number" value={l.storageMiB} onChange={(e) => setL({ ...l, storageMiB: num(e.target.value) })} /></Field>
      </div>
      <Button variant="soft" pending={lim.pending} onClick={() => lim.run({ expectedVersion: limits.version, videoMaxBytes: Math.round(l.videoMiB * MiB), videoMaxSeconds: Math.round(l.videoMin * 60), imageMaxBytes: Math.round(l.imageMiB * MiB), videosPerCourse: l.perCourse, coursesWithVideo: l.courses, storageBytes: Math.round(l.storageMiB * MiB) })}>
        Lưu hạn mức
      </Button>
      <div className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        <Field id="cr" label="Credits nội bộ"><Input id="cr" type="number" step={0.5} value={b.credits} onChange={(e) => setB({ ...b, credits: num(e.target.value) })} /></Field>
        <Field id="mg" label="MongoDB (MiB)"><Input id="mg" type="number" value={b.mongoMiB} onChange={(e) => setB({ ...b, mongoMiB: num(e.target.value) })} /></Field>
        <Field id="st" label="Số liệu cũ sau (phút)"><Input id="st" type="number" value={b.stale} onChange={(e) => setB({ ...b, stale: num(e.target.value) })} /></Field>
      </div>
      <Button variant="soft" pending={bud.pending} onClick={() => bud.run({ expectedVersion: budget.version, cloudinaryCredits: b.credits, mongodbBytes: Math.round(b.mongoMiB * MiB), usageStaleAfterMinutes: b.stale })}>
        Lưu ngân sách
      </Button>
    </Card>
  );
}

export function MaintenancePanel() {
  const router = useRouter();
  const confirm = useConfirm();
  const [report, setReport] = useState<string[] | null>(null);
  const rec = useAction(reconcileAction, { onSuccess: (d) => (setReport(d.report), router.refresh()) });
  const del = useAction(processDeletionQueueAction, { onSuccess: (d) => (setReport(d.results.map((r) => `${r.publicId}: ${r.result}`)), router.refresh()) });
  return (
    <Card className="space-y-3">
      <h2 className="text-h3">Đối soát & dọn dẹp</h2>
      <p className="text-sm text-ink-soft">Mặc định chạy thử (dry-run) để xem trước. Liệt kê orphan trên Cloudinary dùng lệnh <code>pnpm media:cleanup</code> (có grace period 24 giờ).</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" pending={rec.pending} onClick={() => rec.run({ apply: false })}>
          Đối soát (dry-run)
        </Button>
        <Button variant="danger" pending={rec.pending} onClick={async () => (await confirm({ title: "Áp dụng đối soát?", description: "Giải phóng reservation hết hạn và tính lại bộ đếm quota.", confirmLabel: "Áp dụng" })).ok && rec.run({ apply: true })}>
          Áp dụng đối soát
        </Button>
        <Button variant="outline" pending={del.pending} onClick={() => del.run({})}>
          Xử lý hàng chờ xóa
        </Button>
      </div>
      {report ? (
        <pre className="max-h-64 overflow-auto rounded-[var(--radius-sm)] bg-ink p-3 text-xs text-white">{report.length ? report.join("\n") : "(không có gì để xử lý)"}</pre>
      ) : null}
    </Card>
  );
}
