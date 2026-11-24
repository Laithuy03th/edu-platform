"use client";

import { useEffect, useState } from "react";
import { THEME_COOKIE, type ThemePref } from "@/lib/site-cookies";
import { IconMonitor, IconMoon, IconSun } from "./icons";

const NEXT: Record<ThemePref, ThemePref> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<ThemePref, string> = { light: "Giao diện sáng", dark: "Giao diện tối", system: "Theo hệ thống" };

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** U07: Sáng → Tối → Theo hệ thống. Lưu cookie 1 năm (server render đúng theme lần sau, không nhấp nháy). */
export function ThemeToggle({ initial }: { initial: ThemePref }) {
  const [pref, setPref] = useState<ThemePref>(initial);
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);
  const Icon = pref === "dark" ? IconMoon : pref === "system" ? IconMonitor : IconSun;
  return (
    <button
      type="button"
      onClick={() => {
        const next = NEXT[pref];
        document.cookie = `${THEME_COOKIE}=${next}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax`;
        apply(next);
        setPref(next);
      }}
      title={`${LABEL[pref]} — bấm để đổi`}
      aria-label={`${LABEL[pref]}. Bấm để chuyển sang ${LABEL[NEXT[pref]].toLowerCase()}`}
      className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-brand-50 hover:text-ink active:scale-95"
    >
      <Icon size={19} />
    </button>
  );
}
