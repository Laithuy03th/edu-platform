/**
 * Cache trong bộ nhớ tiến trình cho dữ liệu BẤT BIẾN theo khóa phiên bản (vd `${courseId}:${publishedVersion}`).
 * Không có TTL vì khóa đổi khi nội dung đổi (duyệt mới → version mới) → không bao giờ trả dữ liệu cũ.
 * LRU giới hạn số mục để không phình bộ nhớ. Mỗi instance server có cache riêng (không cần đồng bộ).
 */
export function versionCache<T>(max = 500) {
  const map = new Map<string, Promise<T>>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = map.get(key);
    if (hit) {
      map.delete(key);
      map.set(key, hit); // cập nhật thứ tự LRU
      return hit;
    }
    const p = load().catch((err) => {
      map.delete(key); // lỗi tạm thời không bị cache
      throw err;
    });
    map.set(key, p);
    if (map.size > max) map.delete(map.keys().next().value!);
    return p;
  };
}
