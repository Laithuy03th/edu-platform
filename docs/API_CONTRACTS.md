# Hợp đồng API (Server Actions & Route Handlers)

> Trạng thái: **thiết kế Phase 0**. Tên là identifier dự kiến; cập nhật khi implement.

## 1. Quy ước chung

- **Server Action** cho mutation nội bộ từ UI; **Route Handler** cho Auth.js, beacon tiến độ, webhook, health, export.
- Mọi Action bọc bởi `action(schema, handler, opts)`:
  1. Kiểm tra `Origin` (ARCHITECTURE §6) → 403 `FORBIDDEN_ORIGIN`.
  2. Parse Zod (input `FormData`/object) → 422 `VALIDATION_FAILED` + `fieldErrors`.
  3. `requireViewer`/`requireRole`/`requireVerifiedEmail` theo `opts.auth`.
  4. Rate limit theo `opts.rateLimit`.
  5. Gọi service; `AppError` → `ActionResult.error`; lỗi khác → `INTERNAL_ERROR` + log.
- Kết quả: `ActionResult<T> = { ok: true, data: T } | { ok: false, error: { code, message, fieldErrors?, retryAfterSeconds?, requestId } }`.
- Route Handler trả JSON cùng shape `{ error: {...} }` với HTTP status tương ứng.

### Mã lỗi

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `UNAUTHENTICATED` | 401 | chưa đăng nhập / phiên bị thu hồi |
| `FORBIDDEN`, `FORBIDDEN_ORIGIN`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_BLOCKED` | 403 | |
| `NOT_FOUND` | 404 | cũng dùng khi không có quyền thấy tài nguyên tồn tại (tránh lộ sự tồn tại) |
| `CONFLICT`, `STALE_REVISION`, `INVALID_STATE`, `QUOTA_EXCEEDED`, `ALREADY_EXISTS` | 409 | |
| `INVALID_TOKEN` | 400 | token xác minh/reset sai, hết hạn hoặc đã dùng (không phân biệt lý do) |
| `VALIDATION_FAILED` | 422 | kèm `fieldErrors` |
| `RATE_LIMITED` | 429 | kèm `Retry-After` |
| `UPLOADS_DISABLED`, `PROVIDER_UNAVAILABLE`, `USAGE_STALE` | 503 | fail-closed có chủ đích |
| `INTERNAL_ERROR` | 500 | message chung + requestId |

Ký hiệu cột Auth: **P** public, **U** đã đăng nhập, **V** đã xác minh email, **I** instructor (+owner), **A** admin. RL = rate limit (chi tiết [AUTH_SECURITY §8](AUTH_SECURITY.md#8-rate-limit-mặc-định-cấu-hình-được)).

## 2. Auth & tài khoản (Phase 1)

| Tên | Input | Output | Auth | RL | Idempotency | Lỗi chính | Tác dụng phụ |
|---|---|---|---|---|---|---|---|
| `GET/POST /api/auth/[...nextauth]` | do Auth.js | | P | login | CSRF token Auth.js | | phát/xóa cookie |
| `registerAction` | displayName, email, password, confirmPassword | `{ next: 'verify-email' }` | P | register | unique email | 422, 429 | tạo user, token, gửi email |
| `loginAction` | email, password, callbackUrl | redirect nội bộ | P | login | — | lỗi chung, 429 | `lastLoginAt`, cookie |
| `logoutAction` | — | redirect `/` | U | — | có | | xóa cookie |
| `logoutAllAction` | — | redirect `/login` | U | — | có | | `$inc authVersion`, audit |
| `resendVerificationAction` | — | `{ cooldownSeconds }` | U | resend | cooldown | 429 | token mới, email |
| `verifyEmailAction` | token | `{ verified: true }` | P | 20/giờ/IP | consume nguyên tử; đã verify → ok | `INVALID_TOKEN` (token sai/hết hạn/đã dùng) | `emailVerifiedAt` |
| `forgotPasswordAction` | email | thông báo chung | P | reset | — | 429 | token + email (sau response) |
| `resetPasswordAction` | token, password, confirm | redirect `/login` | P | 10/giờ/IP | consume nguyên tử | `INVALID_TOKEN` | hash mới, `$inc authVersion`, audit |
| `changePasswordAction` | currentPassword, newPassword, confirm | `{ ok }` | U | change_pw | — | 422 sai mật khẩu hiện tại | hash mới, `$inc authVersion`, cookie mới |
| `requestSetPasswordAction` | — | thông báo | U (chỉ Google) | 3/giờ | — | `INVALID_STATE` nếu đã có mật khẩu | email `set_password` |
| `startGoogleLinkAction` | currentPassword? | redirect Google | U | change_pw | link_intent một lần | 422, 409 đã liên kết | token + cookie `link_intent` |
| `unlinkGoogleAction` | — | `{ ok }` | U | 5/giờ | có | `INVALID_STATE` nếu là phương thức duy nhất | xóa authAccounts, audit |
| `updateProfileAction` | displayName, bio, timezone, learningGoal, dataSaver | ProfileDto | U | 30/giờ | có | 422 | **allowlist field**, bỏ qua roles/status/email/authVersion |
| `updatePublicProfileAction` | enabled, handle | ProfileDto | V | 10/giờ | có | `ALREADY_EXISTS` handle | revalidate `profile:<id>` |
| `applyInstructorAction` | motivation, sampleUrl? | ApplicationDto | V | 3/ngày | unique partial pending | 409 | tạo đơn |

## 3. Catalog, authoring, duyệt, enrollment (Phase 2)

| Tên | Input | Output | Auth | RL | Idempotency | Lỗi | Tác dụng phụ |
|---|---|---|---|---|---|---|---|
| `listCatalog` (service gọi từ RSC) | q (≤ 100), category, level, instructor, sort ∈ {newest, rating}, page (≤ 50), pageSize ∈ {12, 24} | `Page<CourseCardDto>` | P | — | — | 422 → về mặc định | cache `catalog` |
| `getCourseDetail` (RSC) | slug | CourseDetailDto (outline không có content) | P | — | — | 404 nếu không public | cache `course:<id>` |
| `getPreviewLesson` (RSC) | slug, lessonId | LessonDto | P | — | — | 404 nếu không preview | |
| `enrollAction` | courseId | EnrollmentDto | V | 30/giờ | upsert + unique | `INVALID_STATE` khóa không published; `FORBIDDEN` revoked | `$inc enrollmentCount` |
| `createCourseAction` | title, categoryId, level | `{ courseId }` | I | 10/ngày | — | 422 | course draft |
| `updateCourseDraftAction` | courseId, expectedRevision, fields | CourseEditorDto | I(owner)/A | 300/giờ | `expectedRevision` | `STALE_REVISION`, `INVALID_STATE` (đang chờ duyệt) | `draftRevision++` |
| `createChapterAction` / `updateChapterAction` / `deleteChapterAction` | courseId, chapterId?, expectedRevision, fields | ChapterDto | I/A | 300/giờ | revision | 409, 404 | revision++ |
| `createLessonAction` / `updateLessonAction` / `deleteLessonAction` | courseId, lessonId?, expectedRevision, fields (mediaId chỉ ref asset ready cùng course) | LessonEditorDto | I/A | 300/giờ | revision | 409, 404, `MEDIA_NOT_READY` | refs media |
| `reorderAction` | courseId, expectedRevision, `chapters: {chapterId, lessonIds[]}[]` | CurriculumDto | I/A | 300/giờ | revision | 422 tập ID không khớp/trùng/thiếu | transaction cập nhật order |
| `submitForReviewAction` | courseId, expectedRevision | ReviewStateDto | I(owner) | 10/ngày | state check | `PUBLISH_REQUIREMENTS_FAILED` (422, liệt kê lỗi) | review.pending, audit |
| `withdrawSubmissionAction` | courseId | | I(owner) | | state check | 409 | review.none |
| `approveCourseAction` | courseId, submittedRevision | | A | | state + revision | 409 | transaction draft→published, `publishedVersion++`, revalidate `catalog`/`course:<id>`, audit |
| `rejectCourseAction` | courseId, reason (10–1000) | | A | | state | 409 | review.rejected, audit |
| `archiveCourseAction` / `suspendCourseAction` / `unsuspendCourseAction` | courseId, reason | | I(owner, chỉ archive)/A | | state | 409 | revalidate, audit |
| `revokeEnrollmentAction` | enrollmentId, reason | | A | | state | 409 | audit |
| `reviewInstructorApplicationAction` | applicationId, decision, reason | | A | | state | 409 | `$addToSet roles 'instructor'`, audit |
| `setUserStatusAction` / `setUserRolesAction` | userId, ... | | A | | | `FORBIDDEN` tự hạ quyền admin cuối cùng | `$inc authVersion` khi block, audit |

## 4. Media (Phase 3)

| Tên | Input | Output | Auth | RL | Idempotency | Lỗi | Tác dụng phụ |
|---|---|---|---|---|---|---|---|
| `requestUploadAction` | courseId, purpose, fileName, declaredBytes, declaredType, declaredDuration? | `{ reservationId, cloudName, apiKey, resourceType, params, signature }` | I/A | 20/giờ | một reservation `active` tối đa 3/user | `QUOTA_EXCEEDED`, `UPLOADS_DISABLED`, `USAGE_STALE`, 422 (khai báo vượt giới hạn) | reserve quota |
| `finalizeUploadAction` | reservationId | MediaAssetDto | I/A (chủ reservation) | 60/giờ | reservationId **U** | `UPLOAD_NOT_FOUND`, `UPLOAD_REJECTED` (+lý do), `RESERVATION_EXPIRED` | asset, quota commit |
| `cancelUploadAction` | reservationId | | chủ reservation | | state | | release quota |
| `deleteMediaAction` | mediaId | | I/A | 30/giờ | state | `MEDIA_IN_USE` 409 | deletion_pending |
| `POST /api/webhooks/cloudinary` | raw body + `X-Cld-Signature`, `X-Cld-Timestamp` | 200/401 | chữ ký | — | finalize idempotent | 401 chữ ký sai/timestamp > 2h | finalize |
| `getPlaybackSourceAction` | lessonId | `{ url, bytes, durationSeconds, posterUrl }` | U + `canReadLesson` | 120/giờ | — | `FORBIDDEN`, `PLAYBACK_DISABLED`, `MEDIA_UNAVAILABLE` | không |
| `refreshUsageAction` | — | UsageSnapshotDto | A | cooldown 15 phút | | `PROVIDER_UNAVAILABLE` | usageSnapshots |
| `updateKillSwitchesAction` / `updateLimitsAction` | fields, expectedVersion | | A | | version | 409 | audit |

## 5. Học tập (Phase 4)

| Tên | Input | Output | Auth | RL | Idempotency | Lỗi | Tác dụng phụ |
|---|---|---|---|---|---|---|---|
| `getLearnPage` (RSC) | courseSlug, lessonId | LearnPageDto (sidebar, lesson, progress) | U + `canReadLesson` | | | 403/404, `COURSE_SUSPENDED` | `enrollment.lastLessonId` (best effort) |
| `saveProgressAction` | lessonId, positionSeconds, clientAt | `{ saved: boolean }` | U + quyền học | progress | event cũ bị bỏ qua | 422 vị trí không hợp lệ | lessonProgress |
| `POST /api/progress` (sendBeacon) | JSON như trên, `Content-Type: text/plain` hoặc JSON | 204 | cookie + Origin | progress | như trên | trả đúng 401/403/422 (beacon bỏ qua response, nhưng log/test dựa vào mã) | lessonProgress |
| `markLessonCompleteAction` | lessonId | ProgressDto | U + quyền học | 120/giờ | `completedAt: null` điều kiện | 422 video chưa tới 90% `furthest` | completedAt, completion khóa |
| `setUnderstandingAction` | lessonId, level | | U + quyền học | 120/giờ | có | | understanding |
| `getQuizForAttempt` (RSC) | quizId | QuizForAttemptDto (**không** đáp án/giải thích) | U + quyền học | | | | |
| `submitQuizAction` | quizId, quizVersion, submissionId (UUID), answers[{questionId, optionId}] | QuizResultDto (điểm, đúng/sai từng câu, giải thích theo cấu hình) | U + quyền học | 30/giờ | `{userId, submissionId}` **U** → trả kết quả attempt cũ | `QUIZ_VERSION_CHANGED` (409, tải lại) | attempt, quizResults, reviewItems, completion (nếu cấu hình), placement recommendations |
| `getDueReviews` (RSC) | courseId?, topicKey?, page | ReviewQueueDto | U | | | | |
| `answerReviewAction` | reviewItemId, revision, optionId | ReviewResultDto | U (chủ item) | 300/giờ | `revision` | `STALE_REVISION`, `QUESTION_CHANGED` → item stale | lịch ôn |
| `createNoteAction` / `updateNoteAction` / `deleteNoteAction` | lessonId, timestampSeconds?, content | NoteDto | U + (tạo: quyền học; sửa/xóa: chủ note) | notes | sửa theo `updatedAt` mong đợi | 422, `LIMIT_REACHED` | |
| `listNotes` (RSC) | courseId?, lessonId?, q?, page | `Page<NoteDto>` | U (chỉ của mình) | | | | |

## 6. Lộ trình, dự án, tương tác (Phase 5)

| Tên | Input | Output | Auth | RL | Idempotency | Lỗi |
|---|---|---|---|---|---|---|
| `upsertLearningPathAction` | pathId?, fields, items | PathDto | A hoặc I được cấp | 100/giờ | version | 422 chu trình phụ thuộc, ref không tồn tại |
| `joinPathAction` / `setPathStatusAction` | pathId, status | | V | 30/giờ | unique | 409 path không published |
| `saveAssignmentDraftAction` | courseId, assignmentId?, fields | | I/A | | course revision | 422 rubric |
| `saveSubmissionDraftAction` | assignmentId, repoUrl, demoUrl, description, selfAssessment | | V + quyền học | 60/giờ | | 422 URL không http(s) |
| `submitProjectAction` | assignmentId, expectedStatus | SubmissionDto | V + quyền học | 10/ngày | điều kiện trạng thái | `MAX_ROUNDS_REACHED`, `INVALID_STATE` |
| `reviewSubmissionAction` | submissionId, roundNo, scores[], summary, decision | | I(owner khóa)/A | 200/giờ | `roundNo` + trạng thái | 422 điểm vượt max |
| `setSubmissionVisibilityAction` | submissionId, showOnProfile | | chủ bài | | | `INVALID_STATE` chưa reviewed |
| `createQuestionAction` / `createAnswerAction` / `edit*` / `delete*` | ... | | V + quyền học (giảng viên khóa luôn được trả lời) | Q&A | | 422, 429 |
| `acceptAnswerAction` / `markHelpfulAction` | answerId, value | | tác giả câu hỏi / giảng viên khóa | | idempotent set | |
| `upsertCourseReviewAction` | courseId, rating, comment | | V + `canWriteCourseReview` | review | unique user+course | `FORBIDDEN` tự đánh giá |
| `reportContentAction` | targetType, targetId, reason, note | | V | report | unique | |
| `moderateContentAction` | targetType, targetId, action ∈ {hide, unhide}, reason | | A | | | audit, aggregate rating |
| `GET /api/notes/export` (Phase 6) | courseId? | `text/markdown` | U (chỉ của mình) | 10/giờ | | |
| `GET /api/health` | — | `{ status: 'ok' }` (không query DB mặc định; `?deep=1` chỉ admin) | P | 60/phút/IP | | |

## 7. Ghi chú về `POST /api/progress`

`navigator.sendBeacon` gửi cookie same-origin; dùng khi `visibilitychange → hidden`/`pagehide`. Là **best effort**: response bị bỏ qua, có thể không tới server. Server áp dụng cùng validation/quy tắc event cũ như `saveProgressAction`. Không dùng beacon cho thao tác cần xác nhận (hoàn thành bài, nộp quiz).
