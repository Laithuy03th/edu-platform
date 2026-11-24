# PROMPT V2 — EDU PLATFORM: NỀN TẢNG HỌC LẬP TRÌNH VÀ KIẾN THỨC IT

Bản đặc tả hợp nhất ngày 24/11/2026. Đọc toàn bộ trước khi làm việc. Đây là yêu cầu và tiêu chí nghiệm thu, KHÔNG phải báo cáo website đã hoàn thành.

## 0. Ưu tiên của bản V2 và nhiệm vụ hiện tại

Tôi đang có dự án Edu Platform và cần bạn kiểm tra rồi hoàn thiện nó, mở rộng thành nền tảng học lập trình chuyên sâu, có thể bao phủ nhiều lĩnh vực IT theo thời gian.

- Giữ Next.js cho frontend/backend, MongoDB Atlas cho dữ liệu text/cấu trúc, Cloudinary cho ảnh/video, JWT và Google login.
- Giữ toàn bộ tính năng LMS ở mục 1–30. Mục 31–42 bổ sung kiểm toán bằng chứng, danh mục công nghệ IT, nội dung lập trình có phiên bản, thực hành, media, thiết kế đỏ nhạt nhiều animation và SEO.
- Nếu yêu cầu cũ và V2 khác nhau, yêu cầu V2 cụ thể hơn được ưu tiên: làm tiếp repo đang có, kiểm kê trước; phát triển danh mục IT rộng nhưng xuất bản nội dung có kiểm thử theo từng đợt; animation phải có thiết kế và đạt hiệu năng.
- Không xem việc có prompt, trang UI, dữ liệu seed, API key, mock test pass hoặc provider Usage API thành công là bằng chứng mọi luồng nghiệp vụ đã hoàn thành.
- Mọi tính năng hiện có phải được đối chiếu code, quyền, lưu dữ liệu, thao tác UI và kiểm thử thực tế trước khi gắn trạng thái hoàn thành.
- Hai khóa/20 video là bộ demo ban đầu để giới hạn chi phí, KHÔNG phải giới hạn số chủ đề/ngôn ngữ mà sản phẩm có thể tổ chức. Không tự nâng quota hoặc upload video hàng loạt để lấp đầy danh mục.
- Phải bao quát cả nền tảng, nội dung, chất lượng ảnh/video, UI/UX, SEO và vận hành. Website có framework đẹp nhưng không có nội dung đã biên tập vẫn chưa đạt mục tiêu.
- Không ai được cam kết top 1 hoặc thời hạn lên top Google. SEO là công việc kỹ thuật + nội dung + đo lường liên tục, kết quả phụ thuộc truy vấn và cạnh tranh.
- Không đọc/in secret trong báo cáo; chỉ báo tên biến và trạng thái có/thiếu, đúng/sai theo kiểm chứng không tiết lộ giá trị.
- Không tạo lại hoặc in một phần secret để chứng minh đã cấu hình. Không tự chuyển sang database local nếu người dùng đã chọn Atlas.

Cách dùng: lưu file này trong repository và yêu cầu Claude Code đọc file. Bắt đầu bằng kiểm kê ở mục 31 và đầu việc mục 30, sau đó thực hiện các thay đổi đã được cho phép theo giai đoạn. Không scaffold lại dự án đang chạy.

Bản đồ tài liệu:

| Phần | Nội dung |
|---|---|
| 1–6 | Mục tiêu, stack, quyền, tài khoản, Google và JWT |
| 7–15 | Course, học tập, quiz, notes, ôn tập, lộ trình, dự án, cộng đồng |
| 16–25 | Media, quota, admin, MongoDB, kiến trúc, UI, bảo mật, test và vận hành |
| 26–30 | Cách triển khai, nghiệm thu và bắt đầu công việc |
| 31–34 | Audit thực tế, hệ kiến thức IT, nội dung chuyên sâu và thực hành |
| 35–38 | Ảnh/video, nhận diện và animation, SEO và phát triển nội dung |
| 39–42 | Mô hình mở rộng, inventory tính năng, lộ trình V2 và nguồn kiểm chứng |

Toàn bộ phần bên dưới là yêu cầu dự án dành cho Claude Code. Hãy đọc hết trước khi lập kế hoạch hoặc thay đổi mã nguồn.

## 1. Vai trò, mục tiêu và cách cộng tác

Bạn là senior full-stack engineer, kiến trúc sư phần mềm, senior UI/UX designer, technical SEO specialist và người hướng dẫn kỹ thuật của tôi. Hãy giúp tôi xây dựng một nền tảng học trực tuyến có thể chạy thật, đồng thời giúp tôi rèn kỹ năng ở cấp middle software engineer.

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
- Tự động chạy/chấm code của người dùng trên server ứng dụng. Bản V2 có bài tập biên tập và browser playground cách ly theo mục 34; không dùng Next.js server làm code runner.
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

- Layout rõ ràng, đọc nội dung thoải mái; nhận diện đỏ nhạt và hệ animation có chủ đích theo mục 36, giữ ngân sách hiệu năng.
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

Nghiệm thu: tôi đọc được hiện trạng có bằng chứng, kiến trúc, luồng auth, media, ngân sách và kế hoạch; không có lời hứa bảo mật/quota thiếu bằng chứng. Repo đã có thiết kế phải được đánh giá chênh lệch, không làm lại toàn bộ tài liệu từ đầu.

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

1. Đọc repo, hướng dẫn, package manifest, lockfile, tài liệu tiến độ và git status/diff. Không đọc secret ra output.
2. Thực hiện audit ở mục 31 và lập docs/FEATURE_AUDIT.md với mã feature, file, route, dữ liệu, test, trạng thái và phần còn thiếu.
3. Trình bày những luồng đã thực sự kiểm chứng và những luồng mới chỉ có UI/mock/cấu hình. Nếu không có repo/URL để chạy, báo chưa xác minh, không tự kết luận done.
4. Đánh giá ảnh/video theo mục 35; nêu rõ có hay chưa asset thật, playback, quota và bằng chứng tối thiểu.
5. Rà taxonomy IT, chất lượng nội dung, UI/animation, accessibility và SEO theo mục 32–38.
6. Cập nhật kế hoạch có thứ tự P0/P1/P2 ở mục 41. Với việc sửa lỗi/hoàn thiện đã được cho phép, chủ động triển khai theo lát cắt nhỏ; không xin lại xác nhận cho từng file.
7. Chỉ cần quyết định của tôi khi còn lựa chọn sản phẩm ảnh hưởng lớn, thay dịch vụ, phát sinh chi phí, triển khai công khai hoặc chạy migration/xóa dữ liệu thật có rủi ro.
8. Lượt đầu phải có kết quả khảo sát cụ thể và tài liệu audit, không chỉ nhắc lại prompt hoặc hứa sẽ làm.


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

Ngày biên soạn phần nền: 23/11/2026; hợp nhất V2: 24/11/2026. Các giới hạn nhà cung cấp phải được kiểm tra lại tại thời điểm thực hiện.

## 31. Audit thực tế: tính năng nào đã hoàn thành?

Nhiệm vụ đầu tiên là kiểm tra implementation đang có. File này là đặc tả, không chứng minh code đã tồn tại.

### 31.1. Bằng chứng và trạng thái

Mỗi feature phải có: ID, yêu cầu, route/UI, file xử lý server, policy quyền, collection/index, kiểm thử đã chạy, kết quả, blocker và hành động tiếp theo.

| Trạng thái | Chỉ được dùng khi |
|---|---|
| VERIFIED | Luồng được chạy thành công với các phần liên quan thực tế, dữ liệu lưu/đọc đúng, kiểm tra quyền phù hợp và có bằng chứng |
| IMPLEMENTED_UNVERIFIED | Có code triển khai nhưng chưa chạy đủ luồng để xác nhận |
| PARTIAL | Có một phần, ví dụ chỉ UI, thiếu persist, validation, quyền hoặc các trạng thái quan trọng |
| MOCK_ONLY | Chỉ mock/fixture/demo frontend; chưa chứng minh tích hợp thật |
| BLOCKED | Thiếu credential, môi trường, quyền hoặc phụ thuộc bên ngoài; ghi rõ phần bị chặn |
| MISSING | Chưa có implementation |
| DEFERRED | Được chủ dự án đồng ý hoãn, có lý do và mốc xét lại |

- Tách trạng thái code khỏi coverage nội dung và readiness production. Một LMS có course CRUD chạy được không có nghĩa đã dạy xong Java, Python hoặc SQL.
- Tài liệu README nói done không thay cho việc kiểm tra repo/runtime.
- Build thành công không chứng minh OAuth, SMTP, Cloudinary playback hay Atlas CRUD thành công.
- Cloudinary Usage API thành công chỉ chứng minh gọi API usage, không chứng minh upload/finalize/player hoạt động.
- Secret hiện diện chỉ chứng minh có cấu hình, không chứng minh giá trị đúng hoặc provider hoạt động.
- Không tự đặt tổng tiến độ 100%. Nếu tính phần trăm phải công bố tập feature, trọng số và các mục blocked/deferred.
- Không chạy upload, gửi email hàng loạt hoặc tạo khóa học production chỉ để audit. Ưu tiên môi trường test và một ca thật nhỏ, có kiểm soát, trong phạm vi người dùng đã cho phép.

### 31.2. Các luồng phải kiểm tra

1. Email registration → verification → login → logout → reset password → phiên cũ hết hiệu lực.
2. Google login → tạo/tìm user → session → linking policy → chặn user bị khóa.
3. Instructor tạo draft → upload ảnh → thêm reading/video/quiz → gửi duyệt → admin xuất bản.
4. Khách đọc course overview → preview → học viên enrollment → học/resume → progress → quiz → review queue.
5. Notes timestamp → seek → mở lại note sau reload → chặn đọc chéo user.
6. Project submission → self rubric → instructor feedback → achievement opt-in.
7. Public page crawlable → metadata/canonical/sitemap/schema → mobile/performance.
8. Upload reservation → direct upload → finalize → MongoDB metadata → player → usage snapshot → cleanup đúng reference.

Khi không chạy được một bước, vẫn audit code và đánh dấu phạm vi chưa kiểm chứng. Không chuyển sang database local rồi báo Atlas đã pass.

### 31.3. Đầu ra của audit

- docs/FEATURE_AUDIT.md: toàn bộ inventory ở mục 40, chia VERIFIED/PARTIAL/BLOCKED/MISSING.
- docs/MEDIA_AUDIT.md: ảnh/video thật, route hiển thị, trạng thái upload/playback/quota và các giới hạn access.
- docs/UI_AUDIT.md: screenshot hoặc mô tả quan sát được theo viewport; đánh giá consistency, states, animation và accessibility.
- docs/SEO_AUDIT.md: URL sample, status, canonical, metadata, indexability, structured data, liên kết nội bộ, performance và evidence.
- docs/CONTENT_COVERAGE.md: chủ đề đã có nội dung thật, mức độ chuyên sâu, phiên bản được kiểm thử, người review và phần planned.
- docs/REMAINING_WORK.md: task cụ thể, ưu tiên, phụ thuộc và tiêu chí đóng task.

Không ghi password, secret, signed access token hoặc dữ liệu học viên vào screenshot/log/tài liệu audit.

## 32. Phạm vi kiến thức IT và taxonomy có thể mở rộng

Tầm nhìn là thư viện học IT bao quát nhiều lĩnh vực, có chiều sâu theo từng công nghệ. Không tuyên bố đã bao phủ mọi kiến thức IT hoặc mọi ngôn ngữ khi chưa có nội dung đã biên tập và kiểm chứng.

### 32.1. Các chiều phân loại độc lập

- Domain: nền tảng CS, frontend, backend, database, mobile, DevOps, QA, security, data/AI, systems, game/graphics.
- Technology type: language, framework, library, runtime, database engine, tool, protocol, platform, concept.
- Level: beginner, intermediate, advanced; có prerequisite cụ thể, không chỉ nhãn.
- Outcome: khái niệm, thực hành, dự án, debugging, vận hành hoặc phỏng vấn.
- Content type: course, lesson, tutorial, reference, cheatsheet, exercise, project, comparison, troubleshooting.
- Version/support: testedVersion, supportedRange nếu có, reviewedAt, deprecated/replacement.

Phân biệt đúng JavaScript/TypeScript là ngôn ngữ, React là thư viện, Next.js là framework, Node.js là runtime, MongoDB là database. Không gộp tất cả vào một dropdown language.

### 32.2. Bản đồ nội dung dài hạn

Đây là backlog taxonomy và roadmap biên tập; các tên dưới đây KHÔNG phải danh sách đã xuất bản hay chỉ định dùng chúng để xây backend của website.

| Mảng | Nhánh kiến thức và công nghệ cần tổ chức được |
|---|---|
| Nhập môn IT | Tư duy lập trình, biểu diễn dữ liệu, terminal, hệ điều hành, file, HTTP/DNS/TLS, Git/GitHub |
| Computer Science | Cấu trúc dữ liệu, thuật toán, độ phức tạp, OOP, FP, concurrency, memory, networking |
| Nền tảng web | HTML, CSS, responsive, accessibility, browser rendering, forms, DOM, web security |
| JavaScript/TypeScript | Cú pháp, module, async, event loop, type system, generics, tooling, testing và performance |
| Frontend ecosystem | React, Next.js, Vue, Nuxt, Angular, Svelte/SvelteKit; state, forms, routing, styling và tests theo từng hệ |
| Node.js backend | Node.js, package managers, HTTP APIs, Express/Fastify/NestJS, validation, auth, cache, jobs, WebSocket |
| Python | Python core, venv/package management, typing, testing; Django/FastAPI/Flask; data tooling theo nhánh riêng |
| Java/JVM | Java, JVM, build tools, Spring/Spring Boot, persistence, testing, concurrency; Kotlin theo track riêng |
| C#/.NET | C#, .NET runtime/SDK, ASP.NET Core, EF Core, testing và deployment |
| PHP | PHP, Composer, Laravel, database access, testing và deployment |
| Go | Go modules, interfaces, concurrency, HTTP services, testing và profiling |
| Rust | Ownership, borrowing, lifetimes, error handling, async, tooling và web/systems tracks |
| C/C++ | Memory, pointers, build/debug tools, standards theo phiên bản, testing và systems fundamentals |
| Ngôn ngữ mở rộng | Ruby/Rails, Swift, Dart/Flutter, Kotlin, Scala, Elixir, R, Julia, Lua và các nhánh khác khi có reviewer |
| SQL và relational DB | SQL, PostgreSQL, MySQL/MariaDB, SQLite; modeling, joins, transaction, index, query plan, migrations |
| NoSQL và data systems | MongoDB, Redis, search engines, graph/time-series databases theo use case; consistency và data modeling |
| Mobile | Android/Kotlin, iOS/Swift, Flutter/Dart, React Native và testing/release theo nền tảng |
| DevOps/Cloud | Linux, Docker, CI/CD, reverse proxy, TLS, observability, infrastructure as code, cloud foundations, Kubernetes theo track nâng cao |
| QA/Testing | Unit, integration, E2E, contract, performance, accessibility testing, test design và CI |
| Security | Secure coding, OAuth/OIDC, session, access control, dependency security; bài thực hành trong môi trường được phép |
| Data/AI | Python data stack, SQL analytics, statistics, data pipeline, ML fundamentals, model evaluation và tích hợp ứng dụng |
| System design | API design, cache, queue, rate limiting, storage, consistency, scalability, reliability và tradeoff |
| Game/Graphics/Embedded | Math nền tảng, engine/toolchain phù hợp, graphics, networking, embedded và IoT theo roadmap sau |

- Không tạo khóa học/URL public rỗng cho mọi tên ở bảng.
- Topic chưa có nội dung hiển thị planned trong màn roadmap riêng có giá trị; không đưa hàng nghìn trang placeholder vào sitemap.
- Mỗi công nghệ có trang hub khi có đủ bài thật và sự khác biệt về nội dung.
- Cho phép cùng bài thuộc nhiều concept/topic, nhưng giữ một URL canonical cho một nội dung.
- Taxonomy không hardcode toàn bộ vào UI; admin quản lý được tên, slug, alias, quan hệ, thứ tự và trạng thái.
- Alias giúp tìm kiếm như js/javascript, ts/typescript, postgres/postgresql; không tự sinh nhiều URL trùng nội dung cho alias.

### 32.3. Lộ trình theo nghề và mục tiêu

Hỗ trợ xây lộ trình Frontend Developer, Backend Developer, Full-stack Developer, Database Fundamentals, DevOps Foundations, QA Automation và các hướng mở rộng khác.

Mỗi lộ trình có knowledge prerequisites, milestone, mini-project, capstone, rubric, thời lượng ước tính và nhánh lựa chọn. Người học chọn một ecosystem chính trước, không bị yêu cầu học tất cả framework để hoàn thành một nghề.

### 32.4. Phạm vi xuất bản đầu tiên

Đề xuất bắt đầu một cụm liên kết: web foundations → JavaScript/TypeScript → React/Next.js → MongoDB → dự án full-stack. Cụm này tái sử dụng được kiến thức từ chính Edu Platform.

- Có thể tạo taxonomy toàn mảng ngay ở admin.
- Chỉ xuất bản đợt đầu khoảng 12–20 bài chuyên sâu đã review, một lộ trình và một dự án xuyên suốt; đây là kế hoạch nội dung đề xuất, không cam kết đã có asset.
- Python, SQL/PostgreSQL, Java/Spring và các track khác được ưu tiên tiếp theo dựa trên nhu cầu và năng lực reviewer.
- Không seed toàn bộ hàng trăm khóa/video chỉ để catalog trông lớn.

## 33. Tiêu chuẩn nội dung lập trình chuyên sâu

### 33.1. Khung chương trình cho một ecosystem

Một track có thể gồm các tầng sau, điều chỉnh theo công nghệ:

1. Dùng để giải quyết gì, khi nào chọn/không chọn và kiến thức đầu vào.
2. Cài môi trường, phiên bản được kiểm thử, lệnh kiểm tra, cấu trúc project và dependency.
3. Cú pháp/type/model nền tảng, idiom và lỗi phổ biến.
4. Module, package management, tooling và configuration.
5. Error handling, async/concurrency, I/O, memory/performance khi liên quan.
6. API/network/data access, auth và boundary bảo mật.
7. Framework/library ecosystem với phiên bản tương thích.
8. Testing, debugging, profiling và khả năng quan sát.
9. Build, deploy, environment variables, migration và vận hành.
10. Bài tập, dự án hoàn chỉnh, code review và các đánh đổi thiết kế.

Không đổi tên cùng một template nông thành khóa chuyên sâu của mọi ngôn ngữ. Mỗi track phải giải thích mô hình riêng và idiom đặc trưng.

### 33.2. Template bài học

- Tên, mô tả, level, prerequisite, outcome và thời gian ước tính.
- Technology/version/environment đã kiểm thử; OS/shell nếu lệnh khác nhau.
- Mở bài bằng một vấn đề cụ thể.
- Giải thích khái niệm theo từng bước, sơ đồ khi giúp hiểu.
- Ví dụ code có language, filename/path, highlight dòng quan trọng, nút copy và output mong đợi.
- Giải thích tại sao code chạy, dữ liệu đi qua đâu, tradeoff và edge cases.
- Common mistakes, dấu hiệu nhận biết, cách debug và cách sửa.
- Bài thực hành, gợi ý nhiều mức và lời giải có giải thích.
- Quiz ngắn kiểm tra hiểu, liên kết bài trước/sau và tài liệu chính thức.
- Author, reviewer, publishedAt, updatedAt thật, reviewedAt, testedVersion và changelog khi nội dung thay đổi đáng kể.

### 33.3. Quản trị phiên bản và chất lượng

- Tách version của nội dung, version công nghệ và version bài nộp/quiz.
- Chọn một bản mặc định đang được duy trì để dạy; ví dụ cũ có badge và cảnh báo rõ, không trộn API của các major version.
- Environment recipe: prerequisites, setupCommands, verifyCommands, runCommands, testCommands, expectedOutput và troubleshooting.
- Hướng dẫn Windows/PowerShell và macOS/Linux khi có khác biệt; không ghi lệnh shell là dùng được mọi OS nếu chưa kiểm tra.
- Code sample phải có cách verify. Chạy smoke test cho snippets quan trọng trong CI/local sandbox phù hợp, không thực thi code người dùng trên app server.
- Với DB, chỉ rõ engine/version và dữ liệu seed; không nói SQL dialect nào cũng giống nhau.
- Với package mới hoặc API thay đổi, kiểm tra tài liệu chính thức và ghi nguồn, ngày review. AI chỉ hỗ trợ soạn thảo, không thay thế review chuyên môn.
- Không sao chép nguyên khóa học, docs hoặc hình có bản quyền. Link nguồn và tự viết giải thích/ví dụ; lưu license/attribution cho asset và repo.
- Người đọc có nút Báo lỗi nội dung, kèm version và vị trí; giảng viên có inbox xử lý, trạng thái và phản hồi.
- Chỉ thay lastmod/updatedAt khi nội dung thực sự đổi, không làm mới ngày tự động để giả nội dung mới.

### 33.4. Nội dung tham chiếu và khác biệt

- Cheatsheet ngắn gọn theo ngôn ngữ, snippet có bối cảnh và giới hạn.
- Troubleshooting theo lỗi thực tế, phiên bản, nguyên nhân, bước chẩn đoán và cách kiểm tra sau sửa.
- Comparison dựa trên tiêu chí cụ thể, ví dụ cùng chức năng ở hai ecosystem, không tuyên bố ngôn ngữ nào tốt nhất cho mọi bài toán.
- Cùng một dự án triển khai nhiều stack ở các track khác nhau, có bảng so sánh model dữ liệu, auth, validation, testing và deployment.
- Concept graph: một khái niệm như transaction/closure/HTTP có bài giải thích gốc, bài áp dụng theo công nghệ và prerequisite.
- Reference không giả danh tài liệu chính thức của công nghệ.

## 34. Thực hành lập trình và đánh giá kỹ năng

### 34.1. Bài tập không cần code runner trên server

- Đọc code và dự đoán output, tìm lỗi, sửa đoạn code, điền phần còn thiếu, giải thích tradeoff.
- Câu hỏi nhiều lựa chọn hoặc nhiều đáp án khi đã có schema/chấm điểm đúng; không bắt buộc mở tất cả dạng ở lượt đầu.
- Project có starter files/repo, mục tiêu, checklist, test hướng dẫn chạy local và rubric.
- Nộp GitHub/demo link và phản hồi giảng viên như phần nền; không tự clone/fetch/chạy URL người dùng trên server.
- Gợi ý từng cấp, lời giải chỉ mở theo hành vi chủ động; tách self-check learning khỏi điểm đánh giá đáng tin.

### 34.2. Browser playground — phần mở rộng có kiểm soát

Cho phép đề xuất và triển khai theo phase riêng sau khi có thiết kế cách ly và ngân sách tải:

- HTML/CSS/JavaScript preview, editor có syntax highlighting, run/reset và console giới hạn.
- TypeScript chỉ khi pipeline chuyển đổi trong môi trường cách ly đã được xác minh.
- Python hoặc SQL WASM là roadmap tùy chọn; không tự thêm runtime nặng hoặc quảng cáo chạy được mọi ngôn ngữ.
- Backend Java/Go/C#/PHP/Rust cần môi trường thích hợp: dùng bài hướng dẫn local hoặc link tới công cụ bên ngoài được người dùng chọn, không fake execution.
- Chỉ tải editor/runtime khi người học mở playground, có thông tin dung lượng khi lớn.
- Code người dùng chạy trong origin/context cách ly đã được đánh giá: sandbox, CSP, không có auth cookie/token/env hoặc quyền vào DOM app.
- Worker chỉ giúp tách tác vụ, không tự nó là đầy đủ sandbox bảo mật. Kiểm soát network, CPU/thời gian, memory/output, messaging và quyền origin theo khả năng thực tế.
- Có stop/reset; vòng lặp vô hạn không được treo toàn website; giới hạn kích thước code và số log.
- Không gộp untrusted scripts với quyền same-origin khiến iframe có thể thoát sandbox; không tin postMessage chỉ vì origin là null.
- Không chạy nội dung bài học/MDX do người dùng viết như mã thực thi ở server; snippet hiển thị là inert trừ khi mở playground rõ ràng.
- Kết quả chấm phía client có thể bị sửa, không dùng như chứng nhận/điểm tuyển dụng đáng tin.
- Nếu sandbox chưa đủ, hiển thị editor đọc code và bài chạy local; ghi feature PARTIAL/DEFERRED thay vì cho chạy thiếu kiểm soát.

### 34.3. Năng lực học tập

- Gắn bài học, câu hỏi và rubric với skill/topic versioned.
- Dashboard thể hiện đã thực hành/chưa chắc/cần ôn, phân biệt self-report với bài được giảng viên đánh giá.
- Review queue từ lỗi quiz và mục chưa hiểu.
- Milestone theo năng lực, không chỉ theo số phút xem video.
- Gợi ý bài tiếp theo bằng rule minh bạch, không cần AI API.
- Search nội bộ theo technology, concept, lỗi, version, level và content type; có alias tiếng Anh/Việt, không dấu khi làm được.
- Bookmark course/lesson/reference và tiếp tục học; dữ liệu bookmark riêng tư, unique theo user+target.
- Streak và mục tiêu tuần có thể bổ sung P2; không dùng thiết kế gây áp lực hoặc fake activity.

## 35. Ảnh, video và sơ đồ phải có chất lượng thực tế

### 35.1. Kiểm kê và nguyên tắc tài nguyên

- Phân biệt ảnh giao diện/brand do dự án tạo với ảnh do giảng viên upload; Cloudinary lưu media upload, MongoDB lưu metadata và quyền.
- Không tạo asset giả hoặc URL placeholder rồi báo media hoàn thành.
- Không lấy random stock image không liên quan chỉ để card có ảnh. Ưu tiên bìa có hệ thống theo technology, concept và level.
- Dùng logo công nghệ theo điều kiện sử dụng thương hiệu, không ngụ ý có chứng nhận hay tài trợ.
- Hình có code, database schema, luồng request và terminal phải chính xác, đọc được; dùng SVG/sơ đồ/code renderer xác định thay vì ảnh AI có chữ sai.
- Nếu cần ảnh brand trang trí, tạo asset riêng sau khi có yêu cầu; nó không thay thế sơ đồ kỹ thuật chính xác.

### 35.2. Bảng asset theo vị trí

| Vị trí | Yêu cầu |
|---|---|
| Hero | Minh họa sản phẩm bằng UI/canvas/SVG nhẹ hoặc ảnh riêng, không video background tự chạy |
| Course cover | Một hệ bìa nhất quán, gợi ý tỷ lệ 16:9, tên/chủ đề/level dễ đọc; bản gốc đủ nét để tạo thumbnail |
| Lesson illustration | Alt/caption có ý nghĩa, nguồn/license, kích thước cố định; không chỉ dùng ảnh để chứa đoạn văn cần đọc/index |
| Video poster | Thumbnail ổn định đúng nội dung video; tái sử dụng và lưu metadata, không tạo lại mỗi request |
| Video lesson | Screen recording code đọc được, âm thanh rõ, chương/mốc thời gian, transcript/caption do tác giả cung cấp |
| Social sharing | OG image nhất quán, gợi ý 1200×630, có fallback; không render lại vô hạn theo query input |
| Avatar | Initials hoặc avatar đã xác minh theo chính sách, không mở upload vô hạn cho mọi tài khoản |

Các kích thước là đề xuất thiết kế, không phải yêu cầu xếp hạng hay giới hạn chính thức của dịch vụ.

### 35.3. Image pipeline

- Tác giả khai báo alt/caption/nguồn, chọn focal point nếu thực sự cần.
- Giới hạn file gốc, dimensions, format theo phần nền; xử lý EXIF/metadata riêng tư phù hợp.
- Một vài rendition cố định cho card, detail và content; format/quality thích hợp theo browser và provider.
- Khai báo width/height hoặc aspect-ratio để tránh layout shift.
- Ảnh LCP quan trọng được ưu tiên theo API Next.js phiên bản đang dùng; ảnh dưới fold lazy-load. Không lazy-load hero LCP theo thói quen.
- sizes/srcset hợp lý; kiểm tra điện thoại không tải ảnh quá lớn.
- Alt mô tả nội dung; ảnh trang trí có alt rỗng, không nhồi keyword.
- Tái dùng asset và version URL; xử lý broken image có fallback.
- Một chiến lược image optimization chủ đạo, tránh cộng dồn Cloudinary transformation + Next optimizer không có lợi ích.
- OG image và cover là thông tin công khai; không nhét tên/email/điểm riêng của học viên vào URL ảnh.

### 35.4. Video pipeline và playback

- Giữ reservation/upload/finalize/quota/ownership ở phần nền.
- Video dài chia theo mục tiêu bài, không chia tùy tiện chỉ để đạt số bài.
- Mức 20 MiB/5 phút là mặc định demo có thể điều chỉnh, không hy sinh khả năng đọc code để ép bitrate.
- Kiểm thử chữ code, terminal và số liệu ở mobile, full screen và mức chất lượng đã chọn; có transcript text như nội dung học độc lập.
- Resume, speed control, keyboard, captions nếu có, chapters/timestamp và lỗi tải phải hoạt động thật.
- Upload dở, file sai, quá quota, video đang xử lý hoặc bị gỡ đều có UI rõ.
- Không autoplay và không preload video ở catalog; data saver được giữ.
- Không tự bật HLS/transcoding đa chất lượng hay AI transcription trước khi đo credit thực tế.
- Secret Cloudinary chỉ ở server; publicId hay chữ ký không thay cho policy delivery được xác minh.
- Theo dõi bytes được báo cáo và usage trước/sau bài test nhỏ; phân biệt local estimate, provider metrics có độ trễ và mức làm tròn.

### 35.5. Kế hoạch ngân sách và giới hạn tăng trưởng

- Chỉ tạo một test video nhỏ qua chính UI ứng dụng khi người dùng đã cho phép test; test upload qua Console không chứng minh integration app.
- Ví dụ giả định: 20 video × 20 MB ≈ 400 MB gốc. 100 người mỗi người tải toàn bộ một lần có thể tạo khoảng 40 GB delivery, trước ảnh, phát lại và processing. Đây là minh họa, không phải dự báo chính xác do streaming/range/cache và hành vi người dùng khác nhau.
- Bản miễn phí phục vụ demo/thử nghiệm có kiểm soát, không là kế hoạch hosting vô hạn cho mọi khóa IT.
- Mở rộng kho nội dung trước bằng text, code, hình chính xác và bài thực hành; video ưu tiên cho phần thật sự cần nhìn thao tác.
- Chỉ thay dịch vụ hoặc nâng gói khi có số đo và quyết định của chủ dự án; chưa có yêu cầu mới thì giữ Cloudinary.
- Nếu quota gần hết, bài đọc/quiz/notes vẫn hoạt động; thông báo media hạn chế một cách rõ ràng, không giả lỗi mạng.
- Public video phục vụ SEO có thể tăng bandwidth; kế hoạch SEO và ngân sách phải được xem cùng nhau.

### 35.6. Bằng chứng nghiệm thu media

Ghi trong docs/MEDIA_AUDIT.md: asset thuộc ai, license/source, dimensions/bytes/duration, Cloudinary publicId (không token nhạy cảm), MongoDB reference, route hiển thị, viewport kiểm tra, playback/caption/resume và snapshot usage trước/sau nếu đã được phép test.

Không tuyên bố signed URL tự hết hạn hoặc gói Free không hỗ trợ tất cả dạng access control khi chưa kiểm tra khả năng tài khoản và cơ chế cụ thể. Nêu đúng phần đã xác minh và phần chưa có.

## 36. Giao diện nổi bật, đỏ nhạt và nhiều animation có chủ đích

### 36.1. Art direction

- Vai trò designer: tạo cảm giác một learning studio cho developer, sáng, ấm, có chiều sâu và tinh tế.
- Hero thể hiện hành trình hiểu concept → đọc code → thực hành → nhận phản hồi → tạo dự án. Dùng UI minh họa từ tính năng thật, không dựng dashboard năng lực giả.
- Tránh catalog toàn card giống hệt, stock photo ngẫu nhiên và gradient phủ khắp trang. Tạo nhịp điệu bằng editorial section, roadmap, code panel, project showcase và list.
- Các trang public giàu nhận diện; trang học đọc thoải mái; admin/instructor ưu tiên thao tác và mật độ thông tin.
- Nội dung tiếng Việt tự nhiên, tên công nghệ chính xác; không dùng lời hứa thành chuyên gia tất cả IT sau vài tuần.

### 36.2. Design token khởi đầu

| Token | Giá trị gợi ý |
|---|---|
| Page background | #FFFAF9 |
| Surface | #FFFFFF |
| Brand soft | #FCA5A5 |
| Brand subtle | #FEE2E2 / #FFF1F2 |
| CTA / hover | #B91C1C / #991B1B |
| Text / muted | #18181B / #52525B |
| Border | #EADDDD |

- Kiểm tra contrast, không giả định mọi cặp trong bảng tự đạt accessibility.
- Font hỗ trợ tiếng Việt, hierarchy display/heading/body/caption, code font dễ phân biệt ký tự.
- Spacing, radius, elevation và container dùng token tập trung.
- Giữ light theme là mặc định; dark theme tùy chọn P2, không trì hoãn chất lượng light theme.
- Màu destructive có label/icon/context, không chỉ dựa vào đỏ để phân biệt vì đỏ cũng là brand.

### 36.3. Màn hình cần thiết kế thực tế

- Header có navigation theo mảng IT, search, learning paths, account; mega menu chỉ khi nội dung đủ, mobile có drawer gọn.
- Home: hero, chọn mục tiêu, technology hubs có nội dung thật, lộ trình nổi bật, project showcase, điểm khác biệt và footer đầy đủ.
- Technology hub: prerequisites, version, khóa/bài/project liên quan và đường đi tiếp; không chỉ một tag list.
- Catalog/filter: technology, domain, level, version và content type, có pagination và trạng thái filter rõ.
- Course detail: outcome, curriculum, prerequisites, version/environment, giảng viên/reviewer, bài preview và CTA.
- Tutorial/reference: mục lục, heading anchor, code copy, callout, sơ đồ và bài tiếp theo; nội dung chính đọc được không cần animation.
- Learning workspace: nội dung/video trung tâm, sidebar, notes/quiz/QA có panel rõ; focus mode và mobile navigation.
- Project/rubric: progress checklist, starter links, self-assessment, submission và feedback.
- Dashboard: tiếp tục học, skill cần ôn, review queue, mục tiêu và milestone. Số liệu thật có nhãn; không seed fake chart như data thật.
- Instructor: curriculum editor, lesson preview, metadata SEO, media library/quota, nội dung cần cập nhật version và bài nộp cần review.
- Admin: approval, taxonomy/content coverage, SEO checklist, media/quota, reports và audit.

### 36.4. Motion system

- Hero reveal theo thứ tự, layer minh họa vào có chiều sâu; trang trí động nhẹ và dừng khi ngoài viewport.
- Scroll reveal section một lần khi thích hợp, stagger ngắn giữa card có giới hạn; không trì hoãn hàng chục phần tử.
- Hover card nâng nhẹ, thumbnail zoom tinh tế, button có trạng thái nhấn, tab indicator trượt và input focus rõ.
- Accordion, drawer, dialog, dropdown và toast có enter/exit mượt; focus không bị mất.
- Progress animate giữa giá trị đã xác nhận, completion có phản hồi ngắn, notes có saving/saved/error.
- Chuyển tab/route nhẹ khi framework cho phép; không giữ màn hình loading chỉ để animation kết thúc.
- Gợi ý timing: 120–200 ms micro, 180–300 ms overlay, 350–600 ms section; tùy chỉnh theo cảm giác.
- CSS cho tương tác đơn giản, thư viện motion hiện có cho choreography phức tạp; không thêm nhiều thư viện cùng giải một việc.
- Ưu tiên transform/opacity, giảm layout thrashing, không animation ảnh/video cloud theo từng frame.
- Tôn trọng prefers-reduced-motion, pause khi tab ẩn, không scroll hijacking hoặc parallax mạnh trong trang học.
- Nội dung SEO/CTA không ở opacity:0 vĩnh viễn nếu JS/animation lỗi.
- Không biến toàn trang thành client component và không hy sinh server-rendered content chỉ để có motion.

### 36.5. Nghiệm thu thị giác

- Review ít nhất 375 px, 768 px, 1440 px; nội dung tiếng Việt dài không phá layout.
- Có screenshot hoặc ghi nhận quan sát trực tiếp của home, catalog, course, learning workspace và admin.
- Kiểm tra keyboard, focus, touch, reduced motion, zoom và contrast.
- Loading/empty/error/offline/forbidden/not-found/upload-failed đều có thiết kế nhất quán.
- Không báo đẹp chỉ vì đã dùng Tailwind/shadcn; đánh giá typography, spacing, composition, consistency, motion và khả năng đọc code.
- Bản có animation phải được đo performance trên thiết bị/throttle đại diện; không lấy video demo quay mượt trên máy mạnh làm bằng chứng mọi thiết bị đều mượt.

## 37. SEO: triển khai thế nào và đo bằng gì?

### 37.1. Mục tiêu và nguyên tắc

- Giúp công cụ tìm kiếm tìm, render, hiểu và index đúng các trang công khai hữu ích; giúp người học chọn đúng nội dung.
- Không cam kết top 1, không hứa mốc thời gian cố định để lên top, không coi điểm Lighthouse là thứ hạng tìm kiếm.
- Mục tiêu ban đầu: website crawlable, nội dung chất lượng có canonical đúng, không rò dữ liệu riêng, có theo dõi query/landing pages và cải thiện theo số liệu.
- Tách technical SEO, on-page/content, authority/distribution và measurement; không chỉ thêm meta tags rồi báo SEO hoàn thành.

### 37.2. Kiến trúc URL và nội dung công khai

Đề xuất URL để thảo luận và đối chiếu repo, không ép đổi URL đang có mà không có redirect plan:

```text
/                         Trang chủ
/khoa-hoc                 Catalog
/khoa-hoc/[slug]          Overview khóa học công khai
/chu-de/[slug]            Hub frontend, backend, database...
/cong-nghe/[slug]         Hub TypeScript, React, MongoDB...
/lo-trinh/[slug]          Lộ trình theo mục tiêu
/huong-dan/[slug]         Tutorial dài có code, môi trường, bài tập
/tham-khao/[slug]         Reference/cheatsheet có giá trị độc lập
/du-an/[slug]             Đề bài/dự án mẫu được chọn công khai
/xem/[slug]               Trang xem một video công khai nếu phù hợp
/giang-vien/[slug]        Hồ sơ tác giả/giảng viên thật được công khai
/hoc/[course]/[lesson]    Workspace học, chính sách truy cập riêng
/tai-khoan/...            Riêng tư
/giang-day/...            Riêng tư
/quan-tri/...             Riêng tư
```

- URL gọn, ổn định và slug unique trong phạm vi phù hợp; đổi slug có permanent redirect tới bản mới.
- Navigation, breadcrumb và liên kết nội bộ là link HTML crawlable, không chỉ onClick.
- Quan hệ hub → bài → prerequisite → dự án giúp người học di chuyển và giúp discovery.
- Trang private không được đưa vào sitemap hay SEO landing pages.
- Có ma trận visibility: public overview, public preview/tutorial, enrolled lesson, draft, personal note/submission.
- Có thể mở public bài đọc chọn lọc để xây kho kiến thức, nhưng phải là quyết định xuất bản rõ ràng. Không tự mở khóa toàn bộ bài đang yêu cầu enrollment chỉ để SEO.
- Nội dung riêng không được nằm sẵn trong HTML/RSC payload rồi chỉ ẩn bằng CSS.
- Trang riêng bảo vệ bằng authentication/authorization; robots/noindex không phải kiểm soát truy cập.

### 37.3. Rendering và metadata trong Next.js

- Nội dung công khai quan trọng có HTML server-rendered/prerendered phù hợp; crawler và người dùng thấy cùng nội dung có quyền truy cập.
- Chọn static/revalidation/server rendering theo mức cập nhật và tài liệu Next.js đã cài; không SSR mọi trang vô cớ và không để stale draft bị cache public.
- Dùng Metadata API/generateMetadata và metadataBase đúng origin production; kiểm tra metadata trong response thực tế khi có streaming/bot handling.
- Title riêng theo trang, description chính xác, H1 và H2/H3 có cấu trúc hợp lý, breadcrumb và nội dung chính rõ.
- Canonical tuyệt đối trỏ đúng URL chuẩn của chính nội dung; không canonical tất cả course/tutorial về trang chủ.
- Open Graph/social image, favicon, brand title template và fallback được cấu hình thống nhất.
- Slug không tồn tại trả 404 phù hợp, không soft-404 với trang rỗng status 200. Không redirect mọi URL lỗi về home.
- Redirect 301/308 cho URL đổi có tương đương, tránh chuỗi redirect nhiều tầng.
- Search/filter kết hợp vô hạn không được tự sinh hàng nghìn trang indexable. Chọn một số landing page có nội dung riêng; phần còn lại có policy canonical/noindex phù hợp, không ép canonical hai trang có nội dung khác nhau đáng kể.
- Pagination có URL/link thật, dữ liệu mỗi trang đúng; không canonical mọi trang paginated về page 1 theo thói quen.
- Preview/staging không xuất hiện như bản sao production; dùng auth/noindex tùy môi trường, không nhầm với chặn production.
- Không thêm meta keywords hoặc keyword stuffing như giải pháp tăng hạng.

### 37.4. Sitemap và robots

- Sinh sitemap động hoặc build-time từ dữ liệu published/indexable thật; chỉ URL chuẩn, status phù hợp, không private/draft/noindex.
- lastmod phản ánh thay đổi đáng kể thực tế, không đổi mọi URL sang hôm nay mỗi request/build.
- Khi lớn, chia sitemap theo nhóm nội dung và giới hạn giao thức; không giả định một file chứa vô hạn URL.
- robots.txt khai báo sitemap và policy crawling có chủ đích; kiểm tra assets cần render không bị chặn nhầm.
- noindex dùng meta hoặc response header phù hợp; Google phải crawl được trang mới đọc thấy chỉ thị. Không đồng thời disallow rồi coi noindex chắc chắn đã có tác dụng.
- Authentication, 401/403 và quyền server bảo vệ tài nguyên riêng; đừng dựa vào robots.txt để giữ bí mật.
- robots/sitemap không có nghĩa website tự được index hoặc xếp hạng cao.

### 37.5. Structured data đúng loại và đúng dữ liệu

- Chọn Organization, BreadcrumbList, Article, Course/ItemList, VideoObject theo loại trang thật và điều kiện hỗ trợ hiện hành.
- JSON-LD phản ánh nội dung hiển thị; không tạo rating, author, credential, offer, giá hoặc ngày giả.
- Không tự bật FAQ rich result cho mọi trang hoặc schema không được hỗ trợ chỉ vì thấy snippet trên website khác.
- Course list và Course info không được coi là một tính năng. Kiểm tra tài liệu Google hiện hành trước khi triển khai.
- Tại lần kiểm tra 24/11/2026, tài liệu Course list nói rich result này khả dụng bằng tiếng Anh. Website tiếng Việt có thể mô tả Course theo schema hợp lệ, nhưng không được hứa sẽ có course-list rich result cho tiếng Việt.
- Không xuất bản bản dịch tiếng Anh giả/chất lượng thấp chỉ để đủ điều kiện rich result.
- Không giả định gắn AggregateRating vào course sẽ tự có sao đánh giá; chỉ dùng khi đúng loại, policy và dữ liệu thật.
- Serialize JSON-LD an toàn với input người dùng, tránh chèn script.
- Kiểm tra Rich Results Test cho loại được hỗ trợ, và schema validation tương ứng. Tách valid schema, eligible và thực tế xuất hiện trên Search.

### 37.6. Video SEO và khả năng tìm ảnh

- Chọn một số video public phù hợp; nếu muốn video-search features, xem xét watch page riêng mà video là nội dung chính.
- Tutorial có một video bổ trợ vẫn có thể là trang text hữu ích; không gắn nhãn mọi tutorial là watch page.
- Watch page có title/mô tả riêng, thumbnail ổn định, player hiển thị nổi bật và thông tin có thật.
- VideoObject khai báo các trường cần thiết theo tài liệu hiện hành như name, thumbnailUrl, uploadDate và contentUrl/embedUrl khi phù hợp; chỉ khai báo URL người xem/crawler thực sự có quyền truy cập, không lộ link bài riêng.
- Timestamp/chapters có thể hỗ trợ điều hướng; Clip/SeekToAction chỉ triển khai khi hành vi seek và điều kiện đều đúng.
- Không để video public mà crawler chỉ có thể tìm thấy sau thao tác phức tạp trong modal. Thiết kế player markup có thể khám phá nhưng vẫn kiểm soát preload; kiểm tra thực tế thay vì giả định.
- Không lách access control/cung cấp nội dung khác cho Googlebot để che private content. Nếu cần paywall/login indexing, nghiên cứu policy riêng; không tự mở hoặc cloaking.
- Ảnh nội dung dùng phần tử ảnh crawlable, alt phù hợp, ngữ cảnh và tên file hữu ích; không chỉ CSS background cho hình cần được hiểu như nội dung.
- Public media serving phục vụ SEO cũng phải tính vào ngân sách Cloudinary.

### 37.7. Core Web Vitals và animation

Mục tiêu trải nghiệm tốt, theo ngưỡng hiện hành khi kiểm tra: LCP <= 2,5 giây, INP <= 200 ms, CLS <= 0,1 tại phân vị 75 của dữ liệu người dùng thực, xem riêng mobile/desktop khi có đủ dữ liệu.

- Đây là mục tiêu kỹ thuật, không cam kết mọi mạng/thiết bị đều đạt và không bảo đảm top Search.
- Giảm JavaScript không cần thiết, lazy-load editor/player/runtime nặng, giữ public content phía server.
- Hạn chế font weights, ưu tiên ảnh hero đúng kích thước, reserve layout ảnh/video.
- Đo chi phí animation, đặc biệt scroll handler và motion của nhiều phần tử; không đặt animation dài vào đường phản hồi thao tác.
- Phân trang nội dung lớn, projection/index DB phù hợp, cache public có invalidation; không cache private chéo user.
- Lighthouse/PageSpeed là công cụ chẩn đoán trong điều kiện đo, không thay dữ liệu field. Site mới chưa đủ CrUX phải báo không đủ dữ liệu, không bịa điểm field.
- Ghi viewport, thiết bị/throttle, route, ngày và phương pháp trong performance report. Không chạy load test lên Free tier chỉ để có số liệu.

### 37.8. Search Console và đo lường

- Chuẩn bị hướng dẫn xác minh domain/URL-prefix, submit sitemap, kiểm tra URL và đọc báo cáo index/performance/Core Web Vitals.
- Không tự thay DNS hoặc xin quyền tài khoản ngoài phạm vi. Chuẩn bị giá trị/step để chủ domain thực hiện nếu cần.
- Theo dõi impressions, clicks, CTR, query, landing page, country/device và conversion học tập theo định nghĩa rõ.
- Không dùng average position như thứ hạng cố định cho mọi người; xem theo query/page và khoảng thời gian.
- Theo dõi enrollment từ organic search bằng analytics tôn trọng riêng tư nếu được cấu hình; không đưa email/note vào analytics.
- Xem indexed/excluded, canonical Google chọn, mobile rendering và video indexing nếu có; xử lý nguyên nhân theo nhóm.
- Không request index hàng loạt vô ích hoặc dùng Indexing API cho loại nội dung không đủ điều kiện.
- Không mua backlink, spam forum, tạo doorway pages hoặc dùng AI xuất bản hàng nghìn trang ít giá trị để thao túng ranking.

### 37.9. Tiêu chí hoàn thành SEO kỹ thuật

- Ít nhất một URL thật của home, course, hub, tutorial/reference và video public nếu có được kiểm tra response/rendered output.
- Metadata, canonical, status code, internal links, sitemap membership và robots policy đúng từng loại.
- Ảnh/video crawlability, schema validity và private content exposure được kiểm tra.
- Có báo cáo lab thực tế và field nếu đủ dữ liệu, ghi phần chưa đo.
- Có kế hoạch Search Console; chỉ đánh dấu setup verified khi chủ tài khoản đã xác minh và có bằng chứng.
- Không báo SEO hoàn thành theo nghĩa bảo đảm traffic/ranking. Đóng technical checklist và tiếp tục content/measurement backlog.

## 38. Chiến lược nội dung và phát triển SEO theo cụm

### 38.1. Bản đồ search intent

- Beginner: học gì trước, cài môi trường thế nào, khái niệm là gì.
- How-to: giải quyết một tác vụ cụ thể bằng phiên bản công nghệ đã chỉ rõ.
- Troubleshooting: lỗi cụ thể, cách tái hiện/chẩn đoán và kết quả sau sửa.
- Comparison: chọn công nghệ theo nhu cầu, ràng buộc và tradeoff.
- Practice/project: bài tập, starter, rubric, test và demo có thể kiểm tra.
- Reference: tra cứu nhanh cú pháp/API phổ biến có nguồn và version.

Mỗi trang có intent chính, đối tượng, outcome và lý do tồn tại. Không viết nhiều bài gần giống chỉ để đổi vài từ khóa.

### 38.2. Cụm nội dung mẫu: Next.js + MongoDB

Ví dụ định hướng cần biên tập/kiểm chứng, không khẳng định search volume hay độ khó:

| Loại | Đề tài mẫu |
|---|---|
| Hub | Lộ trình xây ứng dụng web với Next.js và MongoDB |
| Foundation | Request đi qua frontend, backend và database như thế nào? |
| Environment | Cấu hình Node.js, package manager, biến môi trường và phiên bản tương thích |
| How-to | Kết nối Atlas từ Next.js phía server, quản lý connection và quyền |
| Security | Google login, JWT session, role/ownership và chặn dữ liệu riêng |
| Data modeling | Course/chapter/lesson/enrollment, index và tránh document phình lớn |
| Troubleshooting | Phân biệt lỗi DNS, network allowlist, auth và TLS khi kết nối Atlas |
| Media | Upload Cloudinary có reservation/finalize và tính ngân sách |
| Testing | Kiểm thử enrollment, quiz scoring và quyền truy cập chéo |
| Project | Mini LMS có repo hướng dẫn, rubric và checklist nghiệm thu |

- Các bài dẫn link hub, prerequisite, bài liên quan và project; không tạo orphan page.
- Có author/reviewer thật, sources, testedVersion và feedback loop. Không tạo hồ sơ chuyên gia giả.
- Nội dung có code được chạy, screenshot xác thực khi cần và phân tích lỗi thực tế để có giá trị riêng.
- Không sao chép docs hoặc diễn đạt lại hàng loạt mà không thêm cách giải thích, ví dụ và kiểm chứng.

### 38.3. Đợt xuất bản và theo dõi

- Đợt 1: nền tảng site/crawlability và vài trang tốt nhất, hoàn thiện một tuyến học xuyên suốt.
- Đợt 2: mở rộng 12–20 bài đã review theo cụm; số lượng và thời gian tùy năng lực biên tập, không phải yêu cầu đổ nội dung trong một lượt.
- Đợt 3: cập nhật dựa trên lỗi người học, Search Console và completion/drop-off nếu đo được.
- Đợt 4: thêm ecosystem tiếp theo với reviewer và environment recipes riêng.
- Mốc 30/60/90 ngày là lịch rà soát công việc và số liệu, không cam kết thứ hạng đạt ở mỗi mốc.
- Chia sẻ dự án/bài hữu ích tới cộng đồng phù hợp theo lựa chọn của chủ dự án; không tự gửi bài, đăng forum hoặc tạo tài khoản bên ngoài.
- Giữ chất lượng nội dung cũ: lịch review theo biến động công nghệ, deprecated warning và migration guide khi cần.

## 39. Mô hình dữ liệu và CMS mở rộng

Giữ các entity của phần nền. Bổ sung theo nhu cầu thực tế, không tạo collection trống chỉ để khớp danh sách:

| Entity gợi ý | Mục đích |
|---|---|
| domains/topics/technologies | Phân loại kiến thức và loại công nghệ |
| technologyVersions | Version, status, tested range và review metadata |
| conceptLinks/prerequisites | Quan hệ kiến thức, tránh vòng lặp |
| articles/references | Nội dung công khai có version/SEO/author/reviewer |
| environmentRecipes | Setup/verify/run/test theo OS/toolchain |
| codeExamples/exercises | Snippets, expected output, hints và version |
| contentReviews/changeReports | Quy trình review và báo lỗi nội dung |
| bookmarks | Lưu nội dung cá nhân |
| media metadata mở rộng | Alt/caption, license/source, poster, transcript, dimensions |
| SEO metadata/redirects | Title/description/canonical policy, slug history và trạng thái index |
| contentCoverage snapshots | Tổng hợp độ phủ thực tế, không nhân bản toàn nội dung |

- Course có thể liên kết nhiều technology với version; lesson/exercise bổ sung mapping khi khác phạm vi course.
- Tránh mảng technology/version/document không giới hạn. Index theo các query đã chọn, tính vào quota.
- Metadata SEO nằm cùng content khi đơn giản; không tách thành service riêng vô cớ.
- Cross-link dùng ID/canonical route resolver, không hardcode domain dev vào content.
- Rich text/Markdown cho người viết phải render an toàn; remote MDX không được compile/execute tùy ý phía server.
- CMS có preview, revision giới hạn, diff khi cần, reviewer, checklist media/SEO và trạng thái published rõ.
- Duyệt nội dung khác duyệt media: media ready không tự xuất bản bài, bài published không được tham chiếu asset chưa xác minh.
- Migration có dry-run, backup plan và rollback phù hợp; không reset dữ liệu thật để đổi taxonomy.
- Tối ưu search nội bộ ban đầu bằng query/index/alias có giới hạn. Không bắt buộc thêm Elasticsearch/vector DB cho một kho nhỏ.
- Khi nội dung tăng gần quota, cung cấp số đo data/index và phương án quyết định; không âm thầm xóa bài/học viên hoặc chuyển dịch vụ.

## 40. Inventory toàn bộ nhóm tính năng để Claude đối chiếu

Mỗi dòng dưới đây phải được tách thành task/acceptance criteria khi triển khai. Cột hiện trạng mặc định là CHƯA XÁC MINH vì tài liệu không phải repo chạy thật. Mã nhóm giúp truy vết, không thay thế ma trận permission/test chi tiết.

| ID | Nhóm tính năng | Mốc | Hiện trạng từ tài liệu |
|---|---|---|---|
| A01 | Đăng ký email, validation, unique email, password hashing | P0 | Chưa xác minh |
| A02 | Xác minh email, resend cooldown và token một lần | P0 | Chưa xác minh |
| A03 | Login/logout/JWT cookie và session expiry | P0 | Chưa xác minh |
| A04 | Reset/change password và thu hồi phiên | P0 | Chưa xác minh |
| A05 | Google login, email verification và account linking an toàn | P0 | Chưa xác minh |
| A06 | Role, ownership, enrollment checks và blocked user | P0 | Chưa xác minh |
| A07 | Profile/timezone/Google account settings | P1 | Chưa xác minh |
| A08 | Instructor application/approval, admin bootstrap | P1 | Chưa xác minh |
| A09 | Rate limit, CSRF/origin, input validation và secrets hygiene | P0 | Chưa xác minh |
| C01 | Catalog/search/filter/sort/pagination | P1 | Chưa xác minh |
| C02 | Course overview/outcomes/prerequisites/instructor | P1 | Chưa xác minh |
| C03 | Course/chapter/lesson CRUD và reorder | P1 | Chưa xác minh |
| C04 | Draft/preview/review/reject/publish/revision | P0 | Chưa xác minh |
| C05 | Archived/suspended và quyền học viên cũ | P1 | Chưa xác minh |
| C06 | Enrollment idempotency và khóa học của tôi | P0 | Chưa xác minh |
| L01 | Reading/video workspace, sidebar, trước/sau, focus mode | P1 | Chưa xác minh |
| L02 | Resume, autosave có throttle và concurrency | P1 | Chưa xác minh |
| L03 | Completion/progress/curriculum version | P1 | Chưa xác minh |
| L04 | Quiz server-side scoring, đáp án riêng và attempt version | P0 | Chưa xác minh |
| L05 | Kiểm tra đầu vào và gợi ý theo rule | P1 | Chưa xác minh |
| L06 | Notes riêng, timestamp, search và seek | P1 | Chưa xác minh |
| L07 | Ôn tập câu sai, schedule, double-submit safety | P1 | Chưa xác minh |
| L08 | Understanding/self-report tách completion | P1 | Chưa xác minh |
| L09 | Learning paths, prerequisites, milestones, progress | P1 | Chưa xác minh |
| L10 | Bookmark và nội dung đã lưu | P1 | Chưa xác minh |
| L11 | Export notes Markdown | P2 | Chưa xác minh |
| L12 | Mục tiêu tuần/streak không gây áp lực | P2 | Chưa xác minh |
| P01 | Project assignment, starter, checklist, rubric | P1 | Chưa xác minh |
| P02 | Submission, self-assessment, resubmit và feedback | P1 | Chưa xác minh |
| P03 | Achievement/portfolio opt-in và privacy | P1 | Chưa xác minh |
| P04 | Đọc code/tìm lỗi/hints/solution có version | P1 | Chưa xác minh |
| P05 | Browser playground HTML/CSS/JS cách ly | P2 | Chưa xác minh |
| P06 | Python/SQL browser runtime tùy chọn, giới hạn tải/thực thi | P2/roadmap | Chưa xác minh |
| D01 | Hỏi đáp theo lesson, answer và accepted answer | P1 | Chưa xác minh |
| D02 | Review có eligibility/unique và aggregate đúng | P1 | Chưa xác minh |
| D03 | Report/moderation cho Q&A/review/content | P1 | Chưa xác minh |
| M01 | Upload reservation, signed authorization, quota concurrency | P0 | Chưa xác minh |
| M02 | Finalize/webhook validation và idempotency | P0 | Chưa xác minh |
| M03 | Image cover/content/alt/license và rendition giới hạn | P1 | Chưa xác minh |
| M04 | Video player, poster, speed/resume/caption/chapters | P1 | Chưa xác minh |
| M05 | Delivery/access policy đã xác minh theo tài khoản | P0 | Chưa xác minh |
| M06 | Data saver, preload/autoplay policy, media failure UI | P1 | Chưa xác minh |
| M07 | Usage dashboard/freshness/alerts/kill switches đúng phạm vi | P0 | Chưa xác minh |
| M08 | Orphan/reference tracking, cleanup dry-run, delete retry | P1 | Chưa xác minh |
| M09 | Test nhỏ qua app có bằng chứng, không chỉ Console/API usage | P0 | Chưa xác minh |
| T01 | Domain/topic/technology/type/version taxonomy | P1 | Chưa xác minh |
| T02 | Technology hub và course/reference/project mapping | P1 | Chưa xác minh |
| T03 | Prerequisite/concept graph và alias tìm kiếm | P1 | Chưa xác minh |
| T04 | Environment recipes theo OS/toolchain | P1 | Chưa xác minh |
| T05 | Article/reference/cheatsheet/troubleshooting templates | P1 | Chưa xác minh |
| T06 | Author/reviewer/testedVersion/content review/report lỗi | P1 | Chưa xác minh |
| T07 | Code example copy/highlight/output và smoke checks | P1 | Chưa xác minh |
| T08 | Content coverage map: published/reviewed/planned | P1 | Chưa xác minh |
| T09 | Bản đồ nhiều mảng IT, không public placeholder hàng loạt | P1 | Chưa xác minh |
| U01 | Design tokens đỏ nhạt, font/spacing/components | P1 | Chưa xác minh |
| U02 | Home/hero/navigation/footer có art direction | P1 | Chưa xác minh |
| U03 | Catalog/course/technology/tutorial/project layouts | P1 | Chưa xác minh |
| U04 | Learning/dashboard/instructor/admin layouts | P1 | Chưa xác minh |
| U05 | Motion system/micro-interaction và reduced motion | P1 | Chưa xác minh |
| U06 | Mobile/tablet/desktop, keyboard/focus/contrast/states | P1 | Chưa xác minh |
| U07 | Dark theme tùy chọn | P2 | Chưa xác minh |
| S01 | Public rendering, status và indexability matrix | P0/P1 | Chưa xác minh |
| S02 | Metadata/title/description/OG/canonical | P1 | Chưa xác minh |
| S03 | Sitemap/robots/noindex/filter/pagination policy | P1 | Chưa xác minh |
| S04 | Structured data đúng loại, điều kiện, dữ liệu và ngôn ngữ | P1 | Chưa xác minh |
| S05 | Public video/watch page và image SEO khi có asset thật | P1/P2 | Chưa xác minh |
| S06 | Internal links/breadcrumb/hubs/slug redirects | P1 | Chưa xác minh |
| S07 | Core Web Vitals/lab report/field khi đủ dữ liệu | P1 | Chưa xác minh |
| S08 | Search Console setup theo quyền chủ domain | P1 | Chưa xác minh |
| S09 | Content clusters, authorship, review/update workflow | P1/liên tục | Chưa xác minh |
| S10 | Organic measurement và cải thiện, không hứa top | Liên tục | Chưa xác minh |
| O01 | MongoDB schemas/indexes/connections/migrations/seed | P0 | Chưa xác minh |
| O02 | SMTP gửi thật so với mail dev adapter | P0 | Chưa xác minh |
| O03 | Admin taxonomy/users/approval/quota/audit | P1 | Chưa xác minh |
| O04 | Private DTO/cache isolation/log redaction/retention | P0 | Chưa xác minh |
| O05 | Unit/integration/E2E trọng yếu và CI/build | P0/P1 | Chưa xác minh |
| O06 | Docs/env setup/progress/checkpoint/runbooks | P0/P1 | Chưa xác minh |
| O07 | Dev/prod separation, backup/restore plan và deploy config | P1 | Chưa xác minh |
| O08 | Deploy thật/public launch khi người dùng yêu cầu | Theo yêu cầu | Chưa xác minh |

P0 là chặn an toàn/tính đúng/khả năng chạy, P1 là phạm vi sản phẩm chính, P2 là mở rộng sau nền tảng. P2 không tự biến thành đã hoàn thành hay tự biến mất khỏi backlog. P06 là lựa chọn roadmap, không phải lý do thêm dịch vụ trả phí hoặc runtime nặng trong bản đầu.

## 41. Kế hoạch nâng cấp V2 và tiêu chí bàn giao

### 41.1. Triển khai dựa trên chênh lệch

- Giai đoạn A: audit repo, kiểm tra env hiện diện không tiết lộ giá trị, xác định luồng lỗi và lập feature/media/UI/SEO/content reports.
- Giai đoạn B: sửa P0 — auth/role/Atlas/indexes/SMTP, scoring/private DTO, media upload/finalize và quota; giữ công việc đã có.
- Giai đoạn C: design system và một lát cắt home → hub/catalog → course → learning workspace hoàn chỉnh, với nội dung mẫu có review.
- Giai đoạn D: taxonomy/version/environment recipes, bài tutorial/reference và nội dung cụm đầu; notes/quiz/review/path/project đồng bộ.
- Giai đoạn E: SEO/rendering/canonical/sitemap/schema, public media, performance và accessibility; làm song song đúng phụ thuộc, không đợi cuối mới nghĩ URL/metadata.
- Giai đoạn F: instructor/admin workflow, moderation, content maintenance, media cleanup và tài liệu.
- Giai đoạn G: P2 browser playground cách ly và theme/gamification nếu được ưu tiên; chỉ thêm sau đánh giá phạm vi và ngân sách.
- Giai đoạn H: chuẩn bị release, hướng dẫn Search Console/hosting; chỉ deploy và thay tài khoản bên ngoài khi đã có yêu cầu tương ứng.

Không ước lượng thời gian cố định khi chưa audit. Nếu repo đã có feature tốt, giữ và kiểm chứng; không viết lại chỉ vì muốn cấu trúc thư mục khác.

### 41.2. Bộ nội dung đầu tiên và kiểm tra độ sâu

- Một tuyến học hoàn chỉnh từ prerequisite tới capstone, không phải hàng chục tiêu đề chưa có bài.
- Mỗi lesson được xuất bản có outcome, ví dụ/code, expected output, lỗi phổ biến, thực hành và link nguồn phù hợp.
- Một course có đọc/video/quiz/notes/project theo thiết kế, không bắt mọi lesson đều có video.
- Mỗi code sample trọng yếu có bằng chứng chạy ở môi trường/phiên bản đã ghi.
- Tất cả public copy, author/review/rating và số liệu thật phân biệt demo rõ ràng.
- Danh mục toàn IT được tổ chức ở CMS và roadmap, còn public catalog chỉ chứa nội dung đủ chất lượng.

### 41.3. Bàn giao có bằng chứng

1. FEATURE_AUDIT cập nhật mỗi ID có trạng thái và evidence, không copy toàn bộ sang VERIFIED.
2. Một bảng kết quả E2E thật hoặc lý do blocked theo từng integration.
3. MEDIA_AUDIT xác nhận ảnh/video thật, quality, upload/playback và usage; chỉ hiển thị metadata không nhạy cảm.
4. CONTENT_COVERAGE phân biệt độ phủ taxonomy với độ phủ kiến thức đã review.
5. UI screenshots/observations của viewport đại diện, reduced motion và trạng thái lỗi.
6. SEO audit theo các URL thật; canonical, sitemap, schema và response kiểm tra thực tế; Search Console chỉ done khi xác minh được.
7. Performance report với phương pháp, route, thiết bị/throttle, lab/field rõ ràng.
8. Các lệnh lint/typecheck/tests/build và kết quả thật, không bịa check không chạy.
9. Remaining work chia P0/P1/P2, blocker ngoài và quyết định cần chủ dự án.
10. Hướng dẫn người không rành terminal: bước UI/cấu hình nào tự làm được, phần nào Claude có thể thực hiện trong repo; tuyệt đối không yêu cầu gửi secret lên chat.

### 41.4. Điều kiện chưa được báo hoàn thành

- Chỉ có landing page đẹp nhưng không lưu dữ liệu thật.
- Chỉ có CRUD LMS nhưng thiếu nội dung, taxonomy/version và các điểm khác biệt đã cam kết.
- Chỉ gọi usage Cloudinary nhưng chưa thử upload/finalize/playback.
- Chỉ có Google button nhưng chưa đi qua callback/session.
- Chỉ có `.data/mail` nhưng báo đã gửi SMTP thật.
- Chỉ thêm meta tags/schema nhưng chưa kiểm tra render/indexability hoặc public URLs.
- Chỉ dùng animation đẹp trên desktop nhưng mobile/keyboard/reduced motion bị hỏng.
- Chỉ seed title mọi ngôn ngữ rồi nói đã có chuyên sâu toàn IT.
- Chỉ pass unit test mock rồi báo provider, deploy hoặc SEO ranking đã thành công.

## 42. Nguồn kiểm chứng, giả định và cách dùng bản V2

Nguồn chính thức đã đối chiếu khi biên soạn ngày 24/11/2026; phải kiểm tra lại khi triển khai nếu tài liệu/provider thay đổi:

- SEO fundamentals: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Nội dung hữu ích và tác giả: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Spam/scaled content: https://developers.google.com/search/docs/essentials/spam-policies
- Canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- noindex và robots: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Course list, điều kiện ngôn ngữ: https://developers.google.com/search/docs/appearance/structured-data/course
- Video SEO: https://developers.google.com/search/docs/appearance/video
- VideoObject: https://developers.google.com/search/docs/appearance/structured-data/video
- Image SEO: https://developers.google.com/search/docs/appearance/google-images
- Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
- Field/lab measurement: https://web.dev/articles/vitals
- Next.js metadata/OG: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
- Cloudinary credits/quota: https://cloudinary.com/documentation/billing_and_plans
- Các nguồn authentication/Atlas/Cloudinary nền ở phần 1–30 vẫn áp dụng.

Định nghĩa phạm vi tài liệu:

- Đây là bản đặc tả hợp nhất và checklist audit dựa trên prompt đính kèm; chưa có source code hoặc URL chạy thật được cung cấp trong lượt tạo tài liệu này.
- Những thông tin user đã chuyển tiếp như provider hoạt động, secret đã đổi, seed/indexes đã chạy phải được Claude đang có repo xác minh lại, không coi là kết quả audit độc lập của tài liệu.
- Đề xuất chương trình học, thiết kế và lịch biên tập là đề xuất sản phẩm, không phải bằng chứng đã tồn tại hoặc dự báo thứ hạng/traffic.
- Không chia sẻ hoặc ghi credentials vào tài liệu này.

Prompt khởi động ngắn dành cho Claude Code:

```text
Đọc toàn bộ @PROMPT_CLAUDE_EDU_IT_V2.md và kiểm tra repository hiện tại.
Đây là đặc tả hợp nhất, không phải xác nhận tất cả tính năng đã xong.

Trước tiên lập FEATURE_AUDIT, MEDIA_AUDIT, UI_AUDIT, SEO_AUDIT và
CONTENT_COVERAGE với bằng chứng, trạng thái và task còn thiếu.
Giữ implementation tốt đang có và sửa các mục P0 trước.

Tiếp tục hoàn thiện trong phạm vi đã được cho phép, theo kế hoạch V2:
nền tảng học lập trình chuyên sâu, hệ kiến thức IT có phiên bản,
ảnh/video thật theo quota, UI đỏ nhạt có animation và SEO đo được.

Không fake dữ liệu, không hứa top Google, không in secret,
không tự nâng gói và không tự deploy công khai.
```
