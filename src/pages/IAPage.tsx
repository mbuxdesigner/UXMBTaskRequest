import React, { useState, useEffect, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { ShieldAlert, Lock, Maximize2, RotateCcw, Eye } from "lucide-react"
import { springs } from "@/lib/motion"
import PageHeader from "@/components/common/PageHeader"
import { useIATreeState } from "@/hooks/useIATreeState"
import { useCanvasTransform } from "@/hooks/useCanvasTransform"
import IAToolbar from "@/components/ia/IAToolbar"
import IACanvasViewport from "@/components/ia/IACanvasViewport"
import IANodeEditorModal, { ModalMode } from "@/components/ia/IANodeEditorModal"
import RequestDetail from "@/components/track/RequestDetail"
import { IANode } from "@/types/ia"
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
    requestsMap,
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

  // Drawer state for linked UXRequest
  const [selectedRequest, setSelectedRequest] = useState<UXRequest | null>(null)

  // Search match navigation index
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0)
  const matchedIdList = useMemo(() => Array.from(searchResult.matchedIds), [searchResult.matchedIds])

  // Active product info
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0]
  }, [products, selectedProductId])

  // Count domain modules (Tier 2)
  const domainsCount = useMemo(() => {
    return activeTree.children ? activeTree.children.length : 0
  }, [activeTree])

  // Count critical paths
  const criticalPathsCount = useMemo(() => {
    let count = 0
    function traverse(node: IANode) {
      if (node.isCriticalPath) count++
      if (node.children) {
        node.children.forEach(traverse)
      }
    }
    traverse(activeTree)
    return count
  }, [activeTree])

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

  const handleCloseModal = useCallback(() => {
    setModalMode(null)
    setTargetNode(null)
  }, [])

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
    <div className="flex flex-col w-full h-full min-h-[calc(100vh-8.5rem)] space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Page Header Synchronized with Track Task & System Style */}
      <PageHeader
        breadcrumb={{
          parent: "MBBank UX Platform",
          current: "Information Architecture",
        }}
        title="Information Architecture"
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
        subtitle={
          <div data-testid="ia-metrics-badge" className="flex min-w-0 flex-wrap items-center gap-2.5 pt-0.5">
            {/* Phân hệ */}
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs font-normal text-slate-500">Phân hệ</span>
              <span className="rounded-4xl bg-slate-100 text-slate-800 border border-slate-200/80 px-2 py-0.5 text-xs h-5 min-w-5 inline-flex items-center justify-center font-medium">
                {domainsCount}
              </span>
            </div>

            {/* Luồng */}
            <div className="flex min-w-0 items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-2.5">
              <span className="truncate text-xs font-normal text-slate-500">Luồng</span>
              <span className="rounded-4xl border border-blue-200 bg-blue-50 text-[#1057FB] px-2 py-0.5 text-xs h-5 min-w-5 inline-flex items-center justify-center font-medium">
                {metrics.featureCount}
              </span>
            </div>

            {/* Màn hình */}
            <div className="flex min-w-0 items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-2.5">
              <span className="truncate text-xs font-normal text-slate-500">Màn hình</span>
              <span className="rounded-4xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs h-5 min-w-5 inline-flex items-center justify-center font-medium">
                {metrics.screenCount}
              </span>
            </div>

            {/* Trọng yếu */}
            <div className="flex min-w-0 items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-2.5">
              <span className="truncate text-xs font-normal text-slate-500">Trọng yếu</span>
              <span className="rounded-4xl border border-amber-200 bg-amber-50 text-amber-800 px-2 py-0.5 text-xs h-5 min-w-5 inline-flex items-center justify-center font-medium">
                {criticalPathsCount}
              </span>
            </div>

            {/* Active Product & Description */}
            {activeProduct && (
              <div className="hidden lg:flex min-w-0 items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-2.5">
                <span className="text-xs font-semibold text-slate-700">{activeProduct.name}:</span>
                <span className="text-xs text-slate-500 truncate max-w-[280px]">{activeProduct.description}</span>
              </div>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Nút Căn giữa sơ đồ */}
            <motion.button
              type="button"
              data-testid="ia-fit-view-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              onClick={handleFitToView}
              title="Căn giữa sơ đồ toàn màn hình"
              className="h-9 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 select-none"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Căn giữa</span>
            </motion.button>

            {/* Nút Khôi phục mặc định (chỉ hiển thị khi có quyền edit) */}
            {canEdit && (
              <motion.button
                type="button"
                data-testid="ia-reset-default-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.94 }}
                transition={springs.snappy}
                onClick={handleOpenReset}
                title="Khôi phục cấu trúc cây mặc định"
                className="h-9 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 select-none"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Khôi phục mặc định</span>
              </motion.button>
            )}
          </div>
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
      />

      {/* 3. Hardware-Accelerated Interactive Mindmap Canvas Viewport */}
      <IACanvasViewport
        transform={transform}
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
        onAddChild={handleOpenAdd}
        onAddChildInDirection={canEdit ? addChildInDirection : undefined}
        onConnectNodes={canEdit ? connectNodes : undefined}
        onCreateConnectedNodeAt={canEdit ? createConnectedNodeAt : undefined}
        onEditNode={handleOpenEdit}
        onDeleteNode={handleOpenDelete}
        onNodeDrag={canEdit ? (id, x, y) => updateNodePosition(id, x, y, false) : undefined}
        onNodeDragEnd={canEdit ? (id, x, y) => updateNodePosition(id, x, y, true) : undefined}
        onNodeResize={canEdit ? (id, w, h) => updateNodeDimensions(id, w, h, false) : undefined}
        onNodeResizeEnd={canEdit ? (id, w, h) => updateNodeDimensions(id, w, h, true) : undefined}
        onNodePositionChange={canEdit ? updateNodePosition : undefined}
        onAutoAlign={canEdit ? autoAlignTree : undefined}
        readOnly={!canEdit}
      />

      {/* 4. Inline Node Management & Confirmation Dialog Modal */}
      <IANodeEditorModal
        mode={modalMode}
        targetNode={targetNode}
        availableRequests={Array.from(requestsMap.values())}
        isOpen={modalMode !== null}
        onClose={handleCloseModal}
        onConfirmAdd={(parentId, data) => {
          addChildNode(parentId, data)
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

      {/* 5. Request Detail Slide-Over Drawer Drilldown */}
      <RequestDetail
        request={selectedRequest}
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  )
}
