import React, { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  ChevronRight,
  Layers3,
  Link2,
  Lock,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import type { UXRequest } from "@/data/mockData"
import type { IANode, IATier } from "@/types/ia"
import { getAdminIAProducts } from "@/data/iaMockData"
import {
  clearDirtyIAProducts,
  loadSavedTrees,
  markIAProductDirty,
  saveTreesToStorage,
} from "@/hooks/useIATreeState"
import { canRoleAccessCapability } from "@/lib/accessControl"
import {
  createIANodeForTask,
  findTaskIALink,
  formatIAPath,
  getIAProductRoots,
  isNodeInSquadScope,
  linkTaskToIANode,
  resolveIAProductId,
  unlinkTaskFromIA,
} from "@/lib/iaTaskLink"
import { getStoredSession } from "@/services/otpAuthService"
import { syncMasterDataToSheet } from "@/services/googleSheetService"
import { updateTaskProgress } from "@/api/api"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import {
  originPopoverVariants,
  springs,
  useAnchorOrigin,
} from "@/lib/motion"

interface TaskIALinkFieldProps {
  request: UXRequest
  onUpdated?: (updatedRequest?: UXRequest) => void
  onBeforeOpen?: () => void
  className?: string
}

const TIER_LABELS: Record<IATier, string> = {
  1: "Sản phẩm / Root",
  2: "Phân hệ / Module",
  3: "Luồng tính năng",
  4: "Màn hình / Điểm chạm",
  5: "Thành phần / Chi tiết",
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim()
}

function deepestSelectedNode(
  selectedIds: string[],
  paths: IANode[][],
): IANode | null {
  for (let index = selectedIds.length - 1; index >= 0; index -= 1) {
    const found = paths[index]?.find((node) => node.id === selectedIds[index])
    if (found) return found
  }
  return null
}

export default function TaskIALinkField({
  request,
  onUpdated,
  onBeforeOpen,
  className = "",
}: TaskIALinkFieldProps) {
  const session = getStoredSession()
  const canEdit = canRoleAccessCapability(session?.role, "cap-ia-edit")
  const taskSquad = (
    request.squad_name ||
    request.preferred_squad ||
    request.squad ||
    ""
  ).trim()
  const taskProduct = (request.product || "").trim()

  const [isOpen, setIsOpen] = useState(false)
  const [trees, setTrees] = useState<Record<string, IANode>>(() =>
    loadSavedTrees(),
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeTier, setActiveTier] = useState<IATier>(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { transformOrigin } = useAnchorOrigin(
    triggerRef,
    popoverRef,
    "bottom-right",
    isOpen,
  )

  const products = useMemo(() => getAdminIAProducts(), [isOpen])
  const productId = useMemo(
    () => resolveIAProductId(products, trees, taskProduct),
    [products, trees, taskProduct],
  )
  const linked = useMemo(
    () => findTaskIALink(trees, request.request_id),
    [trees, request.request_id],
  )
  const linkedPathText = linked ? formatIAPath(linked.path) : ""

  const tierOptions = useMemo(() => {
    const levels: IANode[][] = [[], [], [], [], []]
    if (!productId || !trees[productId]) return levels

    levels[0] = getIAProductRoots(trees[productId])
    for (let index = 1; index < 5; index += 1) {
      const parent = levels[index - 1].find(
        (node) => node.id === selectedIds[index - 1],
      )
      if (!parent) break
      levels[index] = (parent.children || []).filter(
        (node) =>
          isNodeInSquadScope(node, taskSquad) || selectedIds[index] === node.id,
      )
    }
    return levels
  }, [productId, selectedIds, taskSquad, trees])

  const selectedNode = useMemo(
    () => deepestSelectedNode(selectedIds, tierOptions),
    [selectedIds, tierOptions],
  )

  const initializeSelection = () => {
    const freshTrees = loadSavedTrees()
    setTrees(freshTrees)
    const current = findTaskIALink(freshTrees, request.request_id)
    const currentProductId = resolveIAProductId(
      getAdminIAProducts(),
      freshTrees,
      taskProduct,
    )
    const currentPath =
      current && current.productId === currentProductId
        ? current.path.map((node) => node.id)
        : []
    setSelectedIds(currentPath)
    setActiveTier(
      currentPath.length > 0
        ? (Math.min(currentPath.length, 5) as IATier)
        : 1,
    )
    setSearchQuery("")
  }

  useEffect(() => {
    const refresh = () => setTrees(loadSavedTrees())
    window.addEventListener("ia_trees_changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("ia_trees_changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, isSaving])

  const persistTrees = (nextTrees: Record<string, IANode>) => {
    saveTreesToStorage(nextTrees)
    setTrees(nextTrees)
    window.dispatchEvent(
      new CustomEvent("ia_trees_changed", { detail: { trees: nextTrees } }),
    )
  }

  const recordActivity = async (note: string) => {
    const result = await updateTaskProgress(request.request_id, {
      new_phase: request.current_phase,
      new_status: request.status,
      new_progress: request.progress,
      note,
      assigned_designer: request.assigned_designer,
      is_comment: false,
    })
    onUpdated?.(result.updatedRequest)
    return result
  }

  const saveLink = async (targetNode: IANode, sourceTrees = trees) => {
    if (!productId) return
    setIsSaving(true)
    const previous = findTaskIALink(sourceTrees, request.request_id)
    const nextTrees = linkTaskToIANode(
      sourceTrees,
      request.request_id,
      productId,
      targetNode.id,
    )
    markIAProductDirty(productId)
    persistTrees(nextTrees)

    const nextLink = findTaskIALink(nextTrees, request.request_id)
    const nextPath = nextLink
      ? formatIAPath(nextLink.path)
      : `Lv${targetNode.tier} ${targetNode.name}`
    const note =
      previous && previous.node.id !== targetNode.id
        ? `Đã chuyển liên kết IA từ [${formatIAPath(previous.path)}] sang [${nextPath}]`
        : `Đã gắn bài toán vào IA map: ${nextPath}`

    try {
      const [cloudResult, activityResult] = await Promise.all([
        syncMasterDataToSheet({ ia_trees: nextTrees }),
        recordActivity(note),
      ])
      if (cloudResult.success) clearDirtyIAProducts([productId])

      if (!cloudResult.success) {
        toast.warning(
          cloudResult.message ||
            "Đã lưu liên kết IA trên thiết bị; Cloud sẽ được đồng bộ lại sau.",
        )
      } else if (!activityResult.success) {
        toast.warning(activityResult.message || "Đã cập nhật IA nhưng chưa ghi được activity log.")
      } else {
        toast.success("Đã gắn task vào IA map!")
      }
    } catch (error) {
      toast.warning(
        "IA map đã cập nhật, nhưng chưa ghi được activity log.",
        String(error),
      )
    } finally {
      setIsSaving(false)
      setIsOpen(false)
    }
  }

  const handleCreateNode = async (tier: IATier, requestedName = searchQuery) => {
    const name = requestedName.trim()
    if (!name || !productId) return
    const parent =
      tier > 1
        ? tierOptions[tier - 2].find(
            (node) => node.id === selectedIds[tier - 2],
          )
        : null
    if (tier > 1 && !parent) {
      toast.warning(`Vui lòng chọn node Lv${tier - 1} trước khi tạo Lv${tier}.`)
      return
    }

    const created = createIANodeForTask({
      trees,
      productId,
      parentId: parent?.id,
      tier,
      name,
      squad: taskSquad,
      colorTheme:
        parent?.colorTheme ||
        products.find((product) => product.id === productId)?.color,
    })

    const nextSelectedIds = [
      ...selectedIds.slice(0, tier - 1),
      created.node.id,
    ]
    markIAProductDirty(productId)
    persistTrees(created.trees)
    setSelectedIds(nextSelectedIds)
    setSearchQuery("")
    if (tier < 5) setActiveTier((tier + 1) as IATier)

    setIsSaving(true)
    try {
      const cloudResult = await syncMasterDataToSheet({ ia_trees: created.trees })
      if (cloudResult.success) {
        clearDirtyIAProducts([productId])
        toast.success(`Đã tạo node Lv${tier}. Bấm Hoàn tất để gắn task.`)
      } else {
        toast.warning(
          cloudResult.message ||
            "Đã tạo node trên thiết bị; Cloud sẽ được đồng bộ lại sau.",
        )
      }
    } catch (error) {
      toast.warning(
        "Đã tạo node trên thiết bị, nhưng chưa đồng bộ được lên Cloud.",
        String(error),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleUnlink = async () => {
    if (!linked) return
    setIsSaving(true)
    const previousPath = formatIAPath(linked.path)
    const nextTrees = unlinkTaskFromIA(trees, request.request_id)
    markIAProductDirty(linked.productId)
    persistTrees(nextTrees)
    try {
      const [cloudResult, activityResult] = await Promise.all([
        syncMasterDataToSheet({ ia_trees: nextTrees }),
        recordActivity(`Đã gỡ bài toán khỏi IA map: ${previousPath}`),
      ])
      if (cloudResult.success) clearDirtyIAProducts([linked.productId])

      if (!cloudResult.success) {
        toast.warning(
          cloudResult.message ||
            "Đã gỡ liên kết trên thiết bị; Cloud sẽ được đồng bộ lại sau.",
        )
      } else if (!activityResult.success) {
        toast.warning(activityResult.message || "Đã gỡ liên kết nhưng chưa ghi được activity log.")
      } else {
        toast.success("Đã gỡ task khỏi IA map!")
      }
    } catch (error) {
      toast.warning(
        "Đã gỡ liên kết IA, nhưng chưa ghi được activity log.",
        String(error),
      )
    } finally {
      setIsSaving(false)
      setIsOpen(false)
    }
  }

  const chooseNode = (tier: IATier, nodeId: string) => {
    setSelectedIds((current) => [...current.slice(0, tier - 1), nodeId])
    setSearchQuery("")
    if (nodeId && tier < 5) {
      setActiveTier((tier + 1) as IATier)
    }
  }

  const openPicker = () => {
    if (!canEdit) return
    if (isOpen) {
      setIsOpen(false)
      return
    }
    onBeforeOpen?.()
    initializeSelection()
    setIsOpen(true)
  }

  return (
    <div
      ref={containerRef}
      className={`flex items-center relative ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="w-28 sm:w-32 flex items-center gap-2 text-slate-500 font-normal shrink-0">
        <Layers3 className="w-4 h-4 text-slate-400" />
        <span>IA map</span>
      </div>
      <div className="flex-1 min-w-0">
        {linked ? (
          <motion.button
            ref={triggerRef}
            type="button"
            whileTap={canEdit ? { scale: 0.96 } : undefined}
            onClick={openPicker}
            aria-expanded={canEdit ? isOpen : undefined}
            aria-controls={canEdit ? "task-ia-node-picker" : undefined}
            className={`max-w-full inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs ${
              canEdit
                ? "hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                : "cursor-default"
            }`}
            title={linkedPathText}
          >
            <Link2 className="size-3.5 shrink-0 text-indigo-500" />
            <span className="truncate">
              Lv{linked.node.tier} · {linked.node.name}
            </span>
            {canEdit && (
              <ChevronRight
                className={`size-3.5 shrink-0 text-slate-400 transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            )}
          </motion.button>
        ) : canEdit ? (
          <motion.button
            ref={triggerRef}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={openPicker}
            aria-expanded={isOpen}
            aria-controls="task-ia-node-picker"
            className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="size-3.5" />
            Chọn node
          </motion.button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Lock className="size-3" /> Chưa gắn
          </span>
        )}
      </div>

      <AnimatePresence>
        {isOpen && canEdit && (
          <motion.div
            ref={popoverRef}
            id="task-ia-node-picker"
            role="dialog"
            aria-modal="false"
            aria-label="Chọn node IA cho task"
            variants={originPopoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.popover}
            style={{ transformOrigin }}
            className="absolute right-0 top-full z-[70] mt-1.5 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-3 py-2.5">
              <h3 className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                IA map
              </h3>
              <div className="flex min-w-0 items-center justify-end gap-1.5 text-[10px] text-slate-400">
                <span className="truncate font-medium text-slate-700">
                  {taskProduct}
                </span>
                <span className="shrink-0 text-slate-300">•</span>
                <span className="truncate">{taskSquad}</span>
              </div>
            </div>

            {productId && (
              <div
                role="tablist"
                aria-label="Cấp node IA"
                className="grid grid-cols-5 border-b border-slate-100 bg-white px-2"
              >
                {([1, 2, 3, 4, 5] as IATier[]).map((tier) => {
                  const enabled = tier === 1 || Boolean(selectedIds[tier - 2])
                  const isActive = activeTier === tier
                  const isSelected = Boolean(selectedIds[tier - 1])

                  return (
                    <button
                      key={`ia-tier-tab-${tier}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      disabled={!enabled}
                      onClick={() => {
                        setActiveTier(tier)
                        setSearchQuery("")
                      }}
                      className={`relative h-8 text-[10px] font-bold transition-colors ${
                        isActive
                          ? "text-[#1057FB]"
                          : enabled
                            ? "text-slate-500 hover:text-slate-800"
                            : "cursor-not-allowed text-slate-300"
                      }`}
                    >
                      Lv{tier}
                      {isSelected && !isActive && (
                        <span className="absolute right-1.5 top-1.5 size-1 rounded-full bg-emerald-500" />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId="task-ia-active-tier"
                          className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[#1057FB]"
                          transition={springs.snappy}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div>
              {!productId ? (
                <div className="m-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800">
                  Không tìm thấy IA map của sản phẩm “{taskProduct}”. Vui lòng
                  kiểm tra danh mục sản phẩm trong Admin.
                </div>
              ) : (
                ([activeTier] as IATier[]).map((tier) => {
                  const parentSelected =
                    tier === 1 || Boolean(selectedIds[tier - 2])
                  if (!parentSelected) return null
                  const options = tierOptions[tier - 1]
                  const normalizedQuery = normalizeSearchValue(searchQuery)
                  const filteredOptions = normalizedQuery
                    ? options.filter((node) =>
                        normalizeSearchValue(
                          `${node.name} ${node.squad || ""}`,
                        ).includes(normalizedQuery),
                      )
                    : options
                  const hasExactMatch = options.some(
                    (node) =>
                      normalizeSearchValue(node.name) === normalizedQuery,
                  )
                  const canCreate = Boolean(searchQuery.trim()) && !hasExactMatch

                  return (
                    <motion.div
                      layout="position"
                      key={tier}
                      transition={springs.snappy}
                      className="border-b border-slate-100 py-2.5 last:border-b-0"
                    >
                      <div className="mb-2 flex items-center gap-2 px-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[9px] font-bold text-slate-600">
                            Lv{tier}
                          </span>
                          <span className="truncate text-[11px] font-semibold text-slate-600">
                            {TIER_LABELS[tier]}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white">
                        <label className="flex h-9 items-center gap-2 border-y border-slate-100 px-3">
                          <Search className="size-3.5 shrink-0 text-slate-400" />
                          <input
                            autoFocus
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return
                              if (canCreate) {
                                event.preventDefault()
                                handleCreateNode(tier)
                              } else if (filteredOptions.length === 1) {
                                event.preventDefault()
                                chooseNode(tier, filteredOptions[0].id)
                              }
                            }}
                            placeholder={`Tìm node Lv${tier}...`}
                            aria-label={`Tìm node Lv${tier}`}
                            aria-controls={`task-ia-options-${tier}`}
                            className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </label>

                        <div
                          id={`task-ia-options-${tier}`}
                          role="listbox"
                          aria-label={`Danh sách node Lv${tier}`}
                          className="max-h-44 overflow-y-auto py-1"
                        >
                          {filteredOptions.length > 0 ? (
                            filteredOptions.map((node) => {
                              const isSelected = selectedIds[tier - 1] === node.id
                              return (
                                <button
                                  key={node.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => chooseNode(tier, node.id)}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                                    isSelected
                                      ? "bg-blue-50 text-[#1057FB]"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                                    {node.name}
                                  </span>
                                  {node.squad && (
                                    <span className="max-w-20 shrink-0 truncate text-[9px] font-medium text-slate-400">
                                      {node.squad}
                                    </span>
                                  )}
                                  {isSelected && <Check className="size-3.5 shrink-0" />}
                                </button>
                              )
                            })
                          ) : (
                            <p className="px-3 py-2 text-[10px] text-slate-400">
                              Không tìm thấy node phù hợp.
                            </p>
                          )}

                          {canCreate && (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleCreateNode(tier)}
                              className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                                <Plus className="size-3" />
                              </span>
                              <span className="min-w-0 truncate text-[11px] font-medium">
                                Tạo <strong>“{searchQuery.trim()}”</strong>
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/90 px-3 py-2">
              <div className="flex items-center justify-end gap-2">
                {linked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleUnlink}
                    className="h-7 rounded-lg border-rose-200 px-2.5 text-[11px] text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="mr-1 size-3.5" /> Gỡ liên kết
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedNode || isSaving}
                  onClick={() => selectedNode && saveLink(selectedNode)}
                  className="h-7 rounded-lg bg-slate-900 px-3 text-[11px] text-white hover:bg-slate-800"
                >
                  {isSaving ? "Đang lưu..." : "Hoàn tất"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
