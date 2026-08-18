/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT BACKEND FOR UX REQUEST PORTAL (ULTRA-FAST VERSION)
 * ==============================================================================
 * 
 * ĐẶC ĐIỂM NÂNG CẤP:
 * 1. TỐI ƯU TỐC ĐỘ: Khi gửi form, server chỉ ghi duy nhất chuỗi [RAW JSON PAYLOAD]
 *    giúp thời gian gửi cực nhanh và nhẹ.
 * 2. HÀM TÁCH RIÊNG: Có sẵn hàm `parseJsonToDetailSheet()` và Menu trên Google Sheet
 *    để bóc tách JSON ra từng cột chi tiết bất kỳ khi nào bạn cần mà không làm chậm web.
 * ==============================================================================
 */

const SHEET_SELECTIONS_NAME = "Selections";
const SHEET_LOGS_NAME = "Requests_Log";
const SHEET_DETAIL_NAME = "Requests_Detail";

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
    .addItem("📊 Tách dữ liệu JSON ra bảng chi tiết (Requests_Detail)", "parseJsonToDetailSheet")
    .addToUi();
}

/**
 * Handle GET requests - return selections or ping status
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "get_selections";
    
    if (action === "ping") {
      return createJsonResponse({
        status: "success",
        message: "Kết nối Google Sheet thành công!",
        sheet_name: SpreadsheetApp.getActiveSpreadsheet().getName(),
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

    return createJsonResponse({ status: "error", message: "Unknown action: " + action });
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Handle POST requests - ULTRA FAST LOGGING (Chỉ ghi Thời gian, Request ID, RAW JSON)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let data;
    
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    const logSheet = getOrInitLogSheet(ss);
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    // Sinh mã Request ID chuẩn: UXMB-mã số
    const lastRow = logSheet.getLastRow();
    const seqNum = Math.max(lastRow, 1);
    const serverGeneratedId = "UXMB-" + ("000" + seqNum).slice(-3);
    const finalRequestId = (data.request_id && !data.request_id.includes("TMP") && !data.request_id.includes("PENDING"))
      ? data.request_id 
      : serverGeneratedId;

    // Gán Request ID chính thức vào JSON
    if (data.raw_data) {
      data.raw_data.request_id = finalRequestId;
    } else {
      data.request_id = finalRequestId;
    }
    const jsonPayloadString = JSON.stringify(data.raw_data || data, null, 2);

    // GHI CỰC NHANH: Chỉ ghi 3 cột tối giản
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
  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: "Lỗi ghi dữ liệu: " + error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * ==============================================================================
 * HÀM TÁCH RIÊNG: Bóc tách toàn bộ RAW JSON ra các cột chi tiết
 * Bạn có thể chạy hàm này từ Menu trên Sheet hoặc hẹn giờ Trigger chạy tự động!
 * ==============================================================================
 */
function parseJsonToDetailSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_LOGS_NAME);
  
  if (!logSheet) {
    SpreadApp.getUi().alert("Chưa có sheet " + SHEET_LOGS_NAME);
    return;
  }

  const lastRow = logSheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert("Chưa có dữ liệu nào trong " + SHEET_LOGS_NAME);
    return;
  }

  // Lấy hoặc tạo sheet Requests_Detail
  let detailSheet = ss.getSheetByName(SHEET_DETAIL_NAME);
  if (!detailSheet) {
    detailSheet = ss.insertSheet(SHEET_DETAIL_NAME, 1);
  } else {
    detailSheet.clear();
  }

  // Tiêu đề các cột chi tiết
  const headers = [
    "Thời gian gửi",
    "Mã Request ID",
    "Tiêu đề yêu cầu",
    "Sản phẩm / Phân hệ",
    "Loại yêu cầu",
    "Email MB người yêu cầu",
    "Squad phụ trách",
    "Hạn release dự kiến",
    "Lý do thời hạn",
    "Link tài liệu",
    "Mô tả yêu cầu",
    "Bối cảnh kinh doanh",
    "Vấn đề người dùng",
    "Đối tượng mục tiêu",
    "Output kỳ vọng"
  ];

  detailSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  detailSheet.getRange(1, 1, 1, headers.length)
    .setBackground("#1B3A6B")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  detailSheet.setFrozenRows(1);

  // Đọc dữ liệu từ log sheet
  const rawRows = logSheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const parsedRows = [];

  for (let i = 0; i < rawRows.length; i++) {
    const time = rawRows[i][0];
    const reqId = rawRows[i][1];
    const jsonStr = rawRows[i][2];

    let item = {};
    try {
      if (jsonStr) {
        item = JSON.parse(jsonStr);
      }
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
      item.release_date || item.expected_deadline || "",
      item.deadline_reason || "",
      item.doc_link || "",
      item.description || "",
      item.business_need || "",
      item.user_problem || "",
      item.target_user || "",
      Array.isArray(item.expected_output) ? item.expected_output.join(", ") : (item.expected_output || "")
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
 * Khởi tạo sheet Requests_Log (Chỉ 3 cột siêu gọn: Thời gian, Request ID, RAW JSON)
 */
function getOrInitLogSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_LOGS_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOGS_NAME, 0);
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
 * Helper to return JSON Response with CORS header support
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
