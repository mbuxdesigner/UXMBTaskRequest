import { useState, useMemo, useCallback, useEffect } from "react"
import { IANode, IAProductInfo, IATier, IATouchpointType } from "@/types/ia"
import { IA_PRODUCTS, DEFAULT_IA_TREES, getProductMetrics } from "@/data/iaMockData"
import { mockRequests, UXRequest } from "@/data/mockData"

export const IA_STORAGE_KEY = "ux_portal_ia_tree_data_v1"

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
}

export interface LayoutConnector {
  id: string
  parentId: string
  childId: string
  x1: number
  y1: number
  x2: number
  y2: number
  path: string
  colorTheme?: string
  isHighlighted?: boolean
}

export interface UseIATreeStateReturn {
  activeTree: IANode
  products: IAProductInfo[]
  selectedProductId: string
  setSelectedProductId: (id: string) => void
  toggleCollapse: (nodeId: string) => void
  addChildNode: (parentId: string, nodeData: Partial<IANode>) => void
  updateNode: (nodeId: string, nodeData: Partial<IANode>) => void
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
}

// Helper: Deep Clone Tree
export function deepCloneTree(node: IANode): IANode {
  return JSON.parse(JSON.stringify(node))
}

// Helper: Deep Clone All Trees
export function deepCloneAllTrees(trees: Record<string, IANode>): Record<string, IANode> {
  return JSON.parse(JSON.stringify(trees))
}

// Helper: Load from localStorage safely
export function loadSavedTrees(): Record<string, IANode> {
  if (typeof window === "undefined" || !window.localStorage) {
    return deepCloneAllTrees(DEFAULT_IA_TREES)
  }
  try {
    const raw = window.localStorage.getItem(IA_STORAGE_KEY)
    if (!raw || typeof raw !== "string" || raw.trim() === "") {
      return deepCloneAllTrees(DEFAULT_IA_TREES)
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || !parsed.trees) {
      return deepCloneAllTrees(DEFAULT_IA_TREES)
    }
    return parsed.trees
  } catch (err) {
    console.warn("Storage parse error, resetting to seed defaults:", err)
    return deepCloneAllTrees(DEFAULT_IA_TREES)
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

// Layout Dimensions per Tier
const TIER_DIMENSIONS: Record<IATier, { width: number; height: number; x: number }> = {
  1: { width: 260, height: 90, x: 40 },
  2: { width: 250, height: 84, x: 340 },
  3: { width: 240, height: 80, x: 640 },
  4: { width: 230, height: 76, x: 940 },
}
const VERTICAL_GAP = 24

export function useIATreeState(initialProductId: string = "app-mbbank"): UseIATreeStateReturn {
  const [products] = useState<IAProductInfo[]>(IA_PRODUCTS)
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId)
  const [trees, setTrees] = useState<Record<string, IANode>>(() => loadSavedTrees())
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Active Tree for current product
  const activeTree: IANode = useMemo(() => {
    return trees[selectedProductId] || trees["app-mbbank"] || DEFAULT_IA_TREES["app-mbbank"]
  }, [trees, selectedProductId])

  // Mock Requests indexed by request_id
  const requestsMap = useMemo(() => {
    const map = new Map<string, UXRequest>()
    for (const req of mockRequests) {
      map.set(req.request_id, req)
    }
    return map
  }, [])

  // Find node helper
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
    return dfs(activeTree)
  }, [activeTree])

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
    indexTree(activeTree)

    for (const [id, node] of nodeMap.entries()) {
      const linkedReq = node.requestId ? requestsMap.get(node.requestId) : undefined

      const nameMatch = Boolean(node.name && node.name.toLowerCase().includes(normalized))
      const codeMatch = Boolean(node.code && node.code.toLowerCase().includes(normalized))
      const descMatch = Boolean(node.description && node.description.toLowerCase().includes(normalized))
      const taskIdMatch = Boolean(node.requestId && node.requestId.toLowerCase().includes(normalized))
      const taskTitleMatch = Boolean(linkedReq?.title && linkedReq.title.toLowerCase().includes(normalized))
      const designerMatch = Boolean(
        (node.assignedDesigner && node.assignedDesigner.toLowerCase().includes(normalized)) ||
        (linkedReq?.assigned_designer && linkedReq.assigned_designer.toLowerCase().includes(normalized))
      )

      if (nameMatch || codeMatch || descMatch || taskIdMatch || taskTitleMatch || designerMatch) {
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
  }, [activeTree, searchQuery, requestsMap])

  // Toggle Collapse on a Node
  const toggleCollapse = useCallback((nodeId: string) => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
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

      dfs(clone)
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId])

  // Add Child Node
  const addChildNode = useCallback((parentId: string, nodeData: Partial<IANode>) => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
      const clone = deepCloneTree(current)
      let created = false

      function dfs(curr: IANode): boolean {
        if (curr.id === parentId) {
          if (curr.tier >= 4) {
            throw new Error("Cannot add child node to Tier 4 leaf screen")
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
            requestId: nodeData.requestId,
            touchpointType: nextTier === 4 ? (nodeData.touchpointType || "screen") : undefined,
            children: nextTier < 4 ? [] : undefined,
            colorTheme: curr.colorTheme,
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

      const found = dfs(clone)
      if (!found || !created) {
        throw new Error(`Parent node with id "${parentId}" not found`)
      }

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId])

  // Update Node
  const updateNode = useCallback((nodeId: string, nodeData: Partial<IANode>) => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
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
          if ("requestId" in nodeData) curr.requestId = nodeData.requestId
          if ("figmaUrl" in nodeData) curr.figmaUrl = nodeData.figmaUrl
          if ("touchpointType" in nodeData && curr.tier === 4) {
            curr.touchpointType = nodeData.touchpointType as IATouchpointType
          }
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
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId])

  // Delete Node
  const deleteNode = useCallback((nodeId: string) => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
      if (current.id === nodeId) {
        throw new Error("Cannot delete Tier 1 Product Root node")
      }
      const clone = deepCloneTree(current)

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

      dfs(clone)
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId])

  // Reset to Default
  const resetToDefault = useCallback(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(IA_STORAGE_KEY)
      } catch (e) {
        console.warn("Could not clear localStorage:", e)
      }
    }
    setTrees(deepCloneAllTrees(DEFAULT_IA_TREES))
  }, [])

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

  // Compute Metrics
  const metrics = useMemo(() => {
    return getProductMetrics(activeTree)
  }, [activeTree])

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
      const dim = TIER_DIMENSIONS[node.tier] || { width: 220, height: 76, x: 40 }
      const hasChildren = Boolean(node.children && node.children.length > 0)
      const childCount = node.children ? node.children.length : 0

      // Node is forced expanded if it's an ancestor of a search match
      const forceExpanded = ancestorIdsToExpand.has(node.id)
      const isCollapsed = forceExpanded ? false : Boolean(node.collapsed)
      const isExpanded = hasChildren && !isCollapsed

      const children: InternalNode[] = []
      if (hasChildren && isExpanded) {
        for (const child of node.children!) {
          children.push(buildInternal(child))
        }
      }

      // Compute subtree height
      let subtreeHeight = dim.height + VERTICAL_GAP
      if (children.length > 0) {
        const childrenHeight = children.reduce((sum, c) => sum + c.subtreeHeight, 0)
        subtreeHeight = Math.max(dim.height + VERTICAL_GAP, childrenHeight)
      }

      return {
        node,
        width: dim.width,
        height: dim.height,
        x: dim.x,
        y: 0,
        subtreeHeight,
        isCollapsed,
        isExpanded,
        hasChildren,
        childCount,
        children,
      }
    }

    const rootInternal = buildInternal(activeTree)

    // 2. Second pass: Calculate absolute Y positions
    const resultNodes: LayoutNode[] = []
    const resultConnectors: LayoutConnector[] = []

    function positionNode(item: InternalNode, topY: number) {
      if (item.children.length === 0) {
        item.y = topY + (item.subtreeHeight - item.height) / 2
      } else {
        let currentChildTop = topY
        for (const child of item.children) {
          positionNode(child, currentChildTop)
          currentChildTop += child.subtreeHeight
        }
        const firstChild = item.children[0]
        const lastChild = item.children[item.children.length - 1]
        item.y = (firstChild.y + lastChild.y) / 2
      }

      const isHighlighted = matchedIds.has(item.node.id)

      resultNodes.push({
        node: item.node,
        x: item.x,
        y: Number(item.y.toFixed(2)),
        width: item.width,
        height: item.height,
        subtreeHeight: item.subtreeHeight,
        isCollapsed: item.isCollapsed,
        isExpanded: item.isExpanded,
        hasChildren: item.hasChildren,
        childCount: item.childCount,
        isVisible: true,
        isHighlighted,
      })

      // Generate connectors to visible children
      for (const child of item.children) {
        const x1 = item.x + item.width
        const y1 = Number((item.y + item.height / 2).toFixed(2))
        const x2 = child.x
        const y2 = Number((child.y + child.height / 2).toFixed(2))
        const dx = x2 - x1
        const offset = Math.max(40, dx / 2)
        const path = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`

        resultConnectors.push({
          id: `conn-${item.node.id}-${child.node.id}`,
          parentId: item.node.id,
          childId: child.node.id,
          x1,
          y1,
          x2,
          y2,
          path,
          colorTheme: item.node.colorTheme || child.node.colorTheme,
          isHighlighted: isHighlighted || matchedIds.has(child.node.id),
        })
      }
    }

    positionNode(rootInternal, 40)

    // 3. Compute Bounding Box
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

    return {
      layoutNodes: resultNodes,
      connectors: resultConnectors,
      bounds: { minX, minY, maxX, maxY },
    }
  }, [activeTree, searchResult])

  return {
    activeTree,
    products,
    selectedProductId,
    setSelectedProductId,
    toggleCollapse,
    addChildNode,
    updateNode,
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
  }
}
