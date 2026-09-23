import type { UserLeaveRecord, UnifiedOperationalData } from "../types/leave.ts";
import { getGoogleSheetConfig } from "../config/googleSheetConfig.ts";

const LEAVE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1oeDjaIMIuDsG2bDG2HT8euLICVXxQvWpf-2jfDr3Vlg/gviz/tq?tqx=out:csv&gid=917777763";
const LEAVES_CACHE_KEY = "uxmb_cached_team_leaves";
const LEAVES_CACHE_TIME_KEY = "uxmb_cached_team_leaves_time";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 phút cache

let cachedLeavesMemory: UserLeaveRecord[] | null = null;
let inflightLeavesPromise: Promise<UserLeaveRecord[]> | null = null;

/**
 * Phân tích cú pháp CSV dòng dữ liệu an toàn
 */
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Chuyển đổi CSV thô từ Google Sheet thành danh sách UserLeaveRecord
 * Tuân thủ quy tắc: Bóc tách C, D, E, G. Cột G trống => Bỏ qua!
 */
export function parseRawLeaveCsv(csvText: string): UserLeaveRecord[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const leaves: UserLeaveRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dateStr = (cols[2] || '').replace(/^"|"$/g, '').trim();
    const leaveTypeRaw = (cols[3] || '').replace(/^"|"$/g, '').trim();
    const reason = (cols[4] || '').replace(/^"|"$/g, '').trim();
    const userName = (cols[5] || '').replace(/^"|"$/g, '').trim();
    const emailMb = (cols[6] || '').replace(/^"|"$/g, '').trim().toLowerCase();

    // QUY TẮC BẮT BUỘC: Cột G trống => BỎ QUA HOÀN TOÀN!
    if (!emailMb) continue;

    // Tách nếu dính nhiều email trên 1 ô
    const emailMatches = emailMb.match(/[a-zA-Z0-9._%+-]+@mbbank\.com\.vn/g) || [emailMb];

    for (const email of emailMatches) {
      let leaveType: UserLeaveRecord['leave_type'] = 'full_day';
      const lowerType = leaveTypeRaw.toLowerCase();
      if (lowerType.includes('sáng')) {
        leaveType = 'morning';
      } else if (lowerType.includes('chiều')) {
        leaveType = 'afternoon';
      } else if (lowerType.includes('nửa ngày')) {
        leaveType = 'half_day';
      }

      let isoDate = '';
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }

      const id = `LEAVE_${(isoDate || dateStr).replace(/[^0-9]/g, '')}_${email.split('@')[0]}`;

      leaves.push({
        id,
        date: dateStr,
        iso_date: isoDate,
        leave_type: leaveType,
        leave_type_raw: leaveTypeRaw,
        reason,
        user_name: userName,
        email,
        synced_at: new Date().toISOString(),
      });
    }
  }

  return leaves;
}

/**
 * 1 API DUY NHẤT: Lấy danh sách lịch nghỉ phép nhân sự (Team Leaves)
 * Phương án 1: Gọi qua Google Apps Script Web App (`action=get_team_leaves` hoặc `get_all_operational_data`)
 * Phương án 2: Fallback trực tiếp qua Google Sheets CSV công khai nếu chưa setup backend GAS URL
 */
export async function fetchTeamLeaves(forceRefresh = false): Promise<UserLeaveRecord[]> {
  if (!forceRefresh && cachedLeavesMemory && cachedLeavesMemory.length > 0) {
    return cachedLeavesMemory;
  }

  if (inflightLeavesPromise) {
    return inflightLeavesPromise;
  }

  inflightLeavesPromise = (async () => {
    // 1. Đọc từ LocalStorage nếu chưa hết hạn
    if (!forceRefresh && typeof window !== "undefined") {
      try {
        const savedTime = localStorage.getItem(LEAVES_CACHE_TIME_KEY);
        const savedData = localStorage.getItem(LEAVES_CACHE_KEY);
        if (savedTime && savedData && Date.now() - Number(savedTime) < CACHE_EXPIRY_MS) {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedLeavesMemory = parsed;
            return parsed;
          }
        }
      } catch {}
    }

    const config = getGoogleSheetConfig();

    // 2. Thử gọi qua Google Apps Script Web App URL nếu đã cấu hình
    if (config?.webAppUrl && config.webAppUrl.startsWith("http")) {
      try {
        const url = `${config.webAppUrl}?action=get_team_leaves${forceRefresh ? "&refresh=true" : ""}`;
        const res = await fetch(url, { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && Array.isArray(json.leaves)) {
            cachedLeavesMemory = json.leaves;
            saveLeavesToLocalStorage(json.leaves);
            return json.leaves;
          }
        }
      } catch (err) {
        console.warn("[LeaveService] GAS endpoint không phản hồi, chuyển sang fallback direct sheet:", err);
      }
    }

    // 3. Fallback trực tiếp qua Google Visualization CSV Endpoint
    try {
      const res = await fetch(LEAVE_SHEET_CSV_URL, { method: "GET" });
      if (res.ok) {
        const csv = await res.text();
        const leaves = parseRawLeaveCsv(csv);
        cachedLeavesMemory = leaves;
        saveLeavesToLocalStorage(leaves);
        return leaves;
      }
    } catch (errDirect) {
      console.error("[LeaveService] Fallback direct fetch lỗi:", errDirect);
    }

    return cachedLeavesMemory || [];
  })().finally(() => {
    inflightLeavesPromise = null;
  });

  return inflightLeavesPromise;
}

/**
 * 1 API DUY NHẤT TOÀN DIỆN: Lấy toàn bộ dữ liệu vận hành (Tasks + Members + Leaves + MasterData)
 */
export async function fetchAllOperationalData(): Promise<UnifiedOperationalData | null> {
  const config = getGoogleSheetConfig();
  if (!config?.webAppUrl || !config.webAppUrl.startsWith("http")) {
    return null;
  }

  try {
    const url = `${config.webAppUrl}?action=get_all_operational_data`;
    const res = await fetch(url, { method: "GET" });
    if (res.ok) {
      const data: UnifiedOperationalData = await res.json();
      if (data.status === "success") {
        if (Array.isArray(data.leaves)) {
          cachedLeavesMemory = data.leaves;
          saveLeavesToLocalStorage(data.leaves);
        }
        return data;
      }
    }
  } catch (err) {
    console.error("[LeaveService] Lỗi fetchAllOperationalData:", err);
  }
  return null;
}

/**
 * Tiện ích: Lọc danh sách nhân sự nghỉ hôm nay (Who's off today)
 */
export function getMembersOffToday(leaves: UserLeaveRecord[], targetDate?: Date): UserLeaveRecord[] {
  const d = targetDate || new Date();
  const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return leaves.filter((item) => item.iso_date === todayIso);
}

function saveLeavesToLocalStorage(data: UserLeaveRecord[]) {
  try {
    localStorage.setItem(LEAVES_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(LEAVES_CACHE_TIME_KEY, String(Date.now()));
  } catch {}
}
