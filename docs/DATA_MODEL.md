# Mô hình dữ liệu MongoDB

> Trạng thái: **thiết kế Phase 0**. Index được tạo bằng `pnpm db:indexes` (idempotent). Mọi document có `_id: ObjectId`, `createdAt`, `updatedAt` (UTC `Date`) trừ khi ghi khác; collection lõi có `schemaVersion: number` (mặc định 1) để migration gọn.
>
> Ký hiệu: **R** = bắt buộc; **🔒** = dữ liệu nhạy cảm (không trả về client ngoài chủ sở hữu, không log); **TTL** = TTL index (logic vẫn tự kiểm tra hạn).

## 0. Nguyên tắc chung

1. Không embed mảng tăng không giới hạn vào `users`/`courses`. Mảng nhúng đều có **giới hạn cứng** ghi ở cột Validation.
2. Unique index cho các bất biến 1-1 (mục 19.3 đặc tả) — đánh dấu `U`.
3. Index theo truy vấn thực tế; tổng index được tính vào ngân sách 300 MiB.
4. Không nhận filter/sort/projection thô từ client; `sort` chỉ nhận enum (`newest`, `rating`), `ObjectId` parse bằng `lib/ids.ts`.
5. Projection/DTO loại `passwordHash`, `tokenHash`, `correctOptionId`, `explanation` (trước khi nộp), ghi chú, email người khác.
6. Thời gian là `Date` UTC. **Vị trí video là số giây** (`number`, hữu hạn, ≥ 0), không dùng `Date`.
7. Byte lưu dạng số nguyên byte chính xác; hiển thị phân biệt MiB/GiB với MB/GB.

## 1. Danh sách collection

| Nhóm | Collection | Ghi chú gộp/tách |
|---|---|---|
| Tài khoản | `users`, `authAccounts`, `authTokens`, `instructorApplications` | |
| Nội dung | `categories`, `courses`, `chapters`, `lessons` | draft/published hai trường (ADR-007) |
| Quiz | `quizzes`, `quizVersions`, `quizAttempts`, `quizResults` | câu hỏi nhúng trong quiz (≤ 30) |
| Học tập | `enrollments`, `lessonProgress` | `lessonUnderstanding` gộp vào `lessonProgress` (ADR-008) |
| Khác biệt | `notes`, `reviewItems`, `learningPaths`, `pathEnrollments`, `projectAssignments`, `projectSubmissions` | `projectFeedback` nhúng trong `projectSubmissions.rounds` |
| Tương tác | `questions`, `answers`, `courseReviews`, `contentReports` | |
| Media/quota | `mediaAssets`, `uploadReservations`, `quotaCounters`, `usageSnapshots` | |
| Hệ thống | `appSettings`, `auditLogs`, `rateLimitBuckets` | |

---

## 2. Tài khoản

### 2.1 `users`

| Field | Type | R | Default | Validation / ghi chú |
|---|---|---|---|---|
| email | string | R | | như người dùng nhập, đã trim, ≤ 254 |
| emailNormalized | string | R | | ADR-005; **U** |
| emailVerifiedAt | Date \| null | R | null | chỉ set bởi luồng verify hoặc Google `email_verified=true` |
| passwordHash 🔒 | string \| null | R | null | chuỗi PHC Argon2id; null với tài khoản chỉ Google |
| passwordUpdatedAt | Date \| null | | null | |
| displayName | string | R | | 2–60 ký tự, trim, không ký tự điều khiển |
| bio | string | | "" | ≤ 500 |
| timezone | string | R | "Asia/Ho_Chi_Minh" | IANA hợp lệ (`Intl.supportedValuesOf('timeZone')`) |
| learningGoal | string | | "" | ≤ 200 |
| avatar | `{kind:'initials'} \| {kind:'google', url}` | R | initials | url chỉ host `lh3.googleusercontent.com` |
| roles | `('student'\|'instructor'\|'admin')[]` | R | ['student'] | chỉ đổi qua admin service + audit |
| status | 'active' \| 'blocked' | R | 'active' | |
| blockedReason | string \| null | | null | |
| authVersion | int | R | 1 | tăng khi đổi/reset mật khẩu, logout-all, block |
| dataSaver | boolean | R | false | |
| publicProfile | `{enabled: boolean, handle: string\|null}` | R | `{false, null}` | handle `^[a-z0-9-]{3,30}$` |
| lastLoginAt | Date \| null | | null | |

- Index: `{emailNormalized:1}` **U**; `{ "publicProfile.handle": 1 }` **U partial** (`handle` là string); `{roles:1, createdAt:-1}` (admin lọc giảng viên).
- Retention: vĩnh viễn khi còn tài khoản. Xóa tài khoản là phạm vi sau (ghi backlog).
- 🔒: passwordHash, email (không lộ trong DTO public).

### 2.2 `authAccounts` (liên kết OAuth)

| Field | Type | R | Validation |
|---|---|---|---|
| userId | ObjectId | R | |
| provider | 'google' | R | |
| providerAccountId | string | R | `sub` của Google |
| emailAtLink | string | R | chỉ để hiển thị "đã liên kết với ..." |
| linkedAt | Date | R | |

- Index: `{provider:1, providerAccountId:1}` **U**; `{userId:1}`.
- **Không** lưu access/refresh/id token của Google.

### 2.3 `authTokens`

| Field | Type | R | Validation |
|---|---|---|---|
| type | 'email_verify' \| 'password_reset' \| 'set_password' \| 'link_intent' | R | |
| userId | ObjectId | R | |
| tokenHash 🔒 | string | R | SHA-256 hex của token 32 byte ngẫu nhiên (entropy cao → không cần hash chậm) |
| expiresAt | Date | R | verify 24h; reset/set_password 30 phút; link_intent 10 phút |
| usedAt | Date \| null | R | null |
| meta | `{emailNormalized?}` | | gắn email tại thời điểm phát để vô hiệu nếu email đổi |

- Index: `{tokenHash:1}` **U**; `{userId:1, type:1, createdAt:-1}` (cooldown gửi lại); **TTL** `{expiresAt:1}` với `expireAfterSeconds: 86400` (giữ thêm 1 ngày để debug rồi xóa).
- Consume nguyên tử: `findOneAndUpdate({tokenHash, type, usedAt: null, expiresAt: {$gt: now}}, {$set: {usedAt: now}})`.

### 2.4 `instructorApplications`

| Field | Type | R | Validation |
|---|---|---|---|
| userId | ObjectId | R | |
| status | 'pending' \| 'approved' \| 'rejected' | R | |
| motivation | string | R | 50–2000 |
| sampleUrl | string \| null | | http/https, ≤ 500, **không fetch** |
| reviewedBy / reviewedAt / decisionReason | | | |

- Index: `{userId:1}` **U partial** (`status: 'pending'`) → một đơn đang chờ/user; `{status:1, createdAt:1}`.

---

## 3. Nội dung

### 3.1 `categories`

`{ slug (U), name, order, isActive }` — vài chục bản ghi. Index `{slug:1}` **U**.

### 3.2 `courses`

| Field | Type | R | Validation / ghi chú |
|---|---|---|---|
| slug | string | R | **U**, `^[a-z0-9-]{3,80}$`, ổn định sau lần xuất bản đầu |
| instructorId | ObjectId | R | chủ sở hữu |
| status | 'draft' \| 'published' \| 'archived' \| 'suspended' | R | 'draft' = chưa từng xuất bản |
| review | `{state:'none'\|'pending'\|'rejected'\|'approved', submittedRevision, submittedAt, reviewedAt, reviewerId, rejectReason}` | R | |
| draftRevision | int | R | tăng ở **mọi** mutation draft của khóa (kể cả chapter/lesson) → optimistic concurrency |
| publishedVersion | int | R | 0 = chưa xuất bản |
| draft | CourseContent | R | |
| published | CourseContent & `{searchText, lessonCount, requiredLessonCount, totalDurationSeconds, chapterCount, publishedAt}` \| null | R | null nếu chưa xuất bản |
| ratingAvg / ratingCount | number / int | R | 0 / 0 — duy trì bởi review service + script reconcile |
| enrollmentCount | int | R | 0 — `$inc` khi enroll/revoke |
| featuredRank | int \| null | | admin đặt |
| suspendedReason / archivedAt | | | |

`CourseContent = { title (5–120), shortDescription (≤ 200), description (Markdown ≤ 20k), learningObjectives (≤ 10 × 200), prerequisites (≤ 10 × 200), categoryId, level ('beginner'|'intermediate'|'advanced'), thumbnailMediaId|null, placementQuizId|null }`

- Index: `{slug:1}` **U**; `{instructorId:1, updatedAt:-1}`; `{status:1, "published.categoryId":1, "published.level":1, "published.publishedAt":-1}` (catalog lọc + mới nhất); `{status:1, ratingAvg:-1}` (sắp xếp đánh giá); text `{ "published.searchText": "text" }` `default_language:"none"`; `{ "review.state":1, "review.submittedAt":1 }` (hàng duyệt admin); `{featuredRank:1}` partial.
- Quy tắc trạng thái: [§10](#10-state-machine-khóa-học).

### 3.3 `chapters`

| Field | Type | R | Ghi chú |
|---|---|---|---|
| courseId | ObjectId | R | không đổi sau khi tạo |
| draft | `{title (≤120), description (≤1000), order:int, deleted:boolean}` \| null | R | |
| published | `{title, description, order}` \| null | R | |

- Index: `{courseId:1, "draft.order":1}`, `{courseId:1, "published.order":1}`.
- Giới hạn: ≤ 30 chương/khóa.

### 3.4 `lessons`

| Field | Type | R | Ghi chú |
|---|---|---|---|
| courseId | ObjectId | R | lưu kèm để kiểm tra chuỗi lesson→chapter→course trong một truy vấn |
| draft / published | LessonContent \| null | R | |

`LessonContent = { chapterId, order, title (≤120), type ('reading'|'video'), objectives (≤5 × 200), content (Markdown ≤ 50k), durationSeconds (int ≥0; video lấy từ media đã xác minh, reading do giảng viên ước tính), isPreview, isRequired, mediaId|null (bắt buộc nếu video), transcript (≤ 100k)|null, quizId|null, projectAssignmentId|null, deleted? (chỉ draft) }`

- Index: `{courseId:1, "published.chapterId":1, "published.order":1}`; `{courseId:1, "draft.chapterId":1, "draft.order":1}`; `{ "draft.mediaId":1 }` sparse, `{ "published.mediaId":1 }` sparse (kiểm tra tham chiếu media trước khi xóa).
- Giới hạn: ≤ 200 bài/khóa; ≤ 10 video/khóa (quota, ADR §16.3).
- Xóa bài: draft đánh `deleted: true`; khi xuất bản thì `published = null`. Document giữ lại vì `lessonProgress`/`notes` tham chiếu `lessonId`.

---

## 4. Quiz

### 4.1 `quizzes` (bản biên tập)

| Field | Type | R | Ghi chú |
|---|---|---|---|
| courseId | ObjectId | R | |
| kind | 'lesson' \| 'placement' | R | placement = đánh giá đầu vào |
| draft | `{title, passPercent (0–100), showExplanations: 'after_submit'\|'never', questions: Question[] (1–30), rules?: PlacementRule[]}` | R | |
| publishedVersion | int \| null | R | trỏ tới `quizVersions` |

`Question = { questionId (string ổn định, nanoid), version:int, kind:'single_choice', prompt (Markdown ≤ 2000), options: {optionId, text (≤ 500)}[] (2–6), correctOptionId 🔒, explanation 🔒 (≤ 2000), topicKey? (placement), }`
`PlacementRule = { topicKey, chapterId, thresholdPercent (mặc định 60) }`

- `version` của câu tăng khi prompt/options/correctOptionId đổi (so sánh hash nội dung khi lưu).
- Index: `{courseId:1}`.

### 4.2 `quizVersions` (bất biến, bản đã xuất bản)

`{ quizId, version, courseId, kind, title, passPercent, showExplanations, questions: Question[], rules, createdAt }`

- Index: `{quizId:1, version:1}` **U**.
- Retention: giữ khi là version hiện hành hoặc còn `quizAttempts`/`reviewItems` tham chiếu; script dọn (dry-run mặc định).

### 4.3 `quizAttempts`

| Field | Type | R | Ghi chú |
|---|---|---|---|
| userId, quizId, courseId | ObjectId | R | |
| quizVersion | int | R | |
| submissionId | string (UUID do client sinh khi mở quiz) | R | idempotency |
| answers | `{questionId, questionVersion, selectedOptionId \| null, correct}`[] | R | ≤ 30 |
| correctCount, total, scorePercent, passed | | R | tính server-side |
| topicBreakdown | `{topicKey, correct, total}`[] | | placement |
| recommendations | `{chapterId, kind:'study_first'\|'quick_review'}`[] | | placement, theo rule |
| submittedAt | Date | R | |

- Index: `{userId:1, submissionId:1}` **U**; `{userId:1, quizId:1, submittedAt:-1}`.
- Retention: giữ **10 attempt gần nhất**/user/quiz (xóa phần dư ngay sau khi insert); aggregate ở `quizResults`.
- Trạng thái "đang làm": chỉ ở client (đáp án tạm trong state + `sessionStorage`, không chứa thông tin nhạy cảm); server không lưu attempt dở.

### 4.4 `quizResults` (aggregate)

`{ userId, quizId, courseId, bestScorePercent, latestScorePercent, attemptCount, firstPassedAt|null, lastAttemptAt }` — Index `{userId:1, quizId:1}` **U**; `{userId:1, courseId:1}`.

---

## 5. Học tập

### 5.1 `enrollments`

| Field | Type | R | Ghi chú |
|---|---|---|---|
| userId, courseId | ObjectId | R | |
| source | 'free' | R | mở rộng sau, **không** dùng làm đơn hàng |
| status | 'active' \| 'revoked' | R | |
| revokedAt / revokedBy / revokedReason | | | admin, có audit |
| lastLessonId / lastAccessedAt | | | "tiếp tục học" |
| completedAt / completedVersion | Date / int \| null | | giữ khi khóa thêm bài (ADR-007) |
| enrolledAt | Date | R | |

- Index: `{userId:1, courseId:1}` **U**; `{userId:1, status:1, lastAccessedAt:-1}` (Khóa học của tôi); `{courseId:1, status:1}` (thống kê giảng viên).
- Enroll idempotent: `updateOne({userId, courseId}, {$setOnInsert: {...}}, {upsert: true})` + bắt lỗi duplicate key → trả trạng thái hiện có. Enrollment `revoked` không tự kích hoạt lại khi học viên bấm đăng ký (cần admin).
- Chính sách sau thu hồi: mất quyền đọc nội dung ở request kế tiếp; **vẫn xem được** ghi chú, kết quả quiz và bài nộp của chính mình (chỉ đọc), có nhãn "khóa học không còn truy cập".

### 5.2 `lessonProgress` (kèm mức độ hiểu)

| Field | Type | R | Ghi chú |
|---|---|---|---|
| userId, courseId, lessonId | ObjectId | R | |
| lastPositionSeconds | number | R | 0; hữu hạn, 0 ≤ x ≤ durationSeconds (+2s dung sai) |
| lastPositionClientAt | Date | R | thời điểm client ghi nhận (để bỏ event đến muộn) |
| furthestPositionSeconds | number | R | 0; chỉ cập nhật bằng `$max` |
| completedAt | Date \| null | R | null; set một lần bằng điều kiện `completedAt: null`; **không** bị unset bởi event tiến độ |
| completionSource | 'manual' \| 'video_threshold' \| 'quiz_passed' \| null | | |
| understanding | 'understood' \| 'needs_review' \| 'not_understood' \| null | R | null — tách khỏi completedAt |
| understandingUpdatedAt | Date \| null | | |
| lastSavedAt | Date | R | |

- Index: `{userId:1, lessonId:1}` **U**; `{userId:1, courseId:1}` (tính tiến độ); `{userId:1, understanding:1, understandingUpdatedAt:-1}` partial (`understanding ∈ {needs_review, not_understood}`) cho dashboard "cần ôn".
- Cập nhật vị trí: `updateOne({userId, lessonId, $or: [{lastPositionClientAt: {$lt: clientAt}}, ...]}, {$set: {lastPositionSeconds, lastPositionClientAt}, $max: {furthestPositionSeconds}})` — event cũ hơn bị bỏ qua (không lỗi). `clientAt` bị kẹp vào `[now - 1h, now + 1 phút]` để chống giá trị bịa.
- Không lưu lịch sử event.

---

## 6. Điểm khác biệt

### 6.1 `notes`

| Field | Type | R | Validation |
|---|---|---|---|
| userId 🔒, courseId, lessonId | ObjectId | R | |
| timestampSeconds | number \| null | R | null với ghi chú không gắn thời điểm; 0 ≤ x ≤ duration |
| content 🔒 | string | R | 1–5000 ký tự, Markdown hiển thị an toàn (không ảnh) |
| contentNormalized | string | R | bỏ dấu + lowercase cho tìm kiếm |

- Index: `{userId:1, updatedAt:-1}`; `{userId:1, courseId:1, lessonId:1, timestampSeconds:1}`.
- Giới hạn (appSettings): 2.000 ghi chú/user, 200/bài; tạo ≤ 60/giờ.
- Tìm kiếm: luôn `{userId: viewer.id}` trước, rồi regex đã escape trên `contentNormalized`.
- Không có API cho giảng viên/admin đọc notes.

### 6.2 `reviewItems` (ôn tập câu sai)

| Field | Type | R | Ghi chú |
|---|---|---|---|
| userId, courseId, quizId | ObjectId | R | |
| questionId | string | R | |
| questionVersion / quizVersion | int | R | phiên bản lúc trả lời sai |
| topicKey | string \| null | | lọc theo chủ đề |
| status | 'active' \| 'mastered' \| 'stale' | R | stale = câu đã đổi/gỡ, không chấm tiếp |
| intervalStep | int 0–4 | R | mặc định 0; mốc [1, 3, 7, 14] ngày; hoàn thành mốc 14 → mastered |
| correctStreak | int | R | mặc định 0 |
| nextReviewAt | Date | R | 00:00 theo timezone của user + N ngày, lưu UTC |
| lastReviewedAt | Date \| null | | |
| revision | int | R | mặc định 0 — chống double submit (`findOneAndUpdate` theo `revision`) |

- Index: `{userId:1, questionId:1, questionVersion:1}` **U**; `{userId:1, status:1, nextReviewAt:1}`; `{userId:1, courseId:1, status:1, nextReviewAt:1}`.
- Quy tắc: trả lời sai (trong quiz hoặc màn ôn) → `intervalStep = 0`, `correctStreak = 0`, `nextReviewAt = ngày mai`. Đúng → `intervalStep += 1`, hẹn theo mốc kế. Không lưu từng event.

### 6.3 `learningPaths`

| Field | Type | R | Ghi chú |
|---|---|---|---|
| slug | string | R | **U** |
| ownerId | ObjectId | R | admin/giảng viên được cấp quyền |
| status | 'draft' \| 'published' \| 'archived' | R | |
| title, goal, audience, prerequisites | string | R | |
| items | `{itemId, kind:'course'\|'chapter'\|'lesson'\|'milestone', refId\|null, title\|null, required, order, dependsOn: itemId[]}`[] | R | ≤ 50; `dependsOn` phải là DAG (kiểm tra chu trình khi lưu) |
| estimatedMinutes | int | | tính từ `durationSeconds` của bài published, không nhập tay |

- Index: `{slug:1}` **U**; `{status:1, updatedAt:-1}`.
- Tiến độ: mở rộng item → tập `lessonId` required (published), **hợp tập** để không đếm trùng; item trỏ tới nội dung không còn published → trạng thái "không khả dụng", loại khỏi mẫu số và hiển thị cảnh báo.

### 6.4 `pathEnrollments`

`{ userId, pathId, status: 'active'|'paused'|'stopped', startedAt }` — Index `{userId:1, pathId:1}` **U**; `{userId:1, status:1}`.

### 6.5 `projectAssignments`

| Field | Type | R | Ghi chú |
|---|---|---|---|
| courseId | ObjectId | R | |
| draft / published | AssignmentContent \| null | R | xuất bản cùng khóa (ADR-007) |

`AssignmentContent = { title, brief (Markdown ≤ 10k), objectives[], requirements[], checklist (≤ 20 × 300), rubric: {criterionId, title, maxPoints (1–100), passDescription, failDescription, skillTag}[] (1–10), resources: {title, url}[] (≤ 10, http/https), maxRounds (1–5, mặc định 3) }`

- Index: `{courseId:1}`.

### 6.6 `projectSubmissions` (kèm feedback)

| Field | Type | R | Ghi chú |
|---|---|---|---|
| userId 🔒, assignmentId, courseId | ObjectId | R | |
| status | 'draft' \| 'submitted' \| 'needs_changes' \| 'resubmitted' \| 'reviewed' | R | |
| draftFields | `{repoUrl, demoUrl, description, selfAssessment}` | R | bản nháp hiện tại |
| rounds | Round[] | R | ≤ `maxRounds` (≤ 5) |
| showOnProfile | boolean | R | false — opt-in từng bài |
| skills | string[] | | suy ra từ rubric khi `reviewed` |
| reviewerLockedAt | Date \| null | | |

`Round = { roundNo, submittedAt, repoUrl, demoUrl, description (≤ 5000), selfAssessment: {criterionId, points, note}[], feedback?: { reviewerId, reviewedAt, scores: {criterionId, points, comment}[], totalPoints, maxPoints, summary (≤ 5000), decision: 'needs_changes'|'accepted' } }`

- URL chỉ `http:`/`https:`, ≤ 500 ký tự; server **không fetch**.
- Index: `{userId:1, assignmentId:1}` **U**; `{courseId:1, status:1, updatedAt:1}` (hàng chờ chấm của giảng viên).
- Chuyển trạng thái chỉ qua service với điều kiện trạng thái hiện tại (`findOneAndUpdate({_id, status: <expected>})`).

---

## 7. Tương tác

### 7.1 `questions` (hỏi đáp theo bài)

`{ courseId, lessonId, authorId, title (≤ 150), body (Markdown ≤ 5000, không ảnh), status: 'visible'|'hidden'|'deleted', hiddenReason, acceptedAnswerId|null, answerCount, hasInstructorAnswer, lastActivityAt }`
- Index: `{lessonId:1, status:1, lastActivityAt:-1}`; `{courseId:1, status:1, hasInstructorAnswer:1, lastActivityAt:-1}` (hộp thư giảng viên).

### 7.2 `answers`

`{ questionId, courseId, authorId, body (≤ 5000), isInstructor, markedHelpfulBy: ObjectId|null, status }`
- Index: `{questionId:1, status:1, createdAt:1}`.
- Quyền: tác giả câu hỏi chấp nhận/bỏ chấp nhận câu trả lời; giảng viên khóa đánh dấu/bỏ đánh dấu "hữu ích"; admin ẩn có lý do.

### 7.3 `courseReviews`

`{ userId, courseId, rating (int 1–5), comment (≤ 2000), status: 'visible'|'hidden', hiddenReason, hiddenBy }`
- Index: `{userId:1, courseId:1}` **U**; `{courseId:1, status:1, updatedAt:-1}`.
- Aggregate: cập nhật `courses.ratingAvg/ratingCount` bằng tính lại từ `courseReviews` (visible) sau mỗi thay đổi — số review/khóa nhỏ; script `reconcile-ratings` dự phòng.

### 7.4 `contentReports`

`{ reporterId, targetType: 'question'|'answer'|'review', targetId, reason: 'spam'|'abuse'|'off_topic'|'other', note (≤ 500), status: 'open'|'resolved'|'dismissed', resolvedBy, resolvedAt, resolution }`
- Index: `{reporterId:1, targetType:1, targetId:1}` **U** (chống spam báo cáo); `{status:1, createdAt:1}`.

---

## 8. Media & quota

### 8.1 `mediaAssets` (chỉ tạo sau khi finalize xác minh)

| Field | Type | R | Ghi chú |
|---|---|---|---|
| publicId | string | R | **U**, do server sinh |
| assetId | string | R | `asset_id` của Cloudinary |
| resourceType | 'image' \| 'video' | R | |
| deliveryType | 'upload' \| 'authenticated' | R | |
| purpose | 'course_thumbnail' \| 'lesson_image' \| 'lesson_video' \| 'preview_video' | R | |
| format, bytes, width, height, durationSeconds, version | | R | lấy từ Admin API, không từ client |
| posterPublicId / derived | | | eager đã tạo (nếu có) |
| ownerId, courseId | ObjectId | R | |
| reservationId | ObjectId | R | **U** (idempotent finalize) |
| status | 'ready' \| 'deletion_pending' \| 'deleted' \| 'rejected' | R | |
| refs | `{kind:'lesson_draft'\|'lesson_published'\|'course_draft'\|'course_published', id}`[] | R | ≤ 10; "đang dùng" ⇔ `refs` khác rỗng |
| deletion | `{requestedAt, attempts, lastError, nextAttemptAt}` \| null | | retry có backoff, tối đa 8 lần |
| rejectReason | string \| null | | |

- Index: `{publicId:1}` **U**; `{reservationId:1}` **U**; `{courseId:1, status:1}`; `{status:1, "deletion.nextAttemptAt":1}` partial.

### 8.2 `uploadReservations`

| Field | Type | R | Ghi chú |
|---|---|---|---|
| userId, courseId | ObjectId | R | |
| purpose, resourceType, deliveryType | | R | |
| publicId | string | R | **U**, `lms/<env>/c/<courseId>/<reservationId>` |
| reservedBytes | int | R | = giới hạn tối đa của purpose (vd 20 MiB) |
| status | 'active' \| 'finalizing' \| 'consumed' \| 'expired' \| 'released' \| 'rejected' | R | |
| signatureTimestamp | int | R | |
| expiresAt | Date | R | timestamp + 90 phút (chữ ký 60 phút + thời gian upload) |
| purgeAt | Date \| null | | set khi vào trạng thái kết thúc; **TTL** 30 ngày |

- Index: `{publicId:1}` **U**; `{status:1, expiresAt:1}`; `{userId:1, status:1}`; **TTL** `{purgeAt:1}` `expireAfterSeconds: 0`.
- **Không** TTL bản ghi `active` (nếu không quota `reservedBytes` sẽ kẹt). Giải phóng lười trước mỗi lần reserve + script reconcile.

### 8.3 `quotaCounters`

| _id | Field |
|---|---|
| `'storage:global'` | `usedBytes`, `reservedBytes` |
| `'videos:course:<courseId>'` | `usedCount`, `reservedCount` |
| `'videos:global'` | số khóa có video (`coursesWithVideo`) |

Reserve nguyên tử (một document):
```js
updateOne(
  { _id: 'storage:global', $expr: { $lte: [{ $add: ['$usedBytes', '$reservedBytes', n] }, LIMIT] } },
  { $inc: { reservedBytes: n } })
// matchedCount === 0 → QUOTA_EXCEEDED (409)
```
Reserve nhiều counter: tuần tự, nếu counter sau thất bại thì bù trừ counter trước (`$inc: -n`) và đánh reservation `released`. Script reconcile tính lại counter từ `mediaAssets` + reservation `active` (dry-run trước).

### 8.4 `usageSnapshots`

`{ source: 'cloudinary_admin_api'|'mongodb_manual', takenAt, providerLastUpdated, authoritative: boolean, data: { storageBytes, bandwidthBytes, transformations, creditsUsed?, creditsLimit?, rawResponseSubset }, fetchedBy }`
- Index: `{source:1, takenAt:-1}`. Retention: 90 ngày (TTL trên `takenAt`, `expireAfterSeconds: 7776000`).

---

## 9. Hệ thống

### 9.1 `appSettings`

Document theo `_id`: `'limits'` (kích thước/thời lượng/số lượng), `'budget'` (ngưỡng nội bộ bytes/credits, freshness), `'killSwitches'` (`uploadsEnabled`, `playbackIssuanceEnabled`, `eagerTransformationsEnabled`). Mỗi doc có `version`, `updatedBy`, `updatedAt`; giá trị mặc định lấy từ env khi doc chưa tồn tại. Mọi thay đổi ghi `auditLogs`.

### 9.2 `auditLogs`

`{ at, actorId|null, action ('course.approve', 'user.block', 'quota.update', ...), targetType, targetId, outcome: 'success'|'denied'|'error', requestId, meta (≤ 2 KB, đã redact) }`
- Index: `{at:-1}`; `{targetType:1, targetId:1, at:-1}`; `{actorId:1, at:-1}`; **TTL** `{at:1}` 180 ngày.
- Không ghi token, password, nội dung ghi chú, body đầy đủ.

### 9.3 `rateLimitBuckets`

`{ key (HMAC), windowStart, count, expiresAt }` — Index `{key:1, windowStart:1}` **U**; **TTL** `{expiresAt:1}`.

---

## 10. State machine khóa học

```text
           submit                 approve
 draft ───────────▶ (review.pending) ─────────▶ published ◀──────────┐
   ▲                    │ reject                 │  │ edit draft + submit
   └─── edit ◀── (review.rejected)               │  └──▶ (review.pending, bản cũ vẫn public)
                                                 │ archive (admin/owner)    suspend (admin)
                                                 ▼                             ▼
                                             archived                      suspended
                                (ẩn catalog, chặn enroll mới,     (chặn toàn bộ truy cập nội dung,
                                 học viên cũ vẫn học bản published) hiển thị thông báo)
```

- Giảng viên chỉ gọi được: `submitForReview`, `withdrawSubmission`, `archive` (khóa của mình). `approve/reject/suspend/unsuspend` chỉ admin.
- `approve` chỉ thành công nếu `course.draftRevision === review.submittedRevision` (admin duyệt đúng bản đã nộp) và qua kiểm tra điều kiện xuất bản (metadata, ≥ 1 chương có ≥ 1 bài hợp lệ, media `ready`, không tham chiếu media đã xóa).
- Khi `review.state = 'pending'`, mutation draft bị chặn (409) cho tới khi rút yêu cầu.

## 11. Ước tính dung lượng (để đối chiếu ngân sách 300 MiB)

| Nguồn | Ước tính thô | Ghi chú |
|---|---|---|
| Nội dung 2 khóa (draft + published, ~40 bài × ~15 KB × 2) | ~1,5 MB | + quiz/assignment |
| Mỗi học viên hoạt động nhiều | ~100–250 KB | 20 progress, 50 notes, 10 attempt × 6 quiz, review items |
| Index | thường 30–60% data | đo thật bằng `db.stats()` / Atlas UI |

→ 300 MiB đủ cho cỡ **vài trăm** học viên hoạt động nhiều. Đây là **ước tính**, sẽ đo lại bằng `db.stats()` ở Phase 4 và ghi vào [FREE_TIER_BUDGET.md](FREE_TIER_BUDGET.md).

## 12. Script dữ liệu

| Lệnh | Mục đích |
|---|---|
| `pnpm db:indexes` | tạo index + validator; idempotent; in diff index thừa (không tự drop) |
| `pnpm db:seed` | seed theo slug/natural key; idempotent; không upload media |
| `pnpm admin:create -- --email ...` | bootstrap admin (yêu cầu xác nhận tương tác hoặc `--yes` + chỉ chạy khi `ALLOW_ADMIN_BOOTSTRAP=true`) |
| `pnpm db:migrate` | chạy migration theo `schemaVersion` (khi có) |
