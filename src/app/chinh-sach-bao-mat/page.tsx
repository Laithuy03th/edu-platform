import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { env } from "@/lib/env";
import { pageOpenGraph } from "@/lib/seo";

const title = "Chính sách bảo mật";
const description = "Tự Học thu thập dữ liệu gì, dùng để làm gì, chia sẻ với ai, lưu bao lâu — và cách bạn tải hoặc xóa dữ liệu của mình.";
const UPDATED = "25/11/2026";

export const metadata: Metadata = { title, description, alternates: { canonical: "/chinh-sach-bao-mat" }, openGraph: pageOpenGraph({ title, description, url: "/chinh-sach-bao-mat" }) };

/** Nội dung mô tả ĐÚNG cách hệ thống đang xử lý dữ liệu (mã nguồn). Đổi cách xử lý → cập nhật trang này. */
export default function PrivacyPage() {
  const contact = env().CONTACT_EMAIL;
  return (
    <InfoPage path="/chinh-sach-bao-mat" eyebrow="Quyền riêng tư" title={title} lead="Chúng tôi chỉ thu thập dữ liệu cần để bạn học được, không bán dữ liệu, không quảng cáo và không dùng công cụ theo dõi của bên thứ ba." updated={UPDATED}>
      <h2>1. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>
          <strong>Tài khoản:</strong> email, tên hiển thị, mật khẩu (chỉ lưu dạng băm Argon2id — không ai, kể cả quản trị viên, đọc được mật khẩu gốc), múi giờ; giới thiệu ngắn và mục tiêu học nếu bạn tự nhập. Nếu đăng nhập bằng Google: email đã xác minh, tên và mã tài khoản Google để liên kết.
        </li>
        <li>
          <strong>Hoạt động học:</strong> khóa và lộ trình đã đăng ký, tiến độ từng bài, vị trí xem video, kết quả quiz và bài tập, hàng ôn tập, bài nộp dự án, đánh dấu (bookmark), bản code bạn chủ động “Lưu vào tài khoản” trong playground.
        </li>
        <li>
          <strong>Nội dung bạn đăng:</strong> đánh giá khóa học, câu hỏi và trả lời, báo lỗi nội dung, báo cáo vi phạm.
        </li>
        <li>
          <strong>Ghi chú:</strong> chỉ bạn đọc được. Giảng viên và quản trị viên <em>không có</em> chức năng nào để xem ghi chú của bạn.
        </li>
        <li>
          <strong>Kỹ thuật:</strong> địa chỉ IP dùng để giới hạn số lần đăng nhập/đăng ký (được băm HMAC trước khi lưu vào bộ đếm và tự xóa sau khoảng 1 giờ); nhật ký lỗi máy chủ không chứa mật khẩu, token, cookie hay nội dung ghi chú.
        </li>
      </ul>
      <p>
        <strong>Code trong playground</strong> chạy hoàn toàn trên trình duyệt của bạn, trong khung cách ly; không gửi lên máy chủ trừ khi bạn bấm lưu vào tài khoản. Link chia sẻ chứa code trong phần sau dấu # của địa chỉ — phần này không được gửi tới máy chủ.
      </p>

      <h2>2. Mục đích sử dụng</h2>
      <ul>
        <li>Cung cấp việc học: lưu tiến độ, chấm quiz, gợi ý ôn tập, hiển thị khóa đã đăng ký.</li>
        <li>Gửi email cần thiết: xác minh email, đặt lại mật khẩu, thông báo liên quan tới tài khoản. Không gửi email quảng cáo.</li>
        <li>Bảo mật và chống lạm dụng: giới hạn số lần đăng nhập/đăng ký, nhật ký thao tác quản trị (audit).</li>
        <li>Cải thiện nội dung bằng số liệu tổng hợp theo khóa (số học viên, tỉ lệ hoàn thành từng bài, tỉ lệ đúng từng câu quiz). Giảng viên thấy bài nộp dự án và câu hỏi bạn gửi cho họ; còn tiến độ và kết quả học chỉ hiện với họ ở dạng số liệu tổng hợp, không theo từng người.</li>
      </ul>

      <h2>3. Nhà cung cấp hạ tầng</h2>
      <p>Chúng tôi không bán hay cho thuê dữ liệu. Một số nhà cung cấp xử lý dữ liệu thay chúng tôi để dịch vụ chạy được:</p>
      <ul>
        <li>
          <strong>MongoDB Atlas</strong> — lưu cơ sở dữ liệu.
        </li>
        <li>
          <strong>Cloudinary</strong> — lưu và phân phối ảnh, video bài học (giảng viên tải lên).
        </li>
        <li>
          <strong>Google</strong> — chỉ khi bạn chọn đăng nhập bằng Google.
        </li>
        <li>
          <strong>Dịch vụ gửi email (SMTP)</strong> — gửi email xác minh và đặt lại mật khẩu.
        </li>
        <li>
          <strong>jsDelivr (CDN)</strong> — tải Python (Pyodide) khi bạn mở playground Python; như mọi CDN, họ nhận địa chỉ IP của trình duyệt.
        </li>
      </ul>

      <h2>4. Cookie và lưu trữ trên trình duyệt</h2>
      <ul>
        <li>
          <strong>Cookie phiên đăng nhập</strong> (bắt buộc, HttpOnly — mã JavaScript không đọc được): hết hạn sau 8 giờ không hoạt động, tối đa 7 ngày.
        </li>
        <li>
          <code>tuhoc_theme</code> nhớ giao diện sáng/tối; <code>tuhoc_ann</code> nhớ bạn đã đóng banner thông báo. Không chứa dữ liệu cá nhân.
        </li>
        <li>Bộ nhớ trình duyệt (localStorage): bản nháp playground, tiến độ thử thách, lịch sử truy vấn SQL — chỉ nằm trên máy của bạn.</li>
      </ul>
      <p>Chúng tôi không dùng cookie quảng cáo hay cookie theo dõi của bên thứ ba.</p>

      <h2>5. Những gì hiển thị công khai</h2>
      <ul>
        <li>Tên hiển thị xuất hiện cạnh đánh giá, câu hỏi và trả lời bạn đăng.</li>
        <li>Hồ sơ thành quả (/u/…) chỉ công khai khi bạn bật, và chỉ gồm những khóa học/dự án bạn chọn hiển thị. Email, điểm chi tiết và ghi chú không bao giờ công khai.</li>
      </ul>

      <h2>6. Lưu giữ và xóa dữ liệu</h2>
      <p>Dữ liệu được giữ khi tài khoản còn hoạt động. Khi bạn xóa tài khoản:</p>
      <ul>
        <li>mọi phiên đăng nhập mất hiệu lực ngay; email, mật khẩu, tên, giới thiệu và liên kết Google bị xóa khỏi tài khoản;</li>
        <li>ghi chú, đánh dấu, tiến độ từng bài, kết quả quiz và bài tập, hàng ôn tập, bài nộp dự án, bản lưu playground bị xóa vĩnh viễn;</li>
        <li>đánh giá, câu hỏi/trả lời và báo lỗi nội dung đã đăng được giữ để thảo luận và điểm đánh giá không bị vỡ, nhưng hiển thị là “Người dùng đã xóa”; số lượt đăng ký khóa được giữ dạng ẩn danh cho số liệu tổng hợp.</li>
      </ul>
      <p>Bản sao lưu của nhà cung cấp cơ sở dữ liệu có thể còn chứa dữ liệu cũ thêm một thời gian theo chu kỳ sao lưu của họ rồi tự hết hạn.</p>

      <h2>7. Quyền của bạn</h2>
      <ul>
        <li>
          Xem và sửa hồ sơ trong <Link href="/settings/profile">Cài đặt → Hồ sơ</Link>.
        </li>
        <li>
          <strong>Tải toàn bộ dữ liệu</strong> của bạn (tệp JSON) và <strong>xóa tài khoản</strong> trong <Link href="/settings/security">Cài đặt → Bảo mật → Dữ liệu của bạn</Link>. Tài khoản giảng viên/quản trị cần liên hệ quản trị viên để xóa vì đang gắn với khóa học.
        </li>
        <li>Tắt hồ sơ công khai bất cứ lúc nào; đăng xuất khỏi mọi thiết bị trong Cài đặt → Bảo mật.</li>
      </ul>

      <h2>8. Bảo mật</h2>
      <p>Kết nối mã hóa HTTPS; mật khẩu băm Argon2id; phiên có thể thu hồi ngay; mọi quyền truy cập được kiểm tra ở máy chủ; video bài học (trừ bài học thử) chỉ phát cho học viên đã đăng ký, qua liên kết có chữ ký; code người học chạy trong khung cách ly không đọc được tài khoản. Không hệ thống nào an toàn tuyệt đối — nếu phát hiện lỗ hổng, hãy báo cho chúng tôi.</p>

      <h2>9. Trẻ em</h2>
      <p>Nếu bạn dưới 16 tuổi, hãy dùng Tự Học khi có sự đồng ý và hướng dẫn của cha mẹ hoặc người giám hộ.</p>

      <h2>10. Thay đổi và liên hệ</h2>
      <p>
        Khi chính sách thay đổi, chúng tôi cập nhật ngày ở đầu trang; thay đổi quan trọng sẽ được thông báo trên site.{" "}
        {contact ? (
          <>
            Câu hỏi về quyền riêng tư: <a href={`mailto:${contact}`}>{contact}</a>.
          </>
        ) : (
          <>
            Xem các kênh liên hệ ở trang <Link href="/lien-he">Liên hệ</Link>.
          </>
        )}
      </p>
    </InfoPage>
  );
}
