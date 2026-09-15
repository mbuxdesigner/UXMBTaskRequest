import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { IANode, IAProductInfo, IATier, IATouchpointType, IAPortPosition } from "@/types/ia"
import { IA_PRODUCTS, DEFAULT_IA_TREES, getProductMetrics } from "@/data/iaMockData"
import { mockRequests, UXRequest } from "@/data/mockData"

export const IA_STORAGE_KEY = "ux_portal_ia_tree_data_v4"

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
  fromPort: IAPortPosition
  toPort: IAPortPosition
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
  updateNodeDimensions: (nodeId: string, width: number, height: number, persist?: boolean) => void
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
    // Clean migration: if loaded trees contain old auto-generated demo nodes, reset to clean defaults
    const appTree = parsed.trees["app-mbbank"]
    if (appTree && appTree.children && appTree.children.some((c: IANode) => c.id?.includes("node-app-mb-d1-core") || c.id?.includes("node-app-mb-s1"))) {
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
  1: { width: 280, height: 125, x: 40 },
  2: { width: 270, height: 165, x: 370 },
  3: { width: 260, height: 175, x: 690 },
  4: { width: 250, height: 185, x: 1000 },
}
const VERTICAL_GAP = 36

export function useIATreeState(initialProductId: string = "app-mbbank"): UseIATreeStateReturn {
  const [products] = useState<IAProductInfo[]>(IA_PRODUCTS)
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId)
  const [trees, setTrees] = useState<Record<string, IANode>>(() => loadSavedTrees())
  const [searchQuery, setSearchQuery] = useState<string>("")
  const layoutNodesRef = useRef<LayoutNode[]>([])

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
            squad: nodeData.squad,
            taskIds: nodeData.taskIds,
            hasActiveTask: nodeData.hasActiveTask,
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
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
      if (current.id === nodeId) {
        throw new Error("Cannot delete Tier 1 Product Root node")
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
      lockPositions(clone)

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

  // Update Node Custom Position (from Canvas Drag & Drop)
  // When persist is false (during live dragging), performs an ultra-fast copy-on-write update without synchronous localStorage writes.
  // When persist is true (on drag release), commits to localStorage once.
  const updateNodePosition = useCallback((nodeId: string, x: number, y: number, persist: boolean = true) => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]

      function updateNodeInTree(node: IANode): IANode {
        if (node.id === nodeId) {
          return {
            ...node,
            customX: Math.round(x),
            customY: Math.round(y),
          }
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
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      if (persist) {
        saveTreesToStorage(nextTrees)
      }
      return nextTrees
    })
  }, [selectedProductId])

  // Update Node Dimensions (from Canvas Interactive Resize)
  const updateNodeDimensions = useCallback((nodeId: string, width: number, height: number, persist: boolean = true) => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]

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
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      if (persist) {
        saveTreesToStorage(nextTrees)
      }
      return nextTrees
    })
  }, [selectedProductId])

  // Auto-align Tree: clears custom positions to restore computed tidy tree
  const autoAlignTree = useCallback(() => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
      const clone = deepCloneTree(current)

      function dfs(curr: IANode) {
        delete curr.customX
        delete curr.customY
        if (curr.children) {
          for (const child of curr.children) {
            dfs(child)
          }
        }
      }

      dfs(clone)
      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId])

  // Add child in specific port direction (Top, Bottom, Left, Right)
  const addChildInDirection = useCallback((parentId: string, direction: IAPortPosition, nodeData?: Partial<IANode>) => {
    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
      const clone = deepCloneTree(current)

      function dfs(curr: IANode): boolean {
        if (curr.id === parentId) {
          curr.collapsed = false
          const nextTier = Math.min(4, curr.tier + 1) as IATier
          const newId = nodeData?.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

          let offsetX = 300
          let offsetY = 0
          if (direction === "bottom") {
            offsetX = 0
            offsetY = 130
          } else if (direction === "top") {
            offsetX = 0
            offsetY = -130
          } else if (direction === "left") {
            offsetX = -300
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
            children: nextTier < 4 ? [] : undefined,
          }

          if (curr.customX !== undefined && curr.customY !== undefined) {
            newNode.customX = curr.customX + offsetX
            newNode.customY = curr.customY + offsetY
          }

          if (!curr.children) curr.children = []
          curr.children.push(newNode)
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

  // Connect two existing nodes (sourceNode -> targetNode)
  const connectNodes = useCallback((sourceNodeId: string, targetNodeId: string) => {
    if (sourceNodeId === targetNodeId) return

    setTrees((prevTrees) => {
      const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
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
      function attach(curr: IANode): boolean {
        if (curr.id === sourceNodeId) {
          curr.collapsed = false
          if (!curr.children) curr.children = []
          const nodeToAttach = detachedNode!
          nodeToAttach.parentId = curr.id
          nodeToAttach.tier = Math.min(4, curr.tier + 1) as IATier
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

      const nextTrees = { ...prevTrees, [selectedProductId]: clone }
      saveTreesToStorage(nextTrees)
      return nextTrees
    })
  }, [selectedProductId])

  // Create new node connected to sourceNode at drop position (customX, customY)
  const createConnectedNodeAt = useCallback(
    (
      sourceNodeId: string,
      position: { x: number; y: number },
      sourcePort: IAPortPosition,
      nodeData?: Partial<IANode>
    ) => {
      setTrees((prevTrees) => {
        const current = prevTrees[selectedProductId] || DEFAULT_IA_TREES[selectedProductId]
        const clone = deepCloneTree(current)

        function dfs(curr: IANode): boolean {
          if (curr.id === sourceNodeId) {
            curr.collapsed = false
            const nextTier = Math.min(4, curr.tier + 1) as IATier
            const newId = nodeData?.id || `node-wire-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

            const defaultName =
              nextTier === 4
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
              children: nextTier < 4 ? [] : undefined,
            }

            if (!curr.children) curr.children = []
            curr.children.push(newNode)
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
    },
    [selectedProductId]
  )

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
      const nodeWidth = node.customWidth || dim.width
      const nodeHeight = node.customHeight || dim.height
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
      let subtreeHeight = nodeHeight + VERTICAL_GAP
      if (children.length > 0) {
        const childrenHeight = children.reduce((sum, c) => sum + c.subtreeHeight, 0)
        subtreeHeight = Math.max(nodeHeight + VERTICAL_GAP, childrenHeight)
      }

      return {
        node,
        width: nodeWidth,
        height: nodeHeight,
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

    // Helper to calculate port anchor coordinates
    function getPortCoord(
      x: number,
      y: number,
      width: number,
      height: number,
      port: IAPortPosition
    ): { x: number; y: number } {
      switch (port) {
        case "top":
          return { x: x + width / 2, y }
        case "bottom":
          return { x: x + width / 2, y: y + height }
        case "left":
          return { x, y: y + height / 2 }
        case "right":
          return { x: x + width, y: y + height / 2 }
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

    // 2. Second pass: Calculate Non-Overlapping Staggered Multi-Column Hierarchy Positions
    // - lv1 (Root): Centered at the top (START_Y = 40)
    // - lv2 (Modules): Arranged horizontally across columns at MODULES_TOP_Y = 220
    // - lv3 (Journeys): Shifted to the right of Module (GAP_X = 80px)
    // - lv4 (Screens): Shifted to the right of Journey (GAP_X = 80px), stacked vertically
    // Guarantees ZERO card overlaps horizontally and vertically
    const resultNodes: LayoutNode[] = []
    const rawPairs: { parent: InternalNode; child: InternalNode }[] = []

    const START_X = 60
    const START_Y = 40
    const MODULES_TOP_Y = 220
    const GAP_X = 80
    const MODULE_GAP_X = 120
    const VERTICAL_GAP_SCREEN = 36
    const VERTICAL_GAP_SECTION = 50

    const root = rootInternal
    root.y = START_Y

    if (root.children.length === 0 || !root.isExpanded) {
      root.x = START_X
    } else {
      let currentModuleX = START_X

      for (const module of root.children) {
        const modX = currentModuleX
        const modY = MODULES_TOP_Y

        module.x = modX
        module.y = modY

        rawPairs.push({ parent: root, child: module })

        const luongs = module.children
        let maxClusterWidth = module.width

        if (luongs.length > 0 && module.isExpanded) {
          const luongX = modX + module.width + GAP_X
          const screenX = luongX + (TIER_DIMENSIONS[3]?.width || 240) + GAP_X

          maxClusterWidth = Math.max(maxClusterWidth, module.width + GAP_X + (TIER_DIMENSIONS[3]?.width || 240))

          let currentLuongY = MODULES_TOP_Y

          for (const luong of luongs) {
            luong.x = luongX
            luong.y = currentLuongY

            rawPairs.push({ parent: module, child: luong })

            const screens = luong.children
            let screenStartY = currentLuongY

            if (screens.length > 0 && luong.isExpanded) {
              maxClusterWidth = Math.max(
                maxClusterWidth,
                module.width + GAP_X + (TIER_DIMENSIONS[3]?.width || 240) + GAP_X + (TIER_DIMENSIONS[4]?.width || 230)
              )

              for (const screen of screens) {
                screen.x = screenX
                screen.y = screenStartY

                rawPairs.push({ parent: luong, child: screen })

                screenStartY += screen.height + VERTICAL_GAP_SCREEN
              }
            }

            const screensSpan = screens.length > 0 && luong.isExpanded
              ? (screenStartY - currentLuongY - VERTICAL_GAP_SCREEN)
              : 0
            const sectionHeight = Math.max(luong.height, screensSpan)

            currentLuongY += sectionHeight + VERTICAL_GAP_SECTION
          }
        }

        currentModuleX += maxClusterWidth + MODULE_GAP_X
      }

      // Center root horizontally across all clusters
      const totalWidth = (currentModuleX - MODULE_GAP_X) - START_X
      root.x = Math.max(START_X, START_X + Math.round((totalWidth - root.width) / 2))
    }

    // Collect all nodes and apply custom coordinates if arranged by user
    function collectNodes(item: InternalNode) {
      const finalX = item.node.customX !== undefined ? item.node.customX : item.x
      const finalY = item.node.customY !== undefined ? item.node.customY : Number(item.y.toFixed(2))
      const isHighlighted = matchedIds.has(item.node.id)

      resultNodes.push({
        node: item.node,
        x: finalX,
        y: finalY,
        width: item.node.customWidth || item.width,
        height: item.node.customHeight || item.height,
        subtreeHeight: item.subtreeHeight,
        isCollapsed: item.isCollapsed,
        isExpanded: item.isExpanded,
        hasChildren: item.hasChildren,
        childCount: item.childCount,
        isVisible: true,
        isHighlighted,
      })

      for (const child of item.children) {
        collectNodes(child)
      }
    }

    collectNodes(root)

    // Build fast lookup by node id for resolved layout positions
    const layoutMap = new Map<string, LayoutNode>()
    for (const rn of resultNodes) {
      layoutMap.set(rn.node.id, rn)
    }

    // 3. Generate 4-Way Smart Connectors between Ports
    const resultConnectors: LayoutConnector[] = []
    for (const { parent, child } of rawPairs) {
      const pLayout = layoutMap.get(parent.node.id)
      const cLayout = layoutMap.get(child.node.id)
      if (!pLayout || !cLayout) continue

      // Parent center & Child center
      const pcx = pLayout.x + pLayout.width / 2
      const pcy = pLayout.y + pLayout.height / 2
      const ccx = cLayout.x + cLayout.width / 2
      const ccy = cLayout.y + cLayout.height / 2

      const dx = ccx - pcx
      const dy = ccy - pcy

      // Select ports based on relative positioning
      let fromPort: IAPortPosition
      let toPort: IAPortPosition

      // Root (Tier 1) connects to Modules (Tier 2): always bottom to top
      if (parent.node.tier === 1) {
        fromPort = "bottom"
        toPort = "top"
      } else if (cLayout.x >= pLayout.x + pLayout.width / 2) {
        // Child is stepped to the right (Module -> Luồng, or Luồng -> Screen)
        fromPort = "right"
        toPort = "left"
      } else if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx >= 0) {
          fromPort = "right"
          toPort = "left"
        } else {
          fromPort = "left"
          toPort = "right"
        }
      } else {
        if (dy >= 0) {
          fromPort = "bottom"
          toPort = "top"
        } else {
          fromPort = "top"
          toPort = "bottom"
        }
      }

      const p1 = getPortCoord(pLayout.x, pLayout.y, pLayout.width, pLayout.height, fromPort)
      const p2 = getPortCoord(cLayout.x, cLayout.y, cLayout.width, cLayout.height, toPort)

      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const mag = Math.max(30, Math.min(dist * 0.5, 120))
      const t1 = getPortTangent(fromPort, mag)
      const t2 = getPortTangent(toPort, mag)

      const cp1x = Number((p1.x + t1.vx).toFixed(2))
      const cp1y = Number((p1.y + t1.vy).toFixed(2))
      const cp2x = Number((p2.x + t2.vx).toFixed(2))
      const cp2y = Number((p2.y + t2.vy).toFixed(2))

      const path = `M ${Number(p1.x.toFixed(2))} ${Number(p1.y.toFixed(2))} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${Number(p2.x.toFixed(2))} ${Number(p2.y.toFixed(2))}`

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
  }, [activeTree, searchResult])

  return {
    activeTree,
    products,
    selectedProductId,
    setSelectedProductId,
    toggleCollapse,
    addChildNode,
    addChildInDirection,
    connectNodes,
    createConnectedNodeAt,
    updateNode,
    updateNodePosition,
    updateNodeDimensions,
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
  }
}
