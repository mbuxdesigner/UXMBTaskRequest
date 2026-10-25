# CƠ CHẾ XÁC THỰC OTP & TRA CỨU BẢO MẬT (TEAMS OTP AUTH)

Tài liệu này mô tả chi tiết cơ chế bảo mật, quy trình nhập OTP, quản lý phiên làm việc và tra cứu dữ liệu được áp dụng cho tính năng **Tra cứu tiến độ yêu cầu & Dữ liệu UX (Track Request)** kết nối với Google Sheet Backend và Microsoft Teams.

---

## 1. Tổng quan kiến trúc & Mục tiêu bảo mật

```
+------------------+         +-----------------------+         +------------------------+
|   Giao diện Web  | <=====> |  Google Apps Script   | <=====> |    Microsoft Teams     |
| (Portal / Modal) |         | (RAM Cache + Sheet)   |         | (Webhook Notification) |
+------------------+         +-----------------------+         +------------------------+
```

### 1.1. Mục tiêu
- **Bảo mật dữ liệu nội bộ:** Ngăn chặn truy cập trái phép vào thông tin chi tiết các yêu cầu thiết kế, thông tin liên hệ và trạng thái dự án.
- **Xác thực 2 lớp (2FA qua Teams):** Người dùng yêu cầu tra cứu phải sở hữu tài khoản nội bộ hợp lệ đã được phân quyền trong hệ thống.
- **Tối ưu trải nghiệm (UX):** Giảm thiểu thao tác của người dùng (tự động focus, tự động submit khi đủ 6 số, đếm ngược trực quan, lưu phiên làm việc 15 phút).

### 1.2. Kiến trúc 2 tầng (Hybrid RAM Cache + Google Sheets)
- **Tầng 1 - RAM Cache (`CacheService`):** Lưu trữ mã OTP (hiệu lực 3 phút) và Session Token (hiệu lực 15 phút) trên bộ nhớ tạm của Google Apps Script, cho phép xác thực với độ trễ thấp nhất (~10ms - 50ms) mà không bị nghẽn I/O đọc/ghi ô tính Google Sheet.
- **Tầng 2 - Google Sheet Storage (`USERS` & `LOGS`):** Lưu trữ danh sách người dùng được cấp quyền, trạng thái tài khoản, sao lưu phiên dự phòng và ghi nhật ký kiểm toán (Audit Logs) cho mọi hành động.

---

## 2. Quy trình chi tiết từng bước (Step-by-Step Flow)

### 2.1. Bước 1: Kiểm tra phiên làm việc (Check Session)
1. Khi người dùng truy cập trang **Tra cứu (TrackRequestPage)** hoặc nhấn nút **Tìm kiếm**:
   - Hệ thống kiểm tra `UserSession` trong `localStorage` (`ux_portal_teams_session`).
   - Kiểm tra thời gian hết hạn `expiresAt`:
     $$\text{Thời gian hiện tại} < \text{expiresAt}$$
2. **Nếu phiên còn hiệu lực:**
   - Người dùng được thực hiện tìm kiếm trực tiếp.
   - Giao diện hiển thị Badge thông tin email Teams, vai trò (Role) và đồng hồ đếm ngược thời gian phiên còn lại.
3. **Nếu chưa có phiên hoặc phiên đã hết hạn:**
   - Hiển thị banner bảo mật yêu cầu xác thực.
   - Khi bấm tìm kiếm hoặc bấm nút *"Xác thực Microsoft Teams"*, modal `TeamsOtpModal` sẽ tự động mở ra.

---

### 2.2. Bước 2: Yêu cầu gửi mã OTP (Request OTP)
1. Người dùng nhập địa chỉ email cá nhân/nội bộ vào ô input và nhấn **"Gửi mã xác thực qua Teams"**.
2. Frontend gọi API:
   - **Method:** `POST`
   - **Payload:**
     ```json
     {
       "action": "request_otp",
       "email": "user@example.com",
       "timestamp": "2026-08-19T04:00:00.000Z"
     }
     ```
3. Backend Google Apps Script xử lý:
   - Tra cứu dòng tương ứng trong sheet `USERS` theo cột `Personal Email`.
   - Kiểm tra điều kiện: `Status === "Active"` và có thông tin `Teams Email`.
   - **Sinh mã OTP:** Tạo chuỗi ngẫu nhiên 6 chữ số (từ `000000` đến `999999`).
   - **Lưu Cache:** Đưa `otp`, `expiresAt` (hiện tại + 3 phút), `attempts = 0` vào `CacheService` với key `otp_{email}`.
   - **Cập nhật Sheet `USERS`:** Ghi mã OTP, thời hạn và nhật ký vào dòng của người dùng.
   - **Gửi tin nhắn Teams:** Bắn thông báo chứa OTP 6 số qua Webhook URL của Microsoft Teams.
   - **Ghi nhật ký Sheet `LOGS`:** Ghi nhận sự kiện `REQUEST_OTP` (Thành công / Cảnh báo / Bỏ qua nếu không tồn tại email).
4. **Phản hồi trung tính (Anti-Enumeration):**
   - Dù email có tồn tại trong hệ thống hay không, backend luôn trả về thông điệp trung tính:
     > *"Nếu tài khoản hợp lệ và đang hoạt động, mã xác thực 6 số sẽ được gửi trực tiếp tới tài khoản Teams của bạn."*
   - Cơ chế này ngăn chặn việc kẻ xấu dò quét xem email nào đã được cấp quyền trong hệ thống.

---

### 2.3. Bước 3: Giao diện & Cơ chế nhập mã OTP (OTP Input UX)
Giao diện nhập OTP trong `TeamsOtpModal` được tối ưu hóa toàn diện:

```
+-------------------------------------------------------------------+
|  [Shield] Xác thực bảo mật Microsoft Teams                        |
|  Nhập mã OTP 6 số đã được gửi qua Microsoft Teams                 |
+-------------------------------------------------------------------+
|  [Email] user@example.com                         [Đổi email <-]  |
|                                                                   |
|  MÃ OTP 6 CHỮ SỐ                                  [Clock] 02:58   |
|  +-------------------------------------------------------------+  |
|  | [Key]                     5 8 3 9 2 1                       |  |
|  +-------------------------------------------------------------+  |
|  Còn lại 5 lần thử                    Tự động xác thực khi đủ 6 số|
|                                                                   |
|  [Lock] Xác thực & Bắt đầu tra cứu                                |
|                                                                   |
|                     [Refresh] Gửi lại mã sau 45s                  |
+-------------------------------------------------------------------+
|  [Check] Phiên xác thực an toàn 15 phút                   [Đóng]  |
+-------------------------------------------------------------------+
```

#### Các tính năng chính của ô nhập OTP:
1. **Auto-focus:** Ngay khi chuyển từ bước nhập Email sang bước nhập OTP, ô nhập mã tự động được `focus()` sau `150ms` để người dùng có thể gõ ngay.
2. **Lọc ký tự số (`Numeric Only`):** 
   - Chỉ cho phép ký tự số `0-9` (loại bỏ toàn bộ chữ cái hoặc ký tự đặc biệt qua Regex: `val.replace(/\D/g, "").slice(0, 6)`).
   - Định dạng hiển thị: Font đơn khoảng cách (`font-mono`), kích thước chữ to, căn giữa (`text-center`), dãn khoảng cách ký tự (`tracking-widest`) giúp dễ đọc.
3. **Cơ chế tự động xác thực (Auto-submit):**
   - Khi người dùng nhập/dán đủ **6 chữ số**, hàm `handleOtpInputChange` ngay lập tức kích hoạt `handleVerifyOtp(cleanVal)` mà không cần người dùng phải bấm nút hoặc nhấn phím Enter.
4. **Bộ đếm thời gian hiệu lực (OTP Countdown - 3 phút):**
   - Đếm ngược từ `180` giây về `0`.
   - Hiển thị định dạng `mm:ss` (ví dụ: `03:00`, `02:59`...).
   - Khi thời gian còn dưới 30 giây: Chữ chuyển màu đỏ cảnh báo và nhấp nháy (`animate-pulse`).
   - Khi về `0`: Vô hiệu hóa nút xác thực, hiển thị thông báo yêu cầu lấy mã mới.
5. **Chống spam gửi lại mã (Resend Cooldown - 60 giây):**
   - Sau khi gửi mã thành công, nút *"Gửi lại mã"* bị vô hiệu hóa trong 60 giây.
   - Hiển thị đếm ngược: *"Gửi lại mã sau {resendCooldown}s"*.
   - Sau 60s, nút kích hoạt lại: *"Gửi lại mã OTP mới"*.
6. **Đổi email linh hoạt:** Cho phép quay lại bước nhập email bất cứ lúc nào qua nút *"Đổi email"*.

---

### 2.4. Bước 4: Xác thực mã OTP & Cấp phiên (Verify OTP)
1. Khi kích hoạt xác thực, Frontend gửi:
   - **Method:** `POST`
   - **Payload:**
     ```json
     {
       "action": "verify_otp",
       "email": "user@example.com",
       "otp": "583921",
       "timestamp": "2026-08-19T04:00:15.000Z"
     }
     ```
2. **Xử lý tại Backend:**
   - **Kiểm tra RAM Cache trước:**
     - Nếu không tìm thấy OTP trong Cache: Báo lỗi *"Mã xác thực không hợp lệ hoặc đã hết hạn"*.
     - Nếu đã nhập sai $\ge 5$ lần: Xóa Cache, báo lỗi *"Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới."*
     - Nếu mã không khớp: Tăng `attempts += 1`, cập nhật lại Cache, trả về thông báo lỗi kèm số lần thử còn lại (`5 - attempts`).
   - **Nếu mã khớp chính xác:**
     - Sinh `Session Token` bảo mật dạng: `ST_{UUID_16_CHAR}`.
     - Thời gian hết hạn phiên: Hiện tại + **15 phút** (900 giây).
     - Xóa mã OTP khỏi Cache để ngăn tấn công Replay (sử dụng lại mã).
     - Lưu phiên vào Cache: `session_{sessionToken}` (TTL 15 phút).
     - Cập nhật dòng người dùng trên Sheet `USERS`: Ghi nhận `VERIFIED`, `Session Token`, `Session Expires At` và ghi chú thành công.
     - Ghi log sự kiện `VERIFY_SUCCESS` vào Sheet `LOGS`.
3. **Phản hồi về Frontend:**
   ```json
   {
     "status": "success",
     "message": "Xác thực thành công!",
     "session_token": "ST_a1b2c3d4e5f67890",
     "personal_email": "user@example.com",
     "teams_email": "user@mbbank.com.vn",
     "role": "User",
     "expires_in": 900
   }
   ```
4. **Xử lý tại Frontend:**
   - Lưu thông tin vào `localStorage`.
   - Đóng Modal `TeamsOtpModal`.
   - Tự động thực thi lệnh tìm kiếm đang chờ dở (nếu có từ khóa trong ô tìm kiếm).

---

### 2.5. Bước 5: Duy trì phiên & Tra cứu dữ liệu bảo mật (Protected Search)
1. Mọi truy vấn tìm kiếm dữ liệu chi tiết (`search_data`) đều bắt buộc đính kèm `session_token`:
   ```json
   {
     "action": "search_data",
     "session_token": "ST_a1b2c3d4e5f67890",
     "query": "UXMB-001",
     "timestamp": "2026-08-19T04:01:00.000Z"
   }
   ```
2. Backend kiểm tra `session_token` trong Cache (hoặc trên Sheet `USERS`):
   - **Nếu không hợp lệ hoặc hết hạn:** Trả về `{ status: "unauthorized" }`. Frontend sẽ tự động xóa session và mở lại modal OTP.
   - **Nếu hợp lệ:** Thực hiện tìm kiếm và trả về kết quả tương ứng.

---

### 2.6. Bước 6: Đăng xuất & Hủy phiên (Logout)
- Khi người dùng nhấn biểu tượng **Đăng xuất (LogOut)** trên thanh Auth Status Widget:
  1. Frontend gọi API `action: "logout"` với `session_token`.
  2. Backend xóa `session_{sessionToken}` khỏi Cache và xóa token trên dòng người dùng tại Sheet `USERS`.
  3. Frontend gọi `clearSession()`, xóa `localStorage`, xóa kết quả tìm kiếm trên màn hình và đưa trạng thái về ban đầu.

---

## 3. Cấu trúc bảng dữ liệu trên Google Sheet

### 3.1. Sheet `USERS` (Quản lý quyền & Trạng thái OTP)

| Cột | Tên trường | Kiểu dữ liệu | Mô tả |
|---|---|---|---|
| **A (1)** | `Personal Email` | String | Email cá nhân/liên kết dùng để nhận diện |
| **B (2)** | `Teams Email` | String | Email tài khoản Microsoft Teams để nhận mã |
| **C (3)** | `Status` | String (`Active` / `Inactive`) | Trạng thái hoạt động của tài khoản |
| **D (4)** | `Role` | String (`User` / `Admin`) | Phân quyền người dùng |
| **E (5)** | `Current OTP` | String | Mã OTP 6 số hiện tại (hoặc trạng thái `VERIFIED`) |
| **F (6)** | `OTP Expires At` | DateTime | Thời gian hết hạn mã OTP (hiệu lực 3 phút) |
| **G (7)** | `OTP Attempts` | Number | Số lần đã nhập sai (Tối đa 5) |
| **H (8)** | `Session Token` | String | Mã phiên làm việc hiện tại (`ST_...`) |
| **I (9)** | `Session Expires At` | DateTime | Thời gian hết hạn phiên làm việc (15 phút) |
| **J (10)** | `Notes` | String | Ghi chú & lịch sử tương tác gần nhất |

---

### 3.2. Sheet `LOGS` (Nhật ký kiểm toán hệ thống)

| Cột | Tên trường | Ví dụ giá trị |
|---|---|---|
| **A (1)** | `Timestamp` | `19/08/2026 11:05:00` |
| **B (2)** | `Personal Email` | `user@example.com` |
| **C (3)** | `Teams Email` | `user@mbbank.com.vn` |
| **D (4)** | `Action` | `REQUEST_OTP`, `VERIFY_SUCCESS`, `VERIFY_FAILED`, `SEARCH_DATA`, `LOGOUT` |
| **E (5)** | `Status` | `SUCCESS`, `FAILED`, `WARNING`, `IGNORED` |
| **F (6)** | `Details` | Chi tiết thao tác, số lượng kết quả trả về hoặc mã lỗi |

---

## 4. Bảng tổng hợp thông số kỹ thuật & Cấu hình

| Tham số | Giá trị mặc định | Giải thích |
|---|---|---|
| **Độ dài mã OTP** | `6 chữ số` | Sinh ngẫu nhiên từ `000000` - `999999` |
| **Thời gian hiệu lực OTP** | `3 phút` (180 giây) | Quá thời gian này mã sẽ bị vô hiệu hóa |
| **Giới hạn số lần thử sai** | `5 lần` | Nhập sai quá 5 lần mã sẽ bị hủy ngay |
| **Thời gian chờ gửi lại (Cooldown)** | `60 giây` | Khoảng cách tối thiểu giữa 2 lần bấm gửi lại OTP |
| **Thời gian phiên làm việc (Session)** | `15 phút` (900 giây) | Thời gian duy trì quyền tra cứu dữ liệu bảo mật |
| **Chế độ chạy Local (Mock Mode)** | `123456` / `583921` | Mã OTP thử nghiệm khi chưa cấu hình Google Sheet URL |

---

## 5. Tóm tắt các ưu điểm bảo mật & Trải nghiệm

1. **Không lưu cứng mật khẩu:** Xác thực thông qua mã dùng 1 lần (OTP) gửi qua kênh bảo mật nội bộ Microsoft Teams.
2. **Chống brute-force:** Giới hạn 5 lần thử sai và hủy mã ngay khi vượt ngưỡng.
3. **Chống thu thập thông tin (Anti-Enumeration):** Thông báo phản hồi đồng nhất không làm lộ danh sách email hợp lệ.
4. **Phản hồi cực nhanh:** Nhờ cơ chế RAM Caching, xác thực hoàn tất trong vài chục mili-giây.
5. **Trải nghiệm mượt mà:** Tự động bắt sự kiện khi gõ đủ 6 ký tự số, chuyển tiếp tự động sang bước tra cứu kết quả mà không làm gián đoạn dòng suy nghĩ của người dùng.