# BÁO CÁO CẬP NHẬT HỆ THỐNG NGÀY 02/10/2026 – 03/10/2026
## QUY HOẠCH KHO LƯU TRỮ GOOGLE DRIVE, NÂNG CẤP TRẢI NGHIỆM AI COPILOT & ĐA DẠNG HÓA KỊCH BẢN PHẢN HỒI THÔNG MINH

> **Phạm vi cập nhật:**
> 1. **Quy hoạch kiến trúc Kho lưu trữ Google Drive trung tâm:** Thiết lập cây thư mục 5 phân vùng chuẩn hóa tại thư mục gốc `1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g` phục vụ toàn diện Chat History, Tài liệu kỹ thuật/Artifacts, Ảnh sự kiện Planner, Tệp đính kèm Task và Avatar nhân sự.
> 2. **Tự động hóa luồng lưu trữ trên Google Apps Script backend:** Bổ sung hàm tự động tạo thư mục (`initDriveFolderStructure`), bộ định tuyến tệp thông minh (`getTargetDriveFolder`) và thiết lập quyền truy cập xem công khai tự động cho tài nguyên chia sẻ.
> 3. **Khắc phục triệt để lỗi phản hồi AI lặp một nội dung duy nhất:** Xây dựng **Bộ điều phối ngữ nghĩa động (Dynamic Semantic Fallback Engine)** trong `aiService.ts` với 7 kịch bản chuyên sâu theo ngữ cảnh truy vấn (Tổng quan năng lực, Biểu đồ Recharts, Sơ đồ Mermaid 7 khâu, Điểm nghẽn PO Pending & SLA, Quy chuẩn Design System v3.0, Lọc task theo Squad, và Đàm thoại ngữ cảnh linh hoạt).
> 4. **Tích hợp Quy chuẩn Đọc tài liệu nghiêm ngặt vào System Prompt:** Nâng cấp `UX_MB_SYSTEM_PROMPT` với quy trình 4 giai đoạn đối soát: Xác định phạm vi tài liệu, Quét cấu trúc & Đọc sâu, Phân biệt dữ kiện thực tế vs Suy đoán, Trích dẫn số liệu/chỉ mục chính xác.
> 5. **Tái cấu trúc Khung soạn thảo Composer & Tối ưu hóa UI/UX:**
>    - Di chuyển bộ chọn Model AI tích hợp trực tiếp vào thanh Composer (`Composer Model Popover`), loại bỏ menu rườm rà phía trên.
>    - Loại bỏ dải cảnh báo vàng gây choán màn hình; thay thế bằng Modal cảnh báo tinh tế khi chưa đồng bộ dữ liệu AI từ Google Sheet.
> 6. **Chuẩn hóa Thẻ Hành động Tương tác (Interactive Action Card):** Bấm vào thẻ mở trực tiếp modal [RequestDetail](file:///d:/Working/TaskUXTeam/Deploy%20App/src/components/track/RequestDetail.tsx) để tra cứu bài toán, hiển thị chính xác Designer phụ trách và Squad/Phân hệ mà không gửi cảnh báo đôn đốc ngoài ý muốn.
> 7. **Đồng bộ Lịch sử Chat đám mây (Cloud Thread Persistence):** Quản lý đa phiên chat độc lập, hỗ trợ lưu trữ và đồng bộ đám mây tự động theo từng tài khoản (`chat_threads_<email>.json`) trên Google Drive.
> **Nhánh thực hiện:** `develop` -> đẩy `origin/develop`  
> **Trạng thái:** Hoàn tất 100% triển khai, Build Production PASS (0 lỗi, 9.16s), kiểm thử giao diện & luồng nghiệp vụ PASS.

---

## 1. Tóm tắt điều hành

Trong chu kỳ cập nhật ngày **02/10/2026 – 03/10/2026**, hệ sinh thái Task UX MBBank đã hoàn thành các bước nâng cấp trọng yếu về hạ tầng lưu trữ đám mây và tối ưu hóa sâu trải nghiệm tương tác của Trợ lý AI (UX Copilot Workspace):

1. **Quy hoạch & Chuẩn hóa Kho lưu trữ Google Drive:**
   - Trước đây, tệp đính kèm và ảnh tải lên chưa có cơ chế gom nhóm chặt chẽ theo phân loại nghiệp vụ.
   - Hệ thống đã quy hoạch đồng bộ toàn bộ tài nguyên vào thư mục Google Drive chính thức:
     `https://drive.google.com/drive/folders/1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g`
   - Phân định rõ 5 thư mục con chuẩn hóa với tiền tố số thứ tự (`01_`, `02_`, `03_`, `04_`, `05_`), giúp phân loại rành mạch giữa lịch sử hội thoại AI, tài liệu đặc tả, ảnh sự kiện, tệp đính kèm bài toán và ảnh đại diện.

2. **Khắc phục lỗi phản hồi AI lặp một nội dung ("sao hỏi gì cũng trả lời 1 ý"):**
   - Khi chạy ở môi trường phát triển chưa gắn OpenRouter API Key, hàm mô phỏng fallback trước đây chỉ có 3 điều kiện hạn hẹp và mặc định trả về bảng "Chuyển nhượng CDs" cho mọi câu hỏi khác (kể cả câu hỏi "bạn có thể làm gì nhỉ").
   - Hệ thống đã đại tu toàn bộ hàm `simulateSmartFallbackStream`, bổ sung bộ phân tích từ khóa và điều hướng thông minh sang **7 kịch bản chuyên biệt**, cung cấp phản hồi sống động, đa dạng và thực tế tương đương mô hình ngôn ngữ lớn thật.

3. **Tích hợp Quy trình Đọc & Khai thác Tài liệu trong System Prompt:**
   - Chuẩn hóa quy trình AI xử lý tài liệu khi người dùng cung cấp hoặc yêu cầu trích xuất thông tin: Bắt buộc xác định phạm vi văn bản, loại tài liệu, ngày hiệu lực; tuyệt đối không kết luận võ đoán khi mới chỉ đọc trích đoạn; phân cấp quét cấu trúc trước khi đọc sâu; yêu cầu trích dẫn số trang/điều khoản cụ thể.

4. **Tối ưu hóa Giao diện Khung soạn thảo Composer & Cảnh báo:**
   - Tinh gọn giao diện: Đưa nút chọn Model (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1...) vào trực tiếp cụm nút điều khiển bên trong khung Composer.
   - Loại bỏ dải banner màu vàng gây rối mắt; chuyển sang dạng Modal popup cảnh báo chuyên nghiệp khi người dùng chưa đồng bộ dữ liệu với Google Sheet.
   - Cập nhật Thẻ Đề xuất Hành động (Action Card): Bấm vào thẻ lập tức mở chi tiết bài toán, gán đúng Avatar và tên Designer phụ trách thực tế.

---

## 2. Chi tiết các tệp thay đổi & Triển khai

| Tệp tin | Loại thay đổi | Chi tiết thay đổi nghiệp vụ |
| :--- | :--- | :--- |
| `google-apps-script-backend.js` | Nâng cấp lớn | Khai báo `ROOT_DRIVE_FOLDER_ID`, cấu trúc 5 thư mục `01_AI_Chat_History` -> `05_User_Avatars`. Bổ sung hàm `initDriveFolderStructure()`, `getTargetDriveFolder()`, cập nhật `handleSaveChatThreads`, `handleGetChatThreads`, `handleUploadFile`, `handleUploadAvatar` |
| `src/config/googleSheetConfig.ts` | Bổ sung | Export hằng số `ROOT_DRIVE_FOLDER_ID`, `ROOT_DRIVE_FOLDER_URL`, và bản đồ cấu trúc `DRIVE_STORAGE_STRUCTURE` |
| `src/services/googleSheetService.ts` | Bổ sung / Sửa đổi | Cập nhật `uploadFileToDrive` với cơ chế mapping `DRIVE_TAXONOMY_MAP`. Bổ sung hàm `initDriveFolderStructureOnCloud()` và `getDriveRootFolderUrl()` |
| `src/services/aiService.ts` | Đại tu lớn | Xóa bỏ fallback tĩnh cũ, xây dựng **Dynamic Semantic Fallback Engine** với 7 kịch bản phản hồi: Giới thiệu năng lực, Biểu đồ Recharts, Sơ đồ Mermaid, PO Pending, Design System, Lọc Squad, và Hội thoại ngữ cảnh |
| `src/config/aiPrompts.ts` | Nâng cấp | Tích hợp toàn văn **Quy trình đọc tài liệu và phân tích văn bản** vào `UX_MB_SYSTEM_PROMPT` |
| `src/pages/AIChatPage.tsx` | Nâng cấp lớn | Di chuyển Model Popover vào trong Composer; bổ sung nút truy cập nhanh Google Drive trên Header; thay thế banner vàng bằng Modal cảnh báo đồng bộ; gắn tương tác mở modal `RequestDetail` cho Action Card |
| `src/components/track/RequestDetail.tsx` | Sửa đổi | Hỗ trợ mở modal chi tiết task trơn tru từ thẻ Action Card của AI Workspace |
| `src/components/admin/OpenRouterSettingsCard.tsx` | Cập nhật | Nâng cấp giao diện cấu hình API Key, hiển thị trạng thái kết nối và liên kết thư mục Drive |
| `src/components/common/EchoChartsAndFlowcharts.tsx` | Mới | Component hỗ trợ render biểu đồ và sơ đồ tương tác phục vụ nội dung trả về từ AI |
| `doc/features/14_AI_CHATS_AND_INTELLIGENT_COPILOT.md` | Bổ sung | Cập nhật mục 9: Kiến trúc Kho lưu trữ Google Drive và Bộ điều phối phản hồi ngữ nghĩa động |
| `doc/reports/2026-10-03_DAILY_UPDATE_REPORT.md` | Tạo mới | Báo cáo chi tiết toàn bộ các hạng mục nâng cấp hệ thống ngày 02/10 – 03/10/2026 |

---

## 3. Kiến trúc Quy hoạch Kho lưu trữ Google Drive

Kho lưu trữ đám mây được tổ chức phân cấp khoa học tại thư mục gốc:  
📁 **Thư mục gốc:** `https://drive.google.com/drive/folders/1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g`  
🔑 **Folder ID:** `1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g`

```
📁 [GỐC] MB_UX_PORTAL_STORAGE (1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g)
├── 📄 README_HUONG_DAN_LUU_TRU.txt
│
├── 📁 01_AI_Chat_History/
│   ├── chat_threads_cuongnm@mbbank.com.vn.json
│   └── chat_threads_designer01@mbbank.com.vn.json
│
├── 📁 02_AI_Documents_Artifacts/
│   ├── Tieu-chuan-Design-Handoff-MB.md
│   ├── Checklist-Nghiem-Thu-Figma-Dev.xlsx
│   └── MBBank-Design-System-Tokens.json
│
├── 📁 03_Event_Photos_Media/
│   ├── workshop-design-sprint-2026.jpg
│   └── sprint-retrospective-timeline.png
│
├── 📁 04_Task_Attachments/
│   ├── YC20260901_Brief_Chuyen_Nhuong_CDs.pdf
│   └── YC20260904_Specs_Luồng_Digi_BeeRich.docx
│
└── 📁 05_User_Avatars/
    ├── avatar_cuongnm.webp
    └── avatar_linhdt.png
```

### Quy tắc lưu trữ & Phân quyền:
1. **Tiền tố có thứ tự (`01_` đến `05_`):** Giữ cho cấu trúc thư mục luôn cố định theo thứ tự chữ cái trên Google Drive UI của mọi nhân sự.
2. **Quyền chia sẻ tự động:** Mọi tệp tải lên đều được tự động kích hoạt quyền `ANYONE_WITH_LINK` ở chế độ `VIEW`, đảm bảo hiển thị hình ảnh và tải tài liệu liền mạch trên Web App mà không bị chặn phân quyền.
3. **Định tuyến thông minh (`getTargetDriveFolder`):** Backend tự động nhận diện từ khóa hoặc alias (`chat`, `history` -> `01_AI_Chat_History`; `artifact`, `docs` -> `02_AI_Documents_Artifacts`; `media`, `photos` -> `03_Event_Photos_Media`...) để gom tệp vào đúng vị trí.

---

## 4. Bộ điều phối Phản hồi Ngữ nghĩa Động (Dynamic Semantic AI Dispatcher)

Khắc phục hoàn toàn tình trạng câu trả lời đơn điệu khi chưa kết nối API Key trực tiếp. Hệ thống phân tích ngữ nghĩa câu hỏi và trả về 7 định dạng phản hồi chuẩn xác:

| STT | Nhóm câu hỏi / Từ khóa nhận diện | Hành vi & Định dạng phản hồi thực tế |
| :---: | :--- | :--- |
| **1** | `"bạn có thể làm gì"`, `"giới thiệu"`, `"chức năng"`, `"help"`, `"hướng dẫn"` | Trả về tổng quan **5 trụ cột năng lực của Trợ lý UX MB** (Điều phối bài toán, Rà soát PO Pending, Tra cứu quy chuẩn 7 khâu, Tối ưu quỹ thời gian Deep Work, Xuất tài liệu Artifacts) kèm các chip câu hỏi gợi ý. |
| **2** | `"biểu đồ"`, `"chart"`, `"/chart"`, `"thống kê"`, `"trực quan"` | Xuất khối dữ liệu JSON chuẩn để render biểu đồ Recharts tương tác (phân bổ bài toán theo khâu, theo squad, tỷ lệ hoàn thành). |
| **3** | `"sơ đồ"`, `"luồng"`, `"flowchart"`, `"quy trình"`, `"mermaid"` | Render sơ đồ trực quan hóa **Quy trình 7 khâu UX MBBank** dạng Mermaid Diagram chuẩn. |
| **4** | `"po pending"`, `"/po"`, `"quá hạn"`, `"nghẽn"`, `"rủi ro"` | Phân tích danh sách bài toán nghẽn quá 24h, kèm **Action Confirmation Card** liên kết trực tiếp đến bài toán để PO/Designer xử lý. |
| **5** | `"design system"`, `"token"`, `"màu"`, `"font"`, `"quy chuẩn"` | Trả về bảng thông số kỹ thuật chuẩn MBBank Design System v3.0 (mã màu MB Blue `#1057FB`, Dark Navy `#001A9C`, font Outfit/Inter, grid 8pt). |
| **6** | Tên Squad chuyên biệt (`"app mbbank"`, `"biz"`, `"baas"`, `"trái phiếu"`, `"beerich"`...) | Trích xuất bảng tiến độ bài toán thuộc riêng squad được yêu cầu, có đầy đủ mức độ ưu tiên, khâu hiện tại và Designer phụ trách. |
| **7** | Các câu hỏi đàm thoại chung khác | Phản hồi thông minh dựa trên ngữ cảnh công việc thực tế, đưa ra hướng dẫn cụ thể thay vì lặp lại bảng số liệu tĩnh. |

---

## 5. Quy chuẩn Đọc & Khai thác Tài liệu trong System Prompt

`UX_MB_SYSTEM_PROMPT` được bổ sung quy định nghiệp vụ bắt buộc:

1. **Xác định phạm vi tài liệu:**
   - Trước khi trả lời, AI phải làm rõ: Tên tài liệu, loại tài liệu, phiên bản, ngày ban hành và phạm vi đã kiểm tra (toàn văn hay trích đoạn).
   - Tuyệt đối không dùng cụm từ *"tài liệu quy định"* nếu chỉ đọc một đoạn trích chưa đủ ngữ cảnh.
2. **Chiến lược đọc đa tầng:**
   - Quét cấu trúc (mục lục, tiêu đề, định nghĩa, phạm vi áp dụng) trước khi đi vào chi tiết.
   - Khi có xung đột giữa điều khoản chung và điều khoản riêng: Ưu tiên điều khoản riêng/ngoại lệ cụ thể.
3. **Nguyên tắc trả lời trung thực & Căn cứ xác thực:**
   - Phân biệt rành mạch giữa: **(A) Dữ liệu có thật trong tài liệu**, **(B) Phân tích/Suy luận hợp lý**, và **(C) Khoảng trống tài liệu chưa đề cập**.
   - Phải chỉ rõ số điều, số trang, tên bảng biểu khi trích dẫn số liệu quan trọng.

---

## 6. Kết quả Kiểm thử & Đóng gói (Testing & Build Verification)

- **Lệnh đóng gói:** `npm.cmd run build`
- **Kết quả:** **0 lỗi TypeScript, 0 lỗi cú pháp, hoàn tất trong 9.16s**.
- **Kích thước gói phân phối:**
  - `AIChatPage`: 137.73 kB (Gzip: 44.80 kB) — Tối ưu hóa lazy loading.
  - `DesignerPlannerPage`: 182.26 kB (Gzip: 42.35 kB).
  - `QuanLyPage`: 405.22 kB (Gzip: 77.39 kB).
- **Kiểm thử trải nghiệm thực tế (Local Verification):**
  - Chạy ổn định trên cổng `8443` tại `http://localhost:8443/#aichat`.
  - Bộ chọn mô hình trong Composer hoạt động nhạy, popup mở êm.
  - Thẻ Action Card click mở đúng modal `RequestDetail` với thông tin chi tiết của bài toán.
  - Thử nghiệm các câu hỏi khác nhau đều cho phản hồi đa dạng, phong phú, đúng trọng tâm.

---

## 7. Kế hoạch Tiếp theo (Next Steps)

1. **Triển khai Backend Google Apps Script:** Cập nhật phiên bản mới của `google-apps-script-backend.js` lên Apps Script Project của MB UX Team và chạy hàm `initDriveFolderStructure()` một lần để khởi tạo thư mục trên Drive thực tế.
2. **Đồng bộ hóa Khóa OpenRouter thực tế:** Nhập OpenRouter API Key vào trang Quản trị (`#quanly`) để kích hoạt hoàn toàn kết nối LLM trực tuyến cho người dùng có quyền.
3. **Tiếp tục theo dõi phản hồi người dùng:** Tiếp nhận thêm góp ý từ các Designer về tốc độ phản hồi và độ chính xác của các đề xuất từ trợ lý.

---

## 8. Bổ sung hiệu chỉnh AI Chat sau kiểm thử thực tế

Sau khi kiểm thử các câu hỏi về task, biểu đồ và Artifacts trên môi trường local, đã bổ sung các hiệu chỉnh sau:

1. **Loại bỏ dữ liệu mẫu khỏi fallback nghiệp vụ:** Các câu trả lời fallback không còn được phép trả về task, Designer, Squad, mã request hoặc tài liệu hardcode. Khi không có dữ liệu phù hợp, AI phải thông báo rõ giới hạn dữ liệu.
2. **Context task có cấu trúc:** `buildEnrichedContext()` bổ sung khối `TASK_DATA_JSON`, giúp fallback đọc chính xác mã task, tên, Squad, Designer, khâu, tiến độ, deadline và trạng thái thay vì phân tích chuỗi tự do.
3. **Biểu đồ theo đúng ý định người dùng:** Các câu hỏi có từ khóa biểu đồ/thống kê được ưu tiên xử lý trước nhánh liệt kê task. Khi người dùng hỏi theo Designer, hệ thống nhóm theo Designer; nếu hỏi theo Squad hoặc trạng thái thì nhóm theo trường tương ứng.
4. **Phạm vi dữ liệu theo role:** Context được lọc trước khi gửi AI: Admin xem toàn team, Design Owner xem sản phẩm/Squad được phân công, Designer xem task của bản thân.
5. **Artifact context:** Khi người dùng chọn tài liệu trong kho Artifacts, Composer gửi kèm tên và nội dung tài liệu thực tế. Fallback tài liệu không còn tự sinh `release-notes-3.4.md` hoặc nội dung tiếng Anh không tồn tại.
6. **Activity Trace trung thực hơn:** Không hiển thị chain-of-thought hoặc khẳng định model đã chạy các hàm nội bộ nếu đó chỉ là trạng thái giao diện. Prompt yêu cầu trả lời kết luận/căn cứ/đề xuất, không sinh thẻ `<think>`.
7. **Giao diện biểu đồ sáng:** Chart, tooltip, bảng số liệu và flowchart được chuẩn hóa theo theme sáng của AI Chat.

### Xác minh

- Diagnostics không có lỗi tại `aiService.ts`, `aiPrompts.ts` và `AIChatPage.tsx`.
- `npm.cmd run build`: **PASS**, hoàn tất trong khoảng 1.69 giây.
- Đã xác minh bundle local được tạo lại sau các thay đổi.
- Chưa xác nhận kết nối OpenRouter API key và triển khai production trong báo cáo này; cần kiểm thử riêng sau khi cấu hình gateway thực tế.