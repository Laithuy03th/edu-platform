# PROMPT TRIỂN KHAI NỀN TẢNG HỌC TRỰC TUYẾN VỚI CLAUDE CODE

Toàn bộ phần bên dưới là yêu cầu dự án dành cho Claude Code. Hãy đọc hết trước khi lập kế hoạch hoặc thay đổi mã nguồn.

## 1. Vai trò, mục tiêu và cách cộng tác

Bạn là senior full-stack engineer, kiến trúc sư phần mềm và người hướng dẫn kỹ thuật của tôi. Hãy giúp tôi xây dựng một nền tảng học trực tuyến có thể chạy thật, đồng thời giúp tôi rèn kỹ năng ở cấp middle software engineer.

Mục tiêu sản phẩm:

- Học theo khóa học và lộ trình; kết hợp bài đọc, video ngắn, quiz và bài tập dự án.
- Có trải nghiệm đầy đủ cho khách, học viên, giảng viên và admin.
- Có đăng nhập email/mật khẩu, Google và quản lý phiên bằng JWT.
- Có các điểm khác biệt: ghi chú theo timestamp, đánh giá đầu vào, ôn tập câu sai, lộ trình theo mục tiêu, bài tập dự án có rubric, chế độ tiết kiệm dữ liệu, tự đánh giá mức độ hiểu và hồ sơ thành quả.
- Chạy với phạm vi demo có kiểm soát trên gói miễn phí; đo lường mức sử dụng thực tế thay vì hứa miễn phí cho lượng truy cập không giới hạn.

Cách cộng tác:

1. Trao đổi và viết tài liệu bằng tiếng Việt. Tên biến, hàm, type, collection và identifier dùng tiếng Anh rõ nghĩa.
2. Đọc repo hiện có và các hướng dẫn áp dụng trước. Không khởi tạo lại hoặc ghi đè công việc đang có.
3. Giải thích quyết định quan trọng: vấn đề, phương án chọn, phương án thay thế và lý do.
4. Tránh tạo quá nhiều abstraction, service hoặc dependency chỉ để thể hiện kiến trúc.
5. Làm từng lát cắt chức năng từ giao diện đến database, có kiểm chứng. Không tạo hàng chục trang giả rồi gọi là hoàn thành.
6. Không tự nhận test/build đã chạy nếu chưa chạy; không bịa kết quả hay benchmark.
7. Nếu thiếu credentials, hoàn thành phần làm được, tạo cấu hình mẫu và hướng dẫn thiết lập. Ghi rõ integration chưa được xác minh; không biến mock thành kết quả production.
8. Chỉ hỏi tôi khi thiếu quyết định sản phẩm quan trọng hoặc có hành động phát sinh chi phí, công khai dịch vụ hay thay đổi tài khoản bên ngoài. Với lựa chọn kỹ thuật thông thường, chọn mặc định hợp lý và ghi vào ADR.
9. Trước khi code một giai đoạn, nêu phạm vi và tiêu chí nghiệm thu. Sau khi xong, báo kết quả, kiểm thử, giới hạn và cách tự kiểm tra.
10. Tôn trọng giới hạn lượt sử dụng/context: lưu tiến độ trong repo, không đọc lại toàn bộ repo mỗi lượt và không chạy tác vụ lặp vô ích.

## 2. Stack bắt buộc và ranh giới hệ thống

### 2.1. Stack bắt buộc

- Next.js App Router cho cả frontend và backend.
- TypeScript với strict mode.
- MongoDB Atlas cho dữ liệu có cấu trúc: tài khoản, nội dung text, quiz, tiến độ, ghi chú và metadata ảnh/video.
- Cloudinary cho ảnh và video.
- JWT cho phiên đăng nhập ứng dụng; hỗ trợ đăng nhập Google.
- Một repository, một ứng dụng Next.js theo kiến trúc modular monolith.

Không thay MongoDB bằng SQL, không thay Cloudinary bằng dịch vụ lưu trữ khác, không thêm backend NestJS/Express riêng nếu chưa có yêu cầu mới.

### 2.2. Mặc định kỹ thuật đề xuất

- React Server Components cho nội dung render từ server; Client Components khi cần tương tác.
- Server Actions cho form/mutation nội bộ khi phù hợp; Route Handlers cho callback, tích hợp, upload authorization và endpoint cần hợp đồng API.
- MongoDB official Node.js driver, kết hợp Zod cho validation. Không đồng thời thêm Mongoose nếu không có lý do rõ ràng.
- Tailwind CSS và shadcn/ui cho giao diện.
- React Hook Form cho form phức tạp; không bắt buộc cho form đơn giản.
- Auth.js/NextAuth là ứng viên thư viện xác thực. Kiểm tra tài liệu và release hiện hành, chọn phiên bản phù hợp thực tế, hỗ trợ Credentials + Google + JWT session. Nếu ứng viên không còn phù hợp, trình bày bằng chứng và chọn thư viện tương đương vẫn đáp ứng JWT; không tự chuyển sang opaque database session.
- Argon2id để băm mật khẩu trên Node.js runtime. Kiểm chứng tương thích môi trường deploy.
- SMTP/email provider qua một adapter nhỏ để gửi xác minh và đặt lại mật khẩu.
- Vitest cho unit/integration phù hợp; Playwright cho các luồng end-to-end trọng yếu.
- pnpm, ESLint, formatter và CI qua GitHub Actions nếu repo chưa có công cụ tương đương.

Trước khi cài package, xác minh phiên bản, mức ổn định và tương thích từ tài liệu chính thức. Không giả định tên API, giá dịch vụ hoặc tính năng gói miễn phí. Ghi phiên bản chọn và link nguồn trong docs/TECH_DECISIONS.md, commit lockfile. Không nâng phiên bản lớn ngoài phạm vi.

### 2.3. Không đưa vào phạm vi hiện tại

- Thanh toán thật, subscription, coupon và hoàn tiền.
- Livestream, video call, chat realtime.
- AI tutor, AI sinh quiz, transcription trả phí hoặc vector database.
- Tự động chạy/chấm code của người dùng trên server.
- Microservices, Kafka, Kubernetes, Redis và backend worker riêng.
- DRM hoặc cam kết video không thể bị sao chép.
- Offline video download, PWA đồng bộ offline phức tạp.
- Chứng chỉ có giá trị kiểm định hay leaderboard cạnh tranh.

Không triển khai các mục này chỉ vì chúng thường xuất hiện trong LMS. Thiết kế chỉ cần tránh khóa đường mở rộng hợp lý.

## 3. Quy mô demo và nguyên tắc sản phẩm

- UI tiếng Việt, responsive trên mobile/tablet/desktop.
- Khóa học miễn phí trong phạm vi hiện tại.
- Demo ban đầu có 2 khóa học, khoảng 20 bài video tổng cộng, thêm bài đọc và quiz.
- Chỉ tài khoản được duyệt mới được tạo khóa học và upload media.
- Không mở đăng ký giảng viên tự do có quyền upload ngay.
- Mọi quota do ứng dụng đặt phải có cấu hình server và hiển thị phù hợp cho người có quyền.
- Đơn vị thời gian lưu UTC; hiển thị theo timezone người dùng, mặc định Asia/Ho_Chi_Minh.
- Lưu timestamp video bằng số giây, không dùng Date để biểu diễn vị trí phát.
- Dữ liệu demo phải do dự án tự tạo hoặc có quyền sử dụng; không tải lại khóa học có bản quyền từ internet.

## 4. Vai trò và ma trận quyền

| Chức năng | Khách | Học viên | Giảng viên | Admin |
|---|---|---|---|---|
| Xem catalog/chi tiết khóa học đã xuất bản | Có | Có | Có | Có |
| Xem bài được đánh dấu học thử | Có | Có | Có | Có |
| Đăng ký học khóa học miễn phí | Không | Có | Có | Có |
| Học nội dung đầy đủ | Không | Khi đã đăng ký | Khi đã đăng ký hoặc sở hữu khóa | Có |
| Tạo ghi chú, làm quiz, nộp bài | Không | Theo quyền truy cập | Theo quyền truy cập | Theo quyền truy cập |
| Tạo/sửa khóa học | Không | Không | Chỉ khóa học của mình | Có |
| Upload nội dung khóa học | Không | Không | Trong quota và khóa học của mình | Trong quota |
| Duyệt/từ chối xuất bản | Không | Không | Không | Có |
| Xem dữ liệu học tập của người khác | Không | Không | Giới hạn trong khóa học mình quản lý | Theo nhiệm vụ quản trị |
| Đọc ghi chú riêng của người khác | Không | Không | Không | Không có chức năng đọc thông thường |
| Cấp quyền giảng viên/quản trị quota | Không | Không | Không | Có |

Giảng viên vẫn có thể là học viên ở khóa học khác. Vai trò nên hỗ trợ tập quyền thay vì các điều kiện cứng khiến giảng viên mất chức năng học tập.

Yêu cầu bảo vệ quyền:

- Xác thực và authorization trong lớp xử lý server/data access, không chỉ ẩn nút hoặc chặn route ở UI.
- Kiểm tra ownership của course, lesson, note, submission; không tin userId/role/courseId gửi từ client.
- Kiểm tra khóa học đang được phép truy cập và enrollment còn hiệu lực trước khi trả nội dung đầy đủ.
- Giảng viên không được xem ghi chú riêng hoặc token/mật khẩu của học viên.
- Tài khoản bị khóa bị từ chối ở các request được bảo vệ tiếp theo.
- Không cho người dùng sửa roles, status, emailVerified hoặc authVersion bằng profile endpoint.
- Bootstrap admin qua script có kiểm soát; không có public endpoint tự nâng quyền.

## 5. Tài khoản và hồ sơ

### 5.1. Đăng ký email/mật khẩu

- Form tên hiển thị, email, mật khẩu, xác nhận mật khẩu.
- Validate ở server và client; server là nguồn quyết định.
- Chuẩn hóa email nhất quán, unique index và xử lý lỗi trùng do request đồng thời.
- Không tự loại dấu chấm hoặc phần +tag của Gmail.
- Không cắt khoảng trắng hoặc thay đổi âm thầm mật khẩu người dùng.
- Mật khẩu dài tối thiểu 12 ký tự; hỗ trợ passphrase, Unicode và khoảng trắng; tối đa 128 ký tự và giới hạn byte đầu vào phù hợp trước khi hash.
- Dùng Argon2id với salt do thư viện tạo; benchmark cấu hình phù hợp tài nguyên deploy và ghi lại quyết định.
- Không mã hóa mật khẩu để giải mã, không dùng SHA-256/MD5 đơn thuần để lưu mật khẩu.
- Tài khoản mới có trạng thái email chưa xác minh; cho xem catalog, nhưng cần xác minh trước khi enrollment, viết hỏi đáp hoặc nộp bài.
- Gửi email xác minh, có nút gửi lại với cooldown và rate limit.

### 5.2. Đăng nhập/đăng xuất

- Email/mật khẩu hoặc Google.
- Thông báo lỗi đăng nhập không phân biệt rõ email không tồn tại hay sai mật khẩu.
- Sau đăng nhập quay về trang nội bộ hợp lệ; chặn open redirect tới domain bên ngoài.
- Đăng xuất phiên hiện tại.
- Đăng xuất tất cả thiết bị bằng cơ chế thu hồi JWT được mô tả ở phần 6.
- Không có tài khoản production mặc định với mật khẩu công khai trong mã nguồn.

### 5.3. Google OAuth/OIDC

- Dùng thư viện xác thực, không tự viết giao thức OAuth từ đầu.
- Chỉ yêu cầu scope cần thiết: openid, email, profile.
- Dùng cơ chế state/nonce/PKCE theo provider và thư viện hỗ trợ; không vô hiệu hóa các kiểm tra này.
- Server phải xác minh kết quả provider; chỉ đánh dấu email verified khi có bằng chứng đáng tin từ Google.
- Lưu provider và providerAccountId với unique index; không dùng email làm định danh duy nhất của tài khoản Google.
- Nếu email Google trùng tài khoản email/mật khẩu, không tự gộp tài khoản một cách thiếu kiểm chứng.
- Luồng liên kết: yêu cầu đăng nhập tài khoản hiện có và xác thực gần đây, rồi mới liên kết Google.
- Không bật tùy chọn liên kết nguy hiểm chỉ để bỏ qua lỗi account linking.
- Không lưu access/refresh token Google nếu chỉ cần đăng nhập và thư viện không cần giữ chúng. Không yêu cầu offline access vô ích.
- Nếu cho hủy liên kết Google, phải còn ít nhất một phương thức đăng nhập đã xác minh.
- Với tài khoản chỉ có Google, mục đổi mật khẩu phải giải thích đúng; đặt mật khẩu mới cần luồng xác thực riêng, không giả định có mật khẩu cũ.

### 5.4. Quên/đổi mật khẩu

- Quên mật khẩu trả thông báo chung, tránh lộ trạng thái email.
- Token ngẫu nhiên đủ mạnh, DB chỉ lưu hash; hết hạn mặc định 30 phút, một lần sử dụng.
- Kiểm tra expiresAt trong truy vấn nghiệp vụ; không dựa vào việc TTL index đã xóa bản ghi hay chưa.
- Consume token nguyên tử để hai request không cùng thành công.
- Đặt lại mật khẩu thành công làm mất hiệu lực các phiên cũ.
- Đổi mật khẩu khi đang đăng nhập cần mật khẩu hiện tại và cũng thu hồi phiên cũ; quy định rõ người dùng cần đăng nhập lại.
- Không ghi token reset, password hoặc liên kết nhạy cảm vào log production.

### 5.5. Hồ sơ

- Tên hiển thị, giới thiệu ngắn, avatar, timezone, mục tiêu học tập.
- Bản đầu dùng avatar chữ cái hoặc ảnh Google đã được xử lý theo chính sách ảnh; chưa mở upload avatar tùy ý cho mọi học viên.
- Email hiển thị chỉ đọc trong bản đầu; đổi email là phạm vi riêng nếu cần sau này.
- Hiển thị phương thức đăng nhập đã liên kết.
- Cấu hình hồ sơ công khai/tư nhân cho phần thành quả; mặc định riêng tư.

## 6. JWT, cookie và bảo mật phiên

Phân biệt rõ ba việc:

1. Password hashing bảo vệ mật khẩu trong database.
2. JWT signing bảo vệ tính toàn vẹn, không tự động che nội dung payload.
3. JWT encryption/JWE bảo vệ nội dung token khi thư viện được cấu hình tương ứng.

Yêu cầu:

- Ưu tiên JWT session do thư viện đã chọn quản lý; nếu dùng Auth.js với JWT session thì kiểm chứng cơ chế JWE/cookie ở phiên bản cài đặt.
- Không tự tạo thêm hệ accessToken/refreshToken song song nếu thư viện đã đáp ứng nhu cầu web cùng origin.
- Cookie HttpOnly, Secure trên HTTPS production, SameSite phù hợp; local HTTP có cấu hình riêng để phát triển.
- Không lưu token đăng nhập trong localStorage/sessionStorage hoặc URL.
- JWT chỉ chứa claim tối thiểu: định danh, phiên bản xác thực, thời điểm phát hành/hết hạn và các claim thư viện cần. Không nhét mật khẩu/hash, token Google hoặc hồ sơ đầy đủ vào JWT.
- Đề xuất phiên mặc định 8 giờ và cơ chế gia hạn theo thư viện; ghi rõ thời hạn tuyệt đối/rolling thực tế. Không để token sống vô hạn.
- Dùng authVersion/sessionVersion trên user: tăng khi đổi/reset mật khẩu, đăng xuất tất cả thiết bị hoặc sự kiện thu hồi tương ứng.
- Mỗi request được bảo vệ phải kiểm tra trạng thái user và authVersion hiện hành. Dùng memoization trong cùng request khi cần; không cache trạng thái thu hồi qua nhiều request mà không công bố độ trễ.
- Role trong JWT chỉ là dữ liệu hỗ trợ; mutation nhạy cảm phải dựa trên quyền hiện hành từ server.
- Mô tả rõ tradeoff: có kiểm tra DB nên phiên không hoàn toàn stateless; đổi lại có thu hồi phiên kịp thời.
- Dùng chống CSRF của thư viện cho auth và biện pháp phù hợp cho mutation dùng cookie; SameSite không phải lớp bảo vệ duy nhất.
- Kiểm tra origin/host theo môi trường, không tin mọi forwarded header.
- Server Action và Route Handler đều là bề mặt cần authorization.
- Secret phải đủ mạnh, ở biến môi trường server, không có tiền tố NEXT_PUBLIC_. Có hướng dẫn rotation và ảnh hưởng tới phiên.

## 7. Khám phá và đăng ký khóa học

### 7.1. Trang công khai

- Trang chủ giới thiệu sản phẩm, khóa học nổi bật, lộ trình nổi bật và CTA.
- Catalog chỉ hiển thị khóa học published được duyệt.
- Tìm theo tên/mô tả ngắn; lọc chủ đề, cấp độ và giảng viên; sắp xếp mới nhất hoặc đánh giá.
- Phân trang, giới hạn pageSize, validate sort/filter, debounce tìm kiếm.
- Tìm kiếm bản đầu dùng index phù hợp MongoDB; không bắt buộc Atlas Search hoặc regex scan toàn collection.
- Nếu hỗ trợ tìm không dấu tiếng Việt, có trường chuẩn hóa và test rõ hành vi; không hứa semantic search.
- Trang chi tiết có ảnh bìa, mô tả, mục tiêu, kiến thức đầu vào, giảng viên, tổng số bài, thời lượng ước tính, mục lục và đánh giá.
- Chỉ bài được đánh dấu preview mới có nội dung/media công khai.
- Metadata SEO cho trang công khai, URL ổn định; không index trang cá nhân/admin.

### 7.2. Enrollment

- Học viên đã xác minh email đăng ký khóa học miễn phí.
- Endpoint idempotent; unique(userId, courseId); double click không tạo trùng.
- Khóa draft/pending/rejected/archived không mở enrollment mới.
- Dashboard Khóa học của tôi có tiến độ, bài gần nhất và nút tiếp tục.
- Admin có thể thu hồi enrollment có lý do; học viên mất quyền ở request sau. Việc cho xem lại dữ liệu cá nhân cũ phải có chính sách nhất quán.
- Không dùng cùng khóa enrollment để giả lập đơn hàng/thanh toán trong bản miễn phí.

## 8. Soạn thảo, duyệt và xuất bản khóa học

### 8.1. Cấu trúc nội dung

- Course → Chapter → Lesson.
- Course có title, slug, shortDescription, description, learningObjectives, prerequisites, category, level, thumbnail, instructorId và trạng thái.
- Chapter có title, description, order và courseId.
- Lesson có title, type, content, order, duration, preview flag, required flag và mediaId nếu là video.
- Type cốt lõi: reading hoặc video; quiz và project có thể gắn riêng để tránh một document quá lớn.
- Nội dung text dùng Markdown/rich text có schema giới hạn; không cho thực thi HTML/JavaScript tùy ý.
- Có lưu nháp, xem trước theo quyền, chỉnh thứ tự chương/bài; cung cấp nút lên/xuống thay thế kéo thả cho accessibility.

### 8.2. Trạng thái và duyệt

- Draft → Pending review → Published; có Rejected, Archived/Suspended phù hợp.
- Giảng viên gửi duyệt; admin duyệt hoặc từ chối kèm lý do.
- Điều kiện xuất bản: metadata bắt buộc, tối thiểu một chương và bài hợp lệ, media đã xác minh nếu có, không tham chiếu media bị xóa.
- Giảng viên không tự chuyển thẳng published qua API.
- Course bị từ chối sửa rồi gửi lại được.
- Sửa nội dung published tạo bản nháp thay đổi hoặc chuyển lại quy trình duyệt; không âm thầm đưa nội dung chưa duyệt ra công khai.
- Đề xuất cơ chế revision gọn: public đọc bản đã duyệt, editor đọc draft. Tránh lưu vô hạn bản sao toàn khóa học.
- Giới hạn revision giữ lại và quyết định ảnh hưởng tới quiz/progress trong ADR.
- Archived: ẩn catalog, dừng enrollment mới; học viên cũ tiếp tục học bản đã duyệt nếu khóa không bị đình chỉ vì nội dung/quyền truy cập.
- Suspended: admin dừng cả truy cập nội dung; hiển thị thông báo phù hợp. Phân biệt archived và suspended trong code và UI.

### 8.3. Quyền tác giả

- Chỉ giảng viên sở hữu hoặc admin sửa khóa học.
- Mọi lesson/chapter mutation phải kiểm tra quan hệ lesson → chapter → course, không chỉ kiểm tra ID rời rạc.
- Reorder phải validate tập ID thuộc khóa, không trùng/thiếu và chống lost update bằng revision/version.
- Xóa nội dung đã có học viên phải có cảnh báo ảnh hưởng, ưu tiên archive/soft delete phù hợp.
- Dashboard giảng viên: khóa học, trạng thái duyệt, enrollment tổng hợp, tiến độ tổng hợp, câu hỏi và bài nộp cần phản hồi. Không hiển thị dữ liệu cá nhân không cần thiết.

## 9. Trải nghiệm học và tiến độ

### 9.1. Trang học

- Sidebar chương/bài, đánh dấu bài đã hoàn thành, bài hiện tại, nút trước/sau.
- Bài đọc có heading, code block, ảnh được tối ưu và mục tiêu bài.
- Video có play/pause, âm lượng, tốc độ, seek, full screen nếu browser hỗ trợ.
- Video không autoplay, không tự mở bài kế tiếp có video gây tải dữ liệu.
- Hiển thị trạng thái media đang xử lý, lỗi, đã bị gỡ hoặc chưa có quyền truy cập.
- Bài reading không phụ thuộc Cloudinary nếu không có hình; vẫn học được khi media service lỗi.
- Có phụ đề/transcript text do giảng viên nhập nếu có; không gọi dịch vụ transcription trả phí.

### 9.2. Resume và ghi tiến độ

- Lưu lastPositionSeconds, furthestPositionSeconds nếu cần và completedAt riêng biệt; không dùng một giá trị cho cả tiếp tục xem và hoàn thành.
- Autosave sau khoảng 30 giây khi có thay đổi đủ lớn; thêm khi pause, kết thúc bài và khi tab ẩn/thoát theo cơ chế browser phù hợp.
- Thao tác khi thoát trang là best effort, không hứa luôn lưu được request cuối.
- Debounce/throttle và chống ghi trùng; không ghi mỗi timeupdate hoặc mỗi giây.
- Validate vị trí hữu hạn, >= 0 và không vượt duration hợp lệ.
- Nhiều tab: dùng version/updatedAt hoặc cơ chế tương đương; giải thích cách giải quyết cập nhật đến muộn. Không làm mất trạng thái completed do sự kiện cũ.
- Không tin duration/score/identity do client tự khai.

### 9.3. Hoàn thành và tỷ lệ tiến độ

- Bài đọc có nút đánh dấu đã học, video có thể gợi ý hoàn thành khi xem đến ngưỡng 90%, quiz theo điều kiện đạt điểm nếu được cấu hình.
- Nếu cho hoàn thành thủ công, ghi rõ đây là theo dõi học tập, không phải bằng chứng chống gian lận.
- Client playback không chứng minh người học đã chú ý; không quảng cáo chống tua/chống gian lận tuyệt đối.
- Công thức tiến độ dựa trên bài required và đang có hiệu lực trong bản course được học; bài optional không làm sai mẫu số.
- Có chính sách khi giảng viên thêm/ẩn bài: snapshot curriculum version hoặc migration rõ ràng, test hành vi. Không âm thầm thu hồi thành quả cũ mà không giải thích.
- Dashboard: tiến độ theo khóa, bài gần nhất, bài nên học tiếp, quiz cần ôn và mục tiêu tuần.

## 10. Quiz, chấm điểm và kiểm tra đầu vào

### 10.1. Quiz cơ bản

- Câu hỏi single-choice cho bản đầu; schema có thể mở rộng nhưng không triển khai nhiều dạng nếu chưa cần.
- Mỗi câu có prompt, options có ID ổn định, đáp án và explanation ở phía server.
- Không gửi đáp án/explanation trong payload trước khi nộp hoặc qua source của Server Components.
- Chấm điểm trên server; không nhận score/pass do client gửi.
- Nộp cùng submissionId/requestId không tạo nhiều attempt.
- Trả điểm, kết quả từng câu và giải thích sau nộp theo cấu hình.
- Lưu bestScore và latestScore riêng; giới hạn số attempt lịch sử được giữ, ví dụ 10 bản gần nhất/quiz/user cộng aggregate.
- Khi quiz sửa, attempt cũ gắn quizVersion và questionVersion; không hiển thị đáp án cũ theo schema mới gây sai kết quả.
- Có trạng thái chưa làm, đang làm, đã nộp và thông báo lỗi mạng cho phép thử gửi lại an toàn.

### 10.2. Kiểm tra đầu vào

- Quiz đầu vào gắn các câu với skill/topic/chapter.
- Sau khi nộp, gợi ý chương cần học trước và chương có thể ôn nhanh, dựa trên rule rõ ràng.
- Không yêu cầu mô hình AI; kết quả giải thích được, ví dụ dưới 60% ở chủ đề HTTP thì đề xuất học chương HTTP.
- Gợi ý không tự động đánh dấu hoàn thành bài học hoặc khóa quyền học.
- Người dùng có thể bỏ qua bài đánh giá và học theo thứ tự thông thường.

## 11. Ghi chú theo bài và timestamp — điểm khác biệt số 1

- Ghi chú riêng của học viên theo course/lesson.
- Với video, nút ghi chú tại thời điểm hiện tại tự điền timestamp; người dùng có thể chỉnh timestamp hợp lệ.
- Click timestamp để seek video; không tự tải video khi chỉ đang duyệt danh sách ghi chú trong chế độ tiết kiệm dữ liệu.
- Tạo, sửa, xóa, tìm theo nội dung, lọc theo khóa/bài và phân trang.
- Giới hạn độ dài mỗi ghi chú, ví dụ 5.000 ký tự; giới hạn số lượng qua cấu hình để tránh abuse.
- UI ghi rõ lưu thành công/đang lưu/lỗi; không làm mất bản nháp khi request lỗi.
- Giảng viên không đọc ghi chú riêng của học viên.
- Tìm kiếm ghi chú luôn scope user hiện tại trước khi thực thi.
- Nếu bài bị archive, vẫn có cách xem nội dung ghi chú cá nhân với trạng thái tham chiếu không còn học được, theo chính sách quyền truy cập.
- Có thể xuất ghi chú cá nhân ra Markdown ở giai đoạn mở rộng; không dùng Cloudinary cho việc xuất text.

## 12. Ôn tập câu sai và tự đánh giá — điểm khác biệt số 2

### 12.1. Danh sách ôn tập

- Câu trả lời sai tạo/cập nhật review item theo user + question + version, tránh bản ghi trùng.
- Có màn hình Hôm nay cần ôn, tổng số câu đến hạn và lọc theo khóa/chủ đề.
- Lịch ôn deterministic đơn giản, ví dụ sau 1, 3, 7, 14 ngày khi trả lời đúng liên tiếp; sai thì quay lại mốc ngắn.
- Lưu nextReviewAt, intervalStep, correctStreak và lastReviewedAt; không lưu vô hạn mọi event click.
- Nội dung câu hỏi đã thay đổi hoặc bị gỡ phải được phát hiện, không tiếp tục chấm bằng đáp án không còn tương ứng.
- Server kiểm soát lịch, chấm đáp án và chống double submit.
- Giải thích đây là lịch ôn gợi ý theo quy tắc, không tuyên bố có thuật toán AI cá nhân hóa.

### 12.2. Tự đánh giá mức độ hiểu

- Sau bài học, chọn Đã hiểu / Cần ôn / Chưa hiểu.
- Trạng thái này tách khỏi completed: học xong vẫn có thể chưa hiểu.
- Dashboard tổng hợp bài cần ôn; có thể cập nhật lại sau khi học.
- Không gửi thông báo dồn dập hoặc bắt học viên phải đánh giá mới được học tiếp.

## 13. Lộ trình theo mục tiêu

- Admin/giảng viên có quyền tạo learning path gồm các course/chapter/lesson hoặc milestone phù hợp.
- Có mục tiêu, đối tượng, kiến thức đầu vào, thời gian ước tính và thứ tự đề xuất.
- Học viên chọn mục tiêu và tham gia lộ trình; có thể đổi hoặc dừng theo dõi.
- Trình bày rõ học phần bắt buộc/tùy chọn và tiến độ tổng hợp.
- Kiểm tra prerequisite bằng rule đơn giản, phát hiện vòng lặp nếu mô hình có đồ thị phụ thuộc.
- Tránh đếm trùng bài/khóa xuất hiện nhiều lần trong cùng lộ trình.
- Mục bị gỡ/khóa chưa xuất bản phải có trạng thái phù hợp; không làm hỏng toàn bộ trang lộ trình.
- Ước tính thời gian dựa trên dữ liệu course, không bịa số giờ hoặc hứa đạt việc làm sau khi học.

## 14. Bài tập dự án, rubric và thành quả — điểm khác biệt số 3

### 14.1. Project assignment

- Giảng viên tạo đề bài, mục tiêu, yêu cầu, checklist nghiệm thu, rubric và link tài liệu.
- Học viên nộp link GitHub, link demo và mô tả text; chưa hỗ trợ upload zip/source code để tiết kiệm dung lượng và giảm bề mặt xử lý file.
- Validate URL chỉ cho http/https; không tự fetch link người dùng ở server và không tự chạy code.
- Rubric có tiêu chí, trọng số hoặc điểm tối đa, mô tả đạt/chưa đạt.
- Học viên tự đánh giá; giảng viên phản hồi, chấm theo rubric và yêu cầu sửa nếu cần.
- Trạng thái draft → submitted → needs_changes → resubmitted → reviewed.
- Giới hạn số lần nộp/lịch sử giữ lại; lưu mốc quan trọng, không giữ vô hạn bản sao lớn.
- Chỉ chủ bài nộp, giảng viên sở hữu khóa học và admin theo nhiệm vụ được truy cập.
- Không tự công khai link repo/bài nộp khi học viên chưa chọn.

### 14.2. Hồ sơ thành quả

- Tổng hợp khóa đã hoàn thành, dự án được đánh giá và kỹ năng gắn với rubric/course.
- Có trang riêng tư trong tài khoản và tùy chọn public profile.
- Mặc định không công khai; học viên chọn từng dự án/thành quả muốn hiển thị.
- Public profile không lộ email, điểm chi tiết, ghi chú, enrollment riêng hoặc dữ liệu bài nộp chưa chọn công khai.
- Không hiển thị kỹ năng như chứng nhận kiểm định; diễn đạt là kỹ năng đã thực hành.
- Không cần tạo ảnh/chứng chỉ PDF bằng Cloudinary để tránh thêm chi phí xử lý.

## 15. Hỏi đáp, đánh giá và phản hồi

### 15.1. Hỏi đáp theo bài

- Học viên có quyền học được đặt câu hỏi, trả lời; giảng viên khóa học có thể trả lời và đánh dấu phản hồi hữu ích.
- Tác giả câu hỏi có thể chấp nhận câu trả lời; quy định rõ ai được đánh dấu và có thể bỏ đánh dấu.
- Chủ đề/câu trả lời có sửa/xóa trong giới hạn quyền; admin có thể ẩn nội dung vi phạm.
- Không xây chat realtime; tải theo trang, refresh khi người dùng cần.
- Hỗ trợ Markdown an toàn, không upload ảnh trong comment ở bản đầu.
- Rate limit, giới hạn độ dài, chống spam và báo cáo nội dung.
- Không cho người không có quyền học lấy nội dung bài riêng thông qua câu hỏi/API.

### 15.2. Đánh giá khóa học

- Chỉ học viên đã đăng ký và có hoạt động học hợp lệ mới được đánh giá; mặc định cần hoàn thành ít nhất một bài.
- Mỗi user một review/course, có thể cập nhật; giảng viên không tự đánh giá khóa của mình.
- Điểm 1–5 và nhận xét text; giới hạn chiều dài, phân trang.
- Khi sửa/ẩn/xóa review, tổng hợp averageRating/ratingCount phải được cập nhật đúng hoặc có tác vụ reconcile.
- Giảng viên không được tùy ý xóa đánh giá bất lợi; admin moderation có lý do/audit.

## 16. Media và chế độ tiết kiệm dữ liệu

### 16.1. Dữ liệu media

- Cloudinary lưu binary ảnh/video; MongoDB chỉ giữ assetId/publicId, resourceType, deliveryType, bytes, duration, dimensions, format, owner, trạng thái và liên kết sử dụng.
- URL là dữ liệu suy ra hoặc được lưu có version rõ ràng; không dùng URL bất kỳ do client cung cấp như bằng chứng ownership.
- Không lưu base64, binary video, ảnh hoặc file lớn vào MongoDB.
- Chỉ ảnh raster hợp lệ như JPEG/PNG/WebP ở bản đầu; không nhận SVG/HTML hoặc file thực thi.

### 16.2. Luồng upload

1. Giảng viên/admin yêu cầu upload vào khóa học mình có quyền sửa.
2. Server xác thực, kiểm tra quyền, quota và cấp reservation nguyên tử với thời hạn.
3. Server tạo authorization/chữ ký upload theo tham số allowlist; không đưa API secret ra client và không ký tùy ý toàn bộ params client gửi.
4. Client upload trực tiếp Cloudinary, không đưa binary đi xuyên qua Next.js backend.
5. Server xác minh kết quả qua response có chữ ký/API/webhook chính thức phù hợp; đối chiếu assetId, publicId, resource type, owner reservation, bytes và duration thật.
6. Nếu hợp lệ, ghi media ready và commit quota; nếu sai, đưa vào xử lý xóa/quarantine và ghi lý do.
7. Bài học chỉ được gắn asset đã xác minh, cùng phạm vi quyền và chưa bị xóa.

Yêu cầu bổ sung:

- Upload thành công ở Cloudinary không đồng nghĩa được chấp nhận trong ứng dụng.
- Unique/idempotency cho reservation và finalize; callback/webhook lặp không nhân đôi media/quota.
- Xử lý upload xong nhưng finalize thất bại, reservation hết hạn, callback đến muộn và người dùng đóng tab.
- Validate kích thước trước upload để có UX tốt; vẫn kiểm chứng metadata phía server sau upload.
- Giới hạn phía browser không phải kiểm soát bảo mật. Nghiên cứu preset/signature và khả năng ràng buộc thực tế của provider; không tuyên bố chặn được mọi upload vượt size trước khi provider nhận dữ liệu nếu API không hỗ trợ.
- Không dùng unsigned preset mở công khai không kiểm soát.
- Folder/publicId do server sinh, không để client ghi đè/xóa asset tùy ý.
- Không chạy FFmpeg dài hoặc transcode nặng trong Route Handler/serverless request.
- Hướng dẫn giảng viên nén video trước khi tải lên; nếu cần Cloudinary transformation thì dùng profile cố định, đo credit trước, không giả định miễn phí.

### 16.3. Chính sách mặc định của ứng dụng

- Video tối đa 20 MiB/file, tối đa 5 phút/file; mục tiêu 480p hoặc 720p tùy loại nội dung, không làm code trên màn hình không đọc được.
- Ảnh tối đa 1 MiB/file; kích thước được chuẩn hóa, giới hạn chiều rộng/chiều cao hợp lý.
- Tối đa 10 video/course, 2 course có video cho bộ demo ban đầu; quota có cấu hình để điều chỉnh có chủ đích.
- Không tự sinh 360p/480p/720p/1080p/HLS cho mỗi video. Bản đầu ưu tiên một rendition hợp lý và poster tái sử dụng.
- Ảnh có vài kích thước cố định, không tạo transformation URL vô hạn theo input người dùng.
- Chọn một chiến lược tối ưu ảnh rõ ràng giữa Cloudinary và Next.js Image để tránh biến đổi trùng lặp không cần thiết.
- Khi thay/xóa media, xử lý reference đang dùng; không xóa file còn được course revision hoặc bài khác tham chiếu.

### 16.4. Phát video và giới hạn bảo vệ nội dung

- Preview media có thể công khai theo chính sách sản phẩm.
- Nội dung bài không preview cần kiểm tra enrollment và trạng thái course trước khi cấp khả năng xem.
- Xác minh cơ chế private/authenticated/restricted delivery nào thật sự được hỗ trợ trên gói Cloudinary đang dùng.
- Không nhầm signed upload URL, signed delivery URL và URL/token có thời hạn; chữ ký URL không mặc nhiên tạo expiration.
- Không tuyên bố video được bảo vệ chỉ vì ẩn player hoặc URL khỏi catalog. Public CDN URL có thể được chia sẻ và vẫn tiêu tốn băng thông.
- Nếu gói miễn phí không hỗ trợ cơ chế hạn chế truy cập cần thiết, ghi rõ hạn chế và dùng nội dung demo không nhạy cảm; trình bày quyết định sản phẩm cần chọn, không tự mua gói hoặc tự thay dịch vụ.
- Không proxy toàn bộ video qua Next.js chỉ để giả lập bảo mật mà không tính băng thông/chi phí của hosting.
- Không hứa DRM hoặc không thể quay màn hình/tải lại video.

### 16.5. Tiết kiệm dữ liệu

- Người dùng bật chế độ tiết kiệm dữ liệu, lưu preference.
- Không autoplay, không preload video của các bài chưa mở; cấu hình preload=none hoặc mức phù hợp được giải thích.
- Chỉ gắn nguồn video khi có tương tác cần xem nếu điều đó phù hợp UX/player.
- Ưu tiên bài đọc và transcript; hiển thị dung lượng ước tính trước khi phát.
- Lazy-load ảnh, thumbnail nhỏ và không dùng video làm background/preview tự chạy.
- Không tự tải file media lớn trong seed, test hoặc khi render danh sách khóa học.

## 17. Ngân sách miễn phí và quản trị quota

### 17.1. Sự thật phải xác minh

- Tra lại tài liệu và dashboard tài khoản trước khi triển khai; ghi ngày kiểm tra và URL nguồn trong docs/FREE_TIER_BUDGET.md.
- MongoDB Atlas Free thường được tài liệu mô tả khoảng 0,5 GB, có tính cả index; không hiểu đây là toàn bộ dung lượng có thể dùng cho text tùy ý.
- Cloudinary Free được tài liệu hiện hành mô tả 25 credits dùng chung cho storage, processing/transformations và delivery bandwidth. Video bandwidth Free được tính khác một số gói trả phí.
- Không diễn giải thành ba hạn mức 25 GB độc lập. Không lấy hệ số image transformations áp dụng mù quáng cho mọi video transformation.
- Kiểm tra storage snapshot và rolling window của bandwidth/transformations, không giả định tất cả reset vào đầu tháng.
- Caching CDN có thể giảm xử lý lại nhưng delivery tới người xem vẫn có thể tính bandwidth.
- Không cam kết mọi người dùng đều học miễn phí vô hạn chỉ vì video nhỏ.

Các con số trên là bối cảnh thiết kế cần kiểm tra lại, không phải hardcode bất biến hoặc cam kết cho tài khoản cụ thể.

### 17.2. Ngân sách nội bộ mặc định

- Mục tiêu media managed storage <= 1 GiB cho demo, tính cả bản dẫn xuất/original theo cách provider báo cáo.
- Mục tiêu MongoDB data + index <= 300 MiB để chừa khoảng trống.
- Mục tiêu Cloudinary tổng sử dụng <= 18 credits, thay vì dùng sát mức miễn phí có thể có.
- 60% ngân sách nội bộ: cảnh báo admin; 80%: chế độ tiết kiệm mạnh hơn và yêu cầu kiểm tra; 90%: dừng cấp upload reservation mới và transformation không thiết yếu.
- Tách ngân sách hiện tại với hạn mức chính thức; dùng byte chính xác, ghi rõ MiB/GiB khác MB/GB khi hiển thị/tính toán.
- Admin không được bỏ qua quota global chỉ vì có quyền admin; thay đổi quota phải là hành động riêng có audit.

### 17.3. Dashboard và dữ liệu usage

- Dashboard admin: storage, bandwidth, transformation/credit usage nếu API cung cấp, số media, orphan/pending upload và MongoDB usage.
- Có thời điểm đồng bộ cuối, nguồn, độ trễ và trạng thái estimated/authoritative.
- Không gọi Cloudinary Admin API mỗi request người học; mặc định refresh theo yêu cầu có cooldown hoặc tối đa khoảng 15–60 phút, phù hợp rate limit thực tế.
- Nếu môi trường không có scheduler free phù hợp, dùng script/command chạy thủ công có kiểm soát; không tạo cron trả phí ngầm.
- Nếu không lấy được MongoDB metrics qua ứng dụng với quyền tối thiểu, dùng dashboard/manual snapshot và ghi rõ; không tạo số đo giả.
- Khi usage cũ hoặc API lỗi, dừng cấp upload mới theo chính sách fail-closed; bài đọc vẫn hoạt động.
- Local reservation kiểm soát concurrency cho storage/quota nội bộ; không xem nó là số băng thông CDN thật theo thời gian thực.
- Ước tính số lượt xem còn lại chỉ là ước tính, không hiển thị như cam kết chính xác.

### 17.4. Giới hạn kỹ thuật cần nói thật

- Chặn upload không chặn băng thông từ video đã có.
- Chặn cấp link mới không thu hồi chắc chắn link public hoặc link đã cấp.
- Analytics có độ trễ, nhiều người xem đồng thời và link CDN bị chia sẻ có thể làm vượt ngân sách dự kiến.
- Nếu không có hard cap ở provider hoặc access control đủ mạnh, không hứa ứng dụng bảo đảm tuyệt đối không vượt quota.
- Thiết kế có kill switch cho upload, cấp khả năng phát mới và transformation nếu khả năng provider cho phép; ghi rõ phạm vi tác dụng của từng switch.
- Chỉ dùng nội dung demo nhỏ, kiểm soát nhóm người thử, theo dõi usage và có runbook xử lý gần hạn mức.
- Không tự nâng gói, bật paid add-on hoặc nhập thẻ thanh toán.

### 17.5. Dọn dữ liệu

- Media có trạng thái pending, ready, attached, deletion_pending, deleted/failed phù hợp; mô hình cuối cần tránh trạng thái mâu thuẫn.
- Job/script tìm orphan có grace period; mặc định dry-run, hiển thị danh sách và lý do.
- Không xóa file đang được tham chiếu bởi bản course đã xuất bản.
- Xóa Cloudinary thất bại không được báo đã xóa thành công; retry idempotent có backoff/bounded retries hoặc hàng đợi DB đơn giản.
- TTL cho rate-limit bucket, reset token và reservation tạm; vẫn kiểm tra expiry trong logic.
- Giới hạn log, revisions, attempt history; không giữ event stream chi tiết vô hạn.

## 18. Dashboard quản trị và kiểm duyệt

- Quản lý user, trạng thái active/blocked, vai trò và yêu cầu làm giảng viên.
- Duyệt/từ chối course, ghi lý do; suspend/unpublish theo chính sách.
- Quản lý category, learning path và featured courses.
- Moderation câu hỏi, câu trả lời, review và báo cáo nội dung.
- Tổng quan số user, khóa học, enrollment, completion; thống kê là aggregate phù hợp, không truy vấn toàn bộ dữ liệu mỗi lần tải.
- Dashboard media/quota và công cụ dọn orphan.
- Audit log có actor, action, target, timestamp, outcome và requestId; không ghi token, password, note riêng hoặc body đầy đủ nhạy cảm.
- Giới hạn retention/audit size; xóa dữ liệu không quan trọng theo policy được tài liệu hóa.
- Không cung cấp tính năng admin giả danh học viên hoặc xem ghi chú riêng trong bản đầu.
- Không hard-delete hàng loạt qua một nút thiếu bản xem trước và kiểm tra quyền.

## 19. Thiết kế dữ liệu MongoDB

Trước khi code, đề xuất schema và index cho các entity sau, có thể gộp/tách nếu có lý do cụ thể:

- users, authAccounts, authTokens.
- instructorApplications nếu có luồng xin quyền.
- courses, chapters, lessons và cấu trúc course revisions có giới hạn.
- enrollments, lessonProgress, lessonUnderstanding.
- quizzes, quizQuestions nếu cần tách, quizAttempts.
- notes, reviewItems.
- learningPaths, pathEnrollments nếu cần dữ liệu riêng.
- projectAssignments, projectSubmissions, projectFeedback.
- questions, answers, courseReviews, contentReports.
- mediaAssets, uploadReservations, usageSnapshots, quotaCounters.
- auditLogs, rateLimitBuckets, appSettings.

Yêu cầu:

1. Mỗi collection có bảng mô tả field, type, required, default, validation, index, retention và dữ liệu nhạy cảm.
2. Không embed mảng tăng không giới hạn vào user/course: progress, notes, attempts, enrollments và hỏi đáp phải có mô hình tăng trưởng phù hợp.
3. Unique index cho normalized email, provider+providerAccountId, user+course enrollment, user+lesson progress và user+course review.
4. Compound index theo truy vấn thực tế; không index mọi field. Tính index vào ngân sách storage.
5. TTL index phù hợp cho token/bucket/reservation; logic nghiệp vụ vẫn kiểm tra hạn dùng.
6. Không nhận raw Mongo filter, operator, projection hay sort từ client. Validate ObjectId và allowlist filter để tránh NoSQL injection.
7. Projection/DTO loại passwordHash, token hashes, correct answers và dữ liệu private khỏi response.
8. Dùng atomic updates, unique constraints, optimistic concurrency và transaction khi thật sự cần nhiều document nhất quán. Kiểm tra driver/Atlas support; không dựa vào transaction như công cụ giải mọi vấn đề.
9. Các thao tác cross-service MongoDB–Cloudinary/email không có transaction chung; thiết kế trạng thái, idempotency và compensating action.
10. Driver connection được tái sử dụng trên server theo môi trường dev/serverless, pool có giới hạn; không tạo connection mới mỗi request. Không đưa connection string ra bundle client.
11. Có script tạo index, seed idempotent và schemaVersion/migration gọn khi dữ liệu thay đổi.
12. Dữ liệu trùng khóa/race condition trả lỗi nghiệp vụ phù hợp; không lộ stack trace hoặc query nội bộ.
13. Soft delete chỉ ở entity thật sự cần; tránh tích lũy vô hạn và tránh mọi truy vấn phải tự đoán trạng thái.

## 20. Kiến trúc code và hợp đồng API

Đề xuất cấu trúc theo module, ví dụ:

```text
src/
  app/                  # Pages, layouts, actions/route handlers mỏng
  components/           # UI dùng chung
  modules/
    auth/
    users/
    courses/
    enrollments/
    learning/
    quizzes/
    notes/
    reviews/
    learning-paths/
    projects/
    discussions/
    media/
    admin/
  lib/                  # DB, env, logging và tiện ích có phạm vi rõ
  server/               # Auth guards, shared infrastructure server-only
tests/
scripts/
docs/
```

Đây là gợi ý, điều chỉnh theo repo; không tạo thư mục rỗng hoặc interface chỉ để khớp sơ đồ.

- UI → action/handler → service/policy → repository/provider adapter.
- Kiểm tra quyền nằm tại boundary cần thiết và gắn với query; không phụ thuộc component đã gọi trước đó.
- Server Components có thể gọi service trực tiếp, không tự fetch HTTP vào chính app nếu không cần.
- Logic nghiệp vụ quan trọng không nằm trong component hoặc middleware/proxy duy nhất.
- Dùng server-only cho module chứa secrets/DB.
- Không cache chung dữ liệu cá nhân giữa người dùng; thiết kế caching/invalidation theo tài liệu Next.js phiên bản đã cài.
- Không vô hiệu hóa toàn bộ cache vô cớ; catalog công khai có thể cache với invalidation khi publish/update.
- Tạo error contract thống nhất: code, message an toàn, fieldErrors nếu có, requestId; phân biệt 401/403/404/409/422/429/5xx phù hợp.
- Dùng DTO/schema rõ; không export nguyên document database sang client.
- Kiểm tra request body size và giới hạn pagination. Luồng upload binary không đi qua API của Next.js.
- RequestId/log có cấu trúc, redaction dữ liệu nhạy cảm.

Trước khi implement, lập ma trận endpoint/action gồm: mục đích, input, output, auth, permission, rate limit, idempotency, lỗi và tác dụng phụ.

## 21. UI/UX, accessibility và trạng thái lỗi

### 21.1. Danh sách màn hình

Public:

- Trang chủ, catalog, chi tiết khóa, bài preview, danh sách/chi tiết lộ trình.
- Đăng nhập, đăng ký, xác minh email, quên/reset mật khẩu.
- Hồ sơ thành quả public nếu chủ tài khoản bật.

Học viên:

- Dashboard, khóa học của tôi, trang học, kết quả quiz.
- Ghi chú, ôn tập hôm nay, mục cần ôn/chưa hiểu.
- Lộ trình đang theo, bài tập/bài nộp và phản hồi.
- Hồ sơ, bảo mật, Google linking và tùy chọn dữ liệu.

Giảng viên:

- Dashboard, danh sách course, course editor, chapter/lesson editor.
- Media picker/uploader, quiz editor, project/rubric editor.
- Hỏi đáp, review tổng hợp, bài nộp cần đánh giá, trạng thái duyệt.

Admin:

- Dashboard, user/role management, duyệt course.
- Categories, paths, moderation, quota/media, audit.

### 21.2. Tiêu chuẩn giao diện

- Layout rõ ràng, đọc nội dung thoải mái; không cần animation nặng.
- Responsive; kiểm tra ít nhất một mobile viewport và desktop.
- Label form, lỗi gắn field, focus state rõ, tương phản màu và điều hướng bàn phím.
- Không chỉ dùng màu để biểu đạt đúng/sai hoặc trạng thái.
- Skeleton/loading, empty, error, forbidden và not-found cho luồng chính.
- Nút submit có pending/disabled hợp lý; backend vẫn idempotent để chống double click.
- Thông báo lưu thất bại có retry; không báo thành công trước khi server xác nhận nếu chưa có rollback phù hợp.
- Form dài có cảnh báo thay đổi chưa lưu hoặc draft recovery hợp lý.
- Quiz có thể sử dụng bằng bàn phím, kết quả không chỉ là icon màu.
- Video có label điều khiển và khả năng dùng caption khi đã có dữ liệu.
- Không đưa thuật ngữ JWT, collection, credit API vào luồng học viên nếu không cần cho quyết định của họ.

## 22. Bảo mật tổng thể và rate limit

- Validate ở server mọi input; allowlist field, sort, URL schemes và mutation.
- Markdown/rich text phải sanitize hoặc render bằng cấu hình an toàn; test stored XSS.
- Không cho arbitrary HTML, script, iframe và remote image URL không kiểm soát trong bản đầu.
- Không tự fetch URL bài nộp hoặc URL do người dùng nhập, tránh SSRF.
- CSRF/origin cho mutation dùng cookie; OAuth callback có cơ chế riêng của thư viện.
- CORS cùng origin mặc định, không dùng wildcard kèm credentials.
- Security headers phù hợp; CSP có allowlist domain Cloudinary/Google thật sự cần và được kiểm chứng không làm hỏng app.
- Giới hạn login/register/reset/resend email, post hỏi đáp, review và cấp upload authorization.
- Rate limit production phải có state dùng chung, ví dụ atomic MongoDB counters có TTL; không xem Map trong memory là đủ cho nhiều instance.
- Bucket key không lưu IP thô vô thời hạn; dùng hash/HMAC phù hợp, chỉ tin proxy header của hạ tầng được cấu hình.
- Rate limit account + IP theo tác vụ, có cooldown và thông báo Retry-After; không tạo khóa tài khoản vĩnh viễn chỉ bằng request sai từ bên ngoài.
- Hash mật khẩu tốn tài nguyên: giới hạn body và rate trước khi chạy hash/verify.
- Tài khoản app dùng MongoDB user có quyền tối thiểu; không mở mạng không giới hạn theo mặc định mà không giải thích hạ tầng cần gì.
- Secrets không vào source, logs, screenshots hoặc NEXT_PUBLIC_ env.
- Public DTO không lộ email người học, token, hash, answer key hoặc số liệu riêng.
- Khóa dependency, kiểm tra lỗ hổng phù hợp; không tự động update major chỉ để làm sạch report.
- Không log request body đầy đủ ở auth/reset/notes.

## 23. Kiểm thử bắt buộc và tiêu chí nghiệm thu

Viết test có ý nghĩa theo rủi ro, không tạo test chỉ kiểm tra implementation gọi mock đúng thứ tự. Không load-test trực tiếp Atlas/Cloudinary Free hoặc tải đi tải lại video thật.

### 23.1. Authentication và authorization

- Đăng ký tạo password hash, không lưu plaintext.
- Email trùng do hai request đồng thời không tạo hai user.
- Login sai trả lỗi chung và bị rate limit.
- Token reset hết hạn/đã dùng bị từ chối; hai request consume chỉ một thành công.
- Reset/đổi mật khẩu/đăng xuất tất cả làm JWT cũ bị từ chối ở request bảo vệ tiếp theo.
- User bị khóa không tiếp tục mutation dù JWT chưa hết hạn.
- Student không nâng role bằng request giả.
- Instructor A không sửa course/media của B.
- User A không đọc/sửa notes hoặc bài nộp private của B.
- Google account linking không chiếm tài khoản chỉ bằng email trùng; kiểm thử phần policy local và ghi rõ OAuth provider cần integration test thật.

### 23.2. Nội dung và học tập

- Draft/pending không lộ qua catalog, API, preview hoặc cached page.
- Người chưa enrollment không lấy được bài riêng; bài preview đúng chính sách.
- Enrollment double submit idempotent.
- Resume position hợp lệ, progress không bị regression do event cũ, completed không bị vô tình unset.
- Mẫu số tiến độ đúng khi có bài optional/archived hoặc curriculum revision.
- Quiz response trước nộp không chứa answer key/explanation riêng.
- Score được tính server-side; client sửa score không có tác dụng.
- Quiz submission lặp không tạo attempt/review item trùng.
- Quiz đổi version không làm sai kết quả cũ.
- Note timestamp seek đúng, input XSS không thực thi.
- Review one-per-user/course, không tự review khóa mình dạy, aggregate sửa/xóa đúng.

### 23.3. Media và quota

- Client không xin upload cho course không có quyền.
- Hai reservation đồng thời không vượt local storage quota đã định.
- Client sửa bytes/publicId/duration không qua được finalize.
- Callback lặp và callback đến muộn không cộng quota nhiều lần.
- Upload không finalize được reconcile, có dry-run.
- Không xóa asset còn tham chiếu.
- Usage API lỗi/cũ không tạo upload signature mới theo policy.
- Video không autoplay/preload hàng loạt; catalog không tải video.
- Test phân biệt upload signature với delivery access; không chỉ test UI ẩn player.
- Không tuyên bố chặn bandwidth vượt quota khi chưa có cơ chế provider tương ứng.

### 23.4. Điểm khác biệt

- Ghi chú timestamp thuộc đúng user/lesson.
- Review schedule tính đúng khi trả lời đúng/sai, qua timezone và double submit.
- Đầu vào gợi ý đúng chủ đề theo rule, không tự hoàn thành bài.
- Understanding tách khỏi completion.
- Rubric tổng điểm đúng, người không có quyền không xem submission.
- Public profile chỉ lộ thành quả được chọn, không lộ email/ghi chú/điểm riêng.
- Path progress không đếm trùng và xử lý mục bị gỡ.

### 23.5. Cách chạy test

- Unit tests không cần provider credentials.
- Integration dùng database test tách biệt, có guard ngăn nhầm production và cleanup phạm vi test.
- Nếu MongoDB test dùng transactions thì môi trường test phải có replica set phù hợp; không dùng mock để che lỗi khác biệt này.
- E2E cốt lõi: tạo tài khoản → xác minh theo test adapter → enrollment → học → ghi chú → quiz → resume.
- E2E giảng viên/admin: tạo nháp → gửi duyệt → duyệt → khóa xuất hiện công khai.
- Provider external tests ít, có điều kiện chạy thủ công với môi trường test; không tiêu hao media quota trong CI mặc định.
- Chạy lint, typecheck, test liên quan và build khi phù hợp. Ghi pass/fail/not-run cùng lý do và lệnh thực tế.

## 24. Seed, cấu hình và môi trường

### 24.1. Seed

- Hai khóa tự biên soạn, ví dụ Next.js cơ bản và MongoDB cho web developer.
- Có chapter, reading lesson, metadata video, quiz, đầu vào, project rubric, learning path và một số review demo.
- Seed idempotent bằng natural key/slug ổn định; chạy lại không nhân đôi.
- Không tự upload 20 video hay tải file bên ngoài khi chạy seed mặc định.
- Media mẫu là file nhỏ có quyền sử dụng; upload qua script riêng, có cờ xác nhận phạm vi và hiển thị ước tính trước.
- Không hardcode mật khẩu admin/demo production. Nếu có user demo local, tạo bằng env/script, chỉ hoạt động development/test, không được bật ở production.
- Không để nội dung mẫu giả vờ là người dùng/đánh giá thật trên bản public; ghi rõ demo.

### 24.2. Biến môi trường

Đề xuất .env.example theo thư viện/phiên bản thật sự chọn, có chú thích, tối thiểu nhóm:

- APP_URL, app environment và timezone mặc định.
- MONGODB_URI, MONGODB_DB_NAME, TEST_MONGODB_URI nếu cần.
- Auth secret và Google client ID/secret theo tên chính thức của thư viện.
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET và cấu hình preset/profile đã xác minh.
- SMTP host/port/user/password/from hoặc nhóm email adapter tương đương.
- Quota bytes, số media/course, giới hạn upload duration/size, credit budget và freshness policy.
- Feature flags cho các phase và public profile nếu cần.

- Validate env khi khởi động/build theo khả năng runtime, phân biệt server/client.
- Không yêu cầu secrets production để chạy unit test.
- Thiếu cấu hình email/Google/Cloudinary phải có lỗi thiết lập rõ ràng, không fake success.
- Email dev có adapter kiểm thử riêng; không ghi token/link nhạy cảm ở log production.
- Không tạo hàng chục biến env cho lựa chọn không cần thay đổi theo deployment.

## 25. Vận hành, CI/CD và tài liệu

- Scripts: dev, build, start, lint, typecheck, test, test:e2e, db:indexes, db:seed và media:cleanup:dry-run theo thực tế.
- CI: install với lockfile → lint → typecheck → unit/integration phù hợp → build; E2E nếu môi trường đáp ứng.
- Không đưa production secrets vào CI không cần chúng; không chạy seed/migration phá dữ liệu production từ pull request.
- Chọn hosting tương thích Node.js runtime, MongoDB driver, password hashing và giới hạn request thực tế. Kiểm tra điều khoản/hạn mức miễn phí của hosting thay vì hứa mọi hạ tầng đều miễn phí.
- Không dùng Edge runtime cho route cần dependency không tương thích.
- Health endpoint chỉ trả trạng thái tối thiểu, không lộ secrets/connection string; tránh query tốn phí liên tục.
- Logs có cấu trúc và requestId; không cần thêm SaaS observability trả phí cho demo.
- Có hướng dẫn backup/export thủ công và restore thử ở database riêng. Không bật backup tính phí mà chưa được yêu cầu.
- Có runbook: provider lỗi, sắp hết quota, token/secret lộ, upload orphan, course bị suspend và rollback release.
- Deploy/public launch chỉ sau khi tôi yêu cầu; chuẩn bị code/config/hướng dẫn trước, không tự bật paid feature hoặc public dữ liệu thật.

Tài liệu cần có:

1. README.md: mục tiêu, stack, setup, scripts và demo flow.
2. docs/PRD.md: người dùng, feature matrix, phạm vi và acceptance criteria.
3. docs/ARCHITECTURE.md: module, ranh giới server/client, luồng dữ liệu và tradeoff.
4. docs/DATA_MODEL.md: collections, index, invariant, retention.
5. docs/AUTH_SECURITY.md: Credentials/Google/JWT, cookie, revoke, linking, CSRF và quyền.
6. docs/MEDIA_PIPELINE.md: reservation/upload/finalize/delivery/delete/reconcile và giới hạn thật.
7. docs/FREE_TIER_BUDGET.md: quota hiện hành có nguồn/ngày kiểm tra, ngân sách nội bộ, phép tính và cảnh báo.
8. docs/API_CONTRACTS.md: actions/endpoints, auth và lỗi.
9. docs/TEST_PLAN.md: ma trận rủi ro và test đã/chưa thực hiện.
10. docs/TECH_DECISIONS.md hoặc ADR riêng cho quyết định quan trọng.
11. docs/DEPLOYMENT.md và docs/RUNBOOK.md.
12. docs/PROGRESS.md: trạng thái thực hiện, việc tiếp theo và blockers.
13. CLAUDE.md ngắn: lệnh xác minh, ràng buộc không suy ra được từ code, lưu ý bảo mật/ngân sách; trỏ tới tài liệu chi tiết thay vì chép toàn PRD.

Tài liệu phản ánh implementation cuối cùng, không chỉ mô tả thiết kế mong muốn.

## 26. Lộ trình triển khai bắt buộc

Tất cả tính năng đã mô tả đều thuộc backlog dự án. Chia phase để làm tuần tự; không bỏ các điểm khác biệt chỉ vì chúng nằm sau MVP.

### Phase 0 — Khảo sát và chốt thiết kế

- Đọc repo/hướng dẫn hiện có.
- Xác minh stack, auth library, free-tier facts và media access khả dụng.
- Lập PRD, quyền, schema/index, kiến trúc, API contracts và feature-to-phase matrix.
- Nêu rủi ro, giả định, tradeoff và các quyết định cần tôi chọn.
- Chưa triển khai toàn bộ ứng dụng ở phase này.

Nghiệm thu: tôi đọc được kiến trúc, luồng auth, luồng media, ngân sách và kế hoạch; không có lời hứa bảo mật/quota thiếu bằng chứng.

### Phase 1 — Nền tảng và authentication

- Scaffold theo repo, env validation, DB connection/indexes, UI shell.
- Email/password, verify/reset/change, Google, linking và JWT revoke.
- RBAC/ownership helpers, rate limiting và auth tests.

Nghiệm thu: tài khoản thật dùng được khi có credentials, không lộ secrets, các test phân quyền/thu hồi phiên qua được; tích hợp chưa chạy phải ghi rõ.

### Phase 2 — Course authoring và catalog

- Course/chapter/reading lesson CRUD, draft/review/publish, catalog, tìm kiếm/lọc, enrollment.
- Duyệt admin và authorization theo ownership.
- Seed text và dashboard cơ bản.

Nghiệm thu: instructor tạo khóa → admin duyệt → student enrollment → đọc bài; draft/private không lộ.

### Phase 3 — Cloudinary và kiểm soát tài nguyên

- Reservation, signed upload theo khả năng provider, finalize, media picker, video lesson.
- Chính sách access/delivery được xác minh, data saver, usage snapshot, upload quota, cleanup dry-run.

Nghiệm thu: upload thật giới hạn nhỏ, xem được media đúng policy, race quota được kiểm thử, không nhầm bảo vệ UI với bảo vệ CDN.

### Phase 4 — Học tập và các điểm nhấn ban đầu

- Resume/progress/completion, quiz cơ bản, ghi chú timestamp, dashboard tiếp tục học.
- Đánh giá đầu vào, review câu sai và mức độ hiểu.

Nghiệm thu: một luồng học đầy đủ chạy xuyên suốt, score server-side, note riêng tư, retry/double-submit không tạo dữ liệu sai.

### Phase 5 — Dự án, lộ trình và tương tác

- Learning paths theo mục tiêu.
- Project/rubric/submission/feedback.
- Hỏi đáp, review/moderation và public achievement profile có opt-in.

Nghiệm thu: các feature khác biệt hoạt động bằng dữ liệu thật; không lộ note/email/submission riêng.

### Phase 6 — Hoàn thiện và chuẩn bị vận hành

- Hoàn thiện admin, quota, orphan cleanup/reconcile, audit/retention.
- Responsive/accessibility, cache, query/index review và giới hạn ghi tiến độ.
- Security regression, E2E trọng yếu, CI/build, docs và deployment checklist.

Nghiệm thu: feature matrix được đối chiếu đủ, các check cần thiết chạy có bằng chứng; còn giới hạn gì phải nêu cụ thể.

## 27. Cách làm việc trong mỗi giai đoạn

Trước khi sửa code:

1. Tóm tắt feature đang làm và acceptance criteria.
2. Nêu file/module dự kiến thay đổi.
3. Chỉ ra rủi ro về dữ liệu, quyền hoặc quota liên quan.
4. Chia task nhỏ đủ để review; không tạo checklist khổng lồ rồi quên cập nhật.

Trong khi làm:

- Chủ động thực hiện các thay đổi thường lệ đã được cho phép trong phase.
- Khi tìm được lỗi, sửa nguyên nhân thay vì chỉ che UI.
- Không xóa test hoặc nới authorization để làm test pass.
- Không viết code triển khai cho phase sau nếu chưa cần, nhưng ghi backlog phụ thuộc.
- Giữ thay đổi của tôi, tránh reformat toàn repo ngoài phạm vi.

Sau khi làm:

1. Báo hành vi đã hoàn thành và cách thử.
2. Nêu thay đổi kiến trúc/schema đáng chú ý.
3. Liệt kê check đã chạy với kết quả thực tế, phân biệt mock/provider thật.
4. Nêu phần chưa hoàn thành, dependency ngoài và hạn chế thực tế.
5. Cập nhật docs/PROGRESS.md và feature matrix.
6. Giải thích ngắn điều tôi nên hiểu để tự bảo trì feature này; đề xuất một bài tập nhỏ khi hữu ích.

## 28. Quản lý context và điểm tiếp tục

Nếu gần hết context hoặc phiên làm việc dừng:

- Lưu checkpoint ngắn: branch/commit nếu có, phase hiện tại, file đã sửa, lệnh test và kết quả, task tiếp theo, blocker.
- Không ghi secrets, token, mật khẩu hoặc connection string vào checkpoint.
- Lần sau đọc CLAUDE.md và docs/PROGRESS.md trước, đối chiếu git diff rồi tiếp tục; không bắt đầu lại từ scaffold.
- Feature chưa được test hoặc còn stub phải mang trạng thái pending/partial, không done.
- Không báo toàn dự án hoàn tất chỉ vì MVP hoạt động.

## 29. Definition of Done toàn dự án

Chỉ gọi dự án hoàn thành phạm vi này khi:

- Có ma trận đối chiếu mọi nhóm tính năng ở mục 4–18 với màn hình, service và kiểm thử hoặc lý do được tôi đồng ý hoãn.
- Các role có quyền đúng ở server, đã kiểm thử truy cập chéo.
- Credentials/Google/JWT và revoke hoạt động theo thiết kế đã chọn; mật khẩu được hash đúng.
- Catalog, authoring, duyệt, enrollment, học/resume/progress và quiz chạy với DB thật trong môi trường kiểm chứng.
- Notes timestamp, đầu vào, review câu sai, understanding, paths, project rubric, hỏi đáp, reviews và achievement profile được làm theo phase đã chốt.
- Media upload/finalize/delete có xác minh, idempotency, quota và handling lỗi.
- Chính sách delivery và free-tier limitation được mô tả trung thực; không có cam kết hard bandwidth cap khi provider không cung cấp.
- Người học có trải nghiệm lỗi/loading/empty/mobile hợp lý.
- Không có secrets hardcode, answer key bị lộ, private data cache chéo user hoặc endpoint tự nâng quyền.
- Lint/typecheck/tests/build cần thiết có kết quả cụ thể, integration chưa xác minh được ghi rõ.
- README, env example, schema/index scripts, seed, runbook và checkpoint đủ để tôi tiếp tục tự phát triển.
- Không phát sinh dịch vụ trả phí hoặc công khai dữ liệu thật mà tôi chưa yêu cầu.

## 30. Yêu cầu bắt đầu ngay trong lượt đầu

Ngay sau khi đọc prompt, hãy bắt đầu Phase 0:

1. Nếu có repo: đọc cấu trúc, package manifest, hướng dẫn và git status; mô tả ngắn những gì đã có. Nếu repo trống: đề xuất cấu trúc, chưa cài hàng loạt package.
2. Tóm tắt hiểu biết sản phẩm và xác nhận các ràng buộc Next.js + MongoDB Atlas + Cloudinary + JWT + Google.
3. Lập bảng MVP / mở rộng / ngoài phạm vi, nhưng giữ toàn bộ feature đã nêu trong kế hoạch dự án.
4. Đề xuất kiến trúc, auth/session strategy, account linking, media pipeline và free-tier budget, kèm giới hạn cần kiểm chứng.
5. Đề xuất collections/indexes và ma trận quyền/API ở mức đủ để review.
6. Tạo các tài liệu thiết kế cốt lõi trong repo nếu có quyền ghi; nếu chỉ đang chat, xuất nội dung tương ứng thay vì nói đã tạo file.
7. Nêu tối đa 5 câu hỏi có ảnh hưởng thực sự tới thiết kế nếu còn thiếu thông tin. Phần không phụ thuộc câu trả lời vẫn tiếp tục hoàn thiện.
8. Kết thúc Phase 0 bằng một kế hoạch triển khai cụ thể và xin tôi duyệt thiết kế một lần trước Phase 1. Sau khi được duyệt, triển khai lần lượt các phase và không xin lại xác nhận cho từng chỉnh sửa thường lệ trong phạm vi đã duyệt.

Không bắt đầu bằng việc sinh toàn bộ mã nguồn trong một lượt. Ưu tiên có một thiết kế cụ thể, kiểm chứng được, rồi triển khai thành sản phẩm chạy thật.

---

## Nguồn chính thức để tự kiểm tra khi triển khai

Các link dưới đây là điểm bắt đầu, không thay thế việc đối chiếu phiên bản/tài khoản đang dùng:

- Next.js authentication: https://nextjs.org/docs/app/guides/authentication
- Next.js data security: https://nextjs.org/docs/app/guides/data-security
- Auth.js session strategies: https://authjs.dev/concepts/session-strategies
- Auth.js Google: https://authjs.dev/getting-started/providers/google
- OWASP password storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- MongoDB Atlas Free limits: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- Cloudinary billing/credits: https://cloudinary.com/documentation/billing_and_plans
- Cloudinary plan comparison: https://cloudinary.com/pricing/compare-plans
- Cloudinary upload parameters: https://cloudinary.com/documentation/upload_parameters
- Claude Code practices: https://code.claude.com/docs/en/best-practices

Ngày biên soạn yêu cầu: 23/11/2026. Các giới hạn nhà cung cấp phải được kiểm tra lại tại thời điểm thực hiện.
