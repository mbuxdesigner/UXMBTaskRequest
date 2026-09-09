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
