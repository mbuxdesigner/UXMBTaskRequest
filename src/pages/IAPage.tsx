import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { ShieldAlert, Lock, Maximize2, RotateCcw, Eye, CloudUpload, CloudDownload, RefreshCw, LayoutGrid, Plus, SlidersHorizontal, MoreHorizontal, FileCode, Copy } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { springs } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import PageHeader from "@/components/common/PageHeader"
import { useIATreeState } from "@/hooks/useIATreeState"
import { useCanvasTransform } from "@/hooks/useCanvasTransform"
import IAToolbar from "@/components/ia/IAToolbar"
import IACanvasViewport from "@/components/ia/IACanvasViewport"
import IANodeEditorModal, { ModalMode } from "@/components/ia/IANodeEditorModal"
import IASettingsModal from "@/components/ia/IASettingsModal"
import IAQuickAddSidebar, { QuickAddNodeType } from "@/components/ia/IAQuickAddSidebar"
import IAJsonImportModal from "@/components/ia/IAJsonImportModal"
import RequestDetail from "@/components/track/RequestDetail"
import { IANode, IATier } from "@/types/ia"
import { UXRequest } from "@/data/mockData"
import { getStoredSession, UserSession } from "@/services/otpAuthService"
import { canRoleAccessCapability } from "@/lib/accessControl"

export default function IAPage() {
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
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(true)
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

  // Auto-fit on product switch
  useEffect(() => {
    handleFitToView()
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

  const handleCloseModal = useCallback(() => {
    setModalMode(null)
    setTargetNode(null)
  }, [])

  // Cloud Sync Handler
  const handleSyncCloud = useCallback(async () => {
    if (!canEdit) return
    setIsSyncingCloud(true)
    try {
      const ok = await syncCloud()
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

  // Cloud Pull Handler
  const handlePullCloud = useCallback(async () => {
    setIsPullingCloud(true)
    try {
      const ok = await pullCloud()
      if (ok) {
        toast.success("Đã tải dữ liệu sơ đồ IA mới nhất từ Cloud!")
        setTimeout(() => handleFitToView(), 150)
      } else {
        toast.info("Không có dữ liệu mới hơn trên Cloud hoặc đã khớp.")
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi tải từ Cloud")
    } finally {
      setIsPullingCloud(false)
    }
  }, [pullCloud, handleFitToView])

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
    <main id="main-content" tabIndex={-1} className="flex flex-col w-full h-full min-h-[calc(100vh-8.5rem)] space-y-4 animate-in fade-in-50 duration-200 min-w-0 max-w-full outline-none">
      {/* 1. Page Header Synchronized with Track Task & System Style */}
      <PageHeader
        breadcrumb={{
          parent: "MBBank UX Platform",
          current: "IA map",
        }}
        title="IA map"
        badge={
          !canEdit ? (
            <span
              data-testid="ia-readonly-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"
              title="Bạn đang ở chế độ chỉ xem, không thể chỉnh sửa hoặc di chuyển node"
            >
              <Eye className="w-3 h-3 text-amber-600" />
              Chế độ chỉ xem
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          )
        }
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              {/* Nút Cài đặt sơ đồ */}
              <Button
                variant="outline"
                size="sm"
                data-testid="ia-settings-btn"
                onClick={() => setIsSettingsOpen(true)}
                title="Cài đặt cấu trúc, kích thước và hiển thị sơ đồ"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Cài đặt sơ đồ</span>
              </Button>

              {/* Nút Tải từ Cloud */}
              <Button
                variant="outline"
                size="sm"
                data-testid="ia-pull-cloud-btn"
                onClick={handlePullCloud}
                disabled={isPullingCloud}
                title="Tải sơ đồ IA từ Google Sheets Cloud"
              >
                <CloudDownload className={`w-3.5 h-3.5 text-slate-500 ${isPullingCloud ? "animate-bounce" : ""}`} />
                <span className="hidden sm:inline">{isPullingCloud ? "Đang tải..." : "Tải từ Cloud"}</span>
              </Button>

              {/* Nút Lưu lên Cloud (chỉ khi có quyền edit) - Primary Action */}
              <Button
                variant="default"
                size="sm"
                data-testid="ia-sync-cloud-btn"
                onClick={handleSyncCloud}
                disabled={isSyncingCloud}
                title="Lưu đồng bộ sơ đồ IA lên Google Sheets Cloud"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncingCloud ? "animate-pulse" : ""}`} />
                <span>{isSyncingCloud ? "Đang lưu..." : "Lưu lên Cloud"}</span>
              </Button>

              {/* Menu tùy chọn thêm (...) */}
              <div className="relative" ref={moreMenuRef}>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="ia-more-menu-btn"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  title="Tùy chọn khác"
                  className="px-2"
                >
                  <MoreHorizontal className="w-4 h-4 text-slate-500" />
                </Button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      data-testid="ia-more-import-json"
                      onClick={() => {
                        setIsMoreMenuOpen(false)
                        setIsJsonImportOpen(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 text-left transition-colors cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>Nhập JSON / Đẩy map nhanh</span>
                    </button>

                    <button
                      type="button"
                      data-testid="ia-more-copy-json"
                      onClick={() => {
                        setIsMoreMenuOpen(false)
                        handleCopyJson()
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sao chép sơ đồ (JSON)</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      data-testid="ia-more-reset"
                      onClick={() => {
                        setIsMoreMenuOpen(false)
                        handleOpenReset()
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-left transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                      <span>Khôi phục sơ đồ mặc định</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : undefined
        }
      />

      {/* 2. Top Command Bar: Product Selector & Search */}
      <IAToolbar
        products={products}
        selectedProductId={selectedProductId}
        onSelectProduct={setSelectedProductId}
        metrics={metrics}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchCount={searchResult.matchCount}
        currentMatchIndex={currentMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        onResetToDefault={handleOpenReset}
        readOnly={!canEdit}
        trees={trees}
      />

      {/* 3. Main IA Interactive Canvas Workspace (Flex layout with QuickAdd Sidebar & Canvas) */}
      <div className="relative flex-1 flex w-full h-[calc(100vh-14rem)] min-h-[640px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-50">
        {/* Left Quick Add Sidebar for Design Admin / Design Owner (Requirement 5) */}
        {isDesignAdminOrOwner && (
          <IAQuickAddSidebar
            isOpen={isQuickAddOpen}
            onToggle={() => setIsQuickAddOpen((prev) => !prev)}
            onAddNode={handleAddFromSidebar}
            selectedNodeId={selectedNode?.id}
            selectedNodeName={selectedNode?.name}
            selectedNodeTier={selectedNode?.tier}
          />
        )}

        {/* Hardware-Accelerated Interactive Mindmap Canvas Viewport */}
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
          onAddChild={handleOpenAdd}
          onAddChildInDirection={canEdit ? addChildInDirection : undefined}
          onConnectNodes={canEdit ? connectNodes : undefined}
          onCreateConnectedNodeAt={canEdit ? createConnectedNodeAt : undefined}
          onEditNode={handleOpenEdit}
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
        />
      </div>

      {/* 4. Inline Node Management & Confirmation Dialog Modal */}
      <IANodeEditorModal
        mode={modalMode}
        targetNode={targetNode}
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
