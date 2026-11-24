/** Cookie nhớ phiên bản banner thông báo người dùng đã đóng (không chứa dữ liệu cá nhân). */
export const ANN_COOKIE = "tuhoc_ann";

/** Lựa chọn giao diện (U07): light | dark | system. Mặc định light. */
export const THEME_COOKIE = "tuhoc_theme";
export type ThemePref = "light" | "dark" | "system";
export const parseTheme = (v: string | undefined): ThemePref => (v === "dark" || v === "system" ? v : "light");
