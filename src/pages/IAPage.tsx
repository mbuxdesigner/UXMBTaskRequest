import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Layers, Sparkles, CheckCircle2 } from "lucide-react"
import { useIATreeState } from "@/hooks/useIATreeState"
import { useCanvasTransform } from "@/hooks/useCanvasTransform"
import IAToolbar from "@/components/ia/IAToolbar"
import IACanvasViewport from "@/components/ia/IACanvasViewport"
import IANodeEditorModal, { ModalMode } from "@/components/ia/IANodeEditorModal"
import RequestDetail from "@/components/track/RequestDetail"
import { IANode } from "@/types/ia"
import { UXRequest } from "@/data/mockData"

export default function IAPage() {
  const {
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

  // Modal Action Handlers
  const handleOpenAdd = useCallback((parent: IANode) => {
    setTargetNode(parent)
    setModalMode("add")
  }, [])

  const handleOpenEdit = useCallback((node: IANode) => {
    setTargetNode(node)
    setModalMode("edit")
  }, [])

  const handleOpenDelete = useCallback((node: IANode) => {
    setTargetNode(node)
    setModalMode("delete")
  }, [])

  const handleOpenReset = useCallback(() => {
    setTargetNode(null)
    setModalMode("reset")
  }, [])

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

  return (
    <div className="flex flex-col w-full h-full min-h-[calc(100vh-8.5rem)] space-y-4">
      {/* 1. Top Toolbar: Product Selector, Metrics, Search & Reset */}
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
      />

      {/* 2. Product Context Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{activeProduct.name}:</span>
          <span className="text-slate-500">{activeProduct.description}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-slate-600 font-medium">
            <Layers className="w-3 h-3 text-blue-500" /> {domainsCount} Phân hệ
          </span>
          <span className="flex items-center gap-1 text-slate-600 font-medium">
            <Sparkles className="w-3 h-3 text-amber-500" /> {criticalPathsCount} Luồng trọng yếu
          </span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Cây IA Chuẩn MBBank
          </span>
        </div>
      </div>

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
        onEditNode={handleOpenEdit}
        onDeleteNode={handleOpenDelete}
      />

      {/* 4. Inline Node Management & Confirmation Dialog Modal */}
      <IANodeEditorModal
        mode={modalMode}
        targetNode={targetNode}
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
          handleFitToView()
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
