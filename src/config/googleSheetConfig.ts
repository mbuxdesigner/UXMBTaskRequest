// Configuration for Google Sheets Integration
export interface GoogleSheetConfig {
  scriptUrl: string
  sheetId?: string
  autoSync: boolean
  lastSyncedAt?: string
}

const STORAGE_KEY = "ux_portal_google_sheet_config"

export const DEFAULT_CONFIG: GoogleSheetConfig = {
  scriptUrl: "https://script.google.com/macros/s/AKfycbyz4_GK_guUx9L6uaRd4vK5jqJwG60eLr8Xju3j2hcEUianS8873cp4fJe8BBBrilKQ/exec",
  sheetId: "",
  autoSync: true,
}

export function getGoogleSheetConfig(): GoogleSheetConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        // If saved scriptUrl was empty, fallback to the preconfigured URL
        scriptUrl: parsed.scriptUrl || DEFAULT_CONFIG.scriptUrl,
      }
    }
  } catch (err) {
    console.warn("Could not read Google Sheet config from localStorage:", err)
  }
  return DEFAULT_CONFIG
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
