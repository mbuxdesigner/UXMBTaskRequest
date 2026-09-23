import { test, expect } from "vitest";

function parseCSVLine(text) {
  const result = [];
  let cur = "";
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
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseRawLeaveCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const leaves = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dateStr = (cols[2] || "").replace(/^"|"$/g, "").trim();
    const leaveTypeRaw = (cols[3] || "").replace(/^"|"$/g, "").trim();
    const reason = (cols[4] || "").replace(/^"|"$/g, "").trim();
    const userName = (cols[5] || "").replace(/^"|"$/g, "").trim();
    const emailMb = (cols[6] || "").replace(/^"|"$/g, "").trim().toLowerCase();

    // QUY TẮC: Cột G trống => BỎ QUA
    if (!emailMb) continue;

    const emailMatches = emailMb.match(/[a-zA-Z0-9._%+-]+@mbbank\.com\.vn/g) || [emailMb];

    for (const email of emailMatches) {
      let leaveType = "full_day";
      const lowerType = leaveTypeRaw.toLowerCase();
      if (lowerType.includes("sáng")) {
        leaveType = "morning";
      } else if (lowerType.includes("chiều")) {
        leaveType = "afternoon";
      } else if (lowerType.includes("nửa ngày")) {
        leaveType = "half_day";
      }

      let isoDate = "";
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }

      const id = `LEAVE_${(isoDate || dateStr).replace(/[^0-9]/g, "")}_${email.split("@")[0]}`;

      leaves.push({
        id,
        date: dateStr,
        iso_date: isoDate,
        leave_type: leaveType,
        leave_type_raw: leaveTypeRaw,
        reason,
        user_name: userName,
        email,
      });
    }
  }

  return leaves;
}

test("Leave Parser: Bỏ qua dòng Cột G trống và trích xuất đúng 4 cột C, D, E, G", () => {
  const sampleCsv = `
"Dấu thời gian","Mail checkin","Ngày nghỉ","Ghi chú","Lý do nghỉ","Tên","Mail MB"
"13/05/2026","test@gmail.com","15/05/2026","Nghỉ nửa ngày (sáng)","Việc cá nhân","Nguyễn Hà",""
"07/05/2026","maianh@gmail.com","07/05/2026","Nghỉ nửa ngày (chiều)","Xử lý giấy tờ","Phan Thị Mai Anh","anhptm7@mbbank.com.vn"
"26/05/2026","cuong@gmail.com","26/05/2026","Nghỉ nguyên ngày","Việc riêng","Dương Mạnh Cường","cuongdm5@mbbank.com.vn"
`.trim();

  const leaves = parseRawLeaveCsv(sampleCsv);

  expect(leaves.length).toBe(2); // Dòng 1 bị bỏ qua vì Cột G trống

  expect(leaves[0].date).toBe("07/05/2026");
  expect(leaves[0].iso_date).toBe("2026-05-07");
  expect(leaves[0].leave_type).toBe("afternoon");
  expect(leaves[0].email).toBe("anhptm7@mbbank.com.vn");

  expect(leaves[1].date).toBe("26/05/2026");
  expect(leaves[1].iso_date).toBe("2026-05-26");
  expect(leaves[1].leave_type).toBe("full_day");
  expect(leaves[1].email).toBe("cuongdm5@mbbank.com.vn");
});
