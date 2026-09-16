# 📋 BÁO CÁO CẬP NHẬT TÍNH NĂNG: CƠ CHẾ PHIÊN SONG SONG (DUAL SESSION POLICY) & CẤU HÌNH QUẢN TRỊ 2 TẦNG
## HỆ THỐNG MB UX REQUEST PORTAL & TASK MANAGEMENT SYSTEM

> **Ngày thực hiện:** 16/09/2026  
> **Người thực hiện:** Antigravity AI Engineering Team  
> **Đơn vị phối hợp:** Nhóm SWE Light & Independent Victory Auditor  
> **Trọng tâm cập nhật:**
> 1. **Cơ chế Phiên làm việc 2 chế độ (Dual Session Policy):** Cung cấp song song chế độ **Cố định 8 tiếng (Fixed 8h)** cho Quản trị viên và chế độ **Trượt 24 tiếng khi thoát (Sliding Inactivity 24h)** cho Designer / PO / Business.
> 2. **Cơ chế đếm ngược 24h chỉ bắt đầu khi thoát ứng dụng:** Lưu trữ bền vững qua `localStorage`, tự động phát hiện mốc thoát ứng dụng (`lastActiveAt`) và gia hạn phiên khi quay lại trong vòng 24h mà không bắt nhập lại OTP.
> 3. **Tích hợp W3C Page Lifecycle & Mobile Lifecycle:** Lắng nghe toàn diện các sự kiện `freeze`, `pagehide`, `beforeunload`, `visibilitychange` và `touchstart` để lưu mốc thoát tức thì trên cả Desktop lẫn Mobile (iOS Safari & Android Chrome).
> 4. **Giao diện Quản trị Cấu hình 2 tầng (2-Tier Admin Configuration):**
>    - **Tầng 1 (Role Policy):** Bảng cấu hình chính sách phiên cho cả 5 vai trò tại Tab Phân quyền (RBAC) với các nút Toggle Pill trực quan.
>    - **Tầng 2 (User Override):** Dropdown chọn chính sách riêng cho từng nhân sự trong Modal Thêm/Sửa nhân sự kèm huy hiệu `(Riêng)` trên danh sách.
> 5. **Nâng cấp tầng Backend Google Apps Script & Sheet USERS:** Mở rộng Sheet `USERS` lên 14 cột, hỗ trợ Cache 2 tầng (RAM Cache + Sheet Fallback) bảo toàn phiên 24h vượt ngưỡng giới hạn RAM Cache của Google Apps Script.
> 6. **Kiểm thử đối kháng khép kín 3 vòng:** Vượt qua 31/31 bài test tự động (100% PASS) và biên dịch Production (`npm run build`) thành công trong 1.18s với 0 lỗi.

---

## 🎯 1. BẢNG TỔNG HỢP KẾT QUẢ ĐẠT ĐƯỢC

| STT | Hạng Mục Cập Nhật | Trạng Thái | Kết Quả Kỹ Thuật Đạt Được |
| :---: | :--- | :---: | :--- |
| **1** | **Cơ chế Phiên cố định 8h (Fixed 8h)** | ✅ Đạt chuẩn 100% | Phiên hết hạn sau đúng 8 giờ kể từ lúc xác thực OTP (`loginAt + 28.800.000ms`); tương tác người dùng không làm kéo dài phiên; áp dụng mặc định cho vai trò Admin. |
| **2** | **Cơ chế Phiên trượt 24h (Sliding Inactivity 24h)** | ✅ Đạt chuẩn 100% | Phiên lưu bền vững trong `localStorage`; mốc 24h chỉ bắt đầu đếm khi thoát app (`lastActiveAt`); quay lại trong 24h tự động duy trì và reset chu kỳ mới; vắng mặt $> 24$h tự động hủy phiên và yêu cầu OTP. |
| **3** | **Theo dõi vòng đời W3C & Mobile (Page Lifecycle)** | ✅ Đạt chuẩn 100% | Tích hợp `freeze`, `pagehide`, `beforeunload`, `visibilitychange` và `touchstart` với passive listener; cam kết ghi nhận mốc `lastActiveAt` tức thì khi vuốt tắt app trên điện thoại. |
| **4** | **Đồng bộ đa Tab & Chống hồi sinh phiên Zombie** | ✅ Đạt chuẩn 100% | Lắng nghe `window.storage`: khi bấm Đăng xuất ở Tab A, toàn bộ Tab B, C lập tức xóa sạch `sessionStorage` và chuyển về login, ngăn chặn việc tái sử dụng token cũ. |
| **5** | **Giao diện Cấu hình Tab RBAC (Tầng 1 - Role Policy)** | ✅ Đạt chuẩn 100% | Thêm khối thẻ ReUI cấu hình chính sách phiên cho 5 vai trò (`Admin`, `Design Owner`, `Designer`, `PO`, `Business`) với nút chuyển đổi tức thì và nút "Khôi phục mặc định". |
| **6** | **Giao diện Cấu hình Nhân sự (Tầng 2 - User Override)** | ✅ Đạt chuẩn 100% | Tích hợp dropdown trong `AddMemberModal.tsx` cho phép chọn: *Kế thừa vai trò*, *Cố định 8h*, hoặc *Trượt 24h*; danh sách nhân sự gắn Badge và nhãn `(Riêng)`. |
| **7** | **Đồng bộ Backend Google Apps Script (14 Cột)** | ✅ Đạt chuẩn 100% | Mở rộng Sheet `USERS` (Cột 13: `Session Policy`, Cột 14: `Last Active At`); bổ sung API `touch_session`, `refresh_session`, `check_session` trên cả `doGet` và `doPost`. |
| **8** | **Kiểm thử Đối kháng & Thẩm định Độc lập** | ✅ Đạt chuẩn 100% | Vượt qua 3 vòng Review đối kháng với 31/31 bài test tự động PASS; Victory Auditor ký duyệt hoàn thành (`VICTORY CONFIRMED`); `npm run build` 0 lỗi. |

---

## 🏗️ 2. CHI TIẾT TRIỂN KHAI KỸ THUẬT

### 2.1. Logic Quản lý Phiên Song song (`src/services/otpAuthService.ts`)

#### Schema Đối tượng Phiên mở rộng:
```typescript
export type SessionPolicyType = "fixed_8h" | "sliding_24h"
export type UserSessionPolicyOverride = "inherit" | "fixed_8h" | "sliding_24h"

export interface UserSession {
  sessionToken: string
  personalEmail: string
  teamsEmail: string
  displayName: string
  avatarUrl?: string
  role: UserRole
  squad?: string
  squads?: string[]
  products?: string[]
  expiresAt: number
  
  // Các trường mới cho Dual Session Policy
  sessionPolicy?: SessionPolicyType     // "fixed_8h" | "sliding_24h"
  loginAt?: number                      // Timestamp đăng nhập ban đầu
  lastActiveAt?: number                 // Timestamp thoát/ngừng thao tác gần nhất
  sessionDurationHours?: number         // Số giờ phiên (8 hoặc 24)
  isImpersonating?: boolean
  originalRole?: UserRole
  originalDisplayName?: string
}
```

#### Quy tắc Phân giải Chính sách (Precedence Order):
$$\text{User Override (Tầng 2)} \rightarrow \text{Role Policy (Tầng 1)} \rightarrow \text{Default System Policy}$$
* Nếu nhân sự được cấu hình riêng: Áp dụng cấu hình riêng đó.
* Nếu nhân sự để chế độ *Kế thừa*: Áp dụng theo cấu hình của Vai trò tại Tab RBAC.
* Mặc định hệ thống: Vai trò `Admin` mặc định `fixed_8h`; các vai trò `Design Owner`, `Designer`, `PO`, `Business` mặc định `sliding_24h`.

#### Thuật toán Kiểm tra Phiên (`getStoredSession`):
```typescript
const now = Date.now()

// Cơ chế 1: Cố định 8h
if (session.sessionPolicy === "fixed_8h") {
  if (now > session.expiresAt) {
    clearSession()
    return null
  }
}

// Cơ chế 2: Trượt 24h khi thoát
if (session.sessionPolicy === "sliding_24h") {
  const lastActive = session.lastActiveAt || session.loginAt || now
  const inactivityMs = now - lastActive
  if (inactivityMs > 24 * 3600 * 1000) {
    clearSession()
    return null
  }
  // Nếu quay lại trong 24h: Tự động gia hạn mốc hiển thị
  session.lastActiveAt = now
  session.expiresAt = now + 24 * 3600 * 1000
}
```

---

### 2.2. Giao diện Cấu hình Quản trị 2 Tầng

#### Tầng 1 — Cấu hình theo Vai trò tại Tab RBAC (`src/pages/QuanLyPage.tsx`):
- Bổ sung khối thẻ **"Chính sách Phiên & Thời hạn Đăng nhập (Session Security Policy)"** ngay dưới Bảng Ma trận Quyền hạn.
- Mỗi vai trò có 2 nút Toggle Pill:
  - 🔘 **Cố định 8 tiếng** (`fixed_8h`): Hết ca làm việc yêu cầu nhập lại OTP để bảo vệ dữ liệu tối đa.
  - 🔘 **Trượt 24 tiếng khi thoát** (`sliding_24h`): Tính 24h từ khi đóng ứng dụng, tự làm tươi khi quay lại.
- Nút **"Khôi phục mặc định"** đưa về cấu hình chuẩn của MBBank.

#### Tầng 2 — Ghi đè theo từng Cá nhân (`src/components/common/AddMemberModal.tsx`):
- Thêm trường lựa chọn **"Chính sách phiên làm việc"** trong Modal Thêm & Sửa nhân sự với 3 tùy chọn:
  1. `Kế thừa theo vai trò (Mặc định)`
  2. `Cố định 8 tiếng (Hết ca nhập lại OTP)`
  3. `Trượt 24 tiếng khi thoát (Sliding Inactivity)`
- Bảng danh sách nhân sự tại Tab 1 hiển thị Badge màu nhận diện và nhãn `(Riêng)` nổi bật nếu tài khoản có chính sách ghi đè.

---

### 2.3. Nâng cấp Backend Google Apps Script & Google Sheet `USERS`

#### Cấu trúc bảng `USERS` 14 Cột:
1. `Full Name`
2. `Avatar URL`
3. `Personal Email`
4. `Teams Email`
5. `Status` (`Active`/`Inactive`)
6. `Role` (`Admin`/`Design Owner`/`Designer`/`PO`/`Business`)
7. `Current OTP` / `VERIFIED`
8. `OTP Expires At`
9. `OTP Attempts`
10. `Session Token`
11. `Session Expires At`
12. `Notes`
13. **`Session Policy` (`fixed_8h` / `sliding_24h`)** *(Cột mới)*
14. **`Last Active At` (ISO String / Timestamp)** *(Cột mới)*

#### Xử lý Cache 2 tầng thông minh:
* **0 - 6 giờ:** Google Apps Script lưu phiên trong RAM Cache (`CacheService`) để phản hồi tức thì (< 50ms).
* **6 - 24 giờ:** Do `CacheService` có giới hạn TTL tối đa 6 giờ (21.600s), backend tự động fallback kiểm tra mốc `Last Active At` và `Session Expires At` lưu trữ trực tiếp trên dòng tương ứng của Sheet `USERS`. Nhờ đó, người dùng phiên 24h không bao giờ bị văng phiên dù RAM Cache của Apps Script đã hết hạn.

---

## 🧪 3. HỒ SƠ KIỂM THỬ ĐỐI KHÁNG (TEST COVERAGE: 31/31 PASS)

Quá trình triển khai tuân thủ quy trình kiểm thử đối kháng (Adversarial Testing) qua 3 vòng độc lập:

1. **Vòng 1 — Triển khai cơ sở (`implementer_r1`):**
   * `test-dual-session-policy.mjs`: 6/6 PASS (Khởi tạo phiên, 8h cố định, 24h trượt, phân giải quyền, ghi đè cá nhân, đăng xuất sạch).
   * `test-gas-session-backend.mjs`: 3/3 PASS (Khởi tạo sheet 14 cột, fallback từ Cache sang Sheet, xác thực hạn phiên 24h).
2. **Vòng 2 — Rà soát lỗi biên chuyên sâu (`reviewer_r1` & `reviewer_r2`):**
   * `test-reviewer-adversarial-verification.mjs`: 6/6 PASS (Chống hồi sinh đa tab, phục hồi timestamp string/NaN, chống gian lận đồng hồ, cập nhật chính sách động, touch throttling 30s, tra cứu index token).
   * `test-reviewer-r2-verification.mjs`: 6/6 PASS (Sự kiện W3C freeze/pagehide, fallback bộ nhớ khi chạy ẩn danh Private Browsing, lưu trữ chính sách khi Edit nhân sự, nhất quán API doGet/doPost).
3. **Vòng 3 — Kiểm định mốc biên mili-giây (`reviewer_r3`):**
   * `test-reviewer-r3-adversarial.mjs`: 5/5 PASS (Kiểm tra nghiêm ngặt mốc chính xác $\le 24$h và $> 24$h, ma trận phân cấp quyền 3 tầng).
4. **Vòng 4 — Thẩm định Chiến thắng Độc lập (`victory_auditor_4`):**
   * `independent-audit.mjs`: 5/5 PASS (Thẩm định độc lập trong môi trường sạch, không dùng mock).
   * **Biên dịch Production:** `npm run build` hoàn thành với **0 lỗi TypeScript, 0 cảnh báo cú pháp**.

---

## 📂 4. DANH SÁCH FILE ẢNH HƯỞNG & THAY ĐỔI

| Tệp tin | Vị trí | Tóm tắt thay đổi |
| :--- | :--- | :--- |
| `src/services/otpAuthService.ts` | Frontend Service | Logic lõi Dual Session, hàm phân giải chính sách, theo dõi tương tác, W3C lifecycle. |
| `src/services/googleSheetService.ts` | Frontend Service | Tích hợp trường `session_policy` vào payload nạp và đồng bộ Sheet. |
| `src/pages/QuanLyPage.tsx` | Frontend Page | Bổ sung giao diện cấu hình phiên Role tại Tab RBAC và hiển thị nhãn tại Tab Team. |
| `src/components/common/AddMemberModal.tsx` | Frontend Component | Dropdown chọn chính sách phiên cá nhân khi thêm/sửa thành viên. |
| `google-apps-script-backend.js` | Backend Script | Xử lý 14 cột, API kiểm tra/gia hạn phiên, cơ chế RAM Cache + Sheet fallback. |
| `doc/features/01_AUTH_AND_SESSION_MANAGEMENT.md` | Tài liệu hệ thống | Cập nhật toàn diện đặc tả tính năng Quản lý phiên song song. |
| `doc/00_OVERVIEW_AND_ONBOARDING.md` | Tài liệu hệ thống | Cập nhật bản đồ tra cứu tài liệu kỹ thuật. |

---

## 📌 5. HƯỚNG DẪN BÀN GIAO & VẬN HÀNH

1. **Trên Giao diện Người dùng (Web App):**
   * Tính năng đã có hiệu lực ngay lập tức.
   * Quản trị viên vào trang **Quản trị** $\rightarrow$ Tab **Phân quyền** để xem hoặc tùy biến chính sách phiên cho từng vai trò.
   * Để đặt chính sách riêng cho nhân sự nào, vào Tab **Nhân sự** $\rightarrow$ Bấm nút **Sửa** tại dòng nhân sự đó $\rightarrow$ Chọn chính sách mong muốn trong dropdown.
2. **Trên Google Apps Script (Backend Cloud):**
   * Toàn bộ mã nguồn backend đã được cập nhật hoàn chỉnh trong tệp `google-apps-script-backend.js`.
   * Khi muốn đồng bộ lên Cloud, Quản trị viên mở script editor tại `script.google.com`, dán đè nội dung file này và chọn **Deploy $\rightarrow$ Manage deployments $\rightarrow$ New version**!
