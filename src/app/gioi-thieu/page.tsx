import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { pageOpenGraph } from "@/lib/seo";

const title = "Giới thiệu Tự Học";
const description = "Tự Học là nền tảng học lập trình tiếng Việt theo lộ trình: bài đọc ngắn, video vừa đủ, quiz chấm ngay, ôn tập câu sai, dự án có rubric và playground chạy code ngay trên trình duyệt.";

export const metadata: Metadata = { title, description, alternates: { canonical: "/gioi-thieu" }, openGraph: pageOpenGraph({ title, description, url: "/gioi-thieu" }) };

export default function AboutPage() {
  return (
    <InfoPage path="/gioi-thieu" eyebrow="Về chúng tôi" title={title} lead="Học lập trình bằng tiếng Việt, có lộ trình rõ ràng, thực hành ngay trên trình duyệt và biết mình đang tiến bộ tới đâu.">
      <h2>Tự Học giúp bạn học như thế nào</h2>
      <ul>
        <li>
          <strong>Lộ trình theo mục tiêu</strong> — chọn <Link href="/paths">lộ trình</Link> (vd Full-stack JavaScript) hoặc <Link href="/technologies">học theo công nghệ</Link>; mỗi khóa ghi rõ kiến thức nền cần có.
        </li>
        <li>
          <strong>Bài học ngắn</strong> — bài đọc có mục tiêu, khối code tô màu bấm “Chạy thử” được; video ngắn có phụ đề/transcript, không tự phát.
        </li>
        <li>
          <strong>Kiểm tra hiểu bài</strong> — quiz chấm ngay ở máy chủ, câu sai tự vào hàng <em>ôn tập</em> để ôn lại đúng lúc sắp quên.
        </li>
        <li>
          <strong>Thực hành thật</strong> — bài tập code, dự án có rubric để giảng viên nhận xét, và <Link href="/playground">playground</Link> HTML/CSS/JS, <Link href="/playground/sql">SQL</Link>, <Link href="/playground/python">Python</Link> chạy ngay trên trình duyệt, có thử thách chấm tự động.
        </li>
        <li>
          <strong>Ghi chú riêng tư</strong> — ghi chú theo bài và theo thời điểm video; chỉ bạn đọc được.
        </li>
      </ul>

      <h2>Cách chúng tôi làm nội dung</h2>
      <p>Nội dung lập trình cũ đi rất nhanh, nên mỗi khóa học và bài hướng dẫn công khai đều ghi rõ:</p>
      <ul>
        <li>công nghệ và <strong>phiên bản đã kiểm thử</strong> (vd Next.js 16, Node.js 24), môi trường chạy thử;</li>
        <li>
          <strong>ngày cập nhật nội dung</strong> thật — chỉ đổi khi nội dung công khai thay đổi;
        </li>
        <li>
          trạng thái <strong>review chuyên môn</strong>: tên người review và ngày review; nội dung chưa được review được gắn nhãn rõ ràng, nội dung đổi sau lần review cũng được đánh dấu;
        </li>
        <li>nút <strong>báo lỗi nội dung</strong> ngay trong trang học — giảng viên nhận và xử lý theo hàng đợi.</li>
      </ul>
      <p>Giảng viên được duyệt hồ sơ trước khi soạn bài; mọi khóa học và bài hướng dẫn phải qua quản trị viên duyệt trước khi xuất bản.</p>

      <h2>Dành cho ai</h2>
      <p>Người mới bắt đầu, sinh viên công nghệ thông tin và người chuyển ngành muốn học bài bản bằng tiếng Việt — từ HTML/CSS, JavaScript tới Next.js, MongoDB, SQL và Python.</p>

      <h2>Minh bạch</h2>
      <ul>
        <li>Tự Học hiện là dự án demo học tập: nội dung mẫu do dự án tự biên soạn, miễn phí trong phạm vi demo.</li>
        <li>
          Không quảng cáo, không bán dữ liệu, không dùng công cụ theo dõi của bên thứ ba — xem <Link href="/chinh-sach-bao-mat">chính sách bảo mật</Link>.
        </li>
        <li>Kỹ năng trên hồ sơ thành quả là kỹ năng đã thực hành trên nền tảng, không phải chứng chỉ kiểm định.</li>
      </ul>
      <p>
        Bắt đầu từ <Link href="/courses">danh sách khóa học</Link> hoặc <Link href="/register">tạo tài khoản miễn phí</Link>. Có góp ý? Ghé trang <Link href="/lien-he">liên hệ</Link>.
      </p>
    </InfoPage>
  );
}
