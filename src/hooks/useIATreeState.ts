import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { toast } from "@/components/ui/toast"
import { IANode, IAProductInfo, IATier, IATouchpointType, IAPortPosition, IATierDimensionSettings, getTierDefaultDisplaySettings } from "@/types/ia"
import {
  IA_PRODUCTS,
  DEFAULT_IA_TREES,
  getProductMetrics,
  getAdminIAProducts,
  createCleanRootNodeForProduct,
} from "@/data/iaMockData"
import { mockRequests, UXRequest, isDemoRequest } from "@/data/mockData"
import { syncMasterDataToSheet, fetchMasterDataFromSheet, fetchRequestsFromSheet } from "@/services/googleSheetService"
import { DEFAULT_TIER_DIMENSIONS } from "@/components/ia/IASettingsModal"

export const IA_STORAGE_KEY = "ux_portal_ia_tree_data_v4"
export const IA_TIER_DIMENSIONS_KEY = "ux_ia_tier_dimensions_v2"

export interface LayoutNode {
  node: IANode
  x: number
  y: number
  width: number
  height: number
  subtreeHeight: number
  isCollapsed: boolean
  isExpanded: boolean
  hasChildren: boolean
  childCount: number
  isVisible: boolean
  isHighlighted: boolean
  metrics?: SubtreeMetrics
}

export interface LayoutConnector {
  id: string
  parentId: string
  childId: string
  x1: number
  y1: number
  x2: number
  y2: number
  fromPort: IAPortPosition
  toPort: IAPortPosition
  path: string
  colorTheme?: string
  isHighlighted?: boolean
  trunkHandle?: {
    x: number
    y: number
    parentId: string
    currentOffset: number
  }
}

export interface UseIATreeStateReturn {
  activeTree: IANode
  rootNodes: IANode[]
  products: IAProductInfo[]
  selectedProductId: string
  setSelectedProductId: (id: string) => void
  toggleCollapse: (nodeId: string) => void
  addChildNode: (parentId: string, nodeData: Partial<IANode>) => void
  addRootNode: (nodeData: Partial<IANode>) => void
  addChildInDirection: (parentId: string, direction: IAPortPosition, nodeData?: Partial<IANode>) => void
  connectNodes: (sourceNodeId: string, targetNodeId: string) => void
  createConnectedNodeAt: (
    sourceNodeId: string,
    position: { x: number; y: number },
    sourcePort: IAPortPosition,
    nodeData?: Partial<IANode>
  ) => void
  updateNode: (nodeId: string, nodeData: Partial<IANode>) => void
  updateNodePosition: (nodeId: string, x: number, y: number, persist?: boolean) => void
  updateMultipleNodePositions: (positions: Array<{ nodeId: string; x: number; y: number }>, persist?: boolean) => void
  updateNodeDimensions: (nodeId: string, width: number, height: number, persist?: boolean) => void
  updateTrunkOffset: (nodeId: string, offset: number, persist?: boolean) => void
  autoAlignTree: () => void
  deleteNode: (nodeId: string) => void
  resetToDefault: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResult: {
    matchedIds: Set<string>
    ancestorIdsToExpand: Set<string>
    matchCount: number
  }
  layoutNodes: LayoutNode[]
  connectors: LayoutConnector[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  metrics: { featureCount: number; screenCount: number }
  findNode: (id: string) => IANode | null
  requestsMap: Map<string, UXRequest>
  trees: Record<string, IANode>
  syncCloud: () => Promise<{ success: boolean; message: string }>
  pullCloud: () => Promise<{ success: boolean; message: string }>
  tierDimensions: IATierDimensionSettings
  setTierDimensions: (settings: IATierDimensionSettings) => void
  importTree: (imported: IANode | IANode[]) => void
}

// Helper: Deep Clone Tree
export function deepCloneTree(node: IANode): IANode {
  return JSON.parse(JSON.stringify(node))
}

// Helper: Deep Clone All Trees
export function deepCloneAllTrees(trees: Record<string, IANode>): Record<string, IANode> {
  return JSON.parse(JSON.stringify(trees))
}

/**
 * Số liệu tổng hợp từ toàn bộ cây con (Subtree Aggregated Metrics)
 */
export interface SubtreeMetrics {
  totalTasks: number             // Tổng số task thực tế (unique) trong subtree
  inProgressTasks: number        // Số task đang làm
  completedTasks: number         // Số task hoàn thành
  pendingTasks: number           // Số task chờ làm
  progressPercent: number        // % tiến độ hoàn thành (0 - 100)
  hasActiveTask: boolean         // Có ít nhất 1 task đang làm trong subtree
  allCompleted: boolean          // Tất cả các task đã hoàn thành (khi totalTasks > 0)
  directTasksCount: number       // Số task gắn trực tiếp vào chính node này
  subtreeTaskIds: string[]       // Danh sách tất cả task IDs trong toàn bộ cây con
}

/**
 * Hàm tính toán tổng hợp tiến độ và số lượng tính năng đang làm / hoàn thành
 * từ toàn bộ các node con cháu cấp dưới (Level 4, Level 3 -> Level 2, Level 1)
 */
export function computeSubtreeMetrics(
  node: IANode,
  requestsMap?: Map<string, UXRequest>
): SubtreeMetrics {
  const taskIdSet = new Set<string>()
  const directIds: string[] = []

  // 1. Task trực tiếp tại node
  if (node.taskIds && node.taskIds.length > 0) {
    for (const id of node.taskIds) {
      const t = id.trim()
      if (t) {
        taskIdSet.add(t)
        directIds.push(t)
      }
    }
  }
  if (node.requestId) {
    const t = node.requestId.trim()
    if (t) {
      taskIdSet.add(t)
      if (!directIds.includes(t)) directIds.push(t)
    }
  }

  // 2. Thu thập đệ quy toàn bộ task của tất cả node con cháu
  function collectChildrenTasks(curr: IANode) {
    if (!curr.children || curr.children.length === 0) return
    for (const child of curr.children) {
      if (child.taskIds && child.taskIds.length > 0) {
        for (const id of child.taskIds) {
          const t = id.trim()
          if (t) taskIdSet.add(t)
        }
      }
      if (child.requestId) {
        const t = child.requestId.trim()
        if (t) taskIdSet.add(t)
      }
      collectChildrenTasks(child)
    }
  }
  collectChildrenTasks(node)

  const subtreeTaskIds = Array.from(taskIdSet)
  const totalTasks = subtreeTaskIds.length

  let inProgressTasks = 0
  let completedTasks = 0
  let pendingTasks = 0

  for (const id of subtreeTaskIds) {
    const req = requestsMap?.get(id)
    if (req) {
      const s = (req.status || "").toLowerCase()
      const isDone =
        s.includes("hoàn thành") ||
        s.includes("nghiệm thu") ||
        s.includes("release") ||
        req.progress === 100
      const isDoing =
        !isDone &&
        (s.includes("thực hiện") ||
          s.includes("đang làm") ||
          s.includes("tiến hành") ||
          s.includes("review") ||
          (req.progress > 0 && req.progress < 100))

      if (isDone) {
        completedTasks++
      } else if (isDoing) {
        inProgressTasks++
      } else {
        pendingTasks++
      }
    } else {
      // Task chưa có trong requestsMap (mã nhập thủ công)
      if (directIds.includes(id) && node.hasActiveTask) {
        inProgressTasks++
      } else {
        pendingTasks++
      }
    }
  }

  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (node.progress ?? 0)

  const hasActiveTask =
    inProgressTasks > 0 || (node.hasActiveTask ?? false)

  const allCompleted =
    totalTasks > 0 && completedTasks === totalTasks

  return {
    totalTasks,
    inProgressTasks,
    completedTasks,
    pendingTasks,
    progressPercent,
    hasActiveTask,
    allCompleted,
    directTasksCount: directIds.length,
    subtreeTaskIds,
  }
}

// Helper: Tìm key sản phẩm chứa một node bất kỳ
export function findTreeKeyContainingNode(treeMap: Record<string, IANode>, nodeId: string): string | null {
  for (const [key, root] of Object.entries(treeMap)) {
    let found = false
    function dfs(n: IANode) {
      if (n.id === nodeId) {
        found = true
        return
      }
      if (n.children) {
        for (const c of n.children) {
          if (found) return
          dfs(c)
        }
      }
      if (n.siblingRoots) {
        for (const sr of n.siblingRoots) {
          if (found) return
          dfs(sr)
        }
      }
    }
    dfs(root)
    if (found) return key
  }
  return null
}

// Helper: Load from localStorage safely with dynamic admin products reconciliation
export function loadSavedTrees(): Record<string, IANode> {
  const currentAdminProds = getAdminIAProducts()
  const baseTrees: Record<string, IANode> = deepCloneAllTrees(DEFAULT_IA_TREES)

  // Đảm bảo mọi sản phẩm từ Quản trị đều có cây dữ liệu khởi tạo
  for (const prod of currentAdminProds) {
    if (!baseTrees[prod.id]) {
      if (prod.code === "APP_MB" && baseTrees["app-mbbank"]) {
        baseTrees[prod.id] = deepCloneTree(baseTrees["app-mbbank"])
      } else if (prod.code === "BIZ_MB" && baseTrees["biz-mb"]) {
        baseTrees[prod.id] = deepCloneTree(baseTrees["biz-mb"])
      } else if (prod.code === "WEB_PORTAL" && baseTrees["web-portal"]) {
        baseTrees[prod.id] = deepCloneTree(baseTrees["web-portal"])
      } else if (prod.code === "BAAS" && baseTrees["baas"]) {
        baseTrees[prod.id] = deepCloneTree(baseTrees["baas"])
      } else {
        baseTrees[prod.id] = createCleanRootNodeForProduct(prod)
      }
    }
  }

  if (typeof window === "undefined" || !window.localStorage) {
    return baseTrees
  }
  try {
    const raw = window.localStorage.getItem(IA_STORAGE_KEY)
    if (!raw || typeof raw !== "string" || raw.trim() === "") {
      return baseTrees
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || !parsed.trees) {
      return baseTrees
    }
    const savedTrees = parsed.trees as Record<string, IANode>
    const merged: Record<string, IANode> = { ...baseTrees, ...savedTrees }

    // Reconcile alias cho sản phẩm quản trị nếu chưa có trong saved
    for (const prod of currentAdminProds) {
      if (!merged[prod.id]) {
        if (prod.code === "APP_MB" && merged["app-mbbank"]) {
          merged[prod.id] = deepCloneTree(merged["app-mbbank"])
        } else if (prod.code === "BIZ_MB" && merged["biz-mb"]) {
          merged[prod.id] = deepCloneTree(merged["biz-mb"])
        } else if (prod.code === "WEB_PORTAL" && merged["web-portal"]) {
          merged[prod.id] = deepCloneTree(merged["web-portal"])
        } else if (prod.code === "BAAS" && merged["baas"]) {
          merged[prod.id] = deepCloneTree(merged["baas"])
        } else {
          merged[prod.id] = createCleanRootNodeForProduct(prod)
        }
      }
    }

    function sanitizeNodeDemoData(node: IANode): IANode {
      let newReqId = node.requestId
      let newTaskIds = node.taskIds
      if (newReqId && isDemoRequest({ request_id: newReqId })) {
        newReqId = undefined
      }
      if (newTaskIds && newTaskIds.length > 0) {
        const filtered = newTaskIds.filter((tid) => !isDemoRequest({ request_id: tid }))
        newTaskIds = filtered.length > 0 ? filtered : undefined
      }
      const safeTier = Math.min(5, Math.max(1, node.tier || 1)) as IATier
      const safeChildren = safeTier < 5 && node.children ? node.children.map(sanitizeNodeDemoData) : []
      return {
        ...node,
        tier: safeTier,
        requestId: newReqId,
        taskIds: newTaskIds,
        children: safeChildren,
      }
    }

    const sanitized: Record<string, IANode> = {}
    for (const [k, v] of Object.entries(merged)) {
      sanitized[k] = sanitizeNodeDemoData(v)
    }
    return sanitized
  } catch (err) {
    console.warn("Storage parse error, resetting to seed defaults:", err)
    return baseTrees
  }
}

// Helper: Save to localStorage safely
export function saveTreesToStorage(trees: Record<string, IANode>): void {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    const payload = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      trees,
    }
    window.localStorage.setItem(IA_STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn("Failed to persist IA tree data to localStorage:", err)
  }
}

// Helper: Load and save Tier Dimension Settings
export function loadTierDimensionSettings(): IATierDimensionSettings {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_TIER_DIMENSIONS
  try {
    const raw = window.localStorage.getItem(IA_TIER_DIMENSIONS_KEY)
    if (!raw) return DEFAULT_TIER_DIMENSIONS
    const parsed = JSON.parse(raw)
    // Tự động nâng cấp nếu dữ liệu lưu trước đó có chiều cao cũ bị thổi phồng (> 95) hoặc quá nhỏ (< 65 cho Lv1)
    if (
      !parsed[1]?.height || parsed[1].height > 95 || parsed[1].height < 65 ||
      !parsed[2]?.height || parsed[2].height > 95 || parsed[2].height < 50 ||
      !parsed[3]?.height || parsed[3].height > 95 || parsed[3].height < 50 ||
      !parsed[4]?.height || parsed[4].height > 95 || parsed[4].height < 50 ||
      !parsed[5]?.height || parsed[5].height > 95 || parsed[5].height < 50 ||
      !parsed.verticalGapJourney ||
      !parsed.columnGap || parsed.columnGap < 80
    ) {
      saveTierDimensionSettings(DEFAULT_TIER_DIMENSIONS)
      return DEFAULT_TIER_DIMENSIONS
    }
    return {
      ...DEFAULT_TIER_DIMENSIONS,
      ...parsed,
      1: { ...DEFAULT_TIER_DIMENSIONS[1], ...(parsed[1] || {}) },
      2: { ...DEFAULT_TIER_DIMENSIONS[2], ...(parsed[2] || {}) },
      3: { ...DEFAULT_TIER_DIMENSIONS[3], ...(parsed[3] || {}) },
      4: { ...DEFAULT_TIER_DIMENSIONS[4], ...(parsed[4] || {}) },
      5: { ...DEFAULT_TIER_DIMENSIONS[5], ...(parsed[5] || {}), height: Math.min(parsed[5]?.height || 68, 85) },
    }
  } catch {
    return DEFAULT_TIER_DIMENSIONS
  }
}

export function saveTierDimensionSettings(settings: IATierDimensionSettings): void {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    window.localStorage.setItem(IA_TIER_DIMENSIONS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn("Failed to persist tier dimensions:", err)
  }
}

/**
 * Tính toán chiều cao ước tính thực tế của một thẻ Node dựa trên nội dung & cấu hình hiển thị
 * Giúp thuật toán Auto-Align / Sắp xếp tự động phân bổ khoảng cách chính xác, không bị đè thẻ
 */
export function getNodeEstimatedHeight(node: IANode, tierDimensions?: IATierDimensionSettings): number {
  if (node.customHeight) return node.customHeight

  const ds = node.displaySettings || getTierDefaultDisplaySettings(node.tier)

  if (node.tier === 1) {
    const dimH = tierDimensions?.[1]?.height
    const defaultH = node.description ? 86 : 70
    return dimH && dimH >= 65 ? dimH : defaultH
  }

  // Thẻ đã được tinh giản tối đa theo yêu cầu tối ưu không gian hiển thị
  // 1. Padding trên: 8px, padding dưới: 10px, viền: 2px = 20px
  let h = 20

  // 2. Tiêu đề 15px bold leading-tight (~20px)
  h += 20

  // 3. Mô tả phụ (nếu có)
  if (node.description && node.tier !== 1) {
    h += 16
  }

  // 4. Thanh tiến độ siêu gọn
  if (ds.showProgress !== false) {
    h += 6
  }

  // 5. Footer trạng thái có task & đếm nhánh
  if (ds.showStatus !== false || ds.showBranchCount !== false) {
    h += 24
  }

  // Cấp 5 thu gọn kích thước như Cấp 4 (chiều cao chuẩn ~68px)
  const tierH = tierDimensions?.[node.tier]?.height
  const defaultDim = (node.tier === 5 && tierH && tierH > 95) ? 68 : (tierH || (node.description ? 86 : 68))
  return Math.max(54, Math.max(defaultDim, Math.round(h)))
}

const VERTICAL_GAP = 20

export function useIATreeState(initialProductId: string = "app-mbbank"): UseIATreeStateReturn {
  const [products, setProducts] = useState<IAProductInfo[]>(() => getAdminIAProducts())
  const [tierDimensions, setTierDimensionsState] = useState<IATierDimensionSettings>(() => loadTierDimensionSettings())

  const setTierDimensions = useCallback((settings: IATierDimensionSettings) => {
    setTierDimensionsState(settings)
    saveTierDimensionSettings(settings)
  }, [])

  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    const currentProds = getAdminIAProducts()
    if (initialProductId && currentProds.some((p: IAProductInfo) => p.id === initialProductId)) {
      return initialProductId
    }
    return currentProds[0]?.id || "app-mbbank"
  })
  const [trees, setTrees] = useState<Record<string, IANode>>(() => loadSavedTrees())
  const [searchQuery, setSearchQuery] = useState<string>("")
  const layoutNodesRef = useRef<LayoutNode[]>([])

  // Đồng bộ thời gian thực khi danh mục Sản phẩm trong Quản trị thay đổi
  useEffect(() => {
    const syncProducts = () => {
      const latestProds = getAdminIAProducts()
      setProducts(latestProds)
      setSelectedProductId((curr) => {
        if (latestProds.some((p: IAProductInfo) => p.id === curr)) return curr
        return latestProds[0]?.id || curr
      })
      setTrees((prev) => {
        let hasChanges = false
        const updated = { ...prev }
        for (const prod of latestProds) {
          if (!updated[prod.id]) {
            if (prod.code === "APP_MB" && updated["app-mbbank"]) {
              updated[prod.id] = deepCloneTree(updated["app-mbbank"])
            } else if (prod.code === "BIZ_MB" && updated["biz-mb"]) {
              updated[prod.id] = deepCloneTree(updated["biz-mb"])
            } else if (prod.code === "WEB_PORTAL" && updated["web-portal"]) {
              updated[prod.id] = deepCloneTree(updated["web-portal"])
            } else if (prod.code === "BAAS" && updated["baas"]) {
              updated[prod.id] = deepCloneTree(updated["baas"])
            } else {
              updated[prod.id] = createCleanRootNodeForProduct(prod)
            }
            hasChanges = true
          }
        }
        if (hasChanges) {
          saveTreesToStorage(updated)
          return updated
        }
        return prev
      })
    }

    window.addEventListener("storage", syncProducts)
    window.addEventListener("admin_products_changed", syncProducts)
    window.addEventListener("ux_data_refreshed", syncProducts)
    window.addEventListener("masterdata_synced", syncProducts)
    return () => {
      window.removeEventListener("storage", syncProducts)
      window.removeEventListener("admin_products_changed", syncProducts)
      window.removeEventListener("ux_data_refreshed", syncProducts)
      window.removeEventListener("masterdata_synced", syncProducts)
    }
  }, [])

  // Helper: Retrieve or dynamically initialize tree for a product
  const getTargetTree = useCallback(
    (treeMap: Record<string, IANode>, prodId: string): IANode => {
      const effectiveId = prodId === "all" ? (products[0]?.id || "app-mbbank") : prodId
      if (treeMap[effectiveId]) return treeMap[effectiveId]
      const prod = products.find((p) => p.id === effectiveId)
      if (prod) {
        if (prod.code === "APP_MB" && treeMap["app-mbbank"]) return treeMap["app-mbbank"]
        if (prod.code === "BIZ_MB" && treeMap["biz-mb"]) return treeMap["biz-mb"]
        if (prod.code === "WEB_PORTAL" && treeMap["web-portal"]) return treeMap["web-portal"]
        if (prod.code === "BAAS" && treeMap["baas"]) return treeMap["baas"]
        return createCleanRootNodeForProduct(prod)
      }
      return DEFAULT_IA_TREES[effectiveId] || DEFAULT_IA_TREES["app-mbbank"]
    },
    [products]
  )

  // Active Tree for current product
  const activeTree: IANode = useMemo(() => {
    return getTargetTree(trees, selectedProductId)
  }, [trees, selectedProductId, getTargetTree])

  // All root nodes (Primary LV1 + Sibling LV1s)
  const rootNodes = useMemo<IANode[]>(() => {
    if (selectedProductId === "all") {
      const allRoots: IANode[] = []
      for (const prod of products) {
        const t =
          trees[prod.id] ||
          (prod.code === "APP_MB" ? trees["app-mbbank"] : prod.code === "BIZ_MB" ? trees["biz-mb"] : undefined)
        if (t) {
          allRoots.push(t)
          if (t.siblingRoots && t.siblingRoots.length > 0) {
            allRoots.push(...t.siblingRoots)
          }
        }
      }
      return allRoots.length > 0 ? allRoots : [activeTree]
    }
    const roots = [activeTree]
    if (activeTree.siblingRoots && activeTree.siblingRoots.length > 0) {
      roots.push(...activeTree.siblingRoots)
    }
    return roots
  }, [activeTree, selectedProductId, products, trees])

  // Quản lý danh sách bài toán thực tế (loại bỏ hoàn toàn demo data)
  const [requestsList, setRequestsList] = useState<UXRequest[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = window.localStorage.getItem("ux_portal_real_requests")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((r: UXRequest) => !isDemoRequest(r))
            if (clean.length !== parsed.length) {
              try {
                window.localStorage.setItem("ux_portal_real_requests", JSON.stringify(clean))
              } catch {}
            }
            return clean
          }
        }
      } catch {}
    }
    return mockRequests.filter((r) => !isDemoRequest(r))
  })

  useEffect(() => {
    fetchRequestsFromSheet().then((reqs) => {
      if (Array.isArray(reqs)) {
        const clean = reqs.filter((r: UXRequest) => !isDemoRequest(r))
        setRequestsList(clean)
      }
    }).catch(() => {})
  }, [])

  // Requests indexed by request_id
  const requestsMap = useMemo(() => {
    const map = new Map<string, UXRequest>()
    for (const req of requestsList) {
      map.set(req.request_id, req)
    }
    return map
  }, [requestsList])

  // Find node helper across all root nodes
  const findNode = useCallback((id: string): IANode | null => {
    function dfs(curr: IANode): IANode | null {
      if (curr.id === id) return curr
      if (curr.children) {
        for (const child of curr.children) {
          const found = dfs(child)
          if (found) return found
        }
      }
      return null
    }
    for (const r of rootNodes) {
      const found = dfs(r)
      if (found) return found
    }
    return null
  }, [rootNodes])

  // Search Multi-Field Matching Engine
  const searchResult = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    const matchedIds = new Set<string>()
    const ancestorIdsToExpand = new Set<string>()

    if (!normalized) {
      return { matchedIds, ancestorIdsToExpand, matchCount: 0 }
    }

    const parentMap = new Map<string, string>()
    const nodeMap = new Map<string, IANode>()

    function indexTree(node: IANode, parentId?: string) {
      nodeMap.set(node.id, node)
      if (parentId) parentMap.set(node.id, parentId)
      if (node.children) {
        for (const child of node.children) {
          indexTree(child, node.id)
        }
      }
    }
    for (const r of rootNodes) {
      indexTree(r)
    }

    for (const [id, node] of nodeMap.entries()) {
      const linkedReq = node.requestId ? requestsMap.get(node.requestId) : undefined

      const nameMatch = Boolean(node.name && node.name.toLowerCase().includes(normalized))
      const codeMatch = Boolean(node.code && node.code.toLowerCase().includes(normalized))
      const descMatch = Boolean(node.description && node.description.toLowerCase().includes(normalized))
      const squadMatch = Boolean(node.squad && node.squad.toLowerCase().includes(normalized))
      const taskIdMatch = Boolean(node.requestId && node.requestId.toLowerCase().includes(normalized))
      const multiTaskMatch = Boolean(
        node.taskIds &&
        node.taskIds.some(
          (tid) =>
            tid.toLowerCase().includes(normalized) ||
            requestsMap.get(tid)?.title.toLowerCase().includes(normalized)
        )
      )
      const taskTitleMatch = Boolean(linkedReq?.title && linkedReq.title.toLowerCase().includes(normalized))
      const designerMatch = Boolean(
        (node.assignedDesigner && node.assignedDesigner.toLowerCase().includes(normalized)) ||
        (linkedReq?.assigned_designer && linkedReq.assigned_designer.toLowerCase().includes(normalized))
      )

      if (nameMatch || codeMatch || descMatch || squadMatch || taskIdMatch || multiTaskMatch || taskTitleMatch || designerMatch) {
        matchedIds.add(id)
        let curr = id
        while (parentMap.has(curr)) {
          const pId = parentMap.get(curr)!
          ancestorIdsToExpand.add(pId)
          curr = pId
        }
      }
    }

    return {
      matchedIds,
      ancestorIdsToExpand,
      matchCount: matchedIds.size,
    }
  }, [rootNodes, searchQuery, requestsMap])

  // Toggle Collapse on a Node
  const toggleCollapse = useCallback((nodeId: string) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)
      const clone = deepCloneTree(current)

      function dfs(curr: IANode): boolean {
        if (curr.id === nodeId) {
          curr.collapsed = !curr.collapsed
          return true
        }
        if (curr.children) {
          for (const child of curr.children) {
            if (dfs(child)) return true
          }
        }
        return false
      }

      for (const r of [clone, ...(clone.siblingRoots || [])]) {
        if (dfs(r)) break
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Add Root Node (Multiple LV1s support)
  const addRootNode = useCallback((nodeData: Partial<IANode>) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)
      const clone = deepCloneTree(current)
      const newId = nodeData.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newRoot: IANode = {
        id: newId,
        tier: 1,
        name: (nodeData.name && nodeData.name.trim()) || "Cấp 1 mới · Sản phẩm",
        parentId: null,
        description: nodeData.description || "",
        code: nodeData.code || "",
        colorTheme: nodeData.colorTheme || clone.colorTheme || "blue",
        children: [],
        customX: nodeData.customX,
        customY: nodeData.customY,
      }
      if (!clone.siblingRoots) {
        clone.siblingRoots = []
      }
      clone.siblingRoots.push(newRoot)
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Add Child Node
  const addChildNode = useCallback((parentId: string, nodeData: Partial<IANode>) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)
      const clone = deepCloneTree(current)
      let created = false
      let blocked = false

      function dfs(curr: IANode): boolean {
        if (curr.id === parentId) {
          if (curr.tier >= 5) {
            toast.warning("Cấp 5 (Lv5) là tầng thành phần/chi tiết cuối cùng, không thể tạo thêm nhánh con.")
            blocked = true
            return true
          }
          curr.collapsed = false // auto-expand parent
          const nextTier = (curr.tier + 1) as IATier
          const newId = nodeData.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          const newNode: IANode = {
            id: newId,
            tier: nextTier,
            name: (nodeData.name && nodeData.name.trim()) || `Node mới (Cấp ${nextTier})`,
            parentId: curr.id,
            description: nodeData.description || "",
            code: nodeData.code || "",
            figmaUrl: nodeData.figmaUrl,
            squad: nodeData.squad,
            taskIds: nodeData.taskIds,
            hasActiveTask: nodeData.hasActiveTask,
            requestId: nodeData.requestId,
            touchpointType: nextTier === 4 ? (nodeData.touchpointType || "screen") : undefined,
            children: nextTier < 5 ? [] : undefined,
            colorTheme: curr.colorTheme,
            displaySettings: nodeData.displaySettings,
            customX: nodeData.customX,
            customY: nodeData.customY,
          }
          if (!curr.children) curr.children = []
          curr.children.push(newNode)
          created = true
          return true
        }
        if (curr.children) {
          for (const child of curr.children) {
            if (dfs(child)) return true
          }
        }
        return false
      }

      for (const r of [clone, ...(clone.siblingRoots || [])]) {
        if (dfs(r)) {
          break
        }
      }

      if (blocked) {
        return prevTrees
      }

      if (!created) {
        throw new Error(`Parent node with id "${parentId}" not found`)
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Update Node
  const updateNode = useCallback((nodeId: string, nodeData: Partial<IANode>) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)
      const clone = deepCloneTree(current)

      function dfs(curr: IANode): boolean {
        if (curr.id === nodeId) {
          if (nodeData.name !== undefined) {
            if (typeof nodeData.name !== "string" || nodeData.name.trim() === "") {
              throw new Error("Node name cannot be empty")
            }
            curr.name = nodeData.name.trim()
          }
          if ("description" in nodeData) curr.description = nodeData.description
          if ("code" in nodeData) curr.code = nodeData.code
          if ("squad" in nodeData) curr.squad = nodeData.squad
          if ("taskIds" in nodeData) curr.taskIds = nodeData.taskIds
          if ("hasActiveTask" in nodeData) curr.hasActiveTask = nodeData.hasActiveTask
          if ("requestId" in nodeData) curr.requestId = nodeData.requestId
          if ("figmaUrl" in nodeData) curr.figmaUrl = nodeData.figmaUrl
          if ("touchpointType" in nodeData && curr.tier === 4) {
            curr.touchpointType = nodeData.touchpointType as IATouchpointType
          }
          if ("colorTheme" in nodeData) curr.colorTheme = nodeData.colorTheme
          if ("isCriticalPath" in nodeData) curr.isCriticalPath = nodeData.isCriticalPath
          if ("displaySettings" in nodeData) curr.displaySettings = nodeData.displaySettings
          return true
        }
        if (curr.children) {
          for (const child of curr.children) {
            if (dfs(child)) return true
          }
        }
        return false
      }

      for (const r of [clone, ...(clone.siblingRoots || [])]) {
        if (dfs(r)) break
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Delete Node: Locks remaining nodes at their current canvas positions so no shifting occurs
  const deleteNode = useCallback((nodeId: string) => {
    // Snapshot current visual positions from layoutNodesRef so remaining nodes don't jump or auto-rearrange
    const positionMap = new Map<string, { x: number; y: number }>()
    if (layoutNodesRef.current) {
      for (const ln of layoutNodesRef.current) {
        if (ln.node.id !== nodeId) {
          positionMap.set(ln.node.id, { x: ln.x, y: ln.y })
        }
      }
    }

    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)

      // 1. Is it the primary root?
      if (current.id === nodeId) {
        if (current.siblingRoots && current.siblingRoots.length > 0) {
          const [promoted, ...restSiblings] = current.siblingRoots
          const nextPrimary: IANode = {
            ...promoted,
            siblingRoots: restSiblings,
          }
          const nextTrees = { ...prevTrees, [selectedProductId]: nextPrimary }
          saveTreesToStorage(nextTrees)
          return nextTrees
        } else {
          const currentProd = products.find((p) => p.id === selectedProductId)
          const cleanRoot = currentProd
            ? createCleanRootNodeForProduct(currentProd)
            : {
                id: `node-${Date.now()}`,
                tier: 1 as IATier,
                name: "Sản phẩm mới",
                children: [],
              }
          const nextTrees = { ...prevTrees, [selectedProductId]: cleanRoot }
          saveTreesToStorage(nextTrees)
          return nextTrees
        }
      }

      // 2. Is it a sibling root?
      if (current.siblingRoots && current.siblingRoots.some((r) => r.id === nodeId)) {
        const nextSiblings = current.siblingRoots.filter((r) => r.id !== nodeId)
        const nextPrimary: IANode = {
          ...current,
          siblingRoots: nextSiblings,
        }
        const nextTrees = { ...prevTrees, [selectedProductId]: nextPrimary }
        saveTreesToStorage(nextTrees)
        return nextTrees
      }

      const clone = deepCloneTree(current)

      // Lock current visual positions for all nodes in the tree so layout does not auto-shift
      function lockPositions(curr: IANode) {
        if (curr.id !== nodeId && positionMap.has(curr.id)) {
          const pos = positionMap.get(curr.id)!
          if (curr.customX === undefined) curr.customX = Math.round(pos.x)
          if (curr.customY === undefined) curr.customY = Math.round(pos.y)
        }
        if (curr.children) {
          for (const child of curr.children) {
            lockPositions(child)
          }
        }
      }
      for (const r of [clone, ...(clone.siblingRoots || [])]) {
        lockPositions(r)
      }

      function dfs(curr: IANode): boolean {
        if (!curr.children) return false
        const index = curr.children.findIndex((c) => c.id === nodeId)
        if (index !== -1) {
          curr.children.splice(index, 1)
          return true
        }
        for (const child of curr.children) {
          if (dfs(child)) return true
        }
        return false
      }

      for (const r of [clone, ...(clone.siblingRoots || [])]) {
        if (dfs(r)) break
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Update Node Custom Position (from Canvas Drag & Drop)
  const updateNodePosition = useCallback((nodeId: string, x: number, y: number, persist: boolean = true) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)

      // Lookup current layout positions to calculate relative delta dx, dy
      const currentLayoutMap = new Map<string, LayoutNode>()
      for (const ln of layoutNodesRef.current) {
        currentLayoutMap.set(ln.node.id, ln)
      }

      // Helper to recursively shift all descendant nodes by dx, dy
      function shiftDescendants(n: IANode, dx: number, dy: number): IANode {
        if (!n.children || n.children.length === 0) return n
        const newChildren = n.children.map((c) => {
          const lNode = currentLayoutMap.get(c.id)
          const baseCx = c.customX !== undefined ? c.customX : (lNode ? lNode.x : 0)
          const baseCy = c.customY !== undefined ? c.customY : (lNode ? lNode.y : 0)
          const shiftedChild: IANode = {
            ...c,
            customX: Math.round(baseCx + dx),
            customY: Math.round(baseCy + dy),
          }
          return shiftDescendants(shiftedChild, dx, dy)
        })
        return { ...n, children: newChildren }
      }

      function updateNodeInTree(node: IANode): IANode {
        if (node.id === nodeId) {
          const lNode = currentLayoutMap.get(node.id)
          const baseNx = node.customX !== undefined ? node.customX : (lNode ? lNode.x : x)
          const baseNy = node.customY !== undefined ? node.customY : (lNode ? lNode.y : y)
          const dx = Math.round(x) - baseNx
          const dy = Math.round(y) - baseNy

          const updatedNode: IANode = {
            ...node,
            customX: Math.round(x),
            customY: Math.round(y),
          }

          // If node has children and moved by (dx, dy), shift its descendants together
          if (node.children && node.children.length > 0 && (dx !== 0 || dy !== 0)) {
            return shiftDescendants(updatedNode, dx, dy)
          }
          return updatedNode
        }

        if (node.children && node.children.length > 0) {
          let childChanged = false
          const newChildren = node.children.map((c) => {
            const updated = updateNodeInTree(c)
            if (updated !== c) childChanged = true
            return updated
          })
          if (childChanged) {
            return { ...node, children: newChildren }
          }
        }
        return node
      }

      const clone = updateNodeInTree(current)
      if (current.siblingRoots && current.siblingRoots.length > 0) {
        clone.siblingRoots = current.siblingRoots.map(updateNodeInTree)
      }
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      if (persist) {
        saveTreesToStorage(nextTrees)
      }
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Batch Update Multiple Nodes Custom Positions (for Multi-Selection Drag & Drop)
  const updateMultipleNodePositions = useCallback(
    (positions: Array<{ nodeId: string; x: number; y: number }>, persist: boolean = true) => {
      if (!positions || positions.length === 0) return

      const posMap = new Map<string, { x: number; y: number }>()
      for (const p of positions) {
        posMap.set(p.nodeId, { x: Math.round(p.x), y: Math.round(p.y) })
      }

      setTrees((prevTrees) => {
        const current = getTargetTree(prevTrees, selectedProductId)

        function updateNodeInTree(node: IANode): IANode {
          let nodeChanged = false
          let nextCustomX = node.customX
          let nextCustomY = node.customY

          if (posMap.has(node.id)) {
            const p = posMap.get(node.id)!
            nextCustomX = p.x
            nextCustomY = p.y
            nodeChanged = true
          }

          let nextChildren = node.children
          if (node.children && node.children.length > 0) {
            let childChanged = false
            const newChildren = node.children.map((c) => {
              const updated = updateNodeInTree(c)
              if (updated !== c) childChanged = true
              return updated
            })
            if (childChanged) {
              nextChildren = newChildren
              nodeChanged = true
            }
          }

          if (nodeChanged) {
            return {
              ...node,
              customX: nextCustomX,
              customY: nextCustomY,
              children: nextChildren,
            }
          }
          return node
        }

        const clone = updateNodeInTree(current)
        if (current.siblingRoots && current.siblingRoots.length > 0) {
          clone.siblingRoots = current.siblingRoots.map(updateNodeInTree)
        }
        const nextTrees = { ...prevTrees, [selectedProductId]: clone }
        if (persist) {
          saveTreesToStorage(nextTrees)
        }
        return nextTrees
      })
    },
    [selectedProductId, getTargetTree]
  )

  // Update Node Dimensions (from Canvas Interactive Resize)
  const updateNodeDimensions = useCallback((nodeId: string, width: number, height: number, persist: boolean = true) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)

      function updateDimensionsInTree(node: IANode): IANode {
        if (node.id === nodeId) {
          return {
            ...node,
            customWidth: Math.round(width),
            customHeight: Math.round(height),
          }
        }
        if (node.children && node.children.length > 0) {
          let childChanged = false
          const newChildren = node.children.map((c) => {
            const updated = updateDimensionsInTree(c)
            if (updated !== c) childChanged = true
            return updated
          })
          if (childChanged) {
            return { ...node, children: newChildren }
          }
        }
        return node
      }

      const clone = updateDimensionsInTree(current)
      if (current.siblingRoots && current.siblingRoots.length > 0) {
        clone.siblingRoots = current.siblingRoots.map(updateDimensionsInTree)
      }
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      if (persist) {
        saveTreesToStorage(nextTrees)
      }
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Update Trunk Offset (from FigJam-style bus line dragging)
  const updateTrunkOffset = useCallback((nodeId: string, offset: number, persist: boolean = true) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)

      function updateTrunkInTree(node: IANode): IANode {
        if (node.id === nodeId) {
          return {
            ...node,
            customTrunkOffset: Math.round(offset),
          }
        }
        if (node.children && node.children.length > 0) {
          let childChanged = false
          const newChildren = node.children.map((c) => {
            const updated = updateTrunkInTree(c)
            if (updated !== c) childChanged = true
            return updated
          })
          if (childChanged) {
            return { ...node, children: newChildren }
          }
        }
        return node
      }

      const clone = updateTrunkInTree(current)
      if (current.siblingRoots && current.siblingRoots.length > 0) {
        clone.siblingRoots = current.siblingRoots.map(updateTrunkInTree)
      }
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      if (persist) {
        saveTreesToStorage(nextTrees)
      }
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Auto-align Tree: clears custom positions & dimensions to restore computed tidy tree
  const autoAlignTree = useCallback(() => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)
      const clone = deepCloneTree(current)

      function dfs(curr: IANode) {
        delete curr.customX
        delete curr.customY
        delete curr.customWidth
        delete curr.customHeight
        delete curr.customTrunkOffset
        if (curr.tier >= 5) {
          curr.children = undefined
        }
        if (curr.children) {
          for (const child of curr.children) {
            dfs(child)
          }
        }
      }

      for (const r of [clone, ...(clone.siblingRoots || [])]) {
        dfs(r)
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Add child in specific port direction (Top, Bottom, Left, Right)
  const addChildInDirection = useCallback((parentId: string, direction: IAPortPosition, nodeData?: Partial<IANode>) => {
    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)
      const clone = deepCloneTree(current)
      let blocked = false
      let added = false

      function dfs(curr: IANode): boolean {
        if (curr.id === parentId) {
          if (curr.tier >= 5) {
            toast.warning("Cấp 5 (Lv5) là tầng thành phần/chi tiết cuối cùng, không thể tạo thêm nhánh con.")
            blocked = true
            return true
          }
          curr.collapsed = false
          const nextTier = Math.min(5, curr.tier + 1) as IATier
          const newId = nodeData?.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

          let offsetX = 340
          let offsetY = 0
          if (direction === "bottom") {
            offsetX = 0
            offsetY = 250
          } else if (direction === "top") {
            offsetX = 0
            offsetY = -250
          } else if (direction === "left") {
            offsetX = -340
            offsetY = 0
          }

          const newNode: IANode = {
            id: newId,
            tier: nextTier,
            name: (nodeData?.name && nodeData.name.trim()) || `Node mới`,
            parentId: curr.id,
            description: nodeData?.description || "",
            code: nodeData?.code || "",
            figmaUrl: nodeData?.figmaUrl,
            squad: nodeData?.squad,
            taskIds: nodeData?.taskIds,
            hasActiveTask: nodeData?.hasActiveTask,
            requestId: nodeData?.requestId,
            customTag: nodeData?.customTag,
            colorTheme: curr.colorTheme,
            touchpointType: nextTier === 4 ? (nodeData?.touchpointType || "screen") : undefined,
            children: nextTier < 5 ? [] : undefined,
          }

          if (curr.customX !== undefined && curr.customY !== undefined) {
            newNode.customX = curr.customX + offsetX
            newNode.customY = curr.customY + offsetY
          }

          if (!curr.children) curr.children = []
          curr.children.push(newNode)
          added = true
          return true
        }
        if (curr.children) {
          for (const child of curr.children) {
            if (dfs(child)) return true
          }
        }
        return false
      }

      dfs(clone)
      if (blocked || !added) {
        return prevTrees
      }
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Connect two existing nodes (sourceNode -> targetNode)
  const connectNodes = useCallback((sourceNodeId: string, targetNodeId: string) => {
    if (sourceNodeId === targetNodeId) return

    setTrees((prevTrees) => {
      const current = getTargetTree(prevTrees, selectedProductId)
      const clone = deepCloneTree(current)

      // 1. Verify target is not an ancestor of source (cycle prevention)
      function findAndVerify(curr: IANode, path: string[]): { targetIsAncestor: boolean } {
        const nextPath = [...path, curr.id]
        if (curr.id === sourceNodeId) {
          if (path.includes(targetNodeId)) {
            return { targetIsAncestor: true }
          }
        }
        if (curr.children) {
          for (const c of curr.children) {
            const res = findAndVerify(c, nextPath)
            if (res.targetIsAncestor) return res
          }
        }
        return { targetIsAncestor: false }
      }

      const { targetIsAncestor } = findAndVerify(clone, [])
      if (targetIsAncestor) {
        console.warn("Cannot connect: target node is an ancestor of source node")
        return prevTrees
      }

      // 2. Detach targetNode from its current parent
      let detachedNode: IANode | null = null
      function detach(curr: IANode): boolean {
        if (!curr.children) return false
        const idx = curr.children.findIndex((c) => c.id === targetNodeId)
        if (idx !== -1) {
          detachedNode = curr.children.splice(idx, 1)[0]
          return true
        }
        for (const child of curr.children) {
          if (detach(child)) return true
        }
        return false
      }

      detach(clone)
      if (!detachedNode) {
        console.warn("Target node not found for connection:", targetNodeId)
        return prevTrees
      }

      // 3. Attach detachedNode as child of sourceNode
      let blocked = false
      function attach(curr: IANode): boolean {
        if (curr.id === sourceNodeId) {
          if (curr.tier >= 5) {
            toast.warning("Cấp 5 (Lv5) là tầng thành phần/chi tiết cuối cùng, không thể tạo thêm nhánh con.")
            blocked = true
            return true
          }
          curr.collapsed = false
          if (!curr.children) curr.children = []
          const nodeToAttach = detachedNode!
          nodeToAttach.parentId = curr.id
          nodeToAttach.tier = Math.min(5, curr.tier + 1) as IATier
          curr.children.push(nodeToAttach)
          return true
        }
        if (curr.children) {
          for (const child of curr.children) {
            if (attach(child)) return true
          }
        }
        return false
      }

      attach(clone)
      if (blocked) {
        return prevTrees
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId, getTargetTree])

  // Create new node connected to sourceNode at drop position (customX, customY)
  const createConnectedNodeAt = useCallback(
    (
      sourceNodeId: string,
      position: { x: number; y: number },
      sourcePort: IAPortPosition,
      nodeData?: Partial<IANode>
    ) => {
      setTrees((prevTrees) => {
        const current = getTargetTree(prevTrees, selectedProductId)
        const clone = deepCloneTree(current)
        let blocked = false
        let created = false

        function dfs(curr: IANode): boolean {
          if (curr.id === sourceNodeId) {
            if (curr.tier >= 5) {
              toast.warning("Cấp 5 (Lv5) là tầng thành phần/chi tiết cuối cùng, không thể tạo thêm nhánh con.")
              blocked = true
              return true
            }
            curr.collapsed = false
            const nextTier = Math.min(5, curr.tier + 1) as IATier
            const newId = nodeData?.id || `node-wire-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

            const defaultName =
              nextTier === 5
                ? "Thành phần mới"
                : nextTier === 4
                ? "Màn hình mới"
                : nextTier === 3
                ? "Luồng tính năng mới"
                : "Phân hệ mới"

            const newNode: IANode = {
              id: newId,
              tier: nextTier,
              name: (nodeData?.name && nodeData.name.trim()) || defaultName,
              parentId: curr.id,
              description: nodeData?.description || "Tạo từ kéo nối cổng",
              code: nodeData?.code || "",
              figmaUrl: nodeData?.figmaUrl,
              squad: nodeData?.squad,
              taskIds: nodeData?.taskIds,
              hasActiveTask: nodeData?.hasActiveTask,
              requestId: nodeData?.requestId,
              customTag: nodeData?.customTag,
              colorTheme: curr.colorTheme,
              customX: Math.round(position.x),
              customY: Math.round(position.y),
              touchpointType: nextTier === 4 ? (nodeData?.touchpointType || "screen") : undefined,
              children: nextTier < 5 ? [] : undefined,
            }

            if (!curr.children) curr.children = []
            curr.children.push(newNode)
            created = true
            return true
          }
          if (curr.children) {
            for (const child of curr.children) {
              if (dfs(child)) return true
            }
          }
          return false
        }

        dfs(clone)
        if (blocked || !created) {
          return prevTrees
        }
        const nextTrees = { ...prevTrees, [selectedProductId]: clone }
        saveTreesToStorage(nextTrees)
        return nextTrees
      })
    },
    [selectedProductId, getTargetTree]
  )

  // Reset to Default: Khôi phục về cây gốc của sản phẩm đang chọn
  const resetToDefault = useCallback(() => {
    const currentProd = products.find((p) => p.id === selectedProductId)
    let cleanRoot: IANode
    if (currentProd) {
      if (currentProd.code === "APP_MB" && DEFAULT_IA_TREES["app-mbbank"]) {
        cleanRoot = deepCloneTree(DEFAULT_IA_TREES["app-mbbank"])
      } else if (currentProd.code === "BIZ_MB" && DEFAULT_IA_TREES["biz-mb"]) {
        cleanRoot = deepCloneTree(DEFAULT_IA_TREES["biz-mb"])
      } else if (currentProd.code === "WEB_PORTAL" && DEFAULT_IA_TREES["web-portal"]) {
        cleanRoot = deepCloneTree(DEFAULT_IA_TREES["web-portal"])
      } else if (currentProd.code === "BAAS" && DEFAULT_IA_TREES["baas"]) {
        cleanRoot = deepCloneTree(DEFAULT_IA_TREES["baas"])
      } else {
        cleanRoot = createCleanRootNodeForProduct(currentProd)
      }
    } else {
      cleanRoot = deepCloneTree(DEFAULT_IA_TREES[selectedProductId] || DEFAULT_IA_TREES["app-mbbank"])
    }

    setTrees((prev) => {
      const next = { ...prev, [selectedProductId]: cleanRoot }
      saveTreesToStorage(next)
      return next
    })
  }, [selectedProductId, products])

  // Listen to cross-tab storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === IA_STORAGE_KEY) {
        setTrees(loadSavedTrees())
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Compute Metrics across all root nodes
  const metrics = useMemo(() => {
    let featureCount = 0
    let screenCount = 0
    for (const r of rootNodes) {
      const m = getProductMetrics(r)
      featureCount += m.featureCount
      screenCount += m.screenCount
    }
    return { featureCount, screenCount }
  }, [rootNodes])

  // ---------------------------------------------------------------------------
  // Tidy Tree Layout Calculation Engine
  // ---------------------------------------------------------------------------
  const { layoutNodes, connectors, bounds } = useMemo(() => {
    interface InternalNode {
      node: IANode
      width: number
      height: number
      x: number
      y: number
      subtreeHeight: number
      isCollapsed: boolean
      isExpanded: boolean
      hasChildren: boolean
      childCount: number
      children: InternalNode[]
    }

    const { ancestorIdsToExpand, matchedIds } = searchResult

    // 1. First pass: Build internal hierarchy with effective collapse state
    function buildInternal(node: IANode): InternalNode {
      const dim = tierDimensions[node.tier] || DEFAULT_TIER_DIMENSIONS[node.tier] || { width: 260, height: 68 }
      let nodeWidth = node.customWidth || dim.width
      if (node.tier === 5 && !node.customWidth) {
        // Cấp 5 nhỏ gọn như Cấp 4 (chiều rộng tối đa không vượt quá Cấp 4)
        const lv4Width = tierDimensions[4]?.width || DEFAULT_TIER_DIMENSIONS[4].width
        nodeWidth = Math.min(dim.width, lv4Width)
      }
      const nodeHeight = node.customHeight || getNodeEstimatedHeight(node, tierDimensions)
      const hasChildren = Boolean(node.children && node.children.length > 0 && node.tier < 5)
      const childCount = node.children && node.tier < 5 ? node.children.length : 0

      // Node is forced expanded if it's an ancestor of a search match
      const forceExpanded = ancestorIdsToExpand.has(node.id)
      const isCollapsed = forceExpanded ? false : Boolean(node.collapsed)
      const isExpanded = hasChildren && !isCollapsed

      const children: InternalNode[] = []
      if (hasChildren && isExpanded && node.tier < 5) {
        for (const child of node.children!) {
          children.push(buildInternal(child))
        }
      }

      // Compute subtree height
      let subtreeHeight = nodeHeight + VERTICAL_GAP
      if (children.length > 0) {
        const childrenHeight = children.reduce((sum, c) => sum + c.subtreeHeight, 0)
        subtreeHeight = Math.max(nodeHeight + VERTICAL_GAP, childrenHeight)
      }

      return {
        node,
        width: nodeWidth,
        height: nodeHeight,
        x: 0,
        y: 0,
        subtreeHeight,
        isCollapsed,
        isExpanded,
        hasChildren,
        childCount,
        children,
      }
    }

    // Helper to calculate port anchor coordinates
    function getPortCoord(
      x: number,
      y: number,
      width: number,
      height: number,
      port: IAPortPosition,
      offset: number = 0
    ): { x: number; y: number } {
      switch (port) {
        case "top":
          return { x: x + width / 2, y: y - offset }
        case "bottom":
          return { x: x + width / 2, y: y + height + offset }
        case "left":
          return { x: x - offset, y: y + height / 2 }
        case "right":
          return { x: x + width + offset, y: y + height / 2 }
      }
    }

    // Helper for port tangent direction
    function getPortTangent(port: IAPortPosition, mag: number): { vx: number; vy: number } {
      switch (port) {
        case "right":
          return { vx: mag, vy: 0 }
        case "left":
          return { vx: -mag, vy: 0 }
        case "bottom":
          return { vx: 0, vy: mag }
        case "top":
          return { vx: 0, vy: -mag }
      }
    }

    // 2. Second pass: Calculate Columnar Indented Hierarchy Positions
    // - LV1 (Product Root): Stretches horizontally to cover all its child LV2s!
    // - LV2 (Domain Modules): Arranged horizontally across columns
    // - LV3 (Feature Journeys): Arranged horizontally across columns under LV2 (xếp ngang)
    // - LV4 (Screens & Touchpoints): Stacked vertically below each LV3 (xếp dọc, INDENT_LV4 = 40)
    // - LV5 (Components & Elements): Stacked vertically below each LV4 (xếp dọc, INDENT_LV5 = 36)
    // - Supports multiple LV1s placed side-by-side with LV1_GAP!
    const resultNodes: LayoutNode[] = []
    const rawPairs: { parent: InternalNode; child: InternalNode }[] = []

    const START_X = 60
    const START_Y = 60
    const ROOT_TO_MODULE_GAP = 90
    const MODULE_TO_JOURNEY_GAP = 90
    const INDENT_LV3 = 48
    const INDENT_LV4 = 40
    const INDENT_LV5 = 36
    const VERTICAL_GAP_SCREEN = Math.max(32, tierDimensions.verticalGapScreen || 36)
    const VERTICAL_GAP_JOURNEY = Math.max(48, tierDimensions.verticalGapJourney || 52)
    const COLUMN_GAP = Math.max(100, tierDimensions.columnGap || 110)
    const JOURNEY_GAP = Math.max(48, tierDimensions.columnGap ? Math.round(tierDimensions.columnGap * 0.5) : 56)
    const LV1_GAP = 140

    // Precompute Subtree Metrics once for all nodes in the active trees
    const precomputedMetricsMap = new Map<string, SubtreeMetrics>()
    function indexSubtreeMetrics(curr: IANode) {
      precomputedMetricsMap.set(curr.id, computeSubtreeMetrics(curr, requestsMap))
      if (curr.children) {
        for (const child of curr.children) {
          indexSubtreeMetrics(child)
        }
      }
    }
    for (const r of rootNodes) {
      indexSubtreeMetrics(r)
    }

    // Collect all nodes and apply custom coordinates if arranged by user
    function collectNodes(item: InternalNode) {
      const finalX = item.node.customX !== undefined ? item.node.customX : item.x
      const finalY = item.node.customY !== undefined ? item.node.customY : Number(item.y.toFixed(2))
      const finalWidth = item.node.customWidth !== undefined ? item.node.customWidth : item.width
      const isHighlighted = matchedIds.has(item.node.id)

      resultNodes.push({
        node: item.node,
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: item.node.customHeight || item.height,
        subtreeHeight: item.subtreeHeight,
        isCollapsed: item.isCollapsed,
        isExpanded: item.isExpanded,
        hasChildren: item.hasChildren,
        childCount: item.childCount,
        isVisible: true,
        isHighlighted,
        metrics: precomputedMetricsMap.get(item.node.id),
      })

      for (const child of item.children) {
        collectNodes(child)
      }
    }

    const allRootInternals = rootNodes.map(buildInternal)
    let currentClusterStartX = START_X

    for (const root of allRootInternals) {
      root.y = START_Y

      if (root.children.length === 0 || !root.isExpanded) {
        root.x = currentClusterStartX
        root.width = root.node.customWidth || tierDimensions[1].width
        currentClusterStartX += root.width + LV1_GAP
      } else {
        let currentModuleX = currentClusterStartX

        for (const module of root.children) {
          const modY = Math.round(root.y + root.height + ROOT_TO_MODULE_GAP)
          rawPairs.push({ parent: root, child: module })

          const luongs = module.children || []
          if (luongs.length === 0 || !module.isExpanded) {
            module.x = currentModuleX
            module.y = modY
            currentModuleX += module.width + COLUMN_GAP
          } else {
            // LV3 xếp ngang: Các luồng tính năng (LV3) được dàn ngang bên dưới LV2
            const luongY = Math.round(modY + module.height + MODULE_TO_JOURNEY_GAP)
            let currentLuongX = currentModuleX
            const firstLuongX = currentLuongX

            for (const luong of luongs) {
              luong.x = currentLuongX
              luong.y = luongY
              rawPairs.push({ parent: module, child: luong })

              let luongColMaxRight = luong.x + luong.width

              // LV4 & LV5 xếp dọc: Các màn hình (LV4) và thành phần (LV5) xếp dọc bên dưới LV3
              const screens = luong.children || []
              if (screens.length > 0 && luong.isExpanded) {
                let currentScreenY = luongY + luong.height + VERTICAL_GAP_JOURNEY
                const screenX = luong.x + INDENT_LV4

                for (const screen of screens) {
                  screen.x = screenX
                  screen.y = currentScreenY
                  luongColMaxRight = Math.max(luongColMaxRight, screenX + screen.width)
                  rawPairs.push({ parent: luong, child: screen })

                  const elements = screen.children || []
                  if (elements.length > 0 && screen.isExpanded) {
                    let currentElementY = currentScreenY + screen.height + VERTICAL_GAP_SCREEN
                    const elementX = screenX + INDENT_LV5

                    for (const element of elements) {
                      element.x = elementX
                      element.y = currentElementY
                      luongColMaxRight = Math.max(luongColMaxRight, elementX + element.width)
                      rawPairs.push({ parent: screen, child: element })

                      currentElementY += element.height + VERTICAL_GAP_SCREEN
                    }
                    currentScreenY = currentElementY
                  } else {
                    currentScreenY += screen.height + VERTICAL_GAP_SCREEN
                  }
                }
              }

              const luongWidthInCol = luongColMaxRight - luong.x
              currentLuongX += luongWidthInCol + JOURNEY_GAP
            }

            const totalLuongsWidth = (currentLuongX - JOURNEY_GAP) - firstLuongX

            // "cho tôi chiều ngang lv2 bao trùm cả lv3 như kiểu lv1 nhé"
            if (!module.node.customWidth) {
              if (luongs.length > 1) {
                module.x = firstLuongX
                module.width = Math.max(tierDimensions[2].width, totalLuongsWidth)
              } else {
                const targetWidth = Math.max(tierDimensions[2].width, totalLuongsWidth)
                module.width = targetWidth
                module.x = firstLuongX - (targetWidth - totalLuongsWidth) / 2
              }
            } else {
              module.x = Math.round(firstLuongX + (totalLuongsWidth - module.width) / 2)
            }
            module.y = modY
            currentModuleX = Math.max(module.x + module.width, firstLuongX + totalLuongsWidth) + COLUMN_GAP
          }
        }

        // LV1 (Root) kéo dài phủ toàn bộ các phân hệ LV2 bên dưới
        let minClusterX = Infinity
        let maxClusterRight = -Infinity
        for (const mod of root.children) {
          minClusterX = Math.min(minClusterX, mod.x)
          maxClusterRight = Math.max(maxClusterRight, mod.x + mod.width)
          if (mod.children && mod.isExpanded) {
            for (const l of mod.children) {
              minClusterX = Math.min(minClusterX, l.x)
              maxClusterRight = Math.max(maxClusterRight, l.x + l.width)
              if (l.children && l.isExpanded) {
                for (const s of l.children) {
                  minClusterX = Math.min(minClusterX, s.x)
                  maxClusterRight = Math.max(maxClusterRight, s.x + s.width)
                  if (s.children && s.isExpanded) {
                    for (const e of s.children) {
                      minClusterX = Math.min(minClusterX, e.x)
                      maxClusterRight = Math.max(maxClusterRight, e.x + e.width)
                    }
                  }
                }
              }
            }
          }
        }

        if (root.children.length > 1) {
          root.x = minClusterX
          root.width = Math.max(tierDimensions[1].width, maxClusterRight - minClusterX)
        } else {
          const targetWidth = Math.max(tierDimensions[1].width, maxClusterRight - minClusterX)
          root.width = targetWidth
          root.x = minClusterX - (targetWidth - (maxClusterRight - minClusterX)) / 2
        }

        const clusterMaxRight = Math.max(root.x + root.width, maxClusterRight)
        currentClusterStartX = clusterMaxRight + LV1_GAP
      }

      collectNodes(root)
    }

    // Build fast lookup by node id for resolved layout positions
    const layoutMap = new Map<string, LayoutNode>()
    for (const rn of resultNodes) {
      layoutMap.set(rn.node.id, rn)
    }

    // Precalculate vertical span for each parent's children to position the FigJam trunk handle right at the midpoint
    // Vertical trunks are: LV3 -> LV4 and LV4 -> LV5
    const parentBusSpanMap = new Map<string, { startY: number; maxY: number }>()
    for (const { parent, child } of rawPairs) {
      const pLayout = layoutMap.get(parent.node.id)
      const cLayout = layoutMap.get(child.node.id)
      if (!pLayout || !cLayout) continue
      if ((parent.node.tier === 3 && child.node.tier === 4) || (parent.node.tier === 4 && child.node.tier === 5)) {
        const startY = Math.round(pLayout.y + pLayout.height)
        const targetY = Math.round(cLayout.y + cLayout.height / 2)
        const existing = parentBusSpanMap.get(parent.node.id)
        if (!existing) {
          parentBusSpanMap.set(parent.node.id, { startY, maxY: targetY })
        } else {
          existing.maxY = Math.max(existing.maxY, targetY)
        }
      }
    }
    const handledParentSet = new Set<string>()

    // Precalculate shared LV1 -> LV2 bus line height (forkY) for each LV1 parent
    // All LV2 children under the same LV1 parent share the exact same horizontal bus line!
    const lv1BusYMap = new Map<string, number>()
    for (const { parent, child } of rawPairs) {
      if (parent.node.tier === 1 && child.node.tier === 2) {
        const cLayout = layoutMap.get(child.node.id)
        if (!cLayout) continue
        const childTopY = cLayout.y
        const existing = lv1BusYMap.get(parent.node.id)
        if (existing === undefined) {
          lv1BusYMap.set(parent.node.id, childTopY)
        } else {
          lv1BusYMap.set(parent.node.id, Math.min(existing, childTopY))
        }
      }
    }

    // Precalculate shared LV2 -> LV3 bus line height (forkY) for each LV2 parent
    // All LV3 children under the same LV2 parent share the exact same horizontal bus line!
    const lv2BusYMap = new Map<string, number>()
    for (const { parent, child } of rawPairs) {
      if (parent.node.tier === 2 && child.node.tier === 3) {
        const cLayout = layoutMap.get(child.node.id)
        if (!cLayout) continue
        const childTopY = cLayout.y
        const existing = lv2BusYMap.get(parent.node.id)
        if (existing === undefined) {
          lv2BusYMap.set(parent.node.id, childTopY)
        } else {
          lv2BusYMap.set(parent.node.id, Math.min(existing, childTopY))
        }
      }
    }

    // 3. Generate Orthogonal Trunk-and-Branch Connectors
    const resultConnectors: LayoutConnector[] = []
    for (const { parent, child } of rawPairs) {
      const pLayout = layoutMap.get(parent.node.id)
      const cLayout = layoutMap.get(child.node.id)
      if (!pLayout || !cLayout) continue

      let fromPort: IAPortPosition = "bottom"
      let toPort: IAPortPosition = "left"
      let path = ""
      const r = 8 // Corner fillet radius

      // CASE 1: LV1 (Root) -> LV2 (Module)
      // Fork bus line from bottom-center of LV1, branching across unified bus line and dropping into top-center of LV2
      if (parent.node.tier === 1 && child.node.tier === 2) {
        fromPort = "bottom"
        toPort = "top"
        const p1 = getPortCoord(pLayout.x, pLayout.y, pLayout.width, pLayout.height, "bottom")
        // Offset 2px outside card top border so the arrowhead sits cleanly outside and touches the border without plunging into it
        const p2 = getPortCoord(cLayout.x, cLayout.y, cLayout.width, cLayout.height, "top", 2)

        const minChildTopY = lv1BusYMap.get(parent.node.id) ?? cLayout.y
        // Compute a unified horizontal bus line for all children of this LV1
        const forkY = Math.round(p1.y + Math.max(25, (minChildTopY - p1.y) * 0.45))
        const cornerR = Math.min(10, Math.max(2, Math.abs(p2.x - p1.x) / 2))

        if (Math.abs(p1.x - p2.x) < 4) {
          path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
        } else if (p2.y <= forkY + 15) {
          // Fallback smooth bezier if node was dragged above the shared bus line
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
          const mag = Math.max(25, Math.min(dist * 0.5, 120))
          path = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + mag}, ${p2.x} ${p2.y - mag}, ${p2.x} ${p2.y}`
        } else if (p2.x > p1.x) {
          path = `M ${p1.x} ${p1.y} L ${p1.x} ${forkY - cornerR} Q ${p1.x} ${forkY} ${p1.x + cornerR} ${forkY} L ${p2.x - cornerR} ${forkY} Q ${p2.x} ${forkY} ${p2.x} ${forkY + cornerR} L ${p2.x} ${p2.y}`
        } else {
          path = `M ${p1.x} ${p1.y} L ${p1.x} ${forkY - cornerR} Q ${p1.x} ${forkY} ${p1.x - cornerR} ${forkY} L ${p2.x + cornerR} ${forkY} Q ${p2.x} ${forkY} ${p2.x} ${forkY + cornerR} L ${p2.x} ${p2.y}`
        }

        resultConnectors.push({
          id: `conn-${parent.node.id}-${child.node.id}`,
          parentId: parent.node.id,
          childId: child.node.id,
          x1: Number(p1.x.toFixed(2)),
          y1: Number(p1.y.toFixed(2)),
          x2: Number(p2.x.toFixed(2)),
          y2: Number(p2.y.toFixed(2)),
          fromPort,
          toPort,
          path,
          colorTheme: parent.node.colorTheme || child.node.colorTheme,
          isHighlighted: pLayout.isHighlighted || cLayout.isHighlighted,
        })
        continue
      }

      // CASE 2: LV2 (Module) -> LV3 (Feature Journey)
      // LV3 is now HORIZONTAL (xếp ngang)!
      // Fork bus line from bottom-center of LV2, branching across unified bus line and dropping into top-center of LV3
      if (parent.node.tier === 2 && child.node.tier === 3) {
        fromPort = "bottom"
        toPort = "top"
        const p1 = getPortCoord(pLayout.x, pLayout.y, pLayout.width, pLayout.height, "bottom")
        // Offset 2px outside card top border so the arrowhead sits cleanly outside and touches the border without plunging into it
        const p2 = getPortCoord(cLayout.x, cLayout.y, cLayout.width, cLayout.height, "top", 2)

        const minChildTopY = lv2BusYMap.get(parent.node.id) ?? cLayout.y
        // Compute a unified horizontal bus line for all LV3 children of this LV2
        const forkY = Math.round(p1.y + Math.max(25, (minChildTopY - p1.y) * 0.45))
        const cornerR = Math.min(10, Math.max(2, Math.abs(p2.x - p1.x) / 2))

        if (Math.abs(p1.x - p2.x) < 4) {
          path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
        } else if (p2.y <= forkY + 15) {
          // Fallback smooth bezier if node was dragged above the shared bus line
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
          const mag = Math.max(25, Math.min(dist * 0.5, 120))
          path = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + mag}, ${p2.x} ${p2.y - mag}, ${p2.x} ${p2.y}`
        } else if (p2.x > p1.x) {
          path = `M ${p1.x} ${p1.y} L ${p1.x} ${forkY - cornerR} Q ${p1.x} ${forkY} ${p1.x + cornerR} ${forkY} L ${p2.x - cornerR} ${forkY} Q ${p2.x} ${forkY} ${p2.x} ${forkY + cornerR} L ${p2.x} ${p2.y}`
        } else {
          path = `M ${p1.x} ${p1.y} L ${p1.x} ${forkY - cornerR} Q ${p1.x} ${forkY} ${p1.x - cornerR} ${forkY} L ${p2.x + cornerR} ${forkY} Q ${p2.x} ${forkY} ${p2.x} ${forkY + cornerR} L ${p2.x} ${p2.y}`
        }

        resultConnectors.push({
          id: `conn-${parent.node.id}-${child.node.id}`,
          parentId: parent.node.id,
          childId: child.node.id,
          x1: Number(p1.x.toFixed(2)),
          y1: Number(p1.y.toFixed(2)),
          x2: Number(p2.x.toFixed(2)),
          y2: Number(p2.y.toFixed(2)),
          fromPort,
          toPort,
          path,
          colorTheme: parent.node.colorTheme || child.node.colorTheme,
          isHighlighted: pLayout.isHighlighted || cLayout.isHighlighted,
        })
        continue
      }

      // CASE 3: LV3 (Feature Journey) -> LV4 (Touchpoint Screen)
      // Trunk drops down from bottom-left of LV3, elbows right (└─>) into exact vertical center of left edge of LV4
      if (parent.node.tier === 3 && child.node.tier === 4) {
        fromPort = "bottom"
        toPort = "left"
        const defaultOffset = 20
        const offset = parent.node.customTrunkOffset ?? defaultOffset
        const subTrunkX = Math.round(pLayout.x + offset)
        const startY = Math.round(pLayout.y + pLayout.height)
        const targetY = Math.round(cLayout.y + cLayout.height / 2)
        // Offset 2px outside left border so arrowhead sits cleanly outside
        const targetX = Math.round(cLayout.x - 2)

        if (targetX >= subTrunkX + r && targetY >= startY + r) {
          path = `M ${subTrunkX} ${startY} L ${subTrunkX} ${targetY - r} Q ${subTrunkX} ${targetY} ${subTrunkX + r} ${targetY} L ${targetX} ${targetY}`
        } else {
          // Fallback if custom-dragged
          path = `M ${subTrunkX} ${startY} C ${subTrunkX} ${targetY}, ${targetX - 25} ${targetY}, ${targetX} ${targetY}`
        }

        let trunkHandle: LayoutConnector["trunkHandle"] = undefined
        if (!handledParentSet.has(parent.node.id)) {
          handledParentSet.add(parent.node.id)
          const span = parentBusSpanMap.get(parent.node.id)
          const handleY = span ? Math.round((span.startY + span.maxY) / 2) : Math.round((startY + targetY) / 2)
          trunkHandle = {
            x: subTrunkX,
            y: handleY,
            parentId: parent.node.id,
            currentOffset: offset,
          }
        }

        resultConnectors.push({
          id: `conn-${parent.node.id}-${child.node.id}`,
          parentId: parent.node.id,
          childId: child.node.id,
          x1: subTrunkX,
          y1: startY,
          x2: targetX,
          y2: targetY,
          fromPort,
          toPort,
          path,
          colorTheme: parent.node.colorTheme || child.node.colorTheme,
          isHighlighted: pLayout.isHighlighted || cLayout.isHighlighted,
          trunkHandle,
        })
        continue
      }

      // CASE 3B: LV4 (Touchpoint Screen) -> LV5 (Components & Elements)
      // Trunk drops down from bottom-left of LV4, elbows right (└─>) into exact vertical center of left edge of LV5
      if (parent.node.tier === 4 && child.node.tier === 5) {
        fromPort = "bottom"
        toPort = "left"
        const defaultOffset = 18
        const offset = parent.node.customTrunkOffset ?? defaultOffset
        const subTrunkX = Math.round(pLayout.x + offset)
        const startY = Math.round(pLayout.y + pLayout.height)
        const targetY = Math.round(cLayout.y + cLayout.height / 2)
        const targetX = Math.round(cLayout.x - 2)

        if (targetX >= subTrunkX + r && targetY >= startY + r) {
          path = `M ${subTrunkX} ${startY} L ${subTrunkX} ${targetY - r} Q ${subTrunkX} ${targetY} ${subTrunkX + r} ${targetY} L ${targetX} ${targetY}`
        } else {
          path = `M ${subTrunkX} ${startY} C ${subTrunkX} ${targetY}, ${targetX - 25} ${targetY}, ${targetX} ${targetY}`
        }

        let trunkHandle: LayoutConnector["trunkHandle"] = undefined
        if (!handledParentSet.has(parent.node.id)) {
          handledParentSet.add(parent.node.id)
          const span = parentBusSpanMap.get(parent.node.id)
          const handleY = span ? Math.round((span.startY + span.maxY) / 2) : Math.round((startY + targetY) / 2)
          trunkHandle = {
            x: subTrunkX,
            y: handleY,
            parentId: parent.node.id,
            currentOffset: offset,
          }
        }

        resultConnectors.push({
          id: `conn-${parent.node.id}-${child.node.id}`,
          parentId: parent.node.id,
          childId: child.node.id,
          x1: subTrunkX,
          y1: startY,
          x2: targetX,
          y2: targetY,
          fromPort,
          toPort,
          path,
          colorTheme: parent.node.colorTheme || child.node.colorTheme,
          isHighlighted: pLayout.isHighlighted || cLayout.isHighlighted,
          trunkHandle,
        })
        continue
      }

      // CASE 4: General Smart Bezier for arbitrary custom nodes or manual wire connections
      const pcx = pLayout.x + pLayout.width / 2
      const pcy = pLayout.y + pLayout.height / 2
      const ccx = cLayout.x + cLayout.width / 2
      const ccy = cLayout.y + cLayout.height / 2
      const dx = ccx - pcx
      const dy = ccy - pcy

      if (Math.abs(dx) >= Math.abs(dy)) {
        fromPort = dx >= 0 ? "right" : "left"
        toPort = dx >= 0 ? "left" : "right"
      } else {
        fromPort = dy >= 0 ? "bottom" : "top"
        toPort = dy >= 0 ? "top" : "bottom"
      }

      const p1 = getPortCoord(pLayout.x, pLayout.y, pLayout.width, pLayout.height, fromPort)
      // Offset 2px outside target port border
      const p2 = getPortCoord(cLayout.x, cLayout.y, cLayout.width, cLayout.height, toPort, 2)
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const mag = Math.max(25, Math.min(dist * 0.5, 120))
      const t1 = getPortTangent(fromPort, mag)
      const t2 = getPortTangent(toPort, mag)
      const cp1x = Number((p1.x + t1.vx).toFixed(2))
      const cp1y = Number((p1.y + t1.vy).toFixed(2))
      const cp2x = Number((p2.x + t2.vx).toFixed(2))
      const cp2y = Number((p2.y + t2.vy).toFixed(2))
      path = `M ${Number(p1.x.toFixed(2))} ${Number(p1.y.toFixed(2))} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${Number(p2.x.toFixed(2))} ${Number(p2.y.toFixed(2))}`

      resultConnectors.push({
        id: `conn-${parent.node.id}-${child.node.id}`,
        parentId: parent.node.id,
        childId: child.node.id,
        x1: Number(p1.x.toFixed(2)),
        y1: Number(p1.y.toFixed(2)),
        x2: Number(p2.x.toFixed(2)),
        y2: Number(p2.y.toFixed(2)),
        fromPort,
        toPort,
        path,
        colorTheme: parent.node.colorTheme || child.node.colorTheme,
        isHighlighted: pLayout.isHighlighted || cLayout.isHighlighted,
      })
    }

    // 4. Compute Bounding Box
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const n of resultNodes) {
      if (n.x < minX) minX = n.x
      if (n.y < minY) minY = n.y
      if (n.x + n.width > maxX) maxX = n.x + n.width
      if (n.y + n.height > maxY) maxY = n.y + n.height
    }

    if (resultNodes.length === 0) {
      minX = 0
      minY = 0
      maxX = 800
      maxY = 600
    }

    // Keep layoutNodesRef in sync with latest visual layout
    layoutNodesRef.current = resultNodes

    return {
      layoutNodes: resultNodes,
      connectors: resultConnectors,
      bounds: { minX, minY, maxX, maxY },
    }
  }, [rootNodes, searchResult, tierDimensions])

  // Sync entire IA trees to Google Sheet Cloud (RAW_SETTINGS)
  const syncCloud = useCallback(async () => {
    try {
      const res = await syncMasterDataToSheet({ ia_trees: trees })
      return res
    } catch (err: any) {
      return { success: false, message: err?.message || "Lỗi đồng bộ Google Sheet" }
    }
  }, [trees])

  // Pull latest IA trees from Google Sheet Cloud
  const pullCloud = useCallback(async () => {
    try {
      const res = await fetchMasterDataFromSheet()
      if (res.success && res.data?.ia_trees) {
        let loadedTrees = res.data.ia_trees
        if (typeof loadedTrees === "string") {
          try {
            loadedTrees = JSON.parse(loadedTrees)
          } catch (e) {
            console.warn("Failed to parse ia_trees string from cloud", e)
          }
        }
        if (typeof loadedTrees === "object" && loadedTrees !== null) {
          setTrees((prev) => {
            const updated = { ...prev, ...loadedTrees }
            saveTreesToStorage(updated)
            return updated
          })
          return { success: true, message: "Đã tải cấu trúc IA mới nhất từ Google Sheet!" }
        }
      }
      return { success: false, message: res.message || "Không có dữ liệu IA trên Cloud" }
    } catch (err: any) {
      return { success: false, message: err?.message || "Lỗi tải dữ liệu Cloud" }
    }
  }, [])

  // Import Entire Tree / Multiple Trees for selected product
  const importTree = useCallback((imported: IANode | IANode[]) => {
    setTrees((prevTrees) => {
      let rootToSave: IANode
      if (Array.isArray(imported)) {
        if (imported.length === 0) return prevTrees
        const [primary, ...siblings] = imported
        rootToSave = {
          ...deepCloneTree(primary),
          siblingRoots: siblings.map(deepCloneTree),
        }
      } else {
        rootToSave = deepCloneTree(imported)
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: rootToSave }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId])

  return {
    activeTree,
    rootNodes,
    products,
    selectedProductId,
    setSelectedProductId,
    toggleCollapse,
    addChildNode,
    addRootNode,
    addChildInDirection,
    connectNodes,
    createConnectedNodeAt,
    updateNode,
    updateNodePosition,
    updateMultipleNodePositions,
    updateNodeDimensions,
    updateTrunkOffset,
    autoAlignTree,
    deleteNode,
    resetToDefault,
    searchQuery,
    setSearchQuery,
    searchResult,
    layoutNodes,
    connectors,
    bounds,
    metrics,
    findNode,
    requestsMap,
    trees,
    syncCloud,
    pullCloud,
    tierDimensions,
    setTierDimensions,
    importTree,
  }
}
