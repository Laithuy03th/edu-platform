export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";
  if (url) {
    return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
