# BÁO CÁO CẬP NHẬT HỆ THỐNG NGÀY 28/09/2026

> **Phạm vi:** Designer Planner cá nhân, Schedule Meeting, AI briefing UI, Calendar day-state, planned work date persistence và chuẩn hóa interaction bằng right sheet
> **Nhánh:** `develop`
> **Trạng thái:** Hoàn thành triển khai, tài liệu hóa và kiểm thử trước khi đẩy `origin/develop`

---

## 1. Tóm tắt điều hành

Ngày 28/09/2026 hoàn thiện phiên bản Designer Planner cá nhân và đặt màn hình này làm route mặc định của **Lịch & Planner**. Trải nghiệm mới ưu tiên khả năng nắm nhanh công việc cá nhân, các mốc sắp tới và lịch làm việc theo bố cục 70/30.

Các thay đổi chính gồm:

- Lời chào cá nhân, câu truyền cảm hứng typewriter đổi sau mỗi 20 giây.
- Rule-based AI briefing giao diện trắng kiểu ClickUp, dùng icon `ai-default.png`, progressive typing và hover preview.
- KPI cá nhân, phân bố công việc theo khâu UX và deep-link sang My Task.
- Lịch tháng/tuần với deadline, ngày dự kiến làm, nghỉ phép, event và trạng thái nghỉ lễ/làm bù.
- Schedule Meeting theo pattern REUI Schedule 3, danh mục sự kiện động từ Admin và chọn người tham gia từ danh sách Designer.
- Chuẩn hóa mọi popup trong Planner thành right sheet trượt từ phải.
- Persistence cho `planned_work_date` từ frontend tới Google Apps Script mà không thay đổi deadline cam kết.

---

## 2. Designer Planner cá nhân

### Bố cục chính

1. Header hiển thị ngày hiện tại, lời chào theo Designer và câu cảm hứng.
2. Khu tổng quan hai cột gồm AI briefing và số liệu cá nhân.
3. Lịch làm việc là nội dung trung tâm, hỗ trợ Month/Week, Today và điều hướng kỳ trước/sau.
4. Cột chi tiết ngày gồm lịch/mốc cần nhớ, task ưu tiên và task chưa xếp ngày.
5. Feed cập nhật liên quan đến Designer với hai trạng thái Chưa đọc/Tất cả.
6. Màn hình nhỏ chuyển thành bố cục một cột; calendar có vùng cuộn riêng.

### Dữ liệu cá nhân

- Task lọc bằng `isTaskAssignedToUser()` theo phiên hiện tại.
- KPI gồm task đang phụ trách, task overload và task go-live trong tuần.
- Phân bố task theo bốn nhóm UX: Define đầu bài, Wireframe + UI, Ready to dev và Nghiệm thu UI.
- AI briefing hiện là rule engine nội bộ, không truyền dữ liệu ra AI provider bên ngoài.

---

## 3. Calendar semantics và ngày không làm việc

- Thứ Bảy, Chủ Nhật và ngày không làm việc theo `workSchedule.workweek` dùng nền xám.
- Nghỉ lễ không còn render thành event/task chip; ô lịch hiển thị watermark **Nghỉ lễ** và tên ngày lễ.
- Ngày làm bù dùng nền xanh nhẹ và watermark **Làm bù**.
- Deadline cam kết và ngày dự kiến làm là hai lớp dữ liệu riêng.
- Event chip lấy màu trực tiếp từ `calendar.eventCategories` trong Admin Settings.
- Ô ngày giới hạn ba mục ở Month view và hiển thị `+N mục khác` khi vượt giới hạn.

---

## 4. Schedule Meeting

Schedule Meeting được triển khai trong right sheet theo cấu trúc REUI Schedule 3:

- Lịch tháng trực quan, chuyển tháng và làm nổi ngày đang chọn.
- Time slot nhanh, giờ tùy chỉnh và thời lượng 30–120 phút.
- Lặp hằng ngày, hằng tuần hoặc hằng tháng; bắt buộc có ngày kết thúc.
- Recurrence được mở rộng thành occurrence thực tế đến `recurrenceEndDate`, giữ nguyên giờ/thời lượng và kiểm tra xung đột nghỉ phép cho từng occurrence.
- Loại sự kiện dùng custom picker, hiển thị tên, mô tả và màu đúng cấu hình Admin.
- Người tham gia chỉ chọn từ Designer/Design Owner trong `mbbank_admin_team` hoặc dữ liệu `fetchTeamMembersFromSheet()`; không nhập email tự do.
- Một ảnh thumbnail tối đa 10 MB, upload qua Google Drive gateway và lưu trong `TeamEvent.attachments`.
- Loại bỏ hai tùy chọn không cần thiết: Phòng chờ và Tự động ghi.

Schema `TeamEvent` được mở rộng không phá vỡ dữ liệu cũ với:

- `durationMinutes`
- `recurrence`
- `recurrenceEndDate`
- `attachments`

---

## 5. AI briefing và motion

### Khối AI điểm nhanh

- Chuyển từ dark card sang surface trắng đồng bộ phong cách ClickUp.
- Dùng asset `public/ai-default.png`.
- Nội dung nhận định được viết lần lượt bằng progressive typewriter khi tải trang hoặc bấm **Tóm tắt lại**.
- Hover/focus nhận định mở preview card có boundary detection, mô tả và metadata task liên quan.
- Click vẫn thực hiện hành động chính: mở task hoặc chọn ngày tương ứng.

### Câu truyền cảm hứng

- Random một câu khi vào trang.
- Gõ từng ký tự, giữ 20 giây, xóa dần rồi random câu khác.
- Không lặp ngay câu đang hiển thị.
- Tuân theo chính sách runtime `MotionConfig reducedMotion="never"` của dự án để tránh lỗi Windows báo reduced motion ngoài mong đợi.

---

## 6. Right sheet interaction

Thêm hai primitive dùng chung:

| Component | Vai trò |
| :--- | :--- |
| `RightSheet` | Portal vào `document.body`, backdrop, Escape/outside-click, spring slide từ phải, sticky header/footer và full-width mobile |
| `HoverPreview` | Preview nổi theo con trỏ/focus, tự clamp trong viewport và không thay thế hành động click chính |

Các luồng Planner đã chuyển từ centered modal sang right sheet:

- Xếp ngày dự kiến làm.
- Schedule Meeting.
- Chi tiết lịch và mốc cần nhớ.

Task Detail vốn đã là slide-over nên tiếp tục được tái sử dụng khi click task, notification hoặc AI briefing.

---

## 7. Planned work date và Cloud persistence

- Bổ sung `UXRequest.planned_work_date` để lưu ngày Designer dự kiến thực hiện.
- `calendarService.updateTaskPlannedDate()` cập nhật cache và activity note nhưng không đổi `expected_deadline`/`design_deadline`.
- `googleSheetService.updateTaskProgressInSheet()` gửi và normalize `planned_work_date`.
- `google-apps-script-backend.js` ghi trường này vào payload task trong `handleUpdateTaskProgress()`.
- Cần deploy **New version** của Apps Script để thay đổi backend có hiệu lực trên Cloud.

---

## 8. Thành phần và file chính

| File | Thay đổi |
| :--- | :--- |
| `src/pages/DesignerPlannerPage.tsx` | Trang Planner cá nhân và toàn bộ orchestration UI/data |
| `src/lib/designerPlanner.ts` | Week bounds, phase distribution, go-live và briefing rules |
| `src/components/planner/ScheduleMeetingDialog.tsx` | Schedule Meeting right sheet, calendar, picker và thumbnail |
| `src/components/ui/right-sheet.tsx` | Primitive sheet trượt từ phải |
| `src/components/ui/hover-preview.tsx` | Primitive hover/focus preview |
| `src/services/calendarService.ts` | Planned date, calendar merging và recurrence expansion |
| `src/config/systemConfig.ts` | Mở rộng schema TeamEvent |
| `src/services/googleSheetService.ts` | Contract persistence planned work date |
| `google-apps-script-backend.js` | Lưu `planned_work_date` trong task payload |
| `tests/test-designer-planner.mjs` | Regression contract cho Planner và Schedule Meeting |

---

## 9. Kiểm thử và chất lượng

- Planner unit/contract checks: **10/10 PASS**.
- Kiểm tra weekly recurrence và ngày kết thúc: PASS.
- Kiểm tra category picker, Designer picker và một thumbnail: PASS.
- Kiểm tra holiday background, planned-date contract, AI UI, right sheet và hover preview: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- `npm test`: **PASS toàn bộ regression suite**.

---

## 10. Phạm vi còn lại

- Event cá nhân vẫn lưu trong `calendar.teamEvents`; chưa có backend event riêng theo owner/visibility cho nhiều thiết bị.
- Trạng thái đã đọc notification vẫn lưu local browser.
- AI briefing vẫn là rule engine, chưa tích hợp mô hình AI thật.
- Apps Script local cần được deploy thủ công thành New Version.

---

**Last Updated:** 28/09/2026
**Changelog:** Hoàn thiện Designer Planner, Calendar day-state, Schedule Meeting, AI briefing, right sheet, hover preview, recurrence và planned work date persistence.
