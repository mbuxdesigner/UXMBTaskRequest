# 💾 TÍNH NĂNG 05: TẦNG BACKEND GOOGLE APPS SCRIPT & CƠ SỞ DỮ LIỆU GOOGLE SHEETS / DRIVE

> **Mục tiêu tính năng:** Cung cấp hạ tầng lưu trữ không máy chủ (Serverless Backend) dựa trên hệ sinh thái Google Workspace, sử dụng Google Apps Script làm API Gateway xử lý đọc/ghi tốc độ cao qua mô hình 2 Bảng JSON Core (`RAW_REQUESTS`, `RAW_SETTINGS`), đồng thời lưu trữ tệp tin/avatar an toàn trên Google Drive.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Thêm một API endpoint mới trong `google-apps-script-backend.js` (ví dụ: endpoint xuất báo cáo, endpoint xóa task vĩnh viễn).
  - Thêm một cấu hình mới cần lưu vĩnh viễn trên Google Sheet thay vì chỉ lưu tạm `localStorage`.
  - Tích hợp thêm thư mục lưu trữ mới trên Google Drive.
- **Khi sửa tính năng cũ:**
  - Ứng dụng gọi API sang Apps Script bị lỗi CORS (`Failed to fetch`, `NetworkError`).
  - Gặp lỗi ghi dữ liệu chậm (>3 giây) hoặc bị timeout 30 giây của Google Apps Script.
  - Sửa code trong file `google-apps-script-backend.js` nhưng ứng dụng thực tế vẫn chạy theo logic cũ.
  - Tải file lên Google Drive bị hỏng file (file corrupt, không mở được do lỗi encode Base64).

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
    │     Danh mục Squads & Products.              │
    │                                              │
    │  📊 Requests_View / Users_View (Projection)  │
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
| **E** | `Status` | String | Trạng thái (`Đang thực hiện`, `Hoàn thành`, `Pending`...) |
| **F** | `Priority` | String | Độ ưu tiên (`High`, `Medium`, `Low`) |
| **G** | `Assignee` | String | Email Designer phụ trách |
| **H** | **`Payload`** | **JSON String** | **Toàn bộ dữ liệu chi tiết của Task + Mảng lịch sử `task_updates`** |
| **I** | `Created_At` | ISO String | Thời điểm tạo task |
| **J** | `Updated_At` | ISO String | Thời điểm cập nhật cuối cùng |

---

### 📦 BẢNG 2: `RAW_SETTINGS` (Lưu Trữ Cấu Hình Hệ Thống)

| Cột | Tên Cột Header | Kiểu Dữ Liệu | Ví dụ Key | Nội dung Payload |
| :---: | :--- | :--- | :--- | :--- |
| **A** | `Config_Key` | String (PK) | `NAV_CONFIG` | Ma trận bật/tắt và thứ tự menu cho 4 roles |
| **A** | `Config_Key` | String (PK) | `UX_PHASES` | Danh sách các khâu trong quy trình và SLA chuẩn |
| **A** | `Config_Key` | String (PK) | `MASTER_DATA`| Danh mục Squads, Products và Danh sách Nhân sự |
| **B** | **`Config_JSON`** | **JSON String** | `{ ... }` | Nội dung cấu hình chi tiết dạng JSON nén |
| **C** | `Updated_At` | ISO String | `2026-08-22T...` | Thời điểm Admin cập nhật cấu hình |

---

## ⚙️ 4. DANH MỤC API ENDPOINTS TRONG `google-apps-script-backend.js`

### Phương thức `GET` (`doGet`):
- `?action=sync`: Lấy toàn bộ danh sách bài toán từ `RAW_REQUESTS` và cấu hình từ `RAW_SETTINGS`.
- `?action=query&request_id=...`: Tra cứu chi tiết một bài toán theo ID.

### Phương thức `POST` (`doPost`):
- `action: "create"`: Tạo một task mới và ghi vào `RAW_REQUESTS` (kèm đẩy dữ liệu cơ bản ra `Requests_View`).
- `action: "update"`: Cập nhật tiến độ, đổi khâu và append bản ghi mới vào mảng `task_updates` trong `Payload`.
- `action: "upload_file"`: Nhận chuỗi Base64 của file tài liệu, lưu vào folder `UX_Portal_Attachments` trên Drive và trả về link tải.
- `action: "upload_avatar"`: Nhận chuỗi Base64 ảnh chân dung, lưu vào folder `UX_Portal_Avatars` trên Drive và trả về link ảnh công khai.
- `action: "request_otp"`: Sinh mã 6 số, lưu vào `CacheService` RAM và gửi tin nhắn Adaptive Card qua Teams Webhook.
- `action: "verify_otp"`: Kiểm tra mã 6 số từ `CacheService`, nếu hợp lệ trả về session token.

---

## 🔍 5. MA TRẬN PHÂN TÍCH PHẠM VI ẢNH HƯỞNG & BẪY KỸ THUẬT (GOTCHAS)

| Vùng Thay Đổi | Điểm Cần Đặc Biệt Lưu Ý | Rủi Ro Sống Còn |
| :--- | :--- | :--- |
| **Chỉnh sửa file `google-apps-script-backend.js`** | **Cloud-Hosted:** File nằm trong source code máy bạn chỉ là bản sao lưu! Code thực thi nằm trên Google Cloud. | ⚠️ **QUY TẮC BẮT BUỘC:** Sau khi sửa file trong thư mục dự án, bạn phải vào trang biên tập Google Apps Script ➔ Dán code mới ➔ Bấm **Deploy (Triển khai)** ➔ Chọn **New version (Phiên bản mới)**. Nếu quên bước này, hệ thống sẽ tiếp tục chạy code cũ! |
| **Upload file / Avatar (Base64)** | Chuỗi Base64 từ Frontend gửi lên thường có tiền tố `data:image/png;base64,` hoặc `data:application/pdf;base64,`. | ⚠️ Apps Script hàm `Utilities.base64Decode()` sẽ lỗi ngay lập tức nếu không loại bỏ tiền tố `data:...;base64,` trước khi giải mã! |
| **Thêm trường vào Schema Task** | Không bao giờ được đổi vị trí hoặc xóa cột `Payload` trong sheet `RAW_REQUESTS`. | ⚠️ Nếu đổi cấu trúc cột, các hàm bóc tách JSON tự động sẽ bị lệch cột dẫn đến hỏng toàn bộ cơ sở dữ liệu. |
| **Xử lý CORS trên Google Apps Script** | Tất cả các phản hồi từ `doGet` và `doPost` phải được bọc qua: `ContentService.createTextOutput(JSON.stringify(...)).setMimeType(ContentService.MimeType.JSON)`. | ⚠️ Tránh chuyển hướng (Redirect 302) không có header CORS, sẽ làm trình duyệt chặn request. |

---

## 🛑 6. CHECKLIST KIỂM THỬ ĐẠT 100 ĐIỂM (TEST CHECKLIST)

- [ ] **Ping Test Kết Nối**: Mở Admin Portal -> Tab 4 Tích hợp -> Bấm "Kiểm tra kết nối" -> Kết quả trả về màu xanh (Ping thành công trong < 1.5s).
- [ ] **Kiểm tra Dữ liệu Đọc/Ghi**: Tạo 1 task thử nghiệm -> Mở Google Sheet trực tiếp bằng trình duyệt -> Kiểm tra xem dòng mới có xuất hiện trong sheet `RAW_REQUESTS` với đầy đủ JSON trong cột `Payload` không.
- [ ] **Kiểm tra Tải file lên Drive**: Upload 1 file ảnh đại diện mới cho tài khoản trong Tab 1 Quản trị -> Kiểm tra link Drive trả về có xem được không và folder `UX_Portal_Avatars` có file mới không.
- [ ] **Dung lượng Payload JSON**: Đảm bảo chuỗi JSON nén của mỗi task không vượt quá giới hạn 50,000 ký tự cho phép của một ô tính Google Sheet.
- [ ] **Compile Test**: Chạy `npx tsc --noEmit` đạt 0 lỗi.
