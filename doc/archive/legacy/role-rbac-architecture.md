# KIẾN TRÚC PHÂN QUYỀN (RBAC) & CẤU TRÚC GOOGLE SHEET HỆ THỐNG UX PORTAL

Tài liệu này mô tả chi tiết mô hình phân quyền 4 vai trò (**Admin**, **Design Owner**, **Designer**, **PO**), cấu trúc dữ liệu trên Google Sheets, cơ chế vận hành nghiệp vụ và giải pháp triển khai trên giao diện người dùng.

---

## 1. TỔNG QUAN 4 VAI TRÒ (ROLES OVERVIEW)

```
                                  +-------------------+
                                  |      ADMIN        | (Toàn quyền hệ thống, phân vai, cấu hình)
                                  +---------+---------+
                                            |
                         +------------------+------------------+
                         |                                     |
            +------------v------------+              +---------v---------+
            |      DESIGN OWNER       |              |   PRODUCT OWNER   |
            | (Quản lý & sửa task của |              |       (PO)        |
            |  mọi Designer)          |              | (Order & theo dõi)|
            +------------+------------+              +-------------------+
                         |
            +------------v------------+
            |        DESIGNER         |
            | (Cập nhật tiến độ task  |
            |  được giao + ghi note)  |
            +-------------------------+
```

| Vai trò (Role) | Định nghĩa & Trách nhiệm chính | Phạm vi quyền hạn |
| :--- | :--- | :--- |
| **Admin** | Quản trị viên hệ thống UX Portal MBBank | **Toàn quyền (Super Admin)**: Thêm/Sửa/Xóa mọi yêu cầu, phân quyền người dùng, cấu hình webhook Teams và bảng tính Google Sheet. |
| **Design Owner** | UX Lead / Design Lead phụ trách chuyên môn hoặc Squad | **Quản lý thiết kế nâng cao**: Tương tự Designer, nhưng có đặc quyền **chỉnh sửa, đổi trạng thái, cập nhật ghi chú cho task của bất kỳ Designer nào**; phân công và điều phối bài toán UX. |
| **Designer** | Chuyên viên Thiết kế UX/UI trực tiếp làm task | **Thực thi thiết kế**: Xem toàn bộ yêu cầu; **chỉ được đổi trạng thái tiến độ và ghi Note kèm link bàn giao đối với các task được phân công cho chính mình**. |
| **PO (Product Owner)** | Chủ sản phẩm số / Đại diện Khối nghiệp vụ MB | **Đặt hàng & Theo dõi**: Điền form tạo yêu cầu UX; tra cứu, theo dõi tiến độ và nhận link sản phẩm bàn giao (Figma/Prototype/Specs) của các yêu cầu do mình/sản phẩm mình tạo. |

---

## 2. MA TRẬN PHÂN QUYỀN CHI TIẾT (RBAC MATRIX)

| Chức năng / Hành động | Admin | Design Owner | Designer | PO (Product Owner) |
| :--- | :---: | :---: | :---: | :---: |
| **Tạo yêu cầu UX mới (Create Request)** | ✅ Toàn quyền | ✅ Toàn quyền | ✅ Toàn quyền | ✅ Cho sản phẩm của PO |
| **Xem danh sách yêu cầu (View List)** | ✅ Toàn bộ | ✅ Toàn bộ | ✅ Toàn bộ | ✅ Toàn bộ (hoặc lọc theo PO) |
| **Xem chi tiết hồ sơ & Deliverables** | ✅ Toàn bộ | ✅ Toàn bộ | ✅ Toàn bộ | ✅ Toàn bộ |
| **Cập nhật khâu UX (6 khâu) & % Tiến độ** | ✅ Mọi task | ✅ **Mọi task của mọi Designer** | ⚠️ **Chỉ task được giao cho mình** | ❌ Không |
| **Ghi chú tiến độ (Note) & Cập nhật link** | ✅ Mọi task | ✅ **Mọi task của mọi Designer** | ⚠️ **Chỉ task được giao cho mình** | ⚠️ Thêm comment trao đổi |
| **Phân công / Gán Designer phụ trách** | ✅ Toàn quyền | ✅ Toàn quyền | ❌ Không | ❌ Không |
| **Chỉnh sửa thông tin đề bài / Deadline** | ✅ Toàn quyền | ✅ Toàn quyền | ⚠️ Góp ý / Note | ⚠️ Yêu cầu do mình tạo |
| **Hủy / Xóa yêu cầu (Delete / Cancel)** | ✅ Toàn quyền | ⚠️ Hủy bài toán | ❌ Không | ⚠️ Hủy yêu cầu chưa tiếp nhận |
| **Quản lý danh mục User & Phân vai (RBAC)**| ✅ Toàn quyền | ❌ Không | ❌ Không | ❌ Không |
| **Cấu hình Google Sheet / Teams Webhook** | ✅ Toàn quyền | ❌ Không | ❌ Không | ❌ Không |

---

## 3. CẤU TRÚC GOOGLE SHEET (DATABASE SCHEMA)

Google Spreadsheet đóng vai trò cơ sở dữ liệu trung tâm gồm 5 trang tính (Sheets):

```
MB_UX_Portal_Database (Google Spreadsheet)
├── 1. USERS           (Danh mục tài khoản, Vai trò & Phân quyền)
├── 2. REQUESTS        (Danh sách yêu cầu thiết kế UX)
├── 3. TASK_UPDATES    (Nhật ký thay đổi trạng thái, Ghi chú & Link bàn giao)
├── 4. SQUADS          (Quản lý năng lực 4 UX Squads & Design Owner phụ trách)
└── 5. AUDIT_LOGS      (Nhật ký kiểm toán bảo mật & lịch sử thao tác)
```

---

### Sheet 1: `USERS` (Quản lý Người dùng, Tên hiển thị, Avatar & Phân vai)
Lưu trữ thông tin tài khoản được cấp quyền truy cập hệ thống qua mã OTP Teams.

| Tên Cột (Header) | Kiểu dữ liệu | Bắt buộc | Ví dụ | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| **`Display Name`** | String | Có | `Nguyễn Văn Cường` | Họ và tên hiển thị trên giao diện |
| **`Avatar URL`** | String | Không | `https://.../avatar.jpg` | Link ảnh đại diện (để trống tự tạo avatar viết tắt `NC`) |
| **`Personal Email`** | String | Có | `lead.cuong@gmail.com` | Email nhận diện nhập OTP ban đầu |
| **`Teams Email`** | String | Có | `lead.cuong@mbbank.com.vn` | Email Microsoft Teams nhận mã OTP 6 số |
| **`Status`** | Enum | Có | `Active` \| `Inactive` | Trạng thái hoạt động (`Active` mới được cấp OTP) |
| **`Role`** | **Enum** | **Có** | **`Admin` \| `Design Owner` \| `Designer` \| `PO`** | **Vai trò phân quyền cốt lõi** |
| `Current OTP`... | System | Tự động | `583921` | Các cột hệ thống tự động ghi mã OTP, thời hạn, Session Token |

---

### Sheet 2: `REQUESTS` (Hồ sơ Yêu cầu Thiết kế UX)
Lưu trữ thông tin đầy đủ của từng yêu cầu thiết kế UX từ lúc tạo đến khi hoàn thành.

| Tên Cột (Header) | Kiểu dữ liệu | Ví dụ | Mô tả |
| :--- | :--- | :--- | :--- |
| `Request_ID` | String | `UXMB-001` | Mã định danh yêu cầu |
| `Title` | String | `Chuyển tiền bằng giọng nói AI` | Tiêu đề bài toán UX |
| `Product` | String | `App/Core` | Sản phẩm trực thuộc |
| `Request_Type` | String | `Tính năng mới` | Phân loại yêu cầu |
| `Preferred_Squad` | String | `Daily Banking Squad` | Squad tiếp nhận xử lý |
| **`Requester_Email`** | String | `po_lan@mbbank.com.vn` | Email PO đặt hàng |
| **`Assigned_Designer`** | String | `nam_designer@mbbank.com.vn` | **Email Designer trực tiếp phụ trách** |
| **`Design_Owner`** | String | `lead_cuong@mbbank.com.vn` | **Email Design Owner bảo trợ/duyệt** |
| `Current_Phase` | String | `3. Hi-Fi UI Design` | Khâu hiện tại trong quy trình 6 bước UX |
| `Status` | Enum | `Đang thực hiện` | Trạng thái (`Đang phân loại`, `Đang thực hiện`, `Hoàn thành`) |
| `Progress` | Number | `65` | % Tiến độ (0 đến 100) |
| `Expected_Deadline` | Date | `2026-09-15` | Hạn bàn giao kỳ vọng |
| `Deadline_Reason` | String | `Kế hoạch ra mắt Q3/2026` | Lý do hạn bàn giao |
| `Business_Need` | Text | `Tăng tỷ lệ chuyển tiền nhanh` | Bối cảnh & Mục tiêu kinh doanh |
| `User_Problem` | Text | `Người già thao tác gõ số khó` | Vấn đề người dùng (Pain point) |
| `Target_User` | Text | `Khách hàng độ tuổi 40-60` | Đối tượng người dùng mục tiêu |
| `Expected_Output` | Array / JSON | `["User Flow", "Hi-Fi UI", "Design Spec"]` | Đầu ra bàn giao mong muốn |
| `Doc_Link` | String | `https://confluence.mb...` | Link tài liệu nghiệp vụ (BRD / PRD) |
| `Figma_Url` | String | `https://figma.com/design/...` | Link file thiết kế Figma bàn giao |
| `Prototype_Url` | String | `https://figma.com/proto/...` | Link bản mẫu tương tác Prototype |
| `Submitted_At` | DateTime | `19/08/2026 09:30:00` | Thời điểm gửi yêu cầu |
| `Last_Updated` | DateTime | `19/08/2026 14:15:00` | Thời điểm cập nhật gần nhất |

---

### Sheet 3: `TASK_UPDATES` (Nhật ký Tiến độ, Ghi Note & Bàn giao)
Mỗi khi có hành động cập nhật tiến độ, đổi khâu UX hoặc ghi chú bàn giao, một bản ghi mới được lưu vào bảng này để tạo Timeline lịch sử minh bạch.

| Tên Cột (Header) | Kiểu dữ liệu | Ví dụ | Mô tả |
| :--- | :--- | :--- | :--- |
| `Update_ID` | String | `LOG-20260819-01` | Mã bản ghi log |
| `Request_ID` | String | `UXMB-001` | Mã yêu cầu tương ứng |
| `Timestamp` | DateTime | `19/08/2026 14:15:00` | Thời gian thực hiện cập nhật |
| **`Updated_By`** | String | `nam_designer@mbbank.com.vn` | Email người thực hiện |
| **`Author_Role`** | Enum | `Designer` \| `Design Owner` \| `Admin` | Vai trò lúc cập nhật |
| `Previous_Phase` | String | `2. Wireframe & Flow` | Khâu trước khi cập nhật |
| `New_Phase` | String | `3. Hi-Fi UI Design` | Khâu chuyển sang |
| `Previous_Progress`| Number | `40` | % Tiến độ cũ |
| `New_Progress` | Number | `65` | % Tiến độ mới |
| **`Note`** | Text | `Đã chốt xong User Flow với PO Lan. Đang vẽ giao diện chi tiết.` | **Nội dung ghi chú bàn giao của Designer/Lead** |
| `Deliverable_Link` | String | `https://figma.com/design/...` | Link đính kèm của mốc này (Figma, Specs...) |

---

### Sheet 4: `SQUADS` (Quản lý 4 UX Squads)

| Tên Cột | Kiểu dữ liệu | Ví dụ | Mô tả |
| :--- | :--- | :--- | :--- |
| `Squad_ID` | String | `SQ-01` | Mã Squad |
| `Squad_Name` | String | `Daily Banking Squad` | Tên Squad |
| `Domain` | String | `App MB, Chuyển tiền, Tài khoản` | Lĩnh vực chuyên trách |
| **`UX_Owner`** | String | `Nguyễn Văn Cường` | **Design Owner đứng đầu Squad** |
| `UX_Owner_Email` | String | `cuongnv@mbbank.com.vn` | Email Teams của Design Owner |
| `Capacity_Threshold`| Number | `20` | Định mức tải trọng tối đa (Story Points) |

---

### Sheet 5: `AUDIT_LOGS` (Nhật ký Kiểm toán Hệ thống)

| Tên Cột | Kiểu dữ liệu | Ví dụ | Mô tả |
| :--- | :--- | :--- | :--- |
| `Log_ID` | String | `AUD-1002` | Mã kiểm toán |
| `Timestamp` | DateTime | `19/08/2026 14:15:05` | Thời gian ghi nhận |
| `Actor_Email` | String | `lead_cuong@mbbank.com.vn` | Email người thực hiện |
| `Action` | String | `REASSIGN_TASK` \| `UPDATE_PHASE` \| `REQUEST_OTP` | Loại hành động |
| `Details` | Text | `Reassigned UXMB-001 from nam@mb to hoa@mb` | Chi tiết thao tác |
| `IP_Address` | String | `192.168.1.186` | Địa chỉ IP (nếu có) |

---

## 4. QUY TRÌNH VẬN HÀNH NGHIỆP VỤ (OPERATIONAL WORKFLOWS)

### 4.1. Quy trình Đăng nhập & Phân giải Quyền hạn (Auth Sequence)
```
[User]                 [Frontend Portal]              [Google Apps Script]              [MS Teams]
   |                           |                                |                           |
   |-- 1. Nhập Email --------->|                                |                           |
   |   (VD: nam@gmail.com)     |-- 2. request_otp ------------->|                           |
   |                           |                                |-- 3. Sinh OTP 6 số        |
   |                           |                                |-- 4. Gửi Webhook -------->|
   |                           |                                |                           |-- (Bắn tin Teams)
   |<-- (Nhận mã 6 số) --------+--------------------------------+---------------------------|
   |                           |                                |
   |-- 5. Nhập 6 số OTP ------>|                                |
   |                           |-- 6. verify_otp -------------->|
   |                           |                                |-- 7. Tra cứu sheet USERS
   |                           |                                |      (Lấy Role, TeamsEmail)
   |<-- 8. Trả UserSession ----+<-------------------------------|
   |    (Role, TeamsEmail)     | (Lưu sessionStorage 15p)
```

---

### 4.2. Kịch bản Vận hành theo từng Vai trò

#### 📌 Kịch bản 1: PO đặt hàng yêu cầu mới
1. PO đăng nhập bằng OTP Teams (Role nhận diện là `PO`).
2. PO truy cập tab **"Tạo yêu cầu"**:
   - Chọn sản phẩm (VD: `App/Core`), hệ thống tự động gợi ý `Daily Banking Squad`.
   - Nhập mô tả bài toán, Pain point người dùng và Deadline kỳ vọng.
   - Bấm **"Gửi yêu cầu"**.
3. Hệ thống tạo mã `UXMB-005` ghi vào sheet `REQUESTS` với trạng thái `Đang phân loại` và người tạo `Requester_Email = po_lan@mbbank.com.vn`.

---

#### 📌 Kịch bản 2: Design Owner phân công & điều phối bài toán
1. Design Owner đăng nhập (Role `Design Owner`).
2. Mở tab **"Quản lý"** -> chọn bài toán `UXMB-005` đang ở hàng đợi:
   - Chỉ định `Assigned_Designer = nam_designer@mbbank.com.vn`.
   - Chuyển trạng thái sang `Đang thực hiện`, khởi động khâu `1. Thấu hiểu & Khám phá`.
   - Hệ thống tự động ghi nhật ký vào `TASK_UPDATES` và bắn thông báo Teams tới Designer Nam.

---

#### 📌 Kịch bản 3: Designer cập nhật tiến độ & ghi Note cho task của mình
1. Designer Nam đăng nhập (Role `Designer`).
2. Vào tab **"Quản lý"** hoặc **"Tra cứu"** -> mở bài toán `UXMB-005`:
   - Hệ thống kiểm tra: `Assigned_Designer === session.teamsEmail` -> **Hiển thị nút "Cập nhật tiến độ & Ghi Note"**.
   - Designer Nam chọn chuyển khâu sang `3. Hi-Fi UI Design`, kéo thanh tiến độ lên `65%`.
   - Gõ ghi chú: *"Đã hoàn thành luồng giao diện chính trên Figma, chuẩn bị làm Prototype tương tác."*
   - Dán link Figma bàn giao.
   - Nhấn **"Lưu cập nhật"**.
3. Backend ghi nhận dữ liệu mới vào sheet `REQUESTS` và tạo 1 dòng nhật ký mới vào sheet `TASK_UPDATES`.

---

#### 📌 Kịch bản 4: Design Owner chỉnh sửa task của Designer khác
1. Giả sử Designer Nam vắng mặt hoặc cần hỗ trợ gấp trên task `UXMB-005`.
2. Design Owner Cường mở bài toán `UXMB-005`:
   - Hệ thống nhận diện Role là `Design Owner` -> **Hiển thị đầy đủ quyền sửa đổi**.
   - Design Owner có thể:
     - Đổi người phụ trách sang `hoa_designer@mbbank.com.vn`.
     - Cập nhật khâu thiết kế hoặc điều chỉnh ghi chú thay cho Designer.
     - Duyệt bàn giao và đánh dấu `Hoàn thành`.
   - Mọi thay đổi đều được ghi log rõ ràng: `Author_Role = Design Owner`, `Updated_By = lead_cuong@mbbank.com.vn`.

---

#### 📌 Kịch bản 5: Admin quản trị toàn diện
1. Admin đăng nhập (Role `Admin`).
2. Có thể:
   - Thêm tài khoản nhân sự mới vào sheet `USERS` và chỉ định Role tương ứng.
   - Chỉnh sửa hoặc xóa bất kỳ bài toán nào khi có sự cố.
   - Đổi Webhook URL của Microsoft Teams hoặc cấu hình lại bộ đo Story Points của 4 Squad.

---

## 5. THIẾT KẾ GIAO DIỆN PHÂN QUYỀN (FRONTEND ROLE-BASED UI)

### 5.1. Header Phiên làm việc & Huy hiệu Role
Giao diện thanh trạng thái hiển thị Badge vai trò và màu sắc tương ứng:
- 🔴 **Admin**: `Badge variant="destructive"`
- 🟣 **Design Owner**: `Badge variant="purple"`
- 🔵 **Designer**: `Badge variant="navy"`
- 🟢 **PO**: `Badge variant="success"`

```tsx
// Hiển thị vai trò người dùng
<Badge variant={getRoleBadgeVariant(session.role)} size="xs">
  {session.role}
</Badge>
```

---

### 5.2. Điều kiện Ẩn/Hiện Nút Cập nhật (Conditional Action Logic)

```tsx
// Logic kiểm tra quyền chỉnh sửa task
const canEditTask = (request: UXRequest, session: UserSession | null): boolean => {
  if (!session) return false
  
  // 1. Admin & Design Owner: Có quyền sửa MỌI task
  if (session.role === "Admin" || session.role === "Design Owner") {
    return true
  }
  
  // 2. Designer: Chỉ được sửa task được giao cho chính mình
  if (session.role === "Designer") {
    return (
      request.assigned_designer?.toLowerCase() === session.teamsEmail.toLowerCase() ||
      request.ux_owner?.toLowerCase() === session.teamsEmail.toLowerCase()
    )
  }
  
  // 3. PO: Không có quyền sửa tiến độ thiết kế
  return false
}
```

---

### 5.3. Form Cập nhật Tiến độ & Ghi Note (`UpdateProgressModal`)
Dành riêng cho Designer (với task của mình) và Design Owner / Admin:

```
+-----------------------------------------------------------------------+
|  [Pencil] CẬP NHẬT TIẾN ĐỘ THIẾT KẾ & GHI CHÚ BÀN GIAO                 |
|                                                                       |
|  Giai đoạn UX hiện tại:                                               |
|  [ 3. Hi-Fi UI Design                                             v ] |
|                                                                       |
|  Trạng thái tổng thể:                                                 |
|  ( ) Đang phân loại    (*) Đang thực hiện     ( ) Hoàn thành          |
|                                                                       |
|  % Tiến độ:                                                           |
|  [==========================>              ] 65%                      |
|                                                                       |
|  Ghi chú / Note cập nhật (*):                                         |
|  +-----------------------------------------------------------------+  |
|  | Đã hoàn thiện giao diện các màn chính, đang hoàn thiện specs... |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  Link Sản phẩm bàn giao (Figma / Prototype / Specs):                  |
|  [ https://figma.com/design/mb-app-core/...                         ] |
|                                                                       |
|  [ Hủy ]                                      [ Lưu & Cập nhật log ]  |
+-----------------------------------------------------------------------+
```

---

## 6. MẪU MÃ NGUỒN GOOGLE APPS SCRIPT (BACKEND RBAC HANDLER)

Dưới đây là đoạn mã xử lý phân quyền trên Google Apps Script Web App:

```javascript
/**
 * Xử lý cập nhật tiến độ task có kiểm tra vai trò Role
 */
function handleUpdateTaskProgress(payload) {
  var sessionToken = payload.session_token;
  var session = getSessionFromCacheOrSheet(sessionToken);
  
  if (!session) {
    return jsonResponse({ status: "unauthorized", message: "Phiên đăng nhập đã hết hạn" });
  }

  var userRole = session.role; // "Admin", "Design Owner", "Designer", "PO"
  var userEmail = session.teams_email;
  var requestId = payload.request_id;
  
  // Đọc danh sách Requests
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRequests = ss.getSheetByName("REQUESTS");
  var rowIdx = findRowIndexById(sheetRequests, "Request_ID", requestId);
  
  if (rowIdx === -1) {
    return jsonResponse({ status: "error", message: "Không tìm thấy mã yêu cầu" });
  }
  
  var currentAssignedDesigner = sheetRequests.getRange(rowIdx, 7).getValue(); // Cột Assigned_Designer
  
  // KIỂM TRA QUYỀN HẠN (RBAC ENFORCEMENT):
  var isAllowed = false;
  if (userRole === "Admin" || userRole === "Design Owner") {
    isAllowed = true; // Toàn quyền
  } else if (userRole === "Designer") {
    if (currentAssignedDesigner.toLowerCase() === userEmail.toLowerCase()) {
      isAllowed = true; // Designer được sửa task của chính mình
    }
  }
  
  if (!isAllowed) {
    return jsonResponse({
      status: "forbidden",
      message: "Bạn không có quyền chỉnh sửa task này (Chỉ Assigned Designer hoặc Design Owner mới có quyền)."
    });
  }
  
  // 1. Cập nhật sheet REQUESTS
  sheetRequests.getRange(rowIdx, 9).setValue(payload.new_phase);       // Current_Phase
  sheetRequests.getRange(rowIdx, 10).setValue(payload.new_status);     // Status
  sheetRequests.getRange(rowIdx, 11).setValue(payload.new_progress);   // Progress
  sheetRequests.getRange(rowIdx, 19).setValue(payload.figma_url || "");// Figma_Url
  sheetRequests.getRange(rowIdx, 22).setValue(new Date());             // Last_Updated
  
  // 2. Ghi nhật ký vào sheet TASK_UPDATES
  var sheetUpdates = ss.getSheetByName("TASK_UPDATES");
  sheetUpdates.appendRow([
    "LOG-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss"),
    requestId,
    new Date(),
    userEmail,
    userRole,
    payload.previous_phase || "",
    payload.new_phase,
    payload.previous_progress || 0,
    payload.new_progress,
    payload.note,
    payload.figma_url || ""
  ]);
  
  return jsonResponse({
    status: "success",
    message: "Cập nhật tiến độ và ghi note thành công!"
  });
}
```

---

## 7. TỔNG KẾT & LỢI ÍCH KIẾN TRÚC

1. **Rõ ràng & Minh bạch:** Phân định rõ trách nhiệm giữa người đặt hàng (PO), người trực tiếp thiết kế (Designer), người quản lý chất lượng (Design Owner) và người quản trị (Admin).
2. **Bảo mật & Đúng quyền:** Ngăn ngừa việc sửa nhầm trạng thái hoặc can thiệp trái phép vào task của nhân sự khác.
3. **Lịch sử truy vết (Audit Trail):** Mọi ghi chú bàn giao, thay đổi khâu UX đều được lưu lại vĩnh viễn trong sheet `TASK_UPDATES`.
4. **Trải nghiệm mượt mà:** Giao diện tự động thích ứng theo Role, chỉ hiển thị các nút chức năng mà tài khoản đó có thẩm quyền thực thi.
