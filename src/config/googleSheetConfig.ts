// Configuration for Google Sheets Integration & Environment Detection

export const GATEWAY_PROXY_URL = "/api/gateway"

export interface GoogleSheetConfig {
  scriptUrl: string
  sheetId?: string
  autoSync: boolean
  lastSyncedAt?: string
  useGateway?: boolean
  gatewayUrl?: string
  fallbackScriptUrl?: string
}

export interface AppEnvironmentConfig {
  isProduction: boolean
  isPreview: boolean
  isLocal: boolean
  appEnv: "production" | "preview" | "development"
  scriptUrl: string
  sheetId: string
  enableDevOtpBypass: boolean
  useGateway: boolean
  gatewayUrl: string
  fallbackScriptUrl: string
}

export const PRODUCTION_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyz4_GK_guUx9L6uaRd4vK5jqJwG60eLr8Xju3j2hcEUianS8873cp4fJe8BBBrilKQ/exec"
export const PRODUCTION_SHEET_ID = "1gpe5W7whAMxIZLjsjVxEW23vcaa9ny0m9Qj327zKYzw"

// ==============================================================================
// CẤU HÌNH THƯ MỤC GOOGLE DRIVE LƯU TRỮ CHÍNH THỨC
// ==============================================================================
export const ROOT_DRIVE_FOLDER_ID = "1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g"
export const ROOT_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g?usp=sharing"

export interface DriveFolderInfo {
  name: string
  key: string
  desc: string
  iconName: string
}

export const DRIVE_STORAGE_STRUCTURE = {
  rootId: ROOT_DRIVE_FOLDER_ID,
  rootUrl: ROOT_DRIVE_FOLDER_URL,
  folders: {
    chatHistory: {
      name: "01_AI_Chat_History",
      key: "UX_AI_Chat_History",
      desc: "Lịch sử trò chuyện và context trao đổi giữa nhân sự với AI Copilot (.json)",
      iconName: "MessageSquare",
    },
    aiArtifacts: {
      name: "02_AI_Documents_Artifacts",
      key: "UX_AI_Artifacts",
      desc: "Tài liệu kỹ thuật, release notes, checklist và deliverables AI (.md, .pdf, .docx, .json)",
      iconName: "FileText",
    },
    eventPhotos: {
      name: "03_Event_Photos_Media",
      key: "UX_Planner_Event_Attachments",
      desc: "Hình ảnh sự kiện, bằng chứng thực hiện, media timeline từ Planner (.jpg, .png, .webp)",
      iconName: "Image",
    },
    taskAttachments: {
      name: "04_Task_Attachments",
      key: "UX_Portal_Attachments",
      desc: "Tài liệu đầu vào, brief, đặc tả và file đính kèm các bài toán UX (.pdf, .xlsx, .zip...)",
      iconName: "FolderOpen",
    },
    userAvatars: {
      name: "05_User_Avatars",
      key: "UX_Portal_Avatars",
      desc: "Ảnh đại diện nhân sự thuộc đội ngũ UX Team (.jpg, .png, .webp)",
      iconName: "User",
    },
  },
} as const

const STORAGE_KEY = "ux_portal_google_sheet_config"

/**
 * Detect runtime environment dynamically:
 * - Production: uxmb-task-request.vercel.app
 * - Preview: *.vercel.app (e.g. uxmb-task-request-git-develop-*.vercel.app, dev.uxmb-task-request.vercel.app)
 * - Development: localhost, 127.0.0.1, or local dev server
 */
export function getAppEnvironment(): AppEnvironmentConfig {
  let appEnv: "production" | "preview" | "development" = "production"

  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || ""
    if (
      hostname === "uxmb-task-request.vercel.app" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      appEnv = "production"
    } else if (
      hostname.endsWith(".vercel.app") ||
      hostname.includes("preview") ||
      hostname.includes("-git-")
    ) {
      appEnv = "preview"
    } else if (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_ENV) {
      const envVal = String(import.meta.env.VITE_APP_ENV).toLowerCase()
      if (envVal === "production" || envVal === "preview" || envVal === "development") {
        appEnv = envVal
      }
    }
  } else {
    // SSR / Node / Test runner environment
    const envVal = String(
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_ENV) || ""
    ).toLowerCase()
    if (envVal === "production" || envVal === "preview" || envVal === "development") {
      appEnv = envVal
    } else {
      appEnv = "production"
    }
  }

  const isProduction = true // Dev và Production đồng nhất 100% để luôn tải và ghi nhận dữ liệu thật
  const isPreview = appEnv === "preview"
  const isLocal = typeof window !== "undefined" && Boolean(
    window.location && (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0"
    )
  )

  // Direct backend script URL fallback
  const directScriptUrl =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_APPS_SCRIPT_URL as string | undefined)) ||
    PRODUCTION_SCRIPT_URL

  const sheetId =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_GOOGLE_SHEET_ID as string | undefined)) ||
    PRODUCTION_SHEET_ID

  const enableDevOtpBypass =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_ENABLE_DEV_OTP_BYPASS === "true") ||
    (isLocal && typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV))

  // Reverse proxy routing configuration
  const gatewayUrl =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_GATEWAY_URL as string | undefined)) ||
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_API_ENDPOINT as string | undefined)) ||
    GATEWAY_PROXY_URL

  // Enable gateway when explicitly configured via env, or default on Vercel hosting
  const useGateway =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_USE_GATEWAY !== undefined
      ? import.meta.env.VITE_USE_GATEWAY === "true"
      : isProduction || isPreview

  const scriptUrl = useGateway ? gatewayUrl : directScriptUrl

  return {
    isProduction,
    isPreview,
    isLocal,
    appEnv,
    scriptUrl,
    sheetId,
    enableDevOtpBypass,
    useGateway,
    gatewayUrl,
    fallbackScriptUrl: directScriptUrl,
  }
}

/**
 * Returns true if running in preview or development mode (not production)
 */
export function isTestEnvironment(): boolean {
  return getAppEnvironment().appEnv !== "production"
}

export function getFallbackScriptUrl(): string {
  return (
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_APPS_SCRIPT_URL as string | undefined)) ||
    PRODUCTION_SCRIPT_URL
  )
}

/**
 * Resolve both absolute Apps Script URLs and same-origin gateway paths.
 * `new URL("/api/gateway")` throws without a base URL, which made a fresh
 * browser silently fall back to an empty cache while older devices kept
 * showing previously cached data.
 */
export function resolveApiUrl(rawUrl: string): URL {
  const value = String(rawUrl || "").trim()
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost"
  return new URL(value, base)
}

export const DEFAULT_CONFIG: GoogleSheetConfig = {
  scriptUrl:
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_APPS_SCRIPT_URL) ||
    PRODUCTION_SCRIPT_URL,
  sheetId:
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_SHEET_ID) ||
    PRODUCTION_SHEET_ID,
  autoSync: true,
  useGateway: false,
  gatewayUrl: GATEWAY_PROXY_URL,
  fallbackScriptUrl: PRODUCTION_SCRIPT_URL,
}

export function getGoogleSheetConfig(): GoogleSheetConfig {
  const dynamicEnv = getAppEnvironment()
  const baseConfig: GoogleSheetConfig = {
    scriptUrl: dynamicEnv.scriptUrl,
    sheetId: dynamicEnv.sheetId,
    autoSync: true,
    useGateway: dynamicEnv.useGateway,
    gatewayUrl: dynamicEnv.gatewayUrl,
    fallbackScriptUrl: dynamicEnv.fallbackScriptUrl,
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const isHostedRuntime = dynamicEnv.isProduction || dynamicEnv.isPreview
      return {
        ...baseConfig,
        ...parsed,
        // Production/preview must always use the deployed gateway. A stale
        // per-device localStorage URL previously caused different machines on
        // the same account to load different datasets.
        scriptUrl: isHostedRuntime
          ? baseConfig.scriptUrl
          : parsed.scriptUrl || baseConfig.scriptUrl,
        useGateway: isHostedRuntime ? baseConfig.useGateway : parsed.useGateway ?? baseConfig.useGateway,
        gatewayUrl: isHostedRuntime ? baseConfig.gatewayUrl : parsed.gatewayUrl || baseConfig.gatewayUrl,
        sheetId:
          parsed.sheetId && parsed.sheetId.trim() ? parsed.sheetId : baseConfig.sheetId,
        fallbackScriptUrl: baseConfig.fallbackScriptUrl,
      }
    }
  } catch (err) {
    console.warn("Could not read Google Sheet config from localStorage:", err)
  }
  return baseConfig
}

export function saveGoogleSheetConfig(config: Partial<GoogleSheetConfig>): GoogleSheetConfig {
  const current = getGoogleSheetConfig()
  const updated = { ...current, ...config }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn("Could not save Google Sheet config to localStorage:", err)
  }
  return updated
}
