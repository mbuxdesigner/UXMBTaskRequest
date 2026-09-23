// Configuration for Google Sheets Integration & Environment Detection

export interface GoogleSheetConfig {
  scriptUrl: string
  sheetId?: string
  autoSync: boolean
  lastSyncedAt?: string
}

export interface AppEnvironmentConfig {
  isProduction: boolean
  isPreview: boolean
  isLocal: boolean
  appEnv: "production" | "preview" | "development"
  scriptUrl: string
  sheetId: string
  enableDevOtpBypass: boolean
}

export const PRODUCTION_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyz4_GK_guUx9L6uaRd4vK5jqJwG60eLr8Xju3j2hcEUianS8873cp4fJe8BBBrilKQ/exec"
export const PRODUCTION_SHEET_ID = "1gpe5W7whAMxIZLjsjVxEW23vcaa9ny0m9Qj327zKYzw"

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
    if (hostname === "uxmb-task-request.vercel.app") {
      appEnv = "production"
    } else if (
      hostname.endsWith(".vercel.app") ||
      hostname.includes("preview") ||
      hostname.includes("-git-")
    ) {
      appEnv = "preview"
    } else if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      appEnv = "development"
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
    } else if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      appEnv = "development"
    } else {
      appEnv = "production"
    }
  }

  const isProduction = appEnv === "production"
  const isPreview = appEnv === "preview"
  const isLocal = appEnv === "development"

  // Dynamically resolve endpoints from environment with fallback to production constants
  const scriptUrl =
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

  return {
    isProduction,
    isPreview,
    isLocal,
    appEnv,
    scriptUrl,
    sheetId,
    enableDevOtpBypass,
  }
}

/**
 * Returns true if running in preview or development mode (not production)
 */
export function isTestEnvironment(): boolean {
  return getAppEnvironment().appEnv !== "production"
}

export const DEFAULT_CONFIG: GoogleSheetConfig = {
  scriptUrl:
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_APPS_SCRIPT_URL) ||
    PRODUCTION_SCRIPT_URL,
  sheetId:
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_SHEET_ID) ||
    PRODUCTION_SHEET_ID,
  autoSync: true,
}

export function getGoogleSheetConfig(): GoogleSheetConfig {
  const dynamicEnv = getAppEnvironment()
  const baseConfig: GoogleSheetConfig = {
    scriptUrl: dynamicEnv.scriptUrl,
    sheetId: dynamicEnv.sheetId,
    autoSync: true,
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...baseConfig,
        ...parsed,
        // If saved scriptUrl was empty, fallback to the preconfigured URL
        scriptUrl: parsed.scriptUrl || baseConfig.scriptUrl,
        sheetId:
          parsed.sheetId && parsed.sheetId.trim() ? parsed.sheetId : baseConfig.sheetId,
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
