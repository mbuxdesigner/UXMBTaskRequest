import type { IANode, IAProductInfo, IATier } from "@/types/ia"

function getTaskLinkNodeDisplaySettings(tier: IATier) {
  return {
    allowDirectTasks: tier >= 3,
    showProgress: true,
    rollupProgress: tier <= 3,
    showSquad: tier >= 2,
    showDesigner: tier >= 3,
    showStatus: true,
    showBranchCount: tier <= 3,
  }
}

export interface IATaskLinkMatch {
  productId: string
  node: IANode
  path: IANode[]
}

export function normalizeIAMatchValue(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function getIAProductRoots(tree?: IANode | null): IANode[] {
  if (!tree) return []
  return [tree, ...(tree.siblingRoots || [])]
}

export function resolveIAProductId(
  products: IAProductInfo[],
  trees: Record<string, IANode>,
  taskProduct?: string | null,
): string | null {
  const target = normalizeIAMatchValue(taskProduct)
  if (!target) return null

  const exact = products.find((product) => {
    const candidates = [product.id, product.name, product.code].map(
      normalizeIAMatchValue,
    )
    return candidates.includes(target)
  })
  if (exact && trees[exact.id]) return exact.id

  const partial = products.find((product) => {
    const candidates = [product.id, product.name, product.code].map(
      normalizeIAMatchValue,
    )
    return candidates.some(
      (candidate) =>
        candidate && (candidate.includes(target) || target.includes(candidate)),
    )
  })
  if (partial && trees[partial.id]) return partial.id

  const directKey = Object.keys(trees).find(
    (key) => normalizeIAMatchValue(key) === target,
  )
  return directKey || null
}

export function findTaskIALink(
  trees: Record<string, IANode>,
  requestId: string,
): IATaskLinkMatch | null {
  const cleanRequestId = requestId.trim().toLowerCase()
  if (!cleanRequestId) return null

  for (const [productId, tree] of Object.entries(trees)) {
    for (const root of getIAProductRoots(tree)) {
      const path: IANode[] = []
      const walk = (node: IANode): IATaskLinkMatch | null => {
        path.push(node)
        const directIds = [
          ...(node.taskIds || []),
          ...(node.requestId ? [node.requestId] : []),
        ]
        if (
          directIds.some((id) => id.trim().toLowerCase() === cleanRequestId)
        ) {
          return { productId, node, path: [...path] }
        }
        for (const child of node.children || []) {
          const found = walk(child)
          if (found) return found
        }
        path.pop()
        return null
      }
      const found = walk(root)
      if (found) return found
    }
  }
  return null
}

export function isNodeInSquadScope(
  node: IANode,
  squadName?: string | null,
): boolean {
  const targetSquad = normalizeIAMatchValue(squadName)
  if (!targetSquad || node.tier === 1) return true

  const nodeSquad = normalizeIAMatchValue(node.squad)
  if (
    nodeSquad &&
    (nodeSquad === targetSquad ||
      nodeSquad.includes(targetSquad) ||
      targetSquad.includes(nodeSquad))
  ) {
    return true
  }

  return (node.children || []).some((child) =>
    isNodeInSquadScope(child, squadName),
  )
}

function cloneNodeWithoutTask(node: IANode, requestId: string): IANode {
  const target = requestId.trim().toLowerCase()
  const remainingTaskIds = (node.taskIds || []).filter(
    (id) => id.trim().toLowerCase() !== target,
  )
  return {
    ...node,
    taskIds: remainingTaskIds.length > 0 ? remainingTaskIds : undefined,
    requestId:
      node.requestId?.trim().toLowerCase() === target
        ? undefined
        : node.requestId,
    children: node.children?.map((child) =>
      cloneNodeWithoutTask(child, requestId),
    ),
    siblingRoots: node.siblingRoots?.map((root) =>
      cloneNodeWithoutTask(root, requestId),
    ),
  }
}

function attachTaskToNode(
  node: IANode,
  nodeId: string,
  requestId: string,
): IANode {
  if (node.id === nodeId) {
    const taskIds = Array.from(
      new Set(
        [...(node.taskIds || []), requestId]
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    )
    return {
      ...node,
      taskIds,
      requestId: undefined,
      hasActiveTask: true,
      updatedAt: new Date().toISOString(),
    }
  }
  return {
    ...node,
    children: node.children?.map((child) =>
      attachTaskToNode(child, nodeId, requestId),
    ),
    siblingRoots: node.siblingRoots?.map((root) =>
      attachTaskToNode(root, nodeId, requestId),
    ),
  }
}

export function linkTaskToIANode(
  trees: Record<string, IANode>,
  requestId: string,
  productId: string,
  nodeId: string,
): Record<string, IANode> {
  const cleaned: Record<string, IANode> = {}
  for (const [key, tree] of Object.entries(trees)) {
    cleaned[key] = cloneNodeWithoutTask(tree, requestId)
  }
  if (!cleaned[productId]) return cleaned
  return {
    ...cleaned,
    [productId]: attachTaskToNode(cleaned[productId], nodeId, requestId),
  }
}

export function unlinkTaskFromIA(
  trees: Record<string, IANode>,
  requestId: string,
): Record<string, IANode> {
  const updated: Record<string, IANode> = {}
  for (const [key, tree] of Object.entries(trees)) {
    updated[key] = cloneNodeWithoutTask(tree, requestId)
  }
  return updated
}

export function mergeCloudIATreesPreservingDirtyProducts(
  localTrees: Record<string, IANode>,
  cloudTrees: Record<string, IANode>,
  dirtyProductIds: Iterable<string>,
): Record<string, IANode> {
  const dirtyIds = new Set(dirtyProductIds)
  const safeCloudTrees = Object.fromEntries(
    Object.entries(cloudTrees).filter(([productId]) => !dirtyIds.has(productId)),
  )
  return { ...localTrees, ...safeCloudTrees }
}

export function createIANodeForTask(args: {
  trees: Record<string, IANode>
  productId: string
  parentId?: string | null
  tier: IATier
  name: string
  squad: string
  colorTheme?: string
}): { trees: Record<string, IANode>; node: IANode } {
  const now = new Date().toISOString()
  const node: IANode = {
    id: `ia-${args.productId}-lv${args.tier}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tier: args.tier,
    name: args.name.trim(),
    parentId: args.parentId || null,
    squad: args.squad.trim(),
    colorTheme: args.colorTheme || "blue",
    collapsed: false,
    children: [],
    displaySettings: getTaskLinkNodeDisplaySettings(args.tier),
    createdAt: now,
    updatedAt: now,
  }

  const targetTree = args.trees[args.productId]
  if (!targetTree) return { trees: args.trees, node }

  if (args.tier === 1) {
    const nextTree = {
      ...targetTree,
      siblingRoots: [...(targetTree.siblingRoots || []), node],
    }
    return { trees: { ...args.trees, [args.productId]: nextTree }, node }
  }

  const addBelowParent = (current: IANode): IANode => {
    if (current.id === args.parentId) {
      return {
        ...current,
        children: [...(current.children || []), node],
        updatedAt: now,
      }
    }
    return {
      ...current,
      children: current.children?.map(addBelowParent),
      siblingRoots: current.siblingRoots?.map(addBelowParent),
    }
  }

  return {
    trees: { ...args.trees, [args.productId]: addBelowParent(targetTree) },
    node,
  }
}

export function formatIAPath(path: IANode[]): string {
  return path.map((node) => `Lv${node.tier} ${node.name}`).join(" → ")
}
