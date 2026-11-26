import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { pageOpenGraph } from "@/lib/seo";

const title = "Điều khoản sử dụng";
const description = "Quy định khi dùng Tự Học: tài khoản, nội dung học, nội dung bạn đăng, playground chạy code, hành vi bị cấm và giới hạn trách nhiệm.";
const UPDATED = "25/11/2026";

export const metadata: Metadata = { title, description, alternates: { canonical: "/dieu-khoan-su-dung" }, openGraph: pageOpenGraph({ title, description, url: "/dieu-khoan-su-dung" }) };

export default function TermsPage() {
  return (
    <InfoPage path="/dieu-khoan-su-dung" eyebrow="Quy định" title={title} lead="Ngắn gọn: học tử tế, tôn trọng người khác, không phá hệ thống. Chi tiết bên dưới." updated={UPDATED}>
      <h2>1. Chấp nhận điều khoản</h2>
      <p>
        Khi tạo tài khoản hoặc sử dụng Tự Học, bạn đồng ý với các điều khoản này và <Link href="/chinh-sach-bao-mat">chính sách bảo mật</Link>. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.
      </p>

      <h2>2. Tình trạng dịch vụ</h2>
      <p>Tự Học hiện là dự án demo học tập, miễn phí trong phạm vi demo. Tính năng và nội dung có thể thay đổi, tạm ngưng để bảo trì hoặc vì giới hạn hạ tầng; chúng tôi không cam kết thời gian hoạt động liên tục.</p>

      <h2>3. Tài khoản</h2>
      <ul>
        <li>Cung cấp email thật của bạn, giữ bí mật mật khẩu; mỗi người dùng một tài khoản.</li>
        <li>Bạn chịu trách nhiệm cho hoạt động dưới tài khoản của mình. Nghi ngờ bị lộ mật khẩu: đổi mật khẩu và chọn “Đăng xuất tất cả thiết bị”.</li>
        <li>
          Bạn có thể tải dữ liệu hoặc xóa tài khoản bất cứ lúc nào trong <Link href="/settings/security">Cài đặt → Bảo mật</Link>.
        </li>
      </ul>

      <h2>4. Nội dung học</h2>
      <ul>
        <li>Bài học, video, quiz thuộc quyền của tác giả và Tự Học; bạn được dùng cho việc học cá nhân, không sao chép hay phân phối lại hàng loạt.</li>
        <li>Đoạn code mẫu trong bài được phép dùng lại trong dự án của bạn.</li>
        <li>
          Nội dung có thể có sai sót hoặc lỗi thời dù đã ghi phiên bản kiểm thử — hãy dùng nút <strong>Báo lỗi nội dung</strong> trong trang học để chúng tôi sửa.
        </li>
      </ul>

      <h2>5. Nội dung bạn đăng</h2>
      <ul>
        <li>Bạn giữ quyền với đánh giá, câu hỏi, trả lời, bài nộp và code của mình, và cho phép Tự Học hiển thị chúng trong phạm vi tính năng tương ứng.</li>
        <li>Không đăng nội dung vi phạm pháp luật, xúc phạm, quấy rối, spam, quảng cáo, mã độc, thông tin cá nhân của người khác hoặc nội dung vi phạm bản quyền.</li>
        <li>Quản trị viên có thể ẩn nội dung vi phạm (có ghi lý do) và khóa tài khoản vi phạm nghiêm trọng hoặc lặp lại.</li>
      </ul>

      <h2>6. Giảng viên</h2>
      <ul>
        <li>Chỉ tải lên nội dung, ảnh, video mà bạn có quyền sử dụng; khai báo nguồn và giấy phép của ảnh khi được yêu cầu.</li>
        <li>Khóa học và bài hướng dẫn phải qua quản trị viên duyệt trước khi xuất bản; quản trị viên có thể từ chối, yêu cầu sửa hoặc tạm ngưng nội dung.</li>
        <li>Không thu thập dữ liệu cá nhân của học viên ngoài các công cụ nền tảng cung cấp.</li>
      </ul>

      <h2>7. Playground chạy code</h2>
      <ul>
        <li>Code chạy trên trình duyệt của bạn, trong khung cách ly không đọc được tài khoản; chương trình chạy quá lâu sẽ bị dừng.</li>
        <li>Không dùng playground để tấn công hệ thống khác, đào tiền mã hóa hay phát tán mã độc.</li>
        <li>Link chia sẻ có thể chứa code của người khác — hãy đọc trước khi chạy.</li>
      </ul>

      <h2>8. Hành vi bị cấm</h2>
      <p>Truy cập trái phép tài khoản hay dữ liệu của người khác; dò quét lỗ hổng không được phép; thu thập dữ liệu tự động quy mô lớn; cố tình vượt giới hạn tần suất hoặc gây quá tải hệ thống; mạo danh người khác.</p>

      <h2>9. Không bảo đảm và giới hạn trách nhiệm</h2>
      <p>Dịch vụ được cung cấp “như hiện có” cho mục đích học tập. Trong phạm vi pháp luật cho phép, Tự Học không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc dùng nội dung hay code mẫu trong môi trường thật. Kỹ năng hiển thị trên hồ sơ thành quả là kỹ năng đã thực hành trên nền tảng, không phải chứng chỉ được kiểm định.</p>

      <h2>10. Luật áp dụng và thay đổi</h2>
      <p>
        Điều khoản này được điều chỉnh theo pháp luật Việt Nam. Khi điều khoản thay đổi, ngày cập nhật ở đầu trang sẽ đổi theo; tiếp tục sử dụng sau thay đổi nghĩa là bạn đồng ý với bản mới. Câu hỏi về điều khoản: xem trang <Link href="/lien-he">Liên hệ</Link>.
      </p>
    </InfoPage>
  );
}
