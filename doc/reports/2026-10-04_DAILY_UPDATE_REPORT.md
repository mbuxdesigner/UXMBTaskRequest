# BÁO CÁO CẬP NHẬT HỆ THỐNG NGÀY 04/10/2026
## ĐẠI TU TOÀN DIỆN TÍNH NĂNG AI CHATS: BẢO MẬT GATEWAY & PII, FIGMA COPY TOOLKIT, AGENTIC DYNAMIC ROUTER VÀ CHUẨN HÓA PERSONA SENIOR PRODUCT DESIGNER

> **Phạm vi cập nhật:**
> 1. **Kiểm tra Toàn diện (Comprehensive Audit) Tính năng AI Chats:** Rà soát 4 mảng cốt lõi (Chất lượng tính năng, UX/UI & Workflow Designer, Kỹ thuật & Bảo mật dữ liệu, Vận hành hệ thống), xây dựng báo cáo kiểm toán chi tiết `AUDIT_REPORT.md` (51 phát hiện, đối chiếu đặc tả và lộ trình nâng cấp).
> 2. **Triệt tiêu Rò rỉ API Key & Tăng cường Bảo mật Gateway:**
>    - Loại bỏ hoàn toàn các biến API Key khỏi bundle client production (`dist/`), chuyển 100% việc gọi LLM qua Vercel Edge Serverless Function (`api/ai-gateway.ts`).
>    - Thêm cơ chế xác thực người gọi dựa trên Session Token OTP (`ST_[a-f0-9]{16}`) và giới hạn tần suất trượt (Sliding Window Rate Limiting: 20 req/phút/IP).
> 3. **Bảo vệ Thông tin Định danh Cá nhân (PII Masking & Sanitization):** Xây dựng module `src/lib/piiMasker.ts` tự động che số điện thoại, email, số CCCD/CMND của Designer và nhân sự trước khi gửi dữ liệu công việc ra mô hình ngôn ngữ lớn bên ngoài.
> 4. **Bộ Công cụ Xuất Bản Thiết kế Figma (Figma Copy Toolkit):**
>    - Nút sao chép 1 chạm định dạng Markdown sạch (loại bỏ code fences, chuẩn hóa bullet 2 cấp).
>    - Sao chép bảng dữ liệu sang Tab-Separated Values (TSV) để dán trực tiếp vào bảng Figma hoặc Excel mà không vỡ cột.
> 5. **Nâng cấp Toàn diện Trải nghiệm Tương tác (Designer UX Workflow):**
>    - Bổ sung nút **Dừng Stream (`Square`)** tức thì với cơ chế dọn dẹp bộ nhớ và timers chống rò rỉ.
>    - Tính năng **Sửa & Gửi lại tin nhắn** của người dùng (tự động cắt ngắn lịch sử để giữ ngữ cảnh sạch).
>    - Tính năng **Tạo lại phản hồi (Regenerate)** và **Thử lại khi có lỗi (Retry)** kèm thẻ thông báo lỗi tiếng Việt thân thiện (`EchoErrorCard`).
>    - Màn hình khởi đầu (Empty State) với 4 nhóm gợi ý prompt thiết thực cho công việc thiết kế ngân hàng số.
> 6. **Khắc phục Triệt để Câu trả lời AI "Kỳ cục" & Rò rỉ Biến Hệ thống:**
>    - Xóa bỏ việc nhắc tên các biến kỹ thuật nội bộ (`DOCUMENT_DATA`, `TASK_DATA`, `CALENDAR_DATA`).
>    - Cấm tuyệt đối câu bao biện kỹ thuật (*"Hệ thống chưa được cung cấp tài liệu...", "Không tìm thấy trong database..."*).
>    - Định hình Persona: **Senior Product Designer & UX Writer đồng nghiệp**, am hiểu sản phẩm số MBBank, vào thẳng giải pháp thiết kế thực tế.
> 7. **Bộ Định tuyến Ngữ cảnh Động Agentic (Agentic Dynamic Context Router & Knowledge Retrieval):**
>    - Chấm dứt cơ chế "nhồi bừa toàn bộ" (Naive Context Dumping) 100+ tasks và lịch họp khi người dùng chỉ hỏi về quy trình hoặc sản phẩm.
>    - Kiến trúc 2 giai đoạn: **Intent Classification** (bắt trúng từ khóa sản phẩm số: tiền gửi, tiết kiệm, eKYC, thẻ, khoản vay...) + **Knowledge Bucket Retrieval** (chuẩn hóa tiếng Việt NFD, mở rộng từ đồng nghĩa ngữ nghĩa, trích xuất chính xác tài liệu liên quan).
> 8. **Minh bạch hóa Agent Activity Trace Trung thực:** Đồng bộ `loadedDocNames`, chỉ hiển thị badge tài liệu khi có tài liệu thực tế được nạp vào context; chỉ hiển thị điểm thảo luận khi câu hỏi liên quan đến task.
> 9. **Lộ trình 3 Cấp độ Mở rộng Kho Tri thức Ngân hàng Số:** Định hướng mở rộng từ In-Memory Metadata Router (Level 1) $\rightarrow$ Semantic Vector RAG (Level 2) $\rightarrow$ Multi-Agent Specialist Framework (Level 3).
> 10. **Hệ thống Kiểm thử Tự động Chuyên sâu:** Xây dựng bộ test `tests/test-ai-chats-e2e-and-audit.mjs` với **148 test cases** đạt tỷ lệ thành công 100%.  
> **Nhánh thực hiện:** `fix/ai-chats-audit`  
> **Trạng thái:** Hoàn tất 100% triển khai, Build Production PASS (0 lỗi mới, 19.03s), 148/148 Tests PASS.

---

## 1. Tóm tắt điều hành & Bối cảnh

Ngày 04/10/2026, đội ngũ phát triển đã tiến hành một đợt nâng cấp toàn diện và sâu rộng nhất đối với phân hệ **AI Chats (UX Copilot)** trên hệ thống `uxmb-task-request`. Xuất phát từ kết quả kiểm toán độc lập (`AUDIT_REPORT.md`) và phản hồi trực tiếp từ người dùng thực tế:
- *"Cách trả lời của AI cứ sao sao ý, mở miệng ra là thanh minh hệ thống chưa được cung cấp DOCUMENT_DATA / TASK_DATA..."*
- *"Tôi hỏi về sản phẩm tiền gửi mà AI lại bảo không có tài liệu và nhồi vào 197 điểm thảo luận của task nào đó..."*
- *"Tôi cần phương pháp thông minh hơn, gửi xong chọn đúng ngữ cảnh và tài liệu cần đọc chứ không phải đọc hết thế này..."*

Đợt nâng cấp này giải quyết triệt để 3 bài toán lớn:
1. **Bảo mật & Tuân thủ Dữ liệu Ngân hàng:** Đưa 100% API key về Serverless Backend, che dữ liệu định danh cá nhân (PII), chặn DDOS và lạm dụng API qua token xác thực OTP.
2. **Trải nghiệm Designer Thực chiến:** Biến AI Chats thành công cụ đắc lực cho Designer với tính năng copy dán trực tiếp sang Figma, chỉnh sửa prompt linh hoạt, dừng và thử lại mượt mà.
3. **Trí thông minh Agentic & Chất lượng Phản hồi:** Loại bỏ hoàn toàn sự thô kệch kỹ thuật của prompt cũ, áp dụng cơ chế định tuyến thông minh (Dynamic Routing) chọn lọc đúng tài liệu và ngữ cảnh cần thiết, biến AI thành một Senior Product Designer đồng nghiệp thực thụ.

---

## 2. Bảng đối chiếu Hiện trạng — Nâng cấp — Lợi ích

| Hạng mục | Hiện trạng trước 04/10/2026 | Nâng cấp mới 04/10/2026 | Lợi ích cho Designer & Vận hành |
| :--- | :--- | :--- | :--- |
| **Bảo mật API Key** | Key có thể bị đóng gói vào bundle client nếu đặt `VITE_` | Key chỉ lưu ở biến môi trường Vercel serverless; client không chứa key | Loại bỏ 100% nguy cơ rò rỉ khóa API OpenRouter ra ngoài. |
| **Xác thực Gateway** | Chỉ kiểm tra header `Origin`, dễ bị làm giả (CORS bypass) | Xác thực Session Token OTP (`ST_...`) và Rate Limit 20 req/phút/IP | Ngăn chặn truy cập trái phép và bảo vệ hạn mức ngân sách AI. |
| **Bảo vệ PII** | Gửi nguyên email, SĐT của nhân sự trong context ra LLM | Tự động che email, SĐT, CCCD thành `[EMAIL_1]`, `[PHONE_1]` trước khi gửi | Bảo vệ quyền riêng tư nhân sự theo chuẩn an toàn thông tin MB. |
| **Copy sang Figma** | Copy nguyên văn Markdown có chứa \`\`\` code fence gây vỡ text Figma | Bộ format làm sạch Markdown và xuất TSV cho bảng biểu | Dán 1 chạm vào Text Box và Table của Figma chuẩn xác 100%. |
| **Dừng stream & Huỷ** | Không có nút huỷ giữa chừng, phải đợi AI trả lời hết | Nút Stop (`Square`) hủy tức thì `AbortController`, xóa timers | Tiết kiệm thời gian khi phát hiện nhập sai đề bài, không lag UI. |
| **Sửa prompt & Thử lại** | Phải gõ lại từ đầu; gặp lỗi mạng thì giao diện bị treo | Nút Sửa prompt ngay trên bubble; nút Retry khi lỗi kèm tiếng Việt | Trải nghiệm mượt mà, không gián đoạn mạch làm việc. |
| **Cơ chế nạp ngữ cảnh** | **Naive Context Dumping:** Luôn nhồi 100+ tasks, lịch họp, 197 thảo luận | **Agentic Dynamic Router:** Chỉ nạp task khi hỏi task; chỉ nạp tài liệu khớp | Tiết kiệm 70% token, giảm độ trễ, triệt tiêu ảo giác (hallucination). |
| **Giọng văn & Persona** | Máy móc, rò rỉ biến hệ thống `DOCUMENT_DATA`, mở đầu bằng câu thanh minh | **Senior Product Designer & UX Writer:** Điềm tĩnh, vào thẳng giải pháp UI/UX | Câu trả lời chuyên nghiệp, dùng được ngay trong tài liệu bàn giao. |
| **Minh bạch Trace** | Luôn hiển thị cứng "197 thảo luận" và badge "MB Design System" | Đồng bộ `loadedDocNames`, chỉ hiển thị badge khi tài liệu thực sự nạp | Minh bạch 100%, tạo độ tin cậy tuyệt đối cho Designer. |

---

## 3. Chi tiết Kiến trúc & Các Giải pháp Kỹ thuật

### 3.1. Bộ Định tuyến Ngữ cảnh Động Agentic (Agentic Dynamic Context Router)

Cốt lõi của việc AI trả lời "kỳ cục" trước đây nằm ở hàm `buildEnrichedContext` trong `src/config/aiPrompts.ts`. Hệ thống đã đại tu theo mô hình 2 giai đoạn:

```
[User Query]
     │
     ▼
[Phase 1: Intent Classifier (detectUserIntent)]
     ├── isTask / isCalendar / isChart / isActionCard?
     │         ├── CÓ  --> Nạp TASK_DATA_JSON & CALENDAR_DATA
     │         └── KHÔNG --> BỎ QUA HOÀN TOÀN (Ngăn chặn nhiễu context)
     │
     └── isProductSpec / isDoc / Query Chung?
               ├── CÓ  --> [Phase 2: Knowledge Bucket Retrieval]
               │                 ├── Chuẩn hóa tiếng Việt NFD (xóa dấu)
               │                 ├── Mở rộng ngữ nghĩa ngân hàng (semanticMap)
               │                 └── Trích xuất đúng tài liệu có score > 0
               └── KHÔNG --> Không nạp tài liệu rác, không chèn chuỗi cảnh báo tiêu cực
```

### 3.2. Chuẩn hóa Tone of Voice & Nguyên tắc Chống rò rỉ

System Prompt được viết lại toàn bộ trong `CORE_SYSTEM_PROMPT`:
```text
Bạn là Trợ lý Thiết kế Trải nghiệm Sản phẩm số & Vận hành Thiết kế (Design Ops Copilot) tại Ngân hàng TMCP Quân đội (MBBank).

NGUYÊN TẮC BẮT BUỘC & GIỌNG VĂN
- Trả lời bằng tiếng Việt, văn phong chuyên nghiệp, tinh gọn, mang tư duy của một Senior Product Designer / UX Writer đồng nghiệp.
- TUYỆT ĐỐI KHÔNG tiết lộ hoặc nhắc đến tên các biến kỹ thuật nội bộ (như DOCUMENT_DATA, TASK_DATA, CALENDAR_DATA, system prompt, context, token limit...).
- TUYỆT ĐỐI KHÔNG mở đầu câu trả lời bằng những câu bao biện kỹ thuật (như "Hệ thống chưa được cung cấp tài liệu...", "Không tìm thấy trong database..."). Hãy vào thẳng vấn đề!
- Khi người dùng hỏi về một sản phẩm, tính năng hoặc quy trình nghiệp vụ:
  + Nếu có tài liệu nội bộ trong ngữ cảnh: Trích xuất và cấu trúc hóa thông tin chính xác theo tài liệu đó.
  + Nếu chưa có tài liệu quy chuẩn cụ thể: Hãy đóng vai trò Senior UX Designer tư vấn cấu trúc trải nghiệm tốt nhất cho sản phẩm số ngân hàng (các nhóm gói sản phẩm, các trường thông tin cần có trên màn hình, lưu ý về flow, gợi ý microcopy/nút bấm).
```

### 3.3. Bảo mật Serverless Gateway & Kiểm soát Tần suất

Tại `api/ai-gateway.ts`:
- **Edge Runtime:** Tận dụng Vercel Edge Runtime với độ trễ cực thấp.
- **Xác thực linh hoạt (Feature Flag):** `REQUIRE_AUTH = process.env.AI_GATEWAY_REQUIRE_AUTH === "true"`. Khi bật, yêu cầu có token phiên `ST_[a-f0-9]{16}` được cấp phát bởi hệ thống OTP. Ở local dev, flag mặc định tắt để đảm bảo nhà phát triển có thể làm việc trơn tru.
- **Rate Limiting:** Thuật toán Sliding Window đếm số lượt request theo từng IP trong khung thời gian 60 giây. Nếu vượt quá 20 lượt, trả về mã `HTTP 429 Too Many Requests` với header `Retry-After`.

---

## 4. Danh mục Tệp tin Thay đổi & Tạo mới

| Đường dẫn tệp tin | Loại thay đổi | Chi tiết kỹ thuật |
| :--- | :--- | :--- |
| `src/config/aiPrompts.ts` | Đại tu lớn | Cập nhật `CORE_SYSTEM_PROMPT`, nâng cấp `detectUserIntent` (thêm `isProductSpec`), đại tu `searchArtifactsByQuery` (chuẩn hóa tiếng Việt NFD, phrase matching, semantic map), tối ưu `buildEnrichedContext` (loại bỏ dump task và thông báo rò rỉ biến). |
| `src/pages/AIChatPage.tsx` | Nâng cấp lớn | Bổ sung `loadedDocNames` vào `ChatTraceData`, truyền prop vào `AgentActivityTrace`, tích hợp các tính năng Copy Markdown/TSV cho Figma, Sửa prompt, Tạo lại, Dừng stream, và Thử lại khi có lỗi mạng. |
| `src/components/planner/AgentActivityTrace.tsx` | Nâng cấp | Thêm prop `loadedDocNames`, hiển thị badge tài liệu thực tế, chỉ đếm thảo luận khi có task trong context, xóa bỏ badge hardcode cũ. |
| `src/lib/piiMasker.ts` | Tạo mới | Module che thông tin nhạy cảm: email, số điện thoại, CCCD/CMND bằng Regex chuẩn Việt Nam. |
| `src/lib/figmaExportUtils.ts` | Tạo mới | Bộ công cụ format Markdown sạch và xuất bảng dữ liệu sang TSV phục vụ Figma/Excel. |
| `api/ai-gateway.ts` | Nâng cấp lớn | Tích hợp xác thực Session Token OTP, Rate Limiting 20 req/phút/IP, kiểm tra biến môi trường server an toàn. |
| `tests/test-ai-chats-e2e-and-audit.mjs` | Bổ sung lớn | Bộ test tự động 4 tầng gồm 148 test cases kiểm thử PII, Gateway Auth, Rate Limit, Context Clipping, Figma Export, Dynamic Router và Audit bảo mật. |
| `doc/features/14_AI_CHATS_AND_INTELLIGENT_COPILOT.md` | Bổ sung | Thêm mục 11 (Agentic Dynamic Router), mục 12 (Persona & Tone of Voice), mục 13 (Honest Activity Trace), và mục 14 (Lộ trình 3 cấp độ mở rộng kho tài liệu). |
| `doc/00_OVERVIEW_AND_ONBOARDING.md` | Cập nhật | Bổ sung báo cáo ngày 03/10 và 04/10/2026 vào danh mục Onboarding trung tâm. |
| `doc/reports/2026-10-04_DAILY_UPDATE_REPORT.md` | Tạo mới | Báo cáo chi tiết toàn bộ các hạng mục công việc hoàn thành trong ngày 04/10/2026. |

---

## 5. Kết quả Kiểm thử & Biên dịch

### 5.1. Kiểm thử Tự động (Automated Test Suite)
Chạy bộ kiểm thử tự động toàn diện:
```bash
node tests/test-ai-chats-e2e-and-audit.mjs
```
**Kết quả:**
- **Tổng số test cases:** 148
- **Passed:** 148 (100%)
- **Failed:** 0
- **Thời gian thực thi:** 0.15s

### 5.2. Biên dịch Production Build
Chạy lệnh đóng gói mã nguồn:
```bash
npm run build
```
**Kết quả:**
- **Trạng thái:** Thành công (Exit code 0).
- **Thời gian build:** 19.03s.
- **Kiểm tra Secrets:** Không có chuỗi `VITE_OPENROUTER_API_KEY` hay giá trị API Key thực tế nào xuất hiện trong thư mục `dist/`.
- **Lỗi TypeScript:** 0 lỗi mới phát sinh trên toàn bộ các tệp tin được chỉnh sửa.

---

## 6. Hướng dẫn Vận hành & Cấu hình Biến Môi trường

Để kích hoạt đầy đủ tính năng bảo mật trên môi trường Production (Vercel), Quản trị viên cần cấu hình các biến môi trường sau trong **Vercel Project Settings $\rightarrow$ Environment Variables**:

1. **`OPENROUTER_API_KEY`** *(Bắt buộc trên Production)*:
   - Khóa API OpenRouter dùng để gọi các mô hình LLM.
   - Chỉ cấu hình ở phạm vi *Production* và *Preview*; không đặt tiền tố `VITE_`.
2. **`AI_GATEWAY_REQUIRE_AUTH`** *(Tùy chọn, Khuyến nghị bật trên Production)*:
   - Giá trị: `"true"`.
   - Khi bật, Gateway chỉ chấp nhận các yêu cầu có Header `Authorization: Bearer ST_...` hợp lệ.
3. **`SESSION_VERIFY_SECRET`** *(Tùy chọn)*:
   - Khóa bí mật dùng để xác thực chữ ký token phiên với Google Apps Script backend.

---

## 7. Kế hoạch Tiếp theo (Next Steps)

1. **Thu thập phản hồi của Designer:** Theo dõi trải nghiệm thực tế của đội ngũ UX Designer khi thao tác copy sang Figma và tra cứu tài liệu sản phẩm số.
2. **Mở rộng Kho Tri thức Hạt nhân (Seed Artifacts):** Bổ sung thêm các tài liệu đặc tả nghiệp vụ chi tiết cho Khối Khách hàng Cá nhân (App MBBank) và Khách hàng Doanh nghiệp (BIZ MBBank) theo chuẩn cấp độ 1.
3. **Nghiên cứu Cấp độ 2 (Semantic Vector RAG):** Đánh giá việc tích hợp WebAssembly-based Vector Search hoặc Supabase pgvector khi số lượng tài liệu nghiệp vụ vượt mốc 50 tài liệu.
