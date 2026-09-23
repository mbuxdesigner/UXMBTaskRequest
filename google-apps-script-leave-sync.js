/**
 * ==============================================================================
 * MODULE GOOGLE APPS SCRIPT: ĐỒNG BỘ LỊCH NGHỈ PHÉP NHÂN SỰ UXMB (TEAM LEAVES SYNC)
 * ==============================================================================
 * 
 * Nguồn dữ liệu Google Sheet ngoài:
 * - URL: https://docs.google.com/spreadsheets/d/1oeDjaIMIuDsG2bDG2HT8euLICVXxQvWpf-2jfDr3Vlg/edit?gid=917777763
 * - Spreadsheet ID: 1oeDjaIMIuDsG2bDG2HT8euLICVXxQvWpf-2jfDr3Vlg
 * - GID Tab: 917777763
 * 
 * Quy tắc bóc tách dữ liệu 4 cột:
 * - Cột C (Index 2): Ngày nghỉ (Định dạng DD/MM/YYYY)
 * - Cột D (Index 3): Ghi chú (Ca nghỉ: Nghỉ nguyên ngày, Nghỉ nửa ngày sáng/chiều)
 * - Cột E (Index 4): Lý do xin nghỉ
 * - Cột G (Index 6): Mail MB (Khóa định danh nhân sự @mbbank.com.vn)
 * -> ĐIỀU KIỆN TIÊN QUYẾT: Cột G trống => TỰ ĐỘNG BỎ QUA (Không lấy vào hệ thống)
 * 
 * Kiến trúc 1 API duy nhất (Unified Operational API):
 * - action=get_team_leaves: Lấy riêng danh sách lịch nghỉ
 * - action=get_all_operational_data: Lấy trọn gói 1 API duy nhất (Tasks + Users + Leaves + Holidays)
 * ==============================================================================
 */

// Cấu hình Spreadsheet Lịch nghỉ ngoài
const LEAVE_SHEET_CONFIG = {
  SPREADSHEET_ID: "1oeDjaIMIuDsG2bDG2HT8euLICVXxQvWpf-2jfDr3Vlg",
  SHEET_GID: "917777763",
  CACHE_KEY: "UXMB_CACHED_TEAM_LEAVES_DATA_V1",
  CACHE_TTL_SECONDS: 300 // Lưu cache 5 phút để phản hồi siêu tốc
};

/**
 * Hàm lấy danh sách lịch nghỉ đã chuẩn hóa và làm sạch
 * Hỗ trợ 2 lớp an toàn (Dual-Tier Resilience):
 * 1. Mở trực tiếp qua SpreadsheetApp.openById
 * 2. Fallback tự động qua UrlFetchApp (Google Visualization CSV endpoint) nếu chưa cấp quyền mở file
 * 
 * @param {boolean} forceRefresh - Bỏ qua cache để đọc dữ liệu mới nhất
 * @returns {Array<Object>} Mảng danh sách các bản ghi nghỉ hợp lệ
 */
function fetchTeamLeavesData(forceRefresh) {
  try {
    const cache = CacheService.getScriptCache();
    if (!forceRefresh) {
      const cached = cache.get(LEAVE_SHEET_CONFIG.CACHE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          // Cache hỏng -> tiếp tục đọc tươi
        }
      }
    }

    let rows = [];

    // LỚP 1: Thử mở trực tiếp qua SpreadsheetApp
    try {
      const ss = SpreadsheetApp.openById(LEAVE_SHEET_CONFIG.SPREADSHEET_ID);
      const sheets = ss.getSheets();
      let targetSheet = null;

      for (let i = 0; i < sheets.length; i++) {
        if (sheets[i].getSheetId().toString() === LEAVE_SHEET_CONFIG.SHEET_GID.toString()) {
          targetSheet = sheets[i];
          break;
        }
      }

      if (!targetSheet && sheets.length > 0) {
        targetSheet = sheets[0];
      }

      if (targetSheet) {
        const values = targetSheet.getDataRange().getValues();
        if (values && values.length > 1) {
          rows = values.slice(1); // Bỏ dòng header
        }
      }
    } catch (errOpen) {
      Logger.log("Không thể mở trực tiếp SpreadsheetApp, chuyển sang lớp Fallback UrlFetchApp: " + errOpen);
    }

    // LỚP 2: Fallback qua UrlFetchApp Google Visualization CSV
    if (!rows || rows.length === 0) {
      const exportUrl = "https://docs.google.com/spreadsheets/d/" + 
        LEAVE_SHEET_CONFIG.SPREADSHEET_ID + 
        "/gviz/tq?tqx=out:csv&gid=" + 
        LEAVE_SHEET_CONFIG.SHEET_GID;

      const response = UrlFetchApp.fetch(exportUrl, {
        muteHttpExceptions: true,
        headers: { "Accept": "text/csv; charset=UTF-8" }
      });

      if (response.getResponseCode() === 200) {
        const csvContent = response.getContentText("UTF-8");
        rows = parseCsvDataRows(csvContent);
      } else {
        Logger.log("UrlFetchApp thất bại với mã phản hồi: " + response.getResponseCode());
      }
    }

    // XỬ LÝ & BÓC TÁCH 4 CỘT: C, D, E, G
    const cleanLeaves = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;

      // Cột C (Index 2): Ngày nghỉ
      let dateRaw = String(row[2] || "").trim();
      // Nếu là đối tượng Date từ Google Sheets
      if (row[2] instanceof Date) {
        dateRaw = Utilities.formatDate(row[2], "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
      }

      // Cột D (Index 3): Ghi chú (Ca nghỉ)
      const leaveTypeRaw = String(row[3] || "").trim();

      // Cột E (Index 4): Lý do nghỉ
      const reason = String(row[4] || "").trim();

      // Cột F (Index 5): Tên nhân sự
      const userName = String(row[5] || "").trim();

      // Cột G (Index 6): Mail MB
      let emailMbRaw = String(row[6] || "").trim().toLowerCase();

      // QUY TẮC BẮT BUỘC: Cột G trống -> BỎ QUA HOÀN TOÀN!
      if (!emailMbRaw) {
        continue;
      }

      // Xử lý tách nếu dính nhiều email trên 1 dòng
      const emails = emailMbRaw.match(/[a-zA-Z0-9._%+-]+@mbbank\.com\.vn/g) || [emailMbRaw];

      for (let j = 0; j < emails.length; j++) {
        const email = emails[j];

        // Chuẩn hóa loại ca nghỉ
        let leaveType = "full_day";
        const lowerType = leaveTypeRaw.toLowerCase();
        if (lowerType.indexOf("sáng") !== -1) {
          leaveType = "morning";
        } else if (lowerType.indexOf("chiều") !== -1) {
          leaveType = "afternoon";
        } else if (lowerType.indexOf("nửa ngày") !== -1) {
          leaveType = "half_day";
        }

        // Chuyển sang định dạng chuẩn ISO YYYY-MM-DD
        let isoDate = "";
        const parts = dateRaw.split("/");
        if (parts.length === 3) {
          isoDate = parts[2] + "-" + 
            (parts[1].length < 2 ? "0" + parts[1] : parts[1]) + "-" + 
            (parts[0].length < 2 ? "0" + parts[0] : parts[0]);
        }

        const usernamePrefix = email.split("@")[0];
        const recordId = "LEAVE_" + (isoDate || dateRaw).replace(/[^0-9]/g, "") + "_" + usernamePrefix;

        cleanLeaves.push({
          id: recordId,
          date: dateRaw,
          iso_date: isoDate,
          leave_type: leaveType,
          leave_type_raw: leaveTypeRaw,
          reason: reason,
          user_name: userName,
          email: email,
          synced_at: new Date().toISOString()
        });
      }
    }

    // Ghi cache 5 phút
    try {
      cache.put(LEAVE_SHEET_CONFIG.CACHE_KEY, JSON.stringify(cleanLeaves), LEAVE_SHEET_CONFIG.CACHE_TTL_SECONDS);
    } catch (errCache) {
      Logger.log("Không thể lưu cache: " + errCache);
    }

    return cleanLeaves;
  } catch (error) {
    Logger.log("Lỗi fetchTeamLeavesData: " + error);
    return [];
  }
}

/**
 * Trình phân tích cú pháp CSV an toàn hỗ trợ escape quotes và ngắt dòng
 */
function parseCsvDataRows(csvText) {
  const lines = csvText.split(/\r?\n/);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) { // Bỏ qua dòng 0 là Header
    const line = lines[i].trim();
    if (!line) continue;

    const row = [];
    let cur = "";
    let inQuotes = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        if (inQuotes && line[c + 1] === '"') {
          cur += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(cur.replace(/^"|"$/g, "").trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    row.push(cur.replace(/^"|"$/g, "").trim());
    rows.push(row);
  }
  return rows;
}

/**
 * API HỢP NHẤT: Trả về toàn bộ dữ liệu vận hành (1 API DUY NHẤT)
 * Gồm:
 * 1. requests: Toàn bộ danh sách bài toán & deadline
 * 2. members: Danh sách nhân sự UX team
 * 3. leaves: Danh sách lịch nghỉ từ Sheet ngoài (đã lọc Cột G)
 * 4. master_data: Cấu hình hệ thống (SLA, Squads, Products)
 */
function handleGetUnifiedOperationalData(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Lấy bài toán (nếu hàm getAllRequestsFromSheet tồn tại)
    let requests = [];
    if (typeof getAllRequestsFromSheet === "function") {
      requests = getAllRequestsFromSheet();
    }

    // 2. Lấy danh sách nhân sự
    let members = [];
    if (typeof getOrInitTeamMembers === "function") {
      members = getOrInitTeamMembers(ss);
    }

    // 3. Lấy lịch nghỉ phép từ Sheet ngoài (Cột C, D, E, G)
    const leaves = fetchTeamLeavesData(false);

    // 4. Lấy master data cấu hình
    let masterData = null;
    let rawSettings = ss.getSheetByName("RAW_SETTINGS");
    if (rawSettings && typeof readMasterDataFromSettingsSheet === "function") {
      masterData = readMasterDataFromSettingsSheet(rawSettings);
    }

    return createJsonResponse({
      status: "success",
      total_requests: requests.length,
      total_members: members.length,
      total_leaves: leaves.length,
      requests: requests,
      members: members,
      leaves: leaves,
      master_data: masterData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: "Lỗi handleGetUnifiedOperationalData: " + error.toString()
    });
  }
}

/**
 * Hàm Router tích hợp vào doGet chính
 */
function routeLeaveSyncDoGet(action, e) {
  if (action === "get_team_leaves" || action === "get_leaves") {
    const forceRefresh = Boolean(e && e.parameter && e.parameter.refresh === "true");
    const leaves = fetchTeamLeavesData(forceRefresh);
    return createJsonResponse({
      status: "success",
      total: leaves.length,
      leaves: leaves,
      timestamp: new Date().toISOString()
    });
  }

  if (action === "get_all_operational_data" || action === "get_planner_data") {
    return handleGetUnifiedOperationalData(e);
  }

  return null; // Trả về null để router chính tiếp tục xử lý các action khác
}
