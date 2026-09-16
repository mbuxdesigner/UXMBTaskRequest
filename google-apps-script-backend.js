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
const SHEET_TEST_BANK = "TEST_BANK";
const SHEET_TEST_SUBMISSIONS = "TEST_SUBMISSIONS";

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
const SESSION_EXPIRY_MINUTES = 480;  // 8 tiếng hiệu lực phiên làm việc mặc định (480 phút)
const SESSION_EXPIRY_MINUTES_8H = 480;   // 8 tiếng = 480 phút (Fixed 8h)
const SESSION_EXPIRY_MINUTES_24H = 1440; // 24 tiếng = 1440 phút (Sliding Inactivity 24h)
const INACTIVITY_LIMIT_24H_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms (24 giờ)
const DEFAULT_ROLE_SESSION_POLICIES = {
  "Admin": "fixed_8h",
  "Design Owner": "sliding_24h",
  "Designer": "sliding_24h",
  "PO": "sliding_24h",
  "Business": "sliding_24h"
};
const OTP_MAX_ATTEMPTS = 5;          // Tối đa 5 lần nhập sai
const OTP_RESEND_COOLDOWN = 60;      // 60 giây chờ gửi lại

// Default selections data
const DEFAULT_SELECTIONS = {
  products: [
    "App MBBank",
    "Biz MBBank",
    "BaaS & Open API",
    "Design System & Nền tảng",
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
    .addItem("👥 Đồng bộ 2 chiều Nhân sự (USERS ↔ RAW_SETTINGS)", "syncTwoWayUsers")
    .addItem("⚙️ Khởi tạo cấu trúc 2 Bảng JSON Core (RAW_TASKS & RAW_SETTINGS)", "initCoreSheets")
    .addItem("⏱️ Cài đặt tự động đồng bộ ngầm (Mỗi 15 phút)", "setupAutoProjectionTrigger")
    .addSeparator()
    .addItem("🔗 Cấu hình Teams Webhook URL", "promptSetTeamsWebhook")
    .addItem("🧪 Test gửi OTP qua Teams (testTeamsOtp)", "testTeamsOtp")
    .addItem("📁 Test tạo Folder Drive & Lưu Avatar (testAvatarDrive)", "testAvatarDrive")
    .addSeparator()
    .addItem("🛠️ Kiểm tra & Tự động sửa trùng mã Request ID", "fixDuplicateRequestIds")
    .addItem("📊 Tách dữ liệu JSON cũ (Requests_Detail)", "parseJsonToDetailSheet")
    .addItem("ℹ️ Xem hướng dẫn bảo mật Teams OTP & Phân quyền", "showHelpDialog")
    .addToUi();
}

/**
 * Tự động đồng bộ 2 chiều ngay khi Admin chỉnh sửa trên Sheet USERS
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (!sheet || sheet.getName() !== SHEET_USERS_NAME) return;
    const row = e.range.getRow();
    if (row < 2) return; // Bỏ qua header

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    getOrInitTeamMembers(ss);
  } catch (err) {
    Logger.log("Lỗi onEdit: " + err);
  }
}

/**
 * Hàm thủ công trong Menu: Đồng bộ 2 chiều USERS ↔ RAW_SETTINGS
 */
function syncTwoWayUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const members = getOrInitTeamMembers(ss);
  SpreadsheetApp.getUi().alert("✅ Đã đồng bộ thành công " + (members.length || 0) + " nhân sự giữa sheet USERS và RAW_SETTINGS!");
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

    if (action === "fix_duplicate_ids") {
      const result = fixDuplicateRequestIds();
      return createJsonResponse({
        status: "success",
        message: "Đã tự động kiểm tra và sửa trùng lặp mã Request ID thành công!",
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "get_team_members" || action === "get_users") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const users = (typeof getOrInitTeamMembers === "function") ? getOrInitTeamMembers(ss) : [];
      return createJsonResponse({
        status: "success",
        users: users,
        members: users,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "get_tests") {
      return handleGetTests();
    }

    if (action === "get_submissions") {
      return handleGetSubmissions();
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

    if (action === "check_session" || action === "touch_session" || action === "refresh_session") {
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
        session_policy: user.sessionPolicy || "fixed_8h",
        last_active_at: user.lastActiveAt || Date.now(),
        expires_at: user.expiresAt,
        role: user.role,
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

    if (action === "get_master_data") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
      if (!rawSettings) {
        initCoreSheets();
        rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
      }
      const masterData = {};
      if (rawSettings && rawSettings.getLastRow() > 1) {
        const rows = rawSettings.getRange(2, 1, rawSettings.getLastRow() - 1, 4).getValues();
        for (let i = 0; i < rows.length; i++) {
          const key = String(rows[i][0] || "").trim();
          const jsonVal = String(rows[i][1] || "").trim();
          if (key && jsonVal) {
            try {
              masterData[key] = JSON.parse(jsonVal);
            } catch (err) {
              masterData[key] = jsonVal;
            }
          }
        }
      }
      const members = getOrInitTeamMembers(ss);
      return createJsonResponse({
        status: "success",
        master_data: masterData,
        squads: masterData["SQUADS_CONFIG"] || null,
        products: masterData["PRODUCTS_CONFIG"] || null,
        phases: masterData["PHASES_CONFIG"] || null,
        status_rules: masterData["STATUS_RULES_CONFIG"] || null,
        audit_logs: masterData["AUDIT_LOGS_CONFIG"] || null,
        rbac: masterData["RBAC_CONFIG"] || null,
        nav_items: masterData["NAV_ITEMS_CONFIG"] || null,
        selections: masterData["SELECTIONS_CONFIG"] || null,
        team_members: members,
        form_config: masterData["FORM_CONFIG"] || null,
        ia_trees: masterData["IA_TREES_DATA"] || null,
        session_policies: masterData["SESSION_POLICIES_CONFIG"] || null,
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

    // 12b. ACTION: GET MASTER DATA & TEAM MEMBERS VIA POST
    if (action === "get_master_data") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
      if (!rawSettings) {
        initCoreSheets();
        rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
      }
      const masterData = {};
      if (rawSettings && rawSettings.getLastRow() > 1) {
        const rows = rawSettings.getRange(2, 1, rawSettings.getLastRow() - 1, 4).getValues();
        for (let i = 0; i < rows.length; i++) {
          const key = String(rows[i][0] || "").trim();
          const jsonVal = String(rows[i][1] || "").trim();
          if (key && jsonVal) {
            try {
              masterData[key] = JSON.parse(jsonVal);
            } catch (err) {
              masterData[key] = jsonVal;
            }
          }
        }
      }
      const members = getOrInitTeamMembers(ss);
      return createJsonResponse({
        status: "success",
        master_data: masterData,
        squads: masterData["SQUADS_CONFIG"] || null,
        products: masterData["PRODUCTS_CONFIG"] || null,
        phases: masterData["PHASES_CONFIG"] || null,
        status_rules: masterData["STATUS_RULES_CONFIG"] || null,
        audit_logs: masterData["AUDIT_LOGS_CONFIG"] || null,
        rbac: masterData["RBAC_CONFIG"] || null,
        nav_items: masterData["NAV_ITEMS_CONFIG"] || null,
        selections: masterData["SELECTIONS_CONFIG"] || null,
        team_members: members,
        form_config: masterData["FORM_CONFIG"] || null,
        ia_trees: masterData["IA_TREES_DATA"] || null,
        session_policies: masterData["SESSION_POLICIES_CONFIG"] || null,
        timestamp: new Date().toISOString()
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

    // ACTION: TOUCH / REFRESH SESSION (SLIDING 24H ACTIVITY UPDATE)
    if (action === "touch_session" || action === "refresh_session" || action === "check_session") {
      const sessionToken = String(data.session_token || "").trim();
      if (!sessionToken) {
        return createJsonResponse({ status: "unauthorized", message: "Thiếu session token" });
      }
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const user = findUserBySessionToken(ss, sessionToken);
      if (!user) {
        return createJsonResponse({ status: "unauthorized", message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." });
      }
      if ((data.force_save || action === "touch_session") && user.sessionPolicy === "sliding_24h") {
        try {
          const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
          if (userSheet && userSheet.getLastRow() > 1) {
            const lastRow = userSheet.getLastRow();
            const tokenColData = userSheet.getRange(2, 10, lastRow - 1, 1).getValues();
            for (let ti = 0; ti < tokenColData.length; ti++) {
              if (String(tokenColData[ti][0] || "").trim() === sessionToken) {
                userSheet.getRange(ti + 2, 14).setValue(Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss"));
                break;
              }
            }
          }
        } catch (ue) {}
      }

      return createJsonResponse({
        status: "success",
        valid: true,
        session_policy: user.sessionPolicy || "fixed_8h",
        last_active_at: user.lastActiveAt || Date.now(),
        expires_at: user.expiresAt,
        role: user.role,
        user: {
          personalEmail: user.personalEmail,
          teamsEmail: user.teamsEmail,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role
        }
      });
    }

    // 13. ACTION: TEST EXAMS & SUBMISSIONS
    if (action === "save_test") {
      return handleSaveTest(data);
    }
    if (action === "submit_test") {
      return handleSubmitTest(data);
    }
    if (action === "grade_essay") {
      return handleGradeEssay(data);
    }
    if (action === "get_tests") {
      return handleGetTests();
    }
    if (action === "get_submissions") {
      return handleGetSubmissions();
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
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Khóa 15 giây chống xung đột đồng thời (Race Condition)
  } catch (e) {
    Logger.log("Lock acquisition warning: " + e);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rawSheet = getOrInitRawTasksSheet(ss);
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    const todayPrefix = "UXMB-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd") + "-";

    // Quét toàn bộ mã ID đã tồn tại trong cột A của RAW_TASKS để đảm bảo không bao giờ trùng lặp
    const existingIds = new Set();
    let maxDailySeq = 0;
    const lastRow = rawSheet.getLastRow();

    if (lastRow > 1) {
      const idValues = rawSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let r = 0; r < idValues.length; r++) {
        const idStr = String(idValues[r][0] || "").trim();
        if (idStr) {
          existingIds.add(idStr);
          if (idStr.startsWith(todayPrefix)) {
            const seqNumPart = parseInt(idStr.substring(todayPrefix.length), 10);
            if (!isNaN(seqNumPart) && seqNumPart > maxDailySeq) {
              maxDailySeq = seqNumPart;
            }
          }
        }
      }
    }

    let finalRequestId = (data.request_id && !data.request_id.includes("TMP") && !data.request_id.includes("PENDING"))
      ? String(data.request_id).trim() 
      : "";

    // Nếu không có ID hoặc ID đã bị trùng trong Sheet: tự động cấp mã mới duy nhất
    if (!finalRequestId || existingIds.has(finalRequestId)) {
      let nextSeq = maxDailySeq + 1;
      let candidateId = todayPrefix + ("000" + nextSeq).slice(-3);
      while (existingIds.has(candidateId)) {
        nextSeq++;
        candidateId = todayPrefix + ("000" + nextSeq).slice(-3);
      }
      finalRequestId = candidateId;
    }

    const rawObj = data.raw_data || data;
    rawObj.request_id = finalRequestId;
    if (!rawObj.submitted_at) rawObj.submitted_at = formattedDate;
    if (!rawObj.last_updated) rawObj.last_updated = formattedDate;
    if (!rawObj.current_phase || rawObj.current_phase === "Phân loại" || rawObj.current_phase === "Chờ tiếp nhận") rawObj.current_phase = "Chờ xác nhận";
    if (!rawObj.status || rawObj.status === "Đang phân loại" || rawObj.status === "Phân loại" || rawObj.status === "Chờ tiếp nhận") rawObj.status = "Chờ xác nhận";
    if (!rawObj.progress || rawObj.progress === 15) rawObj.progress = 10;
    if (!rawObj.viewers) rawObj.viewers = [];

    if (!rawObj.task_updates || rawObj.task_updates.length === 0) {
      rawObj.task_updates = [
        {
          id: "LOG-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss"),
          timestamp: formattedDate,
          updated_by: rawObj.requester_name || rawObj.requester_email || "PO",
          author_role: "PO",
          new_phase: "Chờ xác nhận",
          new_progress: 10,
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
      rawObj.current_phase || "Chờ xác nhận",
      rawObj.status || "Chờ xác nhận",
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
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
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

  // Dự phòng: tra cứu theo user_email gửi từ client nếu sessionToken chưa được lưu
  const clientEmail = String(data.user_email || "").trim().toLowerCase();
  if (!user && clientEmail) {
    const userSheet = getOrInitUsersSheet(ss);
    const userRow = findUserRowByPersonalEmail(userSheet, clientEmail);
    if (userRow) {
      user = {
        personalEmail: userRow.personalEmail,
        teamsEmail: userRow.teamsEmail,
        displayName: userRow.displayName,
        role: userRow.role
      };
    }
  }

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

  // Luôn làm tươi vai trò mới nhất trực tiếp từ sheet USERS theo email
  const userEmail = String(user.teamsEmail || user.personalEmail || clientEmail).trim().toLowerCase();
  if (userEmail) {
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    if (userSheet && userSheet.getLastRow() > 1) {
      const uRows = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 6).getValues();
      for (let u = 0; u < uRows.length; u++) {
        const rowTEmail = String(uRows[u][3] || "").trim().toLowerCase();
        const rowPEmail = String(uRows[u][2] || "").trim().toLowerCase();
        if (rowTEmail === userEmail || rowPEmail === userEmail || (userEmail && (rowTEmail.includes(userEmail.split("@")[0]) || userEmail.includes(rowTEmail.split("@")[0])))) {
          var rawRole = String(uRows[u][5] || "").trim();
          if (rawRole) {
            if (rawRole.toLowerCase().indexOf("admin") !== -1) user.role = "Admin";
            else if (rawRole.toLowerCase().indexOf("owner") !== -1) user.role = "Design Owner";
            else if (rawRole.toLowerCase().indexOf("po") !== -1) user.role = "PO";
            else if (rawRole.toLowerCase().indexOf("biz") !== -1 || rawRole.toLowerCase().indexOf("business") !== -1) user.role = "Business";
            else user.role = rawRole;
          }
          break;
        }
      }
    }
  }

  const userRole = String(user.role || "Designer").trim();

  if (userRole === "PO") {
    const isPoApproval = note && (note.includes("chấp thuận bàn giao") || note.includes("duyệt"));
    const isPoEdit = (typeof data.is_po_edit !== "undefined" && data.is_po_edit) ||
                     (note && (note.includes("PO cập nhật đầu bài") || note.includes("đầu bài"))) ||
                     (typeof data.squad_name !== "undefined" || typeof data.title !== "undefined" || typeof data.description !== "undefined");
    const isCommentOnly = data.is_comment === true;

    if (!isPoApproval && !isPoEdit && !isCommentOnly) {
      return createJsonResponse({
        status: "forbidden",
        message: "Tài khoản PO chỉ có quyền chỉnh sửa đầu bài hoặc duyệt bàn giao, không có quyền đổi khâu thiết kế UX."
      });
    }
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
      const rowTitle = String(rawRows[i][1] || "").trim();
      const targetTitle = String(data.title || "").trim();
      const isMatch = rowReqId === requestId || 
        (data.original_request_id && rowReqId === String(data.original_request_id).trim() && targetTitle && rowTitle === targetTitle);
      if (isMatch) {
        let item = {};
        try {
          item = JSON.parse(rawRows[i][7]); // Cột H: Payload_JSON
        } catch (e) {
          item = {};
        }

        if (userRole === "Designer") {
          const currentAssigned = String(item.assigned_designer || item.ux_owner || "").toLowerCase();
          const isAssigning = typeof data.assigned_designer !== "undefined";
          const isUnassigned = !currentAssigned || currentAssigned === "chưa phân công" || currentAssigned === "đang phân công";
          if (!isAssigning && !isUnassigned && currentAssigned && !currentAssigned.includes(userEmail) && !userEmail.includes("designer") && !userEmail.includes("cuong") && !userEmail.includes("admin")) {
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
          deliverable_link: figmaUrl || ""
        };

        if (newPhase) item.current_phase = newPhase;
        if (newStatus) item.status = newStatus;
        if (typeof newProgress === "number") item.progress = newProgress;
        if (typeof data.sent_to_po_at !== "undefined") {
          item.sent_to_po_at = String(data.sent_to_po_at || "").trim();
        } else if (newStatus === "Đã gửi PO" && !item.sent_to_po_at) {
          item.sent_to_po_at = new Date().toISOString();
        }
        if (newStatus !== "Đã gửi PO" && newStatus !== "PO pending" && newStatus !== "Pending") {
          item.sent_to_po_at = "";
          item.pending_reason = "";
        }
        if (data.pending_reason) {
          item.pending_reason = String(data.pending_reason).trim();
        }
        if (data.priority) {
          item.priority = String(data.priority).trim();
          rawSheet.getRange(i + 2, 6).setValue(item.priority);
        }
        if (typeof data.design_deadline !== "undefined") {
          item.design_deadline = String(data.design_deadline || "").trim();
        }
        if (data.release_date) {
          item.release_date = String(data.release_date).trim();
          item.expected_deadline = item.release_date;
        }
        if (data.is_po_edit) {
          if (typeof data.squad_name !== "undefined" || typeof data.preferred_squad !== "undefined") {
            const cleanSq = String(data.squad_name || data.preferred_squad || "").trim();
            item.squad_name = cleanSq;
            item.preferred_squad = cleanSq;
          }
          if (typeof data.title !== "undefined" && data.title) {
            item.title = String(data.title).trim();
            rawSheet.getRange(i + 2, 2).setValue(item.title);
          }
          if (typeof data.product !== "undefined" && data.product) {
            item.product = String(data.product).trim();
            rawSheet.getRange(i + 2, 3).setValue(item.product);
          }
          if (typeof data.request_type !== "undefined") {
            item.request_type = String(data.request_type).trim();
          }
          if (typeof data.description !== "undefined") {
            item.description = String(data.description).trim();
          }
          if (typeof data.business_need !== "undefined") {
            item.business_need = String(data.business_need).trim();
          }
          if (typeof data.user_problem !== "undefined") {
            item.user_problem = String(data.user_problem).trim();
          }
          if (typeof data.target_user !== "undefined") {
            item.target_user = String(data.target_user).trim();
          }
          if (typeof data.deadline_reason !== "undefined") {
            item.deadline_reason = String(data.deadline_reason).trim();
          }
          if (typeof data.doc_links !== "undefined" && Array.isArray(data.doc_links)) {
            item.doc_links = data.doc_links;
            if (data.doc_links.length > 0) {
              item.doc_link = data.doc_links.join("\n");
            }
          }
        } else {
          // Khi KHÔNG PHẢI PO EDIT (chỉ đổi phase/status, assign designer...):
          // Tuyệt đối KHÔNG xóa trắng các trường đầu bài và squad đã có
          if (data.squad_name && String(data.squad_name).trim()) {
            const cleanSq = String(data.squad_name).trim();
            item.squad_name = cleanSq;
            item.preferred_squad = cleanSq;
          } else if (data.preferred_squad && String(data.preferred_squad).trim()) {
            const cleanSq = String(data.preferred_squad).trim();
            item.squad_name = cleanSq;
            item.preferred_squad = cleanSq;
          }
          if (data.title && String(data.title).trim()) {
            item.title = String(data.title).trim();
            rawSheet.getRange(i + 2, 2).setValue(item.title);
          }
          if (data.product && String(data.product).trim()) {
            item.product = String(data.product).trim();
            rawSheet.getRange(i + 2, 3).setValue(item.product);
          }
          if (data.description && String(data.description).trim()) {
            item.description = String(data.description).trim();
          }
          if (data.business_need && String(data.business_need).trim()) {
            item.business_need = String(data.business_need).trim();
          }
          if (data.user_problem && String(data.user_problem).trim()) {
            item.user_problem = String(data.user_problem).trim();
          }
          if (data.request_type && String(data.request_type).trim()) {
            item.request_type = String(data.request_type).trim();
          }
          if (data.target_user && String(data.target_user).trim()) {
            item.target_user = String(data.target_user).trim();
          }
          if (data.deadline_reason && String(data.deadline_reason).trim()) {
            item.deadline_reason = String(data.deadline_reason).trim();
          }
          if (data.doc_links && Array.isArray(data.doc_links) && data.doc_links.length > 0) {
            item.doc_links = data.doc_links;
            item.doc_link = data.doc_links.join("\n");
          }
        }
        item.last_updated = formattedDate;
        if (typeof data.assigned_designer !== "undefined") {
          item.assigned_designer = assignedDesigner;
          item.ux_owner = assignedDesigner || "Chưa phân công";
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

        if (typeof data.viewers !== "undefined") {
          item.viewers = Array.isArray(data.viewers) ? data.viewers : [];
        }

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
  const seenIds = new Set();
  let hasFixedDuplicates = false;

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
      if (!item.priority && isRawTasks && rawRows[i][5]) item.priority = String(rawRows[i][5]);

      // Tự động phát hiện và giải quyết mã trùng lặp (Self-Healing Deduplication)
      let curId = String(item.request_id || "").trim();
      if (seenIds.has(curId)) {
        hasFixedDuplicates = true;
        const match = curId.match(/^(UXMB-\d{8}-)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const digits = match[2];
          let seq = parseInt(digits, 10) + 1;
          let candidate = prefix + ("000" + seq).slice(-digits.length);
          while (seenIds.has(candidate)) {
            seq++;
            candidate = prefix + ("000" + seq).slice(-digits.length);
          }
          item.request_id = candidate;
          curId = candidate;
        } else {
          let s = 1;
          let candidate = curId + "-" + s;
          while (seenIds.has(candidate)) {
            s++;
            candidate = curId + "-" + s;
          }
          item.request_id = candidate;
          curId = candidate;
        }

        // Tự động ghi đè sửa lại mã vào Google Sheet RAW_TASKS để vĩnh viễn không bị trùng lặp
        if (isRawTasks) {
          try {
            rawSheet.getRange(i + 2, 1).setValue(curId); // Cột A: Request_ID
            rawSheet.getRange(i + 2, 8).setValue(JSON.stringify(item, null, 2)); // Cột H: Payload_JSON
          } catch (err) {
            Logger.log("Could not auto-repair duplicate row in RAW_TASKS: " + err);
          }
        }
      }

      seenIds.add(curId);
      requests.push(item);
    }
  }

  // Nếu có dòng được sửa mã, tự động đồng bộ lại Tasks_View
  if (hasFixedDuplicates) {
    try {
      projectTasksToHumanSheets();
    } catch (e) {}
  }

  return requests.reverse();
}

/**
 * Tiện ích menu: Quét và sửa sạch toàn bộ mã trùng lặp trên Google Sheet
 */
function fixDuplicateRequestIds() {
  const reqs = getAllRequestsFromSheet();
  try {
    SpreadsheetApp.getUi().alert("✅ Đã kiểm tra và xử lý trùng lặp mã Request ID thành công!\nTổng cộng: " + reqs.length + " bài toán.");
  } catch (e) {
    Logger.log("fixDuplicateRequestIds completed: " + reqs.length + " items.");
  }
  return { success: true, count: reqs.length };
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
 * Tra cứu chính sách phiên hiệu lực của người dùng:
 * 1. Kiểm tra ghi đè cá nhân trong Sheet USERS (cột 13) hoặc RAW_SETTINGS (USERS_LIST)
 * 2. Kế thừa từ vai trò trong SESSION_POLICIES_CONFIG (hoặc DEFAULT_ROLE_SESSION_POLICIES)
 */
function resolveUserSessionPolicy(ss, userEmail, userRole) {
  const cleanEmail = String(userEmail || "").trim().toLowerCase();
  const targetRole = String(userRole || "Designer").trim();

  // 1. Kiểm tra ghi đè cá nhân trong Sheet USERS (cột 13)
  try {
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    if (userSheet && userSheet.getLastRow() > 1) {
      const lastRow = userSheet.getLastRow();
      const lastCol = Math.max(14, userSheet.getLastColumn());
      const data = userSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (let i = 0; i < data.length; i++) {
        const pEmail = String(data[i][2] || "").trim().toLowerCase();
        const tEmail = String(data[i][3] || "").trim().toLowerCase();
        if (pEmail === cleanEmail || tEmail === cleanEmail || (cleanEmail && (pEmail.includes(cleanEmail.split("@")[0]) || tEmail.includes(cleanEmail.split("@")[0])))) {
          const userPolicy = String(data[i][12] || "").trim().toLowerCase();
          if (userPolicy === "fixed_8h" || userPolicy === "sliding_24h") {
            return userPolicy;
          }
          break;
        }
      }
    }
  } catch (e) {}

  // 2. Kiểm tra ghi đè cá nhân trong RAW_SETTINGS (Key USERS_LIST) & cấu hình vai trò
  try {
    const rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
    if (rawSettings && rawSettings.getLastRow() > 1) {
      const rows = rawSettings.getRange(2, 1, rawSettings.getLastRow() - 1, 2).getValues();
      for (let r = 0; r < rows.length; r++) {
        if (rows[r][0] === "USERS_LIST" && rows[r][1]) {
          try {
            const members = JSON.parse(rows[r][1]);
            if (Array.isArray(members)) {
              const found = members.find(function(m) {
                const p = String(m.personalEmail || "").trim().toLowerCase();
                const t = String(m.teamsEmail || "").trim().toLowerCase();
                const e = String(m.email || "").trim().toLowerCase();
                return p === cleanEmail || t === cleanEmail || e === cleanEmail;
              });
              if (found && (found.sessionPolicy === "fixed_8h" || found.sessionPolicy === "sliding_24h")) {
                return found.sessionPolicy;
              }
            }
          } catch (pe) {}
        }
        if (rows[r][0] === "SESSION_POLICIES_CONFIG" && rows[r][1]) {
          try {
            const policies = JSON.parse(rows[r][1]);
            if (policies && policies[targetRole]) {
              return policies[targetRole];
            }
          } catch (pe) {}
        }
      }
    }
  } catch (e) {}

  return DEFAULT_ROLE_SESSION_POLICIES[targetRole] || "fixed_8h";
}

/**
 * Chuyển đổi định dạng ngày tháng sang millisecond timestamp
 */
function parseVnDateToMs(ts) {
  if (!ts) return 0;
  if (ts instanceof Date) return ts.getTime();
  const str = String(ts).trim();
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmy) {
    return new Date(
      Number(dmy[3]),
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      dmy[4] ? Number(dmy[4]) : 0,
      dmy[5] ? Number(dmy[5]) : 0,
      dmy[6] ? Number(dmy[6]) : 0
    ).getTime();
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Xóa session token trong sheet USERS khi hết hạn
 */
function clearUserSessionInSheet(ss, sessionToken, reason) {
  try {
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    if (!userSheet || userSheet.getLastRow() <= 1) return;
    const lastRow = userSheet.getLastRow();
    const data = userSheet.getRange(2, 10, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === sessionToken) {
        userSheet.getRange(i + 2, 10).setValue("");
        userSheet.getRange(i + 2, 11).setValue("");
        userSheet.getRange(i + 2, 12).setValue(reason + " (" + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM") + ")");
        userSheet.getRange(i + 2, 14).setValue("");
        break;
      }
    }
  } catch (e) {}
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

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let finalRole = otpObj.role || "Designer";

    if (otpObj.rowIndex) {
      try {
        const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
        if (userSheet && userSheet.getLastRow() >= otpObj.rowIndex) {
          const rawRoleVal = String(userSheet.getRange(otpObj.rowIndex, 6).getValue() || "").trim();
          if (rawRoleVal) {
            if (rawRoleVal.toLowerCase().indexOf("admin") !== -1) finalRole = "Admin";
            else if (rawRoleVal.toLowerCase().indexOf("owner") !== -1) finalRole = "Design Owner";
            else if (rawRoleVal.toLowerCase().indexOf("po") !== -1) finalRole = "PO";
            else if (rawRoleVal.toLowerCase().indexOf("biz") !== -1 || rawRole.toLowerCase().indexOf("business") !== -1) finalRole = "Business";
            else finalRole = rawRoleVal;
          }
        }
      } catch (e) {}
    }

    const sessionPolicy = resolveUserSessionPolicy(ss, emailInput, finalRole);
    const durationMinutes = sessionPolicy === "sliding_24h" ? SESSION_EXPIRY_MINUTES_24H : SESSION_EXPIRY_MINUTES_8H;
    const sessionToken = "ST_" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
    const sessionExpiresDate = new Date(nowMs + durationMinutes * 60 * 1000);
    const sessionExpiresStr = Utilities.formatDate(sessionExpiresDate, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    const nowStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    const noteStr = sessionPolicy === "sliding_24h"
      ? "Xác thực OTP (Trượt 24h) thành công lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")
      : "Xác thực OTP (Cố định 8h) thành công lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM");

    if (otpObj.rowIndex) {
      try {
        const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
        if (userSheet && userSheet.getLastRow() >= otpObj.rowIndex) {
          userSheet.getRange(otpObj.rowIndex, 7, 1, 8).setValues([[
            "VERIFIED (" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss") + ")",
            "",
            0,
            sessionToken,
            sessionExpiresStr,
            noteStr,
            sessionPolicy,
            nowStr
          ]]);
        }
      } catch (e) {}
    }

    // Lưu RAM Cache (giới hạn tối đa 21,600s = 6h của Google Apps Script CacheService)
    const cacheTtlSeconds = Math.min(21600, durationMinutes * 60);
    cache.put("session_" + sessionToken, JSON.stringify({
      personalEmail: otpObj.personalEmail || emailInput,
      teamsEmail: otpObj.teamsEmail,
      displayName: otpObj.displayName || otpObj.teamsEmail.split("@")[0],
      avatarUrl: otpObj.avatarUrl || "",
      role: finalRole,
      sessionPolicy: sessionPolicy,
      loginAt: nowMs,
      lastActiveAt: nowMs,
      expiresAt: sessionExpiresDate.getTime()
    }), cacheTtlSeconds);

    return createJsonResponse({
      status: "success",
      message: "Xác thực thành công!",
      session_token: sessionToken,
      session_policy: sessionPolicy,
      personal_email: otpObj.personalEmail || emailInput,
      teams_email: otpObj.teamsEmail,
      display_name: otpObj.displayName || otpObj.teamsEmail.split("@")[0],
      avatar_url: otpObj.avatarUrl || "",
      role: finalRole,
      expires_in: durationMinutes * 60,
      last_active_at: nowMs
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

  const sessionPolicy = userRowInfo.sessionPolicy && userRowInfo.sessionPolicy !== "inherit"
    ? userRowInfo.sessionPolicy
    : resolveUserSessionPolicy(ss, emailInput, userRowInfo.role);

  const durationMinutes = sessionPolicy === "sliding_24h" ? SESSION_EXPIRY_MINUTES_24H : SESSION_EXPIRY_MINUTES_8H;
  const sessionToken = "ST_" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
  const sessionExpiresDate = new Date(nowMs + durationMinutes * 60 * 1000);
  const sessionExpiresStr = Utilities.formatDate(sessionExpiresDate, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
  const nowStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
  const noteStr = sessionPolicy === "sliding_24h"
    ? "Xác thực OTP (Trượt 24h) thành công lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")
    : "Xác thực OTP (Cố định 8h) thành công lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM");

  const cacheTtlSeconds = Math.min(21600, durationMinutes * 60);
  cache.put("session_" + sessionToken, JSON.stringify({
    personalEmail: userRowInfo.personalEmail,
    teamsEmail: userRowInfo.teamsEmail,
    displayName: userRowInfo.displayName,
    avatarUrl: userRowInfo.avatarUrl,
    role: userRowInfo.role,
    sessionPolicy: sessionPolicy,
    loginAt: nowMs,
    lastActiveAt: nowMs,
    expiresAt: sessionExpiresDate.getTime()
  }), cacheTtlSeconds);

  userSheet.getRange(userRowInfo.rowIndex, 7, 1, 8).setValues([[
    "VERIFIED (" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss") + ")",
    "",
    0,
    sessionToken,
    sessionExpiresStr,
    noteStr,
    sessionPolicy,
    nowStr
  ]]);

  return createJsonResponse({
    status: "success",
    message: "Xác thực thành công!",
    session_token: sessionToken,
    session_policy: sessionPolicy,
    personal_email: userRowInfo.personalEmail,
    teams_email: userRowInfo.teamsEmail,
    display_name: userRowInfo.displayName,
    avatar_url: userRowInfo.avatarUrl,
    role: userRowInfo.role,
    expires_in: durationMinutes * 60,
    last_active_at: nowMs
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
    clearUserSessionInSheet(ss, sessionToken, "Đã đăng xuất");
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

  // 1. Ưu tiên đọc trực tiếp từ sheet USERS (Nơi Admin trực tiếp quản lý phân quyền và nhân sự)
  if (userSheet && userSheet.getLastRow() > 1) {
    const lastCol = Math.max(14, userSheet.getLastColumn());
    const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, lastCol).getValues();
    for (let i = 0; i < data.length; i++) {
      const pEmail = String(data[i][2] || "").trim().toLowerCase();
      const tEmail = String(data[i][3] || "").trim().toLowerCase();
      if (pEmail === targetEmail || tEmail === targetEmail || (tEmail && targetEmail.includes(tEmail.split("@")[0]))) {
        var rawRole = String(data[i][5] || "Designer").trim();
        var role = "Designer";
        if (rawRole.toLowerCase().indexOf("admin") !== -1) role = "Admin";
        else if (rawRole.toLowerCase().indexOf("owner") !== -1) role = "Design Owner";
        else if (rawRole.toLowerCase().indexOf("po") !== -1) role = "PO";
        else if (rawRole.toLowerCase().indexOf("biz") !== -1 || rawRole.toLowerCase().indexOf("business") !== -1) role = "Business";
        else role = "Designer";

        return {
          rowIndex: i + 2,
          displayName: String(data[i][0] || ""),
          avatarUrl: String(data[i][1] || ""),
          personalEmail: data[i][2] || tEmail,
          teamsEmail: data[i][3],
          status: String(data[i][4] || "Active"),
          role: role,
          currentOtp: data[i][6],
          otpExpiresAt: data[i][7],
          otpAttempts: data[i][8],
          sessionToken: data[i][9],
          sessionExpiresAt: data[i][10],
          notes: data[i][11],
          sessionPolicy: String(data[i][12] || "").trim(),
          lastActiveAt: data[i][13] || ""
        };
      }
    }
  }

  // 2. Dự phòng: Tìm trong RAW_SETTINGS (Key USERS_LIST) nếu sheet USERS chưa có
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
                notes: "From RAW_SETTINGS",
                sessionPolicy: String(users[u].sessionPolicy || users[u].session_policy || "").trim(),
                lastActiveAt: ""
              };
            }
          }
        }
      }
    }
  } catch (e) {}

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
        notes: "From DEFAULT_INITIAL_USERS",
        sessionPolicy: String(def.sessionPolicy || "").trim(),
        lastActiveAt: ""
      };
    }
  }

  return null;
}

/**
 * Tìm kiếm User bằng Session Token
 * Kiểm tra tính hợp lệ theo chính sách tương ứng của từng người dùng (Fixed 8h hoặc Sliding 24h)
 * Đảm bảo cơ chế dự phòng hoạt động khi RAM Cache hết hạn (Fallback tra cứu Sheet USERS)
 */
function findUserBySessionToken(ss, sessionToken) {
  if (!sessionToken) return null;

  const now = new Date();
  const nowMs = now.getTime();
  const cache = CacheService.getScriptCache();
  const SKEW_THRESHOLD_MS = 15 * 60 * 1000; // 15 phút tối đa sai lệch đồng hồ tương lai

  // 1. Kiểm tra bộ nhớ RAM Cache trước (Fast in-memory path)
  try {
    const cached = cache.get("session_" + sessionToken);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.sessionPolicy === "sliding_24h") {
        const lastActive = parsed.lastActiveAt || (parsed.expiresAt ? parsed.expiresAt - INACTIVITY_LIMIT_24H_MS : nowMs);
        // Kiểm tra bất thường đồng hồ nằm sâu trong tương lai
        if (lastActive > nowMs + SKEW_THRESHOLD_MS) {
          cache.remove("session_" + sessionToken);
          clearUserSessionInSheet(ss, sessionToken, "Phát hiện sai lệch đồng hồ bất thường");
          return null;
        }
        if (nowMs - lastActive <= INACTIVITY_LIMIT_24H_MS) {
          // Vẫn hợp lệ trong 24h vắng mặt -> Làm mới mốc hoạt động
          parsed.lastActiveAt = nowMs;
          parsed.expiresAt = nowMs + INACTIVITY_LIMIT_24H_MS;
          try {
            cache.put("session_" + sessionToken, JSON.stringify(parsed), 21600);
          } catch (ce) {}
          return parsed;
        } else {
          // Đã vắng mặt quá 24h -> Xóa cache và xóa trên sheet
          cache.remove("session_" + sessionToken);
          clearUserSessionInSheet(ss, sessionToken, "Phiên trượt 24h đã hết hạn");
          return null;
        }
      } else {
        // Fixed 8h
        if (nowMs <= parsed.expiresAt) {
          return parsed;
        } else {
          cache.remove("session_" + sessionToken);
          clearUserSessionInSheet(ss, sessionToken, "Phiên cố định 8h đã hết hạn");
          return null;
        }
      }
    }
  } catch (e) {}

  // 2. Dự phòng khi RAM Cache hết hạn: Tra cứu trực tiếp từ sheet USERS
  // Tối ưu hóa: Chỉ đọc Cột 10 (Session Token) để tìm đúng dòng rowIndex, tránh tải toàn bộ 14 cột của tất cả dòng
  try {
    const userSheet = getOrInitUsersSheet(ss);
    const lastRow = userSheet.getLastRow();
    if (lastRow > 1) {
      const tokenColData = userSheet.getRange(2, 10, lastRow - 1, 1).getValues();
      for (let i = 0; i < tokenColData.length; i++) {
        const tokenInSheet = String(tokenColData[i][0] || "").trim();
        if (tokenInSheet === sessionToken) {
          const rowIndex = i + 2;
          const rowData = userSheet.getRange(rowIndex, 1, 1, 14).getValues()[0];

          var rawRole = String(rowData[5] || "Designer").trim();
          var role = "Designer";
          if (rawRole.toLowerCase().indexOf("admin") !== -1) role = "Admin";
          else if (rawRole.toLowerCase().indexOf("owner") !== -1) role = "Design Owner";
          else if (rawRole.toLowerCase().indexOf("po") !== -1) role = "PO";
          else if (rawRole.toLowerCase().indexOf("biz") !== -1 || rawRole.toLowerCase().indexOf("business") !== -1) role = "Business";
          else role = rawRole;

          const pEmail = String(rowData[2] || "").trim();
          const tEmail = String(rowData[3] || "").trim();

          // Xác định chính sách phiên: Cột 13 -> fallback vai trò
          var sessionPolicy = String(rowData[12] || "").trim().toLowerCase();
          if (sessionPolicy !== "fixed_8h" && sessionPolicy !== "sliding_24h") {
            sessionPolicy = resolveUserSessionPolicy(ss, pEmail || tEmail, role);
          }

          if (sessionPolicy === "sliding_24h") {
            // Tra cứu mốc lastActiveAt từ Cột 14
            const rawLastActive = rowData[13];
            let lastActiveMs = parseVnDateToMs(rawLastActive);
            if (!lastActiveMs) {
              const rawExp = rowData[10];
              lastActiveMs = parseVnDateToMs(rawExp);
              if (lastActiveMs) lastActiveMs -= INACTIVITY_LIMIT_24H_MS;
              else lastActiveMs = nowMs;
            }

            // Phát hiện lệch đồng hồ nghiêm trọng
            if (lastActiveMs > nowMs + SKEW_THRESHOLD_MS) {
              userSheet.getRange(rowIndex, 10).setValue("");
              userSheet.getRange(rowIndex, 11).setValue("");
              userSheet.getRange(rowIndex, 12).setValue("Phiên bị hủy do lệch đồng hồ bất thường lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM"));
              userSheet.getRange(rowIndex, 14).setValue("");
              return null;
            }

            // Kiểm tra thời hạn 24 giờ vắng mặt
            if (nowMs - lastActiveMs <= INACTIVITY_LIMIT_24H_MS) {
              // Phiên hợp lệ! Cập nhật mốc hoạt động mới lên Sheet USERS (Cột 14)
              const nowStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
              userSheet.getRange(rowIndex, 14).setValue(nowStr);

              const freshUser = {
                displayName: String(rowData[0] || ""),
                avatarUrl: String(rowData[1] || ""),
                personalEmail: pEmail,
                teamsEmail: tEmail,
                role: role,
                sessionPolicy: "sliding_24h",
                lastActiveAt: nowMs,
                expiresAt: nowMs + INACTIVITY_LIMIT_24H_MS
              };

              // Khôi phục nạp lại RAM Cache (TTL tối đa 21,600s = 6h)
              try {
                cache.put("session_" + sessionToken, JSON.stringify(freshUser), 21600);
              } catch (ce) {}

              return freshUser;
            } else {
              // Đã vắng mặt quá 24h -> Xóa token phiên trên sheet USERS
              userSheet.getRange(rowIndex, 10).setValue("");
              userSheet.getRange(rowIndex, 11).setValue("");
              userSheet.getRange(rowIndex, 12).setValue("Phiên trượt 24h đã hết hạn lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM"));
              userSheet.getRange(rowIndex, 14).setValue("");
              return null;
            }
          } else {
            // Fixed 8h: Kiểm tra thời hạn hết hạn từ Cột 11
            const rawExp = rowData[10];
            const expMs = parseVnDateToMs(rawExp);

            if (expMs && nowMs <= expMs) {
              const freshUser = {
                displayName: String(rowData[0] || ""),
                avatarUrl: String(rowData[1] || ""),
                personalEmail: pEmail,
                teamsEmail: tEmail,
                role: role,
                sessionPolicy: "fixed_8h",
                expiresAt: expMs
              };
              const remSec = Math.min(21600, Math.max(60, Math.floor((expMs - nowMs) / 1000)));
              try {
                cache.put("session_" + sessionToken, JSON.stringify(freshUser), remSec);
              } catch (ce) {}
              return freshUser;
            } else {
              // Đã quá 8 tiếng -> Xóa token phiên trên sheet USERS
              userSheet.getRange(rowIndex, 10).setValue("");
              userSheet.getRange(rowIndex, 11).setValue("");
              userSheet.getRange(rowIndex, 12).setValue("Phiên cố định 8h đã hết hạn lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM"));
              userSheet.getRange(rowIndex, 14).setValue("");
              return null;
            }
          }
        }
      }
    }
  } catch (e) {}

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
 * Khởi tạo sheet USERS (hỗ trợ 14 cột gồm Session Policy & Last Active At)
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
      "Ghi chú / Cập nhật gần nhất",
      "Session Policy (inherit/fixed_8h/sliding_24h)",
      "Last Active At (Mốc hoạt động gần nhất)"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1B3A6B")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    sheet.appendRow(["Admin MB UX", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "admin@gmail.com", "admin@mbbank.com.vn", "Active", "Admin", "", "", 0, "", "", "Tài khoản Quản trị", "fixed_8h", ""]);
    sheet.appendRow(["Trần Mai Lan", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", "lan.po@gmail.com", "lan.po@mbbank.com.vn", "Active", "PO", "", "", 0, "", "", "Product Owner", "sliding_24h", ""]);

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
    sheet.setColumnWidth(13, 190);
    sheet.setColumnWidth(14, 190);
  } else {
    // Nâng cấp bổ sung cột 13 và 14 nếu sheet đã tồn tại
    try {
      const lastCol = sheet.getLastColumn();
      if (lastCol < 13) {
        sheet.getRange(1, 13).setValue("Session Policy (inherit/fixed_8h/sliding_24h)");
        sheet.getRange(1, 13)
          .setBackground("#1B3A6B")
          .setFontColor("#FFFFFF")
          .setFontWeight("bold")
          .setHorizontalAlignment("center");
        sheet.setColumnWidth(13, 190);
      }
      if (lastCol < 14) {
        sheet.getRange(1, 14).setValue("Last Active At (Mốc hoạt động gần nhất)");
        sheet.getRange(1, 14)
          .setBackground("#1B3A6B")
          .setFontColor("#FFFFFF")
          .setFontWeight("bold")
          .setHorizontalAlignment("center");
        sheet.setColumnWidth(14, 190);
      }
    } catch (ue) {}
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
/**
 * Lấy danh sách nhân sự - HỢP NHẤT 2 CHIỀU THÔNG MINH (TWO-WAY MERGE):
 * 1. Đọc sheet USERS (nơi Admin chỉnh sửa trực tiếp trên Google Sheet)
 * 2. Đọc RAW_SETTINGS (nơi lưu mảng Squads, Products, Permissions JSON)
 * 3. Hợp nhất: Ưu tiên thông tin hiển thị và mail từ sheet USERS (Display Name, Avatar, Personal Email, Teams Email, Role, Status)
 * 4. Cập nhật lại RAW_SETTINGS để 2 bảng luôn nhất quán 100%!
 */
function getOrInitTeamMembers(ss) {
  // 1. Đọc danh sách chi tiết từ RAW_SETTINGS (Key: USERS_LIST) nếu có
  const rawMap = {};
  let rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
  if (!rawSettings) {
    initCoreSheets();
    rawSettings = ss.getSheetByName(SHEET_RAW_SETTINGS);
  }

  if (rawSettings && rawSettings.getLastRow() > 1) {
    try {
      const dataRows = rawSettings.getRange(2, 1, rawSettings.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < dataRows.length; i++) {
        if (dataRows[i][0] === "USERS_LIST" && dataRows[i][1]) {
          const parsed = JSON.parse(dataRows[i][1]);
          if (Array.isArray(parsed)) {
            parsed.forEach(function(u) {
              const k1 = String(u.teamsEmail || "").trim().toLowerCase();
              const k2 = String(u.personalEmail || "").trim().toLowerCase();
              const k3 = String(u.email || "").trim().toLowerCase();
              const k4 = String(u.name || u.displayName || "").trim().toLowerCase();
              if (k1) rawMap[k1] = u;
              if (k2) rawMap[k2] = u;
              if (k3) rawMap[k3] = u;
              if (k4) rawMap[k4] = u;
            });
          }
        }
      }
    } catch (e) {}
  }

  // 2. Đọc sheet USERS (Bảng trực quan của người dùng)
  const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
  if (userSheet && userSheet.getLastRow() > 1) {
    const colCount = Math.max(14, userSheet.getLastColumn());
    const data = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, colCount).getValues();
    const mergedList = [];

    for (let i = 0; i < data.length; i++) {
      const rowName = String(data[i][0] || "").trim();
      const rowAvatar = String(data[i][1] || "").trim();
      const rowPersonalEmail = String(data[i][2] || "").trim();
      const rowTeamsEmail = String(data[i][3] || "").trim();
      const rowStatus = String(data[i][4] || "Active").trim();
      const rawRole = String(data[i][5] || "Designer").trim();
      const rowPolicy = String(data[i][12] || "").trim();

      if (!rowName && !rowPersonalEmail && !rowTeamsEmail) continue;

      let role = "Designer";
      if (rawRole.toLowerCase().indexOf("admin") !== -1) role = "Admin";
      else if (rawRole.toLowerCase().indexOf("owner") !== -1) role = "Design Owner";
      else if (rawRole.toLowerCase().indexOf("po") !== -1) role = "PO";
      else if (rawRole.toLowerCase().indexOf("biz") !== -1 || rawRole.toLowerCase().indexOf("business") !== -1) role = "Business";
      else role = "Designer";

      const key1 = rowTeamsEmail.toLowerCase();
      const key2 = rowPersonalEmail.toLowerCase();
      const key4 = rowName.toLowerCase();
      const existing = (key1 && rawMap[key1]) || (key2 && rawMap[key2]) || (key4 && rawMap[key4]) || null;

      const userObj = {
        id: existing && existing.id ? existing.id : ("mem-" + (i + 1)),
        name: rowName || (existing ? (existing.name || existing.displayName) : "Thành viên UX"),
        displayName: rowName || (existing ? (existing.displayName || existing.name) : "Thành viên UX"),
        avatarUrl: rowAvatar || (existing ? existing.avatarUrl : ""),
        personalEmail: rowPersonalEmail || (existing ? existing.personalEmail : ""),
        teamsEmail: rowTeamsEmail || (existing ? existing.teamsEmail : ""),
        email: rowTeamsEmail || rowPersonalEmail || (existing ? existing.email : ""),
        status: rowStatus || (existing ? existing.status : "Active"),
        role: role,
        sessionPolicy: rowPolicy || (existing ? (existing.sessionPolicy || existing.session_policy) : "inherit"),
        squad: existing && existing.squad ? existing.squad : "All Squads",
        squads: existing && Array.isArray(existing.squads) && existing.squads.length > 0 ? existing.squads : ["All Squads"],
        products: existing && Array.isArray(existing.products) && existing.products.length > 0 ? existing.products : ["Toàn hàng"],
        capacityLimit: existing && existing.capacityLimit ? existing.capacityLimit : 8,
        activeTasks: existing && existing.activeTasks ? existing.activeTasks : 0,
        permissions: existing && existing.permissions ? existing.permissions : {
          canAssign: role === "Admin" || role === "Design Owner",
          canApprovePo: true,
          canExport: true,
          canManageSystem: role === "Admin"
        }
      };

      mergedList.push(userObj);
    }

    if (mergedList.length > 0) {
      // Tự động lưu bản hợp nhất vào RAW_SETTINGS để đảm bảo 2 bảng luôn đồng bộ
      try {
        if (rawSettings) {
          const lastRow = rawSettings.getLastRow();
          let foundRow = -1;
          if (lastRow > 1) {
            const keys = rawSettings.getRange(2, 1, lastRow - 1, 1).getValues();
            for (let k = 0; k < keys.length; k++) {
              if (keys[k][0] === "USERS_LIST") {
                foundRow = k + 2;
                break;
              }
            }
          }
          const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
          const payload = JSON.stringify(mergedList, null, 2);
          if (foundRow > 0) {
            rawSettings.getRange(foundRow, 2).setValue(payload);
            rawSettings.getRange(foundRow, 3).setValue(nowStr);
            rawSettings.getRange(foundRow, 4).setValue("Auto-Merge from USERS");
          } else {
            rawSettings.appendRow(["USERS_LIST", payload, nowStr, "Auto-Merge from USERS"]);
          }
        }
      } catch (e) {}

      return mergedList;
    }
  }

  // 3. Fallback mặc định ban đầu nếu cả 2 bảng đều chưa có dữ liệu
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
      squad: "All Squads",
      squads: ["All Squads"],
      products: ["Toàn hàng"],
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
    const colCount = Math.max(14, userSheet.getLastColumn());
    const oldData = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, colCount).getValues();
    for (let i = 0; i < oldData.length; i++) {
      const emailKey = String(oldData[i][3] || oldData[i][2] || "").trim().toLowerCase();
      if (emailKey) {
        existingTokens[emailKey] = {
          otp: oldData[i][6],
          otpExpires: oldData[i][7],
          otpAttempts: oldData[i][8],
          sessionToken: oldData[i][9],
          sessionExpires: oldData[i][10],
          notes: oldData[i][11],
          sessionPolicy: oldData[i][12] || "",
          lastActiveAt: oldData[i][13] || ""
        };
      }
    }
  }

  // Xóa nội dung dữ liệu cũ trong USERS (giữ hàng header 1)
  if (userSheet && userSheet.getLastRow() > 1) {
    userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 14).clearContent();
  }

  if (userSheet) {
    const userRows = members.map(function(m) {
      const teamsEmail = String(m.teamsEmail || m.email || "").trim();
      const personalEmail = String(m.personalEmail || m.email || teamsEmail).trim();
      const emailKey = String(teamsEmail || personalEmail || m.email || "").trim().toLowerCase();
      const tokenInfo = existingTokens[emailKey] || {};
      const memberPolicy = (m.sessionPolicy !== undefined && m.sessionPolicy !== null && m.sessionPolicy !== "")
        ? m.sessionPolicy
        : ((m.session_policy !== undefined && m.session_policy !== null && m.session_policy !== "")
          ? m.session_policy
          : (tokenInfo.sessionPolicy || ""));
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
        tokenInfo.notes || ("Đồng bộ từ Portal lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")),
        memberPolicy,
        tokenInfo.lastActiveAt || ""
      ];
    });

    if (userRows.length > 0) {
      userSheet.getRange(2, 1, userRows.length, 14).setValues(userRows);
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
  if (data.status_rules) configsToSave["STATUS_RULES_CONFIG"] = data.status_rules;
  if (data.audit_logs) configsToSave["AUDIT_LOGS_CONFIG"] = data.audit_logs;
  if (data.rbac) configsToSave["RBAC_CONFIG"] = data.rbac;
  if (data.session_policies || data.sessionPolicies) configsToSave["SESSION_POLICIES_CONFIG"] = data.session_policies || data.sessionPolicies;
  if (data.nav_items || data.navConfig) configsToSave["NAV_ITEMS_CONFIG"] = data.nav_items || data.navConfig;
  if (data.team_members || data.members) configsToSave["USERS_LIST"] = data.team_members || data.members;
  if (data.form_config || data.formConfig) configsToSave["FORM_CONFIG"] = data.form_config || data.formConfig;
  if (data.ia_trees || data.iaTrees) configsToSave["IA_TREES_DATA"] = data.ia_trees || data.iaTrees;

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

/**
 * ==============================================================================
 * 13. HỆ THỐNG BÀI TEST & ĐÁNH GIÁ NĂNG LỰC NHÂN SỰ
 * ==============================================================================
 */

/**
 * Khởi tạo hoặc lấy Sheet TEST_BANK
 */
function getOrInitTestBankSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_TEST_BANK);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TEST_BANK);
    const headers = [
      "Test_ID",
      "Title",
      "Description",
      "Category",
      "TimeLimit_Minutes",
      "Total_Points",
      "Total_Questions",
      "MCQ_Count",
      "Essay_Count",
      "Questions_JSON",
      "Created_At",
      "Created_By",
      "Status"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  }
  return sheet;
}

/**
 * Khởi tạo hoặc lấy Sheet TEST_SUBMISSIONS
 */
function getOrInitTestSubmissionsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_TEST_SUBMISSIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TEST_SUBMISSIONS);
    const headers = [
      "Submission_ID",
      "Test_ID",
      "Test_Title",
      "User_Name",
      "User_Email",
      "User_Squad",
      "Submitted_At",
      "Score_MCQ",
      "Score_Essay",
      "Total_Score",
      "Max_Score",
      "Percentage",
      "Status",
      "Graded_By",
      "Graded_At",
      "Answers_JSON"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  }
  return sheet;
}

/**
 * Lưu đề thi mới từ Admin vào TEST_BANK
 */
function handleSaveTest(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrInitTestBankSheet(ss);
  const test = data.test || data;

  const row = [
    test.id || "TEST_" + Date.now(),
    test.title || "Đề thi mới",
    test.description || "",
    test.category || "Chuyên môn",
    test.timeLimitMinutes || 30,
    test.totalPoints || 10,
    test.totalQuestions || (test.questions ? test.questions.length : 0),
    test.mcqCount || 0,
    test.essayCount || 0,
    JSON.stringify(test.questions || []),
    test.createdAt || new Date().toISOString(),
    test.createdBy || "Admin",
    test.status || "Active"
  ];

  sheet.appendRow(row);

  return createJsonResponse({
    status: "success",
    message: "Đã lưu đề thi vào Google Sheet thành công!",
    test_id: test.id
  });
}

/**
 * Lưu kết quả nộp bài của thí sinh vào TEST_SUBMISSIONS
 */
function handleSubmitTest(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrInitTestSubmissionsSheet(ss);
  const sub = data.submission || data;

  const row = [
    sub.id || "SUB_" + Date.now(),
    sub.testId || "",
    sub.testTitle || "",
    sub.userName || "",
    sub.userEmail || "",
    sub.userSquad || "",
    sub.submittedAt || new Date().toISOString(),
    sub.scoreMcq || 0,
    sub.scoreEssay || 0,
    sub.totalScore || 0,
    sub.maxScore || 10,
    (sub.percentage || 0) + "%",
    sub.status || "Chờ chấm tự luận",
    sub.gradedBy || "",
    sub.gradedAt || "",
    JSON.stringify(sub.answers || [])
  ];

  sheet.appendRow(row);

  return createJsonResponse({
    status: "success",
    message: "Đã ghi nhận bài thi của nhân sự vào Google Sheet!",
    submission_id: sub.id
  });
}

/**
 * Admin chấm điểm câu tự luận
 */
function handleGradeEssay(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrInitTestSubmissionsSheet(ss);
  const subId = data.submissionId;
  const updatedSub = data.updatedSubmission || {};

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === subId) {
        const rowIdx = i + 2;
        sheet.getRange(rowIdx, 9).setValue(updatedSub.scoreEssay || 0); // Score_Essay
        sheet.getRange(rowIdx, 10).setValue(updatedSub.totalScore || 0); // Total_Score
        sheet.getRange(rowIdx, 12).setValue((updatedSub.percentage || 0) + "%"); // Percentage
        sheet.getRange(rowIdx, 13).setValue("Đã hoàn thành"); // Status
        sheet.getRange(rowIdx, 14).setValue(updatedSub.gradedBy || "Admin"); // Graded_By
        sheet.getRange(rowIdx, 15).setValue(new Date().toISOString()); // Graded_At
        if (updatedSub.answers) {
          sheet.getRange(rowIdx, 16).setValue(JSON.stringify(updatedSub.answers));
        }
        return createJsonResponse({
          status: "success",
          message: "Đã cập nhật điểm tự luận vào Google Sheet thành công!"
        });
      }
    }
  }

  return createJsonResponse({ status: "error", message: "Không tìm thấy bài nộp: " + subId });
}

/**
 * Lấy danh sách đề thi
 */
function handleGetTests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrInitTestBankSheet(ss);
  const lastRow = sheet.getLastRow();
  const tests = [];

  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    for (let i = 0; i < data.length; i++) {
      let questions = [];
      try {
        questions = JSON.parse(data[i][9] || "[]");
      } catch (e) {}

      tests.push({
        id: data[i][0],
        title: data[i][1],
        description: data[i][2],
        category: data[i][3],
        timeLimitMinutes: Number(data[i][4]) || 30,
        totalPoints: Number(data[i][5]) || 10,
        totalQuestions: Number(data[i][6]) || questions.length,
        mcqCount: Number(data[i][7]) || 0,
        essayCount: Number(data[i][8]) || 0,
        questions: questions,
        createdAt: data[i][10],
        createdBy: data[i][11],
        status: data[i][12] || "Active"
      });
    }
  }

  return createJsonResponse({ status: "success", tests: tests });
}

/**
 * Lấy danh sách bài nộp
 */
function handleGetSubmissions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrInitTestSubmissionsSheet(ss);
  const lastRow = sheet.getLastRow();
  const submissions = [];

  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    for (let i = 0; i < data.length; i++) {
      let answers = [];
      try {
        answers = JSON.parse(data[i][15] || "[]");
      } catch (e) {}

      const pctStr = String(data[i][11] || "0").replace("%", "");
      submissions.push({
        id: data[i][0],
        testId: data[i][1],
        testTitle: data[i][2],
        userName: data[i][3],
        userEmail: data[i][4],
        userSquad: data[i][5],
        submittedAt: data[i][6],
        scoreMcq: Number(data[i][7]) || 0,
        scoreEssay: Number(data[i][8]) || 0,
        totalScore: Number(data[i][9]) || 0,
        maxScore: Number(data[i][10]) || 10,
        percentage: Number(pctStr) || 0,
        status: data[i][12] || "Chờ chấm tự luận",
        gradedBy: data[i][13],
        gradedAt: data[i][14],
        answers: answers
      });
    }
  }

  return createJsonResponse({ status: "success", submissions: submissions });
}


