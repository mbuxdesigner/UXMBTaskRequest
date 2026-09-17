import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Viết hoa chữ cái đầu tiên của chuỗi (hỗ trợ đầy đủ bảng mã tiếng Việt Unicode).
 * Tự động chuẩn hóa hiển thị tiêu đề và nội dung task nếu người dùng nhập chữ thường.
 */
export function capitalizeFirstLetter(str?: string): string {
  if (!str) return ""
  const trimmed = str.trim()
  if (!trimmed) return ""
  const match = trimmed.match(/^([^a-zA-Z\u00C0-\u1EF9]*)([a-zA-Z\u00C0-\u1EF9])(.*)$/u)
  if (match) {
    return match[1] + match[2].toUpperCase() + match[3]
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Viết hoa chữ cái đầu cho từng dòng / đoạn văn bản
 */
export function capitalizeSentences(text?: string): string {
  if (!text) return ""
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      return capitalizeFirstLetter(trimmed)
    })
    .join("\n")
}

/**
 * Tách họ tên tiếng Việt thành { firstName: string, middleAndLastName: string }
 * - firstName (Tên chính): từ cuối cùng trong chuỗi họ tên.
 * - middleAndLastName (Họ và tên đệm): phần còn lại phía trước.
 *
 * Ví dụ:
 * - "Cường" -> firstName: "Cường", middleAndLastName: ""
 * - "Anh Thị Cường" -> firstName: "Cường", middleAndLastName: "Anh Thị"
 * - "Đỗ Minh Huyền" -> firstName: "Huyền", middleAndLastName: "Đỗ Minh"
 */
export function parseVietnameseName(fullName?: string): { firstName: string; middleAndLastName: string } {
  if (!fullName) return { firstName: "", middleAndLastName: "" }
  const clean = fullName.trim().replace(/\s+/g, " ")
  if (!clean) return { firstName: "", middleAndLastName: "" }

  const parts = clean.split(" ")
  if (parts.length === 1) {
    return { firstName: parts[0], middleAndLastName: "" }
  }
  const firstName = parts[parts.length - 1]
  const middleAndLastName = parts.slice(0, -1).join(" ")
  return { firstName, middleAndLastName }
}

/**
 * So sánh 2 họ tên theo chuẩn tiếng Việt từ A -> Z:
 * 1. Ưu tiên so sánh theo TÊN CHÍNH (từ cuối cùng).
 * 2. Nếu trùng Tên chính: người chỉ có tên ngắn gọn (không có họ đệm, ví dụ "Cường")
 *    được xếp trước người có đầy đủ họ đệm (ví dụ "Anh Thị Cường").
 * 3. Nếu cùng có họ đệm hoặc cùng không có: so sánh tiếp họ đệm theo A -> Z.
 */
export function compareVietnameseNames(nameA?: string, nameB?: string): number {
  const parsedA = parseVietnameseName(nameA)
  const parsedB = parseVietnameseName(nameB)

  // 1. So sánh theo Tên chính
  const cmpFirst = parsedA.firstName.localeCompare(parsedB.firstName, "vi", { sensitivity: "base" })
  if (cmpFirst !== 0) return cmpFirst

  // 2. Trùng tên chính: ưu tiên người không có họ đệm lên trước
  if (!parsedA.middleAndLastName && parsedB.middleAndLastName) return -1
  if (parsedA.middleAndLastName && !parsedB.middleAndLastName) return 1

  // 3. So sánh phần họ đệm
  return parsedA.middleAndLastName.localeCompare(parsedB.middleAndLastName, "vi", { sensitivity: "base" })
}

/**
 * Helper sắp xếp danh sách đối tượng chứa tên theo tiếng Việt A -> Z
 */
export function sortMembersByVietnameseName<T>(
  list: T[],
  getName: (item: T) => string | undefined = (item: any) =>
    typeof item === "string" ? item : item?.name || item?.displayName || item?.assigned_designer || String(item || "")
): T[] {
  return [...list].sort((a, b) => compareVietnameseNames(getName(a), getName(b)))
}
