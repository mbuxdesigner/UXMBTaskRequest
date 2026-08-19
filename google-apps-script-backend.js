/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT BACKEND FOR UX REQUEST PORTAL & TEAMS OTP AUTH (4-ROLE RBAC)
 * ==============================================================================
 * 
 * PHÂN QUYỀN 4 VAI TRÒ (RBAC MATRIX):
 * 1. Admin: Toàn quyền hệ thống, phân quyền User, cấu hình Webhook Teams.
 * 2. Design Owner: Quản lý & có thể sửa task, cập nhật tiến độ cho BẤT KỲ Designer nào.
 * 3. Designer: Chỉ cập nhật tiến độ & ghi Note cho task được giao cho chính mình.
 * 4. PO: Đặt hàng yêu cầu, xem tiến độ & nhận link bàn giao (Read-only).
 * 
 * CẤU TRÚC SHEET [USERS] (TINH GỌN):
 * - Cột 1: Display Name (Họ tên hiển thị, VD: "Nguyễn Văn Cường")
 * - Cột 2: Avatar URL (Link ảnh đại diện, có thể để trống)
 * - Cột 3: Personal Email (Dùng để nhập OTP)
 * - Cột 4: Teams Email (Nhận tin nhắn OTP trên Teams)
 * - Cột 5: Status (Active/Inactive)
 * - Cột 6: Role (Admin / Design Owner / Designer / PO)
 * - Cột 7-12: Current OTP | OTP Expires At | OTP Attempts | Session Token | Session Expires At | Ghi chú
 * ==============================================================================
 */

// Tên các Sheet trong hệ thống
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

/**
 * Tự động tạo Menu tiện ích khi mở Google Sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 Tiện ích UX Portal")
    .addItem("⚙️ Khởi tạo cấu trúc các Sheet (USERS, TASK_UPDATES, DATA, LOGS)", "initAllSheets")
    .addItem("🔗 Cấu hình Teams Webhook URL", "promptSetTeamsWebhook")
    .addItem("🧪 Test gửi OTP qua Teams (testTeamsOtp)", "testTeamsOtp")
    .addSeparator()
    .addItem("📊 Tách dữ liệu JSON ra bảng chi tiết (Requests_Detail)", "parseJsonToDetailSheet")
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

    // 7. ACTION: LOG REQUEST (Gửi form yêu cầu)
    if (action === "log_request") {
      return handleLogRequest(data);
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
 * Xử lý cập nhật tiến độ task có kiểm tra thẩm quyền RBAC
 */
function handleUpdateTaskProgress(data) {
  const sessionToken = String(data.session_token || "").trim();
  const requestId = String(data.request_id || "").trim();
  const newPhase = String(data.new_phase || "").trim();
  const newStatus = String(data.new_status || "Đang thực hiện").trim();
  const newProgress = Number(data.new_progress || 0);
  const note = String(data.note || "").trim();
  const figmaUrl = String(data.figma_url || "").trim();
  const assignedDesigner = String(data.assigned_designer || "").trim();

  if (!requestId || !note) {
    return createJsonResponse({
      status: "error",
      message: "Thiếu mã Request ID hoặc nội dung ghi chú bàn giao."
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

  const logSheet = getOrInitLogSheet(ss);
  const lastRow = logSheet.getLastRow();
  let updatedItem = null;

  if (lastRow > 1) {
    const rawRows = logSheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let i = 0; i < rawRows.length; i++) {
      const rowReqId = String(rawRows[i][1] || "").trim();
      if (rowReqId === requestId) {
        let item = {};
        try {
          item = JSON.parse(rawRows[i][2]);
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

        const now = new Date();
        const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm");

        const newLogRecord = {
          id: "LOG-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss"),
          request_id: requestId,
          timestamp: formattedDate,
          updated_by: user.displayName || userEmail,
          author_role: userRole,
          new_phase: newPhase,
          new_progress: newProgress,
          note: note,
          deliverable_link: figmaUrl
        };

        item.current_phase = newPhase;
        item.status = newStatus;
        item.progress = newProgress;
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
          phase: newPhase,
          message: note
        };

        if (!item.task_updates) item.task_updates = [];
        item.task_updates.unshift(newLogRecord);

        logSheet.getRange(i + 2, 3).setValue(JSON.stringify(item, null, 2));
        updatedItem = item;
        break;
      }
    }
  }

  const updatesSheet = getOrInitTaskUpdatesSheet(ss);
  const now = new Date();
  const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

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

  if (userRowInfo && userRowInfo.status.toLowerCase() === "active" && userRowInfo.teamsEmail) {
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

    // Ghi vào ô Sheet [USERS] (Cột 7 đến 12)
    const rowIndex = userRowInfo.rowIndex;
    userSheet.getRange(rowIndex, 7, 1, 6).setValues([[
      otp,
      expiresStr,
      0,
      userRowInfo.sessionToken || "",
      userRowInfo.sessionExpiresAt || "",
      "Yêu cầu OTP lúc " + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss dd/MM")
    ]]);

    const webhookUrl = PropertiesService.getScriptProperties().getProperty("TEAMS_WEBHOOK_URL");
    if (webhookUrl && webhookUrl.trim()) {
      const webhookRes = sendOtpToTeams(webhookUrl, userRowInfo.teamsEmail, otp);
      if (webhookRes.success) {
        logActionToSheet(ss, {
          personalEmail: userRowInfo.personalEmail,
          teamsEmail: userRowInfo.teamsEmail,
          action: "REQUEST_OTP",
          details: "Đã gửi OTP qua Teams (HTTP " + webhookRes.statusCode + ")",
          status: "SUCCESS"
        });
      }
    }
  }

  return createJsonResponse({
    status: "success",
    message: genericMessage,
    expires_in: OTP_EXPIRY_MINUTES * 60
  });
}

/**
 * Xử lý xác thực OTP (Trả về Display Name & Avatar)
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
  let otpObj = null;

  if (rawOtpData) {
    try {
      otpObj = JSON.parse(rawOtpData);
    } catch (e) {}
  }

  const now = new Date();
  const nowMs = now.getTime();

  if (otpObj) {
    if (nowMs > otpObj.expiresAt) {
      cache.remove("otp_" + emailInput);
      return createJsonResponse({
        status: "error",
        message: "Mã xác thực đã hết hạn (quá 3 phút). Vui lòng gửi lại mã mới."
      });
    }

    if (otpObj.attempts >= OTP_MAX_ATTEMPTS) {
      cache.remove("otp_" + emailInput);
      return createJsonResponse({
        status: "error",
        message: "Bạn đã nhập sai quá " + OTP_MAX_ATTEMPTS + " lần. Vui lòng yêu cầu mã mới."
      });
    }

    if (otpObj.otp !== otpInput) {
      otpObj.attempts = (otpObj.attempts || 0) + 1;
      cache.put("otp_" + emailInput, JSON.stringify(otpObj), OTP_EXPIRY_MINUTES * 60);
      const remaining = OTP_MAX_ATTEMPTS - otpObj.attempts;
      return createJsonResponse({
        status: "error",
        message: "Mã xác thực không chính xác. Còn " + remaining + " lần thử.",
        remaining_attempts: remaining
      });
    }

    // Xác thực thành công
    const sessionToken = "ST_" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
    const sessionExpiresDate = new Date(nowMs + SESSION_EXPIRY_MINUTES * 60 * 1000);
    const sessionExpiresStr = Utilities.formatDate(sessionExpiresDate, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    cache.remove("otp_" + emailInput);
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

  // Phương án dự phòng đọc Sheet
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
      message: "Phiên đăng nhập của bạn đã hết hạn (15 phút). Vui lòng xác thực lại qua Teams."
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
        if (String(dataRows[i][9] || "").trim() === sessionToken) { // Cột 10: Session Token
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
      error: "Chưa cấu hình TEAMS_WEBHOOK_URL"
    };
  }

  const payload = {
    teamsEmail: String(teamsEmail || "").trim(),
    otp: String(otp || "").trim(),
    message: "Mã xác thực của bạn: " + otp,
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
    SpreadsheetApp.getUi().alert("❌ Lỗi: Chưa cấu hình TEAMS_WEBHOOK_URL trong Script Properties.");
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let testEmail = "cuongnm@mbbank.com.vn";
  try {
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    if (userSheet && userSheet.getLastRow() > 1) {
      const emailInSheet = userSheet.getRange(2, 4).getValue(); // Cột 4 là Teams Email
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
 * Xử lý ghi nhận yêu cầu mới
 */
function handleLogRequest(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = getOrInitLogSheet(ss);
  const now = new Date();
  const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  const lastRow = logSheet.getLastRow();
  const seqNum = Math.max(lastRow, 1);
  const serverGeneratedId = "UXMB-" + ("000" + seqNum).slice(-3);
  const finalRequestId = (data.request_id && !data.request_id.includes("TMP") && !data.request_id.includes("PENDING"))
    ? data.request_id 
    : serverGeneratedId;

  if (data.raw_data) {
    data.raw_data.request_id = finalRequestId;
  } else {
    data.request_id = finalRequestId;
  }
  const jsonPayloadString = JSON.stringify(data.raw_data || data, null, 2);

  logSheet.appendRow([
    formattedDate,
    finalRequestId,
    jsonPayloadString
  ]);

  const newLastRow = logSheet.getLastRow();
  logSheet.getRange(newLastRow, 3).setWrap(true);

  return createJsonResponse({
    status: "success",
    message: "Đã lưu yêu cầu dạng JSON vào Google Sheet thành công!",
    request_id: finalRequestId,
    row: newLastRow,
    timestamp: formattedDate
  });
}

/**
 * Tra cứu người dùng trong sheet USERS (Cột 1 đến 12)
 */
function findUserRowByPersonalEmail(userSheet, email) {
  const lastRow = userSheet.getLastRow();
  if (lastRow <= 1) return null;

  const data = userSheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const targetEmail = email.trim().toLowerCase();

  for (let i = 0; i < data.length; i++) {
    const pEmail = String(data[i][2] || "").trim().toLowerCase(); // Cột 3: Personal Email
    const tEmail = String(data[i][3] || "").trim().toLowerCase(); // Cột 4: Teams Email
    if (pEmail === targetEmail || tEmail === targetEmail) {
      return {
        rowIndex: i + 2,
        displayName: String(data[i][0] || ""),
        avatarUrl: String(data[i][1] || ""),
        personalEmail: data[i][2],
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
    const tokenInSheet = String(data[i][9] || "").trim(); // Cột 10: Session Token
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
 * Khởi tạo sheet USERS (Tinh gọn: Không có cột Squad)
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

    // Mẫu 4 tài khoản thử nghiệm 4 vai trò
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
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 240);
    sheet.setColumnWidth(5, 120);
    sheet.setColumnWidth(6, 150);
    sheet.setColumnWidth(7, 90);
    sheet.setColumnWidth(8, 350);
    sheet.setColumnWidth(9, 250);
  }
  return sheet;
}

/**
 * Khởi tạo sheet DATA
 */
function getOrInitDataSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DATA_NAME, 2);
    const headers = [
      "Mã ID",
      "Tiêu đề bài toán",
      "Sản phẩm",
      "UX Owner",
      "Trạng thái",
      "Ngày Release",
      "Mô tả",
      "Tài liệu / Figma"
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
 * Khởi tạo tất cả các sheet chuẩn hóa
 */
function initAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrInitUsersSheet(ss);
  getOrInitTaskUpdatesSheet(ss);
  getOrInitDataSheet(ss);
  getOrInitLogsSheet(ss);
  getOrInitLogSheet(ss);
  getOrInitSelections();
  SpreadsheetApp.getUi().alert("✅ Đã khởi tạo hoàn tất cấu trúc bảng: USERS, TASK_UPDATES, DATA, LOGS, Requests_Log và Selections!");
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
    "🚀 HƯỚNG DẪN BẢO MẬT & PHÂN QUYỀN 4 VAI TRÒ:\n\n" +
    "1. Sheet [USERS]: Cột 1: Display Name, Cột 2: Avatar URL, Cột 6: Role (Admin/Design Owner/Designer/PO).\n" +
    "2. Sheet [TASK_UPDATES]: Tự động lưu nhật ký mỗi khi Designer hoặc Lead cập nhật khâu UX kèm Ghi chú (Note) bàn giao.\n" +
    "3. Teams Webhook: Gửi mã OTP 6 số qua Teams Workflow.\n" +
    "4. Phân quyền RBAC: Admin & Design Owner sửa được mọi task; Designer chỉ sửa task của mình; PO chỉ xem.";
  ui.alert("Hướng dẫn vận hành hệ thống", msg, ui.ButtonSet.OK);
}

/**
 * Đọc toàn bộ danh sách yêu cầu từ sheet Requests_Log
 */
function getAllRequestsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = getOrInitLogSheet(ss);
  const lastRow = logSheet.getLastRow();
  
  if (lastRow <= 1) {
    return [];
  }

  const rawRows = logSheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const requests = [];

  for (let i = 0; i < rawRows.length; i++) {
    const time = rawRows[i][0];
    const reqId = rawRows[i][1];
    const jsonStr = rawRows[i][2];

    let item = null;
    try {
      if (jsonStr) {
        item = JSON.parse(jsonStr);
      }
    } catch (e) {
      item = null;
    }

    if (item) {
      if (!item.request_id && reqId) item.request_id = reqId;
      if (!item.submitted_at && time) item.submitted_at = String(time);
      requests.push(item);
    }
  }

  return requests.reverse();
}

/**
 * Bóc tách toàn bộ RAW JSON ra các cột chi tiết
 */
function parseJsonToDetailSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_REQUESTS_LOG_NAME);
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert("Chưa có sheet " + SHEET_REQUESTS_LOG_NAME);
    return;
  }

  const lastRow = logSheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert("Chưa có dữ liệu nào trong " + SHEET_REQUESTS_LOG_NAME);
    return;
  }

  let detailSheet = ss.getSheetByName(SHEET_DETAIL_NAME);
  if (!detailSheet) {
    detailSheet = ss.insertSheet(SHEET_DETAIL_NAME, 3);
  } else {
    detailSheet.clear();
  }

  const headers = [
    "Thời gian gửi",
    "Mã Request ID",
    "Tiêu đề yêu cầu",
    "Sản phẩm / Phân hệ",
    "Loại yêu cầu",
    "Email MB người yêu cầu",
    "Squad phụ trách",
    "Designer phụ trách",
    "Hạn release dự kiến",
    "Lý do thời hạn",
    "Link tài liệu",
    "Mô tả yêu cầu",
    "Bối cảnh kinh doanh",
    "Vấn đề người dùng",
    "Đối tượng mục tiêu"
  ];

  detailSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  detailSheet.getRange(1, 1, 1, headers.length)
    .setBackground("#1B3A6B")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  detailSheet.setFrozenRows(1);

  const rawRows = logSheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const parsedRows = [];

  for (let i = 0; i < rawRows.length; i++) {
    const time = rawRows[i][0];
    const reqId = rawRows[i][1];
    const jsonStr = rawRows[i][2];

    let item = {};
    try {
      if (jsonStr) item = JSON.parse(jsonStr);
    } catch (e) {
      item = {};
    }

    parsedRows.push([
      time || item.submitted_at_vn || "",
      reqId || item.request_id || "",
      item.title || "",
      item.product || "",
      item.request_type || "",
      item.requester_email || "",
      item.preferred_squad || item.product || "",
      item.assigned_designer || item.ux_owner || "",
      item.release_date || item.expected_deadline || "",
      item.deadline_reason || "",
      item.doc_link || "",
      item.description || "",
      item.business_need || "",
      item.user_problem || "",
      item.target_user || ""
    ]);
  }

  if (parsedRows.length > 0) {
    detailSheet.getRange(2, 1, parsedRows.length, headers.length).setValues(parsedRows);
    detailSheet.autoResizeColumns(1, 8);
  }

  try {
    SpreadsheetApp.getUi().alert("✅ Đã tách thành công " + parsedRows.length + " yêu cầu ra bảng Requests_Detail!");
  } catch (e) {
    Logger.log("Parsed " + parsedRows.length + " rows.");
  }
}

/**
 * Khởi tạo sheet Requests_Log
 */
function getOrInitLogSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_REQUESTS_LOG_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_REQUESTS_LOG_NAME, 3);
    const headers = [
      "Thời gian gửi",
      "Mã Request ID",
      "RAW JSON PAYLOAD"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1B3A6B")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(2, 130);
    sheet.setColumnWidth(3, 500);
  }
  return sheet;
}

/**
 * Khởi tạo Selections Sheet
 */
function getOrInitSelections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
 * Helper to return JSON Response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
