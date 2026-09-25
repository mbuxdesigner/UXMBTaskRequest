import { useState, useEffect, useRef } from "react"
import {
  Squad,
  recommendSquad,
  mockSquads,
  PRODUCTS as DEFAULT_PRODUCTS,
} from "../../data/mockData"
import { submitRequest, fetchFormSelections } from "../../api/api"
import {
  SelectionsData,
  FALLBACK_SELECTIONS,
  uploadFileToDrive,
} from "../../services/googleSheetService"
import {
  getStoredSession,
  getUserInitials,
  UserSession,
} from "../../services/otpAuthService"
import { DropdownMenu, DropdownOption } from "@/components/reui/dropdown-menu"
import { DatePicker } from "@/components/reui/date-picker"
import { UserAvatar } from "@/components/common/UserAvatar"
import PageHeader from "@/components/common/PageHeader"
import FileUpload from "./FileUpload"
import RequestReviewSheet from "./RequestReviewSheet"
import SuccessCelebrationCard from "./SuccessCelebrationCard"
import {
  getFormConfig,
  FORM_CONFIG_EVENT_NAME,
  RequestFormConfig,
} from "@/config/formConfig"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { dispatchNotification } from "@/services/notificationService"
import { capitalizeFirstLetter, capitalizeSentences } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { microStaggerTier1Variants, microStaggerTier2Variants, cascadeWaveContainerVariants, cascadeWaveItemVariants } from "@/lib/motion"
import { Skeleton } from "@/components/ui/skeleton"
import { FormSkeleton } from "@/components/common/ReuiSkeletons"
import { SpotlightCard } from "@/components/jolyui/spotlight-card"
import { BorderBeam } from "@/components/jolyui/border-beam"
import { ShimmerButton } from "@/components/jolyui/shimmer-button"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Link as LinkIcon,
  Paperclip,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Database,
  User,
  Send,
  HelpCircle,
  Clock,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Edit3,
  FileText,
  FileCheck,
  ArrowLeft,
  X,
} from "lucide-react"

interface RequestFormProps {
  squads: Squad[]
  onSuccessChange?: (isSuccess: boolean) => void
}

interface FormState {
  title: string
  requester_email: string
  product: string
  request_type: string
  description: string
  business_need: string
  user_problem: string
  target_user: string
  release_date: string
  deadline_reason: string
  preferred_squad: string
  doc_links: string[]
  leader_report_note: string
  expected_output: string[]
}

/**
 * Khử khuẩn chuỗi đầu vào ngăn chặn XSS (Item 7)
 */
export function sanitizeXss(input: string): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "")
    .replace(/on\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/on\w+\s*=\s*[^>\s]+/gi, "")
    .trim()
}

export const FORM_DRAFT_KEY = "ux_request_form_draft"

export default function RequestForm({ squads, onSuccessChange }: RequestFormProps) {
  const [session, setSession] = useState<UserSession | null>(getStoredSession())
  const [attachMode, setAttachMode] = useState<"link" | "file">("link")
  const [files, setFiles] = useState<File[]>([])
  const [viewMode, setViewMode] = useState<"edit" | "review" | "success">("edit")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [requestId, setRequestId] = useState("")
  const [sheetLogResult, setSheetLogResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingSelections, setLoadingSelections] = useState(true)

  // Dynamic form configuration from Admin
  const [formConfig, setFormConfig] = useState<RequestFormConfig>(() => getFormConfig())

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail) {
        setFormConfig(e.detail)
      } else {
        setFormConfig(getFormConfig())
      }
    }
    window.addEventListener(FORM_CONFIG_EVENT_NAME, handleConfigChange)
    return () => window.removeEventListener(FORM_CONFIG_EVENT_NAME, handleConfigChange)
  }, [])

  const getField = (key: string) => formConfig.fields.find((f) => f.key === key)
  const isFieldEnabled = (key: string) => getField(key)?.enabled !== false
  const isFieldRequired = (key: string) => getField(key)?.required === true
  const getFieldLabel = (key: string, fallback: string) => getField(key)?.label || fallback
  const getFieldPlaceholder = (key: string, fallback: string) => getField(key)?.placeholder || fallback

  // Dynamic selections from Google Sheet
  const [selections, setSelections] = useState<SelectionsData>(FALLBACK_SELECTIONS)

  const [form, setForm] = useState<FormState>({
    title: "",
    requester_email: session?.teamsEmail || session?.personalEmail || "",
    product: "",
    request_type: "",
    description: "",
    business_need: "",
    user_problem: "",
    target_user: "",
    release_date: "",
    deadline_reason: "",
    preferred_squad: "",
    doc_links: [""],
    leader_report_note: "",
    expected_output: ["Wireframe", "Prototype tương tác"],
  })

  // Ref theo dõi nội dung form mới nhất cho bộ đếm lưu nháp ngầm 15 giây
  const formRef = useRef(form)
  useEffect(() => {
    formRef.current = form
  }, [form])

  // Hàm tự động lưu bản nháp form vào localStorage
  const autoSaveDraft = () => {
    try {
      const current = formRef.current
      const hasContent = Boolean(
        (current.title && current.title.trim()) ||
        (current.description && current.description.trim()) ||
        (current.business_need && current.business_need.trim()) ||
        (current.user_problem && current.user_problem.trim()) ||
        (current.product && current.product.trim())
      )
      if (hasContent) {
        localStorage.setItem(
          FORM_DRAFT_KEY,
          JSON.stringify({
            ...current,
            savedAt: Date.now(),
          })
        )
      }
    } catch (e) {
      console.warn("Could not auto-save form draft:", e)
    }
  }

  // Tự động khôi phục bản nháp khi mở trang & kích hoạt hẹn giờ lưu nháp 15s
  useEffect(() => {
    const cur = getStoredSession()
    setSession(cur)

    try {
      const rawDraft = localStorage.getItem(FORM_DRAFT_KEY)
      if (rawDraft) {
        const draft = JSON.parse(rawDraft)
        const hasContent = Boolean(
          (draft.title && draft.title.trim()) ||
          (draft.description && draft.description.trim()) ||
          (draft.business_need && draft.business_need.trim()) ||
          (draft.user_problem && draft.user_problem.trim()) ||
          (draft.product && draft.product.trim())
        )
        if (hasContent) {
          setForm((prev) => ({
            ...prev,
            ...draft,
            requester_email:
              cur?.teamsEmail || cur?.personalEmail || draft.requester_email || prev.requester_email,
          }))
          toast.info(
            "Đã khôi phục bản nháp chưa gửi!",
            "Dữ liệu bài toán đang nhập dở trước đó đã được tự động phục hồi."
          )
        } else if (cur) {
          setForm((f) => ({
            ...f,
            requester_email: cur.teamsEmail || cur.personalEmail,
          }))
        }
      } else if (cur) {
        setForm((f) => ({
          ...f,
          requester_email: cur.teamsEmail || cur.personalEmail,
        }))
      }
    } catch (e) {
      console.warn("Could not restore draft from localStorage:", e)
    }

    const intervalId = setInterval(() => {
      autoSaveDraft()
    }, 15000)

    return () => clearInterval(intervalId)
  }, [])

  // Cho phép dán ảnh chụp màn hình trực tiếp bằng Ctrl + V vào form yêu cầu
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (formConfig.rules && formConfig.rules.allowScreenshotsPaste === false) return
      const clipboardData = e.clipboardData
      if (!clipboardData) return

      const items = Array.from(clipboardData.items || [])
      const imageItems = items.filter((item) => item.type.startsWith("image/"))

      if (imageItems.length > 0) {
        const newPastedFiles: File[] = []
        imageItems.forEach((item, index) => {
          const blob = item.getAsFile()
          if (blob) {
            const ext = item.type.split("/")[1] || "png"
            const fileName = `screenshot-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}-${index + 1}.${ext}`
            const file = new File([blob], fileName, { type: item.type })
            newPastedFiles.push(file)
          }
        })

        if (newPastedFiles.length > 0) {
          setFiles((prev) => {
            const merged = [...prev, ...newPastedFiles]
            return merged.filter((f, i, a) => a.findIndex((x) => x.name === f.name && x.size === f.size) === i)
          })
          setAttachMode("file")
          toast.success(
            `Đã dán ${newPastedFiles.length} ảnh chụp màn hình (Ctrl + V) vào mục Tài liệu đính kèm!`
          )
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [])

  useEffect(() => {
    try {
      const cached = localStorage.getItem("ux_portal_selections_cache")
      if (cached && (cached.includes("App/Core") || cached.includes("App/Card"))) {
        localStorage.removeItem("ux_portal_selections_cache")
      }
    } catch {}
    setLoadingSelections(true)
    fetchFormSelections()
      .then(setSelections)
      .finally(() => setTimeout(() => setLoadingSelections(false), 200))
  }, [])

  const set = (field: keyof FormState) => (val: any) => {
    setForm((f) => ({ ...f, [field]: val }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Quản lý nhiều link tài liệu
  const handleLinkChange = (index: number, val: string) => {
    const newLinks = [...form.doc_links]
    newLinks[index] = val
    set("doc_links")(newLinks)
  }

  const handleAddLink = () => {
    set("doc_links")([...form.doc_links, ""])
  }

  const handleRemoveLink = (index: number) => {
    if (form.doc_links.length <= 1) {
      set("doc_links")([""])
      return
    }
    const newLinks = form.doc_links.filter((_, i) => i !== index)
    set("doc_links")(newLinks)
  }

  const rec = recommendSquad(form.product)

  // Validate form linh hoạt theo cấu hình Admin và giới hạn độ dài ký tự (Item 7)
  const validate = (): boolean => {
    const e: Record<string, string> = {}
    
    formConfig.fields.forEach((f) => {
      if (!f.enabled || !f.required) return

      if (f.key === "title" && !form.title.trim()) {
        e.title = `Vui lòng nhập ${f.label.toLowerCase()}`
      } else if (f.key === "product" && !form.product) {
        e.product = `Vui lòng chọn ${f.label.toLowerCase()}`
      } else if (f.key === "preferred_squad" && !form.preferred_squad) {
        e.preferred_squad = `Vui lòng chọn ${f.label.toLowerCase()}`
      } else if (f.key === "request_type" && !form.request_type) {
        e.request_type = `Vui lòng chọn ${f.label.toLowerCase()}`
      } else if (f.key === "description" && !form.description.trim()) {
        e.description = `Vui lòng nhập ${f.label.toLowerCase()}`
      } else if (f.key === "business_need" && !form.business_need.trim()) {
        e.business_need = `Vui lòng nhập ${f.label.toLowerCase()}`
      } else if (f.key === "user_problem" && !form.user_problem.trim()) {
        e.user_problem = `Vui lòng nhập ${f.label.toLowerCase()}`
      } else if (f.key === "target_user" && !form.target_user.trim()) {
        e.target_user = `Vui lòng nhập ${f.label.toLowerCase()}`
      } else if (f.key === "release_date" && !form.release_date) {
        e.release_date = `Vui lòng chọn ${f.label.toLowerCase()}`
      } else if (f.key === "deadline_reason" && !form.deadline_reason) {
        e.deadline_reason = `Vui lòng chọn ${f.label.toLowerCase()}`
      } else if (f.key === "leader_report_note" && !form.leader_report_note.trim()) {
        e.leader_report_note = `Vui lòng nhập ${f.label.toLowerCase()}`
      }
    })

    // Ràng buộc độ dài ký tự an toàn (Item 7: title <= 150 chars, brief/mô tả <= 10,000 chars)
    if (form.title && form.title.trim().length > 150) {
      e.title = `Tiêu đề không được vượt quá 150 ký tự (Hiện tại: ${form.title.trim().length} ký tự)`
    }
    if (form.description && form.description.trim().length > 10000) {
      e.description = `Mô tả không được vượt quá 10,000 ký tự (Hiện tại: ${form.description.trim().length} ký tự)`
    }
    if (form.business_need && form.business_need.trim().length > 10000) {
      e.business_need = `Nhu cầu kinh doanh không được vượt quá 10,000 ký tự (Hiện tại: ${form.business_need.trim().length} ký tự)`
    }
    if (form.user_problem && form.user_problem.trim().length > 10000) {
      e.user_problem = `Vấn đề người dùng không được vượt quá 10,000 ký tự (Hiện tại: ${form.user_problem.trim().length} ký tự)`
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Khi bấm "Gửi yêu cầu UX" ở màn hình nhập -> Khử khuẩn XSS và Chuyển sang màn Review
  const handleProceedToReview = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    setForm((prev) => ({
      ...prev,
      title: sanitizeXss(prev.title),
      description: sanitizeXss(prev.description),
      business_need: sanitizeXss(prev.business_need),
      user_problem: sanitizeXss(prev.user_problem),
      target_user: sanitizeXss(prev.target_user),
      leader_report_note: sanitizeXss(prev.leader_report_note),
    }))

    setViewMode("review")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Khi bấm "Xác nhận & Gửi chính thức" ở màn Review -> Upload Drive & Gửi lên Google Sheet
  const handleFinalSubmit = async () => {
    setSubmitLoading(true)
    const finalEmail = session?.teamsEmail || form.requester_email || "user@mbbank.com.vn"
    const validLinks = [...form.doc_links.filter((l) => l.trim().length > 0)]
    const uploadedAttachments: { name: string; url: string; size: number }[] = []

    try {
      // 1. Tải các file đính kèm lên Google Drive (Folder: UX_Portal_Attachments)
      if (files.length > 0) {
        for (const file of files) {
          const upRes = await uploadFileToDrive(file)
          if (upRes.success && upRes.fileUrl) {
            uploadedAttachments.push({
              name: upRes.fileName || file.name,
              url: upRes.fileUrl,
              size: upRes.fileSize || file.size,
            })
            validLinks.push(upRes.fileUrl)
          }
        }
      }

      // 2. Gửi bản ghi Task hoàn chỉnh lên Google Sheet
      const res = await submitRequest({
        ...form,
        title: capitalizeFirstLetter(sanitizeXss(form.title)),
        description: capitalizeSentences(sanitizeXss(form.description)),
        user_problem: capitalizeSentences(sanitizeXss(form.user_problem)),
        business_need: capitalizeSentences(sanitizeXss(form.business_need)),
        target_user: capitalizeFirstLetter(sanitizeXss(form.target_user)),
        doc_link: validLinks.join("\n"),
        requester_email: finalEmail,
        requester_name: session?.displayName || "PO",
        preferred_squad: form.preferred_squad || "",
        squad_name: form.preferred_squad || "",
        attachments: uploadedAttachments,
        current_phase: "Chờ xác nhận",
        status: "Chờ xác nhận",
        progress: 10,
      })
      setRequestId(res.requestId)
      setSheetLogResult(res.googleSheetResult)
      setViewMode("success")
      onSuccessChange?.(true)
      try {
        localStorage.removeItem(FORM_DRAFT_KEY)
      } catch {}
      window.scrollTo({ top: 0, behavior: "smooth" })

      // Tìm Designer Owner phụ trách Squad
      let ownerName = "Nguyễn Văn Cường"
      try {
        const targetSquad = (form.preferred_squad || "").trim()
        const saved = localStorage.getItem("mbbank_admin_squads")
        if (saved) {
          const list: any[] = JSON.parse(saved)
          const found = list.find((s) => (s.name || s.squad_name || "").toLowerCase() === targetSquad.toLowerCase())
          if (found && (found.ux_owner || found.owner)) ownerName = found.ux_owner || found.owner
        }
        if (ownerName === "Nguyễn Văn Cường") {
          const foundMock = mockSquads.find((s) => s.squad_name.toLowerCase().includes(targetSquad.toLowerCase()))
          if (foundMock && foundMock.ux_owner) ownerName = foundMock.ux_owner
        }
      } catch {}
      const cleanOwner = ownerName.replace(/\s*\(.*?\)\s*/g, "").trim()

      toast.success(
        "Tạo yêu cầu thành công",
        `Yêu cầu đã được gửi đến Designer Owner (${cleanOwner}) phụ trách Squad.`
      )
      dispatchNotification({
        type: "task_created",
        requestId: res.requestId,
        taskTitle: form.title,
        actorName: session?.displayName || "PO",
        actorRole: session?.role || "PO",
        squadName: form.preferred_squad || "Chung",
        ownerName: cleanOwner,
        recipient: `${cleanOwner} (Designer Owner)`,
        targetRole: "Designer Owner",
        showToast: false,
      })
    } catch {
      setViewMode("edit")
      onSuccessChange?.(false)
      toast.error("Lỗi khi gửi yêu cầu", "Không thể gửi yêu cầu lên hệ thống. Vui lòng thử lại sau.")
    } finally {
      setSubmitLoading(false)
    }
  }

  // Lấy cấu hình phân bổ cho PO từ session hoặc Admin Settings trong LocalStorage
  const userRole = session?.role || "PO"
  const userEmail = (session?.teamsEmail || session?.personalEmail || "").toLowerCase()
  
  let allocatedProducts: string[] = session?.products || []
  let allocatedSquads: string[] = session?.squads || []

  try {
    const rawTeam = localStorage.getItem("mbbank_admin_team")
    if (rawTeam) {
      const parsedTeam: any[] = JSON.parse(rawTeam)
      const found = parsedTeam.find(
        (m) =>
          m.email?.toLowerCase() === userEmail ||
          (session?.displayName && m.name?.toLowerCase() === session.displayName.toLowerCase())
      )
      if (found) {
        if (found.products && found.products.length > 0) allocatedProducts = found.products
        if (found.squads && found.squads.length > 0) allocatedSquads = found.squads
      }
    }
  } catch {}

  // Master products list: Luôn ưu tiên đọc từ Cài đặt Quản lý (Settings) trong LocalStorage
  const masterProducts: string[] = (() => {
    try {
      const rawProds = localStorage.getItem("mbbank_admin_products")
      if (rawProds) {
        const parsed = JSON.parse(rawProds)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const active = parsed
            .filter((p: any) => p.status !== "Inactive")
            .map((p: any) => p.name)
          if (active.length > 0) return active
        }
      }
    } catch {}

    const clean = selections.products?.filter(
      (p) => !p.startsWith("App/") && p !== "Digi" && p !== "Internet Banking"
    )
    if (clean && clean.length > 0) return clean
    return DEFAULT_PRODUCTS
  })()

  const isRestrictedPo = userRole === "PO" && allocatedProducts.length > 0
  const availableProductList = isRestrictedPo
    ? masterProducts.filter((p) =>
        allocatedProducts.some(
          (ap) =>
            ap.toLowerCase().includes(p.toLowerCase()) ||
            p.toLowerCase().includes(ap.toLowerCase())
        )
      ).length > 0
      ? masterProducts.filter((p) =>
          allocatedProducts.some(
            (ap) =>
              ap.toLowerCase().includes(p.toLowerCase()) ||
              p.toLowerCase().includes(ap.toLowerCase())
          )
        )
      : allocatedProducts
    : masterProducts

  // All active squads from localStorage or mock
  const allSquads: any[] = (() => {
    try {
      const stored = localStorage.getItem("mbbank_admin_squads")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return squads && squads.length > 0 ? squads : mockSquads
  })()

  // Filter squads belonging to the selected product
  const relevantSquads = form.product
    ? allSquads.filter((s: any) => {
        const prod = (s.productName || s.product_name || "").toLowerCase().trim()
        const target = form.product.toLowerCase().trim()
        return prod === target || prod.includes(target) || target.includes(prod)
      })
    : []

  const squadOptions: DropdownOption[] = (() => {
    if (!form.product) {
      return [{ value: "", label: "Chọn sản phẩm trước..." }]
    }
    if (relevantSquads.length > 0) {
      return relevantSquads.map((s: any) => {
        const name = s.name || s.squad_name || ""
        return {
          value: name,
          label: name,
          description: s.domain || undefined,
        }
      })
    }
    // Nếu sản phẩm chưa có squad cấu hình riêng trong Admin (như BaaS, Khác...)
    const defaultProdSquad: DropdownOption = {
      value: form.product,
      label: `Squad ${form.product}`,
      description: `Squad chuyên trách theo sản phẩm ${form.product}`,
    }
    const otherOptions: DropdownOption[] = allSquads
      .map((s: any) => {
        const name = s.name || s.squad_name || ""
        return {
          value: name,
          label: name,
          description: s.domain || undefined,
        }
      })
      .filter((opt) => opt.value && opt.value !== form.product)

    return [defaultProdSquad, ...otherOptions]
  })()

  const handleProductChange = (val: string) => {
    setForm((f) => ({
      ...f,
      product: val,
      preferred_squad: val, // Gán mặc định squad cùng tên sản phẩm để tránh bị rỗng
    }))
    if (errors.product) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.product
        return next
      })
    }
  }

  // Options for custom ReUI dropdowns
  const productOptions: DropdownOption[] = availableProductList.map((p) => ({
    value: p,
    label: p,
  }))

  const requestTypeOptions: DropdownOption[] = (() => {
    const configList = formConfig.options?.requestTypes?.filter((item) => item.enabled)
    if (configList && configList.length > 0) {
      return configList.map((rt) => ({
        value: rt.value,
        label: rt.label,
        description: rt.description,
      }))
    }
    return selections.request_types.map((rt) => ({
      value: rt,
      label: rt,
    }))
  })()

  const deadlineReasonOptions: DropdownOption[] = (() => {
    const configList = formConfig.options?.deadlineReasons?.filter((item) => item.enabled)
    const baseList = configList && configList.length > 0
      ? configList.map((dr) => ({ value: dr.value, label: dr.label, description: dr.description }))
      : selections.deadline_reasons.map((dr) => ({ value: dr, label: dr }))
    return [
      { value: "", label: "Chọn lý do..." },
      ...baseList,
    ]
  })()

  const hostName = session?.displayName || "Trần Hoàng Long"

  return (
    <AnimatePresence mode="wait">
      {loadingSelections ? (
        <motion.div
          key="form-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <FormSkeleton />
        </motion.div>
      ) : viewMode === "success" ? (
        <motion.div
          key="form-success"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <SuccessCelebrationCard
            requestId={requestId}
            squad={rec}
            syncMessage={sheetLogResult?.message}
            onCreateAnother={() => {
              try {
                localStorage.removeItem(FORM_DRAFT_KEY)
              } catch {}
              setForm({
                title: "",
                requester_email: session?.teamsEmail || session?.personalEmail || "",
                product: "",
                request_type: "",
                description: "",
                business_need: "",
                user_problem: "",
                target_user: "",
                release_date: "",
                deadline_reason: "",
                preferred_squad: "",
                doc_links: [""],
                leader_report_note: "",
                expected_output: ["Wireframe", "Prototype tương tác"],
              })
              setFiles([])
              setViewMode("edit")
              onSuccessChange?.(false)
              setErrors({})
            }}
            onGoToTrack={() => {
              window.location.hash = "#track"
              window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: "track", requestId } }))
              window.dispatchEvent(new HashChangeEvent("hashchange"))
            }}
          />
        </motion.div>
      ) : (
        <motion.form
          key="form-edit"
          variants={cascadeWaveContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onSubmit={handleProceedToReview}
          className="space-y-8 pb-16"
        >
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Main Form Content (8 Cols) */}
        <div className="w-full xl:col-span-8 space-y-8">
          
          {/* Main Title Đồng Bộ */}
          <motion.div
            custom={0}
            variants={cascadeWaveItemVariants}
            style={{ willChange: "opacity, transform, filter" }}
          >
            <PageHeader
              breadcrumb={{
                parent: formConfig.header?.parentBreadcrumb || "MBBank UX Platform",
                current: formConfig.header?.currentBreadcrumb || "Tạo task mới",
              }}
              title={formConfig.header?.title || "Gửi yêu cầu thiết kế UX"}
              subtitle={formConfig.header?.subtitle || "Điền đầy đủ thông tin đề bài để UX Squad tiếp nhận và xử lý nhanh chóng nhất"}
            />
          </motion.div>

          {/* 01 · THÔNG TIN YÊU CẦU */}
          <motion.div
            custom={1}
            variants={cascadeWaveItemVariants}
            style={{ willChange: "opacity, transform, filter" }}
            className="space-y-4 relative z-30"
          >
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {formConfig.sections?.requestInfoTitle || "01 · THÔNG TIN YÊU CẦU"}
            </h2>

            {/* Tiêu đề yêu cầu */}
            {isFieldEnabled("title") && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  {getFieldLabel("title", "Tiêu đề yêu cầu")}{" "}
                  {isFieldRequired("title") && <span className="text-rose-500">*</span>}
                </label>
                <Input
                  type="text"
                  value={form.title}
                  maxLength={150}
                  onChange={(e) => set("title")(e.target.value)}
                  placeholder={getFieldPlaceholder("title", "VD: Thiết kế lại màn hình chuyển tiền quốc tế")}
                  className="h-12 bg-white rounded-xl border-slate-200 text-sm px-4"
                  error={Boolean(errors.title)}
                />
                {errors.title && <p className="text-sm text-rose-500 font-medium">{errors.title}</p>}
              </div>
            )}

            {/* 3-Column: Sản phẩm số, Squad nghiệp vụ trực thuộc & Loại yêu cầu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Cột 1: Sản phẩm số */}
              {isFieldEnabled("product") && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      {getFieldLabel("product", "Sản phẩm số")}{" "}
                      {isFieldRequired("product") && <span className="text-rose-500">*</span>}
                    </label>
                    {isRestrictedPo && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                        ⚡ Phân bổ PO ({allocatedProducts.length} SP)
                      </span>
                    )}
                  </div>
                  <DropdownMenu
                    options={productOptions}
                    value={form.product}
                    onChange={handleProductChange}
                    placeholder={getFieldPlaceholder("product", "Chọn sản phẩm...")}
                    className="w-full"
                    buttonClassName={`w-full h-12 bg-slate-100/70 hover:bg-slate-100 border-slate-200/60 rounded-xl px-4 justify-between font-semibold text-slate-800 ${
                      errors.product ? "border-rose-400 ring-1 ring-rose-200" : ""
                    }`}
                  />
                  {errors.product && <p className="text-sm text-rose-500 font-medium">{errors.product}</p>}
                </div>
              )}

              {/* Cột 2: Squad nghiệp vụ trực thuộc */}
              {isFieldEnabled("preferred_squad") && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      {getFieldLabel("preferred_squad", "Squad nghiệp vụ")}{" "}
                      {isFieldRequired("preferred_squad") && <span className="text-rose-500">*</span>}
                    </label>
                    {form.product && relevantSquads.length > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {relevantSquads.length} squads
                      </span>
                    )}
                  </div>
                  <DropdownMenu
                    options={squadOptions}
                    value={form.preferred_squad}
                    onChange={(val) => set("preferred_squad")(val)}
                    placeholder={form.product ? getFieldPlaceholder("preferred_squad", "Chọn squad...") : "Chọn sản phẩm trước..."}
                    className="w-full"
                    buttonClassName="w-full h-12 bg-slate-100/70 hover:bg-slate-100 border-slate-200/60 rounded-xl px-4 justify-between font-semibold text-slate-800"
                  />
                  {errors.preferred_squad && <p className="text-sm text-rose-500 font-medium">{errors.preferred_squad}</p>}
                </div>
              )}

              {/* Cột 3: Loại yêu cầu */}
              {isFieldEnabled("request_type") && (
                <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
                  <label className="block text-sm font-medium text-slate-700">
                    {getFieldLabel("request_type", "Loại yêu cầu")}{" "}
                    {isFieldRequired("request_type") && <span className="text-rose-500">*</span>}
                  </label>
                  <DropdownMenu
                    options={requestTypeOptions}
                    value={form.request_type}
                    onChange={(val) => set("request_type")(val)}
                    placeholder={getFieldPlaceholder("request_type", "Chọn loại yêu cầu...")}
                    className="w-full"
                    buttonClassName={`w-full h-12 bg-slate-100/70 hover:bg-slate-100 border-slate-200/60 rounded-xl px-4 justify-between font-semibold text-slate-800 ${
                      errors.request_type ? "border-rose-400 ring-1 ring-rose-200" : ""
                    }`}
                  />
                  {errors.request_type && <p className="text-sm text-rose-500 font-medium">{errors.request_type}</p>}
                </div>
              )}
            </div>
          </motion.div>

          {/* 02 · MÔ TẢ CHI TIẾT NHU CẦU CẦN UX TEAM HỖ TRỢ */}
          <motion.div
            custom={2}
            variants={cascadeWaveItemVariants}
            style={{ willChange: "opacity, transform, filter" }}
            className="space-y-4 pt-2 relative z-20"
          >
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {formConfig.sections?.detailDescTitle || "02 · MÔ TẢ CHI TIẾT NHU CẦU CẦN UX TEAM HỖ TRỢ"}
            </h2>

            {/* Mô tả yêu cầu */}
            {isFieldEnabled("description") && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  {getFieldLabel("description", "Mô tả yêu cầu")}{" "}
                  {isFieldRequired("description") && <span className="text-rose-500">*</span>}
                </label>
                <Textarea
                  value={form.description}
                  maxLength={10000}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder={getFieldPlaceholder("description", "Mô tả ngắn gọn bối cảnh và mục tiêu nghiệp vụ...")}
                  className="min-h-[100px] bg-white rounded-xl border-slate-200 text-sm p-4 leading-relaxed"
                  error={Boolean(errors.description)}
                />
                {errors.description && <p className="text-sm text-rose-500 font-medium">{errors.description}</p>}
              </div>
            )}

            {/* Nhu cầu nghiệp vụ */}
            {isFieldEnabled("business_need") && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  {getFieldLabel("business_need", "Nhu cầu nghiệp vụ")}{" "}
                  {isFieldRequired("business_need") && <span className="text-rose-500">*</span>}
                </label>
                <Textarea
                  value={form.business_need}
                  maxLength={10000}
                  onChange={(e) => set("business_need")(e.target.value)}
                  placeholder={getFieldPlaceholder("business_need", "Giải thích vì sao bài toán này cần thực hiện...")}
                  className="min-h-[80px] bg-white rounded-xl border-slate-200 text-sm p-4 leading-relaxed"
                />
                {errors.business_need && <p className="text-sm text-rose-500 font-medium">{errors.business_need}</p>}
              </div>
            )}

            {/* Vấn đề của người dùng */}
            {isFieldEnabled("user_problem") && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  {getFieldLabel("user_problem", "Vấn đề của người dùng")}{" "}
                  {isFieldRequired("user_problem") && <span className="text-rose-500">*</span>}
                </label>
                <Textarea
                  value={form.user_problem}
                  maxLength={10000}
                  onChange={(e) => set("user_problem")(e.target.value)}
                  placeholder={getFieldPlaceholder("user_problem", "Khách hàng đang gặp khó khăn hay điểm nghẽn gì...")}
                  className="min-h-[80px] bg-white rounded-xl border-slate-200 text-sm p-4 leading-relaxed"
                />
                {errors.user_problem && <p className="text-sm text-rose-500 font-medium">{errors.user_problem}</p>}
              </div>
            )}

            {/* Đối tượng người dùng mục tiêu */}
            {isFieldEnabled("target_user") && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  {getFieldLabel("target_user", "Đối tượng người dùng mục tiêu")}{" "}
                  {isFieldRequired("target_user") && <span className="text-rose-500">*</span>}
                </label>
                <Input
                  type="text"
                  value={form.target_user}
                  onChange={(e) => set("target_user")(e.target.value)}
                  placeholder={getFieldPlaceholder("target_user", "VD: Khách hàng retail banking, độ tuổi 25-45")}
                  className="h-12 bg-white rounded-xl border-slate-200 text-sm px-4"
                />
                {errors.target_user && <p className="text-sm text-rose-500 font-medium">{errors.target_user}</p>}
              </div>
            )}
          </motion.div>

          {/* 03 · TÀI LIỆU ĐÍNH KÈM */}
          {isFieldEnabled("doc_attachments") && (
            <motion.div
              custom={3}
              variants={cascadeWaveItemVariants}
              style={{ willChange: "opacity, transform, filter" }}
              className="space-y-4 pt-2 relative z-10"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {formConfig.sections?.attachmentsTitle || "03 · TÀI LIỆU ĐÍNH KÈM"}
                </h2>

                {/* Segmented Pill Toggle: Gửi link tài liệu | Tải file lên */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setAttachMode("link")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      attachMode === "link"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Gửi link tài liệu
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachMode("file")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      attachMode === "file"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tải file lên
                  </button>
                </div>
              </div>

              {/* Input Link (Multiple Links with + Button) or File Upload */}
              {attachMode === "link" ? (
                <div className="space-y-3">
                  {form.doc_links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                          type="url"
                          value={link}
                          onChange={(e) => handleLinkChange(idx, e.target.value)}
                          placeholder="https://figma.com/... hoặc link tài liệu đề bài Jira / Confluence"
                          className="h-11 pl-10 pr-4 bg-white rounded-xl border-slate-200 text-sm"
                        />
                      </div>
                      {form.doc_links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="size-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* + Button gắn thêm link */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLink}
                    className="gap-1.5 text-xs sm:text-sm font-semibold rounded-xl border-dashed border-slate-300 hover:border-slate-900 hover:text-slate-900 bg-white h-9 px-3"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm liên kết tài liệu khác</span>
                  </Button>
                </div>
              ) : (
                <FileUpload files={files} onFilesChange={setFiles} />
              )}
            </motion.div>
          )}

        </div>

        {/* RIGHT COLUMN: KẾ HOẠCH Floating Card with Joly UI SpotlightCard & BorderBeam */}
        <motion.div 
          custom={4}
          variants={cascadeWaveItemVariants}
          style={{ willChange: "opacity, transform, filter" }}
          className="w-full xl:col-span-4 xl:sticky xl:top-20"
        >
          <SpotlightCard
            mode="afterglow"
            className="bg-white border border-slate-200/90 rounded-xl shadow-xl shadow-slate-900/5 relative"
          >
            <BorderBeam colorFrom="#1057FB" colorTo="#0D9B97" duration={7} />
            
            <div className="p-6 sm:p-7 space-y-6 relative z-20">
              {/* Card Header */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 line-clamp-3 break-words leading-snug">
                  {form.title ? form.title : "Tên yêu cầu"}
                </h3>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
                  <span>Người gửi</span>
                  <UserAvatar name={hostName} avatarUrl={session?.avatarUrl} size="xs" />
                  <span className="font-semibold text-slate-900">{hostName}</span>
                </div>
              </div>

              {/* Ô CHỌN 1: Ngày release dự kiến (Nguyên khối chuẩn Figma / ReUI) */}
              {isFieldEnabled("release_date") && (
                <div className="space-y-1">
                  <DatePicker
                    label={`${getFieldLabel("release_date", "Ngày release dự kiến")}${isFieldRequired("release_date") ? " *" : ""}`}
                    icon={<Calendar className="w-5 h-5" />}
                    value={form.release_date}
                    onChange={(val) => set("release_date")(val)}
                    placeholder={getFieldPlaceholder("release_date", "Chọn ngày...")}
                    className="w-full"
                  />
                  {errors.release_date && <p className="text-sm text-rose-500 font-medium pl-1">{errors.release_date}</p>}
                </div>
              )}

              {/* Ô CHỌN 2: Lý do thời hạn (CÙNG THIẾT KẾ NGUYÊN KHỐI 100%) */}
              {isFieldEnabled("deadline_reason") && (
                <div className="space-y-1">
                  <DropdownMenu
                    label={`${getFieldLabel("deadline_reason", "Lý do thời hạn này quan trọng?")}${isFieldRequired("deadline_reason") ? " *" : ""}`}
                    icon={<User className="w-5 h-5" />}
                    options={deadlineReasonOptions}
                    value={form.deadline_reason}
                    onChange={(val) => set("deadline_reason")(val)}
                    placeholder={getFieldPlaceholder("deadline_reason", "Chọn lý do...")}
                    className="w-full"
                  />
                  {errors.deadline_reason && <p className="text-sm text-rose-500 font-medium pl-1">{errors.deadline_reason}</p>}
                </div>
              )}

              {/* Kế hoạch báo cáo sắp tới */}
              {isFieldEnabled("leader_report_note") && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    {getFieldLabel("leader_report_note", "Kế hoạch báo cáo sắp tới")}{" "}
                    {isFieldRequired("leader_report_note") && <span className="text-rose-500">*</span>}
                  </label>
                  <Textarea
                    value={form.leader_report_note}
                    onChange={(e) => set("leader_report_note")(e.target.value)}
                    placeholder={getFieldPlaceholder("leader_report_note", "VD: Báo cáo sếp Mai Anh vào ngày 01/06")}
                    rows={4}
                    className="bg-white rounded-xl border-slate-200 p-3.5 text-sm"
                  />
                  {errors.leader_report_note && <p className="text-sm text-rose-500 font-medium">{errors.leader_report_note}</p>}
                </div>
              )}

              {/* Submit Button -> ReUI Primary Dark Navy Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                tactile
                className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800 text-base font-semibold rounded-xl shadow-xs cursor-pointer"
              >
                {formConfig.sections?.submitButtonText || "Gửi yêu cầu UX"}
              </Button>

              {/* Footer Power by Tag */}
              <p className="text-[11px] text-slate-400 text-center font-medium">
                ® Powered by MB UX Team
              </p>
            </div>
          </SpotlightCard>
        </motion.div>

      </div>

      {/* REUI APPLICATION SHEET-11: XÁC NHẬN THÔNG TIN ĐỀ BÀI */}
      <RequestReviewSheet
        open={viewMode === "review"}
        onClose={() => setViewMode("edit")}
        onConfirm={handleFinalSubmit}
        isSubmitting={submitLoading}
        files={files}
        form={form}
        recommendedSquad={rec}
        session={session}
      />
        </motion.form>
      )}
    </AnimatePresence>
  )
}
