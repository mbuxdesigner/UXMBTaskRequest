import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  UserPlus, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Building, 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Activity,
  Sliders
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu } from "@/components/reui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import { syncTeamMembersToSheet } from "@/services/googleSheetService"
import { mockSquads } from "@/data/mockData"
import type { TeamMember, SquadSetting, ProductSetting } from "@/pages/QuanLyPage"
import { dialogOverlayVariants, dialogContentVariants, springs } from "@/lib/motion"

export interface AddMemberModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: (newMember: TeamMember) => void
  products?: ProductSetting[]
  squads?: SquadSetting[]
  title?: string
  subtitle?: string
  submitLabel?: string
  initialRole?: string
}

const DEFAULT_PRODUCTS = [
  "App MBBank",
  "Biz MBBank",
  "BaaS & Open API",
  "Design System & Nền tảng"
]

export default function AddMemberModal({
  open,
  onClose,
  onSuccess,
  products: propProducts,
  squads: propSquads,
  title = "Thêm nhân sự mới & Phân bổ Đa-Squad",
  subtitle = "Cấu hình thông tin tài khoản, vai trò và phân bổ Squad theo từng Sản phẩm",
  submitLabel = "Thêm nhân sự",
  initialRole = "Designer",
}: AddMemberModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<TeamMember["role"]>((initialRole as any) || "Designer")
  const [status, setStatus] = useState<TeamMember["status"]>("Active")
  const [capacity, setCapacity] = useState<number>(5)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedSquads, setSelectedSquads] = useState<string[]>([])
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load products list
  const availableProducts = useMemo<string[]>(() => {
    if (propProducts && propProducts.length > 0) {
      return propProducts.map((p) => p.name).filter(Boolean)
    }
    try {
      const saved = localStorage.getItem("mbbank_admin_products")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => p.name || p).filter(Boolean)
        }
      }
    } catch {}
    return DEFAULT_PRODUCTS
  }, [propProducts])

  // Load squads list
  const availableSquads = useMemo<{ name: string; productName: string }[]>(() => {
    if (propSquads && propSquads.length > 0) {
      return propSquads.map((s) => ({
        name: s.name,
        productName: s.productName || "App MBBank",
      }))
    }
    try {
      const saved = localStorage.getItem("mbbank_admin_squads")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            name: s.name || s.squad_name,
            productName: s.productName || s.product_name || s.product || "App MBBank",
          }))
        }
      }
    } catch {}

    return mockSquads.map((s) => ({
      name: s.squad_name,
      productName: s.product_name || "App MBBank",
    }))
  }, [propSquads])

  // Group squads by product
  const squadsByProduct = useMemo(() => {
    const map: Record<string, string[]> = {}
    availableProducts.forEach((p) => {
      map[p] = []
    })

    availableSquads.forEach((sq) => {
      const pName = sq.productName || "App MBBank"
      // Find matching product case-insensitively
      const matchedProd = availableProducts.find(
        (p) => p.toLowerCase().trim() === pName.toLowerCase().trim()
      )
      if (matchedProd) {
        if (!map[matchedProd].includes(sq.name)) {
          map[matchedProd].push(sq.name)
        }
      } else {
        if (!map[pName]) map[pName] = []
        if (!map[pName].includes(sq.name)) {
          map[pName].push(sq.name)
        }
      }
    })

    return map
  }, [availableProducts, availableSquads])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setRole((initialRole as any) || "Designer")
      setStatus("Active")
      setCapacity(5)

      // Default: select first product and expand it
      const firstProd = availableProducts[0] || "App MBBank"
      const firstSquads = squadsByProduct[firstProd] || []
      const defaultSq = firstSquads[0] ? [firstSquads[0]] : []
      setSelectedProducts([firstProd])
      setSelectedSquads(defaultSq)
      setExpandedProducts({ [firstProd]: true })
    }
  }, [open, availableProducts, squadsByProduct, initialRole])

  // Toggle product selection
  const handleToggleProduct = (prodName: string) => {
    const isSelected = selectedProducts.includes(prodName)
    const prodSquads = squadsByProduct[prodName] || []

    if (isSelected) {
      // Unselect product and remove its squads
      setSelectedProducts(selectedProducts.filter((p) => p !== prodName))
      setSelectedSquads(selectedSquads.filter((s) => !prodSquads.includes(s)))
      setExpandedProducts((prev) => ({ ...prev, [prodName]: false }))
    } else {
      // Select product, expand it, and select its first squad by default
      setSelectedProducts([...selectedProducts, prodName])
      setExpandedProducts((prev) => ({ ...prev, [prodName]: true }))
      if (prodSquads.length > 0 && !prodSquads.some((s) => selectedSquads.includes(s))) {
        setSelectedSquads([...selectedSquads, prodSquads[0]])
      }
    }
  }

  // Toggle squad chip
  const handleToggleSquad = (sqName: string, prodName: string) => {
    const isSelected = selectedSquads.includes(sqName)
    let nextSquads: string[]

    if (isSelected) {
      nextSquads = selectedSquads.filter((s) => s !== sqName)
    } else {
      nextSquads = [...selectedSquads, sqName]
      // Ensure the parent product is also selected
      if (!selectedProducts.includes(prodName)) {
        setSelectedProducts((prev) => [...prev, prodName])
      }
    }

    setSelectedSquads(nextSquads)
  }

  // Select all squads in a product
  const handleSelectAllSquadsInProduct = (prodName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const prodSquads = squadsByProduct[prodName] || []
    if (prodSquads.length === 0) return

    const allSelected = prodSquads.every((s) => selectedSquads.includes(s))
    let nextSquads: string[]

    if (allSelected) {
      // Deselect all
      nextSquads = selectedSquads.filter((s) => !prodSquads.includes(s))
    } else {
      // Select all
      const toAdd = prodSquads.filter((s) => !selectedSquads.includes(s))
      nextSquads = [...selectedSquads, ...toAdd]
      if (!selectedProducts.includes(prodName)) {
        setSelectedProducts((prev) => [...prev, prodName])
      }
    }

    setSelectedSquads(nextSquads)
  }

  // Toggle expand/collapse accordion
  const handleToggleExpand = (prodName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedProducts((prev) => ({
      ...prev,
      [prodName]: !prev[prodName],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Vui lòng nhập họ và tên nhân sự!")
      return
    }
    if (!email.trim()) {
      toast.error("Vui lòng nhập email Teams của nhân sự!")
      return
    }

    setIsSubmitting(true)

    try {
      const defaultPr = availableProducts[0] || "App MBBank"
      const defaultSq = (squadsByProduct[defaultPr] || [])[0] || "eSaving"

      const finalProducts = selectedProducts.length > 0 ? selectedProducts : [defaultPr]
      const finalSquads = selectedSquads.length > 0 ? selectedSquads : [defaultSq]

      const newMem: TeamMember = {
        id: `mem-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role,
        squad: finalSquads[0] || defaultSq,
        squads: finalSquads,
        products: finalProducts,
        avatarUrl: "",
        activeTasks: 0,
        capacityLimit: capacity,
        status: status,
        permissions: {
          canAssign: role === "Admin" || role === "Design Owner",
          canApprovePo: role === "Admin" || role === "Design Owner" || role === "PO",
          canExport: true,
          canManageSystem: role === "Admin",
        },
      }

      // Load existing members from localStorage and prepend new member
      let currentMembers: TeamMember[] = []
      try {
        const raw = localStorage.getItem("mbbank_admin_team") || localStorage.getItem("mbbank_team_members")
        if (raw) {
          currentMembers = JSON.parse(raw)
        }
      } catch {}

      // Avoid duplicates by email
      const filtered = currentMembers.filter(
        (m) => m.email.toLowerCase() !== newMem.email.toLowerCase()
      )
      const updatedList = [newMem, ...filtered]

      // Save to localStorage
      localStorage.setItem("mbbank_admin_team", JSON.stringify(updatedList))
      localStorage.setItem("mbbank_team_members", JSON.stringify(updatedList))

      // Trigger global synchronization events
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new Event("auth_session_changed"))

      // Sync to Google Sheet in background
      syncTeamMembersToSheet(updatedList).catch(() => {})

      toast.success(`Đã thêm nhân sự [${newMem.name}] thành công!`)

      if (onSuccess) {
        onSuccess(newMem)
      }

      onClose()
    } catch (err: any) {
      toast.error("Lỗi khi thêm nhân sự: " + (err?.message || err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop with smooth fade */}
          <motion.div
            variants={dialogOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
          />

          {/* Modal Content with Spring Scale & Slide */}
          <motion.div
            variants={dialogContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.modal}
            className="relative z-10 bg-white rounded-2xl p-5 sm:p-6 w-full max-w-xl shadow-2xl border border-slate-200/90 space-y-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#1057FB] shrink-0 shadow-2xs">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  {subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Row 1: Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-normal text-slate-700 block mb-1">
                  Họ và tên: <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Lê Thị Thu Trang"
                  className="text-xs rounded-xl border-slate-200 focus:border-[#1057FB] h-9"
                />
              </div>
              <div>
                <label className="text-xs font-normal text-slate-700 block mb-1">
                  Email Teams: <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trang.designer@mbbank.com.vn"
                  className="text-xs rounded-xl border-slate-200 focus:border-[#1057FB] font-mono h-9"
                />
              </div>
            </div>

            {/* Row 2: Role, Status, Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-normal text-slate-700 block mb-1">
                  Vai trò (Role):
                </label>
                <DropdownMenu
                  className="w-full"
                  buttonClassName="w-full h-9 bg-white border-slate-200 rounded-xl px-3 justify-between font-normal text-xs text-slate-800 shadow-2xs"
                  value={role}
                  onChange={(val) => setRole(val as TeamMember["role"])}
                  options={[
                    { value: "Designer", label: "UX Designer" },
                    { value: "Design Owner", label: "Design Owner" },
                    { value: "PO", label: "Product Owner (PO)" },
                    { value: "Business", label: "Business (Nghiệp vụ)" },
                    { value: "Admin", label: "Admin" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-normal text-slate-700 block mb-1">
                  Trạng thái:
                </label>
                <DropdownMenu
                  className="w-full"
                  buttonClassName="w-full h-9 bg-white border-slate-200 rounded-xl px-3 justify-between font-normal text-xs text-slate-800 shadow-2xs"
                  value={status}
                  onChange={(val) => setStatus(val as TeamMember["status"])}
                  options={[
                    { value: "Active", label: "Active (Sẵn sàng)" },
                    { value: "On Leave", label: "On Leave (Nghỉ phép)" },
                    { value: "Busy", label: "Busy (Bận)" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-normal text-slate-700 block mb-1">
                  Hạn mức (Max task):
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 5)}
                  className="text-xs rounded-xl border-slate-200 text-center font-medium h-9"
                />
              </div>
            </div>

            {/* Row 3: HIERARCHICAL PRODUCT -> SQUADS SELECTION */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/90">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-900">
                    Phân bổ Sản phẩm & Squads phụ trách:
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-normal">
                  <span className="font-medium text-slate-800">{selectedProducts.length}</span> sản phẩm · <span className="font-medium text-slate-800">{selectedSquads.length}</span> squads
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                Chọn sản phẩm để hiển thị các Squad trực thuộc. Bấm vào từng chip để phân bổ nhân sự vào Squad tương ứng.
              </p>

              {/* Product Cards List */}
              <div className="space-y-2 pt-1">
                {availableProducts.map((prodName) => {
                  const prodSquads = squadsByProduct[prodName] || []
                  const isProdSelected = selectedProducts.includes(prodName)
                  const selectedCountInProd = prodSquads.filter((s) => selectedSquads.includes(s)).length
                  const isExpanded = expandedProducts[prodName] ?? isProdSelected
                  const allSquadsSelected = prodSquads.length > 0 && selectedCountInProd === prodSquads.length

                  return (
                    <div
                      key={`prod-box-${prodName}`}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isProdSelected
                          ? "bg-white border-blue-200 shadow-2xs"
                          : "bg-white/60 border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      {/* Product Header Row */}
                      <div
                        onClick={() => handleToggleProduct(prodName)}
                        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                              isProdSelected
                                ? "bg-[#1057FB] border-[#1057FB] text-white shadow-2xs"
                                : "bg-white border-slate-300 hover:border-slate-400 group-hover:border-slate-400"
                            }`}
                          >
                            {isProdSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </div>
                          <input
                            type="checkbox"
                            checked={isProdSelected}
                            onChange={() => handleToggleProduct(prodName)}
                            className="sr-only"
                          />
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold block truncate ${
                              isProdSelected ? "text-slate-900" : "text-slate-600"
                            }`}>
                              {prodName}
                            </span>
                          </div>
                          {selectedCountInProd > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-[#1057FB] border border-blue-200/80 shrink-0">
                              {selectedCountInProd}/{prodSquads.length} squad
                            </span>
                          )}
                        </div>

                        {/* Right: Quick Select All & Expand Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          {prodSquads.length > 0 && isProdSelected && (
                            <button
                              type="button"
                              onClick={(e) => handleSelectAllSquadsInProduct(prodName, e)}
                              className="text-[11px] font-normal text-slate-500 hover:text-[#1057FB] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-50"
                            >
                              {allSquadsSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleExpand(prodName, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isExpanded ? "Thu gọn" : "Mở rộng"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Squad Chips Container (Rendered when expanded) */}
                      {isExpanded && (
                        <div className="p-3 pt-2.5 border-t border-slate-100 bg-slate-50/50">
                          {prodSquads.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {prodSquads.map((sqName) => {
                                const isSqSelected = selectedSquads.includes(sqName)
                                return (
                                  <button
                                    key={`sq-chip-${prodName}-${sqName}`}
                                    type="button"
                                    onClick={() => handleToggleSquad(sqName, prodName)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer select-none border ${
                                      isSqSelected
                                        ? "bg-[#1057FB] text-white border-[#1057FB] font-medium shadow-xs"
                                        : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200 font-normal hover:border-slate-300"
                                    }`}
                                  >
                                    {isSqSelected ? (
                                      <Check className="w-3 h-3 text-white stroke-[2.5]" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    )}
                                    <span>{sqName}</span>
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Chưa có squad nào được tạo dưới sản phẩm này.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 font-normal">
                {role === "Admin" ? "Quyền Quản trị viên" : `Vai trò: ${role}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-9 px-4 rounded-xl text-xs font-normal text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Đang lưu..." : submitLabel}
                </Button>
              </div>
            </div>
          </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
