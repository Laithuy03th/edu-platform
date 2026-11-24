"use client";

import { useState, type ComponentProps } from "react";
import { IconAlert, IconEye, IconEyeOff } from "./icons";
import { Input, cn } from "./ui";

/** Gợi ý độ mạnh dựa trên ĐỘ DÀI (12 ký tự tối thiểu, càng dài càng tốt) — không ép ký tự đặc biệt. */
function strength(pw: string) {
  const n = [...pw.normalize("NFC")].length;
  if (n === 0) return null;
  if (n < 12) return { level: 0, label: `Còn thiếu ${12 - n} ký tự`, tone: "bg-danger-700", text: "text-danger-700" };
  if (n < 16) return { level: 1, label: "Đạt yêu cầu tối thiểu", tone: "bg-warning-700", text: "text-warning-800" };
  if (n < 24) return { level: 2, label: "Tốt", tone: "bg-success-600", text: "text-success-700" };
  return { level: 3, label: "Rất tốt — cụm từ dài khó đoán", tone: "bg-success-600", text: "text-success-700" };
}

/**
 * Ô mật khẩu có nút “con mắt” hiện/ẩn, cảnh báo Caps Lock và (tùy chọn) thước đo độ dài.
 * Không trim, không đổi giá trị người dùng nhập.
 */
export function PasswordInput({ meter, className, onChange, onKeyUp, ...props }: Omit<ComponentProps<"input">, "type"> & { meter?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const [value, setValue] = useState("");
  const s = meter ? strength(value) : null;
  const inputId = props.id ?? props.name;
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          spellCheck={false}
          autoCapitalize="none"
          className={cn("pr-12", className)}
          onChange={(e) => {
            setValue(e.target.value);
            onChange?.(e);
          }}
          onKeyUp={(e) => {
            setCaps(e.getModifierState?.("CapsLock") ?? false);
            onKeyUp?.(e);
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          aria-controls={inputId}
          title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-faint transition hover:bg-brand-50 hover:text-brand-700 active:scale-90"
        >
          <span key={String(visible)} className="animate-scale-in">
            {visible ? <IconEyeOff size={19} /> : <IconEye size={19} />}
          </span>
        </button>
      </div>
      {caps ? (
        <p className="flex animate-fade-in items-center gap-1.5 text-xs font-medium text-warning-800" role="status">
          <IconAlert size={14} /> Caps Lock đang bật
        </p>
      ) : null}
      {s ? (
        <div className="animate-fade-in" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= s.level ? s.tone : "bg-brand-100")} />
            ))}
          </div>
          <p className={cn("mt-1 text-xs font-medium", s.text)}>{s.label}</p>
        </div>
      ) : null}
    </div>
  );
}
