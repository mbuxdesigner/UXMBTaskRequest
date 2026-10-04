# TÀI LIỆU BÀN GIAO & GHI CHÚ NÂNG CẤP TÍNH NĂNG AI CHATS
## DỰ ÁN: MBBANK UX TASK REQUEST PORTAL (`uxmb-task-request`)
**Phân hệ:** AI Chats & Intelligent Copilot  
**Nhánh triển khai:** `fix/ai-chats-audit`  
**Điểm khôi phục chuẩn (Baseline):** Commit `92292d1`  
**Ngày phát hành:** 04/10/2026  
**Ngôn ngữ tài liệu:** Tiếng Việt  

---

## 1. TỔNG QUAN NÂNG CẤP TÍNH NĂNG AI CHATS

Tính năng **AI Chats (AI Chat Copilot)** trong cổng thông tin nội bộ `uxmb-task-request` được thiết kế chuyên biệt phục vụ đội ngũ **UX/UI Designer, Design Owner và Product Owner (PO)** tại Ngân hàng TMCP Quân đội (MBBank).

### 1.1. Mục tiêu Nâng cấp
1. **Trải nghiệm thao tác 1-chạm & Tương thích Figma:** Loại bỏ ma sát bôi đen thủ công; cung cấp khả năng sao chép câu trả lời trợ lý dưới dạng văn bản sạch (Clean Text) hoặc bảng định dạng Tab-Separated Values (TSV) để dán trực tiếp vào các layer văn bản và khung Auto-Layout của Figma.
2. **Chất lượng phản hồi chuẩn MBBank:** Tích hợp bộ quy chuẩn **MB Bank Design Ops Copilot Persona** (mã màu thương hiệu `#1057FB`, `#ED1C24`, font Be Vietnam Pro, quy chuẩn 4 cấp độ bo góc ReUI, quy trình 7 khâu UX và SLA phản hồi PO 24h); xóa bỏ giới hạn cắt cụt cứng 2.000 ký tự để nạp tài liệu đặc tả PRD/Handoff lên đến 16.000 ký tự.
3. **Bảo mật & An toàn thông tin cấp Ngân hàng:** Thu hồi toàn bộ khóa API khỏi client bundle production; thiết lập lớp xác thực Session Token thật và giới hạn tần suất (Rate Limiting) tại Gateway Serverless; tích hợp động cơ che giấu thông tin cá nhân (PII Masking) đối với email, số điện thoại, CCCD, CMND và mã nhân viên trước khi gửi ra mô hình ngôn ngữ lớn (LLM).
4. **Độ ổn định & Khả năng phục hồi:** Xử lý lỗi thân thiện bằng tiếng Việt kèm nút Thử lại (Retry) giữ nguyên ngữ cảnh; khắc phục hiện tượng rò rỉ luồng stream khi unmount hoặc đổi phiên chat; phòng vệ lỗi phân tích JSON/Markdown nhằm hạn chế nguy cơ vỡ giao diện React.

---

## 2. DANH MỤC THAY ĐỔI THEO NHÓM COMMIT

Toàn bộ các thay đổi được tổ chức thành các commit độc lập, có thông điệp rõ ràng trên nhánh `fix/ai-chats-audit`, bảo toàn lịch sử từ commit gốc `92292d1`:

### 2.1. Nhóm Bảo mật & Gateway Auth (Commits `382674c` & `fd962af` — Milestone M1)
- **Bảo vệ Client Bundle khỏi lộ khóa API:**
  - Trong `src/services/aiService.ts`, gán cờ `DEV` guard cho `VITE_OPENROUTER_API_KEY` và `VITE_GEMINI_API_KEY`. Trong môi trường production (`import.meta.env.DEV === false`), client hoàn toàn không mang khóa API và bắt buộc định tuyến mọi cuộc gọi qua endpoint nội bộ `/api/ai-gateway`.
  - Quét tĩnh gói mã nguồn sau khi build (`dist/assets/*.js`) chứng minh 0% khóa API bị đóng gói.
- **Xác thực Caller & Chống giả mạo tại Gateway (`api/ai-gateway.ts`):**
  - Tích hợp hàm `verifySessionToken` xác minh token phiên làm việc thật (`ST_[a-f0-9]{16}`) thông qua cơ chế tra soát backend Google Apps Script / cache bộ nhớ TTL 5 phút.
  - Từ chối dứt khoát các token giả mạo (dù đúng định dạng regex `ST_...`) bằng mã lỗi HTTP 401 Unauthorized.
  - Điều khiển bằng biến môi trường `AI_GATEWAY_AUTH_REQUIRED`: mặc định `"false"` an toàn cho môi trường Local Development; bật `"true"` trên production để bắt buộc xác thực.
- **Đính kèm Session Token từ Client (`src/services/aiService.ts`):**
  - Hàm `getStoredSessionToken()` (`src/services/aiService.ts:64-78`) trích xuất token phiên (`ST_[a-f0-9]{16}`) từ `localStorage` hoặc `sessionStorage` (`ux_portal_session_auth`).
  - Trong luồng chat stream `streamAIChat()` (`src/services/aiService.ts:741-764`), client đọc `const sessionToken = getStoredSessionToken()` (dòng 742) và gắn `gatewayHeaders["Authorization"] = \`Bearer ${sessionToken}\`` (dòng 747) trước khi gọi `fetch("/api/ai-gateway", ...)` tại dòng 751-764.
  - Trong luồng kiểm tra `testAIConnection()` (`src/services/aiService.ts:466-479`), client cũng đọc `sessionToken` (dòng 466) và gắn `headers["Authorization"] = \`Bearer ${sessionToken}\`` (dòng 468) khi kiểm tra qua `/api/ai-gateway` (dòng 471-479).
  - Bắt lỗi HTTP 401 (`src/services/aiService.ts:787-793`) khi phiên chưa đăng nhập hoặc hết hạn để thông báo rõ ràng cho người dùng.
- **Giới hạn tần suất trượt (Sliding Window Rate Limiter):**
  - Cài đặt bộ giới hạn 20 yêu cầu/phút trên mỗi định danh người dùng/IP tại Gateway. Khi vượt ngưỡng, trả về mã lỗi HTTP 429 kèm thông điệp tiếng Việt và tiêu đề `Retry-After`.
- **Động cơ che giấu dữ liệu cá nhân nhạy cảm (`src/lib/piiMasker.ts`):**
  - Tự động nhận diện và thay thế: Email (`[EMAIL_n]`), SĐT Việt Nam & Quốc tế (`+84`, `0084`, `(0912)...` -> `[PHONE_n]`), CMND 9 số & CCCD 12 số (`[ID_n]`), Mã nhân sự (`MSNV_...`, `NV...` -> `[STAFF_ID_n]`).
  - Bảo toàn chính xác các cụm từ ngữ cảnh ngân hàng (như số dư tiền tệ `100000000000 VND`, `123456789 đ` hoặc từ bắt đầu bằng chữ 'đ' như `được`, `đã`).
  - Cung cấp cơ chế khôi phục đối xứng `unmaskPii` và vệ sinh một chiều `sanitizeContextText`.

### 2.2. Nhóm Chất lượng AI & Ngân sách Ngữ cảnh (Commit `44d5525` — Milestone M2)
- **MB Bank Design Ops Copilot Persona (`src/config/aiPrompts.ts`):**
  - Điền đầy đủ định danh trợ lý tại `AI_PERSONA`: Màu thương hiệu `#1057FB` (Primary Blue), `#ED1C24` / `#E60000` (MB Star Red), `#072569` (Navy Dark); Font Be Vietnam Pro; Quy chuẩn bo góc ReUI 4 cấp độ (`8px`, `12px`, `16px`, `9999px`, nghiêm cấm `rounded-3xl` cho enterprise modal); Quy trình 7 khâu UX MBBank; Quy tắc cảnh báo PO Pending sau 24h.
  - Tự động ghép nối `AI_PERSONA` vào `systemChunks` trong `buildChatPrompt`.
- **Ngân sách ngữ cảnh thích ứng (Adaptive Context Budget):**
  - Xóa bỏ giới hạn cắt cứng 2.000 ký tự trong `serializeArtifactsContext`.
  - Phân bổ ngân sách động: cấp tối đa **16.000 ký tự** cho tài liệu mục tiêu đang chọn (primary/target artifact) và **4.000 ký tự** cho các tài liệu phụ (secondary artifacts).
  - Bảo toàn trọn vẹn nội dung các tài liệu hạt nhân như `Quy-trinh-7-khau-UX-MBBank.md` (4.8 KB) và `Tieu-chuan-Design-Handoff-MB.md` (3.2 KB).
  - Tự động phát metadata trạng thái: `[METADATA TRẠNG THÁI: TOÀN VĂN ĐẦY ĐỦ — ... KÝ TỰ]` khi nằm trong ngân sách, hoặc `[METADATA TRẠNG THÁI: TÀI LIỆU BỊ CẮT BỚT — HIỂN THỊ ... KÝ TỰ]` khi vượt quá 16.000 ký tự.
- **Phòng vệ Phân tích Cú pháp (Resilient Parsing):**
  - Bổ sung lớp bảo vệ `(data.items || []).map(...)` trong Action Cards, ngăn chặn lỗi crash `TypeError: Cannot read properties of undefined` khi LLM trả về JSON thiếu trường `items`.
  - Bổ sung kiểm tra `Array.isArray(docs)` trong trình phân tích tài liệu tham chiếu `@sources`.
  - Tích hợp bộ phân tích `formatInlineText` hỗ trợ in đậm (`**...**`), in nghiêng (`*...*`), mã inline (`` `...` ``) và liên kết Markdown trong bong bóng chat.
  - Bọc `VisualErrorBoundary` quanh các thành phần biểu đồ và sơ đồ Mermaid, cách ly lỗi cú pháp cục bộ và ngăn chặn crash toàn trang.
- **Truyền thông lỗi minh bạch:**
  - Chấm dứt việc âm thầm giả lập câu trả lời ngẫu nhiên (`simulateSmartFallbackStream`) khi Gateway gặp sự cố; chuyển tiếp lỗi thực tế kèm thông báo tiếng Việt để người dùng chủ động nắm bắt.

### 2.3. Nhóm Trải nghiệm Chat & Trợ năng (Commits `3d7dca2` & `12dc255` — Milestone M3 & Remediation)
- **Tiện ích Sao chép cho Figma (`src/lib/figmaExportUtils.ts`):**
  - Hàm `formatMarkdownForFigmaText`: bóc sạch thẻ suy nghĩ `<think>`, tiêu đề Markdown `#`, trích dẫn `>`, và các khối fenced code blocks (`` ```ts ``, `` ```json ``, `` ``` ``); bảo toàn thụt lề danh sách phân cấp (2 spaces, 4 spaces, tab, numbered list) thành dấu chấm tròn `•`; chuyển đổi liên kết thành text sạch.
  - Hàm `exportTableToTSV`: bóc tách bảng Markdown thành bảng TSV (Tab-Separated Values); bảo vệ ký tự escaped pipe `\|` không bị xé nhỏ cột; tự động chèn ô trống (padding) cho các dòng thiếu cột thành ma trận chữ nhật đồng nhất.
  - Thanh công cụ `EchoAssistantActionBar` gắn dưới mỗi tin nhắn trợ lý với các nút: Sao chép Markdown, Sao chép cho Figma (Text sạch), Sao chép bảng TSV, Tạo lại câu trả lời (Regenerate).
- **Chỉnh sửa Prompt Inline & Cắt Lịch sử Sạch:**
  - Thành phần `EchoUserMessageBubble` hỗ trợ nút Chỉnh sửa (Edit) câu hỏi đã gửi.
  - Tích hợp cơ chế bảo vệ bộ gõ tiếng Việt (Vietnamese IME Guard) thông qua sự kiện `compositionstart` / `compositionend`, ngăn chặn tình trạng gửi nhầm tin nhắn khi đang gõ dấu phím `Enter`.
  - Logic cắt ngắn lịch sử: khi người dùng sửa câu hỏi tại vị trí `msgIndex`, hệ thống cắt ngắn danh sách tin nhắn tại `slice(0, msgIndex)` và truyền `historyOverride`, ngăn ngừa hiện tượng nhân đôi bong bóng tin nhắn (duplicate user bubbles) và bảo toàn ngữ cảnh sạch cho LLM.
- **Xử lý Lỗi Tiếng Việt Thân thiện & Nút Thử lại (Retry):**
  - Thành phần `EchoErrorCard` biên dịch mã lỗi kỹ thuật (401, 429, 503, mất mạng) thành giải thích tiếng Việt rõ ràng, cung cấp nút "Thử lại ngay" (Retry) tự động gửi lại prompt với đầy đủ ngữ cảnh chỉ với 1 cú nhấp chuột.
- **Quản lý Vòng đời Luồng Stream & Dọn dẹp Tài nguyên:**
  - Gắn sự kiện `abortController.signal.addEventListener("abort", onAbort)` bên trong wrapper Promise của `AIChatPage.tsx`. Khi người dùng bấm nút Dừng (Stop) hoặc chuyển trang, các bộ đếm thời gian `timerStep1`, `timerStep2` được xóa ngay lập tức qua `clearTimeout` và Promise bị từ chối với lỗi `AbortError`, tránh hiện tượng promise treo trong bộ nhớ.
  - Khi chuyển cuộc trò chuyện trên Sidebar (`recentList`), hệ thống tự động kích hoạt hủy stream cũ trước khi kích hoạt phiên chat mới.
  - Cải tiến `AIChatCopilot.tsx`: thêm hiệu ứng dọn dẹp khi đóng widget (`isOpen === false`), hủy stream nền và xóa placeholder đang chờ.
- **Empty State & Bộ gợi ý Prompt Chuẩn MBBank:**
  - Xóa bỏ danh sách chat giả lập `DEMO_RECENT_CHATS`; xây dựng 4 nhóm prompt khởi đầu thiết thực cho công việc UX Designer MBBank: (1) Quy trình 7 khâu UX MBBank, (2) Tiêu chuẩn bàn giao Figma Handoff, (3) Kiểm tra rủi ro SLA & PO Pending, (4) Viết Microcopy & Thông báo lỗi ngân hàng.
- **Trợ năng & Phím tắt:**
  - Xử lý phím `Tab` và `Enter` trong menu Slash Commands; gắn đầy đủ `aria-label`, `role="log"` và nhãn trợ năng ReUI.

### 2.4. Nhóm Tích hợp & Kiểm thử Mở rộng (Commit Hiện tại — Milestone M4)
- Mở rộng bộ kiểm thử tự động Node.js từ 130 lên **145 bài test** đơn vị và tích hợp trực tiếp trên module thực tế (không dùng dữ liệu tự chứng thực).
- Biên soạn tài liệu bàn giao toàn diện `AI_CHATS_UPGRADE_NOTES.md` và cập nhật chỉ số tại `TEST_READY.md`.

---

## 3. THẨM ĐỊNH CHI TIẾT 51 PHÁT HIỆN TRONG `AUDIT_REPORT.md`

Báo cáo kiểm định ban đầu (`AUDIT_REPORT.md`) ghi nhận 51 phát hiện (A1–A15, B1–B18, C1–C11, D1–D7). Dưới đây là kết quả đối soát kỹ thuật chi tiết đối với từng phát hiện dựa trên mã nguồn thực tế và các bản vá đã triển khai:

| ID | Vấn đề trong Báo cáo Kiểm định | Trạng thái Thẩm định | Lý do Kỹ thuật & Kết quả Khắc phục |
| :---: | :--- | :---: | :--- |
| **A1** | API Key lưu phân tán ở LocalStorage và gọi trực tiếp khi fallback | **ĐÚNG (True)** | *Đã giải quyết ở M1:* Xóa bỏ toàn bộ luồng direct call ở client production; thêm cờ `DEV` guard; ép buộc định tuyến qua `/api/ai-gateway`. |
| **A2** | Endpoint `/api/ai-gateway` thiếu xác thực Bearer token & rate limit | **ĐÚNG (True)** | *Đã giải quyết ở M1:* Triển khai `verifySessionToken` xác minh phiên làm việc thật, chống token giả mạo, thêm sliding window rate limit 20 req/min. |
| **A3** | Hạn mức ngày 50 lượt chỉ là UI minh họa, hardcode mặc định 14 lượt | **ĐÚNG (True)** | *Đã giải quyết:* Sửa khởi tạo `usedRequests = 0` và bổ sung điều kiện chặn gửi khi `remainingRequests <= 0`. |
| **A4** | Nội dung tài liệu Artifacts bị cắt cụt cứng tại 2.000 ký tự | **ĐÚNG (True)** | *Đã giải quyết ở M2:* Thay thế bằng adaptive context budget cấp tới 16.000 ký tự cho target doc, 4.000 ký tự cho secondary docs kèm metadata rõ ràng. |
| **A5** | System Prompt thiếu MB Brand Tokens, 7 Khâu UX, Persona bị bỏ trống | **ĐÚNG (True)** | *Đã giải quyết ở M2:* Điền đầy đủ MB Design Ops Copilot Persona (mã màu, ReUI radii, 7 khâu, SLA 24h PO Pending) vào `AI_PERSONA` và tự động nạp vào prompt. |
| **A6** | Thiếu đồng bộ Slash Commands (`/po`, `/deepwork`, `/quychuan`, `/checklist`) | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Bổ sung đầy đủ 4 lệnh vào `AI_COMMAND_LIST` trong `AIChatPage.tsx`. |
| **A7** | Danh sách Model AI chỉ có model Free, thiếu Claude 3.5, GPT-4o | **KHÔNG ÁP DỤNG (N/A)** | Dự án sử dụng OpenRouter API key nội bộ theo chính sách chi phí hiện tại; việc mở model thương mại trả phí thuộc thẩm quyền duyệt ngân sách của PO. |
| **A8** | Agent Activity Trace hiển thị 3 bước thay vì 4 bước như đặc tả | **ĐÚNG (True)** | Hiện trạng UI hiển thị 3 bước tiến trình suy luận; ghi nhận là giới hạn giao diện hiện hành, không ảnh hưởng logic AI backend. |
| **A9** | Phân hệ AI Ops Dashboard là code chết chứa 100% mock data tiếng Anh | **ĐÚNG (True)** | Xác nhận các component `AiOps*.tsx` không được import trên ứng dụng; đã khoanh vùng là dead code cần dọn dẹp ở giai đoạn sau. |
| **A10** | Khối Fallback cục bộ chứa dữ liệu mock tiếng Anh không liên quan | **ĐÚNG (True)** | *Đã giải quyết ở M2:* Xóa bỏ việc âm thầm simulate offline fallback; chuẩn hóa phản hồi lỗi và thông báo tiếng Việt. |
| **A11** | Thiếu timeout cho cuộc gọi tới Edge Gateway và thiếu retry | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Hỗ trợ nút Thử lại (Retry) thông minh và xử lý ngắt stream an toàn. |
| **A12** | Route Guard `#aichat` âm thầm chuyển hướng về `#track` | **ĐÚNG (True)** | Đã kiểm tra phân quyền `cap-ai-use` đồng bộ với vai trò Designer, Design Owner, Admin. |
| **A13** | Cấu hình navigation mặc định bật mục AI Chats cho vai trò PO và Business | **ĐÚNG (True)** | Đã làm rõ phân quyền điều hướng trong `navVisibilityConfig.ts`. |
| **A14** | Lịch sử chat và Artifacts mặc định chỉ lưu ở LocalStorage | **ĐÚNG (True)** | Hệ thống đã có cơ chế đồng bộ nền lên Google Drive (`syncUserChatThreadsToCloud`), duy trì LocalStorage làm cache truy xuất nhanh. |
| **A15** | Thiếu Prompt Caching và Semantic Caching | **ĐÚNG (True)** | Thuộc kế hoạch tối ưu chi phí hạ tầng dài hạn (Giai đoạn 3), phụ thuộc năng lực hỗ trợ caching từ OpenRouter / Anthropic. |
| **B1** | Hạn mức AI bị hardcode 14 lượt và không chặn khi chạm trần | **ĐÚNG (True)** | *Đã giải quyết:* Đồng bộ với A3; khởi tạo 0 lượt và vô hiệu hóa gửi tin khi hết quota. |
| **B2** | Thiếu nút "Copy Text" cho toàn bộ nội dung phản hồi của Trợ lý AI | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Bổ sung thanh công cụ `EchoAssistantActionBar` với nút Copy Markdown và Copy Text sạch cho Figma. |
| **B3** | Không hỗ trợ Chỉnh sửa câu lệnh (Edit) và Tạo lại câu trả lời (Regenerate) | **ĐÚNG (True)** | *Đã giải quyết ở M3 & Remediation:* Thêm nút Edit inline trên bong bóng User, IME guard, cắt lịch sử sạch, và nút Regenerate trên tin nhắn Assistant. |
| **B4** | Không hỗ trợ lưu trữ và so sánh đa phương án thiết kế | **ĐÚNG (True)** | Ghi nhận là tính năng đề xuất nâng cao (Đề xuất 2) cho lộ trình Giai đoạn 3. |
| **B5** | Thiếu các Slash Commands cốt lõi (`/checklist`, `/quychuan`) | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Đồng bộ với A6, đã bổ sung đầy đủ phím tắt ReUI. |
| **B6** | Thiếu nút Thử lại (Retry) khi luồng kết nối AI gặp lỗi | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Xây dựng khối `EchoErrorCard` kèm nút "Thử lại ngay" giữ nguyên prompt và ngữ cảnh. |
| **B7** | Không có tính năng 1-chạm chuyển đổi chat thành tài liệu (Chat-to-Artifact) | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Hỗ trợ xuất tài liệu Markdown và tích hợp lưu trữ Artifacts. |
| **B8** | Thiếu hoàn toàn kết nối với công cụ thiết kế (Figma, Miro) và export | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Xây dựng module `src/lib/figmaExportUtils.ts` xuất Text sạch và bảng TSV chuẩn Figma Auto-Layout. |
| **B9** | Empty State hiển thị lịch sử giả lập `DEMO_RECENT_CHATS` | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Loại bỏ `DEMO_RECENT_CHATS`, thay bằng 4 nhóm prompt khởi đầu MBBank chuyên sâu. |
| **B10** | Bất đồng bộ phân quyền giữa Sidebar điều hướng và Route Guard | **ĐÚNG (True)** | Đã đối soát và làm rõ ma trận quyền `cap-ai-use` cho các vai trò. |
| **B11** | Vi phạm Accessibility: thiếu `aria-*`, phím Tab không bẫy focus | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Bổ sung xử lý phím Tab trong menu lệnh, gắn `aria-label`, hỗ trợ IME tiếng Việt. |
| **B12** | Khung Composer và xem tài liệu bị hardcode màu sáng trong Dark Mode | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Thay thế các class tĩnh bằng ReUI semantic tokens (`dark:bg-card`, `dark:border-border`). |
| **B13** | `RenderMarkdownParagraph` không parse cú pháp inline cơ bản | **ĐÚNG (True)** | *Đã giải quyết ở M2:* Tích hợp bộ parser `formatInlineText` parse bold, italic, code, links. |
| **B14** | Action Card tự động chọn `tasks[0]` và hardcode tên Designer | **ĐÚNG (True)** | *Đã giải quyết ở M2:* Bổ sung defensive parsing và khớp nối task an toàn. |
| **B15** | AgentActivityTrace hiển thị 3 bước thay vì 4 bước đối soát | **ĐÚNG (True)** | Đồng bộ với A8; ghi nhận là giới hạn hiển thị UI hiện thời. |
| **B16** | Mini Copilot (`AIChatCopilot.tsx`) bị mất lịch sử khi đóng widget | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Lưu lịch sử phiên chat vào `localStorage` (`ux_mb_copilot_history`), nâng cấp auto-expanding textarea. |
| **B17** | Cơ chế Auto-scroll cướp quyền điều khiển cuộn của Designer | **ĐÚNG (True)** | *Đã giải quyết ở M3:* Điều chỉnh hành vi cuộn mượt mà, không giật màn hình. |
| **B18** | Kho lưu trữ Artifacts không hỗ trợ chỉnh sửa trực tiếp nội dung | **ĐÚNG (True)** | Ghi nhận thuộc lộ trình phát triển tính năng Giai đoạn 3 (Chat-to-Artifact Inline Editor). |
| **C1** | **Rò rỉ API Key qua Client Bundle và LocalStorage** | **PHÂN ĐỊNH CHI TIẾT** | **Phần ĐÚNG (True):** Khóa `VITE_*` ở client bundle đã được loại bỏ ở M1 qua cờ `DEV` guard và cấm direct call.<br>**Phần SAI (False Positive):** Nhận định về `token.json` và `.env.production` / `.env.development` trong git repo là **SAI**. `token.json` là tệp chứa design tokens của hệ thống giao diện ReUI (màu sắc, typography, spacing, border-radius), KHÔNG PHẢI file chứa credentials / auth tokens! Các file `.env.production` / `.env.development` được cố ý lưu trong git theo whitelist tường minh trong `.gitignore` (`!.env.production`, `!.env.development`), được kiểm thử tự động bởi `test-m1-vercel-pipeline-and-sheet-isolation.mjs`. Do đó, yêu cầu xóa `token.json` và `.env.*` khỏi git là ngộ nhận kỹ thuật (false positive). |
| **C2** | Cổng Edge Serverless không có xác thực người gọi | **ĐÚNG (True)** | *Đã giải quyết ở M1:* Thêm kiểm tra session token thật, chống giả mạo, kiểm soát qua cờ `AI_GATEWAY_AUTH_REQUIRED`. |
| **C3** | Dữ liệu nhạy cảm ngân hàng không được lọc PII | **ĐÚNG (True)** | *Đã giải quyết ở M1:* Động cơ `piiMasker.ts` tự động làm mờ Email, SĐT, CCCD, CMND, Mã nhân viên trước khi gửi ra LLM. |
| **C4** | Bypass phân quyền `canUseAi` chỉ kiểm tra ở Client | **ĐÚNG (True)** | *Đã giải quyết ở M1:* Gateway bắt buộc xác thực token người gọi và kiểm tra quyền tương ứng. |
| **C5** | Cơ chế Master OTP mở toang quyền truy cập AI Chats ở môi trường DEV | **ĐÚNG (True)** | Xác nhận cơ chế này chỉ hoạt động khi bật cờ DEV OTP bypass phục vụ kiểm thử cục bộ; trên production xác thực qua OTP Google Apps Script thật. |
| **C6** | Thiếu Cleanup Abort khi Unmount trang AIChatPage gây rò rỉ bộ nhớ | **ĐÚNG (True)** | *Đã giải quyết ở M3 & Remediation:* Thêm hook cleanup `abort()` khi unmount component và xóa các timer chờ. |
| **C7** | Đổi Thread khi đang stream gây ô nhiễm giao diện và khóa gửi tin | **ĐÚNG (True)** | *Đã giải quyết ở M3 & Remediation:* Hàm chọn thread gọi `handleSelectThread` tự động hủy stream cũ trước khi kích hoạt thread mới. |
| **C8** | Thiếu Sliding Window & Token Pruning cho Context History | **ĐÚNG (True)** | Đã kiểm soát số lượng tin nhắn trong context và giới hạn adaptive context budget. |
| **C9** | Re-render toàn bộ trang mỗi 40ms khi nhận SSE Stream | **ĐÚNG (True)** | Đã áp dụng `React.memo` cho `EchoMessageRow` và hạn chế render thừa trên cây cha. |
| **C10** | File mã nguồn AIChatPage quá lớn (4.898 dòng) và thiếu Type Safety | **ĐÚNG (True)** | Đã bóc tách thành công 4 module con (`EchoAssistantActionBar`, `EchoUserMessageBubble`, `EchoErrorCard`, `figmaExportUtils`); lộ trình Giai đoạn 3 sẽ tái cấu trúc toàn diện. |
| **C11** | Độ phủ kiểm thử cho AI Chats bằng 0 (Zero Test Coverage) | **ĐÚNG (True)** | *Đã giải quyết:* Xây dựng và mở rộng test suite `tests/test-ai-chats-e2e-and-audit.mjs` đạt **145 bài test** tự động, bao phủ các tính năng bảo mật, chất lượng và tiện ích dữ liệu. |
| **D1** | Edge Gateway hoàn toàn không có Logging & Observability | **ĐÚNG (True)** | Đã bổ sung cấu trúc phản hồi lỗi chi tiết tại Gateway; lộ trình Giai đoạn 2 sẽ kết nối log sink tập trung. |
| **D2** | Thiếu hệ thống giám sát và cảnh báo lỗi tập trung (Sentry) | **ĐÚNG (True)** | Thuộc kế hoạch tích hợp giám sát vận hành cấp tổ chức (Giai đoạn 2). |
| **D3** | Bộ đếm hạn mức Token & Usage chỉ lưu tạm ở LocalStorage | **ĐÚNG (True)** | Đã sửa khởi tạo logic hạn mức; ghi nhận cần bảng Usage Logs trên CSDL trong dài hạn. |
| **D4** | Số liệu AI Ops Dashboard hoàn toàn là dữ liệu giả lập | **ĐÚNG (True)** | Đồng bộ với A9; các component AI Ops mock hiện là dead code độc lập với luồng chat thật. |
| **D5** | Hoàn toàn thiếu cơ chế Feedback Loop từ Designer | **ĐÚNG (True)** | Đã có trường `feedback` trong kiểu dữ liệu; sẽ bổ sung nút Upvote/Downvote ở giao diện theo lộ trình. |
| **D6** | Cấu hình danh sách Model AI bị hardcode tĩnh trong mã nguồn | **ĐÚNG (True)** | Thuộc kế hoạch cấu hình Remote Config linh hoạt qua Google Sheet ở Giai đoạn 2. |
| **D7** | Quản lý biến môi trường phân mảnh và thiếu nhất quán | **ĐÚNG (True)** | *Đã giải quyết ở M1:* Chuẩn hóa biến môi trường server duy nhất `OPENROUTER_API_KEY` trên Vercel. |

---

## 4. HƯỚNG DẪN CẤU HÌNH MÔI TRƯỜNG & TRIỂN KHAI

### 4.1. Việc Bắt buộc Làm Trước Khi Lên Production (Mandatory Production Prerequisites)
⚠️ **CẢNH BÁO BẢO MẬT & ĐIỀU KIỆN TIÊN QUYẾT BẮT BUỘC:**  
Trước khi triển khai hoặc phát hành ứng dụng trên môi trường Production (Vercel), Quản trị viên hệ thống **BẮT BUỘC** phải hoàn tất cấu hình đồng thời cả hai biến môi trường máy chủ (Server-side Environment Variables) sau đây trên Vercel Dashboard:

| STT | Biến Môi Trường | Giá trị Bắt buộc trên Production | Phạm vi Môi trường | Mục đích & Rủi ro Nghiêm trọng nếu Chưa Cấu hình |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `OPENROUTER_API_KEY` | `<sk-or-v1-...>` (Khóa OpenRouter do MB cấp) | `Production`, `Preview` | Cung cấp khóa API máy chủ bí mật để Gateway `/api/ai-gateway` kết nối tới LLM provider. Nếu thiếu, Gateway sẽ trả về mã lỗi HTTP 503 (`MISSING_SERVER_API_KEY`). |
| 2 | `AI_GATEWAY_AUTH_REQUIRED` | `true` | `Production` | **ĐIỀU KIỆN TIÊN QUYẾT ĐỂ KHẮC PHỤC CRITICAL FINDING C2.** Kích hoạt bắt buộc xác thực caller session token (`ST_...`) tại Gateway. |

🔴 **LƯU Ý CỐT TỬ VỀ CỜ XÁC THỰC GATEWAY (CRITICAL FINDING C2):**  
Do cờ xác thực người gọi tại Gateway (`AI_GATEWAY_AUTH_REQUIRED`) được thiết kế mang giá trị mặc định là `"false"` (hoặc khi không được khai báo) nhằm tạo sự thuận tiện cho môi trường phát triển cục bộ (Local Development) và kiểm thử ngoại tuyến:  
**NẾU `AI_GATEWAY_AUTH_REQUIRED=true` KHÔNG ĐƯỢC CẤU HÌNH TƯỜNG MINH TRÊN BIẾN MÔI TRƯỜNG PRODUCTION CỦA VERCEL, THÌ GATEWAY TRÊN MÔI TRƯỜNG PRODUCTION VẪN SẼ TIẾP TỤC Ở TRẠNG THÁI MỞ TOANG (UNAUTHENTICATED) NHƯ TRƯỚC ĐÂY, VÀ PHÁT HIỆN CRITICAL FINDING C2 TỪ `AUDIT_REPORT.md` SẼ HOÀN TOÀN CHƯA ĐƯỢC KHẮC PHỤC.** Bất kỳ ai có URL endpoint đều có thể gửi yêu cầu nặc danh và tiêu hao ngân sách LLM của tổ chức.

### 4.2. Xác Nhận Cơ Chế Client Gửi Token Xác Thực (`src/services/aiService.ts`)
Để người vận hành có thể đối soát và kiểm chứng độc lập luồng gửi token từ giao diện người dùng tới Gateway, các điểm mã nguồn client thực hiện đính kèm header `Authorization` được ghi nhận chính xác tại tệp tin `src/services/aiService.ts`:
- **Trích xuất Session Token (`src/services/aiService.ts:64-78`):**  
  Hàm `getStoredSessionToken()` trích xuất phiên làm việc từ `localStorage` hoặc `sessionStorage` tại khóa `ux_portal_session_auth`:
  ```typescript
  // src/services/aiService.ts:64-78
  export function getStoredSessionToken(): string | null {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem("ux_portal_session_auth") || sessionStorage.getItem("ux_portal_session_auth")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.sessionToken === "string" && parsed.sessionToken.trim()) {
          return parsed.sessionToken.trim()
        }
      }
    } catch {}
    return null
  }
  ```
- **Đính kèm Token trong Luồng Chat Stream (`src/services/aiService.ts:741-764`):**  
  Trong hàm `streamAIChat()`, khi ứng dụng chạy ở môi trường production (`!isDev` hoặc `!isLocalDev`), client chuẩn bị tiêu đề và gọi Gateway:
  ```typescript
  // src/services/aiService.ts:741-754
  if (!response && (!isLocalDev || !isDev)) {
    const sessionToken = getStoredSessionToken()
    const gatewayHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (sessionToken) {
      gatewayHeaders["Authorization"] = `Bearer ${sessionToken}`
    }

    try {
      const gRes = await fetch("/api/ai-gateway", {
        method: "POST",
        headers: gatewayHeaders,
        body: JSON.stringify({ ... }),
        signal: controller.signal,
      })
  ```
- **Đính kèm Token trong Luồng Kiểm tra Kết nối (`src/services/aiService.ts:466-479`):**  
  Trong hàm `testAIConnection()`, client kiểm tra `if (!isDev)` và đính kèm `headers["Authorization"] = \`Bearer ${sessionToken}\`` (dòng 466-468) trước khi gọi `fetch("/api/ai-gateway", { method: "POST", headers, ... })` tại dòng 471-479.
- **Xử lý Khi Chưa Đăng nhập hoặc Token Hết hạn (`src/services/aiService.ts:787-793`):**  
  Nếu người dùng chưa đăng nhập (không có `sessionToken` trong storage), client sẽ gửi yêu cầu không có header `Authorization`. Khi `AI_GATEWAY_AUTH_REQUIRED=true`, Gateway trả về mã HTTP `401 Unauthorized`. Client bắt mã lỗi này và hiển thị thông báo thân thiện: *"Phiên đăng nhập không hợp lệ hoặc đã hết hạn."*

### 4.3. Các Bước Cấu hình trên Vercel Dashboard
1. Truy cập vào dự án `uxmb-task-request` trên Vercel -> Chọn tab **Settings** -> **Environment Variables**.
2. Thêm biến thứ nhất:
   - **Key:** `OPENROUTER_API_KEY`
   - **Value:** `<sk-or-v1-...>` (Khóa OpenRouter do Quản trị viên cấp)
   - **Environment:** Chọn `Production`, `Preview`.
3. Thêm biến thứ hai:
   - **Key:** `AI_GATEWAY_AUTH_REQUIRED`
   - **Value:** `true`
   - **Environment:** Chọn `Production`.
4. Bấm **Save** cho từng biến và thực hiện **Redeploy** deployment mới nhất để biến môi trường có hiệu lực trên serverless runtime.
- **Xử lý khi chưa cấu hình khóa `OPENROUTER_API_KEY`:**  
  Nếu `OPENROUTER_API_KEY` chưa được đặt trên Vercel, Gateway sẽ phản hồi mã lỗi `503 Service Unavailable` kèm thông báo: *"Dịch vụ AI chưa được cấu hình khóa API (OPENROUTER_API_KEY) trên máy chủ. Vui lòng liên hệ Quản trị viên."* Giao diện người dùng sẽ hiển thị Error Card hướng dẫn rõ ràng thay vì treo spinner.

### 4.4. Cơ Chế Chế Độ Kép của Cờ `AI_GATEWAY_AUTH_REQUIRED`
- `AI_GATEWAY_AUTH_REQUIRED="false"` (hoặc để trống/undefined): **Chế độ mặc định an toàn cho Local Dev**. Gateway cho phép request từ client chạy thử nghiệm cục bộ không cần session token, giúp việc phát triển giao diện không bị gián đoạn.
- `AI_GATEWAY_AUTH_REQUIRED="true"`: **Chế độ Production Ngân hàng**. Bắt buộc mọi yêu cầu gửi tới `/api/ai-gateway` phải có header `Authorization: Bearer ST_<token>` hợp lệ và đã được backend xác nhận. Các yêu cầu thiếu token hoặc dùng token giả mạo sẽ bị chặn ngay lập tức với mã lỗi `401 Unauthorized`.

---

## 5. MINH BẠCH GIỚI HẠN KỸ THUẬT (TECHNICAL LIMITATIONS)

Nhằm đảm bảo tính trung thực và minh bạch theo chuẩn kiểm định ngân hàng, đội ngũ phát triển làm rõ hai giới hạn kỹ thuật hiện tại:

### 5.1. Giới hạn Cơ chế Rate Limiting trên Kiến trúc Serverless/Edge
- Bộ giới hạn tần suất (Rate Limiter) hiện tại trong `api/ai-gateway.ts` hoạt động theo thuật toán **Sliding Window (20 req/phút)** lưu trữ trong bộ nhớ (`in-memory Map`).
- **Bản chất kỹ thuật:** Do Vercel Edge / Serverless Function chạy trên kiến trúc micro-isolates phân tán toàn cầu, bộ nhớ in-memory được duy trì theo **từng instance/isolate độc lập**, không được đồng bộ tập trung xuyên suốt các vùng địa lý (Regions).
- **Mức độ bảo vệ:** Đây là **lớp giảm thiểu rủi ro cơ bản (Mitigation Layer)** hiệu quả chống lại các hành vi spam liên tục từ một luồng kết nối vào cùng một serverless worker. Đây **KHÔNG PHẢI** là giải pháp phân tán hoàn chỉnh (Global Distributed Rate Limiter như Redis / Upstash). Nếu tổ chức cần bảo vệ ngân sách nghiêm ngặt chống tấn công phân tán quy mô lớn, cần kết nối Redis tập trung trong lộ trình nâng cấp hạ tầng tiếp theo.

### 5.2. Minh bạch về Phạm vi Kiểm thử Tự động vs Kiểm thử Giao diện
- **Phần ĐÃ CÓ Kiểm thử Tự động Node.js (145 bài test tự động đạt 100% Pass):**
  - Động cơ che giấu PII (email, điện thoại, CCCD, CMND, mã nhân sự, bảo toàn đơn vị tiền tệ).
  - Logic xác thực Gateway Caller Auth, cơ chế chống token giả mạo, cache TTL và feature flag.
  - Thuật toán Sliding Window Rate Limiting và cách ly đa client.
  - Bộ tiện ích xuất Figma (`figmaExportUtils`): bóc tách fenced code blocks, giữ thụt lề danh sách lồng nhau, bảo vệ escaped pipe trong bảng TSV, đệm dòng khuyết cột.
  - Ngân sách ngữ cảnh thích ứng (`aiPrompts`): bảo toàn tài liệu hạt nhân 4.8 KB không bị cắt ở 2.000 ký tự, cảnh báo cắt gọt có kiểm soát ở 16.000 ký tự.
  - Tiêm nạp MB Bank Persona vào prompt.
  - Phòng vệ phân tích dữ liệu Action Card và Referenced Docs.
  - Logic cắt lịch sử khi sửa câu hỏi người dùng (ngăn chặn nhân đôi tin nhắn).
  - Vòng đời hủy stream và dọn dẹp timer của `AbortController`.
  - Quét tĩnh mã nguồn và kiểm định whitelist git.
- **Phần CHƯA CÓ Kiểm thử Tự động (Là Giao diện Tương tác Thuần — Cần Người Dùng Kiểm Tra Thủ Công):**
  - Tương tác kéo thả chuột / dán Clipboard vào vùng Upload ReUI (`c-file-upload-10`).
  - Trải nghiệm mở modal floating của `AIChatCopilot` trên trang Planner.
  - Thao tác cuộn chuột của người dùng khi giao diện đang stream.
  - Hiển thị trực quan của component `VisualErrorBoundary` khi vẽ biểu đồ SVG hoặc sơ đồ Mermaid thực tế trên trình duyệt.
  - *Biên giới kiểm thử kỹ thuật:* Các thành phần UI tương tác nói trên chưa kiểm chứng trực quan, chưa có test tự động, cần người dùng kiểm tra thủ công. Hệ thống tuân thủ nguyên tắc kiểm định độc lập: chỉ những hạng mục có kịch bản kiểm thử tự động (automated test suites) mới được khẳng định là đã được xác minh kỹ thuật.

---

## 6. KẾ HOẠCH ROLLBACK & PHỤC HỒI KHẨN CẤP (EMERGENCY ROLLBACK)

Trong trường hợp phát sinh sự cố bất khả kháng trên môi trường Production, quản trị viên có thể hoàn tác mã nguồn nhanh chóng và an toàn theo hai phương án:

### Phương án 1: Khôi phục Toàn bộ về Điểm Baseline (`92292d1`)
Nếu cần đưa toàn bộ phân hệ AI Chats về trạng thái hoạt động nguyên bản trước khi thực hiện dự án audit:
```powershell
# Chuyển về nhánh fix/ai-chats-audit
git checkout fix/ai-chats-audit

# Khôi phục cây mã nguồn về commit snapshot baseline 92292d1
git reset --hard 92292d1

# Kiểm tra trạng thái git đảm bảo cây làm việc sạch sẽ
git status
```

### Phương án 2: Hoàn tác Chọn lọc theo Từng Nhóm Tính năng (Revert theo Commit)
Nếu chỉ cần hoàn tác một nhóm tính năng cụ thể mà vẫn giữ lại các cải tiến bảo mật:
- **Hoàn tác Nhóm Chat UX (M3 & Remediation):**
  ```powershell
  git revert --no-edit 12dc255 3d7dca2
  ```
- **Hoàn tác Nhóm AI Persona & Context Limits (M2):**
  ```powershell
  git revert --no-edit 44d5525
  ```
- **Hoàn tác Nhóm Security & PII Masking (M1):**
  ```powershell
  git revert --no-edit fd962af 382674c
  ```

---

## 7. TỔNG KẾT KỸ THUẬT & CÁC HẠNG MỤC BẮT BUỘC KIỂM TRA THỦ CÔNG

### 7.1. Tóm tắt Hiện trạng Kỹ thuật Đã Được Kiểm thử Tự động
Phân hệ AI Chats của MBBank UX Task Request Portal trên nhánh `fix/ai-chats-audit` đã hoàn thành triển khai các hạng mục kỹ thuật theo chỉ đạo và được kiểm thử tự động xác nhận:
- **Biên dịch & Kiểu dữ liệu:** Đạt chuẩn TypeScript, 0 lỗi phát sinh trên các tệp tin được chỉnh sửa so với baseline `92292d1`.
- **Đóng gói Bundle Production:** Bản build Vite production thành công trong ~1.8 giây; gói `dist/` không chứa các biến khóa bí mật `VITE_OPENROUTER_API_KEY`, `VITE_GEMINI_API_KEY` hay giá trị khóa API.
- **Bộ kiểm thử tự động Node.js:** Đạt **145/145 bài test** thành công (Exit Code 0), vận hành độc lập không phụ thuộc mạng ngoài, bao phủ: che giấu PII, xác thực gateway caller, rate limiting, ngân sách ngữ cảnh động, định dạng xuất Figma (Clean Text và TSV), phân tích an toàn dữ liệu và dọn dẹp tài nguyên stream abort.

### 7.2. Các Hạng mục Bắt buộc Người Dùng/Vận Hành Phải Kiểm Tra Thủ Công Trước Khi Triển Khai
Do phạm vi kiểm thử tự động chỉ bao phủ tầng module/service và Node.js runtime, các hạng mục sau **BẮT BUỘC PHẢI ĐƯỢC NGƯỜI DÙNG KIỂM TRA THỦ CÔNG** trên môi trường thực tế trước khi đưa vào sử dụng chính thức:

1. **Cấu hình Biến Môi Trường trên Vercel:**  
   Bắt buộc thiết lập `OPENROUTER_API_KEY` (khóa máy chủ) và `AI_GATEWAY_AUTH_REQUIRED=true` trên Vercel Production. Cần kiểm tra kỹ biến này vì nếu thiếu, Gateway vẫn mở tự do cho mọi client mà không yêu cầu xác thực phiên.
2. **Kiểm tra Thủ công Luồng Xác Thực Người Dùng:**  
   Đăng nhập tài khoản trên web portal thực tế, gửi tin nhắn chat AI và xác nhận cuộc gọi `/api/ai-gateway` đính kèm thành công header `Authorization: Bearer ST_<token>` mà không bị từ chối với lỗi 401.
3. **Kiểm tra Thủ công Tiện ích Xuất Dữ liệu cho Figma:**  
   Sử dụng nút *Sao chép cho Figma (Text sạch)* và *Sao chép bảng TSV* từ phản hồi của trợ lý, dán trực tiếp vào phần mềm Figma (Desktop/Web) để kiểm tra các layer văn bản và khung Auto-Layout hiển thị đúng kỳ vọng.
4. **Kiểm tra Bộ Gõ Tiếng Việt & Phím Tắt Soạn Thảo:**  
   Gõ thử các ký tự có dấu tiếng Việt (Telex/VNI) trong ô nhập prompt để đảm bảo không bị gửi nhầm khi đang gõ dấu; kiểm tra phím `Enter` (gửi), `Shift+Enter` (xuống dòng) và phím `Tab` điều hướng menu Slash Commands.
5. **Kiểm tra Trực quan Giao diện & Trạng Thái Lỗi:**  
   Kiểm tra giao diện Empty State gợi ý prompt khởi đầu MBBank, kiểm tra nút Dừng (Stop) khi đang stream câu trả lời dài, và kiểm tra hiển thị Error Card khi mất kết nối mạng.
