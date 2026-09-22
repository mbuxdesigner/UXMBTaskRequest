import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldAlert,
  Lock,
  Maximize2,
  RotateCcw,
  Eye,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  LayoutGrid,
  SlidersHorizontal,
  FileCode,
  Copy,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { toast } from "@/components/ui/toast"
import { springs } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getProductColorDef } from "@/lib/colorUtils"
import { useIATreeState } from "@/hooks/useIATreeState"
import { useCanvasTransform } from "@/hooks/useCanvasTransform"
import IACanvasViewport from "@/components/ia/IACanvasViewport"
import IANodeEditorModal, { ModalMode } from "@/components/ia/IANodeEditorModal"
import IASettingsModal from "@/components/ia/IASettingsModal"
import type { QuickAddNodeType } from "@/components/ia/IAQuickAddSidebar"
import IAJsonImportModal from "@/components/ia/IAJsonImportModal"
import { IADockTool } from "@/components/ia/IAVerticalDock"
import { Tooltip } from "@/components/ui/tooltip"
import RequestDetail from "@/components/track/RequestDetail"
import { IANode, IATier } from "@/types/ia"
import { UXRequest } from "@/data/mockData"
import { getStoredSession, UserSession } from "@/services/otpAuthService"
import { canRoleAccessCapability } from "@/lib/accessControl"

export default function IAPage() {
  const [isPagesPanelOpen, setIsPagesPanelOpen] = useState<boolean>(true)
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [canView, setCanView] = useState<boolean>(() => {
    const s = getStoredSession()
    return canRoleAccessCapability(s?.role, "cap-ia-view")
  })
  const [canEdit, setCanEdit] = useState<boolean>(() => {
    const s = getStoredSession()
    return canRoleAccessCapability(s?.role, "cap-ia-edit")
  })

  useEffect(() => {
    const handleStorage = () => {
      const s = getStoredSession()
      setSession(s)
      setCanView(canRoleAccessCapability(s?.role, "cap-ia-view"))
      setCanEdit(canRoleAccessCapability(s?.role, "cap-ia-edit"))
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener("auth_session_changed", handleStorage)
    window.addEventListener("rbac_permissions_changed", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("auth_session_changed", handleStorage)
      window.removeEventListener("rbac_permissions_changed", handleStorage)
    }
  }, [])

  const {
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
    requestsMap,
    trees,
    syncCloud,
    pullCloud,
    tierDimensions,
    setTierDimensions,
    importTree,
  } = useIATreeState("app-mbbank")

  const {
    transform,
    setTransform,
    isPanning,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  } = useCanvasTransform()

  // Modal dialog states for Add / Edit / Delete / Reset
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [targetNode, setTargetNode] = useState<IANode | null>(null)
  const [selectedNode, setSelectedNode] = useState<IANode | null>(null)
  const [activeDockTool, setActiveDockTool] = useState<IADockTool>(null)
  const [isJsonImportOpen, setIsJsonImportOpen] = useState<boolean>(false)
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false)
  const [isPullingCloud, setIsPullingCloud] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Drawer state for linked UXRequest
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)

  // Search match navigation index
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0)
  const matchedIdList = useMemo(() => Array.from(searchResult.matchedIds), [searchResult.matchedIds])

  // Ensure concrete product is selected (remove "Tất cả")
  useEffect(() => {
    if (selectedProductId === "all" && products.length > 0) {
      setSelectedProductId(products[0].id)
    }
  }, [selectedProductId, products, setSelectedProductId])

  useEffect(() => {
    console.error("DIAGNOSTIC_IA_PAGE:", JSON.stringify({
      activeTree: activeTree ? { id: activeTree.id, name: activeTree.name, childrenCount: activeTree.children?.length } : null,
      selectedProductId,
      layoutNodesCount: layoutNodes.length,
      bounds,
      transform,
    }))
  })

  // Count nodes in each product's tree for c-tabs-5 badge display
  const productNodeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    if (!trees) return map

    function countNodes(root: IANode): number {
      let count = 0
      function dfs(n: IANode) {
        count++
        if (n.children) {
          for (const c of n.children) dfs(c)
        }
      }
      dfs(root)
      if (root.siblingRoots) {
        for (const sr of root.siblingRoots) dfs(sr)
      }
      return count
    }

    for (const prod of products) {
      const tree =
        trees[prod.id] ||
        (prod.code === "APP_MB" ? trees["app-mbbank"] : prod.code === "BIZ_MB" ? trees["biz-mb"] : undefined)
      if (tree) {
        map[prod.id] = countNodes(tree)
      } else {
        map[prod.id] = 0
      }
    }
    return map
  }, [products, trees])

  // Active product info
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0]
  }, [products, selectedProductId])

  // Fit to View trigger
  const handleFitToView = useCallback(() => {
    const vpWidth = typeof window !== "undefined" ? window.innerWidth - 300 : 1200
    const vpHeight = typeof window !== "undefined" ? window.innerHeight - 250 : 700
    fitToView({ width: Math.max(600, vpWidth), height: Math.max(400, vpHeight) }, bounds, 60)
  }, [fitToView, bounds])

  // Auto-fit and reset dock tool on product switch
  useEffect(() => {
    handleFitToView()
    setActiveDockTool(null)
  }, [selectedProductId])

  // Modal Action Handlers (blocked if !canEdit)
  const handleOpenAdd = useCallback((parent: IANode) => {
    if (!canEdit) return
    setTargetNode(parent)
    setModalMode("add")
  }, [canEdit])

  const handleOpenAddRoot = useCallback(() => {
    if (!canEdit) return
    setTargetNode(null)
    setModalMode("add")
  }, [canEdit])

  const handleOpenEdit = useCallback((node: IANode) => {
    if (!canEdit) return
    setTargetNode(node)
    setModalMode("edit")
  }, [canEdit])

  const handleOpenDelete = useCallback((node: IANode) => {
    if (!canEdit) return
    setTargetNode(node)
    setModalMode("delete")
  }, [canEdit])

  const handleOpenReset = useCallback(() => {
    if (!canEdit) return
    setTargetNode(null)
    setModalMode("reset")
  }, [canEdit])

  const handleOpenViewNode = useCallback((node: IANode) => {
    setTargetNode(node)
    setModalMode("view")
  }, [])

  const handleOpenLinkTask = useCallback((node: IANode) => {
    if (!canEdit) return
    setTargetNode(node)
    setModalMode("link-task" as any)
  }, [canEdit])

  const handleCloseModal = useCallback(() => {
    setModalMode(null)
    setTargetNode(null)
  }, [])

  // Cloud Sync Handler
  const handleSyncCloud = useCallback(async () => {
    if (!canEdit) return
    setIsSyncingCloud(true)
    const startTime = Date.now()
    try {
      const ok = await syncCloud()
      const elapsed = Date.now() - startTime
      if (elapsed < 1200) {
        await new Promise((r) => setTimeout(r, 1200 - elapsed))
      }
      if (ok) {
        toast.success("Đã đồng bộ sơ đồ IA lên Cloud thành công!")
      } else {
        toast.error("Không thể đồng bộ lên Cloud. Vui lòng thử lại!")
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi đồng bộ Cloud")
    } finally {
      setIsSyncingCloud(false)
    }
  }, [canEdit, syncCloud])

  // Cloud Pull Handler (hỗ trợ cả bấm thủ công và tự động tải khi vào tab)
  const handlePullCloud = useCallback(async (isAuto = false) => {
    setIsPullingCloud(true)
    const startTime = Date.now()
    try {
      const ok = await pullCloud()
      const elapsed = Date.now() - startTime
      if (elapsed < 800) {
        await new Promise((r) => setTimeout(r, 800 - elapsed))
      }
      if (ok) {
        toast.success("Đã đồng bộ dữ liệu Information Architecture mới nhất từ Cloud!")
        setTimeout(() => handleFitToView(), 150)
      } else if (!isAuto) {
        toast.info("Dữ liệu sơ đồ hiện tại đã khớp với Cloud.")
      }
    } catch (e: any) {
      if (!isAuto) toast.error(e?.message || "Lỗi tải từ Cloud")
    } finally {
      setIsPullingCloud(false)
    }
  }, [pullCloud, handleFitToView])

  // Tự động kéo dữ liệu Cloud mới nhất về khi người dùng vào tab Information Architecture
  const hasAutoPulledRef = useRef(false)
  useEffect(() => {
    if (!hasAutoPulledRef.current) {
      hasAutoPulledRef.current = true
      handlePullCloud(true)
    }
  }, [handlePullCloud])

  // Auto-align Tree Handler
  const handleAutoAlign = useCallback(() => {
    autoAlignTree()
    toast.success("Đã căn chuẩn lại toàn bộ vị trí sơ đồ sitemap!")
    setTimeout(() => handleFitToView(), 100)
  }, [autoAlignTree, handleFitToView])

  // Camera Pan-to-Node helper for search match navigation
  const panToNode = useCallback(
    (nodeId: string) => {
      const targetLayout = layoutNodes.find((l) => l.node.id === nodeId)
      if (!targetLayout) return

      const vpWidth = typeof window !== "undefined" ? window.innerWidth - 300 : 1200
      const vpHeight = typeof window !== "undefined" ? window.innerHeight - 250 : 700

      const nodeCenterX = targetLayout.x + targetLayout.width / 2
      const nodeCenterY = targetLayout.y + targetLayout.height / 2

      const newPanX = vpWidth / 2 - nodeCenterX * transform.scale
      const newPanY = vpHeight / 2 - nodeCenterY * transform.scale

      setTransform((prev) => ({
        ...prev,
        x: Number(newPanX.toFixed(4)),
        y: Number(newPanY.toFixed(4)),
      }))
    },
    [layoutNodes, transform.scale, setTransform]
  )

  // Navigate to Next Match
  const handleNextMatch = useCallback(() => {
    if (matchedIdList.length === 0) return
    const nextIdx = (currentMatchIndex + 1) % matchedIdList.length
    setCurrentMatchIndex(nextIdx)
    panToNode(matchedIdList[nextIdx])
  }, [matchedIdList, currentMatchIndex, panToNode])

  // Navigate to Previous Match
  const handlePrevMatch = useCallback(() => {
    if (matchedIdList.length === 0) return
    const prevIdx = (currentMatchIndex - 1 + matchedIdList.length) % matchedIdList.length
    setCurrentMatchIndex(prevIdx)
    panToNode(matchedIdList[prevIdx])
  }, [matchedIdList, currentMatchIndex, panToNode])

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0)
    if (matchedIdList.length > 0) {
      panToNode(matchedIdList[0])
    }
  }, [searchQuery, matchedIdList.length])

  // Check role for Design Admin or Design Owner (Requirement 5) - chỉ khả dụng khi có quyền Edit
  const isDesignAdminOrOwner = useMemo(() => {
    if (!canEdit) return false
    const r = (session?.role || "").toLowerCase()
    return r.includes("admin") || r.includes("owner") || canEdit
  }, [session?.role, canEdit])

  // Copy IA Map as JSON (Requirement 8)
  const handleCopyJson = useCallback(() => {
    try {
      const dataToExport = {
        product: activeProduct?.name || selectedProductId,
        exportedAt: new Date().toISOString(),
        tree: activeTree,
        siblingRoots: rootNodes.length > 1 ? rootNodes.slice(1) : undefined,
      }
      const jsonStr = JSON.stringify(dataToExport, null, 2)
      navigator.clipboard.writeText(jsonStr)
      toast.success("Đã sao chép cấu trúc sơ đồ IA map (JSON) vào bộ nhớ tạm!")
    } catch (e) {
      toast.error("Không thể sao chép JSON")
    }
  }, [activeProduct, selectedProductId, activeTree, rootNodes])

  // Quick Add Node from Sidebar (Requirement 5)
  const handleAddFromSidebar = useCallback(
    (item: QuickAddNodeType) => {
      if (!canEdit) return

      if (item.tier === 1) {
        addRootNode({
          name: `Cấp 1 mới · ${activeProduct?.name || "Sản phẩm"}`,
          tier: 1,
        })
        toast.success("Đã tạo thêm Tier 1 mới cho sản phẩm!")
        setTimeout(() => handleFitToView(), 100)
        return
      }

      // Tier 2, 3, 4: Gắn vào node đang chọn hoặc root node
      const targetParent = selectedNode || activeTree
      if (!targetParent) return

      addChildNode(targetParent.id, {
        name: item.name,
        tier: item.tier,
        touchpointType: item.touchpointType,
      })
      toast.success(`Đã thêm ${item.name} vào dưới "${targetParent.name}"!`)
      setTimeout(() => handleFitToView(), 100)
    },
    [canEdit, activeProduct, addRootNode, selectedNode, activeTree, addChildNode, handleFitToView]
  )

  // Drag-and-Drop Node from Sidebar onto Canvas (Requirement 5 & 6)
  const handleAddNodeAtPosition = useCallback(
    (position: { x: number; y: number }, nodeData: Partial<IANode>) => {
      if (!canEdit) return

      if (nodeData.tier === 1) {
        addRootNode({
          name: nodeData.name || `Cấp 1 mới · ${activeProduct?.name || "Sản phẩm"}`,
          tier: 1,
          customX: position.x,
          customY: position.y,
        })
        toast.success("Đã tạo thêm Tier 1 mới tại vị trí chỉ định!")
        return
      }

      const targetParent = selectedNode || activeTree
      if (!targetParent) return

      addChildNode(targetParent.id, {
        name: nodeData.name || "Node mới",
        tier: (nodeData.tier || 2) as IATier,
        touchpointType: nodeData.touchpointType,
        customX: position.x,
        customY: position.y,
      })
      toast.success(`Đã thêm node mới vào sơ đồ!`)
    },
    [canEdit, activeProduct, addRootNode, selectedNode, activeTree, addChildNode]
  )

  // Handle JSON Import (Requirement 8)
  const handleImportJson = useCallback(
    (imported: IANode | IANode[]) => {
      importTree(imported)
      setIsJsonImportOpen(false)
      toast.success("Đã nhập thành công sơ đồ IA map!")
      setTimeout(() => handleFitToView(), 150)
    },
    [importTree, handleFitToView]
  )

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Không có quyền truy cập Kiến trúc Thông tin (IA)
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Tài khoản với vai trò <span className="font-semibold text-slate-700">{session?.role || "Hiện tại"}</span> chưa được cấp quyền xem sơ đồ Kiến trúc Thông tin. Vui lòng liên hệ Quản trị viên (Admin) để được mở quyền.
        </p>
      </div>
    )
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative w-full h-full flex-1 min-h-0 min-w-0 max-w-full outline-none overflow-hidden select-none bg-[#F8FAFC]"
    >
      {/* 1. FigJam-Style Floating Pages Panel (Top-Left, Collapsible) */}
      <AnimatePresence mode="wait">
        {isPagesPanelOpen ? (
          <motion.div
            key="figjam-pages-panel"
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={springs.snappy}
            className="absolute top-3 sm:top-4 left-3 sm:left-4 z-40 w-64 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl p-3 select-none flex flex-col gap-2.5 max-h-[calc(100vh-80px)]"
          >
            {/* Row 1: FigJam Logo Dropdown & Collapse Toggle */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100/90">
              <div
                className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer p-0.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="MB UX Information Architecture"
              >
                {/* FigJam ❖ Brand Icon */}
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-purple-600 shrink-0"
                >
                  <rect width="7" height="7" x="3" y="3" rx="1.5" />
                  <rect width="7" height="7" x="14" y="3" rx="1.5" />
                  <rect width="7" height="7" x="14" y="14" rx="1.5" />
                  <rect width="7" height="7" x="3" y="14" rx="1.5" />
                </svg>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-1">
                {/* Cloud Refresh Action */}
                <button
                  type="button"
                  onClick={() => handlePullCloud(false)}
                  disabled={isPullingCloud || isSyncingCloud}
                  title="Đồng bộ lại dữ liệu mới nhất từ Cloud"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={cn(
                      "w-3.5 h-3.5",
                      isPullingCloud && "animate-spin text-purple-600"
                    )}
                  />
                </button>

                {/* Collapse Panel Button */}
                <button
                  type="button"
                  onClick={() => setIsPagesPanelOpen(false)}
                  title="Thu gọn bảng Pages (Collapse)"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Title & Status (Cloud Syncing / Read-only if applicable) */}
            <div className="py-0.5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Information Architecture
              </h2>
              {(isPullingCloud || !canEdit) && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  {isPullingCloud ? (
                    <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      Đang đồng bộ dữ liệu Cloud...
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Chế độ chỉ xem
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Pages List (Synchronized with Sidebar styling) */}
            <div className="flex flex-col gap-1 overflow-y-auto max-h-56 pr-0.5 custom-scrollbar pt-1 border-t border-slate-100/90">
              {products.map((prod) => {
                const isSelected =
                  selectedProductId === prod.id ||
                  (selectedProductId === "app-mbbank" && prod.code === "APP_MB")
                const nodeCount = productNodeCounts[prod.id] ?? 0

                return (
                  <button
                    key={`figjam-page-${prod.id}`}
                    type="button"
                    onClick={() => setSelectedProductId(prod.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer select-none",
                      isSelected
                        ? "bg-[#E9EBEF] text-slate-900 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    )}
                  >
                    <span className="truncate">{prod.name}</span>
                    {nodeCount > 0 && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums shrink-0",
                          isSelected
                            ? "bg-slate-300/60 text-slate-800 font-semibold"
                            : "text-slate-400"
                        )}
                      >
                        {nodeCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        ) : (
          /* Collapsed Floating Pill Button (FigJam Style) */
          <motion.button
            key="figjam-collapsed-pill"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={springs.snappy}
            onClick={() => setIsPagesPanelOpen(true)}
            title="Mở danh sách Pages (Information Architecture)"
            className="absolute top-3 sm:top-4 left-3 sm:left-4 z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md px-3 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="max-w-[150px] truncate">{activeProduct?.name || "Information Architecture"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 2. Full-Screen Edge-to-Edge Mindmap Canvas Viewport */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <IACanvasViewport
            transform={transform}
            setTransform={setTransform}
            isPanning={isPanning}
            layoutNodes={layoutNodes}
            connectors={connectors}
            matchedIds={searchResult.matchedIds}
            requestsMap={requestsMap}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            resetZoom={resetZoom}
            onFitToView={handleFitToView}
            onToggleCollapse={toggleCollapse}
            onOpenDetail={(req) => setSelectedRequest(req)}
            onOpenNodeDetail={handleOpenViewNode}
            onOpenTaskPicker={canEdit ? handleOpenLinkTask : undefined}
            onAddChild={handleOpenAdd}
            onAddChildInDirection={canEdit ? addChildInDirection : undefined}
            onConnectNodes={canEdit ? connectNodes : undefined}
            onCreateConnectedNodeAt={canEdit ? createConnectedNodeAt : undefined}
            onEditNode={handleOpenEdit}
            onUpdateNode={canEdit ? updateNode : undefined}
            onDeleteNode={handleOpenDelete}
            onNodeDrag={canEdit ? (id, x, y) => updateNodePosition(id, x, y, false) : undefined}
            onNodeDragEnd={canEdit ? (id, x, y) => updateNodePosition(id, x, y, true) : undefined}
            onMultipleNodesDrag={canEdit ? updateMultipleNodePositions : undefined}
            onNodeResize={canEdit ? (id, w, h) => updateNodeDimensions(id, w, h, false) : undefined}
            onNodeResizeEnd={canEdit ? (id, w, h) => updateNodeDimensions(id, w, h, true) : undefined}
            onTrunkDrag={canEdit ? updateTrunkOffset : undefined}
            onNodePositionChange={canEdit ? updateNodePosition : undefined}
            onAutoAlign={canEdit ? autoAlignTree : undefined}
            readOnly={!canEdit}
            bounds={bounds}
            onCopyJson={handleCopyJson}
            onOpenImportJson={() => setIsJsonImportOpen(true)}
            onSelectNode={setSelectedNode}
            onAddNodeAtPosition={canEdit ? handleAddNodeAtPosition : undefined}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onPullCloud={handlePullCloud}
            isPullingCloud={isPullingCloud}
            onSyncCloud={handleSyncCloud}
            isSyncingCloud={isSyncingCloud}
            onResetToDefault={handleOpenReset}
            activeDockTool={activeDockTool}
            onSelectDockTool={setActiveDockTool}
            activeTree={activeTree}
            activeProduct={activeProduct}
            onAddNode={handleAddFromSidebar}
            tierDimensions={tierDimensions}
            onSaveSettings={(newSettings) => {
              setTierDimensions(newSettings)
              setTimeout(() => handleFitToView(), 100)
            }}
            onImportJson={handleImportJson}
          />
        </div>

      {/* 4. Inline Node Management & Confirmation Dialog Modal */}
      <IANodeEditorModal
        mode={modalMode}
        targetNode={targetNode}
        activeProduct={activeProduct}
        productName={activeProduct?.name}
        availableRequests={Array.from(requestsMap.values())}
        isOpen={modalMode !== null}
        onClose={handleCloseModal}
        onOpenRequestDetail={(req) => setSelectedRequest(req)}
        onConfirmAdd={(parentId, data) => {
          if (!parentId) {
            addRootNode(data)
          } else {
            addChildNode(parentId, data)
          }
          handleFitToView()
        }}
        onConfirmEdit={(nodeId, data) => {
          updateNode(nodeId, data)
        }}
        onConfirmDelete={(nodeId) => {
          deleteNode(nodeId)
        }}
        onConfirmReset={() => {
          resetToDefault()
          handleFitToView()
        }}
      />

      {/* 5. Cài đặt kích thước độ dài các cấp */}
      <IASettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={tierDimensions}
        onSave={(newSettings) => {
          setTierDimensions(newSettings)
          setTimeout(() => handleFitToView(), 100)
        }}
      />

      {/* 6. Modal Nhập JSON / Đẩy Map Nhanh (Requirement 8) */}
      <IAJsonImportModal
        isOpen={isJsonImportOpen}
        onClose={() => setIsJsonImportOpen(false)}
        currentTree={activeTree}
        selectedProductName={activeProduct?.name || "MBBank"}
        onImportJson={handleImportJson}
      />

      {/* 7. Request Detail Slide-Over Drawer Drilldown */}
      <RequestDetail
        request={selectedRequest}
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
      />
    </main>
  )
}
