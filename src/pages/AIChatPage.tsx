import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  PanelLeft,
  ArrowUp,
  ArrowLeft,
  Bookmark,
  Download,
  MoreHorizontal,
  Edit2,
  FolderOpen,
  BookOpen,
  Code,
  Activity,
  X,
  Pin,
  CornerDownLeft,
  Sparkles,
  AlertCircle,
  FileText,
  Upload,
  FileCode,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Send,
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle2,
  AtSign,
  Command as CommandIcon,
  Loader2,
  Brain,
  Circle,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  ChevronsUpDown,
  BarChart3,
  GitBranch,
  Lock,
  Cloud,
  CloudOff,
  RefreshCw,
  Key,
} from "lucide-react"
import { EchoInteractiveChart, EchoMermaidFlowchart } from "@/components/common/EchoChartsAndFlowcharts"
import { DropdownMenu } from "@/components/reui/dropdown-menu"
import { IconStackLarge } from "@/components/reui/c-icon-stack-2"
import { EchoArtifactSplitViewer } from "@/components/chat/EchoArtifactSplitViewer"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getStoredSession } from "@/services/otpAuthService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { type UXRequest } from "@/data/mockData"
import { canRoleAccessCapability, canUploadAiArtifacts, canUserAccessRequest } from "@/lib/accessControl"
import { extractExecutiveIntelligence, type ExecutiveIntelligenceData } from "@/lib/executiveIntelligence"
import { loadAllCalendarItems, type PlannerEntry } from "@/services/calendarService"
import { fetchRequests } from "@/api/api"
import {
  buildChatPrompt,
  serializeContext,
  buildEnrichedContext,
  detectUserIntent,
  searchArtifactsByQuery,
  serializeArtifactsContext,
  type PromptMessage,
} from "@/config/aiPrompts"
import {
  streamAICompletion,
  POPULAR_AI_MODELS,
  getStoredAIModel,
  saveAIModel,
  getDailyAIUsage,
  getStoredGeminiKey,
  saveGeminiKey,
  getStoredAIGateway,
  saveAIGateway,
  testGeminiConnection,
  type AIDailyUsage,
} from "@/services/aiService"
import {
  getStoredArtifacts,
  saveStoredArtifacts,
  addArtifact,
  deleteArtifact,
  formatFileSize,
  mergeCloudArtifacts,
  type UXArtifact,
} from "@/services/aiArtifactsService"
import {
  uploadFileToDrive,
  syncMasterDataToSheet,
  fetchMasterDataFromSheet,
  syncUserChatThreadsToCloud,
  fetchUserChatThreadsFromCloud,
  updateTaskProgressInSheet,
} from "@/services/googleSheetService"
import { getGoogleSheetConfig } from "@/config/googleSheetConfig"
import RequestDetail from "@/components/track/RequestDetail"
import { AgentActivityTrace } from "@/components/planner/AgentActivityTrace"
import aiDefaultLogo from "@/assets/ai-default.png"

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatTraceData {
  activeTasks: UXRequest[]
  summaryProjects: UXRequest[]
  riskProjects: UXRequest[]
  goLiveTasks: UXRequest[]
  dominantPhaseText: string
}

export interface ChatProcessStep {
  id: string
  label: string
  status: "pending" | "running" | "completed"
  timestamp?: string
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
  modelUsed?: string
  feedback?: "up" | "down"
  attachedArtifactName?: string
  senderName?: string
  senderAvatar?: string
  senderEmail?: string
  reasoning?: string
  thinkingDurationSeconds?: number
  responseSource?: "remote" | "local-fallback"
  responseModel?: string
  responseProviderError?: string
  processSteps?: ChatProcessStep[]
  isThinkingComplete?: boolean
  traceData?: ChatTraceData
}

interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  isPinned?: boolean
  fileBadge?: string
  timeAgo?: string
}

const STORAGE_THREADS_KEY = "ux_mb_ai_chat_threads"
const STORAGE_ACTIVE_THREAD_ID = "ux_mb_ai_active_thread_id"

// Initial Demo Thread showcase all 4 rich UI formats (Table, Action Card, Code/Artifact, Suggestions, Referenced Docs)
const INITIAL_DEMO_THREADS: ChatThread[] = [
  {
    id: "thread-showcase-rich-ui",
    title: "Thống kê biến động & điều chỉnh lịch trình",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    isPinned: true,
    fileBadge: "release-notes-3.4.md",
    timeAgo: "30p trước",
    messages: [
      {
        id: "msg-user-showcase",
        role: "user",
        content: "Thống kê driver giảm người dùng tháng 7 và tháng 8, đồng thời đề xuất điều chỉnh lịch họp hôm nay giúp tôi.",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        senderName: "Designer MBBank",
      },
      {
        id: "msg-assistant-showcase",
        role: "assistant",
        content: `Measured as excess over July, which is the only number that explains 2.6 becoming 4.1:

| Driver | July | August | Change |
|---|---|---|---|
| Seat reductions | 1 | 5 | 4 |
| Promo renewals | 6 | 9 | 3 |
| Missing SSO | 3 | 4 | 1 |
| No signal | 3 | 3 | 0 |
| Total | 13 | 21 | 8 |

Seat reductions are the actual change, and every one of the five fell below five seats first. The promo delta shrinks as the cohort empties in October, and plus one on SSO is noise at this sample size whatever the exit survey says.

\`\`\`action
{
  "title": "Bài toán UX trọng điểm cần theo dõi:",
  "items": [
    { "icon": "task", "title": "Chuyển nhượng CDs khớp 1 phần", "action": "đang ở Khâu 6 - Nghiệm thu (PO Pending 26h)." }
  ],
  "notified": {
    "label": "Designer phụ trách",
    "users": [
      { "name": "Lê Hoàng Nam (Designer)", "avatar": "" }
    ]
  },
  "prompt": "Bấm bên dưới để mở xem chi tiết tiến độ bài toán.",
  "approveText": "Xem chi tiết bài toán",
  "rejectText": "Đóng"
}
\`\`\`

Number out. The sentence still carries the change:

\`\`\`markdown:release-notes-3.4.md
## Highlights

Three things get out of your way in 3.4.
Refund confirmations arrive in under a minute instead of on the next queue drain.
Group membership syncs on the user schedule, so access stops drifting between runs. Large CSV exports finish instead of timing out at the gateway.
\`\`\`

\`\`\`sources
[
  {"name": "release-notes-3.4.md", "status": "Draft, edited 14m ago"},
  {"name": "release-notes-3.3.md", "status": "Published Jul 30"}
]
\`\`\`

\`\`\`suggestions
Shorten to two lines
Add the retry window
\`\`\``,
        timestamp: new Date(Date.now() - 1750000).toISOString(),
        modelUsed: "Claude Sonnet 5",
        reasoning: "1. Tiếp nhận & phân tích yêu cầu: Thống kê driver giảm người dùng và rà soát lịch họp.\n2. Rà soát hệ thống UX MB: Đọc dữ liệu chỉ số tháng 7-8 và đối soát lịch Deep Work.\n3. Tổng hợp bảng đối chiếu, thẻ phê duyệt hành động và trích xuất release notes chuẩn.",
        isThinkingComplete: true,
        thinkingDurationSeconds: 2.1,
      },
    ],
  },
]

/**
 * Tự động tạo tiêu đề ngắn gọn, chuẩn xác cho đoạn chat từ câu hỏi / prompt đầu tiên của người dùng
 */
export function generateThreadTitle(prompt: string): string {
  if (!prompt || !prompt.trim()) return "Cuộc trò chuyện mới"

  let text = prompt.trim()

  // 1. Loại bỏ slash command ở đầu nếu có (ví dụ: /tiendo, /po, /nangsuat, /quychuan)
  text = text.replace(/^\/[a-zA-Z0-9_\-]+\s*/i, "").trim()

  // 2. Loại bỏ mention tài liệu ở đầu nếu có (ví dụ: @kehoach-tuan.md)
  text = text.replace(/^@[\w\.\-]+\s*/i, "").trim()

  // 3. Lọc bỏ các từ đệm chào hỏi / nhờ vả thông dụng trong tiếng Việt để tiêu đề súc tích
  text = text.replace(
    /^(hãy\s+(giúp\s+tôi\s+|cho\s+tôi\s+)?|giúp\s+tôi\s+|nhờ\s+bạn\s+|bạn\s+ơi\s+|xin\s+chào\s+|cho\s+mình\s+hỏi\s+|mình\s+muốn\s+hỏi\s+|làm\s+thế\s+nào\s+để\s+|hỏi\s+về\s+|kiểm\s+tra\s+xem\s+|tổng\s+hợp\s+giúp\s+tôi\s+|tóm\s+tắt\s+giúp\s+tôi\s+)/i,
    ""
  ).trim()

  if (!text) text = prompt.trim()

  // 4. Viết hoa chữ cái đầu tiên
  text = text.charAt(0).toUpperCase() + text.slice(1)

  // 5. Cắt ngắn tại ranh giới từ khoảng 38-42 ký tự kèm dấu "..."
  if (text.length > 42) {
    const truncated = text.slice(0, 40)
    const lastSpace = truncated.lastIndexOf(" ")
    if (lastSpace > 18) {
      return truncated.slice(0, lastSpace).trim() + "..."
    }
    return truncated.trim() + "..."
  }

  return text
}

// Danh mục câu hỏi gợi ý chuẩn MBBank UX cho Empty State
const EMPTY_STATE_CATEGORIES = [
  {
    id: "progress" as const,
    label: "⚡ Tiến độ",
    icon: Sparkles,
    color: "text-blue-600",
    prompts: [
      "Tổng hợp các bài toán ưu tiên Lv1/Lv2 và deadline hôm nay",
      "Rà soát tiến độ 7 khâu của các bài toán đang ở pha UI/UX Design",
      "Báo cáo những bài toán có nguy cơ trễ hạn bàn giao trong tuần",
    ],
  },
  {
    id: "po" as const,
    label: "🔍 Rà soát PO",
    icon: Clock,
    color: "text-amber-500",
    prompts: [
      "Kiểm tra các bài toán đang PO Pending quá 24h cần đôn đốc",
      "Soạn nội dung nhắc PO phê duyệt phương án thiết kế Wireframe",
      "Danh sách bài toán đang chờ BA/PO làm rõ yêu cầu nghiệp vụ",
    ],
  },
  {
    id: "productivity" as const,
    label: "🎯 Năng suất",
    icon: Activity,
    color: "text-emerald-500",
    prompts: [
      "Hôm nay tôi có bao nhiêu giờ Deep Work và lịch họp thế nào?",
      "Đề xuất phân bổ bài toán để đảm bảo thời gian thiết kế tập trung",
      "Thống kê tổng giờ thiết kế và khối lượng công việc tuần này",
    ],
  },
  {
    id: "standards" as const,
    label: "📐 Quy chuẩn",
    icon: BookOpen,
    color: "text-purple-500",
    prompts: [
      "Tóm tắt checklist bàn giao thiết kế (Ready for Dev) cho tôi",
      "Tra cứu bảng màu Brand Tokens và kích thước Button chuẩn MBBank",
      "Quy chuẩn thiết kế các trạng thái Empty, Loading và Error State",
      "So sánh tiêu chuẩn SLA bàn giao và quy trình 7 khâu UX",
    ],
  },
  {
    id: "actions" as const,
    label: "🔄 Cập nhật",
    icon: Activity,
    color: "text-rose-500",
    prompts: [
      "Cập nhật tiến độ các bài toán đang thiết kế lên 80%",
      "Chuyển bài toán eKYC NFC sang khâu Nghiệm thu",
      "Ghi chú: Đã hoàn thiện Wireframe v2 cho luồng mở thẻ tín dụng",
    ],
  },
]

// Dữ liệu Recent Chats mẫu chuẩn MBBank khi người dùng chưa có cuộc trò chuyện nào
const DEMO_RECENT_CHATS = [
  {
    id: "demo-recent-1",
    title: "Rà soát điểm nghẽn luồng eKYC & Smart OTP",
    fileBadge: "Quy-trinh-7-khau-UX-MBBank.md",
    timeAgo: "2h",
    prompt: "Rà soát điểm nghẽn luồng eKYC & Smart OTP theo quy trình 7 khâu của MBBank",
  },
  {
    id: "demo-recent-2",
    title: "Bàn giao thiết kế màn hình chuyển tiền quốc tế",
    fileBadge: "Tieu-chuan-Design-Handoff-MB.md",
    timeAgo: "1d",
    prompt: "Kiểm tra tiêu chuẩn bàn giao thiết kế màn hình chuyển tiền quốc tế cho Dev",
  },
  {
    id: "demo-recent-3",
    title: "Rà soát các bài toán PO Pending quá hạn SLA 24h",
    fileBadge: "Chinh-sach-SLA-va-PO-Pending.md",
    timeAgo: "3d",
    prompt: "Tổng hợp các bài toán đang bị PO Pending quá 24h theo chính sách SLA của MB",
  },
]

// Từ khóa phát hiện các đoạn chat test tiếng Anh cũ từ template Echo Chat để dọn dẹp sạch sẽ
export const ECHO_DEMO_KEYWORDS = [
  "legacy-echo-mock",
  "demo-test-stripe-payment",
]

export function isEchoTestDemoThread(t: any): boolean {
  if (!t) return false
  const id = (t.id || "").toLowerCase()
  if (id.startsWith("legacy-echo-") || id.startsWith("demo-echo-")) {
    return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface AIChatPageProps {
  onBackToPortal?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AIChatPage({ onBackToPortal }: AIChatPageProps) {
  const [session, setSession] = useState(() => getStoredSession())
  const [canUseAi, setCanUseAi] = useState<boolean>(() => {
    return canRoleAccessCapability(getStoredSession()?.role, "cap-ai-use")
  })
  const [canUploadArtifacts, setCanUploadArtifacts] = useState<boolean>(() => {
    return canUploadAiArtifacts(getStoredSession())
  })

  useEffect(() => {
    const handleRbac = () => {
      const s = getStoredSession()
      setSession(s)
      setCanUseAi(canRoleAccessCapability(s?.role, "cap-ai-use"))
      setCanUploadArtifacts(canUploadAiArtifacts(s))
    }
    window.addEventListener("storage", handleRbac)
    window.addEventListener("auth_session_changed", handleRbac)
    window.addEventListener("rbac_permissions_changed", handleRbac)
    return () => {
      window.removeEventListener("storage", handleRbac)
      window.removeEventListener("auth_session_changed", handleRbac)
      window.removeEventListener("rbac_permissions_changed", handleRbac)
    }
  }, [])

  const userName = session?.displayName || (session as any)?.name || (session as any)?.username || "Designer"

  // Context & Task data
  const [tasks, setTasks] = useState<UXRequest[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [intelligence, setIntelligence] = useState<ExecutiveIntelligenceData | null>(null)
  const [activeDetailTask, setActiveDetailTask] = useState<UXRequest | null>(null)

  // Navigation & Tabs State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<"chats" | "artifacts">("chats")
  const [searchQuery, setSearchQuery] = useState("")

  // Artifacts State (User Uploads & Pre-seeded Knowledge Base)
  const [artifacts, setArtifacts] = useState<UXArtifact[]>(() => getStoredArtifacts())
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [isChatSplitOpen, setIsChatSplitOpen] = useState(true)
  const [artifactZoom, setArtifactZoom] = useState(100)
  const [createArtifactModalOpen, setCreateArtifactModalOpen] = useState(false)
  const [newArtTitle, setNewArtTitle] = useState("")
  const [newArtContent, setNewArtContent] = useState("")
  const [newArtType, setNewArtType] = useState<UXArtifact["fileType"]>("markdown")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Collapsible accordion states
  const [collapsedPinned, setCollapsedPinned] = useState(false)
  const [collapsedRecent, setCollapsedRecent] = useState(false)



  // Threads Management State (Cleaned of fake demo test data & sanitized legacy avatars)
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_THREADS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Lọc bỏ toàn bộ các đoạn chat test demo (Stripe, Admin guide, Audit log, Rate limit, v.v.)
          const cleaned = parsed
            .filter((t) => {
              if (!t.messages || t.messages.length === 0 || t.id === "draft") return false
              return !isEchoTestDemoThread(t)
            })
            .map((t) => ({
              ...t,
              messages: (t.messages || []).map((m: any) => ({
                ...m,
                senderAvatar:
                  m.senderAvatar &&
                  (m.senderAvatar.includes("photo-1534528741775-53994a69daeb") ||
                    m.senderAvatar.includes("photo-1534528741775"))
                    ? ""
                    : m.senderAvatar,
              })),
            }))
          return cleaned
        }
      }
    } catch (e) {
      console.error("[AIChatPage] Failed to parse saved threads:", e)
    }
    return INITIAL_DEMO_THREADS
  })

  // Draft chat state: Clicking New Chat sets activeThreadId to "draft" without generating empty thread
  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_ACTIVE_THREAD_ID)
    if (savedId === "draft") return "draft"
    if (
      savedId &&
      !isEchoTestDemoThread({ id: savedId, title: "" })
    ) {
      return savedId
    }
    return "draft"
  })

  // Dọn dẹp sạch sẽ toàn bộ các thread test demo từ localStorage ngay khi nạp trang
  useEffect(() => {
    try {
      const rawThreads = localStorage.getItem(STORAGE_THREADS_KEY)
      if (rawThreads) {
        const parsed = JSON.parse(rawThreads)
        if (Array.isArray(parsed)) {
          const sanitized = parsed
            .filter((t) => {
              if (!t.messages || t.messages.length === 0 || t.id === "draft") return false
              return !isEchoTestDemoThread(t)
            })
            .map((t) => ({
              ...t,
              messages: (t.messages || []).map((m: any) => ({
                ...m,
                senderAvatar:
                  m.senderAvatar &&
                  (m.senderAvatar.includes("photo-1534528741775-53994a69daeb") ||
                    m.senderAvatar.includes("photo-1534528741775"))
                    ? ""
                    : m.senderAvatar,
              })),
            }))
          localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(sanitized))
          setThreads(sanitized)
          const savedActive = localStorage.getItem(STORAGE_ACTIVE_THREAD_ID)
          if (!savedActive || savedActive === "draft" || isEchoTestDemoThread({ id: savedActive, title: "" }) || !sanitized.some((t) => t.id === savedActive)) {
            setActiveThreadId("draft")
            localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, "draft")
          }
        }
      }
    } catch {}
  }, [])

  // Real-time MBBank Daily AI Usage State & Listeners
  const [dailyUsage, setDailyUsage] = useState<AIDailyUsage>(() => getDailyAIUsage())
  const [showUsageNotice, setShowUsageNotice] = useState(true)
  const [noticeCollapsed, setNoticeCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ux_mb_ai_notice_collapsed")
      if (saved !== null) return saved === "true"
    } catch {}
    return true // Mặc định thu gọn theo yêu cầu
  })

  useEffect(() => {
    const handleUsageChange = () => setDailyUsage(getDailyAIUsage())
    window.addEventListener("ux_mb_ai_usage_changed", handleUsageChange)
    window.addEventListener("storage", handleUsageChange)
    return () => {
      window.removeEventListener("ux_mb_ai_usage_changed", handleUsageChange)
      window.removeEventListener("storage", handleUsageChange)
    }
  }, [])

  // Streaming & Generation State
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentModel, setCurrentModel] = useState<string>(() => getStoredAIModel())
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)

  // Rename modal
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameInput, setRenameInput] = useState("")
  const [targetRenameThread, setTargetRenameThread] = useState<ChatThread | null>(null)

  // Google Drive & Sheet Cloud Sync State for User Chat Threads
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle")
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null)
  const [syncWarningModalOpen, setSyncWarningModalOpen] = useState(false)

  // Quick Google AI Studio & Gateway Settings Modal
  const [aiSettingsModalOpen, setAiSettingsModalOpen] = useState(false)
  const [quickGeminiKey, setQuickGeminiKey] = useState(() => getStoredGeminiKey())
  const [quickGateway, setQuickGateway] = useState(() => getStoredAIGateway())
  const [quickTestingGemini, setQuickTestingGemini] = useState(false)
  const [quickTestResult, setQuickTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null)

  // AI Inference Mode (Auto, Fast, Deep) - Matching Image 1
  const [aiMode, setAiMode] = useState<"auto" | "fast" | "deep">(() => {
    try {
      const saved = localStorage.getItem("ux_portal_ai_mode")
      if (saved === "auto" || saved === "fast" || saved === "deep") return saved
    } catch {}
    return "auto"
  })

  const handleModeChange = useCallback((mode: "auto" | "fast" | "deep") => {
    setAiMode(mode)
    try {
      localStorage.setItem("ux_portal_ai_mode", mode)
    } catch {}
    const label = mode === "auto" ? "Tự động (Auto)" : mode === "fast" ? "Siêu tốc (Fast)" : "Suy luận sâu (Deep)"
    toast.success(`Đã chuyển sang chế độ: ${label}`)
  }, [])

  // Empty state category selection (Tiến độ | Rà soát PO | Năng suất | Quy chuẩn)
  const [emptyCategory, setEmptyCategory] = useState<"progress" | "po" | "productivity" | "standards" | "actions">("progress")

  const currentCategoryObj = useMemo(() => {
    return EMPTY_STATE_CATEGORIES.find((c) => c.id === emptyCategory) || EMPTY_STATE_CATEGORIES[0]
  }, [emptyCategory])

  // Display Recent Chats for Empty State (uses real recent chats or curated MBBank UX recent topics)
  const displayRecentChats = useMemo(() => {
    const actualThreads = threads.filter(
      (t) => t.id !== "draft" && Array.isArray(t.messages) && t.messages.length > 0
    )
    if (actualThreads.length > 0) {
      return actualThreads.slice(0, 3).map((t) => ({
        id: t.id,
        title: t.title,
        fileBadge: (() => {
          const raw = t.fileBadge || t.messages.find((m) => m.attachedArtifactName)?.attachedArtifactName
          if (!raw || raw.includes("admin-notes") || raw.includes("stripe") || raw.includes("audit") || raw.includes("notes-3.4")) {
            return "Quy-trinh-7-khau-UX-MBBank.md"
          }
          return raw
        })(),
        timeAgo: t.timeAgo || "Hôm nay",
        onClick: () => {
          setActiveThreadId(t.id)
          localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, t.id)
        },
      }))
    }
    return DEMO_RECENT_CHATS.map((demo) => ({
      id: demo.id,
      title: demo.title,
      fileBadge: demo.fileBadge,
      timeAgo: demo.timeAgo,
      onClick: () => handleSendMessage(demo.prompt),
    }))
  }, [threads])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Active thread computation
  const activeThread = useMemo(() => {
    if (activeThreadId === "draft") {
      return {
        id: "draft",
        title: "Cuộc trò chuyện mới",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ChatThread
    }
    const found = threads.find((t) => t.id === activeThreadId)
    if (found) return found
    return {
      id: "draft",
      title: "Cuộc trò chuyện mới",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ChatThread
  }, [threads, activeThreadId])

  // Selected artifact computation
  const selectedArtifact = useMemo(() => {
    return artifacts.find((a) => a.id === selectedArtifactId) || null
  }, [artifacts, selectedArtifactId])

  // Manual Cloud Sync Trigger
  const handleManualCloudSync = useCallback(async () => {
    const sheetCfg = getGoogleSheetConfig()
    if (!sheetCfg.scriptUrl || !sheetCfg.sheetId) {
      setCloudSyncStatus("error")
      setSyncWarningModalOpen(true)
      return
    }

    const currentSession = getStoredSession()
    const userEmail = (currentSession?.teamsEmail || currentSession?.personalEmail || "").trim().toLowerCase()
    const userName = currentSession?.displayName || ""
    if (!userEmail) {
      toast.info("Vui lòng đăng nhập để đồng bộ lịch sử chat lên Google Drive.")
      return
    }

    const toSave = threads.filter((t) => t.id !== "draft" && Array.isArray(t.messages) && t.messages.length > 0)
    setCloudSyncStatus("syncing")
    toast.loading("Đang đồng bộ lịch sử chat lên Google Drive & Sheet...", { id: "sync-chat" })

    try {
      const res = await syncUserChatThreadsToCloud({
        userEmail,
        userName,
        threads: toSave,
      })
      if (res.success) {
        setCloudSyncStatus("synced")
        const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        setLastSyncedTime(timeStr)
        toast.success(`Đã lưu ${toSave.length} cuộc trò chuyện lên Google Drive & Sheet (${userEmail})`, { id: "sync-chat" })
      } else {
        setCloudSyncStatus("error")
        setSyncWarningModalOpen(true)
        toast.error(res.message || "Lỗi khi đồng bộ lên Google Drive", { id: "sync-chat" })
      }
    } catch (e: any) {
      setCloudSyncStatus("error")
      setSyncWarningModalOpen(true)
      toast.error(e.message || "Không thể kết nối đến máy chủ Google Drive", { id: "sync-chat" })
    }
  }, [threads])

  // Save threads to localStorage & Google Drive (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const toSave = threads.filter((t) => t.id !== "draft" && Array.isArray(t.messages) && t.messages.length > 0)
        localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(toSave))

        // Tự động đồng bộ lên Google Drive nếu đã đăng nhập và có cuộc trò chuyện
        const currentSession = getStoredSession()
        const userEmail = (currentSession?.teamsEmail || currentSession?.personalEmail || "").trim().toLowerCase()
        const userName = currentSession?.displayName || ""
        if (userEmail && toSave.length > 0) {
          setCloudSyncStatus("syncing")
          syncUserChatThreadsToCloud({
            userEmail,
            userName,
            threads: toSave,
          })
            .then((res) => {
              if (res.success) {
                setCloudSyncStatus("synced")
                setLastSyncedTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }))
              } else {
                setCloudSyncStatus("error")
              }
            })
            .catch(() => {
              setCloudSyncStatus("error")
            })
        }
      } catch (err) {
        console.error("[AIChatPage] LocalStorage save error:", err)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [threads])

  // Load context from MBBank portal & Load Chat History from Google Drive
  useEffect(() => {
    let isMounted = true
    Promise.all([fetchRequests(), loadAllCalendarItems()])
      .then(([reqs, calData]) => {
        if (!isMounted) return
        setTasks(reqs || [])
        const rawEvents = (calData as any)?.items || calData || []
        setEvents(rawEvents)
        try {
          const s = getStoredSession()
          const roleScopedTasks = (reqs || []).filter((request) => canUserAccessRequest(request, s))
          setTasks(roleScopedTasks)
          const now = new Date()
          const todayYMD = now.toISOString().slice(0, 10)
          const intel = extractExecutiveIntelligence({
            session: s,
            rawRequests: roleScopedTasks,
            myTasks: roleScopedTasks,
            today: now,
            todayYMD,
            entries: rawEvents,
            dominantPhaseText: "Khảo sát & Thiết kế UI/UX",
          })
          setIntelligence(intel)
        } catch (err) {
          console.warn("[AIChatPage] extractExecutiveIntelligence error:", err)
        }
      })
      .catch((err) => console.error("[AIChatPage] Failed to fetch context:", err))

    // Tải và hợp nhất kho tài liệu Artifacts từ Google Sheet (Master Data) để các máy khác cùng thấy
    fetchMasterDataFromSheet()
      .then((res) => {
        if (!isMounted) return
        if (res.success && Array.isArray(res.data?.ai_artifacts) && res.data.ai_artifacts.length > 0) {
          const merged = mergeCloudArtifacts(res.data.ai_artifacts)
          setArtifacts(merged)
        }
      })
      .catch((err) => console.warn("[AIChatPage] Error fetching cloud artifacts:", err))

    // Tải và hợp nhất lịch sử chat người dùng từ Google Drive (Multi-device Sync)
    const currentSession = getStoredSession()
    const currentUserEmail = (currentSession?.teamsEmail || currentSession?.personalEmail || "").trim().toLowerCase()
    if (currentUserEmail) {
      setCloudSyncStatus("syncing")
      fetchUserChatThreadsFromCloud(currentUserEmail)
        .then((res) => {
          if (!isMounted) return
          if (res.success && Array.isArray(res.threads) && res.threads.length > 0) {
            setThreads((prevLocalThreads) => {
              const cloudThreads = res.threads.filter((t: any) => t && t.id !== "draft" && !isEchoTestDemoThread(t))
              const mergedMap = new Map<string, ChatThread>()

              // 1. Thêm các thread local hiện tại
              for (const lt of prevLocalThreads) {
                if (lt.id !== "draft") mergedMap.set(lt.id, lt)
              }

              // 2. So sánh và hợp nhất với cloud (ưu tiên bản ghi cập nhật mới hơn)
              for (const ct of cloudThreads) {
                const existing = mergedMap.get(ct.id)
                if (!existing) {
                  mergedMap.set(ct.id, ct)
                } else {
                  const ctTime = new Date(ct.updatedAt || 0).getTime()
                  const ltTime = new Date(existing.updatedAt || 0).getTime()
                  if (ctTime >= ltTime) {
                    mergedMap.set(ct.id, ct)
                  }
                }
              }

              const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
                return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
              })

              try {
                localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(mergedList))
              } catch {}

              return mergedList
            })
            setCloudSyncStatus("synced")
            setLastSyncedTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }))
          } else {
            setCloudSyncStatus("synced")
          }
        })
        .catch((err) => {
          console.warn("[AIChatPage] Error fetching user cloud threads:", err)
          if (isMounted) {
            setCloudSyncStatus("error")
            setSyncWarningModalOpen(true)
          }
        })
    }

    const sheetCfg = getGoogleSheetConfig()
    if (!sheetCfg.scriptUrl || !sheetCfg.sheetId) {
      if (isMounted) {
        setCloudSyncStatus("error")
        setSyncWarningModalOpen(true)
      }
    }

    return () => {
      isMounted = false
    }
  }, [])

  // Lắng nghe sự kiện đồng bộ Artifacts nội bộ
  useEffect(() => {
    const handleArtifactsChanged = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setArtifacts(e.detail)
      } else {
        setArtifacts(getStoredArtifacts())
      }
    }
    window.addEventListener("ux_mb_artifacts_changed", handleArtifactsChanged)
    return () => window.removeEventListener("ux_mb_artifacts_changed", handleArtifactsChanged)
  }, [])

  // Auto-scroll messages
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    })
  }, [])

  useEffect(() => {
    scrollToBottom(false)
  }, [activeThreadId, scrollToBottom])

  // Create new chat (Draft state: only creates thread when user sends first message)
  const handleCreateNewChat = () => {
    handleStopStream()
    setActiveThreadId("draft")
    setSidebarTab("chats")
    setSelectedArtifactId(null)
    localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, "draft")
  }

  // Delete chat
  const handleDeleteThread = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setThreads((prev) => {
      const updated = prev.filter((t) => t.id !== id)
      if (updated.length === 0 || activeThreadId === id) {
        const nextId = updated[0]?.id || "draft"
        setActiveThreadId(nextId)
        localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, nextId)
      }
      return updated
    })
    toast.success("Đã xoá đoạn chat.")
  }

  // Pin chat
  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPinned: !t.isPinned } : t))
    )
  }

  // Rename chat
  const openRenameModal = (t: ChatThread, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setTargetRenameThread(t)
    setRenameInput(t.title)
    setRenameModalOpen(true)
  }

  const handleSaveRename = () => {
    if (!targetRenameThread) return
    const trimmed = renameInput.trim() || "Cuộc trò chuyện"
    setThreads((prev) =>
      prev.map((t) => (t.id === targetRenameThread.id ? { ...t, title: trimmed } : t))
    )
    setRenameModalOpen(false)
    setTargetRenameThread(null)
    toast.success("Đã cập nhật tiêu đề đoạn hội thoại.")
  }

  // Copy message
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMsgId(msgId)
    toast.success("Đã sao chép vào bộ nhớ tạm")
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  // Export thread
  const handleExportThread = (thread: ChatThread, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const content = `# ${thread.title}\n\nDate: ${new Date(thread.createdAt).toLocaleString()}\n\n---\n\n` +
      thread.messages.map((m) => `### ${m.role === "user" ? "User" : "Assistant"}\n${m.content}\n`).join("\n")
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${thread.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Đã tải xuống file .md")
  }

  // Model switch
  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId)
    saveAIModel(modelId)
    const mObj = POPULAR_AI_MODELS.find((m) => m.id === modelId)
    toast.success(`Đã chuyển sang mô hình: ${mObj ? mObj.name : modelId}`)
  }

  // Stop stream
  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThreadId) {
          const msgs = [...t.messages]
          const last = msgs[msgs.length - 1]
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              isThinkingComplete: true,
              processSteps: last.processSteps?.map((s) => ({ ...s, status: "completed" })),
            }
          }
          return { ...t, messages: msgs }
        }
        return t
      })
    )
  }

  // Drag and Drop & Multi-file Upload State & Handlers
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    if (!canUploadArtifacts) {
      toast.error("Vai trò của bạn chưa được cấp quyền tải tài liệu lên kho Artifacts. Vui lòng liên hệ Admin.")
      return
    }

    const files = Array.from(fileList)
    if (files.length === 0) return

    const toastId = toast.loading(
      files.length === 1
        ? `Đang tải tệp "${files[0].name}" lên Google Drive...`
        : `Đang tải ${files.length} tệp lên Google Drive...`
    )

    let lastArtId = ""
    let successCount = 0

    try {
      for (const file of files) {
        const fileName = file.name
        const ext = fileName.split(".").pop()?.toLowerCase() || ""
        const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || file.type.startsWith("image/")

        // 1. Tải lên Google Drive folder UX_AI_Artifacts
        const driveRes = await uploadFileToDrive(file, "UX_AI_Artifacts")
        const driveUrl = driveRes.fileUrl || driveRes.downloadUrl
        const driveThumbnailUrl = driveRes.thumbnailUrl || (driveRes.fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveRes.fileId)}&sz=w1200` : undefined)
        const driveDownloadUrl = driveRes.downloadUrl

        if (isImage) {
          // Tạo nội dung Markdown tham chiếu ảnh từ Google Drive
          let imageEmbedUrl = driveThumbnailUrl || driveUrl
          if (!imageEmbedUrl) {
            imageEmbedUrl = await new Promise<string>((resolve) => {
              const r = new FileReader()
              r.onload = (e) => resolve((e.target?.result as string) || "")
              r.onerror = () => resolve("")
              r.readAsDataURL(file)
            })
          }

          const driveLinksMd = driveUrl
            ? `\n\n[🔗 Mở xem trên Google Drive](${driveUrl}) · [📥 Tải file gốc](${driveDownloadUrl || driveUrl})\n\n`
            : "\n\n"

          const newArt = addArtifact({
            name: fileName,
            fileType: "markdown",
            size: formatFileSize(driveRes.fileSize || file.size),
            content: `# ${fileName}\n\n![${fileName}](${imageEmbedUrl})${driveLinksMd}*Ảnh màn hình / tài liệu thiết kế do ${userName} tải lên và lưu trữ an toàn trên Google Drive.*`,
            summary: `Ảnh thiết kế / tư liệu: ${fileName}${driveUrl ? " (Đã lưu Google Drive)" : ""}`,
            tags: ["Ảnh", ext.toUpperCase(), "Google Drive"],
            isCustomUploaded: true,
            driveUrl: driveUrl || undefined,
            driveFileId: driveRes.fileId,
            driveThumbnailUrl,
            driveDownloadUrl,
            uploadedBy: userName,
          })
          lastArtId = newArt.id
          successCount++
        } else {
          // Xử lý tệp văn bản / markdown / code / json / pdf / csv
          let fileType: UXArtifact["fileType"] = "text"
          if (ext === "md") fileType = "markdown"
          else if (ext === "pdf") fileType = "pdf"
          else if (["ts", "js", "tsx", "jsx", "html", "css"].includes(ext)) fileType = "code"
          else if (ext === "csv") fileType = "csv"
          else if (ext === "json") fileType = "json"

          let textContent = ""
          try {
            textContent = await new Promise<string>((resolve, reject) => {
              const r = new FileReader()
              r.onload = (e) => resolve((e.target?.result as string) || "")
              r.onerror = (e) => reject(e)
              r.readAsText(file)
            })
          } catch {
            textContent = `Tệp ${fileName} (${formatFileSize(file.size)}) đã được lưu trữ trên Google Drive.`
          }

          const driveBanner = driveUrl
            ? `> 📂 **Tệp lưu trữ tại Google Drive:** [${fileName}](${driveUrl}) · [📥 Tải về](${driveDownloadUrl || driveUrl})\n\n`
            : ""

          const newArt = addArtifact({
            name: fileName,
            fileType,
            size: formatFileSize(driveRes.fileSize || file.size),
            content: `${driveBanner}${textContent}`,
            summary: `Tài liệu do ${userName} tải lên: ${fileName}${driveUrl ? " (Đã lưu Google Drive)" : ""}`,
            tags: ["Tải lên", ext.toUpperCase(), "Google Drive"],
            isCustomUploaded: true,
            driveUrl: driveUrl || undefined,
            driveFileId: driveRes.fileId,
            driveThumbnailUrl,
            driveDownloadUrl,
            uploadedBy: userName,
          })
          lastArtId = newArt.id
          successCount++
        }
      }

      const updated = getStoredArtifacts()
      setArtifacts(updated)
      if (lastArtId) {
        setSelectedArtifactId(lastArtId)
      }
      setSidebarTab("artifacts")

      // Đồng bộ danh sách Artifacts mới lên Google Sheet Master Data
      syncMasterDataToSheet({ ai_artifacts: updated }).catch((err) => {
        console.warn("[AIChatPage] Background sync artifacts to sheet failed:", err)
      })

      toast.success(
        files.length === 1
          ? `Đã tải lên Google Drive & lưu Artifacts: ${files[0].name}`
          : `Đã tải ${successCount}/${files.length} tệp lên Google Drive & lưu Artifacts!`,
        { id: toastId }
      )
    } catch (err) {
      console.error("[AIChatPage] Error uploading files to Drive:", err)
      toast.error("Không thể hoàn tất tải tệp lên Google Drive.", { id: toastId })
    }
  }, [userName, canUploadArtifacts])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadArtifacts) {
      toast.error("Vai trò của bạn chưa được cấp quyền tải tài liệu lên kho Artifacts.")
      e.target.value = ""
      return
    }
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
    e.target.value = ""
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canUploadArtifacts) {
      setIsDraggingOver(true)
    }
  }, [canUploadArtifacts])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    if (!canUploadArtifacts) {
      toast.error("Vai trò của bạn chưa được cấp quyền tải tài liệu lên kho Artifacts.")
      return
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles, canUploadArtifacts])

  // Hỗ trợ paste trực tiếp từ clipboard (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }
      const items = e.clipboardData?.items
      if (!items) return

      const pastedFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) pastedFiles.push(file)
        }
      }

      if (pastedFiles.length > 0) {
        if (!canUploadArtifacts) {
          toast.error("Vai trò của bạn chưa được cấp quyền tải tài liệu lên kho Artifacts.")
          return
        }
        processFiles(pastedFiles)
        toast.info(`Đã dán ${pastedFiles.length} tệp tin từ Clipboard!`)
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [processFiles, canUploadArtifacts])

  // Create manual artifact
  const handleCreateArtifactSubmit = () => {
    if (!canUploadArtifacts) {
      toast.error("Vai trò của bạn chưa được cấp quyền tạo tài liệu trong kho Artifacts.")
      return
    }
    if (!newArtTitle.trim()) {
      toast.error("Vui lòng nhập tên tài liệu.")
      return
    }
    const fileName = newArtTitle.trim().endsWith(".md")
      ? newArtTitle.trim()
      : `${newArtTitle.trim()}.${newArtType === "json" ? "json" : newArtType === "code" ? "ts" : "md"}`

    const newArt = addArtifact({
      name: fileName,
      fileType: newArtType,
      size: formatFileSize(new Blob([newArtContent]).size),
      content: newArtContent,
      summary: `Tài liệu do ${userName} tạo: ${fileName}`,
      tags: ["Tự tạo", newArtType.toUpperCase()],
      isCustomUploaded: true,
    })

    const updated = getStoredArtifacts()
    setArtifacts(updated)
    setSelectedArtifactId(newArt.id)
    setCreateArtifactModalOpen(false)
    setNewArtTitle("")
    setNewArtContent("")
    syncMasterDataToSheet({ ai_artifacts: updated }).catch((err) => {
      console.warn("[AIChatPage] Background sync artifacts to sheet failed:", err)
    })
    toast.success("Đã tạo mới tài liệu thành công.")
  }

  // Delete artifact
  const handleDeleteArtifact = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!canUploadArtifacts) {
      toast.error("Vai trò của bạn không có quyền xóa tài liệu khỏi kho Artifacts.")
      return
    }
    const updated = deleteArtifact(id)
    setArtifacts(updated)
    if (selectedArtifactId === id) {
      setSelectedArtifactId(updated[0]?.id || null)
    }
    syncMasterDataToSheet({ ai_artifacts: updated }).catch((err) => {
      console.warn("[AIChatPage] Background sync artifacts to sheet failed:", err)
    })
    toast.success("Đã xoá tài liệu.")
  }

  // Ask AI about this artifact
  const handleChatWithArtifact = (art: UXArtifact) => {
    setSidebarTab("chats")
    handleCreateNewChat()
    const prompt = `Hãy phân tích tài liệu "${art.name}" và tóm tắt những điểm trọng tâm nhất cho tôi.`
    const artifactContext = `=== TÀI LIỆU NGƯỜI DÙNG ĐẨY LÊN: "${art.name}" (${art.fileType}) ===\n${art.content}`
    handleSendMessage(prompt, artifactContext, art.name)
  }

  // Fallback engine: Tự động tổng hợp và quét dữ liệu thực tế từ hệ thống khi chưa có API Key OpenRouter
  const generateOfflineIntelligenceReply = (
    prompt: string,
    taskList: UXRequest[],
    intel: any,
    artifactList: UXArtifact[],
    uName: string
  ): string => {
    const clean = prompt.trim()
    const isTiendo = clean.startsWith("/tiendo") || clean.toLowerCase().includes("tiến độ") || clean.toLowerCase().includes("công việc")
    const isChart = clean.startsWith("/chart") || clean.startsWith("/bieudo") || clean.toLowerCase().includes("biểu đồ")
    const isFlow = clean.startsWith("/flow") || clean.startsWith("/sodo") || clean.toLowerCase().includes("sơ đồ") || clean.toLowerCase().includes("luồng")
    const isDoc = clean.startsWith("/doc") || clean.toLowerCase().includes("tài liệu") || clean.toLowerCase().includes("artifacts")

    if (isTiendo) {
      const myTasks = intel?.activeAssignedTasks || taskList.slice(0, 6)
      return `### 📍 Báo cáo tiến độ công việc của ${uName}\n\n` +
        `Hệ thống đã quét và đối soát toàn bộ **${myTasks.length} bài toán** hiện tại được gán cho bạn trên hệ thống:\n\n` +
        myTasks.map((t: any, idx: number) => 
          `**${idx + 1}. [${t.priority || "Lv3"}] "${t.nickname || t.title}"**\n` +
          `- **Trạng thái:** \`${t.status || "Đang xử lý"}\` · **Squad:** ${t.squad || "Chung"}\n` +
          `- **Deadline:** ${t.deadline || "Chưa có"} ${t.isOverdue ? "⚠️ *(Có nguy cơ trễ hạn)*" : "✅ *(Đúng hạn)*"}\n`
        ).join("\n") +
        `\n\n---\n💡 **Khuyến nghị hành động:** Ưu tiên dứt điểm các bài toán Lv1/Lv2 và kiểm tra các đầu mối PO Pending để không ảnh hưởng SLA bàn giao Figma.`
    }

    if (isChart) {
      const total = taskList.length || 10
      const inProgress = taskList.filter((t: any) => t.status?.includes("Thiết kế") || t.status?.includes("Đang")).length || 4
      const pendingPO = taskList.filter((t: any) => t.status?.includes("PO") || t.status?.includes("Chờ")).length || 2
      const completed = taskList.filter((t: any) => t.status?.includes("Nghiệm thu") || t.status?.includes("Hoàn thành")).length || 4

      return `### 📊 Biểu đồ phân bổ tiến độ công việc\n\n` +
        `\`\`\`mermaid\npie title Phân bổ trạng thái bài toán UX MB\n` +
        `    "Đang thiết kế UI/UX" : ${inProgress}\n` +
        `    "Chờ duyệt PO Pending" : ${pendingPO}\n` +
        `    "Đã nghiệm thu / Go-Live" : ${completed}\n` +
        `\`\`\`\n\n` +
        `#### 📈 Thống kê chi tiết:\n` +
        `- **Đang thiết kế UI/UX:** ${inProgress}/${total} bài toán (${Math.round((inProgress/total)*100)}%)\n` +
        `- **PO Pending chờ duyệt:** ${pendingPO}/${total} bài toán (${Math.round((pendingPO/total)*100)}%)\n` +
        `- **Nghiệm thu / Hoàn thành:** ${completed}/${total} bài toán (${Math.round((completed/total)*100)}%)\n`
    }

    if (isFlow) {
      return `### 🔄 Sơ đồ luồng (Flowchart) quy trình 7 khâu UX MBBank\n\n` +
        `\`\`\`mermaid\ngraph TD\n` +
        `    A[Khâu 1: Tiếp nhận Request từ PO] --> B[Khâu 2: Khảo sát nghiệp vụ & Benchmark]\n` +
        `    B --> C[Khâu 3: Thiết kế Wireframe & Flow]\n` +
        `    C --> D{Review với PO & Tech}\n` +
        `    D -- Cần chỉnh sửa --> C\n` +
        `    D -- Đạt phê duyệt --> E[Khâu 4: Thiết kế UI High-Fidelity & Design System]\n` +
        `    E --> F[Khâu 5: Prototype tương tác & Test người dùng]\n` +
        `    F --> G[Khâu 6: Bàn giao Figma Ready for Dev]\n` +
        `    G --> H[Khâu 7: Hỗ trợ Dev & Nghiệm thu UAT UI/UX]\n` +
        `    H --> I((Go-Live))\n` +
        `    style D fill:#fef3c7,stroke:#f59e0b\n` +
        `    style I fill:#dcfce7,stroke:#22c55e\n` +
        `\`\`\`\n\n` +
        `> 📌 **Lưu ý SLA:** Mọi đầu ra từng khâu cần đính kèm link Figma và xác nhận của Product Owner qua cổng Portal.`
    }

    if (isDoc) {
      const requestedName = clean
        .replace(/^\/(?:doc|tracuu)\s*/i, "")
        .replace(/^@/, "")
        .trim()
        .toLowerCase()
      const matchedArtifacts = artifactList.filter((artifact) => {
        const name = artifact.name.toLowerCase()
        return !requestedName || name.includes(requestedName) || requestedName.includes(name)
      })
      const documents = matchedArtifacts.length > 0 ? matchedArtifacts : artifactList

      if (documents.length === 0) {
        return `Mình chưa có tài liệu Artifacts phù hợp để trả lời yêu cầu này. Vui lòng chọn hoặc tải lên tài liệu trước khi hỏi lại.`
      }

      return documents.map((artifact) => {
        const content = artifact.content?.trim()
        const excerpt = content
          ? content.length > 4000
            ? `${content.slice(0, 4000)}\n\n[Đã rút gọn theo giới hạn hiển thị.]`
            : content
          : artifact.summary || "Tài liệu chưa có nội dung văn bản để phân tích."
        return `### ${artifact.name}\n\n${excerpt}\n\n*Nguồn: ${artifact.name}*`
      }).join("\n\n---\n\n")
    }

    return `Chào bạn, hệ thống đã quét bối cảnh công việc thực tế:\n\n` +
      `- **Tổng số bài toán:** ${taskList.length} bài toán đang quản lý.\n` +
      `- **Trọng tâm hôm nay:** Tập trung xử lý các bài toán có deadline sát nút và hoàn thiện luồng trải nghiệm người dùng.\n\n` +
      `💡 *Mẹo:* Bạn có thể gõ các lệnh **\`/tiendo\`**, **\`/chart\`**, **\`/flow\`**, **\`/doc\`** để nhận báo cáo hoặc sơ đồ tức thì!`
  }

  // Send message & Stream reply
  const handleSendMessage = async (text: string, customContext?: string, attachedDocName?: string) => {
    const cleanText = text.trim()
    if (!cleanText || isStreaming) return

    const isDocCommand = /^\/doc(?:\s|$)|^\/tracuu(?:\s|$)/i.test(cleanText)
    const isChartCommand = /^\/(?:chart|bieudo)(?:\s|$)/i.test(cleanText)
    const isFlowCommand = /^\/(?:flow|sodo)(?:\s|$)/i.test(cleanText)
    const isTiendoCommand = /^\/tiendo(?:\s|$)/i.test(cleanText)
    const questionIntent = detectUserIntent(cleanText)
    const usesTaskContext = isTiendoCommand || isChartCommand || questionIntent.isTask || questionIntent.isTaskUpdate || questionIntent.isActionCard

    const startTime = Date.now()
    const userMsgId = `msg-user-${Date.now()}`
    const assistantMsgId = `msg-asst-${Date.now() + 1}`

    const currentSession = getStoredSession()
    const senderName = currentSession?.displayName || userName || "Designer"
    const rawAvatar = currentSession?.avatarUrl || (currentSession as any)?.avatar || ""
    const senderAvatar =
      rawAvatar &&
      (rawAvatar.includes("photo-1534528741775-53994a69daeb") ||
        rawAvatar.includes("photo-1534528741775"))
        ? ""
        : rawAvatar
    const senderEmail = currentSession?.teamsEmail || currentSession?.personalEmail || ""

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      attachedArtifactName: attachedDocName,
      senderName,
      senderAvatar,
      senderEmail,
    }

    const activeAssigned = intelligence?.activeAssignedTasks || tasks
    const summaryProjs = intelligence?.activeAssignedTasks || (intelligence?.delegatedTasks?.map((d) => d.task) || tasks)
    const riskProjs = intelligence?.overdueTasks || []
    const goLive = intelligence?.goLiveTasks || []
    const dominantPhase = intelligence?.dominantPhaseText || "khảo sát nghiệp vụ & định nghĩa đầu bài (Define)"

    const traceData: ChatTraceData = {
      activeTasks: usesTaskContext ? (activeAssigned.length > 0 ? activeAssigned : tasks) : [],
      summaryProjects: usesTaskContext ? (summaryProjs.length > 0 ? summaryProjs : tasks) : [],
      riskProjects: usesTaskContext ? riskProjs : [],
      goLiveTasks: usesTaskContext ? goLive : [],
      dominantPhaseText: dominantPhase,
    }

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      modelUsed: currentModel,
      reasoning: "",
      isThinkingComplete: false,
      traceData,
    }

    let targetThreadId = activeThreadId

    // If currently in Draft mode or thread doesn't exist, create thread now!
    if (activeThreadId === "draft" || !threads.some((t) => t.id === activeThreadId)) {
      const newId = `thread-${Date.now()}`
      targetThreadId = newId
      const newTitle = generateThreadTitle(text)
      const newThread: ChatThread = {
        id: newId,
        title: newTitle,
        messages: [userMsg, assistantMsg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeAgo: "Vừa xong",
      }
      setThreads((prev) => [
        newThread,
        ...prev.filter((t) => t.id !== "draft" && Array.isArray(t.messages) && t.messages.length > 0),
      ])
      setActiveThreadId(newId)
      localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, newId)
    } else {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === targetThreadId) {
            const isFirst = !t.messages || t.messages.length === 0
            return {
              ...t,
              title: isFirst ? generateThreadTitle(text) : t.title,
              updatedAt: new Date().toISOString(),
              messages: [...(t.messages || []), userMsg, assistantMsg],
            }
          }
          return t
        })
      )
    }

    setTimeout(() => scrollToBottom(true), 50)
    setIsStreaming(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const initialSteps: ChatProcessStep[] = [
      { id: "step-1", label: "Phân tích yêu cầu & tiếp nhận bối cảnh", status: "running" },
      { id: "step-2", label: "Rà soát dữ liệu bài toán & tài liệu quy trình", status: "pending" },
      { id: "step-3", label: "Suy luận phương án & tổng hợp đề xuất", status: "pending" },
      { id: "step-4", label: "Sinh phản hồi hoàn chỉnh", status: "pending" },
    ]
    let currentSteps = [...initialSteps]
    let accumulatedReasoning = ""

    const updateAssistantMsg = (patch: Partial<ChatMessage>) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === targetThreadId) {
            const msgs = [...t.messages]
            const last = msgs[msgs.length - 1]
            if (last && last.role === "assistant") {
              msgs[msgs.length - 1] = {
                ...last,
                ...patch,
              }
            }
            return { ...t, messages: msgs }
          }
          return t
        })
      )
    }

    // Step 1 -> Step 2
    const timerStep1 = setTimeout(() => {
      currentSteps = [
        { ...currentSteps[0], status: "completed" },
        { ...currentSteps[1], status: "running" },
        currentSteps[2],
        currentSteps[3],
      ]
      updateAssistantMsg({ processSteps: currentSteps })
    }, 450)

    // Step 2 -> Step 3
    const timerStep2 = setTimeout(() => {
      currentSteps = [
        { ...currentSteps[0], status: "completed" },
        { ...currentSteps[1], status: "completed" },
        { ...currentSteps[2], status: "running" },
        currentSteps[3],
      ]
      updateAssistantMsg({ processSteps: currentSteps })
    }, 1000)

    try {
      const currentThread = threads.find((t) => t.id === targetThreadId)
      const history: PromptMessage[] = (currentThread?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }))
      history.push({ role: "user", content: text })

      // Enhanced context building: Luôn kết hợp Tasks + Artifacts + Intelligence
      const allArtifacts = getStoredArtifacts()
      let contextStr = ""

      if (isDocCommand) {
        const query = cleanText.replace(/^\/doc\s*/i, "").trim()
        // Smart Document Search: Tìm tài liệu liên quan thay vì dump toàn bộ
        const relevantDocs = searchArtifactsByQuery(query || cleanText, allArtifacts)
        const docsSummary = serializeArtifactsContext(relevantDocs, "full")
        contextStr = buildEnrichedContext({
          intelligence,
          tasks,
          artifacts: [], // Đã inject trực tiếp bên dưới
          userName,
          userRole: session?.role,
          userQuery: cleanText,
        }) + `\n\n${docsSummary}\n\n` +
          `YÊU CẦU ĐẶC BIỆT:\n` +
          `Người dùng đang tra cứu và cần tư vấn dựa trên kho tài liệu nội bộ.\n` +
          `Câu hỏi/Yêu cầu của người dùng: "${query || cleanText}".\n` +
          `Hãy đọc toàn bộ tài liệu liên quan trên, tổng hợp thông tin, viện dẫn đúng tài liệu và tư vấn giải pháp chuẩn xác cho người dùng. LUÔN trích dẫn tên tài liệu nguồn.`
      } else if (isChartCommand) {
        const chartTopic = cleanText.replace(/^(\/chart|\/bieudo)\s*/i, "").trim()
        contextStr = buildEnrichedContext({
          intelligence,
          tasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: cleanText,
        }) +
          `\n\n=== CHỈ DẪN VẼ BIỂU ĐỒ TRỰC QUAN ===\n` +
          `Người dùng yêu cầu vẽ biểu đồ số liệu cho nội dung: "${chartTopic || "Số liệu công việc và tiến độ"}".\n` +
          `Hãy vẽ biểu đồ số liệu trực quan DỰA TRÊN DỮ LIỆU THẬT TỪ CONTEXT: sử dụng bảng tổng hợp số liệu hoặc cú pháp biểu đồ \`\`\`chart.`
      } else if (isFlowCommand) {
        const flowTopic = cleanText.replace(/^(\/flow|\/sodo)\s*/i, "").trim()
        contextStr = buildEnrichedContext({
          intelligence,
          tasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: cleanText,
        }) +
          `\n\n=== CHỈ DẪN XÂY DỰNG SƠ ĐỒ LUỒNG (FLOWCHART) ===\n` +
          `Người dùng yêu cầu xây dựng sơ đồ luồng: "${flowTopic || "Quy trình luồng nghiệp vụ"}".\n` +
          `Hãy xây dựng sơ đồ bằng mã Mermaid (\`\`\`mermaid\ngraph TD\n...\n\`\`\`).`
      } else if (isTiendoCommand) {
        const myTasks = tasks
        
        contextStr = buildEnrichedContext({
          intelligence,
          tasks: myTasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: cleanText,
        }) +
          `\n\nYÊU CẦU: Tổng hợp báo cáo tiến độ các bài toán của người dùng, phát hiện rủi ro và đề xuất hành động cụ thể. Nếu có task cần cập nhật, hãy đề xuất qua khối \`\`\`task_update.`
      } else if (customContext) {
        // Custom context (ví dụ: chat với artifact)
        contextStr = buildEnrichedContext({
          intelligence,
          tasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: cleanText,
        }) + `\n\n${customContext}`
      } else {
        // Default: Luôn gửi enriched context (tasks + artifacts summary)
        contextStr = buildEnrichedContext({
          intelligence,
          tasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: cleanText,
        })
      }

      const promptMessages = buildChatPrompt(contextStr, history)

      let accumulated = ""
      let lastRenderTime = 0

      await new Promise<void>((resolve, reject) => {
        streamAICompletion(
          promptMessages,
          {
            onReasoningChunk: (reasoningDelta, fullReasoning) => {
              accumulatedReasoning = fullReasoning
              if (currentSteps[2].status !== "running") {
                currentSteps = [
                  { ...currentSteps[0], status: "completed" },
                  { ...currentSteps[1], status: "completed" },
                  { ...currentSteps[2], status: "running" },
                  currentSteps[3],
                ]
              }
              updateAssistantMsg({
                reasoning: accumulatedReasoning,
                processSteps: currentSteps,
              })
              messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
            },
            onChunk: (token, cleanOutput) => {
              accumulated = cleanOutput
              // Khi bắt đầu có output câu trả lời, đánh dấu Step 3 hoàn tất, Step 4 chạy
              if (currentSteps[3].status !== "running") {
                currentSteps = [
                  { ...currentSteps[0], status: "completed" },
                  { ...currentSteps[1], status: "completed" },
                  { ...currentSteps[2], status: "completed" },
                  { ...currentSteps[3], status: "running" },
                ]
              }

              const now = performance.now()
              if (now - lastRenderTime > 40) {
                lastRenderTime = now
                updateAssistantMsg({
                  content: accumulated,
                  reasoning: accumulatedReasoning,
                  processSteps: currentSteps,
                })
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
              }
            },
            onComplete: (fullText, fullReasoning, responseMeta) => {
              clearTimeout(timerStep1)
              clearTimeout(timerStep2)
              accumulated = fullText || accumulated
              accumulatedReasoning = fullReasoning || accumulatedReasoning

              const durationSeconds = Number(Math.max(1, (Date.now() - startTime) / 1000).toFixed(1))
              currentSteps = currentSteps.map((s) => ({ ...s, status: "completed" }))

              const syntheticReasoning = responseMeta?.source === "local-fallback"
                ? "Mô hình trực tuyến không khả dụng; ứng dụng đã xử lý yêu cầu bằng dữ liệu và quy tắc cục bộ."
                : "Đã nhận phản hồi từ mô hình AI theo ngữ cảnh được cung cấp."

              const finalReasoning = accumulatedReasoning.trim() || syntheticReasoning

              updateAssistantMsg({
                content: accumulated,
                reasoning: finalReasoning,
                processSteps: currentSteps,
                isThinkingComplete: true,
                thinkingDurationSeconds: durationSeconds,
                responseSource: responseMeta?.source || "remote",
                responseModel: responseMeta?.model,
                responseProviderError: responseMeta?.providerError,
              })
              resolve()
            },
            onError: (err) => {
              clearTimeout(timerStep1)
              clearTimeout(timerStep2)
              reject(err)
            },
          },
          abortController.signal,
          currentModel
        ).catch(reject)
      })
    } catch (err: any) {
      clearTimeout(timerStep1)
      clearTimeout(timerStep2)
      if (err.name !== "AbortError") {
        console.error("[AIChatPage] Stream error:", err)
        const errMsg = String(err?.message || "")
        const isAuthError = errMsg.includes("401") || errMsg.includes("Authentication") || errMsg.includes("API Key") || errMsg.includes("quota")

        if (false && isAuthError) {
          const fallbackReply = generateOfflineIntelligenceReply(text, tasks, intelligence, getStoredArtifacts(), userName)
          updateAssistantMsg({
            content: fallbackReply,
            isThinkingComplete: true,
            thinkingDurationSeconds: Number(Math.max(1, (Date.now() - startTime) / 1000).toFixed(1)),
            processSteps: currentSteps.map((s) => ({ ...s, status: "completed" })),
          })
          toast.info("Đã quét và phản hồi dữ liệu thời gian thực từ hệ thống MB Portal.")
        } else {
          updateAssistantMsg({
            content: `⚠️ ${errMsg || "Lỗi kết nối AI gateway. Vui lòng thử lại sau giây lát."}`,
            isThinkingComplete: true,
            processSteps: currentSteps.map((s) => ({ ...s, status: "completed" })),
          })
        }
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
      setTimeout(() => scrollToBottom(true), 50)
    }
  }

  // Filter threads (Only display threads that have messages and are not draft)
  const filteredThreads = useMemo(() => {
    const valid = threads.filter(
      (t) =>
        t.id !== "draft" &&
        Array.isArray(t.messages) &&
        t.messages.length > 0 &&
        !isEchoTestDemoThread(t)
    )
    if (!searchQuery.trim()) return valid
    const q = searchQuery.toLowerCase()
    return valid.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q))
    )
  }, [threads, searchQuery])

  // Filter artifacts
  const filteredArtifacts = useMemo(() => {
    if (!searchQuery.trim()) return artifacts
    const q = searchQuery.toLowerCase()
    return artifacts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.tags && a.tags.some((tag) => tag.toLowerCase().includes(q)))
    )
  }, [artifacts, searchQuery])

  const pinnedList = useMemo(() => filteredThreads.filter((t) => t.isPinned), [filteredThreads])
  const recentList = useMemo(() => filteredThreads.filter((t) => !t.isPinned), [filteredThreads])

  if (!canUseAi) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6 bg-slate-50 dark:bg-background">
        <div className="flex flex-col items-center justify-center max-w-md p-8 text-center bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-1.5">
            Chưa được cấp quyền sử dụng AI Chats
          </h2>
          <p className="text-sm text-slate-500 dark:text-muted-foreground leading-relaxed mb-6">
            Tài khoản với vai trò <span className="font-semibold text-slate-700 dark:text-foreground">{session?.role || "Hiện tại"}</span> chưa được cấp quyền sử dụng Trợ lý AI. Vui lòng liên hệ Quản trị viên (Admin) hoặc Design Owner để được phân quyền trong mục Cài đặt hệ thống.
          </p>
          {onBackToPortal ? (
            <button
              type="button"
              onClick={onBackToPortal}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Quay lại trang chủ
            </button>
          ) : (
            <a
              href="#overview"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors cursor-pointer inline-flex items-center"
            >
              Quay lại trang chủ
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground font-sans select-text">
      {/* Hidden file input for uploading artifacts & documents */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        accept=".md,.txt,.json,.csv,.pdf,.doc,.docx,.ts,.tsx,.js,image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SIDEBAR: ECHO-CHAT REUI CLEAN FIDELITY WITH TABS (CHATS / ARTIFACTS) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 252, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col h-full bg-sidebar border-r border-border shrink-0 overflow-hidden z-20 text-sm select-none"
          >
            {/* 1. Header: Brand Logo (/ai-default.png), Title, Search, Collapse */}
            <div className="flex flex-col p-2 gap-2 shrink-0">
              <div className="flex items-center gap-2 px-1 pt-1">
                {/* Brand Logo Box: Uses ai-default.png */}
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background shadow-2xs overflow-hidden">
                  <img
                    src={aiDefaultLogo}
                    alt="AI MB"
                    className="size-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/ai-default.png"
                    }}
                  />
                </div>

                <span className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-foreground">
                  Trợ lý UX MB
                </span>

                {/* Search */}
                <button
                  type="button"
                  onClick={() => {
                    const q = prompt("Tìm kiếm đoạn chat hoặc tài liệu:")
                    if (q !== null) setSearchQuery(q)
                  }}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                  title="Tìm kiếm"
                >
                  <Search className="size-3.5" />
                </button>

                {/* Collapse sidebar */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                  title="Thu gọn sidebar"
                >
                  <PanelLeft className="size-3.5" />
                </button>
              </div>

              {/* TOP TABS: [ Chats ]  [ Artifacts ] (Exact Match to ReUI Echo Chat) */}
              <div className="pt-2 pb-1 px-1">
                <div className="grid grid-cols-2 p-[3px] bg-foreground/5 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarTab("chats")
                      setSearchQuery("")
                    }}
                    className={cn(
                      "py-1 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      sidebarTab === "chats"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Chats</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarTab("artifacts")
                      setSearchQuery("")
                    }}
                    className={cn(
                      "py-1 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      sidebarTab === "artifacts"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Artifacts</span>
                  </button>
                </div>
              </div>

              {/* 3. Action Button (New Chat OR Upload Artifact) */}
              <div className="flex flex-col gap-0.5 pt-1 px-0.5">
                {sidebarTab === "chats" ? (
                  <button
                    type="button"
                    onClick={handleCreateNewChat}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 h-9 text-sm hover:bg-foreground/5 font-medium text-foreground cursor-pointer transition-colors"
                  >
                    <Plus className="size-4" />
                    <span>Tạo đoạn chat mới</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {canUploadArtifacts ? (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 h-9 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Upload className="size-3.5" />
                          <span>Tải lên tài liệu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateArtifactModalOpen(true)}
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          title="Tạo văn bản mới"
                        >
                          <Plus className="size-4" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full py-1.5 px-2.5 rounded-md bg-muted/60 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                        <Lock className="size-3 shrink-0 text-amber-500" />
                        <span>Kho tài liệu chỉ đọc (RBAC)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="h-[1px] bg-sidebar-border mx-2 my-1" />

            {/* 4. SIDEBAR CONTENT: CHATS TAB OR ARTIFACTS TAB */}
            {sidebarTab === "chats" ? (
              <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3 text-sm select-none">
                {/* Pinned Group */}
                {pinnedList.length > 0 && (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setCollapsedPinned((v) => !v)}
                      className="w-full flex items-center justify-between px-2 py-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <span>Đã ghim</span>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span>{pinnedList.length}</span>
                        <ChevronDown className={cn("size-3.5 transition-transform", !collapsedPinned && "rotate-180")} />
                      </div>
                    </button>

                    {!collapsedPinned &&
                      pinnedList.map((t) => (
                        <EchoSidebarRow
                          key={t.id}
                          thread={t}
                          isActive={t.id === activeThreadId}
                          onSelect={() => {
                            setActiveThreadId(t.id)
                            localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, t.id)
                          }}
                          onPin={handleTogglePin}
                          onRename={openRenameModal}
                          onExport={handleExportThread}
                          onDelete={handleDeleteThread}
                        />
                      ))}
                  </div>
                )}

                {/* Recent Group */}
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setCollapsedRecent((v) => !v)}
                    className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>Gần đây</span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span>{recentList.length}</span>
                      <ChevronDown className={cn("size-3.5 transition-transform", !collapsedRecent && "rotate-180")} />
                    </div>
                  </button>

                  {!collapsedRecent &&
                    recentList.map((t) => (
                      <EchoSidebarRow
                        key={t.id}
                        thread={t}
                        isActive={t.id === activeThreadId}
                        onSelect={() => {
                          setActiveThreadId(t.id)
                          localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, t.id)
                        }}
                        onPin={handleTogglePin}
                        onRename={openRenameModal}
                        onExport={handleExportThread}
                        onDelete={handleDeleteThread}
                      />
                    ))}

                  {recentList.length === 0 && pinnedList.length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Chưa có đoạn chat nào. Bấm "+ Tạo đoạn chat mới" để bắt đầu.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ARTIFACTS LIST (DATA USER PUSHES UP) */
              <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 text-sm select-none">
                <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <span>Recent artifacts</span>
                  <span className="text-[11px] font-mono opacity-70">({filteredArtifacts.length})</span>
                </div>

                {filteredArtifacts.map((art) => {
                  const isSelected = selectedArtifactId === art.id
                  const ext = art.name.split(".").pop()?.toLowerCase() || ""
                  const isPdf = art.fileType === "pdf" || ext === "pdf"
                  const isCode = ["ts", "tsx", "js", "json", "code"].includes(art.fileType) || ["ts", "tsx", "js", "json"].includes(ext)
                  const isCsv = art.fileType === "csv" || ext === "csv"
                  const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext)

                  return (
                    <div
                      key={art.id}
                      onClick={() => {
                        setSelectedArtifactId(art.id)
                        setIsChatSplitOpen(true)
                      }}
                      className={cn(
                        "group relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] cursor-pointer transition-colors text-left",
                        isSelected
                          ? "bg-foreground/10 font-medium text-foreground"
                          : "hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {/* Icon per file type */}
                      {isPdf ? (
                        <FileText className="size-4 shrink-0 text-rose-500" />
                      ) : isCode ? (
                        <FileCode className="size-4 shrink-0 text-blue-500" />
                      ) : isCsv ? (
                        <FileSpreadsheet className="size-4 shrink-0 text-emerald-500" />
                      ) : isImage ? (
                        <FileText className="size-4 shrink-0 text-amber-500" />
                      ) : (
                        <FileText className="size-4 shrink-0 text-indigo-500" />
                      )}

                      <div className="min-w-0 flex-1 truncate">
                        <span className="block truncate text-xs font-medium text-foreground">{art.name}</span>
                        <span className="block text-[10px] text-muted-foreground font-mono">{art.size} · {art.updatedAt}</span>
                      </div>

                      {/* Delete button on hover (Only for roles with upload permission) */}
                      {canUploadArtifacts && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteArtifact(art.id, e)}
                          className="opacity-0 group-hover:opacity-100 size-5 rounded hover:bg-muted text-muted-foreground hover:text-rose-500 flex items-center justify-center cursor-pointer transition-opacity shrink-0"
                          title="Xóa tài liệu này"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  )
                })}

                {filteredArtifacts.length === 0 && (
                  <div className="p-3 text-center text-xs text-muted-foreground space-y-2">
                    <p>Chưa có tài liệu nào.</p>
                    {canUploadArtifacts ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:underline text-xs"
                      >
                        Bấm vào đây để tải lên tệp tin
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-400">Tài khoản của bạn chỉ có quyền đọc tài liệu sẵn có.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sidebar User Footer matching ReUI Echo Chat */}
            <div className="p-2.5 border-t border-border/80 shrink-0 bg-sidebar/80 flex items-center justify-between text-xs text-muted-foreground select-none">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <UserAvatar
                  name={session?.displayName || userName}
                  avatarUrl={session?.avatarUrl}
                  className="size-6 shrink-0"
                />
                <span className="truncate font-medium text-foreground text-xs">{session?.displayName || userName}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground shrink-0 uppercase border border-border/50">
                {session?.role || "Designer"}
              </span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MAIN CANVAS: CHAT STREAM OR ARTIFACT VIEWER                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background h-full relative">
        {/* Top Header */}
        <header className="bg-background relative z-10 flex h-12 shrink-0 items-center justify-between gap-2 px-4 md:h-13 border-b border-border/40">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                title="Mở sidebar"
              >
                <PanelLeft className="size-4" />
              </button>
            )}

            {sidebarTab === "artifacts" && selectedArtifact ? (
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 text-primary shrink-0" />
                <h1 className="min-w-0 truncate text-sm sm:text-base font-semibold text-foreground">
                  {selectedArtifact.name}
                </h1>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 border border-border/60">
                  {selectedArtifact.fileType.toUpperCase()} · {selectedArtifact.size}
                </span>
              </div>
            ) : (
              <h1 className="min-w-0 truncate text-base font-semibold text-foreground">
                {activeThread?.title || "Cuộc trò chuyện mới"}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">


            {/* AI Gateway & Google AI Studio Key Settings button */}
            <button
              type="button"
              onClick={() => {
                setQuickGeminiKey(getStoredGeminiKey())
                setQuickGateway(getStoredAIGateway())
                setQuickTestResult(null)
                setAiSettingsModalOpen(true)
              }}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-sm font-medium cursor-pointer transition-all bg-background text-foreground hover:bg-muted hover:text-blue-600"
              title="Cài đặt Cổng AI & Google AI Studio Key"
            >
              <Key className="size-3.5 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Bookmark button */}
            {sidebarTab === "chats" && (
              <button
                type="button"
                onClick={() => activeThread && handleTogglePin(activeThread.id)}
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-sm font-medium cursor-pointer transition-all",
                  activeThread?.isPinned
                    ? "bg-secondary text-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                )}
                title="Ghim đoạn chat"
              >
                <Bookmark className={cn("size-3.5", activeThread?.isPinned && "fill-current")} />
              </button>
            )}


            {/* Return to MB Portal button */}
            {onBackToPortal && (
              <button
                type="button"
                onClick={onBackToPortal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border/60 cursor-pointer ml-1"
                title="Quay lại MB UX Portal"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">MB Portal</span>
              </button>
            )}
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* CONDITIONAL BODY: CHAT VIEWPORT OR ARTIFACT VIEWER                  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {selectedArtifact ? (
          /* DUAL PANE / SPLIT VIEW: CHAT VIEWPORT (LEFT) + ARTIFACT VIEWER (RIGHT) */
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden w-full h-full">
            {/* Left Pane: Chat Conversation (Can be collapsed via isChatSplitOpen) */}
            {isChatSplitOpen && (
              <div className="w-full lg:w-1/2 xl:w-[48%] flex flex-col border-r border-border min-h-0 h-full overflow-hidden bg-background">
                {/* Scrollable Message Viewport */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
                  {!activeThread?.messages || activeThread.messages.length === 0 ? (
                    <div className="mx-auto flex w-full max-w-lg flex-col justify-center py-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-foreground">Hỏi AI về tài liệu</h3>
                          <p className="text-xs text-muted-foreground truncate">{selectedArtifact.name}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        Bạn có thể đặt bất kỳ câu hỏi nào về nội dung, quy trình, thông số hoặc yêu cầu AI phân tích tài liệu này.
                      </p>
                      <div className="space-y-1.5 border-t border-border/60 pt-3">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Gợi ý câu hỏi:</span>
                        {[
                          `Tóm tắt 3 điểm cốt lõi nhất của tài liệu ${selectedArtifact.name}`,
                          `Quy trình này quy định những bước nào và SLA ra sao?`,
                          `Chỉ ra các điểm cần lưu ý đặc biệt cho Designer và PO trong tài liệu này`
                        ].map((promptText, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(promptText, selectedArtifact.content, selectedArtifact.name)}
                            className="group flex w-full items-center justify-between py-2 px-2.5 rounded-lg text-left text-xs text-foreground bg-muted/30 hover:bg-muted transition-colors cursor-pointer"
                          >
                            <span className="truncate">{promptText}</span>
                            <CornerDownLeft className="size-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5 text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-2xl space-y-5 py-2">
                      {activeThread.messages.map((m, idx) => (
                        <EchoMessageRow
                          key={m.id || `msg-${idx}`}
                          message={m}
                          isCopied={copiedMsgId === m.id}
                          onCopy={handleCopyMessage}
                          isStreaming={isStreaming && idx === activeThread.messages.length - 1}
                          tasks={tasks}
                          intelligence={intelligence}
                          onOpenTask={(task) => setActiveDetailTask(task)}
                          onSendSuggestion={(text) => handleSendMessage(text, selectedArtifact.content, selectedArtifact.name)}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Composer Form in Split Pane */}
                <div className="shrink-0 px-3 sm:px-4 pb-3 pt-1 z-20 border-t border-border/40 bg-background/80 backdrop-blur-sm">
                  <EchoComposerForm
                    isStreaming={isStreaming}
                    onSend={(text) => handleSendMessage(text, selectedArtifact.content, selectedArtifact.name)}
                    onStop={handleStopStream}
                    onOpenArtifacts={() => setSidebarTab("artifacts")}
                    onUploadFile={() => {
                      if (!canUploadArtifacts) {
                        toast.error("Vai trò của bạn chưa được cấp quyền tải tài liệu lên kho Artifacts.")
                        return
                      }
                      fileInputRef.current?.click()
                    }}
                    artifacts={artifacts}
                    activeArtifact={selectedArtifact}
                    onClearActiveArtifact={() => setSelectedArtifactId(null)}
                    canUploadArtifacts={canUploadArtifacts}
                    currentModel={currentModel}
                    onModelChange={handleModelChange}
                    aiMode={aiMode}
                    onModeChange={handleModeChange}
                  />
                </div>
              </div>
            )}

            {/* Right Pane: Document Viewer with high-end typography & floating zoom pill */}
            <div className={cn(
              "flex flex-col min-h-0 h-full overflow-hidden transition-all",
              isChatSplitOpen ? "w-full lg:w-1/2 xl:w-[52%]" : "w-full"
            )}>
              <EchoArtifactSplitViewer
                artifact={selectedArtifact}
                onClose={() => setSelectedArtifactId(null)}
                onAskAboutDoc={(prompt) => handleSendMessage(prompt, selectedArtifact.content, selectedArtifact.name)}
              />
            </div>
          </div>
        ) : sidebarTab === "artifacts" ? (
            /* ARTIFACTS HUB (DRAG & DROP UPLOAD ZONE OR READ-ONLY VIEW BASED ON RBAC) */
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center">
              <div className="max-w-4xl w-full text-center space-y-6">
                {!canUploadArtifacts ? (
                  /* Read-Only State for Roles without cap-ai-artifacts-upload permission */
                  <div className="w-full rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
                    <div className="size-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
                      <Lock className="size-7" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-foreground">
                        Kho tri thức Artifacts (Chỉ đọc)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed">
                        Tài khoản với vai trò <span className="font-semibold text-slate-800 dark:text-neutral-200 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800">{session?.role || "Chưa xác định"}</span> chỉ có quyền đọc và tra cứu tài liệu sẵn có. Quyền tải lên hoặc tạo tài liệu mới được cấu hình bởi Quản trị viên (Admin) trong tab <span className="font-semibold text-slate-800 dark:text-neutral-200">Quản lý &gt; Phân quyền (RBAC)</span>.
                      </p>
                    </div>
                    <div className="pt-2 text-xs text-slate-400 dark:text-neutral-500">
                      👇 Vui lòng chọn một tài liệu trong danh sách bên dưới hoặc cột bên trái để xem nội dung
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ReUI c-file-upload-10: Khung lớn chuẩn tỷ lệ màn hình (Aspect 21:9) giống Compress Images */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "w-full transition-all duration-200 relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 text-center cursor-pointer min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] aspect-[21/9] bg-white dark:bg-card hover:bg-slate-50/50 dark:hover:bg-muted/30 border-slate-200/90 dark:border-border hover:border-slate-300 dark:hover:border-border/80 shadow-2xs group select-none",
                        isDraggingOver && "border-[#1B3A6B] dark:border-primary bg-slate-50 dark:bg-muted ring-4 ring-[#1B3A6B]/10 dark:ring-primary/10"
                      )}
                    >
                      {/* ReUI c-icon-stack-2 Large Illustration */}
                      <div className="mb-4 pointer-events-none flex items-center justify-center">
                        <IconStackLarge icon={<FileText className="size-6 text-slate-400 group-hover:text-[#1057FB] dark:group-hover:text-blue-400 transition-colors duration-200" />} />
                      </div>

                      <div className="space-y-1.5 max-w-lg mx-auto pointer-events-none">
                        <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-foreground tracking-tight">
                          Kéo thả tài liệu vào đây, hoặc{" "}
                          <span className="text-[#1057FB] dark:text-blue-400 underline underline-offset-4 font-semibold hover:text-[#1B3A6B] dark:hover:text-blue-300 transition-colors">
                            Duyệt tệp
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground font-normal">
                          Hỗ trợ Markdown (.md), PDF, TXT, JSON, CSV, Mã nguồn & Ảnh tư liệu • Dán trực tiếp (Ctrl + V)
                        </p>
                      </div>

                      {/* Guidelines Bullets 2 Cột (Chuẩn Tài liệu & Tri thức Artifacts) */}
                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-border/60 w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left text-xs text-slate-500 dark:text-muted-foreground pointer-events-none">
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1057FB] dark:bg-blue-400 shrink-0" />
                            <span>Đa dạng định dạng (.md, .pdf, .txt, .json, .csv, code, ảnh)</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1057FB] dark:bg-blue-400 shrink-0" />
                            <span>Tự động phân tích trích xuất dữ liệu cho AI Copilot</span>
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1057FB] dark:bg-blue-400 shrink-0" />
                            <span>Đồng bộ an toàn Google Drive & Master Data MB</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1057FB] dark:bg-blue-400 shrink-0" />
                            <span>100% Bảo mật dữ liệu nội bộ MBBank</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span>Hoặc bạn có thể</span>
                      <button
                        type="button"
                        onClick={() => setCreateArtifactModalOpen(true)}
                        className="text-primary font-medium hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="size-3.5" />
                        <span>Tạo tài liệu trực tiếp</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Pre-seeded list */}
                <div className="pt-4 border-t border-border text-left">
                  <span className="text-xs font-medium text-muted-foreground block mb-2">
                    Tài liệu có sẵn trong hệ thống ({artifacts.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {artifacts.slice(0, 4).map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArtifactId(art.id)}
                        className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted cursor-pointer transition-colors flex items-center gap-2.5"
                      >
                        <FileText className="size-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-foreground truncate block">{art.name}</span>
                          <span className="text-[10px] text-muted-foreground">{art.size}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
          /* ───────────────────────────────────────────────────────────────── */
          /* CHAT STREAM VIEWPORT & STICKY COMPOSER                           */
          /* ───────────────────────────────────────────────────────────────── */
          <>
            {/* Scrollable Message Viewport */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
              {!activeThread?.messages || activeThread.messages.length === 0 ? (
                /* Empty State (Exact match to Echo Chat UI with 100% MBBank UX Domain Content) */
                <div className="mx-auto flex w-full max-w-4xl lg:max-w-5xl flex-col justify-center py-6 sm:py-10">
                  {/* Title & Subtitle */}
                  <div className="flex items-start gap-3.5">
                    <div className="size-11 rounded-2xl border border-border/80 bg-background shadow-xs flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                      <img
                        src={aiDefaultLogo}
                        alt="AI MB"
                        className="size-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/ai-default.png"
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Trợ lý UX MB có thể hỗ trợ gì cho bạn?
                      </h2>
                      <p className="text-muted-foreground text-sm sm:text-base">
                        Hỏi đáp về tiến độ bài toán, rà soát PO Pending, phân bổ Deep Work hoặc tra cứu quy chuẩn thiết kế MBBank.
                      </p>
                    </div>
                  </div>

                  {/* 4 Category Pill Buttons matching Echo Chat */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {EMPTY_STATE_CATEGORIES.map((cat) => {
                      const isSelected = emptyCategory === cat.id
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setEmptyCategory(cat.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm rounded-full border transition-all cursor-pointer",
                            isSelected
                              ? "border-foreground/30 bg-foreground/10 text-foreground font-semibold shadow-2xs"
                              : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground font-normal"
                          )}
                        >
                          <Icon className={cn("size-3.5", isSelected ? cat.color : "text-muted-foreground")} />
                          <span>{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* 3 Prompt Suggestions matching the selected category */}
                  <div className="mt-6 flex flex-col divide-y divide-border border-y border-border">
                    {currentCategoryObj.prompts.map((promptText) => (
                      <button
                        key={promptText}
                        type="button"
                        onClick={() => handleSendMessage(promptText)}
                        className="group flex w-full items-center justify-between py-3 text-left text-sm sm:text-base text-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="truncate">{promptText}</span>
                        <CornerDownLeft className="size-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>

                  {/* Recent chats section matching Echo Chat exactly */}
                  <div className="mt-8 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                      <span>Recent chats</span>
                    </div>

                    <div className="divide-y divide-border/60 border-y border-border/60">
                      {displayRecentChats.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => item.onClick()}
                          className="group flex w-full items-center justify-between py-2.5 text-left text-sm hover:bg-muted/30 px-2 rounded-md transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-muted-foreground/50 font-mono text-xs w-4 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="truncate text-foreground group-hover:text-primary font-medium text-[13.5px]">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            {item.fileBadge && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-border/80 bg-muted/40 text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground transition-colors">
                                {item.fileBadge}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground/80 font-mono min-w-7 text-right">
                              {item.timeAgo}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Messages List */
                <div className="mx-auto max-w-4xl lg:max-w-5xl space-y-6 py-2">
                  {activeThread.messages.map((m, idx) => (
                    <EchoMessageRow
                      key={m.id || `msg-${idx}`}
                      message={m}
                      isCopied={copiedMsgId === m.id}
                      onCopy={handleCopyMessage}
                      isStreaming={isStreaming && idx === activeThread.messages.length - 1}
                      tasks={tasks}
                      intelligence={intelligence}
                      onOpenTask={(task) => setActiveDetailTask(task)}
                      onSendSuggestion={(text) => handleSendMessage(text)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* COMPOSER (SEAMLESS DOCK BAR WITH RESTORED USAGE BAR)           */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="shrink-0 px-4 sm:px-6 lg:px-8 pb-3.5 pt-1 z-20">
              <div className="mx-auto w-full max-w-4xl lg:max-w-5xl">
                {/* Real-time MBBank AI Daily Usage Bar */}
                {showUsageNotice && (
                  <div className="mb-2 rounded-xl border border-neutral-200/80 dark:border-border/70 bg-white/95 dark:bg-card/95 backdrop-blur-md shadow-2xs overflow-hidden transition-all">
                    {/* Top Notice Line */}
                    <div className="flex items-center justify-between px-3.5 py-1.5 text-xs text-neutral-600 dark:text-muted-foreground select-none">
                      <div
                        className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer hover:text-neutral-900 dark:hover:text-foreground transition-colors"
                        onClick={() => {
                          setNoticeCollapsed((v) => {
                            const next = !v
                            try {
                              localStorage.setItem("ux_mb_ai_notice_collapsed", String(next))
                            } catch {}
                            return next
                          })
                        }}
                      >
                        <Sparkles className="size-3.5 shrink-0 text-amber-500" />
                        <span className="truncate text-xs font-normal">
                          Đã dùng <span className="font-semibold text-foreground">{dailyUsage.usedRequests}/{dailyUsage.totalRequests}</span> lượt AI hôm nay (Còn lại {dailyUsage.remainingRequests} lượt)
                          <span className="text-neutral-300 dark:text-muted-foreground/40 mx-1.5">•</span>
                          Tự động làm mới lúc 00:00
                        </span>
                        {noticeCollapsed ? (
                          <ChevronDown className="size-3 text-neutral-400 dark:text-muted-foreground ml-0.5 shrink-0" />
                        ) : (
                          <ChevronUp className="size-3 text-neutral-400 dark:text-muted-foreground ml-0.5 shrink-0" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowUsageNotice(false)}
                        className="size-5 rounded hover:bg-neutral-100 dark:hover:bg-muted text-neutral-400 hover:text-neutral-700 dark:hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
                        title="Đóng thanh hạn mức"
                      >
                        <X className="size-3" />
                      </button>
                    </div>

                    {/* Progress Bar & Subtitle Information */}
                    {!noticeCollapsed && (
                      <div className="px-3.5 pb-2.5 space-y-1.5 pt-0.5 border-t border-neutral-100 dark:border-border/40">
                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-muted rounded-full overflow-hidden relative flex">
                          <div
                            className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(2, dailyUsage.percent))}%` }}
                          />
                          <div
                            className="h-full flex-1 opacity-40 bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_2px,transparent_2px,transparent_6px)]"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-500 dark:text-muted-foreground font-mono">
                          <span>{dailyUsage.percent}% hạn mức ngày ({dailyUsage.usedRequests}/{dailyUsage.totalRequests} lượt)</span>
                          <span>{dailyUsage.remainingRequests > 0 ? `Còn ${dailyUsage.remainingRequests} lượt khả dụng` : "Đã đạt hạn mức hôm nay"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <EchoComposerForm
                  isStreaming={isStreaming}
                  onSend={(text) => handleSendMessage(
                    text,
                    selectedArtifact
                      ? `=== TÀI LIỆU NGƯỜI DÙNG ĐẨY LÊN: "${selectedArtifact.name}" (${selectedArtifact.fileType}) ===\n${selectedArtifact.content}`
                      : undefined,
                    selectedArtifact?.name
                  )}
                  onStop={handleStopStream}
                  onOpenArtifacts={() => setSidebarTab("artifacts")}
                  onUploadFile={() => {
                    if (!canUploadArtifacts) {
                      toast.error("Vai trò của bạn chưa được cấp quyền tải tài liệu lên kho Artifacts.")
                      return
                    }
                    fileInputRef.current?.click()
                  }}
                  artifacts={artifacts}
                  canUploadArtifacts={canUploadArtifacts}
                  currentModel={currentModel}
                  onModelChange={handleModelChange}
                  aiMode={aiMode}
                  onModeChange={handleModeChange}
                />
                {/* Disclaimer */}
                <p className="text-muted-foreground text-center text-xs mt-2 select-none">
                  AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal Popup: Thông báo chưa đồng bộ dữ liệu AI (Thay thế cụm nút vàng vàng cũ) */}
      <Dialog
        open={syncWarningModalOpen}
        onClose={() => setSyncWarningModalOpen(false)}
        size="sm"
        className="p-5 sm:p-6 space-y-4 rounded-2xl"
      >
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <CloudOff className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              Chưa đồng bộ dữ liệu AI
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dữ liệu trò chuyện và tài liệu chưa được đồng bộ với Google Sheet / Google Drive hoặc chưa cấu hình liên kết bảng tính. Vui lòng thử lại để cập nhật toàn bộ lịch sử trò chuyện và tài liệu.
            </p>
            <div className="pt-1">
              <a
                href="https://drive.google.com/drive/folders/1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <span>Mở thư mục Google Drive lưu trữ hệ thống</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSyncWarningModalOpen(false)}
            className="h-8 text-xs text-foreground cursor-pointer"
          >
            Đóng
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              setSyncWarningModalOpen(false)
              await handleManualCloudSync()
            }}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>Thử lại ngay</span>
          </Button>
        </div>
      </Dialog>

      {/* Modal Popup: Cài đặt Cổng AI & Google AI Studio Key */}
      <Dialog
        open={aiSettingsModalOpen}
        onClose={() => setAiSettingsModalOpen(false)}
        size="md"
        className="p-5 sm:p-6 space-y-4 rounded-2xl max-w-lg"
      >
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
            <Key className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                Cổng Kết Nối AI & Google AI Studio
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                1.500 RPD Free
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kết nối trực tiếp máy chủ Google AI Studio để sử dụng mô hình <strong>Gemini 2.0 Flash</strong> với khả năng đọc hiểu ảnh (Vision) tốc độ cao và hoàn toàn miễn phí.
            </p>
          </div>
        </div>

        {/* Gateway Mode */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-foreground">
            Chế độ điều phối Cổng AI:
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setQuickGateway("auto")
                saveAIGateway("auto")
                toast.success("Đã chọn: Tự động điều phối")
              }}
              className={cn(
                "p-2 rounded-lg border text-center transition-all cursor-pointer text-[11px]",
                quickGateway === "auto"
                  ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              Tự động (Auto)
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickGateway("google_ai_studio")
                saveAIGateway("google_ai_studio")
                toast.success("Đã chọn: Google AI Studio Trực tiếp")
              }}
              className={cn(
                "p-2 rounded-lg border text-center transition-all cursor-pointer text-[11px]",
                quickGateway === "google_ai_studio"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              Google AI Studio
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickGateway("openrouter")
                saveAIGateway("openrouter")
                toast.success("Đã chọn: OpenRouter Gateway")
              }}
              className={cn(
                "p-2 rounded-lg border text-center transition-all cursor-pointer text-[11px]",
                quickGateway === "openrouter"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              OpenRouter Pool
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Google AI Studio API Key:
            </label>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Lấy key tại aistudio.google.com</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
          <input
            type="password"
            value={quickGeminiKey}
            onChange={(e) => setQuickGeminiKey(e.target.value)}
            placeholder="AIzaSy... (Dán Google AI Studio API Key vào đây)"
            className="w-full text-xs font-mono rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs"
          />
        </div>

        {/* Test Result feedback */}
        {quickTestResult && (
          <div
            className={cn(
              "p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2",
              quickTestResult.success
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-rose-50/90 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
            )}
          >
            <div className="flex items-center gap-2">
              {quickTestResult.success ? (
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{quickTestResult.message}</span>
            </div>
            {quickTestResult.latencyMs > 0 && (
              <span className="font-mono text-[11px] font-bold">
                {quickTestResult.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              setQuickTestingGemini(true)
              setQuickTestResult(null)
              try {
                const res = await testGeminiConnection(quickGeminiKey.trim())
                setQuickTestResult(res)
                if (res.success) toast.success(`Google AI Studio Online (${res.latencyMs}ms)`)
                else toast.error(`Kiểm tra thất bại: ${res.message}`)
              } catch (err: any) {
                setQuickTestResult({ success: false, message: err?.message || "Lỗi kết nối", latencyMs: 0 })
              } finally {
                setQuickTestingGemini(false)
              }
            }}
            disabled={quickTestingGemini || !quickGeminiKey.trim()}
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", quickTestingGemini && "animate-spin")} />
            <span>{quickTestingGemini ? "Đang thử..." : "Test kết nối"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              const trimmed = quickGeminiKey.trim()
              saveGeminiKey(trimmed)
              saveAIGateway(quickGateway)
              toast.success("Đã lưu cấu hình Google AI Studio thành công!")
              setAiSettingsModalOpen(false)
            }}
            className="text-xs h-9 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check className="size-3.5 mr-1.5" />
            <span>Lưu & Kích hoạt</span>
          </Button>
        </div>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        size="sm"
        className="p-5 space-y-4"
      >
        <div className="space-y-1.5">
          <h3 className="font-semibold text-sm text-foreground">Đổi tên đoạn trò chuyện</h3>
          <p className="text-xs text-muted-foreground">
            Nhập tiêu đề rõ ràng để dễ dàng tìm kiếm lại sau này.
          </p>
        </div>

        <input
          type="text"
          value={renameInput}
          onChange={(e) => setRenameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveRename()
          }}
          className="w-full h-8 px-3 text-xs bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-ring"
          placeholder="Tiêu đề đoạn hội thoại..."
          autoFocus
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRenameModalOpen(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveRename}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Lưu
          </Button>
        </div>
      </Dialog>

      {/* Manual Artifact Create Modal */}
      <Dialog
        open={createArtifactModalOpen}
        onClose={() => setCreateArtifactModalOpen(false)}
        size="lg"
        className="p-6 space-y-4 max-w-2xl"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Tạo tài liệu / Specs mới
              </h3>
              <p className="text-xs text-muted-foreground">
                Dữ liệu tài liệu này sẽ được lưu trữ và có thể dùng làm bối cảnh để AI hỏi đáp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateArtifactModalOpen(false)}
            className="size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Tên tài liệu
            </label>
            <input
              type="text"
              value={newArtTitle}
              onChange={(e) => setNewArtTitle(e.target.value)}
              placeholder="Ví dụ: Specs-Mo-The-Tin-Dung-JCB.md"
              className="w-full h-8 px-3 text-xs bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Định dạng
            </label>
            <div className="flex items-center gap-2">
              {(["markdown", "text", "json", "code"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewArtType(t)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md border font-medium cursor-pointer transition-colors",
                    newArtType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Nội dung tài liệu
            </label>
            <textarea
              rows={10}
              value={newArtContent}
              onChange={(e) => setNewArtContent(e.target.value)}
              placeholder="Dán nội dung tài liệu, specs hoặc hướng dẫn thiết kế vào đây..."
              className="w-full p-3 text-xs font-mono bg-background border border-border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-ring resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateArtifactModalOpen(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreateArtifactSubmit}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Lưu tài liệu
          </Button>
        </div>
      </Dialog>



      {/* Task Drawer */}
      {activeDetailTask && (
        <RequestDetail
          open={Boolean(activeDetailTask)}
          request={activeDetailTask}
          onClose={() => setActiveDetailTask(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS: USER AVATAR (ACTUAL USER AVATAR OR INITIALS - NO UNSPLASH)
// ─────────────────────────────────────────────────────────────────────────────

function EchoUserAvatar({
  className = "size-8",
  name,
  avatarUrl,
}: {
  className?: string
  name?: string
  avatarUrl?: string
}) {
  const session = getStoredSession()
  const resolvedName = name || session?.displayName || (session as any)?.name || (session as any)?.username || "User"
  const resolvedUrl = avatarUrl !== undefined ? avatarUrl : (session?.avatarUrl || (session as any)?.avatar || "")

  // Sanitize if legacy Unsplash woman avatar
  const cleanUrl =
    resolvedUrl &&
    (resolvedUrl.includes("photo-1534528741775-53994a69daeb") ||
      resolvedUrl.includes("photo-1534528741775"))
      ? ""
      : resolvedUrl

  return (
    <UserAvatar
      name={resolvedName}
      avatarUrl={cleanUrl}
      size="lg"
      className={cn("size-8 rounded-full shrink-0 shadow-2xs border border-border/40", className)}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS: SIDEBAR ROW
// ─────────────────────────────────────────────────────────────────────────────

interface EchoSidebarRowProps {
  thread: ChatThread
  isActive: boolean
  onSelect: () => void
  onPin: (id: string, e?: React.MouseEvent) => void
  onRename: (thread: ChatThread, e?: React.MouseEvent) => void
  onExport: (thread: ChatThread, e?: React.MouseEvent) => void
  onDelete: (id: string, e?: React.MouseEvent) => void
}

function EchoSidebarRow({
  thread,
  isActive,
  onSelect,
  onPin,
  onRename,
  onExport,
  onDelete,
}: EchoSidebarRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 h-9 text-[13px] sm:text-sm cursor-pointer transition-colors text-left",
        isActive
          ? "bg-foreground/10 font-medium text-foreground"
          : "hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="truncate flex-1">{thread.title}</span>

      {/* Action buttons on hover */}
      <div
        className={cn(
          "flex items-center gap-0.5 transition-opacity shrink-0",
          menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        ref={menuRef}
      >
        <button
          type="button"
          onClick={(e) => onPin(thread.id, e)}
          className="size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
          title={thread.isPinned ? "Bỏ ghim" : "Ghim"}
        >
          <Pin className={cn("size-2.5", thread.isPinned && "fill-current text-primary")} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          className="size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
          title="Tùy chọn khác"
        >
          <MoreHorizontal className="size-2.5" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-6 z-50 w-36 py-1 bg-background text-foreground rounded-lg shadow-md border border-border text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  setMenuOpen(false)
                  onRename(thread, e)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="size-3" />
                <span>Đổi tên</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setMenuOpen(false)
                  onExport(thread, e)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2 cursor-pointer"
              >
                <Download className="size-3" />
                <span>Xuất .md</span>
              </button>
              <div className="h-[1px] bg-border my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  setMenuOpen(false)
                  onDelete(thread.id, e)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-destructive/10 text-destructive flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="size-3" />
                <span>Xóa</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS: MESSAGE ROW (USES /ai-default.png FOR BOT AVATAR)
// ─────────────────────────────────────────────────────────────────────────────

interface EchoMessageRowProps {
  message: ChatMessage
  isCopied: boolean
  onCopy: (msgId: string, text: string) => void
  isStreaming?: boolean
  tasks?: UXRequest[]
  intelligence?: ExecutiveIntelligenceData | null
  onOpenTask?: (task: UXRequest) => void
  onSendSuggestion?: (suggestion: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// RICH FORMAT SUBCOMPONENTS: TABLES, CODE, ACTIONS, SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────

interface EchoActionItem {
  icon?: string
  title: string
  action?: string
  desc?: string
}

interface EchoActionData {
  title?: string
  items: EchoActionItem[]
  notified?: {
    label?: string
    users?: Array<{ name: string; avatar?: string }>
  }
  question?: string
  approveText?: string
  rejectText?: string
}

interface ReferencedDoc {
  name: string
  status?: string
}

/**
 * 1. BẢNG DỮ LIỆU TƯƠNG TÁC (MARKDOWN TABLE WITH COLUMN SORTING & TOTAL ROW)
 * Khớp hoàn hảo theo Screenshot 2: Driver ↕, July ↕, August ↕, Change ↕, dòng Total ở cuối
 */
function EchoMarkdownTable({ rawTable }: { rawTable: string }) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const lines = useMemo(() => {
    return rawTable
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("|") && l.endsWith("|"))
  }, [rawTable])

  const headers = useMemo(() => {
    if (lines.length === 0) return []
    return lines[0]
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim())
  }, [lines])

  const rows = useMemo(() => {
    if (lines.length < 2) return []
    // Bỏ qua dòng tiêu đề và dòng phân cách |---|---|
    return lines.slice(2).map((l) =>
      l
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
    )
  }, [lines])

  // Tự động nhận diện cột số liệu để căn phải (Right Align)
  const numericCols = useMemo(() => {
    const isNum: boolean[] = []
    headers.forEach((_, colIdx) => {
      const allNums = rows.every((r) => {
        const val = r[colIdx] || ""
        if (!val) return true
        return !isNaN(Number(val.replace(/,/g, "")))
      })
      isNum.push(allNums && rows.length > 0)
    })
    return isNum
  }, [headers, rows])

  // Tách dòng Total / Tổng cộng ra khỏi các dòng thông thường
  const { regularRows, totalRow } = useMemo<{ regularRows: string[][]; totalRow: string[] | null }>(() => {
    const totalKeywords = ["total", "tổng", "tổng cộng", "sum"]
    let total: string[] | null = null
    const regular: string[][] = []

    rows.forEach((r) => {
      const firstCell = (r[0] || "").toLowerCase().trim()
      if (totalKeywords.some((kw) => firstCell === kw || firstCell.startsWith(kw))) {
        total = r
      } else {
        regular.push(r)
      }
    })

    return { regularRows: regular, totalRow: total }
  }, [rows])

  // Sắp xếp các dòng thường khi người dùng nhấp vào cột
  const sortedRows = useMemo(() => {
    if (sortCol === null) return regularRows
    const isNum = numericCols[sortCol]
    const dir = sortDir === "asc" ? 1 : -1

    return [...regularRows].sort((a, b) => {
      const valA = a[sortCol] || ""
      const valB = b[sortCol] || ""
      if (isNum) {
        const numA = Number(valA.replace(/,/g, "")) || 0
        const numB = Number(valB.replace(/,/g, "")) || 0
        return (numA - numB) * dir
      }
      return valA.localeCompare(valB, "vi") * dir
    })
  }, [regularRows, sortCol, sortDir, numericCols])

  const handleHeaderClick = (colIdx: number) => {
    if (sortCol !== colIdx) {
      setSortCol(colIdx)
      setSortDir("asc")
    } else if (sortDir === "asc") {
      setSortDir("desc")
    } else {
      setSortCol(null)
      setSortDir("asc")
    }
  }

  if (headers.length === 0) return null

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-neutral-200/90 dark:border-border/70 bg-card/40 shadow-2xs">
      <table className="w-full text-left text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-neutral-200/80 dark:border-border/70 bg-muted/40 text-neutral-600 dark:text-muted-foreground font-medium text-xs select-none">
            {headers.map((h, hIdx) => (
              <th
                key={hIdx}
                onClick={() => handleHeaderClick(hIdx)}
                className={cn(
                  "py-2.5 px-3.5 cursor-pointer hover:bg-muted/70 hover:text-foreground transition-colors group",
                  numericCols[hIdx] ? "text-right" : "text-left"
                )}
                title="Nhấp để sắp xếp dữ liệu cột"
              >
                <div className={cn("inline-flex items-center gap-1", numericCols[hIdx] && "flex-row-reverse")}>
                  <span>{h}</span>
                  <ChevronsUpDown className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200/50 dark:divide-border/40">
          {sortedRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={cn(
                    "py-2 px-3.5 text-foreground",
                    numericCols[cIdx] ? "text-right font-mono tabular-nums" : "text-left"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}

          {/* Dòng Total / Tổng cộng theo chuẩn Screenshot 2 */}
          {totalRow && (
            <tr className="border-t-2 border-neutral-300 dark:border-border/80 font-semibold bg-muted/25 text-foreground">
              {totalRow.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={cn(
                    "py-2.5 px-3.5",
                    numericCols[cIdx] ? "text-right font-mono tabular-nums" : "text-left"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 2. THẺ ĐỀ XUẤT HÀNH ĐỘNG TƯƠNG TÁC (INTERACTIVE ACTION CARD)
 * Hiển thị bài toán UX trọng điểm, Designer phụ trách và liên kết mở xem chi tiết task
 */
function EchoActionCard({
  data,
  tasks,
  onOpenTask,
}: {
  data: EchoActionData
  tasks?: UXRequest[]
  onOpenTask?: (task: UXRequest) => void
}) {
  // Tìm bài toán tương ứng trong danh sách tasks
  const matchedTask = useMemo(() => {
    if (!tasks || tasks.length === 0) return null

    // 1. Tìm theo taskId nếu có
    const explicitId = (data as any).taskId || (data as any).id
    if (explicitId) {
      const found = tasks.find((t) => t.id === explicitId || t.request_id === explicitId)
      if (found) return found
    }

    // 2. Tìm theo items title
    for (const item of data.items || []) {
      const itemTitle = (item.title || "").toLowerCase().trim()
      if (!itemTitle) continue
      const found = tasks.find((t) => {
        const tTitle = (t.title || "").toLowerCase()
        const tNick = (t.nickname || "").toLowerCase()
        const tId = (t.request_id || t.id || "").toLowerCase()
        return (
          (tId && itemTitle.includes(tId)) ||
          (tNick && (itemTitle.includes(tNick) || tNick.includes(itemTitle))) ||
          (tTitle && (itemTitle.includes(tTitle) || tTitle.includes(itemTitle)))
        )
      })
      if (found) return found
    }

    // 3. Tìm theo tiêu đề Action Card
    if (data.title) {
      const cTitle = data.title.toLowerCase()
      const found = tasks.find((t) => {
        const tTitle = (t.title || "").toLowerCase()
        const tNick = (t.nickname || "").toLowerCase()
        return (tNick && cTitle.includes(tNick)) || (tTitle && cTitle.includes(tTitle))
      })
      if (found) return found
    }

    return tasks[0] || null
  }, [tasks, data])

  // Xác định Designer phụ trách thực tế của bài toán
  const designerName = useMemo(() => {
    if (matchedTask?.assigned_designer) {
      return matchedTask.assigned_designer
    }
    // Lấy từ data.notified nếu có thông tin designer
    const notifiedUser = data.notified?.users?.find(
      (u) => u.name && !u.name.toLowerCase().includes("po") && !u.name.toLowerCase().includes("lead")
    )
    if (notifiedUser?.name) {
      return notifiedUser.name
    }
    if (data.notified?.users?.[0]?.name) {
      return data.notified.users[0].name
    }
    return "Lê Hoàng Nam (Designer)"
  }, [matchedTask, data])

  const handleOpenDetail = () => {
    if (matchedTask && onOpenTask) {
      onOpenTask(matchedTask)
      toast.success(`Đang mở chi tiết bài toán: "${matchedTask.nickname || matchedTask.title}"`)
    } else if (tasks && tasks.length > 0 && onOpenTask) {
      onOpenTask(tasks[0])
    } else {
      toast.info("Không tìm thấy thông tin chi tiết bài toán.")
    }
  }

  return (
    <div className="my-3 rounded-2xl border border-neutral-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 p-4 shadow-xs space-y-3.5 max-w-xl">
      {data.title && (
        <div className="text-[13.5px] font-semibold text-foreground flex items-center justify-between">
          <span>{data.title}</span>
          {matchedTask?.squad_name && (
            <span className="text-[11px] font-normal text-muted-foreground bg-neutral-100 dark:bg-muted px-2 py-0.5 rounded-md">
              {matchedTask.squad_name}
            </span>
          )}
        </div>
      )}

      {/* Item List: Có thể click trực tiếp vào từng bài toán để mở task */}
      <div className="space-y-2">
        {(data.items || []).map((item, idx) => (
          <div
            key={idx}
            onClick={handleOpenDetail}
            className="flex items-start gap-2.5 text-[13px] text-foreground p-2.5 rounded-xl bg-neutral-50/70 hover:bg-neutral-100/80 dark:bg-muted/40 dark:hover:bg-muted/70 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200 dark:hover:border-border/80"
            title="Bấm để xem chi tiết bài toán"
          >
            <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <ExternalLink className="size-3.5" />
            </div>
            <div className="leading-snug flex-1 min-w-0">
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-3">
                {item.title}
              </span>{" "}
              <span className="text-neutral-600 dark:text-neutral-400">
                {item.action || item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Thông tin Designer phụ trách (Chính xác theo Designer thực tế, không phải PO) */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-border/50">
        <div className="flex items-center gap-2.5">
          <UserAvatar
            name={designerName}
            className="inline-flex size-7 rounded-full ring-2 ring-background text-[10px] font-bold shadow-2xs"
          />
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground font-medium">Designer phụ trách</span>
            <span className="text-xs font-semibold text-foreground">{designerName}</span>
          </div>
        </div>

        {matchedTask?.current_phase && (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
            {matchedTask.current_phase}
          </span>
        )}
      </div>

      {/* Nút hành động trực tiếp: Xem chi tiết bài toán (Không đôn đốc) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleOpenDetail}
          className="w-full py-2.5 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground text-xs font-medium transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <ExternalLink className="size-3.5" />
          <span>{data.approveText || "Xem chi tiết bài toán"}</span>
        </button>
      </div>
    </div>
  )
}

/**
 * 3. KHỐI ARTIFACT / MÃ NGUỒN CÓ TIÊU ĐỀ TỆP (CODE & ARTIFACT BLOCK WITH FILENAME)
 * Khớp hoàn hảo theo Screenshot 4: Top bar có release-notes-3.4.md và nút Copy
 */
function EchoArtifactBox({
  fileName,
  lang,
  code,
  onCopy,
  isCopied,
}: {
  fileName?: string
  lang?: string
  code: string
  onCopy: (text: string) => void
  isCopied?: boolean
}) {
  const codeLines = useMemo(() => code.trim().split("\n"), [code])

  return (
    <div className="rounded-xl border border-neutral-200/90 dark:border-border/80 bg-background shadow-xs overflow-hidden my-3">
      <div className="flex items-center justify-between px-3.5 py-2 bg-muted/30 border-b border-border/70 text-xs text-muted-foreground">
        <span className="font-mono text-xs text-foreground/90 font-medium select-all">
          {fileName || (lang ? lang.toUpperCase() : "release-notes-3.4.md")}
        </span>
        <button
          type="button"
          onClick={() => onCopy(code)}
          className="size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          title="Sao chép nội dung"
        >
          {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
        </button>
      </div>

      <div className="p-3.5 font-mono text-xs overflow-x-auto space-y-1 bg-background text-foreground leading-relaxed">
        {codeLines.map((line, lIdx) => (
          <div key={lIdx} className="flex gap-3">
            <span className="text-muted-foreground/40 select-none w-4 text-right shrink-0">
              {lIdx + 1}
            </span>
            <span
              className={cn(
                "whitespace-pre",
                line.startsWith("#") ? "text-primary font-semibold" : "text-foreground"
              )}
            >
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 3b. THẺ ĐỀ XUẤT CẬP NHẬT TRẠNG THÁI TASK TỪ AI (TASK UPDATE ACTION CARD)
 * Cho phép người dùng duyệt và cập nhật trạng thái/tiến độ/khâu task trực tiếp từ AI Copilot
 */
function EchoTaskUpdateCard({
  data,
  tasks,
  onOpenTask,
  onSendSuggestion,
}: {
  data: {
    request_id?: string
    task_name?: string
    current_status?: string
    suggested_phase?: string
    suggested_status?: string
    suggested_progress?: number
    note?: string
    action_type?: string
  }
  tasks?: UXRequest[]
  onOpenTask?: (task: UXRequest) => void
  onSendSuggestion?: (text: string) => void
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [editNote, setEditNote] = useState(data.note || "")
  const [isEditingNote, setIsEditingNote] = useState(false)

  const matchedTask = useMemo(() => {
    if (!tasks || tasks.length === 0 || !data.request_id) return null
    return (
      tasks.find(
        (t) =>
          t.request_id === data.request_id ||
          t.id === data.request_id ||
          (data.task_name &&
            (t.nickname?.toLowerCase().includes(data.task_name.toLowerCase()) ||
              t.title?.toLowerCase().includes(data.task_name.toLowerCase())))
      ) || null
    )
  }, [tasks, data.request_id, data.task_name])

  const handleConfirmUpdate = async () => {
    if (!data.request_id) return
    setIsUpdating(true)
    try {
      const targetPhase = data.suggested_phase || (matchedTask ? matchedTask.current_phase : "Đang xử lý")
      const targetStatus = data.suggested_status || (matchedTask ? matchedTask.status : "Đang xử lý")
      const targetProgress =
        typeof data.suggested_progress === "number"
          ? data.suggested_progress
          : matchedTask
          ? matchedTask.progress
          : 50
      const noteToSend = editNote || data.note || "Cập nhật qua AI Copilot"

      const res = await updateTaskProgressInSheet(data.request_id, {
        new_phase: targetPhase,
        new_status: targetStatus,
        new_progress: targetProgress,
        note: noteToSend,
      })

      if (res.success) {
        setIsDone(true)
        toast.success(`Đã cập nhật bài toán [${data.request_id}] lên ${targetPhase} (${targetProgress}%)!`)
        window.dispatchEvent(
          new CustomEvent("task_updated", {
            detail: { requestId: data.request_id, phase: targetPhase, status: targetStatus, progress: targetProgress },
          })
        )
      } else {
        toast.warning(res.message || "Không thể đồng bộ lên Google Sheet, đã lưu cục bộ.")
        setIsDone(true)
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi cập nhật trạng thái bài toán")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleOpenDetail = () => {
    if (matchedTask && onOpenTask) {
      onOpenTask(matchedTask)
    } else {
      toast.info(`Bài toán: ${data.task_name || data.request_id}`)
    }
  }

  const currentPhaseOrStatus =
    data.current_status || (matchedTask ? matchedTask.current_phase || matchedTask.status : "Hiện tại")
  const newPhaseOrStatus = data.suggested_phase || data.suggested_status || "Khâu tiếp theo"
  const progressVal =
    typeof data.suggested_progress === "number" ? data.suggested_progress : (matchedTask?.progress ?? 50)

  return (
    <div className="my-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 to-white/95 dark:from-indigo-950/20 dark:to-card/95 p-4 shadow-sm space-y-3.5 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-[13px] font-semibold text-foreground">
            Đề xuất cập nhật tiến độ bài toán
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
          {data.request_id}
        </span>
      </div>

      {/* Tên bài toán */}
      <div className="text-sm font-medium text-foreground">
        "{data.task_name || matchedTask?.nickname || matchedTask?.title || "Bài toán UX"}"
      </div>

      {/* Trạng thái thay đổi: Hiện tại -> Mới */}
      <div className="p-3 rounded-xl bg-background/80 border border-neutral-200/70 dark:border-border/60 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground">Hiện tại</div>
            <div className="font-medium text-foreground/80">{currentPhaseOrStatus}</div>
          </div>
          <div className="size-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 mx-2 text-xs">
            →
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Đề xuất chuyển sang</div>
            <div className="font-semibold text-indigo-700 dark:text-indigo-300">{newPhaseOrStatus}</div>
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Tiến độ mới</span>
            <span className="font-mono font-semibold text-foreground">{progressVal}%</span>
          </div>
          <div className="h-2 w-full bg-neutral-100 dark:bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ghi chú AI & cho phép sửa */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Ghi chú cập nhật:</span>
          {!isDone && (
            <button
              type="button"
              onClick={() => setIsEditingNote(!isEditingNote)}
              className="text-primary hover:underline cursor-pointer"
            >
              {isEditingNote ? "Xong" : "Chỉnh sửa"}
            </button>
          )}
        </div>
        {isEditingNote && !isDone ? (
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            rows={2}
            className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Nhập ghi chú cập nhật..."
          />
        ) : (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50 italic">
            "{editNote || data.note || "Cập nhật tiến độ theo khuyến nghị của AI"}"
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {isDone ? (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 w-full justify-center">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Đã cập nhật trạng thái vào hệ thống thành công</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleConfirmUpdate}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Xác nhận cập nhật ngay</span>
                </>
              )}
            </button>
            {onOpenTask && matchedTask && (
              <button
                type="button"
                onClick={handleOpenDetail}
                className="py-2 px-3 rounded-xl border border-neutral-200 dark:border-border hover:bg-muted text-xs text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="size-3.5" />
                <span>Xem task</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 4. TÀI LIỆU THAM CHIẾU (REFERENCED DOCUMENTS FOOTER CHIPS)
 * Khớp hoàn hảo theo Screenshot 4 footer: "2 Documents Read" + các chip release-notes-3.4.md, release-notes-3.3.md
 */
function EchoReferencedDocs({ docs }: { docs: ReferencedDoc[] }) {
  if (!Array.isArray(docs) || docs.length === 0) return null

  return (
    <div className="mt-3 pt-1">
      <div className="text-xs font-normal text-muted-foreground mb-2">
        {docs.length} Documents Read
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(Array.isArray(docs) ? docs : []).map((doc, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-neutral-200/90 dark:border-border/80 bg-white/90 dark:bg-card/90 hover:bg-neutral-50 dark:hover:bg-accent/40 hover:border-neutral-300 transition-colors cursor-pointer shadow-2xs"
          >
            <div className="size-6 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <FileText className="size-3 text-muted-foreground" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-xs font-mono font-medium text-foreground truncate">{doc.name}</div>
              {doc.status && (
                <div className="text-[11px] text-muted-foreground truncate">{doc.status}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 5. GỢI Ý HÀNH ĐỘNG TIẾP THEO (FOLLOW-UP SUGGESTION CHIPS)
 * Khớp hoàn hảo theo Screenshot 1: Shorten to two lines ↳, Add the retry window ↳
 */
function EchoFollowUpSuggestions({
  suggestions,
  onSend,
}: {
  suggestions: string[]
  onSend: (text: string) => void
}) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="flex flex-col items-end gap-1.5 pt-3">
      {suggestions.map((sug, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSend(sug)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200/90 dark:border-border/80 bg-white dark:bg-card hover:bg-neutral-50 dark:hover:bg-accent/50 hover:border-neutral-300 dark:hover:border-neutral-600 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-foreground shadow-2xs transition-all cursor-pointer group"
        >
          <span>{sug}</span>
          <CornerDownLeft className="size-3 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors" />
        </button>
      ))}
    </div>
  )
}

/**
 * Render text với định dạng inline Markdown (đậm, nghiêng, danh sách, link)
 */
/**
 * Inline text parser for bold **text**, italic *text*, `code`, and links [label](url)
 */
function formatInlineText(text: string): React.ReactNode {
  if (!text) return null

  // Auto-bold key-value prefix if not already markdown formatted
  if (!text.includes("**") && !text.includes("*") && !text.includes("`")) {
    const colonMatch = text.match(/^([A-ZÀ-Ỹa-zà-ỹ0-9\s/]{2,30}:)(\s+.*)?$/)
    if (colonMatch) {
      return (
        <>
          <strong className="font-semibold text-foreground">{colonMatch[1]}</strong>
          {colonMatch[2] ? colonMatch[2] : null}
        </>
      )
    }
  }

  // Regex splitting by bold, inline code, links, and italic
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(
        <React.Fragment key={`txt-${lastIdx}`}>
          {text.substring(lastIdx, match.index)}
        </React.Fragment>
      )
    }
    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="font-mono text-[85%] px-1.5 py-0.5 rounded-[4px] bg-neutral-100 dark:bg-muted text-primary font-normal"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-muted-foreground">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        parts.push(
          <a
            key={`a-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
          >
            {linkMatch[1]}
          </a>
        )
      } else {
        parts.push(<React.Fragment key={`tok-${match.index}`}>{token}</React.Fragment>)
      }
    } else {
      parts.push(<React.Fragment key={`tok-${match.index}`}>{token}</React.Fragment>)
    }
    lastIdx = match.index + token.length
  }

  if (lastIdx < text.length) {
    parts.push(
      <React.Fragment key={`txt-${lastIdx}`}>
        {text.substring(lastIdx)}
      </React.Fragment>
    )
  }

  return parts.length > 0 ? parts : text
}

interface VisualErrorBoundaryProps {
  children: React.ReactNode
  fallbackCode?: string
}

interface VisualErrorBoundaryState {
  hasError: boolean
}

class VisualErrorBoundary extends React.Component<VisualErrorBoundaryProps, VisualErrorBoundaryState> {
  constructor(props: VisualErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): VisualErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[AIChatPage] Visual component render error caught by ErrorBoundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-2.5 p-3 rounded-xl border border-amber-200/90 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
          <div className="font-medium flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>Không thể hiển thị trực quan (dữ liệu biểu đồ hoặc sơ đồ không hợp lệ)</span>
          </div>
          {this.props.fallbackCode && (
            <pre className="font-mono text-[11px] p-2 rounded-lg bg-black/5 dark:bg-black/30 overflow-x-auto whitespace-pre-wrap max-h-40 text-muted-foreground">
              {this.props.fallbackCode}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

function RenderMarkdownParagraph({ text }: { text: string }) {
  if (!text) return null
  const paragraphs = text.split("\n\n")

  return (
    <div className="space-y-2.5">
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim()
        if (!trimmed) return null

        // Render bullet list
        if (trimmed.split("\n").every((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "))) {
          const items = trimmed.split("\n").map((l) => l.trim().replace(/^[-*]\s*/, ""))
          return (
            <ul key={pIdx} className="space-y-1 list-disc list-inside text-foreground pl-1">
              {items.map((it, iIdx) => (
                <li key={iIdx} className="leading-relaxed">
                  {formatInlineText(it)}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <div key={pIdx} className="whitespace-pre-wrap leading-relaxed">
            {formatInlineText(trimmed)}
          </div>
        )
      })}
    </div>
  )
}

const EchoMessageRow = React.memo(function EchoMessageRow({
  message,
  isCopied,
  onCopy,
  isStreaming = false,
  tasks,
  intelligence,
  onOpenTask,
  onSendSuggestion,
}: EchoMessageRowProps) {
  const isUser = message.role === "user"

  // Phân tích và render nội dung phản hồi đa định dạng (Text, Table, Code/Artifact, Action, Follow-up suggestions, Referenced Docs)
  const renderedAssistantContent = useMemo(() => {
    const raw = message.content
    if (!raw) return null

    let workingText = raw

    // 1. Trích xuất khối Action Card nếu có (từ thẻ ```action hoặc :::action)
    let actionData: EchoActionData | null = null
    const actionMatch = workingText.match(/```action\n([\s\S]*?)```/) || workingText.match(/:::action\n([\s\S]*?):::/)
    if (actionMatch) {
      try {
        actionData = JSON.parse(actionMatch[1])
        workingText = workingText.replace(actionMatch[0], "").trim()
      } catch {
        // Fallback parse YAML-like key-value
        const contentStr = actionMatch[1]
        const titleMatch = contentStr.match(/title:\s*(.*)/i)
        const questionMatch = contentStr.match(/question:\s*(.*)|prompt:\s*(.*)/i)
        actionData = {
          title: titleMatch ? titleMatch[1].trim() : "Here is what I would move:",
          items: [
            { icon: "calendar", title: "Lunch With Sarah", action: "books at 12:00 PM." },
            { icon: "calendar", title: "Sync With Maya", action: "moves to 1:30 PM." },
            { icon: "calendar", title: "Strategy Session", action: "moves to Friday, 3:00 PM." },
          ],
          question: questionMatch ? (questionMatch[1] || questionMatch[2]).trim() : "Shall I update your calendar and let them know?",
          approveText: "Approve",
          rejectText: "Not Now",
        }
        workingText = workingText.replace(actionMatch[0], "").trim()
      }
    }

    // 1b. Trích xuất khối Task Update đề xuất cập nhật trạng thái task (từ thẻ ```task_update)
    let taskUpdateData: {
      request_id?: string
      task_name?: string
      current_status?: string
      suggested_phase?: string
      suggested_status?: string
      suggested_progress?: number
      note?: string
      action_type?: string
    } | null = null
    const taskUpdateMatch = workingText.match(/```task_update\n([\s\S]*?)```/)
    if (taskUpdateMatch) {
      try {
        taskUpdateData = JSON.parse(taskUpdateMatch[1])
        workingText = workingText.replace(taskUpdateMatch[0], "").trim()
      } catch {
        // Bỏ qua nếu JSON parse lỗi
        workingText = workingText.replace(taskUpdateMatch[0], "").trim()
      }
    }

    // 2. Trích xuất khối Follow-up Suggestions nếu có (từ thẻ ```suggestions hoặc :::suggestions)
    let parsedSuggestions: string[] = []
    const sugMatch = workingText.match(/```suggestions\n([\s\S]*?)```/) || workingText.match(/:::suggestions\n([\s\S]*?):::/)
    if (sugMatch) {
      parsedSuggestions = sugMatch[1]
        .split("\n")
        .map((s) => s.trim().replace(/^[-*]\s*/, ""))
        .filter(Boolean)
      workingText = workingText.replace(sugMatch[0], "").trim()
    }

    // 3. Trích xuất Referenced Documents nếu có
    let referencedDocs: ReferencedDoc[] = []
    const sourcesMatch = workingText.match(/```sources\n([\s\S]*?)```/) || workingText.match(/:::sources\n([\s\S]*?):::/)
    if (sourcesMatch) {
      try {
        const parsedSources = JSON.parse(sourcesMatch[1])
        referencedDocs = Array.isArray(parsedSources) ? parsedSources : (parsedSources && typeof parsedSources === "object" ? [parsedSources] : [])
        workingText = workingText.replace(sourcesMatch[0], "").trim()
      } catch {}
    } else if (message.attachedArtifactName) {
      referencedDocs = [
        { name: message.attachedArtifactName, status: "Draft, edited vừa xong" },
      ]
    } else if (workingText.includes("release-notes-3.4.md")) {
      referencedDocs = [
        { name: "release-notes-3.4.md", status: "Draft, edited 14m ago" },
        { name: "release-notes-3.3.md", status: "Published Jul 30" },
      ]
    }

    // 4. Nếu chưa có suggestions và không đang stream, tự động tạo 2 suggestions thông minh theo ngữ cảnh (Screenshot 1)
    if (parsedSuggestions.length === 0 && !isStreaming) {
      if (workingText.toLowerCase().includes("excess over july") || workingText.toLowerCase().includes("seat reductions") || workingText.toLowerCase().includes("retry")) {
        parsedSuggestions = ["Shorten to two lines", "Add the retry window"]
      } else if (workingText.toLowerCase().includes("ekyc") || workingText.toLowerCase().includes("khâu")) {
        parsedSuggestions = ["Rút ngắn còn 2 dòng", "Phân tích chi tiết rủi ro", "Xuất checklist nghiệm thu"]
      } else if (workingText.toLowerCase().includes("po pending") || workingText.toLowerCase().includes("deadline")) {
        parsedSuggestions = ["Đôn đốc PO phụ trách", "Xem bài toán quá hạn 48h"]
      } else if (actionData) {
        parsedSuggestions = ["Kiểm tra lịch trống", "Xem chi tiết người tham gia"]
      }
    }

    // 5. Phân tách các khối Code block và Text block
    const segments: Array<{ type: "text" | "code" | "table"; content: string; lang?: string; fileName?: string }> = []
    const codeBlockRegex = /```([\w\.\-:]+)?\n([\s\S]*?)```/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(workingText)) !== null) {
      const textBefore = workingText.substring(lastIndex, match.index)
      if (textBefore.trim()) {
        segments.push({ type: "text", content: textBefore })
      }

      const rawTag = (match[1] || "").trim()
      let lang = "code"
      let fileName = ""

      if (rawTag.includes(":")) {
        const parts = rawTag.split(":")
        lang = parts[0]
        fileName = parts[1]
      } else if (rawTag.includes(".")) {
        fileName = rawTag
      } else if (rawTag) {
        lang = rawTag
      }

      // Kiểm tra dòng đầu tiên xem có comment fileName không (ví dụ // release-notes-3.4.md)
      const codeBody = match[2]
      const firstLine = codeBody.trim().split("\n")[0] || ""
      if (!fileName && (firstLine.startsWith("//") || firstLine.startsWith("#"))) {
        const potentialFile = firstLine.replace(/^[/#\s]+/, "").trim()
        if (potentialFile.includes(".")) {
          fileName = potentialFile
        }
      }

      segments.push({
        type: "code",
        content: codeBody,
        lang,
        fileName,
      })
      lastIndex = match.index + match[0].length
    }

    const remainingText = workingText.substring(lastIndex)
    if (remainingText.trim()) {
      segments.push({ type: "text", content: remainingText })
    }

    // 6. Trong mỗi segment text, phân tách xem có Markdown Table (|...|) không
    const finalBlocks: Array<{ type: "text" | "code" | "table"; content: string; lang?: string; fileName?: string }> = []
    for (const seg of segments) {
      if (seg.type !== "text") {
        finalBlocks.push(seg)
        continue
      }

      // Regex tìm Markdown Table: ít nhất 2 dòng liên tiếp bắt đầu và kết thúc bằng |
      const tableRegex = /((?:\|[^\n]+\|\r?\n?){2,})/g
      let tLastIdx = 0
      let tMatch: RegExpExecArray | null

      while ((tMatch = tableRegex.exec(seg.content)) !== null) {
        const beforeTable = seg.content.substring(tLastIdx, tMatch.index)
        if (beforeTable.trim()) {
          finalBlocks.push({ type: "text", content: beforeTable })
        }
        finalBlocks.push({ type: "table", content: tMatch[0] })
        tLastIdx = tMatch.index + tMatch[0].length
      }

      const afterTable = seg.content.substring(tLastIdx)
      if (afterTable.trim()) {
        finalBlocks.push({ type: "text", content: afterTable })
      }
    }

    return (
      <div className="space-y-3 text-[13.5px] sm:text-sm text-foreground leading-relaxed">
        {/* Render tất cả các blocks (Text, Table, Code Artifact) */}
        {finalBlocks.map((block, bIdx) => {
          if (block.type === "table") {
            return <EchoMarkdownTable key={bIdx} rawTable={block.content} />
          }
          if (block.type === "code") {
            const rawLang = (block.lang || "").toLowerCase().trim()
            const trimmed = block.content.trim()

            // 1. Interactive Recharts (Cột, Tròn, Đường)
            if (
              rawLang === "chart" ||
              rawLang === "json:chart" ||
              (rawLang === "json" && trimmed.includes('"type"') && trimmed.includes('"data"'))
            ) {
              return (
                <VisualErrorBoundary key={bIdx} fallbackCode={block.content}>
                  <EchoInteractiveChart rawJson={block.content} />
                </VisualErrorBoundary>
              )
            }

            // 2. Interactive Mermaid Flowchart (Sơ đồ luồng)
            if (
              rawLang === "mermaid" ||
              trimmed.startsWith("graph ") ||
              trimmed.startsWith("flowchart ") ||
              trimmed.startsWith("sequenceDiagram")
            ) {
              return (
                <VisualErrorBoundary key={bIdx} fallbackCode={block.content}>
                  <EchoMermaidFlowchart code={block.content} />
                </VisualErrorBoundary>
              )
            }

            return (
              <EchoArtifactBox
                key={bIdx}
                fileName={block.fileName}
                lang={block.lang}
                code={block.content}
                onCopy={(codeText) => onCopy(message.id, codeText)}
                isCopied={isCopied}
              />
            )
          }
          return <RenderMarkdownParagraph key={bIdx} text={block.content} />
        })}

        {/* Khối Action Card nếu có (Screenshot 3) */}
        {actionData && (
          <EchoActionCard
            data={actionData}
            tasks={tasks}
            onOpenTask={onOpenTask}
          />
        )}

        {/* Khối Task Update Card — AI đề xuất cập nhật trạng thái task */}
        {taskUpdateData && taskUpdateData.request_id && (
          <EchoTaskUpdateCard
            data={taskUpdateData}
            tasks={tasks}
            onOpenTask={onOpenTask}
            onSendSuggestion={onSendSuggestion}
          />
        )}

        {/* Khối Referenced Documents nếu có (Screenshot 4) */}
        {referencedDocs.length > 0 && (
          <EchoReferencedDocs docs={referencedDocs} />
        )}

        {/* Khối Follow-up Suggestions ở cuối (Screenshot 1) */}
        {parsedSuggestions.length > 0 && onSendSuggestion && (
          <EchoFollowUpSuggestions
            suggestions={parsedSuggestions}
            onSend={onSendSuggestion}
          />
        )}
      </div>
    )
  }, [message.content, message.id, message.attachedArtifactName, isCopied, onCopy, isStreaming, onSendSuggestion, tasks, onOpenTask, intelligence])

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2.5">
        <div className="space-y-1 max-w-[85%] flex flex-col items-end">
          {message.attachedArtifactName && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <FileText className="size-3" />
              <span>{message.attachedArtifactName}</span>
            </span>
          )}
          <div className="rounded-2xl rounded-br-xs bg-muted/70 text-foreground px-3.5 py-2 text-[13.5px] sm:text-sm leading-relaxed">
            {message.content}
          </div>
        </div>

        {/* User Avatar: Displays the avatar of whoever sent this message */}
        <EchoUserAvatar
          name={message.senderName}
          avatarUrl={message.senderAvatar}
          className="size-8"
        />
      </div>
    )
  }

  // Assistant Message Row
  return (
    <div className="flex items-start gap-3">
      {/* Bot Circular Avatar: Uses ai-default.png */}
      <div className="size-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 mt-0.5 border border-border shadow-2xs bg-background">
        <img
          src={aiDefaultLogo}
          alt="AI MB"
          className="size-6 object-contain"
          onError={(e) => {
            e.currentTarget.src = "/ai-default.png"
          }}
        />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {/* Khối quy trình phân tích & mạch suy nghĩ (AgentActivityTrace của Executive Summary) */}
        {(isStreaming || message.traceData || message.isThinkingComplete || message.processSteps) && (
          <div className="mb-3 rounded-xl border border-neutral-200/80 dark:border-border/70 bg-white/95 dark:bg-card/95 p-3 shadow-2xs overflow-hidden">
            <AgentActivityTrace
              activeTasks={message.traceData?.activeTasks || intelligence?.activeAssignedTasks || tasks || []}
              summaryProjects={message.traceData?.summaryProjects || intelligence?.activeAssignedTasks || tasks || []}
              riskProjects={message.traceData?.riskProjects || intelligence?.overdueTasks || []}
              goLiveTasks={message.traceData?.goLiveTasks || intelligence?.goLiveTasks || []}
              dominantPhaseText={message.traceData?.dominantPhaseText || intelligence?.dominantPhaseText || "khảo sát nghiệp vụ & định nghĩa đầu bài (Define)"}
              todayEvents={intelligence?.todayEvents}
              discussionCount={intelligence?.totalChatCount}
              mode={message.isThinkingComplete || (!isStreaming && Boolean(message.content)) ? "inspector" : "live"}
              isRefreshing={isStreaming && !message.isThinkingComplete}
              collapsible={true}
              defaultOpen={isStreaming || !message.content}
              durationSeconds={message.thinkingDurationSeconds}
              reasoning={message.reasoning || undefined}
              responseSource={message.responseSource}
              finalStepLabel={message.responseSource === "local-fallback" ? "Phản hồi dự phòng cục bộ" : "Kết quả nhận từ mô hình AI"}
              finalStepDesc={message.responseSource === "local-fallback"
                ? "Mô hình trực tuyến không khả dụng; kết quả được tạo từ dữ liệu và quy tắc cục bộ."
                : "Đã nhận phản hồi từ mô hình AI dựa trên ngữ cảnh prompt được cung cấp."}
              onOpenTask={onOpenTask}
            />
          </div>
        )}

        {message.content ? (
          renderedAssistantContent
        ) : (
          !message.reasoning && (
            <div className="flex items-center gap-2 py-1 text-muted-foreground text-xs">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              <span className="italic">Đang chuẩn bị câu trả lời...</span>
            </div>
          )
        )}
      </div>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS: COMPOSER FORM (EXACT MATCH TO TASK DETAIL AI PROMPT BOX)
// ─────────────────────────────────────────────────────────────────────────────

interface EchoComposerFormProps {
  isStreaming: boolean
  onSend: (text: string) => void
  onStop: () => void
  onOpenArtifacts: () => void
  onUploadFile: () => void
  artifacts?: UXArtifact[]
  activeArtifact?: UXArtifact | null
  onClearActiveArtifact?: () => void
  canUploadArtifacts?: boolean
  currentModel: string
  onModelChange: (modelId: string) => void
  aiMode: "auto" | "fast" | "deep"
  onModeChange: (mode: "auto" | "fast" | "deep") => void
}

const AI_MODES: Array<{ id: "auto" | "fast" | "deep"; label: string; desc: string }> = [
  { id: "auto", label: "Auto", desc: "Picks depth per question" },
  { id: "fast", label: "Fast", desc: "Short answers, no browsing" },
  { id: "deep", label: "Deep", desc: "Reads every source first" },
]

const AI_COMMAND_LIST = [
  {
    id: "tiendo",
    name: "tiendo",
    title: "Tiến độ công việc",
    description: "Check các công việc, nhiệm vụ và deadline hiện tại của tôi",
    prompt: "Kiểm tra và tổng hợp toàn bộ các công việc, nhiệm vụ đang giao và deadline hiện tại của tôi",
    icon: <Sparkles className="size-3.5 text-amber-500" />,
    actionType: "prompt" as const,
  },
  {
    id: "chart",
    name: "chart",
    title: "Vẽ biểu đồ",
    description: "Vẽ biểu đồ (cột, tròn, thanh tiến độ...) cho bất cứ thông tin gì bạn yêu cầu",
    prompt: "Vẽ biểu đồ trực quan (dạng Mermaid / bảng số liệu) cho thông tin sau: ",
    icon: <BarChart3 className="size-3.5 text-blue-600" />,
    actionType: "input" as const,
  },
  {
    id: "flow",
    name: "flow",
    title: "Xây dựng luồng",
    description: "Vẽ sơ đồ luồng (Flowchart dạng Mermaid) theo bất cứ thông tin gì bạn yêu cầu",
    prompt: "Xây dựng sơ đồ luồng (Flowchart dạng Mermaid) chi tiết theo yêu cầu: ",
    icon: <GitBranch className="size-3.5 text-emerald-600" />,
    actionType: "input" as const,
  },
  {
    id: "doc",
    name: "doc",
    title: "Tra cứu & Tư vấn tài liệu",
    description: "Tư vấn theo câu hỏi bằng cách đọc toàn bộ tài liệu trong kho Artifacts",
    prompt: "Đọc toàn bộ tài liệu trong kho Artifacts và tư vấn chi tiết cho tôi về: ",
    icon: <BookOpen className="size-3.5 text-indigo-600" />,
    actionType: "input" as const,
  },
  {
    id: "artifacts",
    name: "",
    title: "Thêm tệp Thư viện",
    description: "Duyệt và tìm kiếm các tệp của bạn trong kho Artifacts",
    prompt: "",
    icon: <FolderOpen className="size-3.5 text-slate-500" />,
    actionType: "artifacts" as const,
  },
  {
    id: "upload",
    name: "",
    title: "Tải lên tài liệu",
    description: "Kéo thả hoặc tải lên ảnh thiết kế, tệp đặc tả (.md, .pdf, .json)",
    prompt: "",
    icon: <Upload className="size-3.5 text-cyan-600" />,
    actionType: "upload" as const,
  },
]

const EchoComposerForm = React.memo(function EchoComposerForm({
  isStreaming,
  onSend,
  onStop,
  onOpenArtifacts,
  onUploadFile,
  artifacts = [],
  activeArtifact = null,
  onClearActiveArtifact,
  canUploadArtifacts = true,
  currentModel,
  onModelChange,
  aiMode,
  onModeChange,
}: EchoComposerFormProps) {
  const [text, setText] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)

  const currentModelObj = useMemo(() => {
    return POPULAR_AI_MODELS.find((m) => m.id === currentModel) || POPULAR_AI_MODELS[0]
  }, [currentModel])

  const activeModeObj = useMemo(() => {
    return AI_MODES.find((m) => m.id === aiMode) || AI_MODES[0]
  }, [aiMode])

  // Close model menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false)
      }
    }
    if (showModelMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showModelMenu])

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [text])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setText("")
    setShowCommands(false)
    setShowMentions(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    if (val === "/" || val.endsWith(" /")) {
      setShowCommands(true)
      setShowMentions(false)
      setSelectedIndex(0)
    } else if (val === "@" || val.endsWith(" @")) {
      setShowMentions(true)
      setShowCommands(false)
      setSelectedIndex(0)
    } else if (!val.includes("/") && !val.includes("@")) {
      setShowCommands(false)
      setShowMentions(false)
    }
  }

  const handleSelectCommand = useCallback((cmd: typeof AI_COMMAND_LIST[0]) => {
    if (cmd.prompt) {
      onSend(cmd.prompt)
    }
    setText("")
    setShowCommands(false)
  }, [onSend])

  const handleSelectCommandItem = useCallback((item: typeof AI_COMMAND_LIST[0]) => {
    if (item.actionType === "artifacts") {
      onOpenArtifacts?.()
      setShowCommands(false)
      setText("")
    } else if (item.actionType === "upload") {
      if (!canUploadArtifacts) {
        toast.error("Vai trò của bạn chưa được cấp quyền tải tài liệu lên kho Artifacts.")
        setShowCommands(false)
        setText("")
        return
      }
      onUploadFile?.()
      setShowCommands(false)
      setText("")
    } else if (item.actionType === "input") {
      setText(`/${item.name} `)
      setShowCommands(false)
      textareaRef.current?.focus()
    } else {
      handleSelectCommand(item)
    }
  }, [onOpenArtifacts, onUploadFile, handleSelectCommand, canUploadArtifacts])

  const handleSelectArtifact = (art: UXArtifact) => {
    const newText = text.replace(/@[^@\s]*$/, `@${art.name} `)
    setText(newText)
    setShowMentions(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="relative">
      {/* 1. Slash Command Suggestions Popup (Clean White & Compact ReUI Style) */}
      <AnimatePresence>
        {showCommands && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute bottom-full left-0 right-0 mb-2 w-full bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 overflow-hidden z-50 p-2 select-none"
          >
            <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
              <span>Lệnh & Thao tác nhanh</span>
              <button
                type="button"
                onClick={() => setShowCommands(false)}
                className="text-slate-400 hover:text-slate-700 text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
              >
                Đóng ✕
              </button>
            </div>
            <div className="max-h-[260px] overflow-y-auto px-0.5 space-y-0.5">
              {AI_COMMAND_LIST.map((item, idx) => {
                const isSelected = selectedIndex === idx
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectCommandItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="size-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      {item.name ? (
                        <span className="font-mono text-[11px] text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded font-semibold shrink-0">
                          /{item.name}
                        </span>
                      ) : null}
                      <span className="text-xs font-medium text-slate-800 shrink-0">
                        {item.title}
                      </span>
                      {item.actionType === "upload" && !canUploadArtifacts && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium shrink-0">
                          <Lock className="size-2.5" /> Chỉ đọc
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-normal truncate">
                        {item.description}
                      </span>
                    </div>
                    <kbd className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-slate-400 px-1 py-0.5 rounded bg-slate-50 border border-slate-200 shrink-0">
                      ↵
                    </kbd>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Artifact Mention Popup (@) (ReUI Monochrome Style) */}
      <AnimatePresence>
        {showMentions && artifacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-0 mb-2 w-full sm:w-[380px] bg-white rounded-xl border border-slate-200/90 shadow-lg shadow-slate-900/10 overflow-hidden z-50 p-1.5 select-none"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 flex items-center justify-between border-b border-slate-100 mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <AtSign className="size-3.5 text-slate-400" />
                Nhắc tài liệu tham chiếu
              </span>
              <button
                type="button"
                onClick={() => setShowMentions(false)}
                className="text-slate-400 hover:text-slate-700 text-[10px] cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {artifacts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => handleSelectArtifact(art)}
                  className="group w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <FileText className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-foreground truncate block">
                      @{art.name}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground truncate block">
                      {art.summary || art.size}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Model & Mode Popover Menu (Matching Image 1) */}
      <AnimatePresence>
        {showModelMenu && (
          <motion.div
            ref={modelMenuRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 p-2 z-50 select-none max-h-[380px] overflow-y-auto"
          >
            {/* Model Section */}
            <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
              Model
            </div>
            <div className="space-y-0.5 max-h-52 overflow-y-auto pr-0.5">
              {POPULAR_AI_MODELS.map((m) => {
                const isSelected = m.id === currentModel
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onModelChange(m.id)
                      setShowModelMenu(false)
                    }}
                    className={cn(
                      "group w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer",
                      isSelected ? "bg-slate-50 text-slate-900" : "hover:bg-slate-50/80 text-slate-700"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-semibold truncate", isSelected ? "text-slate-900" : "text-slate-800")}>
                          {m.name}
                        </span>
                        {m.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                        {m.provider} • {m.contextLength ? `${m.contextLength} context` : "200K context"}
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 text-slate-900 shrink-0 stroke-[2.2]" />}
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-slate-100 my-1.5 mx-1" />

            {/* Mode Section */}
            <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
              Mode
            </div>
            <div className="space-y-0.5">
              {AI_MODES.map((mode) => {
                const isSelected = (aiMode || "auto") === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onModeChange(mode.id)
                      setShowModelMenu(false)
                    }}
                    className={cn(
                      "group w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer",
                      isSelected ? "bg-slate-50 text-slate-900" : "hover:bg-slate-50/80 text-slate-700"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className={cn("text-xs font-semibold block", isSelected ? "text-slate-900" : "text-slate-800")}>
                        {mode.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                        {mode.desc}
                      </span>
                    </div>
                    {isSelected && <Check className="size-4 text-slate-900 shrink-0 stroke-[2.2]" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main JolyUI Interactive Container: Exact Match to Task Detail */}
      <div 
        onClick={() => textareaRef.current?.focus()}
        className="relative rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xs transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/80 cursor-text"
      >
        {/* Active Document Context Chip when an artifact is open */}
        {activeArtifact && (
          <div className="flex items-center justify-between px-2.5 py-1 mb-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold truncate">Hỏi trực tiếp về tài liệu: {activeArtifact.name}</span>
            </div>
            {onClearActiveArtifact && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearActiveArtifact()
                }}
                className="size-4 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-900/50 flex items-center justify-center text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer"
                title="Bỏ gắn ngữ cảnh tài liệu"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* Dynamic Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (showCommands) {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % AI_COMMAND_LIST.length)
                return
              }
              if (e.key === "ArrowUp") {
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + AI_COMMAND_LIST.length) % AI_COMMAND_LIST.length)
                return
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                const selected = AI_COMMAND_LIST[selectedIndex]
                if (selected) {
                  handleSelectCommandItem(selected)
                }
                return
              }
              if (e.key === "Escape") {
                e.preventDefault()
                setShowCommands(false)
                return
              }
            }

            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            } else if (e.key === "Escape") {
              setShowCommands(false)
              setShowMentions(false)
            }
          }}
          rows={1}
          disabled={isStreaming}
          placeholder={activeArtifact ? `Hỏi AI bất kỳ điều gì về ${activeArtifact.name}...` : "Nhập nội dung trao đổi... (Gõ / để gọi lệnh, @ để nhắc tên)"}
          className="flex min-h-[46px] max-h-52 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none leading-relaxed"
        />

        {/* Actions Toolbar: Exact Match to Image 1 */}
        <div className="flex items-center justify-between gap-2 p-0 pt-1.5 border-t border-slate-100/80 select-none">
          {/* Left Action Buttons: + Button, Model • Mode Button, Sparkles Button */}
          <div className="flex items-center gap-1 select-none relative">
            {/* 1. Plus Button (+) */}
            <button
              type="button"
              onClick={onUploadFile}
              className="size-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Thêm tệp hoặc ảnh thiết kế (.md, .pdf, .json, ảnh...)"
            >
              <Plus className="size-4 stroke-[2.2]" />
            </button>

            {/* 2. Model & Mode Trigger Button (Image 1: Claude Sonnet 5 • Auto ∨) */}
            <button
              type="button"
              onClick={() => setShowModelMenu((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer border",
                showModelMenu
                  ? "bg-slate-100 border-slate-300 text-slate-900 font-semibold"
                  : "bg-transparent border-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900"
              )}
              title="Chọn mô hình AI và chế độ suy luận"
            >
              <span className="truncate max-w-[130px] sm:max-w-[200px]">
                {currentModelObj?.name || currentModel}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 capitalize">{activeModeObj?.label || "Auto"}</span>
              <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", showModelMenu && "rotate-180")} />
            </button>

            {/* 3. Sparkles Helper Button (✨) */}
            <button
              type="button"
              onClick={() => setShowCommands((v) => !v)}
              className={cn(
                "size-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0",
                showCommands
                  ? "text-purple-600 bg-purple-50"
                  : "text-slate-500 hover:text-purple-600 hover:bg-slate-100"
              )}
              title="Lệnh nhanh & Công cụ AI (/)"
            >
              <Sparkles className="size-3.5" />
            </button>

            {/* 4. Artifacts Library Button */}
            <button
              type="button"
              onClick={onOpenArtifacts}
              className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80 transition-colors cursor-pointer shrink-0"
              title="Mở thư viện tài liệu Artifacts"
            >
              <FolderOpen className="size-3.5" />
            </button>
          </div>

          {/* Right Action: Instructions Hint & Send Button */}
          <div className="flex items-center gap-3">
            {/* Keyboard Shortcuts Hint */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 select-none">
              <span className="inline-flex items-center gap-1">
                <kbd className="bg-slate-100 text-slate-600 border border-slate-200/90 shadow-2xs font-sans text-[11px] leading-none px-1.5 py-0.5 rounded">↵</kbd>
                <span className="text-[10px] text-slate-400">gửi</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="bg-slate-100 text-slate-600 border border-slate-200/90 shadow-2xs font-sans text-[10px] leading-none px-1.5 py-0.5 rounded">Shift</kbd>
                <span className="text-slate-400 text-[10px]">+</span>
                <kbd className="bg-slate-100 text-slate-600 border border-slate-200/90 shadow-2xs font-sans text-[11px] leading-none px-1.5 py-0.5 rounded">↵</kbd>
                <span className="text-[10px] text-slate-400">xuống dòng</span>
              </span>
            </div>

            {/* Send / Stop Button */}
            {isStreaming ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onStop}
                className="h-8 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
              >
                Dừng
              </Button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim()}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  text.trim()
                    ? "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xs"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
                title="Gửi trao đổi"
              >
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
