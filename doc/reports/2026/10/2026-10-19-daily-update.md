# Báo cáo Cập nhật Tính năng & Nâng cấp Hệ thống — 19/10/2026

> **Dự án:** MB UX Task Request Portal  
> **Nhánh phát triển:** `develop`  
> **Phạm vi cập nhật:** IA Map (Disable Node, Toolbar), Task Tracking & Chat AI (Freeze & Reject Task Workflow), Auth & Session Management (Logout & Session Expiry Modal Fix), Local Dev Environment, TypeScript Audit & Type Safety.  
> **Tình trạng nghiệm thu kỹ thuật:** TypeScript `tsc --noEmit` đạt 0 lỗi, Production Build `vite build` thành công (17.14s), 21/21 Test Suites kiểm thử tự động đạt 100% Pass.

---

## 1. Executive Summary

Trong đợt làm việc vừa qua, hệ thống **MB UX Task Request Portal** đã được kiểm tra, tối ưu hóa và hoàn thiện trên toàn bộ 9 phân hệ ứng dụng cốt lõi. Trọng tâm của đợt nâng cấp này bao gồm:
1. **Hoàn thiện tính năng Vô hiệu hóa Node (Disable Node) trên IA Map:** Hỗ trợ tắt node với hiệu ứng thị giác xám mờ 70%, gạch ngang tiêu đề, tự động lan truyền (cascade) chuẩn xác xuống toàn bộ cây con trực thuộc mà không ảnh hưởng nhầm sang các node khác.
2. **Lược bỏ nút xem chi tiết node:** Tinh giản thanh công cụ nổi của IA Map theo yêu cầu tối giản UX.
3. **Quy trình nghiệp vụ Dừng task (Freeze) & Từ chối task (Reject):** Đồng bộ hóa trạng thái hai chiều giữa ngăn kéo chi tiết (Smart Drawer), bảng Kanban, danh sách task và trợ lý ảo AI Chat (hỗ trợ lệnh `/freeze` và `/reject`).
4. **Sửa dứt điểm lỗi Đăng xuất & Vòng lặp Hết hạn Phiên:** Khắc phục lỗi không xóa sạch session, loại bỏ hiện tượng kẹt modal thông báo hết phiên đăng nhập hoặc phải ấn `Ctrl + Shift + F5` khi đăng nhập lại.
5. **Chuẩn hóa môi trường phát triển cục bộ (Local Dev):** Bổ sung cơ chế đăng nhập nhanh với OTP mặc định `123456`.
6. **Kiểm tra và xử lý 100% lỗi TypeScript:** Sửa đổi 19 file mã nguồn, phân tách hàm tiện ích Avatar độc lập (`userAvatarUtils.ts`), chuẩn hóa variant của `Badge`, đưa số lỗi compilation về 0.

---

## 2. Chi tiết các hạng mục nâng cấp & cập nhật

### 2.1. Vô hiệu hóa Node (Disable Node) trên Sơ đồ Kiến trúc Thông tin (IA Map)
- **Mục tiêu:** Cho phép người thiết kế đánh dấu các màn hình, chức năng hoặc hành trình tạm thời chưa làm hoặc bỏ qua trong giai đoạn hiện tại mà không cần xóa hẳn node khỏi sơ đồ.
- **Quy chuẩn thị giác (Visual Standards):**
  - **Màu nền & Viền:** Đổi sang màu xám mờ (`#f1f5f9` / `border-slate-300`), loại bỏ hoàn toàn đổ bóng (`shadow-none`).
  - **Độ trong suốt:** Giảm opacity tổng thể của node card xuống **70%** (`opacity-70`).
  - **Tiêu đề (Title):** Áp dụng gạch ngang giữa chữ (`line-through`) kèm màu chữ xám `text-slate-400`.
  - **Badge thông báo:** Gắn chip nhãn "Đã tắt" để nhận diện nhanh trên canvas.
  - **Đường kết nối (Connectors):** Các đường nối Bezier xuất phát từ hoặc dẫn tới node bị disable chuyển sang dạng nét đứt (`stroke-dasharray="4 4"`) với màu mờ.
- **Cơ chế lan truyền phân cấp (Cascade to Descendants):**
  - Khi một Node cha (ví dụ: Module Lv2 hoặc Journey Lv3) bị disable, toàn bộ các node con, cháu trực thuộc bên dưới sẽ tự động bị disable theo.
  - Khi kích hoạt lại (Re-enable) node cha, toàn bộ cây con sẽ được phục hồi trạng thái hoạt động.
  - **Sửa lỗi thuật toán duyệt:** Đã điều chỉnh logic trong `useIATreeState.ts` và `buildInternal` để ngăn chặn việc lan truyền nhầm sang các Root Node khác hoặc các Node anh em cùng cấp.

### 2.2. Tinh giản thanh công cụ nổi IA Map (Floating Toolbar)
- Gỡ bỏ nút "Xem chi tiết node" khỏi thanh công cụ nổi `IANodeFloatingToolbar`.
- Trải nghiệm người dùng được tập trung vào các thao tác chính: Thêm node con, Đổi màu, Đổi icon, Bật/Tắt vô hiệu hóa, Căn chỉnh vị trí và Xóa node.

### 2.3. Quy trình Dừng task (Freeze) và Từ chối task (Reject)
- **Nghiệp vụ Dừng task (Freeze):**
  - Dành cho các đề bài đang triển khai nhưng bị tạm dừng do thay đổi spec, chờ quyết định chiến lược hoặc chờ phê duyệt bổ sung từ phía đơn vị kinh doanh.
  - Lưu trữ trường dữ liệu `freeze_reason` và `frozen_at`.
  - Giao diện thể hiện: Ribbon góc thẻ màu xanh băng (Cyan/Ice), cập nhật thanh tiến độ và tạm dừng tính toán thời gian quá hạn SLA.
- **Nghiệp vụ Từ chối task (Reject):**
  - Dành cho các đề bài nộp không hợp lệ, thông tin không đầy đủ hoặc trùng lặp với đề bài khác.
  - Lưu trữ trường dữ liệu `rejected_reason` và `rejected_at`.
  - Giao diện thể hiện: Ribbon góc thẻ màu xám tro/đỏ nhạt, chuyển task vào nhóm lưu trữ đã đóng.
- **Tích hợp đồng bộ trong AI Chat:**
  - Bổ sung lệnh nhanh `/freeze [lý do]` và `/reject [lý do]` vào thanh công cụ gợi ý prompt (`AiPromptBox`).
  - Trợ lý AI có khả năng tự động trích xuất mã task đang active trong ngữ cảnh hội thoại, diễn giải lý do người dùng nhập và gọi hàm `updateTaskProgress` đồng bộ tức thì sang bảng Kanban và Google Sheet.

### 2.4. Khắc phục triệt để lỗi Đăng xuất & Vòng lặp Phiên đăng nhập
- **Hiện tượng lỗi cũ:** Người dùng bấm Đăng xuất nhưng dữ liệu session không được dọn dẹp triệt để trên một số tab. Ngoài ra, khi phiên đăng nhập hết hạn và người dùng nhập OTP đăng nhập lại, modal báo hết phiên vẫn đè lên màn hình, buộc phải bấm `Ctrl + Shift + F5` để làm mới hoàn toàn.
- **Giải pháp xử lý:**
  - **Làm sạch đồng bộ bộ nhớ:** Trong `otpAuthService.ts`, hàm `clearSession()` dọn dẹp triệt để cả `localStorage` và `sessionStorage` cho tất cả các khóa: `ux_portal_session_auth`, `ux_portal_session`, `mbbank_user_session`, `mbbank_team_members`.
  - **Truyền sự kiện đăng xuất:** Gắn prop `onLogout` thông suốt từ `App.tsx` vào cả `AppHeader.tsx` và `Sidebar.tsx`.
  - **Thoát nhanh từ Modal:** Thêm nút "Đăng xuất" phụ trên giao diện `SessionExpiredModal.tsx`.
  - **Reset trạng thái Modal:** Trong `App.tsx`, khi sự kiện `onLoginSuccess` hoặc `onSessionRenewed` được kích hoạt, biến tham chiếu `isSessionExpiredModalOpenRef.current` và state `sessionExpiredState` được thiết lập lại về `false`, xóa bỏ hoàn toàn lớp mờ backdrop và đưa người dùng trực tiếp vào giao diện làm việc.

### 2.5. Tối ưu hóa môi trường phát triển cục bộ (Local Dev Mode)
- Cập nhật cơ chế xác thực OTP: Khi chạy trên localhost/môi trường phát triển, hệ thống hỗ trợ đăng nhập 1-click hoặc nhập OTP kiểm thử `123456`, giúp các lập trình viên và kiểm thử viên kiểm tra nhanh mọi tính năng mà không bị phụ thuộc vào hạ tầng SMS/Teams webhook thực tế.

### 2.6. Kiểm toán TypeScript & Đảm bảo Tính toàn vẹn Mã nguồn
- Khắc phục toàn bộ các cảnh báo và lỗi biên dịch TypeScript:
  - Bổ sung các thuộc tính mở rộng vào interface `UXRequest` (`product_name`, `pending_reason`, `freeze_reason`, `frozen_at`, `rejected_reason`, `rejected_at`, `planned_work_date`).
  - Bổ sung `designer?: string`, `user_name?: string` và hỗ trợ loại sự kiện `"meeting"` vào `PlannerEntry` và `PlannerEntryType`.
  - Khắc phục lỗi kiểm tra `leave.fullName` có thể undefined trong `CalendarPage.tsx`.
  - Tách các hàm avatar độc lập từ `UserAvatar.tsx` sang [`src/lib/userAvatarUtils.ts`](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/lib/userAvatarUtils.ts) để các file script kiểm thử chạy bằng Node ESM (`--experimental-strip-types`) nạp module bình thường mà không bị lỗi file JSX.
  - Chuẩn hóa các variant của `Badge` (`rose` -> `destructive`, `blue` -> `info`, `slate` -> `secondary`).

---

## 3. Bằng chứng Kiểm thử & Biên dịch (Verification Evidence)

### 3.1. Kết quả TypeScript Compilation
```powershell
pnpm exec tsc --noEmit
# Exit Code: 0 (Zero errors)
```

### 3.2. Kết quả Production Build
```powershell
pnpm exec vite build
# dist/assets generated successfully in 17.14s
# Exit Code: 0
```

### 3.3. Kết quả Kiểm thử Tự động (21 Test Suites)
```text
✓ AI conversation intelligence (42/42 tests passed)
✓ Smart Diffing & Real-time Animation (21/21 tests passed)
✓ Admin System Configuration 100-Point Audit (11/11 tests passed)
✓ Work Schedule & Holiday Calendar Engine (8/8 tests passed)
✓ Designer Planner & Weekly Briefing (20/20 tests passed)
✓ Task <-> IA Linking Integration (6/6 tests passed)
✓ Nickname Synchronization (2/2 tests passed)
✓ Design System & Motion E2E Audit (114/114 tests passed)
✓ IA Map Lv5 Extension & Squad Badge (7/7 tests passed)
✓ Card Compaction & Modern Web Audit (7/7 tests passed)
✓ IA Auto-layout Lv3 Horizontal (6/6 tests passed)
✓ IA High-Performance Viewport Culling (15/15 tests passed)
✓ IA Cloud Auto-chunking & Sanitizer (5/5 tests passed)
✓ IA Unified Bottom Dock (10/10 tests passed)
✓ Silky Smooth Motion & Zero-CLS (7/7 tests passed)
✓ IA Node Tier Resolution (9/9 tests passed)
✓ IA Node Disable & Cascade (7/7 tests passed)
✓ Milestone 1 - Vercel Pipeline & Sheet Isolation (13/13 tests passed)
✓ Milestone 2 - Core Security Hardening (11/11 tests passed)
✓ Milestones 3 & 4 - Security & Infrastructure (17/17 tests passed)
✓ Freeze & Reject Task Workflow in Chat & System Sync (8/8 tests passed)
----------------------------------------------------------------------
TỔNG CỘNG: 21/21 SUITES PASSED (100% HOÀN HẢO)
```

---

## 4. Kế hoạch tiếp theo (Next Steps)
1. **Triển khai Staging / UAT:** Đưa bản build mới lên môi trường kiểm thử tập trung để đội ngũ Designer và PO thực hiện đánh giá nghiệm thu thực tế.
2. **Theo dõi Telemetry & Phản hồi:** Thu thập phản hồi từ người dùng về trải nghiệm tính năng Disable node trên các sơ đồ lớn (>300 node) và hiệu quả thao tác nhanh qua AI Chat.
3. **Bảo trì tài liệu:** Định kỳ đồng bộ các thay đổi quy chuẩn vào thư mục `doc/` của dự án.
