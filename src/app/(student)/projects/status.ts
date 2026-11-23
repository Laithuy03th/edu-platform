import type { SubmissionStatus } from "@/server/db/models";
import type { Tone } from "@/components/ui";

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Bản nháp",
  submitted: "Đã nộp — chờ chấm",
  needs_changes: "Cần chỉnh sửa",
  resubmitted: "Đã nộp lại — chờ chấm",
  reviewed: "Đã đạt",
};
export const STATUS_TONE: Record<SubmissionStatus, Tone> = {
  draft: "neutral",
  submitted: "info",
  needs_changes: "warning",
  resubmitted: "info",
  reviewed: "success",
};
