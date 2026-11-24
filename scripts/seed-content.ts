/* Nội dung mẫu do dự án TỰ BIÊN SOẠN (không sao chép khóa học có bản quyền). Chỉ bài đọc — video cần upload thật qua pipeline. */

export type SeedQuestion = { prompt: string; options: string[]; correct: number; explanation: string; topicKey?: string };
export type SeedLesson = { title: string; minutes: number; preview?: boolean; optional?: boolean; objectives: string[]; content: string; quiz?: { title: string; questions: SeedQuestion[] }; project?: boolean };
export type SeedChapter = { title: string; description: string; topicKey: string; lessons: SeedLesson[] };
export type SeedCourse = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  chapters: SeedChapter[];
  placement?: SeedQuestion[];
  project?: { title: string; brief: string; objectives: string[]; requirements: string[]; checklist: string[]; rubric: { title: string; max: number; pass: string; fail: string; skill: string }[] };
};

export const CATEGORIES = [
  { slug: "web-frontend", name: "Web Frontend", order: 1 },
  { slug: "backend-database", name: "Backend & Database", order: 2 },
  { slug: "cong-cu-trien-khai", name: "Công cụ & triển khai", order: 3 },
];

export const COURSES: SeedCourse[] = [
  {
    slug: "nextjs-co-ban",
    title: "Next.js cơ bản cho người mới",
    shortDescription: "Xây ứng dụng web đầu tiên với App Router: routing, Server Components, lấy dữ liệu, form và triển khai.",
    description: `Khóa học dành cho người đã biết HTML, CSS và JavaScript cơ bản, muốn làm ứng dụng web hoàn chỉnh với **Next.js App Router**.

Mỗi chương gồm vài bài đọc ngắn, một quiz kiểm tra nhanh và kết thúc bằng **dự án blog cá nhân** có rubric rõ ràng.

> Nội dung mẫu do dự án Tự Học tự biên soạn cho mục đích demo.`,
    objectives: ["Hiểu cách App Router ánh xạ thư mục thành route", "Phân biệt Server Component và Client Component", "Lấy dữ liệu an toàn trên server", "Xử lý form bằng Server Actions", "Triển khai ứng dụng với biến môi trường đúng cách"],
    prerequisites: ["HTML/CSS cơ bản", "JavaScript ES2015+ (hàm, module, async/await)", "Biết dùng terminal ở mức cơ bản"],
    category: "web-frontend",
    level: "beginner",
    chapters: [
      {
        title: "Làm quen với Next.js",
        description: "Next.js là gì và cách tạo dự án đầu tiên.",
        topicKey: "co-ban",
        lessons: [
          {
            title: "Next.js là gì và giải quyết vấn đề gì?",
            minutes: 6,
            preview: true,
            objectives: ["Biết Next.js bổ sung gì cho React", "Hiểu khái niệm render phía server"],
            content: `## React và những phần còn thiếu

React giúp xây giao diện bằng component, nhưng một ứng dụng thật còn cần **routing**, **lấy dữ liệu**, **tối ưu ảnh/font**, **xử lý form** và **triển khai**. Next.js là framework gói những phần đó lại theo một quy ước thống nhất.

## Render ở đâu?

- **Server rendering**: HTML được tạo trên server, trình duyệt nhận nội dung ngay — tốt cho tốc độ hiển thị và SEO.
- **Client rendering**: JavaScript chạy trên trình duyệt để tạo giao diện — cần thiết khi có tương tác như bấm nút, nhập liệu.

Next.js cho phép **kết hợp cả hai** trong cùng một trang.

## Khi nào nên dùng Next.js?

| Phù hợp | Cân nhắc lại |
|---|---|
| Trang nội dung cần SEO | Ứng dụng chỉ chạy offline |
| Ứng dụng có đăng nhập, dashboard | Widget nhỏ nhúng vào trang khác |

**Ghi nhớ:** Next.js không thay React — nó là React cộng với các quy ước và công cụ cho ứng dụng hoàn chỉnh.`,
          },
          {
            title: "Tạo dự án đầu tiên",
            minutes: 8,
            preview: true,
            objectives: ["Khởi tạo dự án bằng create-next-app", "Hiểu cấu trúc thư mục chính"],
            content: `## Khởi tạo

\`\`\`bash
npx create-next-app@latest blog-cua-toi
cd blog-cua-toi
npm run dev
\`\`\`

Mở \`http://localhost:3000\` để thấy trang mặc định.

## Cấu trúc quan trọng

\`\`\`text
app/
  layout.tsx   ← khung chung (html, body, header)
  page.tsx     ← trang "/"
public/        ← file tĩnh (favicon, ảnh)
next.config.ts ← cấu hình
\`\`\`

## Sửa trang chủ

\`\`\`tsx
export default function Page() {
  return <h1>Xin chào, đây là blog của tôi!</h1>;
}
\`\`\`

Lưu file — trình duyệt tự cập nhật nhờ **Fast Refresh**.

**Bài tập nhỏ:** thêm một đoạn giới thiệu bản thân dưới tiêu đề.`,
            quiz: {
              title: "Kiểm tra nhanh: làm quen Next.js",
              questions: [
                { prompt: "File nào định nghĩa trang ở đường dẫn `/` trong App Router?", options: ["app/index.tsx", "app/page.tsx", "pages/home.tsx", "app/route.ts"], correct: 1, explanation: "Trong App Router, `page.tsx` trong một thư mục định nghĩa trang của route đó; `app/page.tsx` là `/`." },
                { prompt: "Next.js bổ sung cho React điều gì?", options: ["Một cú pháp JSX mới", "Routing, lấy dữ liệu, tối ưu và quy ước triển khai", "Thay thế hoàn toàn React", "Chỉ là công cụ CSS"], correct: 1, explanation: "Next.js là framework xây trên React, cung cấp routing, data fetching, tối ưu và quy ước cho ứng dụng hoàn chỉnh." },
                { prompt: "Thư mục `public/` dùng để làm gì?", options: ["Chứa component dùng chung", "Chứa file tĩnh phục vụ trực tiếp", "Chứa biến môi trường", "Chứa API"], correct: 1, explanation: "File trong `public/` được phục vụ nguyên trạng tại đường dẫn gốc, ví dụ `/favicon.ico`." },
              ],
            },
          },
        ],
      },
      {
        title: "Routing và rendering",
        description: "Route lồng nhau, Server/Client Components và lấy dữ liệu.",
        topicKey: "rendering",
        lessons: [
          {
            title: "App Router: thư mục là route",
            minutes: 9,
            objectives: ["Tạo route tĩnh và động", "Dùng layout lồng nhau"],
            content: `## Thư mục = đoạn URL

\`\`\`text
app/
  page.tsx              → /
  bai-viet/
    page.tsx            → /bai-viet
    [slug]/
      page.tsx          → /bai-viet/hoc-nextjs
\`\`\`

## Route động

\`\`\`tsx
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <h1>Bài viết: {slug}</h1>;
}
\`\`\`

## Layout lồng nhau

\`layout.tsx\` bọc mọi trang con và **giữ nguyên khi chuyển trang** — hợp cho sidebar, header.

## Trạng thái đặc biệt

- \`loading.tsx\`: hiển thị trong lúc chờ dữ liệu.
- \`not-found.tsx\`: khi gọi \`notFound()\`.
- \`error.tsx\`: bắt lỗi trong phân đoạn route.`,
          },
          {
            title: "Server Component và Client Component",
            minutes: 10,
            objectives: ["Biết mặc định component chạy ở đâu", "Biết khi nào cần 'use client'"],
            content: `## Mặc định là Server Component

Trong App Router, component **mặc định chạy trên server**: đọc dữ liệu trực tiếp, không gửi JavaScript của chính nó xuống trình duyệt.

## Khi nào cần Client Component?

Thêm \`"use client"\` ở đầu file khi cần:

- \`useState\`, \`useEffect\` hoặc hook khác
- Sự kiện như \`onClick\`, \`onChange\`
- API chỉ có trên trình duyệt (\`localStorage\`, \`window\`)

\`\`\`tsx
"use client";
import { useState } from "react";

export function LikeButton() {
  const [likes, setLikes] = useState(0);
  return <button onClick={() => setLikes(likes + 1)}>❤ {likes}</button>;
}
\`\`\`

## Mẹo

Giữ phần lớn trang là Server Component, chỉ tách **phần tương tác nhỏ** thành Client Component. Không đặt bí mật (API key) trong Client Component.`,
          },
          {
            title: "Lấy dữ liệu trên server",
            minutes: 9,
            objectives: ["Gọi dữ liệu trong Server Component", "Hiểu vì sao không lộ bí mật"],
            content: `## Gọi thẳng trong component

\`\`\`tsx
async function getPosts() {
  const res = await fetch("https://example.com/api/posts");
  if (!res.ok) throw new Error("Không tải được bài viết");
  return res.json() as Promise<{ id: string; title: string }[]>;
}

export default async function Page() {
  const posts = await getPosts();
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
\`\`\`

## Vì sao an toàn hơn?

Code chạy trên server nên **chuỗi kết nối database hay API key không xuống trình duyệt**. Dùng gói \`server-only\` để chắc chắn một module không bị import nhầm vào client.

## Kiểm tra quyền gần dữ liệu

Đừng chỉ ẩn nút trên giao diện. Hàm lấy dữ liệu riêng tư phải tự kiểm tra người dùng hiện tại.`,
            quiz: {
              title: "Kiểm tra nhanh: routing và rendering",
              questions: [
                { prompt: "Khi nào cần thêm `\"use client\"`?", options: ["Khi component lấy dữ liệu", "Khi component dùng useState hoặc onClick", "Với mọi component", "Khi component có CSS"], correct: 1, explanation: "Hook trạng thái và sự kiện tương tác chỉ chạy trên trình duyệt nên cần Client Component.", topicKey: "rendering" },
                { prompt: "Đường dẫn `/bai-viet/abc` ứng với file nào?", options: ["app/bai-viet/abc.tsx", "app/bai-viet/[slug]/page.tsx", "app/[slug]/bai-viet.tsx", "pages/bai-viet.tsx"], correct: 1, explanation: "Thư mục `[slug]` tạo đoạn route động; `page.tsx` bên trong là trang.", topicKey: "routing" },
                { prompt: "Vì sao lấy dữ liệu trong Server Component giúp bảo vệ API key?", options: ["Vì key được mã hóa tự động", "Vì code chạy trên server, key không gửi xuống trình duyệt", "Vì trình duyệt chặn key", "Không bảo vệ được"], correct: 1, explanation: "Code Server Component không nằm trong bundle JavaScript gửi cho trình duyệt.", topicKey: "rendering" },
                { prompt: "`layout.tsx` có đặc điểm gì khi chuyển giữa các trang con?", options: ["Bị render lại toàn bộ", "Được giữ nguyên", "Bị xóa", "Chỉ chạy một lần khi build"], correct: 1, explanation: "Layout được giữ nguyên khi điều hướng giữa các trang con.", topicKey: "routing" },
              ],
            },
          },
        ],
      },
      {
        title: "Form và triển khai",
        description: "Xử lý form bằng Server Actions và đưa ứng dụng lên mạng.",
        topicKey: "form",
        lessons: [
          {
            title: "Server Actions và form",
            minutes: 10,
            objectives: ["Viết Server Action xử lý form", "Validate dữ liệu ở server"],
            content: `## Server Action là gì?

Là hàm \`async\` chạy trên server, có thể gọi trực tiếp từ form.

\`\`\`tsx
async function createPost(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) throw new Error("Tiêu đề quá ngắn");
  // lưu vào database...
}

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required minLength={3} />
      <button type="submit">Đăng bài</button>
    </form>
  );
}
\`\`\`

## Nguyên tắc an toàn

1. **Validate ở server** — kiểm tra ở trình duyệt chỉ để trải nghiệm tốt hơn.
2. **Kiểm tra quyền trong chính action** — action có thể bị gọi trực tiếp.
3. **Không tin userId gửi từ form** — lấy từ phiên đăng nhập.`,
          },
          {
            title: "Triển khai và biến môi trường",
            minutes: 8,
            objectives: ["Phân biệt biến môi trường server và client", "Chuẩn bị build production"],
            content: `## Biến môi trường

\`\`\`bash
# .env.local — KHÔNG commit
DATABASE_URL=...
NEXT_PUBLIC_SITE_NAME=Blog của tôi
\`\`\`

- Biến **không** có tiền tố \`NEXT_PUBLIC_\` chỉ đọc được trên server.
- Biến có \`NEXT_PUBLIC_\` sẽ được nhúng vào JavaScript gửi xuống trình duyệt — **tuyệt đối không đặt bí mật ở đây**.

## Build thử trước khi deploy

\`\`\`bash
npm run build
npm run start
\`\`\`

Build thành công trên máy là bước kiểm tra quan trọng: lỗi kiểu dữ liệu và lỗi import thường lộ ra ở đây.

## Checklist trước khi đưa lên mạng

- [ ] Đã khai báo đủ biến môi trường trên hosting
- [ ] \`.env.local\` có trong \`.gitignore\`
- [ ] Trang lỗi và trang 404 hiển thị thân thiện`,
            project: true,
            quiz: {
              title: "Kiểm tra nhanh: form và triển khai",
              questions: [
                { prompt: "Biến nào có thể bị lộ ra trình duyệt?", options: ["DATABASE_URL", "NEXT_PUBLIC_SITE_NAME", "AUTH_SECRET", "Không biến nào"], correct: 1, explanation: "Biến có tiền tố `NEXT_PUBLIC_` được nhúng vào bundle client.", topicKey: "form" },
                { prompt: "Vì sao phải kiểm tra quyền bên trong Server Action?", options: ["Để code đẹp hơn", "Vì action có thể bị gọi trực tiếp, không qua giao diện", "Vì Next.js yêu cầu cú pháp", "Không cần thiết"], correct: 1, explanation: "Server Action là endpoint có thể gọi trực tiếp; kiểm tra ở trang không bảo vệ action.", topicKey: "form" },
                { prompt: "Validate ở trình duyệt có đủ an toàn không?", options: ["Có", "Không — server vẫn phải validate", "Chỉ khi dùng TypeScript", "Chỉ với form ngắn"], correct: 1, explanation: "Kiểm tra phía client có thể bị bỏ qua; server là nơi quyết định.", topicKey: "form" },
              ],
            },
          },
        ],
      },
    ],
    placement: [
      { prompt: "Trong App Router, thư mục `app/gioi-thieu/page.tsx` tạo route nào?", options: ["/gioi-thieu", "/page", "/app/gioi-thieu", "Không tạo route"], correct: 0, explanation: "Thư mục là đoạn URL, `page.tsx` là trang.", topicKey: "rendering" },
      { prompt: "Component nào cần `\"use client\"`?", options: ["Hiển thị danh sách bài viết từ database", "Nút bấm tăng số lượt thích", "Layout chứa header tĩnh", "Trang giới thiệu tĩnh"], correct: 1, explanation: "Nút có trạng thái và sự kiện là Client Component.", topicKey: "rendering" },
      { prompt: "Nơi nào an toàn để đặt chuỗi kết nối database?", options: ["Biến NEXT_PUBLIC_DB", "Code Client Component", "Biến môi trường không có NEXT_PUBLIC_, đọc ở server", "localStorage"], correct: 2, explanation: "Bí mật chỉ đọc ở server.", topicKey: "form" },
      { prompt: "Server Action nên lấy userId từ đâu?", options: ["Hidden input trong form", "Phiên đăng nhập ở server", "Query string", "localStorage"], correct: 1, explanation: "Không tin định danh do client gửi.", topicKey: "form" },
    ],
    project: {
      title: "Dự án: Blog cá nhân với Next.js",
      brief: `Xây một blog cá nhân nhỏ bằng Next.js App Router.

- Trang chủ liệt kê bài viết, trang chi tiết theo \`slug\`.
- Dữ liệu bài viết có thể lấy từ file JSON hoặc database.
- Có form liên hệ xử lý bằng Server Action (chỉ cần validate và hiển thị kết quả).

Nộp **link GitHub** và **link demo** (nếu có).`,
      objectives: ["Áp dụng route động", "Tách Server/Client Component hợp lý", "Xử lý form an toàn"],
      requirements: ["Ít nhất 3 bài viết mẫu", "Route động /bai-viet/[slug]", "Trang 404 thân thiện", "Form liên hệ validate ở server"],
      checklist: ["Có README hướng dẫn chạy", "Không commit .env.local", "Build production thành công"],
      rubric: [
        { title: "Routing đúng và đầy đủ", max: 30, pass: "Trang chủ, chi tiết theo slug, 404 hoạt động", fail: "Thiếu route hoặc slug sai trả lỗi trắng", skill: "nextjs-routing" },
        { title: "Phân tách Server/Client Component", max: 25, pass: "Chỉ phần tương tác là Client Component", fail: "Toàn bộ trang dùng use client không cần thiết", skill: "react-server-components" },
        { title: "Form & validate ở server", max: 25, pass: "Validate ở server, báo lỗi rõ", fail: "Chỉ validate ở trình duyệt", skill: "server-actions" },
        { title: "Chất lượng repo", max: 20, pass: "README rõ, không lộ bí mật, build được", fail: "Thiếu README hoặc commit secrets", skill: "git-hygiene" },
      ],
    },
  },
  {
    slug: "mongodb-cho-web-developer",
    title: "MongoDB cho web developer",
    shortDescription: "Mô hình document, CRUD, index, thiết kế schema và bảo mật kết nối cho ứng dụng web thực tế.",
    description: `Khóa học giúp bạn dùng MongoDB **đúng cách** trong ứng dụng web: hiểu mô hình document, viết truy vấn hiệu quả với index, thiết kế schema theo cách đọc dữ liệu và kết nối an toàn.

> Nội dung mẫu do dự án Tự Học tự biên soạn cho mục đích demo.`,
    objectives: ["Hiểu mô hình document và khi nào nhúng/tham chiếu", "Viết CRUD với driver Node.js", "Tạo index theo truy vấn thực tế", "Tránh NoSQL injection và lộ thông tin kết nối"],
    prerequisites: ["JavaScript/TypeScript cơ bản", "Biết khái niệm API và JSON"],
    category: "backend-database",
    level: "intermediate",
    chapters: [
      {
        title: "Mô hình document",
        description: "Document, collection và cách nghĩ khác với bảng SQL.",
        topicKey: "model",
        lessons: [
          {
            title: "Document và collection",
            minutes: 7,
            preview: true,
            objectives: ["Hiểu cấu trúc document BSON", "Biết vai trò của _id"],
            content: `## Document

MongoDB lưu dữ liệu dạng **document** giống JSON (thực chất là BSON — có thêm kiểu Date, ObjectId...).

\`\`\`json
{
  "_id": { "$oid": "665f1c..." },
  "title": "Học MongoDB",
  "tags": ["database", "nosql"],
  "author": { "name": "An", "email": "an@example.com" },
  "createdAt": { "$date": "2026-11-23T08:00:00Z" }
}
\`\`\`

## Collection

Nhóm các document cùng loại, ví dụ \`users\`, \`posts\`. Không bắt buộc mọi document giống hệt nhau — nhưng ứng dụng nên **tự validate** để dữ liệu nhất quán.

## _id

Mỗi document có \`_id\` duy nhất; mặc định là \`ObjectId\` chứa cả thời điểm tạo.`,
          },
          {
            title: "Nhúng hay tham chiếu?",
            minutes: 9,
            objectives: ["Chọn nhúng hoặc tham chiếu theo cách đọc dữ liệu", "Tránh mảng tăng không giới hạn"],
            content: `## Nguyên tắc: thiết kế theo truy vấn

Hỏi: **dữ liệu nào luôn được đọc cùng nhau?**

| Nhúng (embed) | Tham chiếu (reference) |
|---|---|
| Quan hệ 1–ít, đọc cùng nhau | Quan hệ 1–nhiều không giới hạn |
| Địa chỉ trong hồ sơ người dùng | Bình luận của bài viết phổ biến |

## Cạm bẫy: mảng tăng mãi

Một document tối đa **16 MB**. Nếu nhúng mọi bình luận vào bài viết, document sẽ phình to và mỗi lần cập nhật phải ghi lại cả khối lớn.

\`\`\`js
// Tốt hơn: collection riêng
{ _id, postId, authorId, body, createdAt }
\`\`\`

Kèm index \`{ postId: 1, createdAt: -1 }\` để lấy bình luận mới nhất nhanh.`,
            quiz: {
              title: "Kiểm tra nhanh: mô hình document",
              questions: [
                { prompt: "Khi nào nên tách bình luận ra collection riêng?", options: ["Khi số bình luận có thể tăng không giới hạn", "Luôn luôn nhúng", "Khi bài viết ngắn", "Khi dùng TypeScript"], correct: 0, explanation: "Mảng tăng không giới hạn làm document phình to (giới hạn 16 MB).", topicKey: "model" },
                { prompt: "Giới hạn kích thước một document BSON là bao nhiêu?", options: ["1 MB", "16 MB", "100 MB", "Không giới hạn"], correct: 1, explanation: "Mỗi document tối đa 16 MB.", topicKey: "model" },
                { prompt: "Nguyên tắc thiết kế schema MongoDB nên dựa trên?", options: ["Số bảng ít nhất", "Cách ứng dụng đọc dữ liệu", "Thứ tự bảng chữ cái", "Kích thước ổ cứng"], correct: 1, explanation: "Thiết kế theo truy vấn thực tế.", topicKey: "model" },
              ],
            },
          },
        ],
      },
      {
        title: "Truy vấn và index",
        description: "CRUD với driver Node.js và index theo truy vấn.",
        topicKey: "query",
        lessons: [
          {
            title: "CRUD với driver Node.js",
            minutes: 10,
            objectives: ["Viết insert/find/update/delete", "Dùng cập nhật nguyên tử"],
            content: `## Kết nối một lần, dùng lại

\`\`\`ts
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI!, { maxPoolSize: 5 });
const db = client.db("blog");
\`\`\`

Tạo client **một lần** cho cả ứng dụng — không mở kết nối mới mỗi request.

## CRUD

\`\`\`ts
await db.collection("posts").insertOne({ title: "Xin chào", views: 0 });
const post = await db.collection("posts").findOne({ title: "Xin chào" });
await db.collection("posts").updateOne({ _id: post!._id }, { $inc: { views: 1 } });
await db.collection("posts").deleteOne({ _id: post!._id });
\`\`\`

## Cập nhật nguyên tử

\`$inc\`, \`$set\`, \`$addToSet\` thực hiện **trong một thao tác**, tránh lỗi "đọc rồi ghi" khi hai request chạy cùng lúc.`,
          },
          {
            title: "Index theo truy vấn thực tế",
            minutes: 9,
            objectives: ["Tạo compound index đúng thứ tự", "Dùng unique index cho bất biến"],
            content: `## Không có index = quét toàn bộ

\`\`\`js
db.posts.find({ authorId: id }).sort({ createdAt: -1 })
\`\`\`

Index phù hợp: \`{ authorId: 1, createdAt: -1 }\` — trường lọc bằng trước, trường sắp xếp sau.

## Unique index cho bất biến

\`\`\`js
db.users.createIndex({ emailNormalized: 1 }, { unique: true })
\`\`\`

Hai request đăng ký cùng email chạy song song: chỉ **một** thành công — database đảm bảo, không phụ thuộc code kiểm tra trước.

## Đừng index mọi trường

Index tốn dung lượng và làm chậm thao tác ghi. Với gói miễn phí giới hạn dung lượng, **index cũng tính vào hạn mức**.`,
            optional: false,
          },
        ],
      },
      {
        title: "Bảo mật & vận hành",
        description: "Chống NoSQL injection, quyền tối thiểu và sao lưu.",
        topicKey: "security",
        lessons: [
          {
            title: "Chống NoSQL injection",
            minutes: 8,
            objectives: ["Nhận diện input nguy hiểm", "Validate kiểu dữ liệu trước khi truy vấn"],
            content: `## Lỗ hổng

\`\`\`ts
// NGUY HIỂM: body = { "email": { "$ne": null } }
const user = await users.findOne({ email: req.body.email });
\`\`\`

Kẻ tấn công gửi **object chứa toán tử** thay vì chuỗi.

## Cách phòng

1. Validate kiểu: email phải là **string** (ví dụ dùng Zod).
2. Không spread object từ client vào filter/update.
3. Sort/filter chỉ nhận giá trị trong **danh sách cho phép**.

\`\`\`ts
const email = z.string().email().parse(req.body.email);
const user = await users.findOne({ emailNormalized: email.toLowerCase() });
\`\`\``,
          },
          {
            title: "Quyền tối thiểu và sao lưu",
            minutes: 7,
            optional: true,
            objectives: ["Tạo user database quyền tối thiểu", "Lên kế hoạch sao lưu thủ công"],
            content: `## Quyền tối thiểu

User mà ứng dụng dùng chỉ cần \`readWrite\` trên database của ứng dụng — **không** dùng tài khoản quản trị cluster.

## Không commit chuỗi kết nối

Đặt \`MONGODB_URI\` trong biến môi trường; nếu lỡ lộ, **đổi mật khẩu user ngay**.

## Sao lưu

Gói miễn phí có thể không có sao lưu tự động. Hãy export định kỳ bằng \`mongodump\` và **thử khôi phục** vào database riêng để chắc bản sao dùng được.`,
            quiz: {
              title: "Kiểm tra nhanh: bảo mật",
              questions: [
                { prompt: "Input `{ \"$ne\": null }` ở trường email gây ra điều gì nếu không validate?", options: ["Không gì cả", "Có thể khớp với user bất kỳ", "Làm sập database", "Tự động mã hóa"], correct: 1, explanation: "Toán tử `$ne` khớp mọi giá trị khác null.", topicKey: "security" },
                { prompt: "User database của ứng dụng nên có quyền gì?", options: ["Quản trị cluster", "readWrite trên database của ứng dụng", "Toàn quyền mọi database", "Chỉ đọc"], correct: 1, explanation: "Nguyên tắc quyền tối thiểu.", topicKey: "security" },
              ],
            },
          },
        ],
      },
    ],
  },
];

export const PATH = {
  slug: "full-stack-javascript-can-ban",
  title: "Full-stack JavaScript căn bản",
  goal: "Tự làm được một ứng dụng web có giao diện, form và database, triển khai được bản demo.",
  audience: "Người đã biết HTML/CSS/JavaScript cơ bản, muốn làm ứng dụng web hoàn chỉnh.",
  prerequisites: "JavaScript ES2015+, dùng terminal cơ bản.",
};

/* ---------- Taxonomy công nghệ (T01) ----------
 * active: đang được khóa demo dùng; planned: chỉ hiện trong roadmap /technologies, KHÔNG có trang riêng.
 * Mô tả do dự án tự viết; officialUrl là trang tài liệu chính thức (chỉ để dẫn nguồn, không ngụ ý tài trợ/chứng nhận).
 */
type SeedTech = { slug: string; name: string; type: string; domain: string; aliases: string[]; description: string; officialUrl: string | null; status: "active" | "planned"; order: number };
const T = (slug: string, name: string, type: string, domain: string, aliases: string[], description: string, officialUrl: string | null, status: "active" | "planned" = "planned", order = 100): SeedTech => ({ slug, name, type, domain, aliases, description, officialUrl, status, order });

export const TECHNOLOGIES: SeedTech[] = [
  T("html", "HTML", "language", "web", ["html5"], "Ngôn ngữ đánh dấu mô tả cấu trúc trang web: tiêu đề, đoạn văn, form, liên kết.", "https://developer.mozilla.org/docs/Web/HTML", "active", 10),
  T("css", "CSS", "language", "web", ["css3"], "Ngôn ngữ mô tả cách trình bày: bố cục, màu sắc, responsive.", "https://developer.mozilla.org/docs/Web/CSS", "active", 11),
  T("javascript", "JavaScript", "language", "web", ["js", "ecmascript"], "Ngôn ngữ chạy trong trình duyệt và trên server (qua runtime như Node.js).", "https://developer.mozilla.org/docs/Web/JavaScript", "active", 12),
  T("typescript", "TypeScript", "language", "web", ["ts"], "JavaScript có hệ kiểu tĩnh, kiểm tra lỗi khi biên dịch.", "https://www.typescriptlang.org/docs/", "active", 13),
  T("react", "React", "library", "frontend", ["reactjs"], "Thư viện xây giao diện từ component; là nền của Next.js.", "https://react.dev/", "active", 20),
  T("nextjs", "Next.js", "framework", "frontend", ["next", "next.js"], "Framework React có routing theo thư mục, Server Components, Server Actions và render phía server.", "https://nextjs.org/docs", "active", 21),
  T("nodejs", "Node.js", "runtime", "backend", ["node", "node.js"], "Runtime chạy JavaScript ngoài trình duyệt, dùng cho server, công cụ build và script.", "https://nodejs.org/docs/latest/api/", "active", 30),
  T("mongodb", "MongoDB", "database", "database", ["mongo"], "Cơ sở dữ liệu dạng document (BSON), truy vấn bằng driver chính thức hoặc mongosh.", "https://www.mongodb.com/docs/", "active", 40),
  T("git", "Git", "tool", "foundations", [], "Hệ quản lý phiên bản phân tán: commit, branch, merge.", "https://git-scm.com/doc"),
  T("vue", "Vue", "framework", "frontend", ["vuejs"], "", "https://vuejs.org/guide/"),
  T("angular", "Angular", "framework", "frontend", [], "", "https://angular.dev/"),
  T("svelte", "Svelte", "framework", "frontend", ["sveltekit"], "", "https://svelte.dev/docs"),
  T("python", "Python", "language", "backend", ["py"], "", "https://docs.python.org/3/"),
  T("django", "Django", "framework", "backend", [], "", "https://docs.djangoproject.com/"),
  T("fastapi", "FastAPI", "framework", "backend", [], "", "https://fastapi.tiangolo.com/"),
  T("java", "Java", "language", "backend", [], "", "https://dev.java/learn/"),
  T("spring-boot", "Spring Boot", "framework", "backend", ["spring"], "", "https://docs.spring.io/spring-boot/"),
  T("csharp", "C#", "language", "backend", ["c#"], "", "https://learn.microsoft.com/dotnet/csharp/"),
  T("dotnet", ".NET / ASP.NET Core", "platform", "backend", ["aspnet", "asp.net"], "", "https://learn.microsoft.com/aspnet/core/"),
  T("php", "PHP", "language", "backend", [], "", "https://www.php.net/docs.php"),
  T("laravel", "Laravel", "framework", "backend", [], "", "https://laravel.com/docs"),
  T("go", "Go", "language", "backend", ["golang"], "", "https://go.dev/doc/"),
  T("rust", "Rust", "language", "systems", [], "", "https://doc.rust-lang.org/book/"),
  T("cpp", "C/C++", "language", "systems", ["c++", "c"], "", "https://en.cppreference.com/"),
  T("sql", "SQL", "language", "database", [], "", null),
  T("postgresql", "PostgreSQL", "database", "database", ["postgres", "pg"], "", "https://www.postgresql.org/docs/"),
  T("mysql", "MySQL", "database", "database", ["mariadb"], "", "https://dev.mysql.com/doc/"),
  T("redis", "Redis", "database", "database", [], "", "https://redis.io/docs/"),
  T("kotlin", "Kotlin", "language", "mobile", [], "", "https://kotlinlang.org/docs/"),
  T("swift", "Swift", "language", "mobile", [], "", "https://www.swift.org/documentation/"),
  T("flutter", "Flutter", "framework", "mobile", [], "", "https://docs.flutter.dev/"),
  T("linux", "Linux", "platform", "devops", [], "", null),
  T("docker", "Docker", "tool", "devops", [], "", "https://docs.docker.com/"),
  T("kubernetes", "Kubernetes", "platform", "devops", ["k8s"], "", "https://kubernetes.io/docs/"),
  T("playwright", "Playwright", "tool", "qa", [], "", "https://playwright.dev/docs/intro"),
];

/**
 * Công nghệ của từng khóa seed. testedVersion để TRỐNG: ví dụ trong nội dung demo chưa được chạy thử
 * ở một phiên bản cụ thể — chỉ điền khi đã kiểm thử thật (V2 §33.3).
 */
export const COURSE_TECHNOLOGIES: Record<string, string[]> = {
  "nextjs-co-ban": ["nextjs", "react", "javascript", "nodejs"],
  "mongodb-cho-web-developer": ["mongodb", "nodejs", "javascript"],
};

/**
 * Bài công khai (T04/T05). Nội dung ở scripts/content/articles/<slug>.md. testedOn CHỈ ghi môi trường
 * đã chạy thật các lệnh/code trong bài (2026-11-24, máy phát triển của dự án). Chưa có review chuyên môn.
 */
export type SeedArticle = { slug: string; kind: "tutorial" | "reference" | "cheatsheet" | "troubleshooting" | "recipe"; title: string; summary: string; level: "beginner" | "intermediate" | "advanced"; tech: string[]; testedOn: { os: string; tools: string; testedAt: string }[] };
export const ARTICLES: SeedArticle[] = [
  {
    slug: "cai-nodejs-va-tao-du-an-nextjs-tren-windows",
    kind: "recipe",
    title: "Cài Node.js và tạo dự án Next.js đầu tiên trên Windows",
    summary: "Từ máy Windows trắng tới trang Next.js chạy ở localhost:3000: cài Node.js LTS, kiểm tra phiên bản, tạo dự án bằng create-next-app, chạy dev và build — có kết quả mong đợi cho từng bước.",
    level: "beginner",
    tech: ["nodejs", "nextjs", "typescript"],
    testedOn: [{ os: "Windows 11 Home (PowerShell 5.1)", tools: "Node 22.13.0, npm 10.9.2, Git 2.51.0; create-next-app → Next.js 16.4.6, React 19.3.0", testedAt: "2026-11-24" }],
  },
  {
    slug: "loi-ket-noi-mongodb-tu-nodejs",
    kind: "troubleshooting",
    title: "Lỗi kết nối MongoDB từ Node.js: đọc thông báo và sửa",
    summary: "ECONNREFUSED, Invalid connection string, Invalid scheme, querySrv ENOTFOUND và các lỗi Atlas (IP, xác thực): nguyên nhân, cách sửa và đoạn code kiểm tra kết nối tối thiểu.",
    level: "beginner",
    tech: ["mongodb", "nodejs"],
    testedOn: [{ os: "Windows 11 Home", tools: "Node 22.13.0, driver mongodb 7.9.1 (tái hiện lỗi 1–4)", testedAt: "2026-11-24" }],
  },
  {
    slug: "nextjs-app-router-cac-file-dac-biet",
    kind: "reference",
    title: "Next.js App Router: các file đặc biệt và lưu ý thực tế",
    summary: "Tra nhanh page, layout, loading, error, not-found, route và các thư mục đặc biệt; params là Promise; vì sao loading.tsx có thể làm trang 404 trả status 200.",
    level: "intermediate",
    tech: ["nextjs", "react"],
    testedOn: [{ os: "Windows 11 Home", tools: "Next.js 16.4.6 (build production của nền tảng này, kiểm tra status bằng curl)", testedAt: "2026-11-24" }],
  },
];

/** Bài tập đọc code (P04) gắn theo tiêu đề bài học của khóa seed. Đáp án kiểm tra theo hành vi thật của JS/driver. */
export type SeedExercise = { course: string; lesson: string; kind: "predict_output" | "find_bug"; language: string; prompt: string; code: string; options?: string[]; correct?: number; bugLines?: number[]; hints: string[]; explanation: string; fixedCode?: string };
export const EXERCISES: SeedExercise[] = [
  {
    course: "nextjs-co-ban",
    lesson: "App Router: thư mục là route",
    kind: "predict_output",
    language: "text",
    prompt: "Trong App Router, file `app/(marketing)/gioi-thieu/page.tsx` hiển thị ở URL nào?",
    code: "app/\n  (marketing)/\n    gioi-thieu/\n      page.tsx",
    options: ["/gioi-thieu", "/(marketing)/gioi-thieu", "/marketing/gioi-thieu"],
    correct: 0,
    hints: ["Thư mục đặt trong ngoặc tròn có vai trò đặc biệt.", "Route group chỉ để tổ chức code, không thành một đoạn của URL."],
    explanation: "Thư mục trong ngoặc tròn là route group: dùng để nhóm route (ví dụ dùng chung layout) và KHÔNG xuất hiện trong URL, nên trang ở /gioi-thieu.",
  },
  {
    course: "nextjs-co-ban",
    lesson: "Lấy dữ liệu trên server",
    kind: "find_bug",
    language: "tsx",
    prompt: "Trang dưới đây báo lỗi `res.json is not a function`. Dòng nào gây lỗi?",
    code: "export default async function Page() {\n  const res = fetch(\"https://api.example.com/posts\");\n  const posts = await res.json();\n  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;\n}",
    bugLines: [2],
    hints: ["fetch trả về gì khi chưa await?", "Một Promise không có phương thức json()."],
    explanation: "fetch() trả về Promise<Response>. Thiếu await ở dòng 2 nên `res` là Promise, gọi res.json() ở dòng 3 báo lỗi. Sửa: `const res = await fetch(...)`.",
    fixedCode: "const res = await fetch(\"https://api.example.com/posts\");\nconst posts = await res.json();",
  },
  {
    course: "mongodb-cho-web-developer",
    lesson: "CRUD với driver Node.js",
    kind: "predict_output",
    language: "js",
    prompt: "Collection `posts` KHÔNG có document nào có title \"Không có\". Đoạn code in ra gì?",
    code: "const r = await db.collection(\"posts\").updateOne(\n  { title: \"Không có\" },\n  { $set: { views: 1 } }\n);\nconsole.log(r.matchedCount, r.modifiedCount);",
    options: ["0 0", "1 1", "1 0", "Ném lỗi vì không tìm thấy document"],
    correct: 0,
    hints: ["updateOne không ném lỗi khi không khớp document nào.", "Không có upsert: true thì cũng không tạo document mới."],
    explanation: "Không document nào khớp bộ lọc nên matchedCount = 0 và modifiedCount = 0. updateOne không báo lỗi trong trường hợp này; muốn tạo mới khi chưa có thì thêm { upsert: true }.",
  },
  {
    course: "mongodb-cho-web-developer",
    lesson: "Chống NoSQL injection",
    kind: "find_bug",
    language: "js",
    prompt: "API đăng nhập dưới đây có lỗ hổng NoSQL injection. Dòng nào là nguyên nhân?",
    code: "app.post(\"/login\", async (req, res) => {\n  const { email, password } = req.body;\n  const user = await users.findOne({ email: email, password: password });\n  if (!user) return res.status(401).end();\n  res.json({ ok: true });\n});",
    bugLines: [3],
    hints: ["req.body có thể chứa object, không chỉ chuỗi.", "Thử gửi password là { \"$ne\": null }."],
    explanation: "Dòng 3 đưa thẳng giá trị từ req.body vào bộ lọc. Kẻ tấn công gửi password = {\"$ne\": null} sẽ khớp mọi user. Cần validate kiểu (chỉ nhận chuỗi), tìm theo email rồi so mật khẩu bằng hàm băm (Argon2/bcrypt) — không lưu và không so mật khẩu dạng thô.",
    fixedCode: "if (typeof email !== \"string\" || typeof password !== \"string\") return res.status(400).end();\nconst user = await users.findOne({ email });\nif (!user || !(await verifyPassword(user.passwordHash, password))) return res.status(401).end();",
  },
];
