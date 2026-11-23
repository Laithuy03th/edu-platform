/* Hàm thuần cho lộ trình (D8, D9). */

export type GraphItem = { itemId: string; dependsOn: string[] };

/** Trả về chu trình đầu tiên tìm thấy (danh sách itemId) hoặc null nếu là DAG. Phụ thuộc tới item không tồn tại cũng là lỗi. */
export function findCycle(items: GraphItem[]): string[] | null {
  const ids = new Set(items.map((i) => i.itemId));
  const deps = new Map(items.map((i) => [i.itemId, i.dependsOn]));
  for (const i of items) for (const d of i.dependsOn) if (!ids.has(d)) return [i.itemId, d];
  const state = new Map<string, 0 | 1 | 2>(); // 0 chưa thăm, 1 đang thăm, 2 xong
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id) ?? 0;
    if (s === 2) return null;
    if (s === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const d of deps.get(id) ?? []) {
      const cyc = visit(d);
      if (cyc) return cyc;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const i of items) {
    const cyc = visit(i.itemId);
    if (cyc) return cyc;
  }
  return null;
}

/**
 * Tiến độ lộ trình: hợp tập lessonId của các mục BẮT BUỘC còn khả dụng → không đếm trùng
 * (khóa + bài thuộc khóa đó trong cùng lộ trình chỉ tính một lần). Mục không khả dụng bị loại khỏi mẫu số.
 */
export function pathProgress(items: { required: boolean; available: boolean; lessonIds: string[] }[], completed: Set<string>) {
  const required = new Set<string>();
  for (const it of items) if (it.required && it.available) for (const l of it.lessonIds) required.add(l);
  let done = 0;
  for (const l of required) if (completed.has(l)) done++;
  return { completed: done, total: required.size, percent: required.size === 0 ? 0 : Math.round((done / required.size) * 100) };
}
