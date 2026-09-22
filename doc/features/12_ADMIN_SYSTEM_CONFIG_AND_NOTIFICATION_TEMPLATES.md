# ⚙️ TÍNH NĂNG 12: ĐỘNG CƠ CẤU HÌNH HỆ THỐNG ĐỘNG & MẪU THÔNG BÁO ĐA KÊNH
## (DYNAMIC SYSTEM CONFIGURATION & MULTI-CHANNEL NOTIFICATION TEMPLATES)

> **Mục tiêu tính năng:** Xóa bỏ hoàn toàn tình trạng hardcode thông số vận hành trên toàn bộ codebase. Cung cấp một động cơ cấu hình trung tâm đồng bộ thời gian thực (`src/config/systemConfig.ts`) cho phép Quản trị viên (Admin) điều chỉnh trực quan toàn bộ các ngưỡng SLA, định mức tải trọng Designer, ma trận độ ưu tiên, trọng số đánh giá KPI, thể lệ bài thi, quy tắc tệp đính kèm và 14 kịch bản thông báo đa kênh (In-app, Teams, Email, Push) kèm hệ thống banner khẩn cấp toàn trang.

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Cần thêm một thông số vận hành hoặc ngưỡng nghiệp vụ mới (ví dụ: thời gian tự động archive task, ngưỡng cảnh báo ngân sách).
  - Cần tạo thêm một mẫu sự kiện thông báo mới (ví dụ: thông báo khi có file đính kèm mới, thông báo khi bài toán được gắn tag khẩn).
  - Mở rộng thêm kênh phân phối thông báo (ví dụ: SMS Brandname MBBank, Telegram bot, Zalo ZNS).
  - Mở rộng thêm cấp độ ưu tiên (như `Lv5` tối khẩn cấp) hoặc bổ sung tiêu chí đánh giá KPI nhân sự mới.
- **Khi bảo trì / sửa lỗi:**
  - Logic phân loại trạng thái Pending (PO Pending vs Designer Pending) không khớp với số giờ timeout mong muốn.
  - Thẻ KPI công suất hoặc chu kỳ Cycle Time trên Dashboard AIOps tính toán sai định mức.
  - Các thông báo gửi đi bị thiếu biến số hoặc không thay thế placeholder `{requestId}`, `{taskTitle}`, v.v.
  - Banner thông báo khẩn cấp không hiển thị trên giao diện hoặc không tự mở lại khi Admin cập nhật thông điệp mới.
  - Cấu hình Admin bị reset hoặc không lưu được vào `localStorage`.

---

## 🏗️ 2. CẤU TRÚC KIẾN TRÚC & CÁC THÀNH PHẦN (COMPONENTS BREAKDOWN)

```
src/
├── config/
│   ├── systemConfig.ts               <-- ĐỘNG CƠ CẤU HÌNH TRUNG TÂM (Reactive Store, Types, JSON Export/Import)
│   ├── statusConfig.ts               <-- CONSUMER 1: Phân loại PO Pending quá hạn linh hoạt theo poPendingTimeoutHours
│   └── notificationTemplates.ts      <-- CONSUMER 2: Phân giải template động & thay thế placeholder biến số
│
├── components/
│   ├── admin/
│   │   ├── SystemParamsTab.tsx       <-- GIAO DIỆN QUẢN TRỊ 6 SUB-TABS (SLA, Tải việc, Ưu tiên, KPI, Thi cử, Portal)
│   │   └── NotificationTemplatesTab.tsx <-- GIAO DIỆN QUẢN TRỊ 14 MẪU THÔNG BÁO (Chips, 4 Channels, Live Preview, Test Trigger)
│   │
│   ├── common/
│   │   └── GlobalAnnouncementBanner.tsx <-- BANNER THÔNG BÁO KHẨN CẤP TOÀN TRANG (4 tone màu, Session memory)
│   │
│   ├── track/
│   │   └── RequestDetail.tsx         <-- CONSUMER 3: poWaitInfo hiển thị đếm ngược PO theo timeout động
│   │
│   └── dashboard/ai-ops/
│       └── kpiMetrics.ts             <-- CONSUMER 4: Tính % công suất & Lead time chu kỳ theo định mức động
│
└── pages/
    └── QuanLyPage.tsx                <-- TRUNG TÂM QUẢN TRỊ (Render tab "system_params" & "notifications_config")
```

---

## 📋 3. CHI TIẾT 8 PHÂN HỆ THAM SỐ QUẢN TRỊ LINH HOẠT

### 3.1. Phân hệ SLA & Thời hạn Xử lý (`sla`)
Quản lý toàn diện các mốc cam kết chất lượng dịch vụ (Service Level Agreement):
- `defaultTurnaroundDays` (Mặc định `5.0` ngày): Thời gian xử lý trung bình tiêu chuẩn cho một yêu cầu thiết kế.
- `fastTurnaroundDays` (Mặc định `3.5` ngày): Thời gian xử lý cam kết cho các yêu cầu thuộc luồng ưu tiên cao (Fast-track).
- `targetCycleDays` (Mặc định `5.0` ngày): Mục tiêu chu kỳ chu chuyển tổng thể từ lúc khởi tạo đến lúc hoàn tất bàn giao.
- `poPendingTimeoutHours` (Mặc định `24` giờ): Giới hạn thời gian tối đa chờ Product Owner (PO) phản hồi phê duyệt phương án. Khi bài toán ở trạng thái "Đã gửi PO" quá số giờ này mà chưa được phản hồi, hệ thống tự động gắn nhãn cảnh báo **PO Pending** màu hổ phách.
- `blockerTimeoutDays` (Mặc định `3` ngày): Giới hạn số ngày bài toán bị chặn trước khi chuyển sang mức độ vi phạm SLA đỏ.
- `slaWarningPercent` (Mặc định `80`%): Tỷ lệ thời gian trôi qua để kích hoạt cảnh báo vàng trước khi trễ hạn.

### 3.2. Phân hệ Tải công việc & Năng lực Designer (`capacity`)
Kiểm soát cân bằng tải và bảo vệ nhân sự khỏi nguy cơ quá tải:
- `defaultDesignerCapacity` (Mặc định `2` task/người): Định mức số lượng bài toán song song lý tưởng cho 1 UX Designer.
- `workloadHighThreshold` (Mặc định `2.0` ratio): Ngưỡng tỷ lệ bài toán/nhân sự bắt đầu cảnh báo tải cao.
- `workloadOverloadThreshold` (Mặc định `2.8` ratio): Ngưỡng tỷ lệ bài toán/nhân sự kích hoạt cảnh báo ĐỎ QUÁ TẢI.
- `defaultSquadCapacity` (Mặc định `6` task): Hạn mức tiếp nhận bài toán đồng thời tối đa của một Squad thiết kế.
- `overloadNotificationEnabled` (Mặc định `true`): Cho phép tự động bắn cảnh báo khi một Squad hoặc Designer vượt ngưỡng quá tải.

### 3.3. Phân hệ Ma trận Độ ưu tiên & SLA Cam kết (`priorities`)
Cấu hình danh mục các mức độ ưu tiên theo chuẩn ngân hàng:
- `Lv1` - Cao nhất (Khẩn cấp): Cam kết 2 ngày, trọng số điểm 5, màu thẻ Đỏ (Rose).
- `Lv2` - Cao: Cam kết 3 ngày, trọng số điểm 4, màu thẻ Hổ phách (Amber).
- `Lv3` - Trung bình: Cam kết 5 ngày, trọng số điểm 3, màu thẻ Xanh dương (Blue).
- `Lv4` - Thấp nhất: Cam kết 7 ngày, trọng số điểm 2, màu thẻ Xám đá (Slate).
- *Hỗ trợ mở rộng `Lv5`*: Khẩn cấp đặc biệt / Sự cố Production (0.5 ngày, trọng số điểm 10).

### 3.4. Phân hệ Trọng số Đánh giá Hiệu suất KPI (`evaluation`)
Định lượng năng lực nhân sự theo 4 trục tiêu chí cốt lõi:
- `qualityWeight` (Mặc định `35`%): Trọng số đánh giá chất lượng UI Execution & độ hoàn thiện visual.
- `slaComplianceWeight` (Mặc định `25`%): Trọng số chiến lược UX, User Flow & độ sâu nghiên cứu người dùng.
- `ftrWeight` (Mặc định `20`%): Trọng số tỷ lệ nghiệm thu lần đầu First-Time-Right (không phải sửa lại nhiều lần).
- `designSystemWeight` (Mặc định `20`%): Trọng số mức độ tuân thủ Design System MB và chuẩn hóa Token.
- **Ràng buộc kiểm tra tự động (Live Validation):** Hệ thống tự động kiểm tra tổng 4 trọng số:
  $$\text{qualityWeight} + \text{slaComplianceWeight} + \text{ftrWeight} + \text{designSystemWeight} = 100\%$$
  Nếu tổng khác 100%, Admin không được phép lưu và giao diện hiển thị thanh thông báo lỗi trực quan.

### 3.5. Phân hệ Đề thi & Khảo sát Đánh giá Năng lực (`assessment`)
- `passingScorePercent` (Mặc định `70`%): Điểm số tối thiểu để vượt qua bài kiểm tra năng lực UX.
- `durationMinutes` (Mặc định `60` phút): Thời gian làm bài thi trắc nghiệm & tự luận.
- `maxAttempts` (Mặc định `3` lần): Số lần tối đa một nhân sự được làm lại bài kiểm tra.
- `questionCount` (Mặc định `20` câu): Số lượng câu hỏi nạp từ ngân hàng đề thi Excel/Google Sheets.

### 3.6. Phân hệ Cổng Thông tin & Thông báo Khẩn Toàn Cầu (`portal`)
- `systemName`: Tên định danh hiển thị của cổng (Mặc định: *"MBBank UX Task Management"*).
- `organizationName`: Tên đơn vị phụ trách (Mặc định: *"Khối Ngân hàng Số MBBank"*).
- `contactEmail`: Hòm thư hỗ trợ người dùng (Mặc định: *"ux.support@mbbank.com.vn"*).
- `portalSubtitle`: Dòng mô tả khẩu hiệu trên thanh điều hướng.
- `announcement`: Cấu hình Banner khẩn cấp toàn trang:
  - `enabled`: Công tắc Bật/Tắt hiển thị banner.
  - `type`: Tone màu cảnh báo (`info`, `warning`, `success`, `destructive`).
  - `message`: Nội dung thông điệp ngắn gọn.
  - `linkUrl`: Đường dẫn chi tiết (ví dụ: link thông báo bảo trì, thông tư mới).
  - `linkText`: Nhãn của nút liên kết (Mặc định: *"Chi tiết"*).
  - `dismissible`: Cho phép người dùng bấm đóng banner trong phiên duyệt web.

### 3.7. Phân hệ Quy tắc Tệp Đính kèm (`attachments`)
- `maxFileSizeMb` (Mặc định `25` MB): Giới hạn dung lượng tải lên tối đa của một tệp tin.
- `allowedExtensions` (Mặc định `[".png", ".jpg", ".jpeg", ".pdf", ".fig", ".zip", ".xlsx"]`): Danh sách định dạng tệp được phép đính kèm.
- `requireFigmaLink` (Mặc định `false`): Bắt buộc phải có link Figma trước khi nghiệm thu hoàn thành.

### 3.8. Phân hệ 14 Mẫu Thông báo Đa Kênh (`notifications`)
Bao quát 100% các điểm chạm tương tác giữa PO, Designer, Design Owner và Hệ thống:
1. `task_created`: Thông báo tiếp nhận yêu cầu thiết kế mới.
2. `designer_assigned`: Thông báo phân công Designer vào bài toán.
3. `phase_advanced`: Thông báo bài toán đã hoàn thành và bước sang khâu tiếp theo.
4. `sent_to_po`: Thông báo bàn giao phương án thiết kế cho PO kiểm duyệt.
5. `po_approved`: Thông báo PO đã bấm duyệt phương án thiết kế.
6. `po_rejected`: Thông báo PO yêu cầu chỉnh sửa/bổ sung thiết kế.
7. `task_completed`: Thông báo bài toán hoàn tất bàn giao cho đội ngũ phát triển (Dev).
8. `task_blocked`: Thông báo bài toán bị tạm dừng/bị chặn do vướng mắc nghiệp vụ.
9. `task_unblocked`: Thông báo tháo gỡ tắc nghẽn, tiếp tục thực hiện bài toán.
10. `sla_warning`: Cảnh báo nguy cơ trễ hạn bàn giao theo cam kết SLA.
11. `sla_breached`: Cảnh báo bài toán đã vượt quá thời hạn SLA cam kết.
12. `po_pending_alert`: Cảnh báo khẩn cấp PO chưa phản hồi bài toán sau thời hạn quy định.
13. `comment_mention`: Thông báo khi có thành viên đề cập `@tên` trong thảo luận.
14. `system_announcement`: Thông báo bảo trì hoặc chỉ đạo nghiệp vụ từ Quản trị viên.

### 3.9. Phân hệ Lịch Làm Việc & Ngày Nghỉ Lễ (`workSchedule`)
Quản lý chế độ làm việc và ngày nghỉ hành chính đồng bộ hóa vào động cơ tính hạn SLA:
- `workDays` (Mặc định `[1, 2, 3, 4, 5]`): Danh sách các ngày làm việc trong tuần (Thứ Hai đến Thứ Sáu, tương ứng `[Mo, Tu, We, Th, Fr]`).
- `workHours`: Khung giờ làm việc chuẩn:
  - `start` (Mặc định `"08:00"`): Giờ bắt đầu làm việc buổi sáng.
  - `end` (Mặc định `"17:30"`): Giờ kết thúc làm việc buổi chiều.
- `lunchBreak`: Cấu hình thời gian nghỉ trưa:
  - `enabled` (Mặc định `true`): Bật khấu trừ thời gian nghỉ trưa.
  - `start` (Mặc định `"12:00"`): Giờ bắt đầu nghỉ trưa.
  - `end` (Mặc định `"13:30"`): Giờ kết thúc nghỉ trưa (thời lượng: 1h 30m).
- `holidays`: Danh mục ngày nghỉ lễ & ngoại lệ (`HolidayScheduleEntry`):
  - Tích hợp sẵn 11 ngày nghỉ lễ Quốc gia Việt Nam 2026 (`VIETNAM_PUBLIC_HOLIDAYS_2026`).
  - Hỗ trợ thêm ngày nghỉ nội bộ MBBank, ngày kỷ niệm hoặc team-building.
- **Các hàm tính toán toán học chuẩn xác:**
  - `isBusinessDay(date, schedule)`: Kiểm tra một ngày bất kỳ có phải là ngày làm việc hành chính hay không.
  - `getDailyWorkingMinutes(schedule)`: Tính số phút làm việc chuẩn/ngày sau khi trừ nghỉ trưa (480 phút = 8h00m).
  - `getWeeklyCapacityHours(schedule)`: Định mức công suất tuần (40.0 giờ/tuần).
  - `calculateBusinessHoursBetween(start, end, schedule)`: Tính chính xác số giờ làm việc giữa 2 mốc thời gian, loại bỏ ngày nghỉ và giờ nghỉ trưa.
  - `calculateSlaElapsedHours(start, end, schedule)`: Tính số giờ đã trôi qua phục vụ SLA PO Pending, tự động khấu trừ 48h cuối tuần và ngày lễ.
  - `addBusinessDays(start, days, schedule)`: Cộng ngày làm việc tự động nhảy cóc qua cuối tuần và ngày lễ.

Mỗi mẫu thông báo hỗ trợ:
- `titleTemplate`: Chuỗi tiêu đề có hỗ trợ placeholder.
- `messageTemplate`: Chuỗi nội dung chi tiết có hỗ trợ placeholder.
- `channels`: Bật/tắt 4 kênh phân phối (`inApp`, `teams`, `email`, `push`).

---

## ⚡ 4. CƠ CHẾ ĐỒNG BỘ PHẢN ỨNG THỜI GIAN THỰC (REACTIVE EVENT ARCHITECTURE)

### 4.1. Vòng Đời Cấu Hình & Bus Sự Kiện

```
                    ┌────────────────────────────┐
                    │ Admin sửa tham số trong UI │
                    │   (SystemParamsTab.tsx)    │
                    └─────────────┬──────────────┘
                                  │
                                  ▼ saveSystemConfig()
                    ┌────────────────────────────┐
                    │  Ghi vào localStorage      │
                    │   (mb_system_config_v1)    │
                    └─────────────┬──────────────┘
                                  │
                                  ▼ window.dispatchEvent()
            ┌──────────────────────────────────────────────┐
            │  Event: "mbbank_system_config_changed"       │
            └──────────────┬───────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┬───────────────────┐
       ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Global Banner │   │ RequestDetail │   │  kpiMetrics   │   │ statusConfig  │
│  (Cập nhật    │   │ (Cập nhật đếm │   │ (Cập nhật     │   │ (Cập nhật PO  │
│  thông điệp)  │   │  ngược PO)    │   │  ngưỡng tải)  │   │  timeout)     │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
```

### 4.2. Cơ Chế Dự Phòng & Độc Lập Module (Fault Tolerance)
Để đảm bảo ứng dụng **không bao giờ bị crash** kể cả khi người dùng truy cập từ môi trường kiểm thử cô lập (Node.js ESM, Data URL transpilation, Service Worker):
- Hàm `getPoPendingTimeoutHours()` trong `statusConfig.ts` đọc trực tiếp từ `localStorage` với cơ chế bọc `try/catch` an toàn:
  ```typescript
  export function getPoPendingTimeoutHours(): number {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem("mb_system_config_v1")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.sla?.poPendingTimeoutHours && Number(parsed.sla.poPendingTimeoutHours) > 0) {
            return Number(parsed.sla.poPendingTimeoutHours)
          }
        }
      }
    } catch {}
    return 24 // Fallback chuẩn MBBank an toàn
  }
  ```
- Tránh việc import module chéo hình tròn (circular dependency) giữa `statusConfig.ts` và `systemConfig.ts`.

---

## 💻 5. HƯỚNG DẪN MỞ RỘNG (DEVELOPER EXTENSION GUIDE)

### 5.1. Bổ Sung Tham Số Cấu Hình Mới
1. **Khai báo TypeScript Type** trong `src/config/systemConfig.ts`:
   ```typescript
   export interface SlaConfig {
     // ... các trường cũ
     autoArchiveDays?: number // Thêm trường mới
   }
   ```
2. **Cung cấp giá trị mặc định** trong `DEFAULT_SYSTEM_CONFIG`:
   ```typescript
   export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
     // ...
     sla: {
       // ...
       autoArchiveDays: 30,
     }
   }
   ```
3. **Thêm trường nhập liệu** vào `SystemParamsTab.tsx` tương ứng với phân khu mong muốn.
4. **Viết test kiểm thử** trong `test-system-config.mjs` xác nhận giá trị được lưu và đọc chính xác.

### 5.2. Bổ Sung Mẫu Thông Báo Mới
1. Khai báo key sự kiện trong `NotificationType` (`src/config/systemConfig.ts`):
   ```typescript
   export type NotificationType =
     | "task_created"
     // ...
     | "new_file_attached"
   ```
2. Bổ sung nội dung mặc định vào `DEFAULT_NOTIFICATION_SETTINGS`.
3. Bổ sung nhãn hiển thị trong `NotificationTemplatesTab.tsx`.

---

## 🛡️ 6. CHECKLIST KIỂM THỬ AN TOÀN ĐẠT 100 ĐIỂM

Trước khi merge hoặc bàn giao các thay đổi liên quan đến cấu hình hệ thống, hãy đảm bảo:
- [x] Chạy lệnh `node test-system-config.mjs` vượt qua 11/11 bài kiểm thử tự động.
- [x] Chạy lệnh `node test-e2e-design-system.mjs` vượt qua 114/114 bài kiểm thử thiết kế giao diện.
- [x] Chạy lệnh `node test-form-config.mjs` vượt qua 6/6 bài kiểm thử cấu hình form.
- [x] Thử bấm *"Khôi phục mặc định"* trong Admin và đảm bảo toàn bộ tham số trở về chuẩn MBBank.
- [x] Thử bấm *"Xuất JSON"* và *"Nhập JSON"* đảm bảo round-trip toàn vẹn dữ liệu.
- [x] Chạy lệnh `npm run build` đạt 0 lỗi cảnh báo TypeScript.
