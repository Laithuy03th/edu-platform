import type { Metadata } from "next";
import { IconCheck, IconNote, IconRepeat, IconRubric } from "@/components/icons";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Bố cục xác thực: form bên trái, panel nhận diện thương hiệu bên phải (ẩn trên mobile). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-grain-warm">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl lg:grid-cols-2">
        <div className="flex items-start justify-center px-4 py-10 sm:items-center sm:py-16">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </div>
        <aside className="relative hidden overflow-hidden lg:m-6 lg:block lg:rounded-[2rem] lg:bg-gradient-to-br lg:from-brand-700 lg:via-brand-800 lg:to-brand-900" aria-hidden>
          <div className="bg-dots absolute inset-0 opacity-25" />
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-brand-400/30 blur-3xl" />
          <div className="relative flex h-full flex-col justify-center gap-8 p-12 text-white">
            <p className="text-caption text-brand-200">Tự Học</p>
            <p className="text-h1 max-w-md">Mỗi buổi học ngắn, nhưng bạn nhớ được lâu hơn.</p>
            <ul className="stagger-in space-y-4">
              {[
                { icon: <IconNote size={18} />, t: "Ghi chú đúng giây đang xem video" },
                { icon: <IconRepeat size={18} />, t: "Câu sai tự vào lịch ôn 1 → 3 → 7 → 14 ngày" },
                { icon: <IconRubric size={18} />, t: "Dự án có rubric và phản hồi của giảng viên" },
                { icon: <IconCheck size={18} />, t: "Lưu vị trí học tự động trên mọi thiết bị" },
              ].map((x, i) => (
                <li key={x.t} style={{ "--i": i } as React.CSSProperties} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/15">{x.icon}</span>
                  {x.t}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
