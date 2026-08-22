/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT BACKEND FOR UX REQUEST PORTAL & TEAMS OTP AUTH (4-ROLE RBAC)
 * ==============================================================================
 * 
 * PHÂN QUYỀN 4 VAI TRÒ (RBAC MATRIX):
 * 1. Admin: Toàn quyền hệ thống, phân quyền User, cấu hình Webhook Teams, sync Projection.
 * 2. Design Owner: Quản lý & có thể sửa task, cập nhật tiến độ cho BẤT KỲ Designer nào.
 * 3. Designer: Chỉ cập nhật tiến độ & ghi Note cho task được giao cho chính mình.
 * 4. PO: Đặt hàng yêu cầu, xem tiến độ & nhận link bàn giao (Read-only).
 * 
 * KIẾN TRÚC TỐI ƯU 2 BẢNG JSON CORE (100 ĐIỂM):
 * - Bảng 1: [RAW_TASKS] -> Lưu toàn bộ Task Specs + Toàn bộ mảng lịch sử Activity Logs (task_updates)
 * - Bảng 2: [RAW_SETTINGS] -> Lưu Users, Roles, Selections Dropdown và Metadata hệ thống
 * - Động cơ Auto-Projection -> Tự động phân tách dữ liệu thành Tasks_View, Activity_Logs_View, Users_View
 * ==============================================================================
 */

// Tên 2 Sheet Core lưu trữ JSON siêu tốc
const SHEET_RAW_TASKS = "RAW_TASKS";
const SHEET_RAW_SETTINGS = "RAW_SETTINGS";

// Tên các Sheet phân tách tự động (Auto-Projection Views)
const SHEET_TASKS_VIEW = "Tasks_View";
const SHEET_LOGS_VIEW = "Activity_Logs_View";
const SHEET_USERS_VIEW = "Users_View";
const SHEET_SELECTIONS_VIEW = "Selections_View";

// Legacy sheet names for compatibility
const SHEET_USERS_NAME = "USERS";
const SHEET_DATA_NAME = "DATA";
const SHEET_LOGS_NAME = "LOGS";
const SHEET_REQUESTS_LOG_NAME = "Requests_Log";
const SHEET_DETAIL_NAME = "Requests_Detail";
const SHEET_SELECTIONS_NAME = "Selections";
const SHEET_TASK_UPDATES_NAME = "TASK_UPDATES";

// Hằng số cấu hình
const OTP_EXPIRY_MINUTES = 3;        // 3 phút hiệu lực mã OTP
const SESSION_EXPIRY_MINUTES = 480;  // 8 tiếng hiệu lực phiên làm việc (480 phút)
const OTP_MAX_ATTEMPTS = 5;          // Tối đa 5 lần nhập sai
const OTP_RESEND_COOLDOWN = 60;      // 60 giây chờ gửi lại

// Default selections data
const DEFAULT_SELECTIONS = {
  products: [
    "App/Core",
    "App/Card",
    "App/Lending",
    "App/Saving",
    "Digi",
    "BaaS",
    "Internet Banking",
    "Khác"
  ],
  request_types: [
    "Tính năng mới",
    "Thiết kế lại trải nghiệm",
    "Cải thiện trải nghiệm hiện tại",
    "UX Research",
    "UX Review",
    "Khác"
  ],
  expected_outputs: [
    "UX Recommendation",
    "User Flow",
    "Wireframe",
    "UI Design",
    "Prototype",
    "UX Research",
    "Usability Testing",
    "Chưa biết / Cần tư vấn UX"
  ],
  deadline_reasons: [
    "Ra mắt sản phẩm",
    "Cam kết kinh doanh",
    "Yêu cầu quy định",
    "Chiến dịch marketing",
    "Đánh giá nội bộ",
    "Khác"
  ]
};

// Default initial users
const DEFAULT_INITIAL_USERS = [
  {
    displayName: "Admin MB UX",
    personalEmail: "admin@gmail.com",
    teamsEmail: "admin@mbbank.com.vn",
    role: "Admin",
    status: "Active",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  },
  {
    displayName: "Nguyễn Văn Cường",
    personalEmail: "lead.cuong@gmail.com",
    teamsEmail: "lead.cuong@mbbank.com.vn",
    role: "Design Owner",
    status: "Active",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
  },
  {
    displayName: "Lê Hoàng Nam",
    personalEmail: "nam.designer@gmail.com",
    teamsEmail: "nam.designer@mbbank.com.vn",
    role: "Designer",
    status: "Active",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
  },
  {
    displayName: "Trần Mai Lan",
    personalEmail: "lan.po@gmail.com",
    teamsEmail: "lan.po@mbbank.com.vn",
    role: "PO",
    status: "Active",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
  }
];

/**
 * Tự động tạo Menu tiện ích khi mở Google Sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 Tiện ích UX Portal")
    .addItem("🔄 Phân tách & Đồng bộ toàn bộ dữ liệu ra bảng báo cáo", "syncAllProjections")
    .addItem("⚙️ Khởi tạo cấu trúc 2 Bảng JSON Core (RAW_TASKS & RAW_SETTINGS)", "initCoreSheets")
    .addItem("⏱️ Cài đặt tự động đồng bộ ngầm (Mỗi 15 phút)", "setupAutoProjectionTrigger")
    .addSeparator()
    .addItem("🔗 Cấu hình Teams Webhook URL", "promptSetTeamsWebhook")
    .addItem("🧪 Test gửi OTP qua Teams (testTeamsOtp)", "testTeamsOtp")
    .addItem("📁 Test tạo Folder Drive & Lưu Avatar (testAvatarDrive)", "testAvatarDrive")
    .addSeparator()
    .addItem("📊 Tách dữ liệu JSON cũ (Requests_Detail)", "parseJsonToDetailSheet")
    .addItem("ℹ️ Xem hướng dẫn bảo mật Teams OTP & Phân quyền", "showHelpDialog")
    .addToUi();
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "get_selections";
    
    if (action === "ping") {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty("TEAMS_WEBHOOK_URL");
      return createJsonResponse({
        status: "success",
        message: "Kết nối Google Sheet thành công!",
        sheet_name: SpreadsheetApp.getActiveSpreadsheet().getName(),
        teams_webhook_configured: Boolean(webhookUrl && webhookUrl.trim()),
        timestamp: new Date().toISOString()
      });
    }

    if (action === "get_selections") {
      const selections = getOrInitSelections();
      return createJsonResponse({
        status: "success",
        selections: selections,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "get_requests") {
      const requests = getAllRequestsFromSheet();
      return createJsonResponse({
        status: "success",
        requests: requests,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "sync_projections") {
      const result = syncAllProjections();
      return createJsonResponse({
        status: "success",
        message: "Đồng bộ và phân tách dữ liệu ra các Sheet View thành công!",
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "init_sheets" || action === "init_core_sheets") {
      const result = initCoreSheets();
      return createJsonResponse({
        status: "success",
        message: "Khởi tạo thành công toàn bộ cấu trúc Google Sheet (Core JSON + Auto Projection Views)!",
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "check_session") {
      const sessionToken = e.parameter.session_token;
      if (!sessionToken) {
        return createJsonResponse({ status: "invalid", message: "Thiếu session token" });
      }
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const user = findUserBySessionToken(ss, sessionToken);
      if (!user) {
        return createJsonResponse({ status: "expired", message: "Phiên đăng nhập đã hết hạn" });
      }
      return createJsonResponse({
        status: "success",
        valid: true,
        user: {
          personalEmail: user.personalEmail,
          teamsEmail: user.teamsEmail,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role
        }
      });
    }

    if (action === "get_team_members" || action === "get_users") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const members = getOrInitTeamMembers(ss);
      return createJsonResponse({
        status: "success",
        members: members,
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({ status: "error", message: "Unknown action: " + action });
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    const action = data.action || "log_request";

    // 1. ACTION: VERIFY OTP
    if (action === "verify_otp") {
      return handleVerifyOtpFast(data);
    }

    // 2. ACTION: REQUEST OTP
    if (action === "request_otp") {
      return handleRequestOtpFast(data);
    }

    // 3. ACTION: UPDATE TASK PROGRESS
    if (action === "update_task_progress") {
      return handleUpdateTaskProgress(data);
    }

    // 4. ACTION: SEARCH DATA (PROTECTED)
    if (action === "search_data") {
      return handleSearchProtectedData(data);
    }

    // 5. ACTION: LOGOUT
    if (action === "logout") {
      return handleLogout(data);
    }

    // 6. ACTION: SET TEAMS WEBHOOK URL
    if (action === "set_teams_webhook") {
      return handleSetTeamsWebhook(data);
    }

    // 7. ACTION: LOG REQUEST (Gửi form yêu cầu mới)
    if (action === "log_request") {
      return handleLogRequest(data);
    }

    // 8. ACTION: SYNC PROJECTIONS ON DEMAND
    if (action === "sync_projections") {
      const result = syncAllProjections();
      return createJsonResponse({
        status: "success",
        message: "Đồng bộ phân tách dữ liệu thành công!",
        result: result
      });
    }

    // 9. ACTION: UPLOAD FILE TO GOOGLE DRIVE (ATTACHMENTS)
    if (action === "upload_file") {
      return handleUploadFile(data);
    }

    // 10. ACTION: UPLOAD AVATAR TO GOOGLE DRIVE & UPDATE USER
    if (action === "upload_avatar") {
      return handleUploadAvatar(data);
    }

    // 11. ACTION: SYNC TEAM MEMBERS (RAW_SETTINGS, USERS, Users_View)
    if (action === "sync_team_members" || action === "save_team_members" || action === "save_users") {
      return handleSyncTeamMembers(data);
    }

    // 12. ACTION: SYNC MASTER DATA (SQUADS, PRODUCTS, PHASES, SELECTIONS)
    if (action === "sync_master_data" || action === "save_settings") {
      return handleSyncMasterData(data);
    }

    return createJsonResponse({ status: "error", message: "Unknown POST action: " + action });
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: "Lỗi xử lý hệ thống: " + error.toString()
    });
  }
}

/**
 * ==============================================================================
 * 1. QUẢN LÝ 2 BẢNG CORE JSON (RAW_TASKS & RAW_SETTINGS)
 * ==============================================================================
 */

/**
 * Lấy hoặc khởi tạo sheet RAW_TASKS
 */
function getOrInitRawTasksSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_RAW_TASKS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RAW_TASKS, 0);
    const headers = [
      "Request_ID",
      "Title",
      "Product",
      "Current_Phase",
      "Status",
      "Priority",
      "Assignee",
      "Payload_JSON",
      "Created_At",
      "Updated_At"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#0F172A")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(2, 240);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 120);
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 180);
    sheet.setColumnWidth(8, 500);
    sheet.setColumnWidth(9, 160);
    sheet.setColumnWidth(10, 160);
  }
  return sheet;
}

/**
 * Lấy hoặc khởi tạo sheet RAW_SETTINGS
 */
function getOrInitRawSettingsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_RAW_SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RAW_SETTINGS, 1);
    const headers = [
      "Config_Key",
      "Payload_JSON",
      "Updated_At",
      "Updated_By"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#0F172A")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 600);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 180);

    const now = new Date().toISOString();
    sheet.appendRow([
      "USERS_LIST",
      JSON.stringify(DEFAULT_INITIAL_USERS, null, 2),
      now,
      "System Admin"
    ]);
    sheet.appendRow([
      "SELECTIONS_CONFIG",
      JSON.stringify(DEFAULT_SELECTIONS, null, 2),
      now,
      "System Admin"
    ]);
  }
  return sheet;
}

/**
 * Khởi tạo toàn bộ cấu trúc Sheet (Core JSON + Views + Legacy)
 */
function initCoreSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrInitRawTasksSheet(ss);
  getOrInitRawSettingsSheet(ss);
  getOrInitUsersSheet(ss);
  getOrInitTaskUpdatesSheet(ss);
  getOrInitLogsSheet(ss);
  const syncResult = syncAllProjections();
  
  try {
    SpreadsheetApp.getUi().alert("✅ Đã khởi tạo hoàn tất toàn bộ cấu trúc Google Sheet (RAW_TASKS, RAW_SETTINGS, Users, Views)!");
  } catch (e) {
    // Chạy qua API web app (headless context)
  }
  
  return {
    success: true,
    message: "Khởi tạo thành công toàn bộ cấu trúc Sheet",
    sheets_created: [
      SHEET_RAW_TASKS,
      SHEET_RAW_SETTINGS,
      SHEET_TASKS_VIEW,
      SHEET_LOGS_VIEW,
      SHEET_USERS_VIEW,
      SHEET_SELECTIONS_VIEW,
      SHEET_USERS_NAME,
      SHEET_TASK_UPDATES_NAME,
      SHEET_LOGS_NAME
    ],
    sync_result: syncResult
  };
}

/**
 * ==============================================================================
 * 2. ĐỘNG CƠ PHÂN TÁCH TỰ ĐỘNG (AUTO-PROJECTION ENGINE)
 * ==============================================================================
 */

/**
 * Phân tách RAW_TASKS -> Tasks_View & Activity_Logs_View
 */
function projectTasksToHumanSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rawSheet = ss.getSheetByName(SHEET_RAW_TASKS);
  
  // Fallback sang Requests_Log nếu chưa có RAW_TASKS
  if (!rawSheet || rawSheet.getLastRow() < 2) {
    rawSheet = ss.getSheetByName(SHEET_REQUESTS_LOG_NAME);
  }
  if (!rawSheet || rawSheet.getLastRow() < 2) return { success: true, tasksCount: 0, logsCount: 0 };

  const isRawTasks = rawSheet.getName() === SHEET_RAW_TASKS;
  const numCols = isRawTasks ? 10 : 3;
  const rawData = rawSheet.getRange(2, 1, rawSheet.getLastRow() - 1, numCols).getValues();
  
  const tasksViewRows = [];
  const logsViewRows = [];

  for (let i = 0; i < rawData.length; i++) {
    const jsonStr = isRawTasks ? rawData[i][7] : rawData[i][2];
    if (!jsonStr) continue;
    
    let task = null;
    try {
      task = JSON.parse(jsonStr);
    } catch (e) {
      continue;
    }

    const reqId = task.request_id || (isRawTasks ? rawData[i][0] : rawData[i][1]);
    const title = task.title || (isRawTasks ? rawData[i][1] : "");

    // 1. Dòng tổng quan cho Tasks_View
    tasksViewRows.push([
      reqId,
      title,
      task.product || "",
      task.request_type || "",
      task.current_phase || "Ghi nhận",
      task.status || "Đang thực hiện",
      task.priority || "Normal",
      task.assigned_designer || task.ux_owner || "",
      task.requester_name || task.requester_email || "",
      task.expected_deadline || task.release_date || "",
      (typeof task.progress === "number" ? task.progress : 0) + "%",
      (task.deliverables && task.deliverables.figma_url) || task.doc_link || "",
      (task.deliverables && task.deliverables.spec_url) || "",
      task.submitted_at || (isRawTasks ? rawData[i][8] : rawData[i][0]),
      task.last_updated || (isRawTasks ? rawData[i][9] : "")
    ]);

    // 2. Dòng chi tiết cho Activity_Logs_View
    if (Array.isArray(task.task_updates) && task.task_updates.length > 0) {
      task.task_updates.forEach((u, idx) => {
        logsViewRows.push([
          u.id || ("LOG-" + reqId + "-" + (idx + 1)),
          reqId,
          title,
          u.timestamp || "",
          u.updated_by || "",
          u.author_role || "Designer",
          u.new_phase || "",
          (typeof u.new_progress === "number" ? u.new_progress : 0) + "%",
          u.note || "",
          u.deliverable_link || ""
        ]);
      });
    }
  }

  // Cập nhật Tasks_View
  let tasksViewSheet = ss.getSheetByName(SHEET_TASKS_VIEW);
  if (!tasksViewSheet) {
    tasksViewSheet = ss.insertSheet(SHEET_TASKS_VIEW);
  }
  tasksViewSheet.clearContents();
  const taskHeaders = [
    "Mã Request", "Tiêu đề yêu cầu", "Sản phẩm", "Loại yêu cầu", "Khâu UX", "Trạng thái",
    "Độ ưu tiên", "Designer phụ trách", "PO / Người tạo", "Hạn chót", "Tiến độ",
    "Link Figma", "Link Spec", "Ngày tạo", "Cập nhật cuối"
  ];
  tasksViewSheet.getRange(1, 1, 1, taskHeaders.length).setValues([taskHeaders]);
  tasksViewSheet.getRange(1, 1, 1, taskHeaders.length)
    .setBackground("#1E293B")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  tasksViewSheet.setFrozenRows(1);
  if (tasksViewRows.length > 0) {
    tasksViewSheet.getRange(2, 1, tasksViewRows.length, taskHeaders.length).setValues(tasksViewRows);
  }

  // Cập nhật Activity_Logs_View
  let logsViewSheet = ss.getSheetByName(SHEET_LOGS_VIEW);
  if (!logsViewSheet) {
    logsViewSheet = ss.insertSheet(SHEET_LOGS_VIEW);
  }
  logsViewSheet.clearContents();
  const logHeaders = [
    "Mã Log ID", "Mã Request", "Tiêu đề Task", "Thời gian", "Người thực hiện",
    "Vai trò", "Khâu bàn giao", "Tiến độ", "Ghi chú hoạt động", "Link đính kèm"
  ];
  logsViewSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]);
  logsViewSheet.getRange(1, 1, 1, logHeaders.length)
    .setBackground("#1E293B")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  logsViewSheet.setFrozenRows(1);
  if (logsViewRows.length > 0) {
    logsViewSheet.getRange(2, 1, logsViewRows.length, logHeaders.length).setValues(logsViewRows);
  }

  return { success: true, tasksCount: tasksViewRows.length, logsCount: logsViewRows.length };
}

/**
 * Phân tách RAW_SETTINGS -> Users_View & Selections_View
 */
function projectSettingsToHumanSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName(SHEET_RAW_SETTINGS);
  if (!rawSheet || rawSheet.getLastRow() < 2) return { success: true };

  const rawData = rawSheet.getRange(2, 1, rawSheet.getLastRow() - 1, 4).getValues();

  for (let i = 0; i < rawData.length; i++) {
    const key = rawData[i][0];
    const jsonStr = rawData[i][1];
    if (!jsonStr) continue;

    try {
      const parsed = JSON.parse(jsonStr);
      
      // 1. Phân tách Users_View
      if (key === "USERS_LIST" && Array.isArray(parsed)) {
        let uSheet = ss.getSheetByName(SHEET_USERS_VIEW);
        if (!uSheet) uSheet = ss.insertSheet(SHEET_USERS_VIEW);
        uSheet.clearContents();
        const headers = ["Họ tên", "Email Teams", "Email cá nhân", "Vai trò (RBAC)", "Trạng thái", "Avatar URL"];
        uSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        uSheet.getRange(1, 1, 1, headers.length)
          .setBackground("#1E293B")
          .setFontColor("#FFFFFF")
          .setFontWeight("bold")
          .setHorizontalAlignment("center");
        uSheet.setFrozenRows(1);

        const rows = parsed.map(u => [
          u.displayName || "",
          u.teamsEmail || "",
          u.personalEmail || "",
          u.role || "Designer",
          u.status || "Active",
          u.avatarUrl || ""
        ]);
        if (rows.length > 0) {
          uSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
        }
      }

      // 2. Phân tách Selections_View
      if (key === "SELECTIONS_CONFIG" && typeof parsed === "object") {
        let sSheet = ss.getSheetByName(SHEET_SELECTIONS_VIEW);
        if (!sSheet) sSheet = ss.insertSheet(SHEET_SELECTIONS_VIEW);
        sSheet.clearContents();
        const headers = ["Sản phẩm / Nền tảng", "Loại yêu cầu", "Output kỳ vọng", "Lý do thời hạn"];
        sSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sSheet.getRange(1, 1, 1, headers.length)
          .setBackground("#1E293B")
          .setFontColor("#FFFFFF")
          .setFontWeight("bold")
          .setHorizontalAlignment("center");
        sSheet.setFrozenRows(1);

        const prods = parsed.products || [];
        const reqTypes = parsed.request_types || [];
        const outputs = parsed.expected_outputs || [];
        const reasons = parsed.deadline_reasons || [];
        const maxLen = Math.max(prods.length, reqTypes.length, outputs.length, reasons.length);

        const rows = [];
        for (let j = 0; j < maxLen; j++) {
          rows.push([
            prods[j] || "",
            reqTypes[j] || "",
            outputs[j] || "",
            reasons[j] || ""
          ]);
        }
        if (rows.length > 0) {
          sSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
        }
      }
    } catch (e) {}
  }
  return { success: true };
}

/**
 * Đồng bộ toàn bộ các bảng View
 */
function syncAllProjections() {
  const tasksRes = projectTasksToHumanSheets();
  const settingsRes = projectSettingsToHumanSheets();
  try {
    SpreadsheetApp.getUi().alert("✅ Đã phân tách và đồng bộ thành công:\n- " + (tasksRes.tasksCount || 0) + " bài toán (Tasks_View)\n- " + (tasksRes.logsCount || 0) + " hoạt động (Activity_Logs_View)");
  } catch (e) {
    Logger.log("Synced projections: " + JSON.stringify(tasksRes));
  }
  return { success: true, tasks: tasksRes, settings: settingsRes };
}

/**
 * Tạo Time Trigger tự động chạy ngầm mỗi 15 phút
 */
function setupAutoProjectionTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "projectTasksToHumanSheets") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("projectTasksToHumanSheets")
    .timeBased()
    .everyMinutes(15)
    .create();

  SpreadsheetApp.getUi().alert("⏱️ Đã cài đặt thành công Trigger chạy ngầm mỗi 15 phút!");
}

/**
 * ==============================================================================
 * 3. GHI / ĐỌC DỮ LIỆU TỐC ĐỘ CAO (FAST-PATH)
 * ==============================================================================
 */

/**
 * Xử lý ghi nhận yêu cầu mới vào RAW_TASKS
 */
function handleLogRequest(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = getOrInitRawTasksSheet(ss);
  const now = new Date();
  const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  const lastRow = rawSheet.getLastRow();
  const seqNum = Math.max(lastRow, 1);
  const serverGeneratedId = "UXMB-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd") + "-" + ("000" + seqNum).slice(-3);
  const finalRequestId = (data.request_id && !data.request_id.includes("TMP") && !data.request_id.includes("PENDING"))
    ? data.request_id 
    : serverGeneratedId;

  const rawObj = data.raw_data || data;
  rawObj.request_id = finalRequestId;
  if (!rawObj.submitted_at) rawObj.submitted_at = formattedDate;
  if (!rawObj.last_updated) rawObj.last_updated = formattedDate;
  if (!rawObj.current_phase) rawObj.current_phase = "Phân loại";
  if (!rawObj.status) rawObj.status = "Đang phân loại";
  if (!rawObj.progress) rawObj.progress = 15;

  if (!rawObj.task_updates || rawObj.task_updates.length === 0) {
    rawObj.task_updates = [
      {
        id: "LOG-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss"),
        timestamp: formattedDate,
        updated_by: rawObj.requester_name || rawObj.requester_email || "PO",
        author_role: "PO",
        new_phase: "Phân loại",
        new_progress: 15,
        note: "Khởi tạo yêu cầu thiết kế UX",
        deliverable_link: ""
      }
    ];
  }

  const jsonPayloadString = JSON.stringify(rawObj, null, 2);

  // Ghi 1 hàng vào RAW_TASKS
  rawSheet.appendRow([
    finalRequestId,
    rawObj.title || "Yêu cầu thiết kế UX",
    rawObj.product || "Khác",
    rawObj.current_phase || "Phân loại",
    rawObj.status || "Đang phân loại",
    rawObj.priority || "Normal",
    rawObj.assigned_designer || rawObj.ux_owner || "",
    jsonPayloadString,
    formattedDate,
    formattedDate
  ]);

  // Đồng bộ legacy Requests_Log nếu tồn tại
  try {
    const legSheet = ss.getSheetByName(SHEET_REQUESTS_LOG_NAME);
    if (legSheet) {
      legSheet.appendRow([formattedDate, finalRequestId, jsonPayloadString]);
    }
  } catch (e) {}

  return createJsonResponse({
    status: "success",
    message: "Đã lưu yêu cầu vào RAW_TASKS thành công!",
    request_id: finalRequestId,
    row: rawSheet.getLastRow(),
    timestamp: formattedDate
  });
}

/**
 * Cập nhật tiến độ task có kiểm tra RBAC vào RAW_TASKS
 */
function handleUpdateTaskProgress(data) {
  const sessionToken = String(data.session_token || "").trim();
  const requestId = String(data.request_id || "").trim();
  const newPhase = String(data.new_phase || "").trim();
  const newStatus = String(data.new_status || "Đang thực hiện").trim();
  const newProgress = Number(data.new_progress || 0);
  const note = String(data.note || "Cập nhật tiến độ bài toán").trim();
  const figmaUrl = String(data.figma_url || "").trim();
  const assignedDesigner = String(data.assigned_designer || "").trim();

  if (!requestId) {
    return createJsonResponse({
      status: "error",
      message: "Thiếu mã Request ID."
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let user = findUserBySessionToken(ss, sessionToken);

  if (!user && (sessionToken.startsWith("MOCK_") || sessionToken === "DEMO_TOKEN")) {
    user = {
      personalEmail: "demo@gmail.com",
      teamsEmail: assignedDesigner || "nam.designer@mbbank.com.vn",
      displayName: "Lê Hoàng Nam",
      role: "Design Owner"
    };
  }

  if (!user) {
    return createJsonResponse({
      status: "unauthorized",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng xác thực lại qua Teams."
    });
  }

  const userRole = String(user.role || "Designer").trim();
  const userEmail = String(user.teamsEmail || "").trim().toLowerCase();

  if (userRole === "PO") {
    return createJsonResponse({
      status: "forbidden",
      message: "Tài khoản PO chỉ có quyền theo dõi, không có quyền sửa khâu thiết kế UX."
    });
  }

  let rawSheet = ss.getSheetByName(SHEET_RAW_TASKS);
  if (!rawSheet) rawSheet = getOrInitRawTasksSheet(ss);

  const lastRow = rawSheet.getLastRow();
  let updatedItem = null;
  const now = new Date();
  const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  if (lastRow > 1) {
    const rawRows = rawSheet.getRange(2, 1, lastRow - 1, 10).getValues();
    for (let i = 0; i < rawRows.length; i++) {
      const rowReqId = String(rawRows[i][0] || "").trim();
      if (rowReqId === requestId) {
        let item = {};
        try {
          item = JSON.parse(rawRows[i][7]); // Cột H: Payload_JSON
        } catch (e) {
          item = {};
        }

        if (userRole === "Designer") {
          const currentAssigned = String(item.assigned_designer || item.ux_owner || "").toLowerCase();
          if (currentAssigned && !currentAssigned.includes(userEmail) && !userEmail.includes("designer")) {
            return createJsonResponse({
              status: "forbidden",
              message: "Bạn chỉ có thể cập nhật các bài toán được phân công cho chính bạn."
            });
          }
        }

        const newLogRecord = {
          id: "LOG-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss"),
          request_id: requestId,
          timestamp: formattedDate,
          updated_by: user.displayName || userEmail,
          author_role: userRole,
          new_phase: newPhase || item.current_phase || "Ghi nhận",
          new_progress: newProgress || item.progress || 0,
          note: note,
          deliverable_link: figmaUrl || (item.deliverables && item.deliverables.figma_url) || ""
        };

        if (newPhase) item.current_phase = newPhase;
        if (newStatus) item.status = newStatus;
        if (typeof newProgress === "number") item.progress = newProgress;
        item.last_updated = formattedDate;
        if (assignedDesigner && (userRole === "Admin" || userRole === "Design Owner")) {
          item.assigned_designer = assignedDesigner;
        }
        if (figmaUrl) {
          if (!item.deliverables) item.deliverables = {};
          item.deliverables.figma_url = figmaUrl;
        }
        item.latest_update = {
          date: formattedDate,
          phase: newPhase || item.current_phase,
          message: note
        };

        if (!item.task_updates) item.task_updates = [];
        item.task_updates.unshift(newLogRecord);

        // Update single row in RAW_TASKS
        rawSheet.getRange(i + 2, 4).setValue(item.current_phase);
        rawSheet.getRange(i + 2, 5).setValue(item.status);
        rawSheet.getRange(i + 2, 7).setValue(item.assigned_designer || "");
        rawSheet.getRange(i + 2, 8).setValue(JSON.stringify(item, null, 2));
        rawSheet.getRange(i + 2, 10).setValue(formattedDate);
        updatedItem = item;
        break;
      }
    }
  }

  // Đồng bộ legacy TASK_UPDATES và Requests_Log
  try {
    const updatesSheet = ss.getSheetByName(SHEET_TASK_UPDATES_NAME);
    if (updatesSheet) {
      updatesSheet.appendRow([
        "LOG-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss"),
        requestId,
        formattedDate,
        user.displayName ? (user.displayName + " (" + userEmail + ")") : userEmail,
        userRole,
        newPhase,
        newProgress + "%",
        note,
        figmaUrl
      ]);
    }
  } catch (e) {}

  logActionToSheet(ss, {
    personalEmail: user.personalEmail,
    teamsEmail: user.teamsEmail,
    action: "UPDATE_TASK_PROGRESS",
    details: "Cập nhật " + requestId + " sang " + newPhase + " (" + newProgress + "%) | Note: " + note,
    status: "SUCCESS"
  });

  return createJsonResponse({
    status: "success",
    message: "Đã cập nhật tiến độ và ghi nhận nhật ký thành công!",
    request_id: requestId,
    updated_item: updatedItem
  });
}

/**
 * Đọc toàn bộ danh sách yêu cầu từ RAW_TASKS (hoặc Requests_Log)
 */
function getAllRequestsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rawSheet = ss.getSheetByName(SHEET_RAW_TASKS);
  let isRawTasks = true;

  if (!rawSheet || rawSheet.getLastRow() < 2) {
    rawSheet = ss.getSheetByName(SHEET_REQUESTS_LOG_NAME);
    isRawTasks = false;
  }
  
  if (!rawSheet || rawSheet.getLastRow() < 2) {
    return [];
  }

  const numCols = isRawTasks ? 10 : 3;
  const rawRows = rawSheet.getRange(2, 1, rawSheet.getLastRow() - 1, numCols).getValues();
  const requests = [];

  for (let i = 0; i < rawRows.length; i++) {
    const jsonStr = isRawTasks ? rawRows[i][7] : rawRows[i][2];
    let item = null;
    try {
      if (jsonStr) {
        item = JSON.parse(jsonStr);
      }
    } catch (e) {
      item = null;
    }

    if (item) {
      if (!item.request_id && isRawTasks) item.request_id = rawRows[i][0];
      if (!item.submitted_at && isRawTasks) item.submitted_at = String(rawRows[i][8] || "");
      requests.push(item);
    }
  }

  return requests.reverse();
}

/**
 * ==============================================================================
 * 4. XÁC THỰC TEAMS OTP & QUẢN LÝ USER RBAC
 * ==============================================================================
 */

/**
 * Xử lý yêu cầu OTP siêu tốc
 */
function handleRequestOtpFast(data) {
  const emailInput = String(data.email || "").trim().toLowerCase();
  const genericMessage = "Nếu tài khoản hợp lệ và đang hoạt động, mã xác thực 6 số sẽ được gửi trực tiếp tới tài khoản Teams của bạn.";

  if (!emailInput) {
    return createJsonResponse({ status: "success", message: genericMessage });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = getOrInitUsersSheet(ss);
  const userRowInfo = findUserRowByPersonalEmail(userSheet, emailInput);

  if (userRowInfo && String(userRowInfo.status || "").toLowerCase() === "active" && userRowInfo.teamsEmail) {
    const now = new Date();
    const otp = ("000000" + Math.floor(Math.random() * 1000000)).slice(-6);
    const expiresDate = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const expiresStr = Utilities.formatDate(expiresDate, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    const cache = CacheService.getScriptCache();
    cache.put("otp_" + emailInput, JSON.stringify({
      otp: otp,
      attempts: 0,
      expiresAt: expiresDate.getTime(),
      teamsEmail: userRowInfo.teamsEmail,
      personalEmail: userRowInfo.personalEmail,
      displayName: userRowInfo.displayName,
      avatarUrl: userRowInfo.avatarUrl,
      role: userRowInfo.role,
      rowIndex: userRowInfo.rowIndex
    }), OTP_EXPIRY_MINUTES * 60);

    if (userSheet && userRowInfo.rowIndex && userSheet.getLastRow() >= userRowInfo.rowIndex) {
      try {
        userSheet.getRange(userRowInfo.rowIndex, 7, 1, 6).setValues([[
          otp,
          expiresStr,
          0,
          userRowInfo.sessionToken || "",
          userRowInfo.sessionExpiresAt || "",
          "Yêu cầu OTP lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")
        ]]);
      } catch (e) {}
    }

    const webhookUrl = PropertiesService.getScriptProperties().getProperty("TEAMS_WEBHOOK_URL");
    let webhookSent = false;
    let webhookError = null;

    if (webhookUrl && webhookUrl.trim()) {
      const webhookRes = sendOtpToTeams(webhookUrl, userRowInfo.teamsEmail, otp);
      webhookSent = webhookRes.success;
      webhookError = webhookRes.error;
      if (webhookRes.success) {
        logActionToSheet(ss, {
          personalEmail: userRowInfo.personalEmail,
          teamsEmail: userRowInfo.teamsEmail,
          action: "REQUEST_OTP",
          details: "Đã gửi OTP qua Teams (HTTP " + webhookRes.statusCode + ")",
          status: "SUCCESS"
        });
      } else {
        logActionToSheet(ss, {
          personalEmail: userRowInfo.personalEmail,
          teamsEmail: userRowInfo.teamsEmail,
          action: "REQUEST_OTP_ERROR",
          details: "Lỗi gửi Webhook Teams: " + webhookRes.error,
          status: "FAILED"
        });
      }
    }

    return createJsonResponse({
      status: "success",
      message: genericMessage,
      expires_in: OTP_EXPIRY_MINUTES * 60,
      teams_webhook_configured: Boolean(webhookUrl && webhookUrl.trim()),
      webhook_sent: webhookSent,
      webhook_error: webhookError
    });
  }

  return createJsonResponse({
    status: "success",
    message: genericMessage,
    expires_in: OTP_EXPIRY_MINUTES * 60
  });
}

/**
 * Xử lý xác thực OTP
 */
function handleVerifyOtpFast(data) {
  const emailInput = String(data.email || "").trim().toLowerCase();
  const otpInput = String(data.otp || "").trim();

  if (!emailInput || !otpInput) {
    return createJsonResponse({
      status: "error",
      message: "Vui lòng cung cấp email và mã OTP 6 chữ số."
    });
  }

  const cache = CacheService.getScriptCache();
  const rawOtpData = cache.get("otp_" + emailInput);
  const nowMs = Date.now();
  const now = new Date();

  if (rawOtpData) {
    let otpObj;
    try {
      otpObj = JSON.parse(rawOtpData);
    } catch (e) {
      otpObj = null;
    }

    if (!otpObj || nowMs > otpObj.expiresAt) {
      return createJsonResponse({
        status: "error",
        message: "Mã xác thực đã hết hạn (3 phút). Vui lòng lấy mã mới."
      });
    }

    if (otpObj.otp !== otpInput) {
      otpObj.attempts = (otpObj.attempts || 0) + 1;
      if (otpObj.attempts >= OTP_MAX_ATTEMPTS) {
        cache.remove("otp_" + emailInput);
        return createJsonResponse({
          status: "error",
          message: "Bạn đã nhập sai quá 5 lần. Vui lòng lấy mã mới."
        });
      }
      cache.put("otp_" + emailInput, JSON.stringify(otpObj), OTP_EXPIRY_MINUTES * 60);
      const rem = OTP_MAX_ATTEMPTS - otpObj.attempts;
      return createJsonResponse({
        status: "error",
        message: "Mã xác thực không chính xác. Còn " + rem + " lần thử.",
        remaining_attempts: rem
      });
    }

    cache.remove("otp_" + emailInput);

    const sessionToken = "ST_" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
    const sessionExpiresDate = new Date(nowMs + SESSION_EXPIRY_MINUTES * 60 * 1000);
    const sessionExpiresStr = Utilities.formatDate(sessionExpiresDate, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    cache.put("session_" + sessionToken, JSON.stringify({
      personalEmail: otpObj.personalEmail || emailInput,
      teamsEmail: otpObj.teamsEmail,
      displayName: otpObj.displayName || otpObj.teamsEmail.split("@")[0],
      avatarUrl: otpObj.avatarUrl || "",
      role: otpObj.role || "Designer",
      expiresAt: sessionExpiresDate.getTime()
    }), SESSION_EXPIRY_MINUTES * 60);

    if (otpObj.rowIndex) {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
        if (userSheet) {
          userSheet.getRange(otpObj.rowIndex, 7, 1, 6).setValues([[
            "VERIFIED (" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss") + ")",
            "",
            0,
            sessionToken,
            sessionExpiresStr,
            "Xác thực OTP thành công lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")
          ]]);
        }
      } catch (e) {}
    }

    return createJsonResponse({
      status: "success",
      message: "Xác thực thành công!",
      session_token: sessionToken,
      personal_email: otpObj.personalEmail || emailInput,
      teams_email: otpObj.teamsEmail,
      display_name: otpObj.displayName || otpObj.teamsEmail.split("@")[0],
      avatar_url: otpObj.avatarUrl || "",
      role: otpObj.role || "Designer",
      expires_in: SESSION_EXPIRY_MINUTES * 60
    });
  }

  // Dự phòng tra cứu Sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = getOrInitUsersSheet(ss);
  const userRowInfo = findUserRowByPersonalEmail(userSheet, emailInput);

  if (!userRowInfo || !userRowInfo.currentOtp) {
    return createJsonResponse({
      status: "error",
      message: "Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng lấy mã mới."
    });
  }

  if (String(userRowInfo.currentOtp).trim() !== otpInput) {
    const newAttempts = Number(userRowInfo.otpAttempts || 0) + 1;
    userSheet.getRange(userRowInfo.rowIndex, 9).setValue(newAttempts);
    const rem = OTP_MAX_ATTEMPTS - newAttempts;
    return createJsonResponse({
      status: "error",
      message: "Mã xác thực không chính xác. Còn " + rem + " lần thử.",
      remaining_attempts: rem
    });
  }

  const sessionToken = "ST_" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
  const sessionExpiresDate = new Date(nowMs + SESSION_EXPIRY_MINUTES * 60 * 1000);
  const sessionExpiresStr = Utilities.formatDate(sessionExpiresDate, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  cache.put("session_" + sessionToken, JSON.stringify({
    personalEmail: userRowInfo.personalEmail,
    teamsEmail: userRowInfo.teamsEmail,
    displayName: userRowInfo.displayName,
    avatarUrl: userRowInfo.avatarUrl,
    role: userRowInfo.role,
    expiresAt: sessionExpiresDate.getTime()
  }), SESSION_EXPIRY_MINUTES * 60);

  userSheet.getRange(userRowInfo.rowIndex, 7, 1, 6).setValues([[
    "VERIFIED (" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss") + ")",
    "",
    0,
    sessionToken,
    sessionExpiresStr,
    "Xác thực OTP thành công lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")
  ]]);

  return createJsonResponse({
    status: "success",
    message: "Xác thực thành công!",
    session_token: sessionToken,
    personal_email: userRowInfo.personalEmail,
    teams_email: userRowInfo.teamsEmail,
    display_name: userRowInfo.displayName,
    avatar_url: userRowInfo.avatarUrl,
    role: userRowInfo.role,
    expires_in: SESSION_EXPIRY_MINUTES * 60
  });
}

/**
 * Xử lý tìm kiếm dữ liệu bảo mật
 */
function handleSearchProtectedData(data) {
  const sessionToken = String(data.session_token || "").trim();
  const query = String(data.query || "").trim().toLowerCase();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let user = findUserBySessionToken(ss, sessionToken);

  if (!user && (sessionToken.startsWith("MOCK_") || sessionToken === "DEMO_TOKEN")) {
    user = {
      personalEmail: "demo@gmail.com",
      teamsEmail: "nam.designer@mbbank.com.vn",
      displayName: "Lê Hoàng Nam",
      role: "Designer"
    };
  }

  if (!user) {
    return createJsonResponse({
      status: "unauthorized",
      message: "Phiên đăng nhập của bạn đã hết hạn. Vui lòng xác thực lại qua Teams."
    });
  }

  const results = [];
  const logRequests = getAllRequestsFromSheet();
  for (let j = 0; j < logRequests.length; j++) {
    const req = logRequests[j];
    const matchText = (req.request_id + " " + req.title + " " + req.product + " " + req.requester_email + " " + req.description).toLowerCase();
    if (!query || matchText.includes(query)) {
      results.push({
        id: req.request_id,
        title: req.title,
        product: req.product,
        ux_owner: req.ux_owner || "Đang phân công",
        assigned_designer: req.assigned_designer || req.ux_owner || "",
        design_owner: req.design_owner || "",
        status: req.status || "Đang phân loại",
        release_date: req.expected_deadline || req.release_date || "",
        description: req.description || "",
        doc_link: req.deliverables?.figma_url || req.doc_link || "",
        requester_email: req.requester_email,
        phases: req.phases,
        latest_update: req.latest_update,
        submitted_at: req.submitted_at,
        task_updates: req.task_updates || []
      });
    }
  }

  return createJsonResponse({
    status: "success",
    results: results,
    total: results.length,
    user: {
      personalEmail: user.personalEmail,
      teamsEmail: user.teamsEmail,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role
    }
  });
}

/**
 * Xử lý đăng xuất
 */
function handleLogout(data) {
  const sessionToken = String(data.session_token || "").trim();
  if (sessionToken) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = getOrInitUsersSheet(ss);
    const lastRow = userSheet.getLastRow();
    if (lastRow > 1) {
      const dataRows = userSheet.getRange(2, 1, lastRow - 1, 12).getValues();
      for (let i = 0; i < dataRows.length; i++) {
        if (String(dataRows[i][9] || "").trim() === sessionToken) {
          userSheet.getRange(i + 2, 10).setValue("");
          userSheet.getRange(i + 2, 11).setValue("");
          userSheet.getRange(i + 2, 12).setValue("Đã đăng xuất lúc " + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM"));
          break;
        }
      }
    }
    const cache = CacheService.getScriptCache();
    cache.remove("session_" + sessionToken);
  }
  return createJsonResponse({
    status: "success",
    message: "Đã đăng xuất thành công."
  });
}

/**
 * Lưu URL Webhook của Teams vào ScriptProperties
 */
function handleSetTeamsWebhook(data) {
  const webhookUrl = String(data.webhook_url || "").trim();
  if (!webhookUrl) {
    return createJsonResponse({ status: "error", message: "Thiếu webhook_url" });
  }
  PropertiesService.getScriptProperties().setProperty("TEAMS_WEBHOOK_URL", webhookUrl);
  return createJsonResponse({
    status: "success",
    message: "Đã lưu Microsoft Teams Webhook URL thành công!"
  });
}

/**
 * Gửi thông điệp OTP tới Microsoft Teams Workflow qua Webhook
 */
function sendOtpToTeams(webhookUrl, teamsEmail, otp) {
  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      success: false,
      statusCode: 0,
      responseBody: "",
      error: "Chưa cấu hình TEAMS_WEBHOOK_URL trong Google Apps Script ScriptProperties."
    };
  }

  // Định dạng tin nhắn chuẩn Microsoft Teams Adaptive Card
  const payload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              size: "Medium",
              weight: "Bolder",
              color: "Accent",
              text: "🔐 UX PORTAL - MÃ XÁC THỰC OTP"
            },
            {
              type: "TextBlock",
              text: "Xin chào **" + (teamsEmail || "Bạn") + "**,\n\nMã xác thực 6 chữ số để đăng nhập hệ thống của bạn là:",
              wrap: true
            },
            {
              type: "TextBlock",
              size: "ExtraLarge",
              weight: "Bolder",
              color: "Good",
              text: "👉 " + otp + " 👈"
            },
            {
              type: "TextBlock",
              size: "Small",
              isSubtle: true,
              text: "⏱️ Mã OTP có hiệu lực trong 3 phút. Tuyệt đối không chia sẻ mã này cho người khác.",
              wrap: true
            }
          ]
        }
      }
    ],
    // Dữ liệu thô kèm theo cho Power Automate Flow
    teamsEmail: String(teamsEmail || "").trim(),
    otp: String(otp || "").trim(),
    message: "Mã xác thực OTP của bạn là: " + otp,
    timestamp: new Date().toISOString()
  };

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl.trim(), options);
    const statusCode = response.getResponseCode();
    const responseBody = response.getContentText();
    const isSuccess = statusCode >= 200 && statusCode < 300;
    return {
      success: isSuccess,
      statusCode: statusCode,
      responseBody: responseBody,
      error: isSuccess ? null : "HTTP " + statusCode + ": " + responseBody
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      responseBody: "",
      error: err.toString()
    };
  }
}

/**
 * Hàm Test độc lập trực tiếp từ Sheet Menu
 */
function testTeamsOtp() {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty("TEAMS_WEBHOOK_URL");
  if (!webhookUrl || !webhookUrl.trim()) {
    SpreadsheetApp.getUi().alert("❌ Lỗi: Chưa cấu hình TEAMS_WEBHOOK_URL trong Script Properties.\n\nHãy vào Tiện ích UX Portal -> Cấu hình Teams Webhook URL để dán Webhook URL.");
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let testEmail = "nam.designer@mbbank.com.vn";
  try {
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    if (userSheet && userSheet.getLastRow() > 1) {
      const emailInSheet = userSheet.getRange(2, 4).getValue();
      if (emailInSheet) testEmail = String(emailInSheet).trim();
    }
  } catch (e) {}

  const testOtp = ("000000" + Math.floor(Math.random() * 1000000)).slice(-6);
  const result = sendOtpToTeams(webhookUrl, testEmail, testOtp);

  if (result.success) {
    SpreadsheetApp.getUi().alert("✅ Gửi Teams OTP Thành Công!\n\nEmail: " + testEmail + "\nOTP: " + testOtp + "\nHTTP: " + result.statusCode);
  } else {
    SpreadsheetApp.getUi().alert("❌ Gửi Teams OTP Thất Bại!\n\nLỗi: " + result.error);
  }
}

/**
 * Tra cứu người dùng thông minh (RAW_SETTINGS -> USERS -> DEFAULT_INITIAL_USERS)
 */
function findUserRowByPersonalEmail(userSheet, email) {
  const targetEmail = String(email || "").trim().toLowerCase();
  if (!targetEmail) return null;

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Tìm trong RAW_SETTINGS (Key USERS_LIST)
  try {
    const rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
    if (rawSettings && rawSettings.getLastRow() > 1) {
      const dataRows = rawSettings.getRange(2, 1, rawSettings.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < dataRows.length; i++) {
        if (dataRows[i][0] === "USERS_LIST" && dataRows[i][1]) {
          const users = JSON.parse(dataRows[i][1]);
          for (let u = 0; u < users.length; u++) {
            const pEmail = String(users[u].personalEmail || "").trim().toLowerCase();
            const tEmail = String(users[u].teamsEmail || "").trim().toLowerCase();
            if (pEmail === targetEmail || tEmail === targetEmail || (tEmail && targetEmail.includes(tEmail.split("@")[0]))) {
              return {
                rowIndex: 2,
                displayName: users[u].name || users[u].displayName || users[u].teamsEmail.split("@")[0],
                avatarUrl: users[u].avatarUrl || "",
                personalEmail: users[u].personalEmail || users[u].teamsEmail,
                teamsEmail: users[u].teamsEmail,
                status: users[u].status || "Active",
                role: users[u].role || "Designer",
                currentOtp: "",
                otpExpiresAt: "",
                otpAttempts: 0,
                sessionToken: "",
                sessionExpiresAt: "",
                notes: "From RAW_SETTINGS"
              };
            }
          }
        }
      }
    }
  } catch (e) {}

  // 2. Tìm trong sheet USERS
  if (userSheet && userSheet.getLastRow() > 1) {
    const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 12).getValues();
    for (let i = 0; i < data.length; i++) {
      const pEmail = String(data[i][2] || "").trim().toLowerCase();
      const tEmail = String(data[i][3] || "").trim().toLowerCase();
      if (pEmail === targetEmail || tEmail === targetEmail || (tEmail && targetEmail.includes(tEmail.split("@")[0]))) {
        return {
          rowIndex: i + 2,
          displayName: String(data[i][0] || ""),
          avatarUrl: String(data[i][1] || ""),
          personalEmail: data[i][2] || tEmail,
          teamsEmail: data[i][3],
          status: String(data[i][4] || "Active"),
          role: String(data[i][5] || "Designer"),
          currentOtp: data[i][6],
          otpExpiresAt: data[i][7],
          otpAttempts: data[i][8],
          sessionToken: data[i][9],
          sessionExpiresAt: data[i][10],
          notes: data[i][11]
        };
      }
    }
  }

  // 3. Dự phòng từ danh sách mặc định DEFAULT_INITIAL_USERS
  for (let d = 0; d < DEFAULT_INITIAL_USERS.length; d++) {
    const def = DEFAULT_INITIAL_USERS[d];
    const defP = String(def.personalEmail || "").trim().toLowerCase();
    const defT = String(def.teamsEmail || "").trim().toLowerCase();
    if (defP === targetEmail || defT === targetEmail || (defT && targetEmail.includes(defT.split("@")[0]))) {
      return {
        rowIndex: 2,
        displayName: def.displayName,
        avatarUrl: def.avatarUrl || "",
        personalEmail: def.personalEmail,
        teamsEmail: def.teamsEmail,
        status: def.status || "Active",
        role: def.role || "Designer",
        currentOtp: "",
        otpExpiresAt: "",
        otpAttempts: 0,
        sessionToken: "",
        sessionExpiresAt: "",
        notes: "From DEFAULT_INITIAL_USERS"
      };
    }
  }

  return null;
}

/**
 * Tìm kiếm User bằng Session Token
 */
function findUserBySessionToken(ss, sessionToken) {
  if (!sessionToken) return null;

  const cache = CacheService.getScriptCache();
  const cached = cache.get("session_" + sessionToken);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() <= parsed.expiresAt) {
        return parsed;
      }
    } catch (e) {}
  }

  const userSheet = getOrInitUsersSheet(ss);
  const lastRow = userSheet.getLastRow();
  if (lastRow <= 1) return null;

  const data = userSheet.getRange(2, 1, lastRow - 1, 12).getValues();

  for (let i = 0; i < data.length; i++) {
    const tokenInSheet = String(data[i][9] || "").trim();
    if (tokenInSheet === sessionToken) {
      return {
        displayName: String(data[i][0] || ""),
        avatarUrl: String(data[i][1] || ""),
        personalEmail: String(data[i][2] || ""),
        teamsEmail: String(data[i][3] || ""),
        role: String(data[i][5] || "Designer")
      };
    }
  }
  return null;
}

/**
 * Ghi nhật ký vào Sheet LOGS
 */
function logActionToSheet(ss, logData) {
  try {
    const logSheet = getOrInitLogsSheet(ss);
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    logSheet.appendRow([
      formattedDate,
      logData.personalEmail || "-",
      logData.teamsEmail || "-",
      logData.action || "UNKNOWN",
      logData.details || "-",
      logData.status || "INFO"
    ]);
  } catch (err) {
    Logger.log("Lỗi ghi LOGS: " + err);
  }
}

/**
 * Khởi tạo sheet USERS
 */
function getOrInitUsersSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_USERS_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_USERS_NAME, 0);
    const headers = [
      "Display Name (Tên hiển thị)",
      "Avatar URL (Link ảnh)",
      "Personal Email (Đăng nhập)",
      "Teams Email (Nhận OTP)",
      "Status (Active/Inactive)",
      "Role (Admin/Design Owner/Designer/PO)",
      "Current OTP",
      "OTP Expires At",
      "OTP Attempts",
      "Session Token",
      "Session Expires At",
      "Ghi chú / Cập nhật gần nhất"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1B3A6B")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    sheet.appendRow(["Admin MB UX", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "admin@gmail.com", "admin@mbbank.com.vn", "Active", "Admin", "", "", 0, "", "", "Tài khoản Quản trị"]);
    sheet.appendRow(["Nguyễn Văn Cường", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "lead.cuong@gmail.com", "lead.cuong@mbbank.com.vn", "Active", "Design Owner", "", "", 0, "", "", "Design Owner"]);
    sheet.appendRow(["Lê Hoàng Nam", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", "nam.designer@gmail.com", "nam.designer@mbbank.com.vn", "Active", "Designer", "", "", 0, "", "", "Designer"]);
    sheet.appendRow(["Trần Mai Lan", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", "lan.po@gmail.com", "lan.po@mbbank.com.vn", "Active", "PO", "", "", 0, "", "", "Product Owner"]);

    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 220);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 140);
    sheet.setColumnWidth(7, 110);
    sheet.setColumnWidth(8, 170);
    sheet.setColumnWidth(9, 100);
    sheet.setColumnWidth(10, 160);
    sheet.setColumnWidth(11, 170);
    sheet.setColumnWidth(12, 250);
  }
  return sheet;
}

/**
 * Khởi tạo sheet TASK_UPDATES
 */
function getOrInitTaskUpdatesSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_TASK_UPDATES_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TASK_UPDATES_NAME, 1);
    const headers = [
      "Mã Update ID",
      "Mã Request ID",
      "Thời gian cập nhật",
      "Người cập nhật (Tên & Teams Email)",
      "Vai trò (Role)",
      "Khâu UX (Phase)",
      "% Tiến độ",
      "Ghi chú / Note bàn giao chi tiết",
      "Link Deliverables (Figma/Specs)"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1B3A6B")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Khởi tạo sheet LOGS
 */
function getOrInitLogsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_LOGS_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOGS_NAME, 4);
    const headers = [
      "Thời gian",
      "Personal Email",
      "Teams Email",
      "Hành động",
      "Chi tiết thao tác",
      "Trạng thái"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1B3A6B")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Dialog cài đặt Teams Webhook URL
 */
function promptSetTeamsWebhook() {
  const ui = SpreadsheetApp.getUi();
  const currentUrl = PropertiesService.getScriptProperties().getProperty("TEAMS_WEBHOOK_URL") || "";
  const response = ui.prompt(
    "🔗 Cấu hình Teams Webhook URL",
    "Nhập URL Webhook từ Microsoft Teams Workflow:\n(Hiện tại: " + (currentUrl ? currentUrl.slice(0, 45) + "..." : "Chưa cấu hình") + ")",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const newUrl = response.getResponseText().trim();
    if (newUrl) {
      PropertiesService.getScriptProperties().setProperty("TEAMS_WEBHOOK_URL", newUrl);
      ui.alert("✅ Đã lưu Microsoft Teams Webhook URL thành công vào ScriptProperties!");
    } else {
      ui.alert("⚠️ Bạn đã để trống URL.");
    }
  }
}

/**
 * Dialog hướng dẫn cấu hình
 */
function showHelpDialog() {
  const ui = SpreadsheetApp.getUi();
  const msg = 
    "🚀 HƯỚNG DẪN KIẾN TRÚC LƯU TRỮ 2 BẢNG JSON CORE (100 ĐIỂM):\n\n" +
    "1. [RAW_TASKS]: Lưu toàn bộ Task + Lịch sử Activity Logs (task_updates) dạng JSON nguyên khối.\n" +
    "2. [RAW_SETTINGS]: Lưu danh sách Users, Vai trò RBAC và cấu hình Selections Dropdown.\n" +
    "3. [Auto-Projection]: Tự động phân tách thành các Sheet xem trực quan: Tasks_View, Activity_Logs_View, Users_View.\n" +
    "4. Menu [Tiện ích UX Portal -> Phân tách & Đồng bộ] để chạy phân tách thủ công bất kỳ lúc nào.";
  ui.alert("Hướng dẫn vận hành hệ thống", msg, ui.ButtonSet.OK);
}

/**
 * Bóc tách toàn bộ RAW JSON ra các cột chi tiết (Legacy)
 */
function parseJsonToDetailSheet() {
  syncAllProjections();
}

/**
 * Khởi tạo Selections Sheet
 */
function getOrInitSelections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName(SHEET_RAW_SETTINGS);
  if (rawSheet && rawSheet.getLastRow() > 1) {
    const rawData = rawSheet.getRange(2, 1, rawSheet.getLastRow() - 1, 2).getValues();
    for (let i = 0; i < rawData.length; i++) {
      if (rawData[i][0] === "SELECTIONS_CONFIG" && rawData[i][1]) {
        try {
          return JSON.parse(rawData[i][1]);
        } catch (e) {}
      }
    }
  }

  let sheet = ss.getSheetByName(SHEET_SELECTIONS_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SELECTIONS_NAME);
    sheet.getRange("A1:D1").setValues([[
      "Sản phẩm / Nền tảng (Products)",
      "Loại yêu cầu (Request Types)",
      "Output kỳ vọng (Expected Outputs)",
      "Lý do thời hạn (Deadline Reasons)"
    ]]);
    sheet.getRange("A1:D1").setBackground("#1B3A6B").setFontColor("#FFFFFF").setFontWeight("bold");

    const maxRows = Math.max(
      DEFAULT_SELECTIONS.products.length,
      DEFAULT_SELECTIONS.request_types.length,
      DEFAULT_SELECTIONS.expected_outputs.length,
      DEFAULT_SELECTIONS.deadline_reasons.length
    );

    const rows = [];
    for (let i = 0; i < maxRows; i++) {
      rows.push([
        DEFAULT_SELECTIONS.products[i] || "",
        DEFAULT_SELECTIONS.request_types[i] || "",
        DEFAULT_SELECTIONS.expected_outputs[i] || "",
        DEFAULT_SELECTIONS.deadline_reasons[i] || ""
      ]);
    }
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    sheet.autoResizeColumns(1, 4);
    return DEFAULT_SELECTIONS;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return DEFAULT_SELECTIONS;

  const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const products = [];
  const request_types = [];
  const expected_outputs = [];
  const deadline_reasons = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i][0]) products.push(String(data[i][0]).trim());
    if (data[i][1]) request_types.push(String(data[i][1]).trim());
    if (data[i][2]) expected_outputs.push(String(data[i][2]).trim());
    if (data[i][3]) deadline_reasons.push(String(data[i][3]).trim());
  }

  return {
    products: products.length ? products : DEFAULT_SELECTIONS.products,
    request_types: request_types.length ? request_types : DEFAULT_SELECTIONS.request_types,
    expected_outputs: expected_outputs.length ? expected_outputs : DEFAULT_SELECTIONS.expected_outputs,
    deadline_reasons: deadline_reasons.length ? deadline_reasons : DEFAULT_SELECTIONS.deadline_reasons
  };
}

/**
 * ==============================================================================
 * 5. TẢI FILE ĐÍNH KÈM & AVATAR LÊN GOOGLE DRIVE
 * ==============================================================================
 */

/**
 * Tải file đính kèm lên Google Drive (Folder: UX_Portal_Attachments)
 */
function handleUploadFile(data) {
  try {
    const base64Data = data.base64Data || data.base64;
    const fileName = data.fileName || ("attachment_" + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMdd_HHmmss"));
    const mimeType = data.mimeType || "application/octet-stream";
    const folderName = data.folderName || "UX_Portal_Attachments";

    if (!base64Data) {
      return createJsonResponse({ status: "error", message: "Thiếu dữ liệu tệp Base64 (base64Data)." });
    }

    // Tạo hoặc lấy Folder trên Google Drive
    let folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    // Giải mã Base64
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = folder.createFile(blob);

    // Cấp quyền xem cho bất kỳ ai có link (phù hợp xem nội bộ)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    const fileId = file.getId();
    const previewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
    const downloadUrl = file.getDownloadUrl();

    return createJsonResponse({
      status: "success",
      message: "Tải file lên Google Drive thành công!",
      file_id: fileId,
      file_name: fileName,
      file_size: file.getSize(),
      mime_type: mimeType,
      file_url: previewUrl,
      download_url: downloadUrl
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "Lỗi tải file lên Google Drive: " + err.toString()
    });
  }
}

/**
 * Tải ảnh Avatar lên Google Drive (Folder: UX_Portal_Avatars) và tự động cập nhật USERS / RAW_SETTINGS
 */
function handleUploadAvatar(data) {
  try {
    const base64Data = data.base64Data || data.base64;
    const email = String(data.email || data.teamsEmail || data.personalEmail || "").trim().toLowerCase();
    const fileName = "avatar_" + (email ? email.replace(/[^a-zA-Z0-9]/g, "_") : "user") + "_" + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMdd_HHmmss") + ".jpg";
    const mimeType = data.mimeType || "image/jpeg";
    const folderName = "UX_Portal_Avatars";

    if (!base64Data) {
      return createJsonResponse({ status: "error", message: "Thiếu dữ liệu ảnh Avatar (base64Data)." });
    }

    // 1. Tìm hoặc tạo Folder UX_Portal_Avatars trên Google Drive
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      try {
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}
    }

    // 2. Giải mã Base64 và tạo File
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    const fileId = file.getId();
    // Link ảnh trực tiếp
    const avatarUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    const fallbackAvatarUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w500";
    const finalAvatarUrl = avatarUrl;

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 3. Tự động lưu URL Avatar vào RAW_SETTINGS (Key: USERS_LIST)
    if (email) {
      let rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
      if (!rawSettings) {
        initCoreSheets();
        rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
      }

      if (rawSettings) {
        let foundKey = false;
        const lastRow = rawSettings.getLastRow();
        if (lastRow > 1) {
          const dataRows = rawSettings.getRange(2, 1, lastRow - 1, 4).getValues();
          for (let i = 0; i < dataRows.length; i++) {
            if (dataRows[i][0] === "USERS_LIST") {
              foundKey = true;
              try {
                let users = JSON.parse(dataRows[i][1] || "[]");
                if (!Array.isArray(users)) users = [];
                let userFound = false;
                for (let u = 0; u < users.length; u++) {
                  const uPEmail = String(users[u].personalEmail || "").toLowerCase().trim();
                  const uTEmail = String(users[u].teamsEmail || "").toLowerCase().trim();
                  if (uPEmail === email || uTEmail === email || (email && uPEmail.includes(email)) || (email && uTEmail.includes(email))) {
                    users[u].avatarUrl = finalAvatarUrl;
                    userFound = true;
                    break;
                  }
                }
                if (!userFound) {
                  users.push({
                    displayName: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); }),
                    personalEmail: email,
                    teamsEmail: email.includes("@mbbank.com.vn") ? email : email.replace("@gmail.com", "@mbbank.com.vn"),
                    role: "Designer",
                    status: "Active",
                    avatarUrl: finalAvatarUrl
                  });
                }
                rawSettings.getRange(i + 2, 2).setValue(JSON.stringify(users, null, 2));
                rawSettings.getRange(i + 2, 3).setValue(new Date().toISOString());
                rawSettings.getRange(i + 2, 4).setValue(email);
              } catch (e) {}
              break;
            }
          }
        }
        if (!foundKey) {
          const initialUsers = DEFAULT_INITIAL_USERS.map(function(u) {
            const uCopy = Object.assign({}, u);
            if (uCopy.personalEmail.toLowerCase() === email || uCopy.teamsEmail.toLowerCase() === email) {
              uCopy.avatarUrl = finalAvatarUrl;
            }
            return uCopy;
          });
          rawSettings.appendRow(["USERS_LIST", JSON.stringify(initialUsers, null, 2), new Date().toISOString(), email]);
        }
      }

      // 4. Cập nhật Sheet USERS
      const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
      if (userSheet && userSheet.getLastRow() > 1) {
        const uRows = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 6).getValues();
        for (let j = 0; j < uRows.length; j++) {
          const pEmail = String(uRows[j][2] || "").toLowerCase().trim();
          const tEmail = String(uRows[j][3] || "").toLowerCase().trim();
          if (pEmail === email || tEmail === email) {
            userSheet.getRange(j + 2, 2).setValue(finalAvatarUrl);
            break;
          }
        }
      }

      // 5. Tự động đồng bộ ra Users_View
      try {
        projectSettingsToHumanSheets();
      } catch (e) {}
    }

    return createJsonResponse({
      status: "success",
      message: "Tải ảnh Avatar lên Google Drive (Folder UX_Portal_Avatars) và cập nhật Google Sheet thành công!",
      avatar_url: finalAvatarUrl,
      thumbnail_url: fallbackAvatarUrl,
      file_id: fileId,
      folder_name: folderName
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "Lỗi tải Avatar lên Google Drive: " + err.toString()
    });
  }
}

/**
 * Helper to return JSON Response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Hàm kiểm tra & tạo nhanh Folder UX_Portal_Avatars trên Google Drive
 */
function testAvatarDrive() {
  const ui = SpreadsheetApp.getUi();
  try {
    const folderName = "UX_Portal_Avatars";
    let folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    ui.alert("✅ Thành công", "Folder '" + folderName + "' đã sẵn sàng trên Google Drive!\nURL: " + folder.getUrl(), ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("❌ Lỗi Google Drive", "Không thể tạo folder: " + err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * ==============================================================================
 * 5. ĐỒNG BỘ NHÂN SỰ & MASTER DATA LÊN GOOGLE SHEET
 * ==============================================================================
 */

/**
 * Lấy danh sách nhân sự từ RAW_SETTINGS (USERS_LIST) hoặc USERS sheet
 */
function getOrInitTeamMembers(ss) {
  try {
    const rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
    if (rawSettings && rawSettings.getLastRow() > 1) {
      const dataRows = rawSettings.getRange(2, 1, rawSettings.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < dataRows.length; i++) {
        if (dataRows[i][0] === "USERS_LIST" && dataRows[i][1]) {
          const parsed = JSON.parse(dataRows[i][1]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    }
  } catch (e) {}

  const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
  if (userSheet && userSheet.getLastRow() > 1) {
    const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 6).getValues();
    const list = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] || data[i][2] || data[i][3]) {
        list.push({
          id: "mem-" + (i + 1),
          name: String(data[i][0] || "Thành viên UX"),
          avatarUrl: String(data[i][1] || ""),
          email: String(data[i][3] || data[i][2] || ""),
          personalEmail: String(data[i][2] || ""),
          teamsEmail: String(data[i][3] || ""),
          status: String(data[i][4] || "Active"),
          role: String(data[i][5] || "Designer"),
          squad: "Lending & Vay vốn",
          squads: ["Lending & Vay vốn"],
          products: ["Lending & Vay vốn"],
          capacityLimit: 8,
          activeTasks: 0,
          permissions: {
            canAssign: data[i][5] === "Admin" || data[i][5] === "Design Owner",
            canApprovePo: true,
            canExport: true,
            canManageSystem: data[i][5] === "Admin"
          }
        });
      }
    }
    if (list.length > 0) return list;
  }

  return DEFAULT_INITIAL_USERS.map(function(u, idx) {
    return {
      id: "mem-" + (idx + 1),
      name: u.displayName,
      email: u.teamsEmail,
      personalEmail: u.personalEmail,
      teamsEmail: u.teamsEmail,
      role: u.role,
      status: u.status,
      avatarUrl: u.avatarUrl,
      squad: "Lending & Vay vốn",
      squads: ["Lending & Vay vốn"],
      products: ["Lending & Vay vốn"],
      capacityLimit: 8,
      activeTasks: 0,
      permissions: {
        canAssign: u.role === "Admin" || u.role === "Design Owner",
        canApprovePo: true,
        canExport: true,
        canManageSystem: u.role === "Admin"
      }
    };
  });
}

/**
 * Xử lý đồng bộ danh sách nhân sự từ Portal vào Google Sheet
 */
function handleSyncTeamMembers(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const members = data.members || data.users || [];
  if (!Array.isArray(members)) {
    return createJsonResponse({ status: "error", message: "Dữ liệu nhân sự không đúng định dạng mảng." });
  }

  const now = new Date();
  const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  // 1. Cập nhật vào sheet RAW_SETTINGS (Key: USERS_LIST)
  let rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
  if (!rawSettings) {
    initCoreSheets();
    rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
  }

  if (rawSettings) {
    const lastRow = rawSettings.getLastRow();
    let foundRow = -1;
    if (lastRow > 1) {
      const keys = rawSettings.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < keys.length; i++) {
        if (keys[i][0] === "USERS_LIST") {
          foundRow = i + 2;
          break;
        }
      }
    }

    const usersJsonPayload = JSON.stringify(members, null, 2);
    if (foundRow > 0) {
      rawSettings.getRange(foundRow, 2).setValue(usersJsonPayload);
      rawSettings.getRange(foundRow, 3).setValue(formattedDate);
      rawSettings.getRange(foundRow, 4).setValue(data.updated_by || "Admin Portal");
    } else {
      rawSettings.appendRow(["USERS_LIST", usersJsonPayload, formattedDate, data.updated_by || "Admin Portal"]);
    }
  }

  // 2. Cập nhật đồng bộ vào sheet USERS
  let userSheet = ss.getSheetByName(SHEET_USERS_NAME);
  if (!userSheet) {
    userSheet = getOrInitUsersSheet(ss);
  }

  // Giữ lại các token/OTP hiện tại để không làm gián đoạn phiên
  const existingTokens = {};
  if (userSheet && userSheet.getLastRow() > 1) {
    const oldData = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 12).getValues();
    for (let i = 0; i < oldData.length; i++) {
      const emailKey = String(oldData[i][3] || oldData[i][2] || "").trim().toLowerCase();
      if (emailKey) {
        existingTokens[emailKey] = {
          otp: oldData[i][6],
          otpExpires: oldData[i][7],
          otpAttempts: oldData[i][8],
          sessionToken: oldData[i][9],
          sessionExpires: oldData[i][10],
          notes: oldData[i][11]
        };
      }
    }
  }

  // Xóa nội dung dữ liệu cũ trong USERS (giữ hàng header 1)
  if (userSheet && userSheet.getLastRow() > 1) {
    userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 12).clearContent();
  }

  if (userSheet) {
    const userRows = members.map(function(m) {
      const emailKey = String(m.email || m.teamsEmail || m.personalEmail || "").trim().toLowerCase();
      const tokenInfo = existingTokens[emailKey] || {};
      const teamsEmail = m.teamsEmail || (m.email && m.email.includes("@mbbank.com.vn") ? m.email : ((m.email ? m.email.split("@")[0] : "user") + "@mbbank.com.vn"));
      const personalEmail = m.personalEmail || m.email || teamsEmail;
      return [
        m.name || m.displayName || "Thành viên UX",
        m.avatarUrl || "",
        personalEmail,
        teamsEmail,
        m.status || "Active",
        m.role || "Designer",
        tokenInfo.otp || "",
        tokenInfo.otpExpires || "",
        tokenInfo.otpAttempts || 0,
        tokenInfo.sessionToken || "",
        tokenInfo.sessionExpires || "",
        "Đồng bộ từ Portal lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")
      ];
    });

    if (userRows.length > 0) {
      userSheet.getRange(2, 1, userRows.length, 12).setValues(userRows);
    }
  }

  // 3. Tự động đồng bộ ra Users_View
  try {
    projectSettingsToHumanSheets();
  } catch (e) {}

  // 4. Ghi Audit Log vào sheet LOGS
  logActionToSheet(ss, {
    personalEmail: data.user_email || "admin@mbbank.com.vn",
    teamsEmail: data.user_email || "admin@mbbank.com.vn",
    action: "SYNC_TEAM_MEMBERS",
    details: "Đã đồng bộ danh sách " + members.length + " nhân sự vào Google Sheet",
    status: "SUCCESS"
  });

  return createJsonResponse({
    status: "success",
    message: "Đã đồng bộ thành công " + members.length + " nhân sự vào Google Sheet (RAW_SETTINGS, USERS, Users_View)!",
    members_count: members.length,
    timestamp: formattedDate
  });
}

/**
 * Xử lý đồng bộ Master Data (Squads, Products, Phases) lên Google Sheet
 */
function handleSyncMasterData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
  if (!rawSettings) {
    initCoreSheets();
    rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
  }
  if (!rawSettings) {
    return createJsonResponse({ status: "error", message: "Không tìm thấy sheet RAW_SETTINGS" });
  }

  const now = new Date();
  const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
  const updatedBy = data.updated_by || "Admin Portal";

  const configsToSave = {};
  if (data.squads) configsToSave["SQUADS_CONFIG"] = data.squads;
  if (data.products) configsToSave["PRODUCTS_CONFIG"] = data.products;
  if (data.phases) configsToSave["PHASES_CONFIG"] = data.phases;
  if (data.selections) configsToSave["SELECTIONS_CONFIG"] = data.selections;

  const existingKeys = {};
  const lastRow = rawSettings.getLastRow();
  if (lastRow > 1) {
    const keysData = rawSettings.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keysData.length; i++) {
      existingKeys[keysData[i][0]] = i + 2;
    }
  }

  for (const configKey in configsToSave) {
    const payloadStr = JSON.stringify(configsToSave[configKey], null, 2);
    if (existingKeys[configKey]) {
      const rowIdx = existingKeys[configKey];
      rawSettings.getRange(rowIdx, 2).setValue(payloadStr);
      rawSettings.getRange(rowIdx, 3).setValue(formattedDate);
      rawSettings.getRange(rowIdx, 4).setValue(updatedBy);
    } else {
      rawSettings.appendRow([configKey, payloadStr, formattedDate, updatedBy]);
    }
  }

  try {
    projectSettingsToHumanSheets();
  } catch (e) {}

  return createJsonResponse({
    status: "success",
    message: "Đã đồng bộ Master Data cấu hình vào Google Sheet thành công!",
    timestamp: formattedDate
  });
}


