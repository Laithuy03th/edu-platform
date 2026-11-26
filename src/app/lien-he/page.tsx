import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { env } from "@/lib/env";
import { pageOpenGraph } from "@/lib/seo";

const title = "Liên hệ";
const description = "Cách liên hệ Tự Học: báo lỗi nội dung ngay trong bài, hỏi giảng viên ở mục Hỏi đáp, đăng ký làm giảng viên, góp ý về quyền riêng tư.";

export const metadata: Metadata = { title, description, alternates: { canonical: "/lien-he" }, openGraph: pageOpenGraph({ title, description, url: "/lien-he" }) };

export default function ContactPage() {
  const contact = env().CONTACT_EMAIL;
  return (
    <InfoPage path="/lien-he" eyebrow="Hỗ trợ" title={title} lead="Chọn kênh phù hợp — câu hỏi đúng chỗ sẽ được trả lời nhanh hơn.">
      <h2>Thấy lỗi trong bài học</h2>
      <p>
        Bấm <strong>Báo lỗi nội dung</strong> ngay trong trang học: chọn loại lỗi (code lỗi, lỗi thời so với phiên bản mới, nội dung sai, khó hiểu, lỗi chính tả, video/ảnh…), mô tả vị trí và môi trường của bạn. Báo cáo đi thẳng tới giảng viên phụ trách và được theo dõi tới khi xử lý xong.
      </p>

      <h2>Chưa hiểu bài</h2>
      <p>Dùng mục <strong>Hỏi đáp</strong> bên dưới mỗi bài học (sau khi đăng ký khóa). Giảng viên và học viên khác có thể trả lời; câu trả lời hữu ích được đánh dấu để người sau dễ tìm.</p>

      <h2>Muốn trở thành giảng viên</h2>
      <p>
        Đăng nhập rồi vào <Link href="/settings/profile">Cài đặt → Hồ sơ → Trở thành giảng viên</Link>, giới thiệu kinh nghiệm và (nếu có) liên kết tới một bài viết hoặc dự án mẫu. Quản trị viên sẽ xem xét và phản hồi trong ứng dụng.
      </p>

      <h2>Tài khoản, quyền riêng tư và góp ý chung</h2>
      {contact ? (
        <p>
          Gửi email tới <a href={`mailto:${contact}`}>{contact}</a>. Vì lý do bảo mật, đừng gửi mật khẩu qua email — chúng tôi không bao giờ hỏi mật khẩu của bạn.
        </p>
      ) : (
        <p>Kênh email công khai sẽ được công bố khi Tự Học chính thức hoạt động. Trong lúc này, hãy dùng báo lỗi nội dung hoặc hỏi đáp trong bài học.</p>
      )}
      <ul>
        <li>
          Tự tải dữ liệu hoặc xóa tài khoản: <Link href="/settings/security">Cài đặt → Bảo mật → Dữ liệu của bạn</Link>.
        </li>
        <li>
          Quên mật khẩu: dùng <Link href="/forgot-password">Quên mật khẩu</Link> ở trang đăng nhập.
        </li>
      </ul>
    </InfoPage>
  );
}
