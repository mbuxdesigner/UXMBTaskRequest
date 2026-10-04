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
  Image as ImageIcon,
} from "lucide-react"
import { EchoInteractiveChart, EchoMermaidFlowchart } from "@/components/common/EchoChartsAndFlowcharts"
import { DropdownMenu } from "@/components/reui/dropdown-menu"
import { IconStackLarge } from "@/components/reui/c-icon-stack-2"
import { EchoArtifactSplitViewer } from "@/components/chat/EchoArtifactSplitViewer"
import { EchoAssistantActionBar } from "@/components/chat/EchoAssistantActionBar"
import { EchoUserMessageBubble } from "@/components/chat/EchoUserMessageBubble"
import { EchoErrorCard } from "@/components/chat/EchoErrorCard"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  buildTaskRetrievalQuery,
  createConversationMemory,
  groundAIResponse,
  isAggregateTaskQuery,
  resolveTaskReference,
  type AIConversationMemory,
} from "@/lib/aiConversation"
import {
  springs,
  durations,
  easings,
  tactileProps,
  cascadeWaveContainerVariants,
  cascadeWaveItemVariants,
  staggerContainerVariants,
  staggerItemVariants,
  dataContinuityTransition,
  originPopoverVariants,
  dialogOverlayVariants,
  dialogContentVariants,
} from "@/lib/motion"
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
  loadedDocNames?: string[]
  resolvedTaskId?: string
  retrievalSummary?: string
  confidence?: number
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
  attachedImageUrl?: string
  attachedImageName?: string
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
  isError?: boolean
  errorDetail?: any
  grounding?: {
    taskIds: string[]
    documentNames: string[]
    confidence: number
    rejectedReferences?: string[]
  }
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
  conversationMemory?: AIConversationMemory
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

// 4 nhóm gợi ý câu hỏi khởi đầu chuẩn MBBank UX Designer cho Empty State
export type EmptyCategoryType = "seven_steps" | "handoff" | "sla_po" | "microcopy"

export const EMPTY_STATE_CATEGORIES = [
  {
    id: "seven_steps" as const,
    label: "7 Khâu UX MBBank",
    icon: Sparkles,
    description: "Khảo sát, IA, Wireframe, Usability",
    prompts: [
      "Quy trình 7 khâu UX MBBank gồm những bước nào và tiêu chí nghiệm thu từng khâu?",
      "Tạo checklist kiểm định Khâu 4 (IA & Wireframe) trước khi gửi PO /sentopo",
      "Kế hoạch nghiên cứu người dùng và Usability Testing Khâu 6 đạt mục tiêu >85% task completion",
    ],
  },
  {
    id: "handoff" as const,
    label: "Tiêu chuẩn Handoff",
    icon: BookOpen,
    description: "Token specs, Redlines, Dev notes",
    prompts: [
      "Tiêu chuẩn tổ chức file Figma Ready for Dev: Token specs, Redlines và Dev notes",
      "Tra cứu thông số Tokens ReUI v3: Mã màu Primary Navy, bo góc 12px và 4px/8px Grid",
      "Quy chuẩn thiết kế 4 trạng thái bắt buộc: Default, Loading shimmer, Error và Empty state",
    ],
  },
  {
    id: "sla_po" as const,
    label: "SLA & PO Alignment",
    icon: Clock,
    description: "24h SLA, bài toán tồn đọng PO Pending",
    prompts: [
      "Rà soát các bài toán đang bị PO Pending quá 24h cần đôn đốc phản hồi",
      "Báo cáo tiến độ các bài toán được giao của tôi và cảnh báo nguy cơ trễ SLA",
      "Soạn nội dung nhắc nhở Product Owner phê duyệt phương án thiết kế Wireframe",
    ],
  },
  {
    id: "microcopy" as const,
    label: "Microcopy Ngân Hàng",
    icon: Activity,
    description: "Thông báo lỗi, OTP, Chuyển tiền",
    prompts: [
      "Gợi ý 3 phương án microcopy cho thông báo lỗi giao dịch chuyển tiền ngoài 24/7",
      "Viết nội dung tin nhắn xác thực Smart OTP và hướng dẫn bảo mật giao dịch",
      "Microcopy hướng dẫn người dùng quét khuôn mặt NFC trong luồng mở tài khoản eKYC",
    ],
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
  const [hoveredSidebarTab, setHoveredSidebarTab] = useState<"chats" | "artifacts" | null>(null)
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
  const [emptyCategory, setEmptyCategory] = useState<EmptyCategoryType>("seven_steps")

  const currentCategoryObj = useMemo(() => {
    return EMPTY_STATE_CATEGORIES.find((c) => c.id === emptyCategory) || EMPTY_STATE_CATEGORIES[0]
  }, [emptyCategory])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Unmount cleanup hook: prevent fetch stream memory leak
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // Abort active stream on thread switch and switch thread safely
  const handleSelectThread = useCallback((threadId: string) => {
    if (isStreaming) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      setIsStreaming(false)
    }
    setActiveThreadId(threadId)
    localStorage.setItem(STORAGE_ACTIVE_THREAD_ID, threadId)
  }, [isStreaming])

  // Display Recent Chats for Empty State (uses real recent chats only)
  const displayRecentChats = useMemo(() => {
    const actualThreads = threads.filter(
      (t) => t.id !== "draft" && Array.isArray(t.messages) && t.messages.length > 0 && !isEchoTestDemoThread(t)
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
          handleSelectThread(t.id)
        },
      }))
    }
    return []
  }, [threads, handleSelectThread])

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

  const handleMessageFeedback = useCallback((msgId: string, feedback: "up" | "down") => {
    setThreads((prev) =>
      prev.map((thread) => ({
        ...thread,
        messages: thread.messages.map((message) =>
          message.id === msgId
            ? { ...message, feedback: message.feedback === feedback ? undefined : feedback }
            : message
        ),
      }))
    )
    toast.success(feedback === "up" ? "Đã ghi nhận phản hồi hữu ích." : "Đã ghi nhận để cải thiện câu trả lời.")
  }, [])

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
          // Tạo data URL cục bộ tức thì để hiển thị mượt mà không phụ thuộc cookie Google Drive
          let localDataUrl = ""
          try {
            if (file.size < 4 * 1024 * 1024) {
              localDataUrl = await new Promise<string>((resolve) => {
                const r = new FileReader()
                r.onload = (e) => resolve((e.target?.result as string) || "")
                r.onerror = () => resolve("")
                r.readAsDataURL(file)
              })
            }
          } catch {}

          const imageEmbedUrl = localDataUrl || driveThumbnailUrl || driveUrl

          const driveLinksMd = driveUrl
            ? `\n\n[🔗 Mở xem trên Google Drive](${driveUrl}) · [📥 Tải file gốc](${driveDownloadUrl || driveUrl})\n\n`
            : "\n\n"

          const newArt = addArtifact({
            name: fileName,
            fileType: "image",
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
  const handleSendMessage = async (
    text: string,
    customContext?: string,
    attachedDocName?: string,
    historyOverride?: PromptMessage[],
    attachedImage?: { file: File; dataUrl: string; name: string; size: string }
  ) => {
    const cleanText = text.trim()
    if (!cleanText || isStreaming) return

    const isDocCommand = /^\/doc(?:\s|$)|^\/tracuu(?:\s|$)/i.test(cleanText)
    const isChartCommand = /^\/(?:chart|bieudo)(?:\s|$)/i.test(cleanText)
    const isFlowCommand = /^\/(?:flow|sodo)(?:\s|$)/i.test(cleanText)
    const isTiendoCommand = /^\/tiendo(?:\s|$)/i.test(cleanText)
    const questionIntent = detectUserIntent(cleanText)
    const baseUsesTaskContext = isTiendoCommand || isChartCommand || questionIntent.isTask || questionIntent.isTaskUpdate || questionIntent.isActionCard

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

    // Xử lý lưu vết ảnh đính kèm từ clipboard / paste
    if (attachedImage) {
      try {
        const newArt = addArtifact({
          name: attachedImage.name,
          fileType: "image",
          size: attachedImage.size,
          content: `# ${attachedImage.name}\n\n![${attachedImage.name}](${attachedImage.dataUrl})\n\n*Ảnh chụp màn hình do ${senderName} dán trực tiếp vào đoạn chat.*`,
          summary: `Ảnh màn hình dán từ clipboard: ${attachedImage.name}`,
          tags: ["Ảnh", "Clipboard", "Chat"],
          isCustomUploaded: true,
          uploadedBy: senderName,
        })

        // Tải lên Google Drive nền nếu có kết nối
        uploadFileToDrive(attachedImage.file, "UX_AI_Artifacts").then((res) => {
          if (res.fileUrl || res.thumbnailUrl) {
            updateArtifact(newArt.id, {
              driveUrl: res.fileUrl,
              driveThumbnailUrl: res.thumbnailUrl,
              driveDownloadUrl: res.downloadUrl,
              driveFileId: res.fileId,
            })
          }
        }).catch(() => {})
      } catch {}

      if (!customContext) {
        customContext = `=== ẢNH THIẾT KẾ ĐƯỢC NGƯỜI DÙNG DÁN TRỰC TIẾP VÀO ĐOẠN CHAT: "${attachedImage.name}" ===\n![${attachedImage.name}](${attachedImage.dataUrl})\nNgười dùng đang thảo luận về hình ảnh thiết kế / màn hình giao diện này. Hãy phân tích cấu trúc màn hình, các thành phần UI, luồng trải nghiệm, thông tin hiển thị hoặc các tiêu chuẩn thiết kế liên quan theo câu hỏi của người dùng.`
      }
      if (!attachedDocName) {
        attachedDocName = attachedImage.name
      }
    }

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      attachedArtifactName: attachedDocName || attachedImage?.name,
      attachedImageUrl: attachedImage?.dataUrl,
      attachedImageName: attachedImage?.name,
      senderName,
      senderAvatar,
      senderEmail,
    }

    const previousThread = threads.find((thread) => thread.id === activeThreadId)
    const previousMemory = previousThread?.conversationMemory
    const taskResolution = resolveTaskReference(
      cleanText,
      tasks,
      previousMemory?.activeTaskId,
      previousMemory?.pendingTaskIds
    )
    const resolvedTask = taskResolution.task
    const usesTaskContext = baseUsesTaskContext || Boolean(resolvedTask && taskResolution.isFollowUp)
    const aggregateTaskQuery = isTiendoCommand || isChartCommand || isAggregateTaskQuery(cleanText)
    const focusedTasks = aggregateTaskQuery
      ? tasks
      : resolvedTask
      ? [resolvedTask]
      : taskResolution.candidates.length > 0
      ? taskResolution.candidates
      : usesTaskContext
      ? tasks
      : []

    const activeAssigned = focusedTasks.length > 0 ? focusedTasks : (intelligence?.activeAssignedTasks || tasks)
    const summaryProjs = intelligence?.activeAssignedTasks || (intelligence?.delegatedTasks?.map((d) => d.task) || tasks)
    const riskProjs = intelligence?.overdueTasks || []
    const goLive = intelligence?.goLiveTasks || []
    const dominantPhase = intelligence?.dominantPhaseText || "khảo sát nghiệp vụ & định nghĩa đầu bài (Define)"

    const allArtifacts = getStoredArtifacts()
    let loadedDocNames: string[] = []
    let activeArtifactIds: string[] = previousMemory?.activeArtifactIds || []
    if (attachedDocName) {
      loadedDocNames = [attachedDocName]
      activeArtifactIds = allArtifacts
        .filter((artifact) => artifact.name.toLowerCase() === attachedDocName.toLowerCase())
        .map((artifact) => artifact.id)
    } else {
      const shouldSearchDocs = isDocCommand || questionIntent.isDoc || questionIntent.isProductSpec || (!usesTaskContext && Boolean(cleanText))
      const retrievalQuery = buildTaskRetrievalQuery(cleanText, resolvedTask)
      const matchedDocs = shouldSearchDocs || Boolean(resolvedTask)
        ? searchArtifactsByQuery(retrievalQuery, allArtifacts)
        : []
      loadedDocNames = matchedDocs.map((d) => d.name)
      if (matchedDocs.length > 0) activeArtifactIds = matchedDocs.map((document) => document.id)
    }

    const intentLabel = questionIntent.isTaskUpdate
      ? "task_update"
      : questionIntent.isTask || resolvedTask
      ? "task_analysis"
      : questionIntent.isDoc || questionIntent.isProductSpec
      ? "document_query"
      : questionIntent.isCalendar
      ? "calendar_query"
      : "general"
    const conversationMemory = createConversationMemory({
      previous: previousMemory,
      activeTask: resolvedTask,
      activeArtifactIds,
      pendingTaskIds: taskResolution.method === "ambiguous"
        ? taskResolution.candidates.map((task) => task.request_id)
        : [],
      intent: intentLabel,
      userQuery: cleanText,
    })
    const clarificationText = taskResolution.method === "ambiguous"
      ? `Mình tìm thấy nhiều bài toán phù hợp:\n\n${taskResolution.candidates
          .map((task, index) => `${index + 1}. **[${task.request_id}]** ${task.nickname || task.title}`)
          .join("\n")}\n\nBạn muốn mình phân tích bài toán nào?`
      : ""
    if (clarificationText) conversationMemory.activeTaskId = undefined

    const traceData: ChatTraceData = {
      activeTasks: usesTaskContext ? activeAssigned : [],
      summaryProjects: usesTaskContext ? (focusedTasks.length > 0 ? focusedTasks : summaryProjs) : [],
      riskProjects: usesTaskContext ? riskProjs : [],
      goLiveTasks: usesTaskContext ? goLive : [],
      dominantPhaseText: dominantPhase,
      loadedDocNames: loadedDocNames.length > 0 ? loadedDocNames : undefined,
      resolvedTaskId: resolvedTask?.request_id,
      retrievalSummary: resolvedTask
        ? `Đã định danh bài toán ${resolvedTask.request_id} và nạp dữ liệu chi tiết.`
        : taskResolution.method === "ambiguous"
        ? `Tìm thấy ${taskResolution.candidates.length} bài toán có thể phù hợp; cần người dùng xác nhận.`
        : usesTaskContext
        ? `Đã nạp ${focusedTasks.length || tasks.length} bài toán trong phạm vi được phép.`
        : loadedDocNames.length > 0
        ? `Đã nạp ${loadedDocNames.length} tài liệu liên quan.`
        : "Không cần nạp dữ liệu công việc cho câu hỏi này.",
      confidence: taskResolution.confidence,
    }

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: clarificationText,
      timestamp: new Date().toISOString(),
      modelUsed: currentModel,
      reasoning: "",
      isThinkingComplete: Boolean(clarificationText),
      traceData,
      grounding: clarificationText
        ? {
            taskIds: taskResolution.candidates.map((task) => task.request_id),
            documentNames: [],
            confidence: 0.5,
          }
        : undefined,
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
        conversationMemory,
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
              conversationMemory,
              messages: [...(t.messages || []), userMsg, assistantMsg],
            }
          }
          return t
        })
      )
    }

    setTimeout(() => scrollToBottom(true), 50)
    if (clarificationText) return
    setIsStreaming(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const initialSteps: ChatProcessStep[] = [
      {
        id: "step-1",
        label: resolvedTask
          ? `Đã xác định bài toán ${resolvedTask.request_id}`
          : taskResolution.method === "ambiguous"
          ? `Phát hiện ${taskResolution.candidates.length} bài toán cần xác nhận`
          : "Đã phân tích yêu cầu và phạm vi dữ liệu",
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      {
        id: "step-2",
        label: `Đã nạp ${focusedTasks.length} bài toán và ${loadedDocNames.length} tài liệu liên quan`,
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      { id: "step-3", label: "Suy luận phương án & tổng hợp đề xuất", status: "pending" },
      { id: "step-4", label: "Sinh phản hồi hoàn chỉnh", status: "pending" },
    ]
    initialSteps[2] = { ...initialSteps[2], status: "running", timestamp: new Date().toISOString() }
    let currentSteps = [...initialSteps]

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

    // Các bước 1–2 phản ánh thao tác resolver/retrieval đã thực sự hoàn thành ở trên.
    // Không dùng timer mô phỏng tiến trình.
    const timerStep1: number | undefined = undefined
    const timerStep2: number | undefined = undefined

    try {
      const currentThread = threads.find((t) => t.id === targetThreadId)
      const baseHistory: PromptMessage[] = historyOverride ?? (currentThread?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const history: PromptMessage[] = [...baseHistory, { role: "user", content: text }]

      // Enhanced context building: Luôn kết hợp Tasks + Artifacts + Intelligence
      let contextStr = ""
      const retrievalQuery = buildTaskRetrievalQuery(cleanText, resolvedTask)

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
          userQuery: retrievalQuery,
        }) + `\n\n${docsSummary}\n\n` +
          `YÊU CẦU ĐẶC BIỆT:\n` +
          `Người dùng đang tra cứu và cần tư vấn dựa trên kho tài liệu nội bộ.\n` +
          `Câu hỏi/Yêu cầu của người dùng: "${query || cleanText}".\n` +
          `Hãy đọc toàn bộ tài liệu liên quan trên, tổng hợp thông tin, viện dẫn đúng tài liệu và tư vấn giải pháp chuẩn xác cho người dùng. LUÔN trích dẫn tên tài liệu nguồn.`
      } else if (isChartCommand) {
        const chartTopic = cleanText.replace(/^(\/chart|\/bieudo)\s*/i, "").trim()
        contextStr = buildEnrichedContext({
          intelligence,
          tasks: focusedTasks.length > 0 ? focusedTasks : tasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: retrievalQuery,
        }) +
          `\n\n=== CHỈ DẪN VẼ BIỂU ĐỒ TRỰC QUAN ===\n` +
          `Người dùng yêu cầu vẽ biểu đồ số liệu cho nội dung: "${chartTopic || "Số liệu công việc và tiến độ"}".\n` +
          `Hãy vẽ biểu đồ số liệu trực quan DỰA TRÊN DỮ LIỆU THẬT TỪ CONTEXT: sử dụng bảng tổng hợp số liệu hoặc cú pháp biểu đồ \`\`\`chart.`
      } else if (isFlowCommand) {
        const flowTopic = cleanText.replace(/^(\/flow|\/sodo)\s*/i, "").trim()
        contextStr = buildEnrichedContext({
          intelligence,
          tasks: focusedTasks.length > 0 ? focusedTasks : tasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: retrievalQuery,
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
          userQuery: retrievalQuery,
        }) +
          `\n\nYÊU CẦU: Tổng hợp báo cáo tiến độ các bài toán của người dùng, phát hiện rủi ro và đề xuất hành động cụ thể. Nếu có task cần cập nhật, hãy đề xuất qua khối \`\`\`task_update.`
      } else if (customContext) {
        // Custom context (ví dụ: chat với artifact cụ thể được chọn/đính kèm)
        contextStr = buildEnrichedContext({
          intelligence,
          tasks: focusedTasks,
          artifacts: [], // Không nạp allArtifacts để tránh nhồi các tài liệu khác!
          userName,
          userRole: session?.role,
          userQuery: retrievalQuery,
        }) + `\n\n${customContext}\n\n=== CHỈ DẪN TRẢ LỜI ===\nHãy đọc kỹ tài liệu đính kèm ở trên và trả lời đầy đủ, trực tiếp câu hỏi của người dùng. Trích xuất chính xác nguyên văn các nguyên tắc, điều khoản hoặc quy định được hỏi. Trả lời chi tiết, có cấu trúc rõ ràng.`
      } else {
        // Default: Luôn gửi enriched context (tasks + artifacts summary)
        contextStr = buildEnrichedContext({
          intelligence,
          tasks: focusedTasks.length > 0 ? focusedTasks : tasks,
          artifacts: allArtifacts,
          userName,
          userRole: session?.role,
          userQuery: retrievalQuery,
        })
      }

      if (taskResolution.method === "ambiguous" && taskResolution.candidates.length > 0) {
        const candidateList = taskResolution.candidates
          .map((task) => `- [${task.request_id}] ${task.nickname || task.title}`)
          .join("\n")
        contextStr += `\n\n=== TASK_REFERENCE_AMBIGUOUS ===\n${candidateList}\nKhông phân tích hoặc đề xuất cập nhật cho đến khi người dùng xác nhận đúng một bài toán. Chỉ hỏi lại một câu ngắn.\n=== END_TASK_REFERENCE_AMBIGUOUS ===`
      }

      const promptMessages = buildChatPrompt(contextStr, history)

      let accumulated = ""
      let lastRenderTime = 0

      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timerStep1)
          clearTimeout(timerStep2)
          reject(new DOMException("Aborted", "AbortError"))
        }

        if (abortController.signal.aborted) {
          onAbort()
          return
        }

        abortController.signal.addEventListener("abort", onAbort, { once: true })

        streamAICompletion(
          promptMessages,
          {
            onReasoningChunk: () => {
              if (abortController.signal.aborted) return
              if (currentSteps[2].status !== "running") {
                currentSteps = [
                  { ...currentSteps[0], status: "completed" },
                  { ...currentSteps[1], status: "completed" },
                  { ...currentSteps[2], status: "running" },
                  currentSteps[3],
                ]
              }
              updateAssistantMsg({
                reasoning: traceData.retrievalSummary,
                processSteps: currentSteps,
              })
              messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
            },
            onChunk: (token, cleanOutput) => {
              if (abortController.signal.aborted) return
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
                  reasoning: traceData.retrievalSummary,
                  processSteps: currentSteps,
                })
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
              }
            },
            onComplete: (fullText, _fullReasoning, responseMeta) => {
              abortController.signal.removeEventListener("abort", onAbort)
              clearTimeout(timerStep1)
              clearTimeout(timerStep2)
              accumulated = fullText || accumulated
              const durationSeconds = Number(Math.max(1, (Date.now() - startTime) / 1000).toFixed(1))
              currentSteps = currentSteps.map((s) => ({ ...s, status: "completed" }))

              const syntheticReasoning = responseMeta?.source === "local-fallback"
                ? "Mô hình trực tuyến không khả dụng; ứng dụng đã xử lý yêu cầu bằng dữ liệu và quy tắc cục bộ."
                : traceData.retrievalSummary || "Đã nhận phản hồi từ mô hình AI theo ngữ cảnh được cung cấp."

              // Chỉ hiển thị trace truy xuất có thể kiểm chứng; không lưu hoặc hiển thị chain-of-thought thô của model.
              const finalReasoning = syntheticReasoning

              const grounded = groundAIResponse(accumulated, {
                taskIds: focusedTasks.map((task) => task.request_id).filter(Boolean),
                documentNames: loadedDocNames,
              })

              updateAssistantMsg({
                content: grounded.content,
                reasoning: finalReasoning,
                processSteps: currentSteps,
                isThinkingComplete: true,
                thinkingDurationSeconds: durationSeconds,
                responseSource: responseMeta?.source || "remote",
                responseModel: responseMeta?.model,
                responseProviderError: responseMeta?.providerError,
                grounding: {
                  taskIds: focusedTasks.map((task) => task.request_id).filter(Boolean),
                  documentNames: loadedDocNames,
                  confidence: resolvedTask ? taskResolution.confidence : (taskResolution.method === "ambiguous" ? 0.5 : 0.75),
                  rejectedReferences: grounded.unknownTaskReferences,
                },
              })
              resolve()
            },
            onError: (err) => {
              abortController.signal.removeEventListener("abort", onAbort)
              clearTimeout(timerStep1)
              clearTimeout(timerStep2)
              reject(err)
            },
          },
          {
            model: currentModel,
            signal: abortController.signal,
            temperature: usesTaskContext || questionIntent.isDoc || questionIntent.isProductSpec
              ? 0.25
              : aiMode === "fast"
              ? 0.3
              : 0.55,
            max_tokens: aiMode === "fast" ? 1200 : aiMode === "deep" ? 3200 : 2200,
          }
        ).catch((err) => {
          abortController.signal.removeEventListener("abort", onAbort)
          clearTimeout(timerStep1)
          clearTimeout(timerStep2)
          reject(err)
        })
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
            isError: true,
            errorDetail: err,
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

  // Regenerate assistant response for previous user prompt
  const handleRegenerateMessage = useCallback((msgIndex: number) => {
    if (isStreaming) return
    const msgs = activeThread.messages
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        handleSendMessage(msgs[i].content)
        return
      }
    }
    if (msgs[msgIndex]?.role === "user") {
      handleSendMessage(msgs[msgIndex].content)
    }
  }, [isStreaming, activeThread.messages, handleSendMessage])

  // Retry previous prompt on error
  const handleRetryMessage = useCallback((msgIndex: number) => {
    if (isStreaming) return
    const msgs = activeThread.messages
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        handleSendMessage(msgs[i].content)
        return
      }
    }
    if (msgs[msgIndex]?.role === "user") {
      handleSendMessage(msgs[msgIndex].content)
    }
  }, [isStreaming, activeThread.messages, handleSendMessage])

  // Edit and resend user prompt inline
  const handleEditUserPrompt = useCallback((msgIndex: number, newPrompt: string) => {
    if (isStreaming || !newPrompt.trim()) return
    const currentMsgs = activeThread.messages || []
    const truncated = currentMsgs.slice(0, msgIndex)
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThreadId) {
          return { ...t, messages: truncated }
        }
        return t
      })
    )
    const historyOverride: PromptMessage[] = truncated.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    handleSendMessage(newPrompt.trim(), undefined, undefined, historyOverride)
  }, [isStreaming, activeThreadId, activeThread.messages, handleSendMessage])

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
      <div className="flex h-screen w-full items-center justify-center p-6 bg-slate-50">
        <div className="flex flex-col items-center justify-center max-w-md p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 shadow-2xs">
            <ShieldAlert className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
            Chưa được cấp quyền sử dụng AI Chats
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Tài khoản với vai trò <span className="font-semibold text-slate-800">{session?.role || "Hiện tại"}</span> chưa được cấp quyền sử dụng Trợ lý AI. Vui lòng liên hệ Quản trị viên (Admin) hoặc Design Owner để được phân quyền trong mục Cài đặt hệ thống.
          </p>
          {onBackToPortal ? (
            <motion.button
              type="button"
              onClick={onBackToPortal}
              {...tactileProps.button}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 active:bg-slate-950 transition-colors cursor-pointer shadow-xs"
            >
              Quay lại trang chủ
            </motion.button>
          ) : (
            <a
              href="#overview"
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 active:bg-slate-950 transition-colors cursor-pointer inline-flex items-center shadow-xs"
            >
              Quay lại trang chủ
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#FCFCFD] text-slate-800 font-sans select-text">
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
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={springs.gentle}
            className="flex flex-col h-full bg-slate-50/90 border-r border-slate-200/80 shrink-0 overflow-hidden z-20 text-sm select-none"
          >
            {/* 1. Header: Brand Logo (/ai-default.png), Title, Search, Collapse */}
            <div className="flex flex-col p-2.5 gap-2 shrink-0">
              <div className="flex items-center gap-2 px-1 pt-1">
                {/* Brand Logo Box: Uses ai-default.png */}
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                  <img
                    src={aiDefaultLogo}
                    alt="AI MB"
                    className="size-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/ai-default.png"
                    }}
                  />
                </div>

                <span className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-slate-900">
                  Trợ lý UX MB
                </span>

                {/* Search */}
                <motion.button
                  type="button"
                  onClick={() => {
                    const q = prompt("Tìm kiếm đoạn chat hoặc tài liệu:")
                    if (q !== null) setSearchQuery(q)
                  }}
                  {...tactileProps.iconButton}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 cursor-pointer transition-colors"
                  title="Tìm kiếm"
                >
                  <Search className="size-3.5" />
                </motion.button>

                {/* Collapse sidebar */}
                <motion.button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  {...tactileProps.iconButton}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 cursor-pointer transition-colors"
                  title="Thu gọn sidebar"
                >
                  <PanelLeft className="size-3.5" />
                </motion.button>
              </div>

              {/* TOP TABS: [ Chats ]  [ Artifacts ] (ReUI Segmented Control Standard) */}
              <div className="pt-2 pb-1 px-0.5">
                <div
                  onMouseLeave={() => setHoveredSidebarTab(null)}
                  className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-muted/70 rounded-xl border border-slate-200/80 dark:border-border text-xs select-none relative"
                >
                  <motion.button
                    type="button"
                    onClick={() => {
                      setSidebarTab("chats")
                      setSearchQuery("")
                    }}
                    onMouseEnter={() => setHoveredSidebarTab("chats")}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative isolate py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs select-none font-semibold",
                      sidebarTab === "chats"
                        ? "text-slate-900 dark:text-foreground font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground font-medium"
                    )}
                  >
                    {hoveredSidebarTab === "chats" && sidebarTab !== "chats" && (
                      <motion.span
                        layoutId="aichat-sidebar-tab-hover"
                        className="absolute inset-0 bg-slate-200/50 dark:bg-neutral-800/60 rounded-lg -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    {sidebarTab === "chats" && (
                      <motion.span
                        layoutId="aichat-sidebar-tab-pill"
                        className="absolute inset-0 bg-white dark:bg-card rounded-lg shadow-xs border border-slate-200/90 dark:border-border -z-10"
                        transition={springs.floating}
                      />
                    )}
                    <MessageSquare className="size-3.5 relative z-10 shrink-0" />
                    <span className="relative z-10">Chats</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setSidebarTab("artifacts")
                      setSearchQuery("")
                    }}
                    onMouseEnter={() => setHoveredSidebarTab("artifacts")}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative isolate py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs select-none font-semibold",
                      sidebarTab === "artifacts"
                        ? "text-slate-900 dark:text-foreground font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground font-medium"
                    )}
                  >
                    {hoveredSidebarTab === "artifacts" && sidebarTab !== "artifacts" && (
                      <motion.span
                        layoutId="aichat-sidebar-tab-hover"
                        className="absolute inset-0 bg-slate-200/50 dark:bg-neutral-800/60 rounded-lg -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    {sidebarTab === "artifacts" && (
                      <motion.span
                        layoutId="aichat-sidebar-tab-pill"
                        className="absolute inset-0 bg-white dark:bg-card rounded-lg shadow-xs border border-slate-200/90 dark:border-border -z-10"
                        transition={springs.floating}
                      />
                    )}
                    <FolderOpen className="size-3.5 relative z-10 shrink-0" />
                    <span className="relative z-10">Artifacts</span>
                  </motion.button>
                </div>
              </div>

              {/* 3. Action Button (New Chat OR Upload Artifact) */}
              <div className="flex flex-col gap-1 pt-1 min-h-[38px] justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {sidebarTab === "chats" ? (
                    <motion.div
                      key="action-chats"
                      initial={{ opacity: 0, scale: 0.98, y: -2 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 2 }}
                      transition={{ duration: 0.16, ease: easings.easeOutExpo }}
                    >
                      <motion.button
                        type="button"
                        onClick={handleCreateNewChat}
                        {...tactileProps.button}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 h-9 text-xs sm:text-sm bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer transition-all"
                      >
                        <Plus className="size-4 stroke-[2.2]" />
                        <span>Tạo đoạn chat mới</span>
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="action-artifacts"
                      initial={{ opacity: 0, scale: 0.98, y: -2 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 2 }}
                      transition={{ duration: 0.16, ease: easings.easeOutExpo }}
                      className="flex items-center gap-1.5"
                    >
                      {canUploadArtifacts ? (
                        <>
                          <motion.button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            {...tactileProps.button}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 h-9 text-xs bg-slate-900 text-white font-semibold hover:bg-slate-800 active:bg-slate-950 cursor-pointer transition-colors shadow-xs"
                          >
                            <Upload className="size-3.5 stroke-[2.2]" />
                            <span>Tải lên tài liệu</span>
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => setCreateArtifactModalOpen(true)}
                            {...tactileProps.iconButton}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors shadow-2xs"
                            title="Tạo văn bản mới"
                          >
                            <Plus className="size-4" />
                          </motion.button>
                        </>
                      ) : (
                        <div className="w-full py-2 px-3 rounded-xl bg-slate-100 border border-slate-200/70 text-[11px] text-slate-600 font-medium flex items-center justify-center gap-1.5">
                          <Lock className="size-3 shrink-0 text-amber-500" />
                          <span>Kho tài liệu chỉ đọc (RBAC)</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Separator */}
            <div className="h-[1px] bg-slate-200/70 mx-2.5 my-1" />

            {/* 4. SIDEBAR CONTENT: CHATS TAB OR ARTIFACTS TAB */}
            {sidebarTab === "chats" ? (
              <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3 text-sm select-none">
                {/* Pinned Group */}
                {pinnedList.length > 0 && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setCollapsedPinned((v) => !v)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <span>Đã ghim</span>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span>{pinnedList.length}</span>
                        <ChevronDown className={cn("size-3.5 transition-transform", !collapsedPinned && "rotate-180")} />
                      </div>
                    </button>

                    {!collapsedPinned && (
                      <motion.div
                        variants={cascadeWaveContainerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-0.5"
                      >
                        {pinnedList.map((t) => (
                          <motion.div
                            key={t.id}
                            variants={cascadeWaveItemVariants}
                            layout="position"
                            transition={dataContinuityTransition}
                          >
                            <EchoSidebarRow
                              thread={t}
                              isActive={t.id === activeThreadId}
                              onSelect={() => handleSelectThread(t.id)}
                              onPin={handleTogglePin}
                              onRename={openRenameModal}
                              onExport={handleExportThread}
                              onDelete={handleDeleteThread}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Recent Group */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setCollapsedRecent((v) => !v)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <span>Gần đây</span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span>{recentList.length}</span>
                      <ChevronDown className={cn("size-3.5 transition-transform", !collapsedRecent && "rotate-180")} />
                    </div>
                  </button>

                  {!collapsedRecent && (
                    <motion.div
                      variants={cascadeWaveContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-0.5"
                    >
                      {recentList.map((t) => (
                        <motion.div
                          key={t.id}
                          variants={cascadeWaveItemVariants}
                          layout="position"
                          transition={dataContinuityTransition}
                        >
                          <EchoSidebarRow
                            thread={t}
                            isActive={t.id === activeThreadId}
                            onSelect={() => handleSelectThread(t.id)}
                            onPin={handleTogglePin}
                            onRename={openRenameModal}
                            onExport={handleExportThread}
                            onDelete={handleDeleteThread}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {recentList.length === 0 && pinnedList.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 leading-relaxed">
                      Chưa có đoạn chat nào. Bấm "+ Tạo đoạn chat mới" để bắt đầu.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ARTIFACTS LIST (DATA USER PUSHES UP) */
              <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 text-sm select-none">
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Kho tài liệu</span>
                  <span className="text-[11px] font-mono text-slate-400 font-normal">({filteredArtifacts.length})</span>
                </div>

                <motion.div
                  variants={cascadeWaveContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-0.5"
                >
                  {filteredArtifacts.map((art) => {
                    const isSelected = selectedArtifactId === art.id
                    const ext = art.name.split(".").pop()?.toLowerCase() || ""
                    const isPdf = art.fileType === "pdf" || ext === "pdf"
                    const isCode = ["ts", "tsx", "js", "json", "code"].includes(art.fileType) || ["ts", "tsx", "js", "json"].includes(ext)
                    const isCsv = art.fileType === "csv" || ext === "csv"
                    const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || art.fileType === "image" || art.tags?.includes("Ảnh")

                    return (
                      <motion.div
                        key={art.id}
                        variants={cascadeWaveItemVariants}
                        layout="position"
                        transition={dataContinuityTransition}
                        onClick={() => {
                          setSelectedArtifactId(art.id)
                          setIsChatSplitOpen(true)
                        }}
                        className={cn(
                          "group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] cursor-pointer transition-all text-left border",
                          isSelected
                            ? "bg-slate-200/70 font-semibold text-slate-900 border-slate-300/60 shadow-2xs"
                            : "border-transparent hover:bg-slate-100/70 text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {/* Icon per file type */}
                        {isPdf ? (
                          <FileText className="size-4 shrink-0 text-rose-500 stroke-[1.8]" />
                        ) : isCode ? (
                          <FileCode className="size-4 shrink-0 text-blue-500 stroke-[1.8]" />
                        ) : isCsv ? (
                          <FileSpreadsheet className="size-4 shrink-0 text-emerald-500 stroke-[1.8]" />
                        ) : isImage ? (
                          <ImageIcon className="size-4 shrink-0 text-amber-500 stroke-[1.8]" />
                        ) : (
                          <FileText className="size-4 shrink-0 text-slate-500 stroke-[1.8]" />
                        )}

                        <div className="min-w-0 flex-1 truncate">
                          <span className="block truncate text-xs font-semibold text-slate-800 group-hover:text-slate-900">{art.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{art.size} · {art.updatedAt}</span>
                        </div>

                        {/* Delete button on hover (Only for roles with upload permission) */}
                        {canUploadArtifacts && (
                          <motion.button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${art.name}" không?`)) {
                                handleDeleteArtifact(art.id, e)
                              }
                            }}
                            {...tactileProps.iconButton}
                            className="opacity-0 group-hover:opacity-100 size-6.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-all shrink-0"
                            title="Xóa tài liệu này"
                          >
                            <Trash2 className="size-3.5" />
                          </motion.button>
                        )}
                      </motion.div>
                    )
                  })}
                </motion.div>

                {filteredArtifacts.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                    <p>Chưa có tài liệu nào.</p>
                    {canUploadArtifacts ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-slate-900 font-semibold hover:underline text-xs"
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

            {/* Sidebar User Footer */}
            <div className="p-3 border-t border-slate-200/80 shrink-0 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600 select-none">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <UserAvatar
                  name={session?.displayName || userName}
                  avatarUrl={session?.avatarUrl}
                  className="size-6.5 shrink-0 rounded-full border border-slate-200/80 shadow-2xs"
                />
                <span className="truncate font-semibold text-slate-800 text-xs">{session?.displayName || userName}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/70 shrink-0 uppercase">
                {session?.role || "Designer"}
              </span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MAIN CANVAS: CHAT STREAM OR ARTIFACT VIEWER                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FCFCFD] h-full relative">
        {/* Top Header */}
        <header className="bg-white/95 backdrop-blur-xs relative z-10 flex h-13 shrink-0 items-center justify-between gap-2 px-4 sm:px-6 border-b border-slate-200/70">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {!sidebarOpen && (
              <motion.button
                type="button"
                onClick={() => setSidebarOpen(true)}
                {...tactileProps.iconButton}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
                title="Mở sidebar"
              >
                <PanelLeft className="size-4" />
              </motion.button>
            )}

            {sidebarTab === "artifacts" && selectedArtifact ? (
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 text-slate-500 stroke-[1.8] shrink-0" />
                <h1 className="min-w-0 truncate text-sm sm:text-base font-bold tracking-tight text-slate-900">
                  {selectedArtifact.name}
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0 border border-slate-200/70 font-medium">
                  {selectedArtifact.fileType.toUpperCase()} · {selectedArtifact.size}
                </span>
              </div>
            ) : (
              <h1 className="min-w-0 truncate text-base sm:text-lg font-bold tracking-tight text-slate-900">
                {activeThread?.title || "Cuộc trò chuyện mới"}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* AI Gateway & Google AI Studio Key Settings button */}
            <motion.button
              type="button"
              onClick={() => {
                setQuickGeminiKey(getStoredGeminiKey())
                setQuickGateway(getStoredAIGateway())
                setQuickTestResult(null)
                setAiSettingsModalOpen(true)
              }}
              {...tactileProps.iconButton}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 text-xs font-semibold cursor-pointer transition-all bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
              title="Cài đặt Cổng AI & Google AI Studio Key"
            >
              <Key className="size-3.5 text-slate-600" />
            </motion.button>

            {/* Bookmark button */}
            {sidebarTab === "chats" && (
              <motion.button
                type="button"
                onClick={() => activeThread && handleTogglePin(activeThread.id)}
                {...tactileProps.iconButton}
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 text-xs font-semibold cursor-pointer transition-all shadow-2xs",
                  activeThread?.isPinned
                    ? "bg-slate-100 text-slate-900 border-slate-300"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
                title="Ghim đoạn chat"
              >
                <Bookmark className={cn("size-3.5", activeThread?.isPinned && "fill-current text-slate-900")} />
              </motion.button>
            )}

            {/* Return to MB Portal button */}
            {onBackToPortal && (
              <motion.button
                type="button"
                onClick={onBackToPortal}
                {...tactileProps.button}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200/80 shadow-2xs cursor-pointer ml-1"
                title="Quay lại MB UX Portal"
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">MB Portal</span>
              </motion.button>
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
              <div className="w-full lg:w-1/2 xl:w-[48%] flex flex-col border-r border-slate-200/80 dark:border-neutral-800 min-h-0 h-full overflow-hidden bg-white dark:bg-card">
                {/* Scrollable Message Viewport */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
                  {!activeThread?.messages || activeThread.messages.length === 0 ? (
                    <div className="mx-auto flex w-full max-w-lg flex-col justify-center py-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-neutral-700 flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-2xs">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Hỏi AI về tài liệu</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedArtifact.name}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                        Bạn có thể đặt bất kỳ câu hỏi nào về nội dung, quy trình, thông số hoặc yêu cầu AI phân tích tài liệu này.
                      </p>
                      <div className="space-y-1.5 border-t border-slate-200/70 dark:border-neutral-800 pt-3">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Gợi ý câu hỏi:</span>
                        {[
                          `Tóm tắt 3 điểm cốt lõi nhất của tài liệu ${selectedArtifact.name}`,
                          `Quy trình này quy định những bước nào và SLA ra sao?`,
                          `Chỉ ra các điểm cần lưu ý đặc biệt cho Designer và PO trong tài liệu này`
                        ].map((promptText, idx) => (
                          <motion.button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(promptText, selectedArtifact.content, selectedArtifact.name)}
                            {...tactileProps.button}
                            className="group flex w-full items-center justify-between py-2 px-2.5 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/60 dark:border-neutral-800 transition-colors cursor-pointer"
                          >
                            <span className="truncate">{promptText}</span>
                            <CornerDownLeft className="size-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5 text-slate-900 dark:text-slate-100" />
                          </motion.button>
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
                          onFeedback={(feedback) => handleMessageFeedback(m.id, feedback)}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Composer Form in Split Pane */}
                <div className="shrink-0 px-3 sm:px-4 pb-3 pt-1 z-20 border-t border-slate-200/70 dark:border-neutral-800 bg-white/95 dark:bg-card/95 backdrop-blur-sm">
                  <EchoComposerForm
                    isStreaming={isStreaming}
                    onSend={(text, attachedImg) => handleSendMessage(text, selectedArtifact.content, selectedArtifact.name, undefined, attachedImg)}
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
                onDelete={() => handleDeleteArtifact(selectedArtifact.id)}
                canDelete={canUploadArtifacts}
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
                        isDraggingOver && "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-muted ring-4 ring-slate-900/10 dark:ring-white/10"
                      )}
                    >
                      {/* ReUI c-icon-stack-2 Large Illustration */}
                      <div className="mb-4 pointer-events-none flex items-center justify-center">
                        <IconStackLarge icon={<FileText className="size-6 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-200" />} />
                      </div>

                      <div className="space-y-1.5 max-w-lg mx-auto pointer-events-none">
                        <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-foreground tracking-tight">
                          Kéo thả tài liệu vào đây, hoặc{" "}
                          <span className="text-slate-900 dark:text-white underline underline-offset-4 font-semibold hover:text-slate-700 transition-colors">
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
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 shrink-0" />
                            <span>Đa dạng định dạng (.md, .pdf, .txt, .json, .csv, code, ảnh)</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 shrink-0" />
                            <span>Tự động phân tích trích xuất dữ liệu cho AI Copilot</span>
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 shrink-0" />
                            <span>Đồng bộ an toàn Google Drive & Master Data MB</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 shrink-0" />
                            <span>100% Bảo mật dữ liệu nội bộ MBBank</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                      <span>Hoặc bạn có thể</span>
                      <motion.button
                        type="button"
                        onClick={() => setCreateArtifactModalOpen(true)}
                        {...tactileProps.button}
                        className="text-slate-900 dark:text-white font-semibold hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="size-3.5" />
                        <span>Tạo tài liệu trực tiếp</span>
                      </motion.button>
                    </div>
                  </>
                )}

                {/* Pre-seeded list */}
                <div className="pt-4 border-t border-slate-200/80 dark:border-border text-left">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Tài liệu có sẵn trong hệ thống ({artifacts.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {artifacts.slice(0, 4).map((art) => (
                      <motion.div
                        key={art.id}
                        onClick={() => setSelectedArtifactId(art.id)}
                        {...tactileProps.card}
                        className="p-2.5 rounded-xl border border-slate-200/80 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted/40 hover:border-slate-300 cursor-pointer transition-colors flex items-center gap-2.5 shadow-2xs"
                      >
                        <FileText className="size-4 text-slate-700 dark:text-slate-300 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">{art.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{art.size}</span>
                        </div>
                      </motion.div>
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
                    <div className="size-10 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-card shadow-2xs flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                      <img
                        src={aiDefaultLogo}
                        alt="AI MB"
                        className="size-7 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/ai-default.png"
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                        Trợ lý UX MB có thể hỗ trợ gì cho bạn?
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                        Hỏi đáp về tiến độ bài toán, rà soát PO Pending, phân bổ Deep Work hoặc tra cứu quy chuẩn thiết kế MBBank.
                      </p>
                    </div>
                  </div>

                  {/* 4 Category Pill Buttons with Floating Active Indicator */}
                  <div
                    className="mt-5 flex flex-wrap gap-2 relative"
                    role="tablist"
                    aria-label="Nhóm câu hỏi gợi ý"
                  >
                    {EMPTY_STATE_CATEGORIES.map((cat) => {
                      const isSelected = emptyCategory === cat.id
                      const Icon = cat.icon
                      return (
                        <motion.button
                          key={cat.id}
                          type="button"
                          onClick={() => setEmptyCategory(cat.id)}
                          role="tab"
                          aria-selected={isSelected}
                          {...tactileProps.button}
                          className={cn(
                            "relative inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                            isSelected
                              ? "text-white font-medium"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-card hover:bg-slate-50 shadow-2xs"
                          )}
                        >
                          {isSelected && (
                            <motion.span
                              layoutId="aichat-empty-category-pill"
                              className="absolute inset-0 rounded-full bg-slate-900 dark:bg-slate-100 shadow-xs"
                              transition={springs.indicator}
                            />
                          )}
                          <Icon className={cn("size-3.5 relative z-10", isSelected ? "text-white dark:text-slate-900" : "text-slate-500")} />
                          <span className={cn("relative z-10", isSelected && "text-white dark:text-slate-900")}>{cat.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* 3 Prompt Suggestions matching the selected category with micro-staggering */}
                  <motion.div
                    key={emptyCategory}
                    variants={staggerContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="mt-6 flex flex-col divide-y divide-slate-200/70 dark:divide-neutral-800 border-y border-slate-200/70 dark:border-neutral-800"
                  >
                    {currentCategoryObj.prompts.map((promptText) => (
                      <motion.button
                        key={promptText}
                        variants={staggerItemVariants}
                        type="button"
                        onClick={() => handleSendMessage(promptText)}
                        {...tactileProps.button}
                        className="group flex min-h-11 w-full items-center justify-between px-2 py-2.5 text-left text-sm sm:text-[15px] font-normal text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer focus-visible:outline-none"
                      >
                        <span className="truncate">{promptText}</span>
                        <CornerDownLeft className="size-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-2 text-slate-900 dark:text-slate-100" />
                      </motion.button>
                    ))}
                  </motion.div>

                  {/* Recent chats section (rendered only if real threads exist) */}
                  {displayRecentChats.length > 0 && (
                  <div className="mt-8 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                      <span>Đoạn chat gần đây</span>
                    </div>

                    <div className="divide-y divide-slate-200/70 dark:divide-neutral-800 border-y border-slate-200/70 dark:border-neutral-800">
                      {displayRecentChats.map((item, idx) => (
                        <motion.button
                          key={item.id}
                          type="button"
                          onClick={() => item.onClick()}
                          {...tactileProps.button}
                          className="group flex w-full items-center justify-between py-2.5 text-left text-sm hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 px-2 rounded-xl transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-slate-400 font-mono text-xs w-4 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="truncate text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white font-medium text-[13.5px]">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            {item.fileBadge && (
                              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border border-slate-200/80 bg-slate-50 text-slate-600 group-hover:border-slate-300 transition-colors">
                                {item.fileBadge}
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-mono min-w-7 text-right">
                              {item.timeAgo}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              ) : (
/* Active Messages List */
                <div
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions text"
                  aria-label="Lịch sử tin nhắn cuộc trò chuyện"
                  className="mx-auto max-w-4xl lg:max-w-5xl space-y-6 py-2"
                >
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
                      onRegenerate={() => handleRegenerateMessage(idx)}
                      onRetry={() => handleRetryMessage(idx)}
                      onEditPrompt={(newText) => handleEditUserPrompt(idx, newText)}
                      onFeedback={(feedback) => handleMessageFeedback(m.id, feedback)}
                      onOpenArtifact={() => {
                        if (m.attachedArtifactName) {
                          const matched = artifacts.find(
                            (a) => a.name.toLowerCase() === m.attachedArtifactName?.toLowerCase()
                          )
                          if (matched) setSelectedArtifactId(matched.id)
                        } else if (selectedArtifactId) {
                          // Already open
                        }
                      }}
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
                  <div className="mb-2 rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white/95 dark:bg-card/95 backdrop-blur-md shadow-xs overflow-hidden transition-all">
                    {/* Top Notice Line */}
                    <div className="flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 select-none">
                      <div
                        className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
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
                          Đã dùng <span className="font-semibold text-slate-900 dark:text-white">{dailyUsage.usedRequests}/{dailyUsage.totalRequests}</span> lượt AI hôm nay (Còn lại {dailyUsage.remainingRequests} lượt)
                          <span className="text-slate-300 dark:text-neutral-600 mx-1.5">•</span>
                          Tự động làm mới lúc 00:00
                        </span>
                        {noticeCollapsed ? (
                          <ChevronDown className="size-3 text-slate-400 ml-0.5 shrink-0" />
                        ) : (
                          <ChevronUp className="size-3 text-slate-400 ml-0.5 shrink-0" />
                        )}
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => setShowUsageNotice(false)}
                        {...tactileProps.iconButton}
                        className="size-5 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
                        title="Đóng thanh hạn mức"
                      >
                        <X className="size-3" />
                      </motion.button>
                    </div>

                    {/* Progress Bar & Subtitle Information */}
                    {!noticeCollapsed && (
                      <div className="px-3.5 pb-2.5 space-y-1.5 pt-0.5 border-t border-slate-100 dark:border-neutral-800">
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden relative flex">
                          <div
                            className="h-full bg-slate-900 dark:bg-slate-100 transition-all duration-300 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(2, dailyUsage.percent))}%` }}
                          />
                          <div
                            className="h-full flex-1 opacity-40 bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_2px,transparent_2px,transparent_6px)]"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>{dailyUsage.percent}% hạn mức ngày ({dailyUsage.usedRequests}/{dailyUsage.totalRequests} lượt)</span>
                          <span>{dailyUsage.remainingRequests > 0 ? `Còn ${dailyUsage.remainingRequests} lượt khả dụng` : "Đã đạt hạn mức hôm nay"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <EchoComposerForm
                  isStreaming={isStreaming}
                  onSend={(text, attachedImg) => handleSendMessage(
                    text,
                    (selectedArtifact as any)
                      ? `=== TÀI LIỆU NGƯỜI DÙNG ĐẨY LÊN: "${(selectedArtifact as any)?.name}" (${(selectedArtifact as any)?.fileType}) ===\n${(selectedArtifact as any)?.content}`
                      : undefined,
                    (selectedArtifact as any)?.name,
                    undefined,
                    attachedImg
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
          <div className="size-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
            <CloudOff className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Chưa đồng bộ dữ liệu AI
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dữ liệu trò chuyện và tài liệu chưa được đồng bộ với Google Sheet / Google Drive hoặc chưa cấu hình liên kết bảng tính. Vui lòng thử lại để cập nhật toàn bộ lịch sử trò chuyện và tài liệu.
            </p>
            <div className="pt-1">
              <a
                href="https://drive.google.com/drive/folders/1wgVKMhejp5b4G8efjXoIXpFaxQjzK69g?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-900 dark:text-white hover:underline font-semibold"
              >
                <span>Mở thư mục Google Drive lưu trữ hệ thống</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSyncWarningModalOpen(false)}
            className="h-8 text-xs text-slate-700 rounded-xl border border-slate-200/80 cursor-pointer"
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
            className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-xs font-semibold px-3"
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
          <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-neutral-700 shadow-2xs">
            <Key className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                Cổng Kết Nối AI & Google AI Studio
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 shadow-2xs">
                1.500 RPD Free
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Kết nối trực tiếp máy chủ Google AI Studio để sử dụng mô hình <strong>Gemini 2.0 Flash</strong> với khả năng đọc hiểu ảnh (Vision) tốc độ cao và hoàn toàn miễn phí.
            </p>
          </div>
        </div>

        {/* Gateway Mode */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
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
                "p-2 rounded-xl border text-center transition-all cursor-pointer text-[11px]",
                quickGateway === "auto"
                  ? "border-slate-900 bg-slate-900 text-white font-semibold shadow-xs"
                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
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
                "p-2 rounded-xl border text-center transition-all cursor-pointer text-[11px]",
                quickGateway === "google_ai_studio"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold shadow-xs"
                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
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
                "p-2 rounded-xl border text-center transition-all cursor-pointer text-[11px]",
                quickGateway === "openrouter"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-800 font-semibold shadow-xs"
                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              OpenRouter Pool
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Google AI Studio API Key:
            </label>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1 font-semibold"
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
            className="w-full text-xs font-mono rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
          />
        </div>

        {/* Test Result feedback */}
        {quickTestResult && (
          <div
            className={cn(
              "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-2xs",
              quickTestResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
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
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-neutral-800">
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
            className="text-xs h-9 cursor-pointer rounded-xl border border-slate-200/80 text-slate-700 hover:bg-slate-50"
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
            className="text-xs h-9 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs font-semibold px-3.5"
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
        className="p-5 space-y-4 rounded-2xl"
      >
        <div className="space-y-1.5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Đổi tên đoạn trò chuyện</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
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
          className="w-full h-9 px-3.5 text-xs bg-white dark:bg-card border border-slate-200/90 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
          placeholder="Tiêu đề đoạn hội thoại..."
          autoFocus
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRenameModalOpen(false)}
            className="h-8 text-xs text-slate-700 rounded-xl border border-slate-200/80 cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveRename}
            className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer font-semibold px-3.5"
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
        className="p-6 space-y-4 max-w-2xl rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 shadow-2xs">
              <FileText className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Tạo tài liệu / Specs mới
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dữ liệu tài liệu này sẽ được lưu trữ và có thể dùng làm bối cảnh để AI hỏi đáp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateArtifactModalOpen(false)}
            className="size-6 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block mb-1">
              Tên tài liệu
            </label>
            <input
              type="text"
              value={newArtTitle}
              onChange={(e) => setNewArtTitle(e.target.value)}
              placeholder="Ví dụ: Specs-Mo-The-Tin-Dung-JCB.md"
              className="w-full h-9 px-3.5 text-xs bg-white dark:bg-card border border-slate-200/90 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block mb-1">
              Định dạng
            </label>
            <div className="flex items-center gap-2">
              {(["markdown", "text", "json", "code"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewArtType(t)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-lg font-semibold cursor-pointer transition-colors shadow-2xs",
                    newArtType === t
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block mb-1">
              Nội dung tài liệu
            </label>
            <textarea
              rows={10}
              value={newArtContent}
              onChange={(e) => setNewArtContent(e.target.value)}
              placeholder="Dán nội dung tài liệu, specs hoặc hướng dẫn thiết kế vào đây..."
              className="w-full p-3.5 text-xs font-mono bg-white dark:bg-card border border-slate-200/90 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 resize-none leading-relaxed shadow-2xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateArtifactModalOpen(false)}
            className="h-8 text-xs text-slate-700 rounded-xl border border-slate-200/80 cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreateArtifactSubmit}
            className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer font-semibold px-3.5"
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
        "group relative flex w-full items-center gap-2 rounded-xl px-2.5 py-2 h-9 text-[13px] sm:text-sm cursor-pointer transition-colors text-left",
        isActive
          ? "bg-slate-100 dark:bg-neutral-800 font-semibold text-slate-900 dark:text-white shadow-2xs"
          : "hover:bg-slate-50 dark:hover:bg-neutral-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
        <motion.button
          type="button"
          onClick={(e) => onPin(thread.id, e)}
          {...tactileProps.iconButton}
          className="size-5 rounded hover:bg-slate-200/60 dark:hover:bg-neutral-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          title={thread.isPinned ? "Bỏ ghim" : "Ghim"}
        >
          <Pin className={cn("size-2.5", thread.isPinned && "fill-current text-slate-900 dark:text-white")} />
        </motion.button>

        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          {...tactileProps.iconButton}
          className="size-5 rounded hover:bg-slate-200/60 dark:hover:bg-neutral-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          title="Tùy chọn khác"
        >
          <MoreHorizontal className="size-2.5" />
        </motion.button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              variants={originPopoverVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={springs.popover}
              className="absolute right-0 top-7 z-50 w-36 p-1 bg-white dark:bg-card text-slate-800 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200/90 dark:border-neutral-800 text-xs select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  setMenuOpen(false)
                  onRename(thread, e)
                }}
                className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Edit2 className="size-3 text-slate-500" />
                <span>Đổi tên</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setMenuOpen(false)
                  onExport(thread, e)
                }}
                className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="size-3 text-slate-500" />
                <span>Xuất .md</span>
              </button>
              <div className="h-[1px] bg-slate-100 dark:bg-neutral-800 my-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  setMenuOpen(false)
                  onDelete(thread.id, e)
                }}
                className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer transition-colors"
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
  onRegenerate?: () => void
  onRetry?: () => void
  onEditPrompt?: (newText: string) => void
  onOpenArtifact?: () => void
  onFeedback?: (feedback: "up" | "down") => void
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
 * Trình hỗ trợ phân tích và hiển thị Inline Markdown tokens
 */
function formatRawWords(raw: string): React.ReactNode {
  if (!raw) return null

  // Tự động nhận diện Task Code dạng UXMB-YYYYMMDD-XXX hoặc UXMB-... trong văn bản thuần
  if (/(UXMB-[A-Za-z0-9_-]+)/.test(raw)) {
    const subParts: React.ReactNode[] = []
    const taskRegex = /(UXMB-[A-Za-z0-9_-]+)/g
    let sIdx = 0
    let sMatch: RegExpExecArray | null
    while ((sMatch = taskRegex.exec(raw)) !== null) {
      if (sMatch.index > sIdx) {
        subParts.push(raw.substring(sIdx, sMatch.index))
      }
      subParts.push(
        <span
          key={`tc-${sMatch.index}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[11.5px] font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-neutral-700 select-all mx-0.5"
        >
          {sMatch[1]}
        </span>
      )
      sIdx = sMatch.index + sMatch[0].length
    }
    if (sIdx < raw.length) {
      subParts.push(raw.substring(sIdx))
    }
    return <>{subParts}</>
  }
  return raw
}

/**
 * Render inline tokens: **bold**, `code/task-id`, [link](url), *italic*
 */
function formatInlineTokens(text: string): React.ReactNode {
  if (!text) return null

  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(
        <React.Fragment key={`txt-${lastIdx}`}>
          {formatRawWords(text.substring(lastIdx, match.index))}
        </React.Fragment>
      )
    }
    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      const inner = token.slice(2, -2)
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-slate-900 dark:text-white">
          {inner}
        </strong>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1)
      if (/^UXMB-[\w-]+$/i.test(inner)) {
        parts.push(
          <span
            key={`c-${match.index}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[11.5px] font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-neutral-700 select-all"
          >
            {inner}
          </span>
        )
      } else {
        parts.push(
          <code
            key={`c-${match.index}`}
            className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-neutral-700 font-normal"
          >
            {inner}
          </code>
        )
      }
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const inner = token.slice(1, -1)
      if (inner.trim().endsWith(":")) {
        parts.push(
          <strong key={`i-${match.index}`} className="font-semibold text-slate-900 dark:text-white">
            {inner}
          </strong>
        )
      } else {
        parts.push(
          <em key={`i-${match.index}`} className="italic text-slate-700 dark:text-slate-300 font-normal">
            {inner}
          </em>
        )
      }
    } else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        parts.push(
          <a
            key={`a-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-85 font-medium transition-opacity inline-flex items-center gap-0.5"
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
        {formatRawWords(text.substring(lastIdx))}
      </React.Fragment>
    )
  }

  return parts.length > 0 ? parts : text
}

/**
 * Hiển thị giá trị trạng thái kèm badge pastel và % tiến độ
 */
function renderStatusWithValue(val: string): React.ReactNode {
  const trimmed = (val || "").trim()
  if (!trimmed) return null

  const match = trimmed.match(/^(Đang thực hiện|Hoàn thành|Pending|Ready to dev|Quá hạn|Chờ [A-Za-zÀ-Ỹa-zà-ỹ0-9\s]+)(\s*\(.*?\))?(.*)$/i)
  if (match) {
    const statusText = match[1].trim()
    const pct = match[2] ? match[2].trim() : ""
    const rest = match[3] ? match[3].trim() : ""

    const lower = statusText.toLowerCase()
    let badgeClass = "bg-slate-100 text-slate-800 border-slate-200"
    let dotClass = "bg-slate-400"

    if (lower === "đang thực hiện" || lower === "in progress") {
      badgeClass = "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
      dotClass = "bg-blue-500 animate-pulse"
    } else if (lower === "hoàn thành" || lower === "done" || lower === "completed") {
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
      dotClass = "bg-emerald-500"
    } else if (lower.includes("pending") || lower.includes("chờ")) {
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
      dotClass = "bg-amber-500"
    } else if (lower.includes("ready") || lower.includes("sẵn sàng")) {
      badgeClass = "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
      dotClass = "bg-purple-500"
    } else if (lower.includes("quá hạn") || lower.includes("trễ hạn") || lower.includes("overdue")) {
      badgeClass = "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60"
      dotClass = "bg-rose-500"
    }

    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold border", badgeClass)}>
          <span className={cn("size-1.5 rounded-full shrink-0", dotClass)} />
          {statusText}
        </span>
        {pct && (
          <strong className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
            {pct}
          </strong>
        )}
        {rest && <span className="text-slate-800 dark:text-slate-200">{formatInlineTokens(rest)}</span>}
      </span>
    )
  }

  return formatInlineTokens(trimmed)
}

/**
 * Render text với định dạng inline Markdown (đậm, nghiêng, mã, link, key-value)
 */
function formatInlineText(text: string): React.ReactNode {
  if (!text) return null

  // Không format URL dạng https:// làm key-value
  if (/^https?:\/\//i.test(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-85 font-medium transition-opacity inline-flex items-center gap-1 break-all"
      >
        {text}
      </a>
    )
  }

  // 1. Kiểm tra pattern Key-Value (ví dụ: "Mã bài toán: UXMB-001" hoặc "*Chất lượng thực tế = Figma:* 95%")
  const kvMatch = text.match(/^([*_]*)([A-ZÀ-Ỹa-zà-ỹ0-9\s/()._#=\-]{2,45})(?::[*_]*|[*_]*:)\s*(.*)$/)
  if (kvMatch) {
    const keyLabel = kvMatch[2].trim()
    const valueRest = kvMatch[3]

    // Nếu key là Trạng thái / Status / Tiến độ
    if (/trạng thái|status/i.test(keyLabel)) {
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <strong className="font-semibold text-slate-900 dark:text-white shrink-0">
            {keyLabel}:
          </strong>
          {renderStatusWithValue(valueRest)}
        </span>
      )
    }

    // Nếu key là Mã bài toán / Task ID
    if (/mã bài toán|mã task|task id/i.test(keyLabel)) {
      return (
        <span className="inline-flex flex-wrap items-baseline gap-1.5">
          <strong className="font-semibold text-slate-900 dark:text-white shrink-0">
            {keyLabel}:
          </strong>
          <span className="text-slate-800 dark:text-slate-200">
            {formatInlineTokens(valueRest)}
          </span>
        </span>
      )
    }

    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5">
        <strong className="font-semibold text-slate-900 dark:text-white shrink-0">
          {keyLabel}:
        </strong>
        <span className="text-slate-800 dark:text-slate-200">
          {formatInlineTokens(valueRest)}
        </span>
      </span>
    )
  }

  return formatInlineTokens(text)
}

/**
 * Render nội dung ô bảng với Badge trạng thái, Task Code Monospace, Số liệu căn phải
 */
function renderTableCellContent(cell: string, isNumeric?: boolean): React.ReactNode {
  const trimmed = (cell || "").trim()
  if (!trimmed) return null

  // Chuẩn hóa, bỏ qua wrapper **...** hoặc `...`
  const clean = trimmed.replace(/^\*\*|\*\*$/g, "").replace(/^`|`$/g, "").trim()

  // 1. Task ID (ví dụ UXMB-20260908-008)
  if (/^UXMB-[\w-]+$/i.test(clean)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11.5px] font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-neutral-700 select-all">
        {clean}
      </span>
    )
  }

  // 2. Status Badge detection (Soft Pastel colors theo UI Design System)
  const lower = clean.toLowerCase()
  if (lower === "đang thực hiện" || lower === "in progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
        {clean}
      </span>
    )
  }
  if (lower === "hoàn thành" || lower === "done" || lower === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        {clean}
      </span>
    )
  }
  if (lower.includes("pending") || lower.includes("chờ duyệt") || lower.includes("chờ po")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-amber-500" />
        {clean}
      </span>
    )
  }
  if (lower.includes("ready") || lower.includes("sẵn sàng")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-purple-500" />
        {clean}
      </span>
    )
  }
  if (lower.includes("quá hạn") || lower.includes("trễ hạn") || lower.includes("overdue")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-rose-500" />
        {clean}
      </span>
    )
  }

  // 3. Tỷ lệ % (ví dụ 70%, 100%)
  if (/^\d{1,3}%$/.test(clean)) {
    return (
      <span className="font-semibold font-mono text-[12.5px] text-slate-900 dark:text-white">
        {clean}
      </span>
    )
  }

  // 4. Nếu toàn bộ cell ban đầu là **bold**
  if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
    return (
      <strong className="font-semibold text-slate-900 dark:text-white">
        {clean}
      </strong>
    )
  }

  // 5. Mặc định render inline tokens (hỗ trợ italic, links, code)
  return formatInlineTokens(trimmed)
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

  // Tự động nhận diện cột số liệu để căn phải (Right Align), hỗ trợ cả % và số có dấu phẩy
  const numericCols = useMemo(() => {
    const isNum: boolean[] = []
    headers.forEach((_, colIdx) => {
      const allNums = rows.every((r) => {
        const rawVal = r[colIdx] || ""
        if (!rawVal) return true
        const val = rawVal.replace(/^\*\*|\*\*$/g, "").replace(/^`|`$/g, "").replace(/[%,\s]/g, "").trim()
        if (!val) return true
        return !isNaN(Number(val))
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
      const rawA = a[sortCol] || ""
      const rawB = b[sortCol] || ""
      const valA = rawA.replace(/^\*\*|\*\*$/g, "").replace(/^`|`$/g, "").trim()
      const valB = rawB.replace(/^\*\*|\*\*$/g, "").replace(/^`|`$/g, "").trim()
      if (isNum) {
        const numA = Number(valA.replace(/[%,\s]/g, "")) || 0
        const numB = Number(valB.replace(/[%,\s]/g, "")) || 0
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
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card shadow-xs">
      <table className="w-full text-left text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-800/50 text-slate-600 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider select-none">
            {headers.map((h, hIdx) => {
              const cleanH = h.replace(/^\*\*|\*\*$/g, "").replace(/^`|`$/g, "").trim()
              return (
                <th
                  key={hIdx}
                  onClick={() => handleHeaderClick(hIdx)}
                  className={cn(
                    "py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition-colors group",
                    numericCols[hIdx] ? "text-right" : "text-left"
                  )}
                  title="Nhấp để sắp xếp dữ liệu cột"
                >
                  <div className={cn("inline-flex items-center gap-1", numericCols[hIdx] && "flex-row-reverse")}>
                    <span>{cleanH}</span>
                    <ChevronsUpDown className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
          {sortedRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={cn(
                    "py-2.5 px-3.5 text-slate-800 dark:text-slate-200",
                    numericCols[cIdx] ? "text-right font-mono tabular-nums" : "text-left"
                  )}
                >
                  {renderTableCellContent(cell, numericCols[cIdx])}
                </td>
              ))}
            </tr>
          ))}

          {/* Dòng Total / Tổng cộng theo chuẩn Screenshot 2 */}
          {totalRow && (
            <tr className="border-t-2 border-slate-300 dark:border-neutral-700 font-bold bg-slate-50/90 dark:bg-neutral-800/70 text-slate-900 dark:text-white">
              {totalRow.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={cn(
                    "py-2.5 px-3.5",
                    numericCols[cIdx] ? "text-right font-mono tabular-nums" : "text-left"
                  )}
                >
                  {renderTableCellContent(cell, numericCols[cIdx])}
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
    <div className="my-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card p-4 shadow-xs space-y-3.5 max-w-xl">
      {data.title && (
        <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
          <span>{data.title}</span>
          {matchedTask?.squad_name && (
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700 px-2 py-0.5 rounded-lg shadow-2xs">
              {matchedTask.squad_name}
            </span>
          )}
        </div>
      )}

      {/* Item List: Có thể click trực tiếp vào từng bài toán để mở task */}
      <div className="space-y-2">
        {(data.items || []).map((item, idx) => (
          <motion.div
            key={idx}
            onClick={handleOpenDetail}
            {...tactileProps.card}
            className="flex items-start gap-2.5 text-[13px] text-slate-800 dark:text-slate-200 p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer group border border-slate-200/60 dark:border-neutral-800 shadow-2xs"
            title="Bấm để xem chi tiết bài toán"
          >
            <div className="size-6 rounded-lg bg-slate-200/80 dark:bg-neutral-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <ExternalLink className="size-3.5" />
            </div>
            <div className="leading-snug flex-1 min-w-0">
              <span className="font-semibold text-slate-900 dark:text-white group-hover:text-slate-950 underline decoration-slate-300 dark:decoration-neutral-700 underline-offset-3">
                {item.title}
              </span>{" "}
              <span className="text-slate-600 dark:text-slate-400">
                {item.action || item.desc}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Thông tin Designer phụ trách (Chính xác theo Designer thực tế, không phải PO) */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <UserAvatar
            name={designerName}
            className="inline-flex size-7 rounded-full ring-2 ring-white dark:ring-neutral-900 text-[10px] font-bold shadow-2xs"
          />
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">Designer phụ trách</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{designerName}</span>
          </div>
        </div>

        {matchedTask?.current_phase && (
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full shadow-2xs">
            {matchedTask.current_phase}
          </span>
        )}
      </div>

      {/* Nút hành động trực tiếp: Xem chi tiết bài toán (Dark Navy CTA) */}
      <div className="pt-1">
        <motion.button
          type="button"
          onClick={handleOpenDetail}
          {...tactileProps.button}
          className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <ExternalLink className="size-3.5" />
          <span>{data.approveText || "Xem chi tiết bài toán"}</span>
        </motion.button>
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
    <div className="rounded-xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card shadow-xs overflow-hidden my-3">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 dark:bg-neutral-800/50 border-b border-slate-200/80 dark:border-neutral-800 text-xs text-slate-500">
        <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold select-all">
          {fileName || (lang ? lang.toUpperCase() : "release-notes-3.4.md")}
        </span>
        <motion.button
          type="button"
          onClick={() => onCopy(code)}
          {...tactileProps.iconButton}
          className="size-6 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          title="Sao chép nội dung"
        >
          {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
        </motion.button>
      </div>

      <div className="p-3.5 font-mono text-xs overflow-x-auto space-y-1 bg-white dark:bg-card text-slate-800 dark:text-slate-200 leading-relaxed">
        {codeLines.map((line, lIdx) => (
          <div key={lIdx} className="flex gap-3">
            <span className="text-slate-400 select-none w-4 text-right shrink-0">
              {lIdx + 1}
            </span>
            <span
              className={cn(
                "whitespace-pre",
                line.startsWith("#") ? "text-slate-900 dark:text-white font-bold" : "text-slate-800 dark:text-slate-200"
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
    <div className="my-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card p-4 shadow-xs space-y-3.5 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
            Đề xuất cập nhật tiến độ bài toán
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-neutral-700">
          {data.request_id}
        </span>
      </div>

      {/* Tên bài toán */}
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        "{data.task_name || matchedTask?.nickname || matchedTask?.title || "Bài toán UX"}"
      </div>

      {/* Trạng thái thay đổi: Hiện tại -> Mới */}
      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-neutral-800/40 border border-slate-200/70 dark:border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-400">Hiện tại</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">{currentPhaseOrStatus}</div>
          </div>
          <div className="size-6 rounded-full bg-slate-200/80 dark:bg-neutral-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 mx-2 text-xs font-bold">
            →
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-[11px] text-slate-500 font-medium">Đề xuất chuyển sang</div>
            <div className="font-bold text-slate-900 dark:text-white">{newPhaseOrStatus}</div>
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Tiến độ mới</span>
            <span className="font-bold text-slate-900 dark:text-white">{progressVal}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 dark:bg-slate-100 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ghi chú AI & cho phép sửa */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Ghi chú cập nhật:</span>
          {!isDone && (
            <button
              type="button"
              onClick={() => setIsEditingNote(!isEditingNote)}
              className="text-slate-900 dark:text-white font-semibold hover:underline cursor-pointer"
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
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            placeholder="Nhập ghi chú cập nhật..."
          />
        ) : (
          <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-neutral-800/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-neutral-800 italic">
            "{editNote || data.note || "Cập nhật tiến độ theo khuyến nghị của AI"}"
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {isDone ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-xl w-full justify-center shadow-2xs">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Đã cập nhật trạng thái vào hệ thống thành công</span>
          </div>
        ) : (
          <>
            <motion.button
              type="button"
              disabled={isUpdating}
              onClick={handleConfirmUpdate}
              {...tactileProps.button}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
            </motion.button>
            {onOpenTask && matchedTask && (
              <motion.button
                type="button"
                onClick={handleOpenDetail}
                {...tactileProps.button}
                className="py-2 px-3 rounded-xl border border-slate-200/80 dark:border-neutral-800 hover:bg-slate-50 text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="size-3.5" />
                <span>Xem task</span>
              </motion.button>
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
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        {docs.length} Documents Read
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(Array.isArray(docs) ? docs : []).map((doc, idx) => (
          <motion.div
            key={idx}
            {...tactileProps.card}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            <div className="size-6 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              <FileText className="size-3 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.name}</div>
              {doc.status && (
                <div className="text-[11px] text-slate-400 truncate">{doc.status}</div>
              )}
            </div>
          </motion.div>
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
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-end gap-1.5 pt-3"
    >
      {suggestions.map((sug, idx) => (
        <motion.button
          key={idx}
          variants={staggerItemVariants}
          type="button"
          onClick={() => onSend(sug)}
          {...tactileProps.button}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-neutral-800 hover:border-slate-300 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium shadow-2xs transition-all cursor-pointer group"
        >
          <span>{sug}</span>
          <CornerDownLeft className="size-3 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
        </motion.button>
      ))}
    </motion.div>
  )
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

  // Phân tích văn bản markdown thành danh sách các khối có cấu trúc
  const lines = text.split(/\r?\n/)

  type Block =
    | { type: "hr" }
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "ul"; items: { text: string; isIndented: boolean }[] }
    | { type: "ol"; items: string[] }
    | { type: "quote"; text: string }
    | { type: "p"; lines: string[] }

  const blocks: Block[] = []
  let currentBlock: Block | null = null

  const flush = () => {
    if (currentBlock) {
      blocks.push(currentBlock)
      currentBlock = null
    }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()

    // 1. Dòng trống
    if (!trimmed) {
      flush()
      continue
    }

    // 2. Horizontal divider: ---, ***, ___ (ít nhất 3 ký tự)
    if (/^([*\-_])\s*(?:\1\s*){2,}$/.test(trimmed)) {
      flush()
      blocks.push({ type: "hr" })
      continue
    }

    // 3. Heading 1 hoặc Heading 2: # hoặc ##
    const h2Match = trimmed.match(/^#{1,2}\s+(.+)$/)
    if (h2Match) {
      flush()
      blocks.push({ type: "h2", text: h2Match[1].trim() })
      continue
    }

    // 4. Heading 3 hoặc Heading 4: ### hoặc ####
    const h3Match = trimmed.match(/^#{3,4}\s+(.+)$/)
    if (h3Match) {
      flush()
      blocks.push({ type: "h3", text: h3Match[1].trim() })
      continue
    }

    // 5. Blockquote: > nội dung
    const quoteMatch = trimmed.match(/^>\s*(.+)$/)
    if (quoteMatch) {
      flush()
      blocks.push({ type: "quote", text: quoteMatch[1].trim() })
      continue
    }

    // 6. Bullet list item: - hoặc * hoặc + hoặc •
    const ulMatch = trimmed.match(/^[-*+•]\s+(.+)$/)
    if (ulMatch) {
      const isIndented = /^\s{2,}|\t/.test(rawLine)
      if (currentBlock && currentBlock.type === "ul") {
        currentBlock.items.push({ text: ulMatch[1].trim(), isIndented })
      } else {
        flush()
        currentBlock = { type: "ul", items: [{ text: ulMatch[1].trim(), isIndented }] }
      }
      continue
    }

    // 7. Numbered list item: 1. hoặc 1)
    const olMatch = trimmed.match(/^(\d+)[\.)]\s+(.+)$/)
    if (olMatch) {
      if (currentBlock && currentBlock.type === "ol") {
        currentBlock.items.push(olMatch[2].trim())
      } else {
        flush()
        currentBlock = { type: "ol", items: [olMatch[2].trim()] }
      }
      continue
    }

    // 8. Regular text line
    if (currentBlock && currentBlock.type === "p") {
      currentBlock.lines.push(trimmed)
    } else {
      flush()
      currentBlock = { type: "p", lines: [trimmed] }
    }
  }

  flush()

  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((b, bIdx) => {
        if (b.type === "hr") {
          return <hr key={bIdx} className="my-4 border-t border-slate-200/80 dark:border-neutral-800" />
        }

        if (b.type === "h2") {
          return (
            <div key={bIdx} className="pt-3 pb-1 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-2.5">
              <span className="w-1.5 h-4.5 rounded-full bg-slate-900 dark:bg-slate-100 shrink-0" />
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {formatInlineText(b.text)}
              </h2>
            </div>
          )
        }

        if (b.type === "h3") {
          return (
            <div key={bIdx} className="pt-2.5 pb-0.5 flex items-center gap-2">
              <span className="w-1 h-3.5 rounded-full bg-slate-800 dark:bg-slate-200 shrink-0" />
              <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {formatInlineText(b.text)}
              </h3>
            </div>
          )
        }

        if (b.type === "quote") {
          return (
            <blockquote
              key={bIdx}
              className="my-2 pl-3 py-1.5 border-l-2 border-slate-300 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-800/30 rounded-r-lg text-slate-700 dark:text-slate-300 italic text-[13px]"
            >
              {formatInlineText(b.text)}
            </blockquote>
          )
        }

        if (b.type === "ul") {
          return (
            <ul key={bIdx} className="my-1.5 space-y-1.5 pl-0.5">
              {b.items.map((it, iIdx) => (
                <li
                  key={iIdx}
                  className={cn(
                    "flex items-start gap-2.5 text-slate-800 dark:text-slate-200 text-[13.5px] leading-relaxed",
                    it.isIndented && "ml-4 pl-1 border-l border-slate-200 dark:border-neutral-800"
                  )}
                >
                  <span className="size-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-2 shrink-0" />
                  <div className="flex-1">{formatInlineText(it.text)}</div>
                </li>
              ))}
            </ul>
          )
        }

        if (b.type === "ol") {
          return (
            <ol key={bIdx} className="my-1.5 space-y-1.5 pl-0.5">
              {b.items.map((it, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-slate-800 dark:text-slate-200 text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 font-mono text-xs mt-0.5 shrink-0 min-w-[18px]">
                    {iIdx + 1}.
                  </span>
                  <div className="flex-1">{formatInlineText(it)}</div>
                </li>
              ))}
            </ol>
          )
        }

        // Paragraph
        return (
          <p key={bIdx} className="text-[13.5px] sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
            {b.lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {formatInlineText(line)}
              </React.Fragment>
            ))}
          </p>
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
  onRegenerate,
  onRetry,
  onEditPrompt,
  onOpenArtifact,
  onFeedback,
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
        <EchoUserMessageBubble
          message={message}
          isStreaming={isStreaming}
          onEditAndResend={(newText) => {
            if (onEditPrompt) onEditPrompt(newText)
          }}
        />

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
  const isErrorMessage = Boolean(
    message.isError ||
    (message.content && message.content.startsWith("⚠️"))
  )

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
              activeTasks={message.traceData ? message.traceData.activeTasks : (intelligence?.activeAssignedTasks || tasks || [])}
              summaryProjects={message.traceData ? message.traceData.summaryProjects : (intelligence?.activeAssignedTasks || tasks || [])}
              riskProjects={message.traceData ? message.traceData.riskProjects : (intelligence?.overdueTasks || [])}
              goLiveTasks={message.traceData ? message.traceData.goLiveTasks : (intelligence?.goLiveTasks || [])}
              dominantPhaseText={message.traceData?.dominantPhaseText || intelligence?.dominantPhaseText || "khảo sát nghiệp vụ & định nghĩa đầu bài (Define)"}
              todayEvents={intelligence?.todayEvents}
              discussionCount={message.traceData ? (message.traceData.activeTasks && message.traceData.activeTasks.length > 0 ? intelligence?.totalChatCount : 0) : intelligence?.totalChatCount}
              loadedDocNames={message.traceData?.loadedDocNames}
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

        {isErrorMessage ? (
          <EchoErrorCard
            error={message.errorDetail || message.content}
            onRetry={onRetry}
            isRetrying={isStreaming}
          />
        ) : message.content ? (
          renderedAssistantContent
        ) : (
          !message.reasoning && (
            <div className="flex items-center gap-2 py-1 text-muted-foreground text-xs">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              <span className="italic">Đang chuẩn bị câu trả lời...</span>
            </div>
          )
        )}

        {/* Assistant Action Bar */}
        <EchoAssistantActionBar
          messageId={message.id}
          content={message.content}
          isStreaming={isStreaming}
          hasError={isErrorMessage}
          artifactName={message.attachedArtifactName}
          onRegenerate={onRegenerate}
          onRetry={onRetry}
          onOpenArtifact={onOpenArtifact}
          feedback={message.feedback}
          onFeedback={onFeedback}
        />
      </div>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS: COMPOSER FORM (EXACT MATCH TO TASK DETAIL AI PROMPT BOX)
// ─────────────────────────────────────────────────────────────────────────────

interface EchoComposerFormProps {
  isStreaming: boolean
  onSend: (text: string, attachedImage?: { file: File; dataUrl: string; name: string; size: string }) => void
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
  const [pastedImage, setPastedImage] = useState<{
    file: File
    dataUrl: string
    name: string
    size: string
  } | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn hoặc dán tệp định dạng hình ảnh (.png, .jpg, .webp, .svg...)")
      return
    }
    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dung lượng ảnh vượt quá giới hạn 10MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) {
        const rawName = file.name && file.name !== "image.png" ? file.name : `Screenshot_${new Date().toLocaleTimeString().replace(/:/g, "-")}.png`
        const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`
        setPastedImage({
          file,
          dataUrl,
          name: rawName,
          size: sizeStr,
        })
        toast.success(`Đã đính kèm ảnh: ${rawName}`)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          processImageFile(file)
          return
        }
      }
    }
  }, [processImageFile])

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
    if ((!trimmed && !pastedImage) || isStreaming) return
    onSend(trimmed, pastedImage || undefined)
    setText("")
    setPastedImage(null)
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
            variants={originPopoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springs.popover}
            className="absolute bottom-full left-0 right-0 mb-2 w-full bg-white dark:bg-card rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-xl shadow-slate-900/10 overflow-hidden z-50 p-2 select-none"
          >
            <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-1.5 mb-1">
              <span>Lệnh & Thao tác nhanh</span>
              <button
                type="button"
                onClick={() => setShowCommands(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
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
                    className={`group w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-neutral-800/50 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="size-6 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-200/60 dark:border-neutral-700 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      {item.name ? (
                        <span className="font-mono text-[11px] text-slate-900 dark:text-white bg-slate-100 dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                          /{item.name}
                        </span>
                      ) : null}
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                        {item.title}
                      </span>
                      {item.actionType === "upload" && !canUploadArtifacts && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold shrink-0">
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
            variants={originPopoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springs.popover}
            className="absolute bottom-full left-0 mb-2 w-full sm:w-[380px] bg-white dark:bg-card rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-xl shadow-slate-900/10 overflow-hidden z-50 p-2 select-none"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <AtSign className="size-3.5 text-slate-400" />
                Nhắc tài liệu tham chiếu
              </span>
              <button
                type="button"
                onClick={() => setShowMentions(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[10px] cursor-pointer"
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
                  className="group w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <FileText className="size-4 text-slate-400 group-hover:text-slate-800 shrink-0 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate block">
                      @{art.name}
                    </span>
                    <span className="text-[10.5px] text-slate-400 truncate block">
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
            variants={originPopoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springs.popover}
            className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 bg-white dark:bg-card rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-xl shadow-slate-900/10 p-2 z-50 select-none max-h-[380px] overflow-y-auto"
          >
            {/* Model Section */}
            <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                      isSelected ? "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold" : "hover:bg-slate-50 dark:hover:bg-neutral-800/50 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-semibold truncate", isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200")}>
                          {m.name}
                        </span>
                        {m.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5 font-mono">
                        {m.provider} • {m.contextLength ? `${m.contextLength} context` : "200K context"}
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 text-slate-900 dark:text-white shrink-0 stroke-[2.2]" />}
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-slate-100 dark:bg-neutral-800 my-1.5 mx-1" />

            {/* Mode Section */}
            <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                      isSelected ? "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold" : "hover:bg-slate-50 dark:hover:bg-neutral-800/50 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className={cn("text-xs font-semibold block", isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200")}>
                        {mode.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                        {mode.desc}
                      </span>
                    </div>
                    {isSelected && <Check className="size-4 text-slate-900 dark:text-white shrink-0 stroke-[2.2]" />}
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
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDraggingOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDraggingOver(false)
          const droppedFile = e.dataTransfer.files?.[0]
          if (droppedFile && droppedFile.type.startsWith("image/")) {
            processImageFile(droppedFile)
          }
        }}
        className={cn(
          "relative rounded-2xl border bg-white dark:bg-card p-2.5 shadow-xs transition-all duration-200 focus-within:ring-2 focus-within:ring-slate-900/10 cursor-text",
          isDraggingOver
            ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20"
            : "border-slate-200/90 dark:border-neutral-800 focus-within:border-slate-300 dark:focus-within:border-neutral-700"
        )}
      >
        {/* Active Document Context Chip when an artifact is open */}
        {activeArtifact && (
          <div className="flex items-center justify-between px-2.5 py-1 mb-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700 text-xs text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="size-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
              <span className="font-semibold truncate">Hỏi trực tiếp về tài liệu: {activeArtifact.name}</span>
            </div>
            {onClearActiveArtifact && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearActiveArtifact()
                }}
                className="size-4 rounded hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                title="Bỏ gắn ngữ cảnh tài liệu"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* Pasted/Dropped Image Attachment Preview Chip */}
        {pastedImage && (
          <div className="flex items-center justify-between p-2 mb-2 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/90 dark:border-neutral-700/80 shadow-2xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-11 rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-700 bg-black/5 shrink-0 flex items-center justify-center">
                <img src={pastedImage.dataUrl} alt={pastedImage.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block">
                    {pastedImage.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {pastedImage.size} • Sẵn sàng gửi kèm câu hỏi
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPastedImage(null)
              }}
              className="size-6 rounded-md hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Gỡ ảnh đính kèm"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (showCommands) {
              if (e.key === "Tab") {
                e.preventDefault()
                if (e.shiftKey) {
                  setSelectedIndex((prev) => (prev - 1 + AI_COMMAND_LIST.length) % AI_COMMAND_LIST.length)
                } else {
                  setSelectedIndex((prev) => (prev + 1) % AI_COMMAND_LIST.length)
                }
                return
              }
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
                if (e.nativeEvent.isComposing) return
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
              // Prevent premature sending with Vietnamese IME (Unikey/EVKey)
              if (e.nativeEvent.isComposing) return
              e.preventDefault()
              handleSend()
            } else if (e.key === "Escape") {
              setShowCommands(false)
              setShowMentions(false)
            }
          }}
          rows={1}
          disabled={isStreaming}
          aria-label="Soạn câu hỏi cho AI (Enter để gửi, Shift+Enter để xuống dòng)"
          aria-expanded={showCommands || showMentions}
          aria-haspopup="listbox"
          placeholder={
            pastedImage
              ? "Nhập câu hỏi hoặc yêu cầu phân tích về ảnh này (Enter để gửi ngay)..."
              : activeArtifact
              ? `Hỏi AI bất kỳ điều gì về ${activeArtifact.name}...`
              : "Nhập nội dung trao đổi, hoặc dán ảnh chụp màn hình (Ctrl+V)... (Gõ / để gọi lệnh)"
          }
          className="flex min-h-[46px] max-h-52 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none leading-relaxed"
        />

        {/* Actions Toolbar: Exact Match to Image 1 */}
        <div className="flex items-center justify-between gap-2 p-0 pt-1.5 border-t border-slate-100 dark:border-neutral-800 select-none">
          {/* Left Action Buttons: + Button, Model • Mode Button, Sparkles Button */}
          <div className="flex items-center gap-1 select-none relative">
            {/* 1. Plus Button (+) */}
            <motion.button
              type="button"
              onClick={onUploadFile}
              {...tactileProps.iconButton}
              className="size-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
              title="Thêm tệp hoặc ảnh thiết kế (.md, .pdf, .json, ảnh...)"
            >
              <Plus className="size-4 stroke-[2.2]" />
            </motion.button>

            {/* 2. Model & Mode Trigger Button */}
            <motion.button
              type="button"
              onClick={() => setShowModelMenu((v) => !v)}
              {...tactileProps.button}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer border",
                showModelMenu
                  ? "bg-slate-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white font-semibold"
                  : "bg-transparent border-transparent hover:bg-slate-100/80 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
              title="Chọn mô hình AI và chế độ suy luận"
            >
              <span className="truncate max-w-[130px] sm:max-w-[200px] font-semibold text-slate-800 dark:text-slate-200">
                {currentModelObj?.name || currentModel}
              </span>
              <span className="text-slate-300 dark:text-neutral-600">•</span>
              <span className="text-slate-500 capitalize">{activeModeObj?.label || "Auto"}</span>
              <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", showModelMenu && "rotate-180")} />
            </motion.button>

            {/* 3. Sparkles Helper Button (✨) */}
            <motion.button
              type="button"
              onClick={() => setShowCommands((v) => !v)}
              {...tactileProps.iconButton}
              className={cn(
                "size-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0",
                showCommands
                  ? "text-slate-900 bg-slate-100 dark:bg-neutral-800"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
              )}
              title="Lệnh nhanh & Công cụ AI (/)"
            >
              <Sparkles className="size-3.5" />
            </motion.button>

            {/* 4. Artifacts Library Button */}
            <motion.button
              type="button"
              onClick={onOpenArtifacts}
              {...tactileProps.iconButton}
              className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
              title="Mở thư viện tài liệu Artifacts"
            >
              <FolderOpen className="size-3.5" />
            </motion.button>
          </div>

          {/* Right Action: Instructions Hint & Send Button */}
          <div className="flex items-center gap-3">
            {/* Keyboard Shortcuts Hint */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 select-none">
              <span className="inline-flex items-center gap-1">
                <kbd className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-neutral-700 shadow-2xs font-sans text-[11px] leading-none px-1.5 py-0.5 rounded">↵</kbd>
                <span className="text-[10px] text-slate-400">gửi</span>
              </span>
              <span className="text-slate-300 dark:text-neutral-600">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-neutral-700 shadow-2xs font-sans text-[10px] leading-none px-1.5 py-0.5 rounded">Shift</kbd>
                <span className="text-slate-400 text-[10px]">+</span>
                <kbd className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-neutral-700 shadow-2xs font-sans text-[11px] leading-none px-1.5 py-0.5 rounded">↵</kbd>
                <span className="text-[10px] text-slate-400">xuống dòng</span>
              </span>
            </div>

            {/* Send / Stop Button */}
            {isStreaming ? (
              <motion.button
                type="button"
                onClick={onStop}
                {...tactileProps.button}
                className="h-8 px-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl cursor-pointer shadow-2xs"
              >
                Dừng
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() && !pastedImage}
                {...tactileProps.button}
                className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  text.trim() || pastedImage
                    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
                title="Gửi trao đổi"
              >
                <ArrowUp className="size-4 stroke-[2.5]" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
