type RequestWithNickname = {
  request_id?: unknown
  nickname?: string
}

/**
 * Keep an already cached nickname only when the remote payload omits the field.
 * An explicit `nickname: ""`/`null` is intentional and must still clear it.
 */
export function preserveCachedNickname<T extends RequestWithNickname>(
  rawRemote: Record<string, unknown>,
  normalizedRemote: T,
  cachedRequest?: RequestWithNickname
): T {
  const remoteIncludesNickname = Object.prototype.hasOwnProperty.call(rawRemote, "nickname")
  if (remoteIncludesNickname || cachedRequest?.nickname === undefined) {
    return normalizedRemote
  }

  return {
    ...normalizedRemote,
    nickname: cachedRequest.nickname,
  }
}

export function mergeRemoteRequestsPreservingNicknames<T extends RequestWithNickname>(
  rawRemoteRequests: Record<string, unknown>[],
  normalize: (raw: Record<string, unknown>) => T,
  cachedRequests: RequestWithNickname[] = []
): T[] {
  const cachedById = new Map(
    cachedRequests.map((request) => [String(request.request_id || ""), request])
  )

  return rawRemoteRequests.map((rawRemote) => {
    const normalized = normalize(rawRemote)
    const cached = cachedById.get(String(normalized.request_id || ""))
    return preserveCachedNickname(rawRemote, normalized, cached)
  })
}
