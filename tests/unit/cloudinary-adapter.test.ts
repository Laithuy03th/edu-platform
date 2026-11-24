import { beforeEach, describe, expect, it, vi } from "vitest";

const resource = vi.fn();
vi.mock("cloudinary", () => ({ v2: { config: vi.fn(), api: { resource } } }));

/**
 * Hồi quy M09 (phát hiện khi tải video thật lên tài khoản Free 2026-11-24):
 * Admin API chỉ trả `duration` của video khi có `media_metadata: true`; thiếu nó, finalize từ chối mọi video.
 */
describe("fetchResource (adapter Cloudinary)", () => {
  beforeEach(() => {
    vi.resetModules();
    resource.mockReset().mockResolvedValue({ public_id: "x" });
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "secret");
  });

  it("video: yêu cầu media_metadata để có duration", async () => {
    const { fetchResource } = await import("@/server/cloudinary");
    await fetchResource("lms/x", "video", "authenticated");
    expect(resource).toHaveBeenCalledWith("lms/x", { resource_type: "video", type: "authenticated", media_metadata: true });
  });

  it("ảnh: không cần metadata bổ sung", async () => {
    const { fetchResource } = await import("@/server/cloudinary");
    await fetchResource("lms/y", "image", "upload");
    expect(resource).toHaveBeenCalledWith("lms/y", { resource_type: "image", type: "upload" });
  });
});
