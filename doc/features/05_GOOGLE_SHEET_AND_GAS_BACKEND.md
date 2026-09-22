# 💾 TÍNH NĂNG 05: TẦNG BACKEND GOOGLE APPS SCRIPT & CƠ SỞ DỮ LIỆU GOOGLE SHEETS / DRIVE

> **Mục tiêu tính năng:** Cung cấp hạ tầng lưu trữ không máy chủ (Serverless Backend) dựa trên hệ sinh thái Google Workspace, sử dụng Google Apps Script làm API Gateway xử lý đọc/ghi tốc độ cao qua mô hình 2 Bảng JSON Core (`RAW_REQUESTS`, `RAW_SETTINGS`), hỗ trợ đồng bộ 2 chiều (Two-Way Sync), nạp siêu tốc danh sách nhân sự từ tab `USERS` qua GViz API, và lưu trữ tệp tin/avatar an toàn trên Google Drive.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Thêm một API action mới trong `google-apps-script-backend.js` (ví dụ: action xóa task vĩnh viễn, action lưu vết audit log chuyên sâu).
  - Thêm một cấu hình hệ thống mới cần lưu trữ lâu dài trên Google Sheet trong bảng `RAW_SETTINGS`.
  - Tích hợp thêm thư mục lưu trữ mới trên Google Drive hoặc thay đổi định dạng nén tài liệu.
- **Khi sửa tính năng cũ:**
  - Ứng dụng gọi API sang Apps Script bị lỗi CORS (`Failed to fetch`, `NetworkError`).
  - Gặp lỗi ghi dữ liệu chậm (>3 giây) hoặc bị timeout 30 giây của Google Apps Script.
  - Sửa code trong file `google-apps-script-backend.js` nhưng ứng dụng thực tế vẫn chạy theo logic cũ (chưa Deploy New Version).
  - Tải file lên Google Drive bị hỏng file (file corrupt, không mở được do lỗi encode Base64).
  - Lỗi đồng bộ Master Data hoặc lệch vai trò người dùng sau khi chỉnh sửa trên Google Sheet.

---

## 🏗️ 2. KIẾN TRÚC LƯU TRỮ TỐI ƯU: 2 BẢNG JSON CORE

Để giải quyết triệt để bài toán độ trễ mạng và phân mảnh khi phải ghi vào nhiều sheet khác nhau, hệ thống áp dụng mô hình **Fast Path 2 Bảng JSON Core**:

```
                              ┌───────────────────────────────────┐
                              │     UX Portal Frontend (React)    │
                              └─────────────────┬─────────────────┘
                                                │ REST API / JSON Payloads
                                                ▼
                              ┌───────────────────────────────────┐
                              │  Google Apps Script (Cloud API)   │
                              └─────────┬───────────────────┬─────┘
                                        │                   │
                     Ghi nhanh JSON     │                   │ Lưu tệp tin Base64
                                        ▼                   ▼
    ┌──────────────────────────────────────────────┐  ┌──────────────────────────────────┐
    │          GOOGLE SHEETS DATABASE              │  │       GOOGLE DRIVE FOLDERS       │
    │                                              │  │                                  │
    │  📄 BẢNG 1: RAW_REQUESTS (Core Tasks JSON)   │  │  📁 UX_Portal_Avatars            │
    │     Mỗi task = 1 dòng, cột Payload lưu toàn  │  │     (Ảnh đại diện người dùng)    │
    │     bộ JSON + mảng lịch sử task_updates.     │  │                                  │
    │                                              │  │  📁 UX_Portal_Attachments        │
    │  📄 BẢNG 2: RAW_SETTINGS (Core Config JSON)  │  │     (Tài liệu đính kèm PRD/Spec) │
    │     Lưu cấu hình Phân quyền, Khâu UX,        │  └──────────────────────────────────┘
    │     Danh mục Squads & Products, Status Rules │
    │                                              │
    │  📊 Requests_View / Users_View / USERS       │
    │     Bảng xem phụ trợ dạng cột cho con người  │
    └──────────────────────────────────────────────┘
```

---

## 📋 3. CẤU TRÚC 2 BẢNG JSON CORE CHI TIẾT

### 📦 BẢNG 1: `RAW_REQUESTS` (Lưu Trữ Task & Lịch Sử Updates)
Mỗi bài toán là 1 hàng duy nhất. Cột `Payload` chứa toàn bộ object của bài toán và mảng `task_updates`:

| Cột | Tên Cột Header | Kiểu Dữ Liệu | Mô Tả & Tác Dụng |
| :---: | :--- | :--- | :--- |
| **A** | `Request_ID` | String (Primary Key) | Mã định danh task (VD: `UXMB-2026-088`), dùng làm Index tra cứu nhanh |
| **B** | `Title` | String | Tiêu đề bài toán (giúp nhận diện bằng mắt thường trên Sheet) |
| **C** | `Product` | String | Sản phẩm / Phân hệ nghiệp vụ |
| **D** | `Current_Phase` | String | Khâu hiện tại trong quy trình UX |
| **E** | `Status` | String | Trạng thái (`Đang thực hiện`, `Hoàn thành`, `Pending`, `PO Pending`...) |
| **F** | `Priority` | String | Độ ưu tiên (`High`, `Medium`, `Low`) |
| **G** | `Assignee` | String | Email Designer phụ trách |
| **H** | **`Payload`** | **JSON String** | **Toàn bộ dữ liệu chi tiết của Task + Mảng lịch sử `task_updates`** |
| **I** | `Created_At` | ISO String | Thời điểm tạo task |
| **J** | `Updated_At` | ISO String | Thời điểm cập nhật cuối cùng |

---

### 📦 BẢNG 2: `RAW_SETTINGS` (Lưu Trữ Cấu Hình Hệ Thống & Master Data)
*(Xem chi tiết cơ chế đồng bộ 2 chiều tại `features/09_MASTERDATA_AND_TWO_WAY_SYNC_SETTINGS.md`)*

| Cột | Tên Cột Header | Kiểu Dữ Liệu | Ví dụ Key | Nội dung Payload |
| :---: | :--- | :--- | :--- | :--- |
| **A** | `Config_Key` | String (PK) | `USERS_LIST` | Danh sách toàn bộ nhân sự, vai trò RBAC, avatar Drive, hạn mức task |
| **A** | `Config_Key` | String (PK) | `SQUADS_CONFIG` | Danh mục UX Squads: Mã, Tên, PO, Business, Designers phụ trách |
| **A** | `Config_Key` | String (PK) | `PRODUCTS_CONFIG` | Danh mục Sản phẩm số MB: App MBBank, Biz MBBank, Lending, BaaS... |
| **A** | `Config_Key` | String (PK) | `PHASES_CONFIG` | 6 Khâu quy trình chuẩn UX, SLA số ngày, % tiến độ, Deliverables |
| **A** | `Config_Key` | String (PK) | `STATUS_RULES_CONFIG` | 6 Quy tắc tự động hóa trạng thái, trigger event, hành vi SLA |
| **A** | `Config_Key` | String (PK) | `AUDIT_LOGS_CONFIG` | Nhật ký lưu vết thay đổi của Quản trị viên |
| **A** | `Config_Key` | String (PK) | `SELECTIONS_CONFIG` | Danh mục Dropdown phục vụ Form tạo task (Loại yêu cầu, Output...) |
| **B** | **`Payload_JSON`** | **JSON String** | `{ ... }` hoặc `[ ... ]` | Dữ liệu cấu hình chi tiết dạng JSON nguyên bản |
| **C** | `Updated_At` | ISO String | `2026-09-05T...` | Thời điểm cập nhật cuối cùng |
| **D** | `Updated_By` | String | Email Admin | Người thực hiện cập nhật cấu hình |

---

## ⚙️ 4. DANH MỤC API ENDPOINTS TRONG `google-apps-script-backend.js`

### 4.1. Phương thức `GET` (`doGet`):
- `?action=sync`: Lấy toàn bộ danh sách bài toán từ `RAW_REQUESTS` và cấu hình từ `RAW_SETTINGS`.
- `?action=query&request_id=...`: Tra cứu chi tiết một bài toán theo ID.
- `?action=get_master_data`: Kéo toàn bộ Dữ liệu chủ (Squads, Products, Phases, Status Rules, Audit Logs, RBAC, Selections) từ `RAW_SETTINGS`.
- `?action=get_team_members`: Trả về danh sách nhân sự từ tab `USERS` (14 cột).
- `?action=get_selections`: Lấy danh mục chọn phục vụ Request Form.
- `?action=check_session&session_token=...`: Kiểm tra tính hợp lệ và thời hạn của phiên làm việc (Fixed 8h hoặc Sliding 24h).
- `?action=touch_session&session_token=...`: Cập nhật mốc thời gian thoát/tương tác cuối (`last_active_at`) cho phiên Sliding 24h.

### 4.2. Phương thức `POST` (`doPost`):
- `action: "request_otp"`: Yêu cầu mã OTP xác thực qua Microsoft Teams Webhook.
- `action: "verify_otp"`: Xác thực mã OTP 6 số, cấp `session_token` và trả về thông tin User Profile kèm `session_policy`.
- `action: "touch_session"`: Cập nhật mốc `last_active_at` trên Sheet `USERS` và CacheService.
- `action: "refresh_session"`: Làm tươi phiên làm việc và gia hạn thời gian hết hạn theo chính sách tương ứng.
- `action: "check_session"`: Kiểm tra trạng thái phiên làm việc từ client.
- `action: "logout"`: Hủy phiên làm việc trên server, xóa session token trong Cache và Sheet `USERS`.
- `action: "create"`: Tạo một task mới và ghi vào `RAW_REQUESTS` (kèm cập nhật `Requests_View`).
- `action: "update_task_progress"`: Cập nhật khâu UX, tiến độ %, trạng thái, mức độ ưu tiên, sản phẩm, squad, ngày hạn chót, ngày phát hành, ghi chú tiến độ, URL Figma và gán Designer.
- `action: "sync_master_data"`: Đồng bộ toàn bộ Master Data từ Web App lên bảng `RAW_SETTINGS` trên Google Sheet.
- `action: "sync_team_members"`: Đẩy danh sách nhân sự cập nhật lên bảng `USERS` (14 cột bao gồm `Session Policy` và `Last Active At`).
- `action: "upload_file"`: Nhận chuỗi Base64 của file tài liệu, lưu vào folder `UX_Portal_Attachments` trên Drive và trả về link tải.
- `action: "upload_avatar"`: Lưu ảnh đại diện người dùng vào thư mục `UX_Portal_Avatars` trên Drive.

---

## ⚡ 5. CƠ CHẾ NẠP SIÊU TỐC TỪ TAB `USERS` QUA GVIZ API

Để tránh độ trễ khởi động lạnh (Cold start) của Google Apps Script khi người dùng đăng nhập hoặc mở bảng phân công:
1. **Ưu tiên 1 (GViz API CSV):** Ứng dụng kết nối trực tiếp URL Google Visualization:
   ```text
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/gviz/tq?tqx=out:csv&sheet=USERS
   ```
   - Thời gian phản hồi: **< 150ms** (gần như tức thì).
   - Không bị chặn CORS preflight.
   - Trực tiếp phân tích cú pháp CSV UTF-8, chuyển đổi vai trò (Admin, Design Owner, Designer, PO, Business).
2. **Ưu tiên 2 (Apps Script Web App API):** Tự động fallback sang gọi POST/GET `action=get_team_members` nếu kết nối GViz gặp sự cố quyền riêng tư.
3. **Đồng bộ vai trò phiên (`syncSessionRoleFromSheet`):** Mỗi khi người dùng có phiên đăng nhập, hệ thống tự động đối chiếu email với tab `USERS` trên Sheet. Nếu Admin vừa đổi vai trò trên Sheet, phiên làm việc lập tức nhận vai trò mới mà không cần đăng nhập lại.

---

## 🛑 6. QUY TRÌNH DEPLOY GOOGLE APPS SCRIPT KHI CÓ THAY ĐỔI

> [!CAUTION]
> Bất kỳ chỉnh sửa nào trong file `google-apps-script-backend.js` trong thư mục dự án **CHỈ LÀ SOURCE CODE LOCAL**. Nó **CHƯA CÓ HIỆU LỰC TRÊN CLOUD** cho đến khi bạn triển khai phiên bản mới.

### Các Bước Triển Khai Chuẩn:
1. Mở file `google-apps-script-backend.js`, copy toàn bộ mã nguồn.
2. Truy cập dự án Apps Script liên kết với Google Sheet: `https://script.google.com`.
3. Dán đè toàn bộ mã vào file `Code.gs`.
4. Bấm **Deploy** -> Chọn **Manage deployments**.
5. Bấm vào biểu tượng cây bút (Chỉnh sửa) -> Tại mục **Version**, chọn **New version** (Bắt buộc).
6. Bấm **Deploy** -> Giữ nguyên Web App URL hiện tại.
7. Vào Web App -> Tab Integrations (hoặc `googleSheetConfig.ts`) xác nhận URL khớp và bấm "Kiểm tra kết nối".

---

## 🧩 7. CƠ CHẾ AUTO-CHUNKING & BẢO VỆ DỮ LIỆU LỚN VƯỢT GIỚI HẠN 50.000 KÝ TỰ

### 7.1. Bối cảnh & Thách thức Giới Hạn Cứng của Google Sheets
Google Sheets áp dụng một quy tắc cứng bất biến: **Một ô tính (single cell) chỉ có thể chứa tối đa 50.000 ký tự**. Khi một cấu trúc dữ liệu vượt quá giới hạn này và script cố gắng ghi qua lệnh `setValue()` hoặc `appendRow()`, Google Sheets sẽ ném ngoại lệ:
> *"Đã xảy ra lỗi: Dữ liệu đầu vào của bạn có chứa nhiều hơn tối đa 50000 ký tự trong một ô đơn nhất."*

Khi ngoại lệ này xảy ra, toàn bộ giao dịch ghi bị hủy bỏ (aborted), khiến dữ liệu mới không thể cập nhật lên Cloud, người dùng khác khi tải về chỉ nhận được dữ liệu cũ hoặc rỗng.

### 7.2. Giải pháp 1: Frontend Payload Sanitizer & Minification
Trước khi gửi dữ liệu cấu trúc IA lên Cloud, hàm `sanitizeIATrees()` tại `src/services/googleSheetService.ts` tự động duyệt đệ quy toàn bộ cây:
1. **Lược bỏ thuộc tính tính toán runtime:** Bỏ cache `metrics` (`subtreeCount`, `maxSubtreeDepth`).
2. **Lược bỏ mảng rỗng:** Bỏ các thuộc tính `taskIds: []`, `children: []` tại các node lá.
3. **Lược bỏ giá trị rỗng:** Loại bỏ các trường `undefined`, `null`, chuỗi rỗng `""` (`description: ""`, `figmaUrl: ""`).
4. **Loại bỏ thụt lề thừa:** Backend không dùng `JSON.stringify(..., null, 2)` mà dùng `JSON.stringify(...)`, cắt giảm ngay **40% – 55%** dung lượng payload.

### 7.3. Giải pháp 2: Cơ chế Tự Động Phân Mảnh (Auto-Chunking) tại Backend
Tại hàm `handleSyncMasterData()` trong `google-apps-script-backend.js`:
- Thiết lập ngưỡng an toàn `MAX_CELL_LIMIT = 40000` (dưới xa giới hạn 50.000 ký tự).
- **Trường hợp $\le 40.000$ ký tự:** Lưu bình thường vào 1 ô, đồng thời reset key `[CONFIG_KEY]_CHUNKS = "0"`.
- **Trường hợp $> 40.000$ ký tự (ví dụ: Sitemap 256 node $\approx 150.000$ ký tự):**
  - Ô chính lưu con trỏ tham chiếu: `[MULTI_CHUNK: 4]`.
  - Ô số lượng mảnh: `[CONFIG_KEY]_CHUNKS` lưu giá trị `4`.
  - Các ô dữ liệu phân đoạn: `[CONFIG_KEY]_CHUNK_0`, `[CONFIG_KEY]_CHUNK_1`, `[CONFIG_KEY]_CHUNK_2`, `[CONFIG_KEY]_CHUNK_3`... mỗi ô chứa tối đa 40.000 ký tự.
  - Tự động xóa sạch các chunk dư thừa cũ nếu lần lưu mới có kích thước co nhỏ lại.

### 7.4. Giải pháp 3: Tự Động Ghép Nối Dữ Liệu Khi Đọc (Auto-Reassembly)
Hàm thống nhất `readMasterDataFromSettingsSheet(rawSettings)` được tích hợp trong cả `doGet` và `doPost`:
- Tự động quét và phát hiện nếu key có cấu hình `_CHUNKS`.
- Đọc tuần tự các ô `_CHUNK_0` đến `_CHUNK_{N-1}`, ghép nối chuỗi hoàn chỉnh và parse ngược lại thành JSON Object nguyên bản.
- Trả về đối tượng `ia_trees` trong suốt 100% cho client, không làm thay đổi bất kỳ logic tiêu thụ nào ở Frontend.

### 7.5. Giải pháp 4: Cơ Chế Double Persistence & Overflow Guard Cho Lịch Sử Chat Của Task
Đối với dữ liệu trao đổi, bình luận và cập nhật trạng thái (`task_updates`) của từng task:
1. **Lớp 1 (`RAW_TASKS`):** Mỗi task là 1 dòng độc lập. Cột H (`Payload_JSON`) lưu chi tiết task.
2. **Lớp 2 (`TASK_UPDATES` & `Activity_Logs_View`):** Mỗi tin nhắn/cập nhật là **1 dòng riêng biệt (Row-by-Row)**, không bị giới hạn 50.000 ký tự của 1 ô ràng buộc.
3. **Overflow Guard:** Tại `handleUpdateTaskProgress()`, nếu tổng chuỗi JSON của task vượt quá 45.000 ký tự, hệ thống tự động giữ lại 30 trao đổi mới nhất trong JSON của task để render tức thì, trong khi **100% toàn bộ lịch sử đầy đủ từ trước đến nay đều được bảo lưu vĩnh viễn không sót tin nào** tại sheet `TASK_UPDATES` và `Activity_Logs_View`.

