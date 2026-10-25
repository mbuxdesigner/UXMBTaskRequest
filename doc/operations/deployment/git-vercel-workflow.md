# Hướng dẫn Vận hành Git Workflow & Pipeline Triển khai Vercel Không Downtime

> **Hệ thống**: UXMB Task Request Portal  
> **Production Domain**: [https://uxmb-task-request.vercel.app](https://uxmb-task-request.vercel.app)  
> **Development / Preview Branch**: `develop`  
> **Production Branch (Locked)**: `main`  
> **Cập nhật**: Tháng 09/2026  

---

## 1. Tổng quan Kiến trúc Vận hành (Deployment Architecture)

Ứng dụng **UXMB Task Request** là cổng thông tin nội bộ của Khối Thiết kế Trải nghiệm Người dùng (UX/UI) MBBank, kết nối trực tiếp các Product Owner (PO), Ban Giám đốc, và các UX Designer. 

Để đảm bảo các tính năng bảo mật, nâng cấp giao diện, và sửa lỗi được triển khai liên tục mà **hoàn toàn không làm gián đoạn người dùng (Zero Downtime)** và **không làm sai lệch dữ liệu bảng tính Google Sheet thực tế**, hệ thống thiết lập pipeline CI/CD phân cấp 2 tầng trên Git & Vercel:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        GIT & VERCEL PIPELINE                           │
│                                                                        │
│  [ Feature Branch ]                                                    │
│  feat/my-feature ──┐                                                   │
│                    ├──(Pull Request + CI Check)                        │
│  fix/my-bug ───────┘                                                   │
│                    ▼                                                   │
│            [ develop branch ] (Active Development)                     │
│                    │                                                   │
│                    ▼ (Tự động build Vercel Preview)                   │
│          ┌───────────────────────────────────┐                         │
│          │  Vercel Preview URL               │                         │
│          │  https://...-develop-*.vercel.app │                         │
│          │  - VITE_APP_ENV: preview          │                         │
│          │  - 5-Tier Safe Sheet Isolation    │                         │
│          │  - Tag [TEST] + REQ-TEST-*        │                         │
│          │  - Suppress live Teams alerts     │                         │
│          └───────────────────────────────────┘                         │
│                    │                                                   │
│                    ▼ (Pull Request + QA Approval + Automated Checks)   │
│             [ main branch ] (LOCKED - Strictly Production)             │
│                    │                                                   │
│                    ▼ (Tự động build Vercel Production)                │
│          ┌───────────────────────────────────┐                         │
│          │  Vercel Production URL            │                         │
│          │  https://uxmb-task-request.vercel │                         │
│          │  - VITE_APP_ENV: production       │                         │
│          │  - Real Live Data (RAW_TASKS)     │                         │
│          │  - Strict Security Headers & HSTS │                         │
│          └───────────────────────────────────┘                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chiến lược Phân nhánh Git (Branching Strategy)

### 2.1 Nhánh `main` (Production - ĐÃ KHÓA)
- **Mục đích**: Nhánh chứa mã nguồn chính thức đang chạy trên môi trường Live Production (`https://uxmb-task-request.vercel.app`).
- **Quy tắc bảo vệ (Branch Protection Rules trên GitHub)**:
  1. **Tuyệt đối cấm push trực tiếp** (`git push origin main` bị chặn bởi policy).
  2. Mọi thay đổi đều phải thông qua **Pull Request (PR)** xuất phát từ nhánh `develop`.
  3. Yêu cầu ít nhất **1 reviewer phê duyệt (Code Review Approved)** từ Tech Lead / Admin trước khi merge.
  4. Bắt buộc vượt qua toàn bộ **Automated Status Checks** (`pnpm test`, `vite build`).
  5. Luôn giữ lịch sử commit sạch thông qua chế độ **Squash and Merge** hoặc **Rebase and Merge**.

### 2.2 Nhánh `develop` (Integration & Preview)
- **Mục đích**: Nhánh tích hợp chính dành cho quá trình phát triển tính năng mới, kiểm thử bảo mật, và kiểm tra hồi quy.
- **Cơ chế Vercel**: Mỗi khi push commit lên `develop`, Vercel lập tức kích hoạt bản build Preview độc lập (Preview Deployment) kèm URL duy nhất (ví dụ: `https://uxmb-task-request-git-develop-mbuxdesigner.vercel.app`).
- **Domain alias khuyến nghị**: Gán tên miền alias cố định `dev.uxmb-task-request.vercel.app` (hoặc Preview domain tương đương) trỏ vào nhánh `develop`.

### 2.3 Các nhánh Tính năng & Vá lỗi (`feat/*`, `fix/*`)
- Nhánh con được tạo từ `develop`:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feat/task-isolation-m1
  ```
- Tuân thủ quy chuẩn đặt tên commit (Conventional Commits):
  - `feat(...)`: Tính năng mới
  - `fix(...)`: Sửa lỗi
  - `refactor(...)`: Tái cấu trúc
  - `docs(...)`: Tài liệu
  - `test(...)`: Bộ kiểm thử

---

## 3. Quy trình Đánh giá Pull Request (PR Review Workflow)

```text
[Lập trình viên]          [Vercel CI / GitHub Actions]         [Reviewer / QA]
       │                                │                             │
       ├──── Tạo PR vào `develop` ──────>                             │
       │                                ├──── Chạy Test & Build ─────>│
       │                                ├──── Sinh Preview URL ──────>│
       │                                │                             ├─ Test trên Preview URL
       │                                │                             ├─ Kiểm tra dữ liệu [TEST]
       │                                │                             ├─ Phê duyệt (Approve PR)
       │<── Merge vào `develop` ────────┴─────────────────────────────┤
       │                                                              │
       │                                                              │
       ├──── Tạo PR từ `develop` vào `main` ─────────────────────────>│
       │                                ├──── Chạy Regression Test ──>│
       │                                │                             ├─ Phê duyệt Release
       │<── Merge vào `main` (Zero-Downtime Deploy to Production) ────┤
```

### Các bước chi tiết:
1. **Kiểm tra cục bộ trước khi mở PR**:
   ```bash
   pnpm test
   pnpm run build
   ```
2. **Mở Pull Request vào `develop`**:
   - Tiêu đề PR rõ ràng, mô tả mục tiêu và danh sách màn hình/file bị ảnh hưởng.
   - Nhận diện link Vercel Preview do bot Vercel bình luận tự động trong PR.
3. **Kiểm thử trên link Preview**:
   - Đăng nhập thử nghiệm, tạo bài toán mẫu, kiểm tra tính năng mới.
   - Xác nhận rằng các bài toán tạo trên link Preview có nhãn `[TEST]` và không xuất hiện trên `https://uxmb-task-request.vercel.app`.
4. **Merge vào `develop` và tạo Release PR sang `main`**:
   - Khi `develop` đã tích lũy đủ các tính năng đã được kiểm chứng và sẵn sàng bàn giao, tạo PR `develop -> main`.
   - Admin/Tech Lead kiểm duyệt và bấm **Squash and Merge**. Vercel sẽ tự động cập nhật bản Live Production sau ~15-30 giây mà không cần khởi động lại máy chủ.

---

## 4. Cấu hình Vercel Pipeline (`vercel.json`)

Tệp `vercel.json` tại thư mục gốc cung cấp các tiêu chuẩn bảo mật hạ tầng và điều hướng SPA:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://script.google.com https://script.googleusercontent.com https://docs.google.com https://mbbank.webhook.office.com https: ws: wss:; font-src 'self' https: data:; img-src 'self' https: data: blob:; style-src 'self' https: 'unsafe-inline'; script-src 'self' https: 'unsafe-inline' 'unsafe-eval';"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Các giá trị cốt lõi:
- **SPA Rewrites**: Mọi đường dẫn URL phía client đều trỏ về `/index.html` để Vue/React Router/Hash Router điều hướng chuẩn xác, tránh lỗi HTTP 404 khi tải lại trang.
- **HSTS (HTTP Strict Transport Security)**: Buộc trình duyệt luôn giao tiếp qua HTTPS mã hóa trong vòng 2 năm (`max-age=63072000`).
- **Anti-Clickjacking**: `X-Frame-Options: SAMEORIGIN` ngăn chặn việc nhúng portal vào `<iframe>` ngoài domain ngân hàng.
- **CSP (Content Security Policy)**: Chỉ cho phép kết nối dữ liệu tới domain Google Apps Script, Google Docs và MS Teams Webhook hợp lệ.

---

## 5. Chiến lược Dùng chung 1 Google Sheet An toàn (5-Tier Sandbox Isolation)

Do hệ thống hiện tại sử dụng chung 1 Google Spreadsheet (`1gpe5W7whAMxIZLjsjVxEW23vcaa9ny0m9Qj327zKYzw`), việc thử nghiệm trên bản `develop` hoặc Preview URL có thể ghi đè làm hỏng dữ liệu thực tế nếu không có cơ chế cách ly. Hệ thống áp dụng **Kiến trúc 5 Tầng Cách Ly Dữ Liệu**:

| Tầng | Cơ chế Bảo vệ | Mô tả Chi tiết |
|---|---|---|
| **Tier 1: Runtime Detection** | Tự động phân định môi trường | Frontend hàm `getAppEnvironment()` trong `src/config/googleSheetConfig.ts` kiểm tra `window.location.hostname`. Nếu là `uxmb-task-request.vercel.app` -> `production`. Nếu là `*.vercel.app` (Preview) hoặc `localhost` -> `preview` / `development`. |
| **Tier 2: Namespace & Title Tagging** | Gắn thẻ nhận diện `[TEST]` | Bất kỳ yêu cầu nào phát sinh từ môi trường test/preview sẽ tự động được thêm tiền tố `[TEST]` vào tiêu đề (`title`) và gán mã định danh dạng `REQ-TEST-YYYYMMDD-xxx`. |
| **Tier 3: Payload Flagging** | Đính kèm cờ cách ly | Payload gửi lên Google Apps Script luôn kèm `client_environment: "preview"` và `is_test: true`. |
| **Tier 4: Physical Sheet Segregation** | Lưu trữ vào Tab riêng biệt | Backend Google Apps Script (`google-apps-script-backend.js`) khi phát hiện `is_test: true` hoặc ID `REQ-TEST-` sẽ chuyển hướng ghi vào sheet **`RAW_TASKS_TEST`** thay vì `RAW_TASKS`, và phân tách hiển thị vào **`Tasks_Test_View`**. Cấu hình hệ thống được lưu vào **`RAW_SETTINGS_TEST`**. |
| **Tier 5: KPI & Alert Protection** | Chặn làm sai lệch báo cáo & Spam | - Các truy vấn Dashboard/KPI trên bản Production tự động loại trừ mọi bản ghi có ID `REQ-TEST-` hoặc cờ `is_test`.<br>- Google Apps Script chặn kích hoạt Webhook gửi OTP/tin nhắn vào kênh Microsoft Teams thật của Khối khi phát hiện yêu cầu từ môi trường test. |

---

## 6. Biến Môi trường (Environment Variables)

Hệ thống quản lý biến môi trường qua các tệp:
- `.env.example`: Tệp mẫu tiêu chuẩn dùng làm tài liệu tham chiếu.
- `.env.development`: Dành cho môi trường phát triển local (`npm run dev`).
- `.env.production`: Cấu hình mặc định cho bản build production.

### Danh mục biến:
```env
# Môi trường ứng dụng ('production' | 'preview' | 'development')
VITE_APP_ENV=production

# Đường dẫn Google Apps Script Web App
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyz4_GK_guUx9L6uaRd4vK5jqJwG60eLr8Xju3j2hcEUianS8873cp4fJe8BBBrilKQ/exec

# Mã Google Spreadsheet Trung tâm
VITE_GOOGLE_SHEET_ID=1gpe5W7whAMxIZLjsjVxEW23vcaa9ny0m9Qj327zKYzw

# URL Bảng tính Quản lý Nghỉ phép (Team Leaves)
VITE_LEAVE_SHEET_URL=https://docs.google.com/spreadsheets/d/1oeDjaIMIuDsG2bDG2HT8euLICVXxQvWpf-2jfDr3Vlg/edit?gid=917777763
VITE_LEAVE_SHEET_GID=917777763

# Bật/Tắt Bypass OTP trong môi trường phát triển cục bộ
VITE_ENABLE_DEV_OTP_BYPASS=false
```

---

## 7. Quy trình Phục hồi Sự cố (Rollback & Disaster Recovery)

1. **Rollback tức thì trên Vercel (Instant Rollback < 10 giây)**:
   - Truy cập **Vercel Dashboard > Project `uxmb-task-request` > Deployments**.
   - Tìm bản triển khai ổn định gần nhất trước đó (có nhãn `Production`).
   - Nhấp vào biểu tượng 3 chấm `...` và chọn **Instant Rollback**.
   - Vercel ngay lập tức điều hướng toàn bộ traffic người dùng về bản build trước đó với độ trễ 0ms.
2. **Revert mã nguồn trên Git**:
   ```bash
   git checkout main
   git pull origin main
   git revert <commit-hash-gay-loi>
   git push origin main
   ```
3. **Dữ liệu Google Sheet**:
   - Nhờ kiến trúc 5 tầng cách ly, các thao tác thử nghiệm không bao giờ ghi đè lên `RAW_TASKS`.
   - Nếu xảy ra sự cố chỉnh sửa nhầm trên bảng tính, quản trị viên sử dụng **Google Drive Version History** hoặc bản sao lưu định kỳ để khôi phục trạng thái trước đó.
