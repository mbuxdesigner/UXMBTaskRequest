const CHUNK_RELOAD_MARKER = "uxmb_chunk_reload_attempt"
const RETRY_WINDOW_MS = 60_000

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "")
  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /loading chunk [\d\w-]+ failed/i.test(message) ||
    /chunkloaderror/i.test(message) ||
    /importing a module script failed/i.test(message)
  )
}

function getLastReloadAttempt(): number {
  try {
    return Number(sessionStorage.getItem(CHUNK_RELOAD_MARKER) || 0)
  } catch {
    return 0
  }
}

export function clearChunkReloadMarker(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_MARKER)
  } catch {}
}

/** Reload once with a cache-busting document URL to pick up the newest build. */
export function reloadForFreshBuild(): boolean {
  if (typeof window === "undefined") return false

  const now = Date.now()
  const lastAttempt = getLastReloadAttempt()
  if (lastAttempt && now - lastAttempt < RETRY_WINDOW_MS) return false

  try {
    sessionStorage.setItem(CHUNK_RELOAD_MARKER, String(now))
  } catch {}

  const url = new URL(window.location.href)
  url.searchParams.set("__build_refresh", String(now))
  window.location.replace(url.toString())
  return true
}

export async function importWithChunkRecovery<T>(
  importer: () => Promise<T>
): Promise<T> {
  try {
    const module = await importer()
    clearChunkReloadMarker()
    return module
  } catch (error) {
    if (isChunkLoadError(error) && reloadForFreshBuild()) {
      return new Promise<T>(() => {})
    }
    throw error
  }
}
