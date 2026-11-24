import Link from "next/link";
import { cookies } from "next/headers";
import { getAnnouncement } from "@/modules/site/announcement";
import { safeLoad } from "./safe-load";
import { ANN_COOKIE } from "@/lib/site-cookies";
import { AnnouncementDismiss } from "./announcement-dismiss";
import { IconArrowRight, IconSparkle } from "./icons";

const TONE = {
  brand: "bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 text-white",
  info: "bg-info-50 text-info-700 border-b border-info-200",
  warning: "bg-warning-50 text-warning-800 border-b border-warning-200",
} as const;

/**
 * Banner thông báo toàn site (admin bật ở /admin/site). Server render → không nhấp nháy;
 * người dùng đóng thì cookie nhớ đúng phiên bản banner đó (banner mới sẽ hiện lại).
 */
export async function AnnouncementBar() {
  const a = await safeLoad(() => getAnnouncement(), null);
  if (!a?.enabled || !a.message) return null;
  const key = `v${a.version}`;
  if ((await cookies()).get(ANN_COOKIE)?.value === key) return null;
  const external = a.linkHref.startsWith("https://");
  return (
    <div id="site-announcement" role="region" aria-label="Thông báo" className={`relative z-40 text-sm ${TONE[a.tone]}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <IconSparkle size={16} className="hidden shrink-0 opacity-90 sm:block" />
        <p className="min-w-0 flex-1 text-center font-medium sm:text-left">
          {a.message}
          {a.linkHref ? (
            <>
              {" "}
              {external ? (
                <a href={a.linkHref} rel="noopener" className="group inline-flex items-center gap-1 whitespace-nowrap font-bold underline decoration-2 underline-offset-4 hover:opacity-90">
                  {a.linkLabel}
                  <IconArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              ) : (
                <Link href={a.linkHref} className="group inline-flex items-center gap-1 whitespace-nowrap font-bold underline decoration-2 underline-offset-4 hover:opacity-90">
                  {a.linkLabel}
                  <IconArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </>
          ) : null}
        </p>
        <AnnouncementDismiss version={key} />
      </div>
    </div>
  );
}
