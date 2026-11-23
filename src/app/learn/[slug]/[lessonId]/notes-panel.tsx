"use client";

import { useState } from "react";
import type { NoteDto } from "@/modules/notes/service";
import { createNoteAction, deleteNoteAction, updateNoteAction } from "@/modules/learning/actions";
import { Markdown } from "@/components/markdown";
import { IconCheck, IconClock, IconEdit, IconPlay, IconTrash } from "@/components/icons";
import { useConfirm, useToast } from "@/components/overlays";
import { Button, Input, Textarea, cn } from "@/components/ui";
import { usePlayer } from "./player-context";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
function parseTs(v: string): number | null {
  const m = v.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Ghi chú riêng theo bài; video: ghi tại thời điểm hiện tại, click để tua (§11). Chỉ chủ sở hữu thấy. */
export function NotesPanel({ lessonId, isVideo, initial }: { lessonId: string; isVideo: boolean; initial: NoteDto[] }) {
  const { currentTime, seek } = usePlayer();
  const [notes, setNotes] = useState(initial);
  const [draft, setDraft] = useState("");
  const [ts, setTs] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);

  async function add() {
    if (!draft.trim()) return;
    setStatus("saving");
    setError(null);
    const tsVal = isVideo ? (ts ? parseTs(ts) : null) : null;
    if (isVideo && ts && tsVal === null) {
      setStatus("error");
      setError("Thời điểm dạng phút:giây, ví dụ 2:05.");
      return;
    }
    const r = await createNoteAction({ lessonId, timestampSeconds: tsVal, content: draft }).catch(() => null);
    if (r?.ok) {
      setNotes((n) => [...n, r.data].sort((a, b) => (a.timestampSeconds ?? 1e9) - (b.timestampSeconds ?? 1e9)));
      setFreshId(r.data.id);
      setDraft(""); // chỉ xóa bản nháp khi server xác nhận
      setTs("");
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2500);
    } else {
      setStatus("error");
      setError(r?.error.message ?? "Không lưu được (mất kết nối?). Bản nháp vẫn được giữ — thử lại.");
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-faint">Chỉ bạn thấy ghi chú của mình. Hỗ trợ Markdown.</p>
      <div className="space-y-3 rounded-[var(--radius-lg)] bg-brand-50/60 p-4">
        {isVideo ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-28">
              <label htmlFor="note-ts" className="mb-1 block text-xs font-semibold text-ink-soft">
                Thời điểm
              </label>
              <Input id="note-ts" value={ts} onChange={(e) => setTs(e.target.value)} placeholder="m:ss" inputMode="numeric" className="font-mono" />
            </div>
            <Button
              type="button"
              variant="outline"
              icon={<IconClock size={16} />}
              onClick={() => {
                const t = currentTime();
                if (t !== null) {
                  setTs(fmt(t));
                  setHint(null);
                } else setHint("Hãy phát video trước để lấy thời điểm hiện tại.");
              }}
            >
              Lấy thời điểm hiện tại
            </Button>
          </div>
        ) : null}
        <label htmlFor="note-content" className="sr-only">
          Nội dung ghi chú
        </label>
        <Textarea id="note-content" rows={3} maxLength={5000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Điều bạn muốn nhớ ở bài này…" aria-invalid={status === "error" || undefined} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs" aria-live="polite">
            {status === "saving" ? (
              <span className="text-ink-faint">Đang lưu…</span>
            ) : status === "saved" ? (
              <span className="inline-flex animate-fade-in items-center gap-1 font-semibold text-success-700">
                <IconCheck size={14} /> Đã lưu
              </span>
            ) : status === "error" ? (
              <span className="text-danger-700">{error}</span>
            ) : (
              <span className="tabular-nums text-ink-faint">{draft.length}/5000</span>
            )}
          </span>
          <Button type="button" onClick={add} pending={status === "saving"} disabled={!draft.trim()}>
            Lưu ghi chú
          </Button>
        </div>
        {hint ? <p className="text-xs text-warning-800">{hint}</p> : null}
      </div>

      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">Chưa có ghi chú cho bài này.</p>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-brand-100 pl-5">
          {notes.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              fresh={freshId === n.id}
              isVideo={isVideo}
              editing={editing === n.id}
              onEdit={() => setEditing(n.id)}
              onCancel={() => setEditing(null)}
              onSeek={(s) => setHint(seek(s) ? null : "Video chưa được tải. Bấm “Tải và phát video” rồi bấm lại thời điểm.")}
              onSaved={(u) => {
                setNotes((all) => all.map((x) => (x.id === u.id ? u : x)));
                setEditing(null);
              }}
              onDeleted={() => setNotes((all) => all.filter((x) => x.id !== n.id))}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function NoteItem({ note, fresh, isVideo, editing, onEdit, onCancel, onSeek, onSaved, onDeleted }: { note: NoteDto; fresh: boolean; isVideo: boolean; editing: boolean; onEdit: () => void; onCancel: () => void; onSeek: (s: number) => void; onSaved: (n: NoteDto) => void; onDeleted: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [content, setContent] = useState(note.content);
  const [ts, setTs] = useState(note.timestampSeconds !== null ? fmt(note.timestampSeconds) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dot = <span className="absolute -left-[1.6rem] top-4 size-3 rounded-full border-2 border-surface bg-brand-400" aria-hidden />;
  if (editing) {
    return (
      <li className="relative space-y-2 rounded-[var(--radius-md)] border border-brand-300 bg-surface p-3 shadow-sm">
        {dot}
        {isVideo ? <Input aria-label="Thời điểm (m:ss)" value={ts} onChange={(e) => setTs(e.target.value)} className="w-28 font-mono" /> : null}
        <Textarea aria-label="Sửa ghi chú" rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} />
        {err ? <p className="text-sm text-danger-700">{err}</p> : null}
        <div className="flex gap-2">
          <Button
            size="sm"
            pending={busy}
            onClick={async () => {
              setBusy(true);
              const t = isVideo && ts ? parseTs(ts) : null;
              if (isVideo && ts && t === null) {
                setErr("Thời điểm dạng phút:giây.");
                setBusy(false);
                return;
              }
              const r = await updateNoteAction({ noteId: note.id, content, timestampSeconds: t }).catch(() => null);
              setBusy(false);
              if (r?.ok) {
                onSaved(r.data);
                toast({ tone: "success", message: "Đã cập nhật ghi chú." });
              } else setErr(r?.error.message ?? "Không lưu được, thử lại.");
            }}
          >
            Lưu
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Hủy
          </Button>
        </div>
      </li>
    );
  }
  return (
    <li className={cn("group relative rounded-[var(--radius-md)] border border-line bg-surface p-3 transition hover:border-brand-200 hover:shadow-xs", fresh && "animate-fade-up")}>
      {dot}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {note.timestampSeconds !== null ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 font-mono text-xs font-semibold text-brand-800 transition hover:bg-brand-700 hover:text-white active:scale-95"
            onClick={() => onSeek(note.timestampSeconds!)}
            aria-label={`Tua video tới ${fmt(note.timestampSeconds)}`}
          >
            <IconPlay size={11} /> {fmt(note.timestampSeconds)}
          </button>
        ) : (
          <span className="text-xs text-ink-faint">Ghi chú chung</span>
        )}
        <span className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button type="button" onClick={onEdit} aria-label="Sửa ghi chú" className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-brand-50 hover:text-ink">
            <IconEdit size={15} />
          </button>
          <button
            type="button"
            aria-label="Xóa ghi chú"
            className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-danger-50 hover:text-danger-700"
            onClick={async () => {
              if (!(await confirm({ title: "Xóa ghi chú này?", description: "Ghi chú sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa ghi chú" })).ok) return;
              const r = await deleteNoteAction({ noteId: note.id }).catch(() => null);
              if (r?.ok) {
                onDeleted();
                toast({ tone: "success", message: "Đã xóa ghi chú." });
              } else toast({ tone: "error", message: r?.error.message ?? "Không xóa được." });
            }}
          >
            <IconTrash size={15} />
          </button>
        </span>
      </div>
      <Markdown className="prose prose-sm max-w-none">{note.content}</Markdown>
    </li>
  );
}
