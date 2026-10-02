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
} from "lucide-react"
import { DropdownMenu } from "@/components/reui/dropdown-menu"
import { IconStackLarge } from "@/components/reui/c-icon-stack-2"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getStoredSession } from "@/services/otpAuthService"
import { UserAvatar } from "@/components/common/UserAvatar"
import { fetchRequests } from "@/api/api"
import { type UXRequest } from "@/data/mockData"
import { isTaskAssignedToUser, canRoleAccessCapability } from "@/lib/accessControl"
import { extractExecutiveIntelligence, type ExecutiveIntelligenceData } from "@/lib/executiveIntelligence"
import { loadAllCalendarItems, type PlannerEntry } from "@/services/calendarService"
import {
  buildChatPrompt,
  serializeContext,
  type PromptMessage,
} from "@/config/aiPrompts"
import {
  streamAICompletion,
  POPULAR_AI_MODELS,
  getDailyAIUsage,
  type AIDailyUsage,
} from "@/services/aiService"
import {
  getStoredArtifacts,
  saveStoredArtifacts,
  addArtifact,
  deleteArtifact,
  formatFileSize,
  type UXArtifact,
} from "@/services/aiArtifactsService"
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
  "title": "Here is what I would move:",
  "items": [
    { "icon": "calendar", "title": "Lunch With Sarah", "action": "books at 12:00 PM." },
    { "icon": "calendar", "title": "Sync With Maya", "action": "moves to 1:30 PM." },
    { "icon": "calendar", "title": "Strategy Session", "action": "moves to Friday, 3:00 PM." }
  ],
  "notified": {
    "label": "Will be notified",
    "users": [
      { "name": "Sarah", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face" },
      { "name": "Alex", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" },
      { "name": "Maya", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" }
    ]
  },
  "question": "Shall I update your calendar and let them know?",
  "approveText": "Approve",
  "rejectText": "Not Now"
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

  useEffect(() => {
    const handleRbac = () => {
      const s = getStoredSession()
      setSession(s)
      setCanUseAi(canRoleAccessCapability(s?.role, "cap-ai-use"))
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
  const [noticeCollapsed, setNoticeCollapsed] = useState(false)

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
  const [currentModel, setCurrentModel] = useState<string>("anthropic/claude-3.5-sonnet")
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)

  // Rename modal
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameInput, setRenameInput] = useState("")
  const [targetRenameThread, setTargetRenameThread] = useState<ChatThread | null>(null)

  // Empty state category selection (Tiến độ | Rà soát PO | Năng suất | Quy chuẩn)
  const [emptyCategory, setEmptyCategory] = useState<"progress" | "po" | "productivity" | "standards">("progress")

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

  // Save threads to localStorage (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const toSave = threads.filter((t) => t.id !== "draft" && Array.isArray(t.messages) && t.messages.length > 0)
        localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(toSave))
      } catch (err) {
        console.error("[AIChatPage] LocalStorage save error:", err)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [threads])

  // Load context from MBBank portal
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
          const userScopeTasks = (reqs || []).filter((r) => isTaskAssignedToUser(r, s))
          const now = new Date()
          const todayYMD = now.toISOString().slice(0, 10)
          const intel = extractExecutiveIntelligence({
            session: s,
            rawRequests: reqs || [],
            myTasks: userScopeTasks,
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

    return () => {
      isMounted = false
    }
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
    toast.success(`Đã chuyển model sang ${modelId}`)
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

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    let lastArtId = ""
    let loadedCount = 0

    files.forEach((file) => {
      const fileName = file.name
      const ext = fileName.split(".").pop()?.toLowerCase() || ""

      // Hỗ trợ xử lý tệp ảnh (PNG, JPG, WebP, SVG)
      if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || file.type.startsWith("image/")) {
        const imgReader = new FileReader()
        imgReader.onload = (event) => {
          const dataUrl = (event.target?.result as string) || ""
          const newArt = addArtifact({
            name: fileName,
            fileType: "markdown",
            size: formatFileSize(file.size),
            content: `# ${fileName}\n\n![${fileName}](${dataUrl})\n\n*Ảnh màn hình / tài liệu thiết kế do ${userName} tải lên làm bối cảnh phân tích UI/UX.*`,
            summary: `Ảnh thiết kế / tư liệu: ${fileName}`,
            tags: ["Ảnh", ext.toUpperCase(), "Tải lên"],
            isCustomUploaded: true,
          })
          lastArtId = newArt.id
          loadedCount++
          if (loadedCount === files.length) {
            const updated = getStoredArtifacts()
            setArtifacts(updated)
            setSelectedArtifactId(lastArtId)
            setSidebarTab("artifacts")
            if (files.length === 1) {
              toast.success(`Đã tải lên tệp tin thành công: ${fileName}`)
            } else {
              toast.success(`Đã tải lên ${files.length} tệp tin thành công!`)
            }
          }
        }
        imgReader.onerror = () => {
          toast.error(`Không thể đọc tệp ảnh: ${fileName}`)
        }
        imgReader.readAsDataURL(file)
        return
      }

      // Xử lý tệp văn bản / markdown / code / json / pdf / csv
      const reader = new FileReader()
      let fileType: UXArtifact["fileType"] = "text"
      if (ext === "md") fileType = "markdown"
      else if (ext === "pdf") fileType = "pdf"
      else if (["ts", "js", "tsx", "jsx", "html", "css"].includes(ext)) fileType = "code"
      else if (ext === "csv") fileType = "csv"
      else if (ext === "json") fileType = "json"

      reader.onload = (event) => {
        const content = (event.target?.result as string) || ""
        const newArt = addArtifact({
          name: fileName,
          fileType,
          size: formatFileSize(file.size),
          content,
          summary: `Tài liệu do ${userName} tải lên: ${fileName}`,
          tags: ["Tải lên", ext.toUpperCase()],
          isCustomUploaded: true,
        })
        lastArtId = newArt.id
        loadedCount++
        if (loadedCount === files.length) {
          const updated = getStoredArtifacts()
          setArtifacts(updated)
          setSelectedArtifactId(lastArtId)
          setSidebarTab("artifacts")
          if (files.length === 1) {
            toast.success(`Đã tải lên tài liệu thành công: ${fileName}`)
          } else {
            toast.success(`Đã tải lên ${files.length} tài liệu thành công!`)
          }
        }
      }

      reader.onerror = () => {
        toast.error(`Không thể đọc tệp tin: ${fileName}`)
      }

      reader.readAsText(file)
    })
  }, [userName])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
    e.target.value = ""
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

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
        processFiles(pastedFiles)
        toast.info(`Đã dán ${pastedFiles.length} tệp tin từ Clipboard!`)
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [processFiles])

  // Create manual artifact
  const handleCreateArtifactSubmit = () => {
    if (!newArtTitle.trim()) {
      toast.error("Vui lòng nhập tên tài liệu.")
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

    setArtifacts(getStoredArtifacts())
    setSelectedArtifactId(newArt.id)
    setCreateArtifactModalOpen(false)
    setNewArtTitle("")
    setNewArtContent("")
    toast.success("Đã tạo mới tài liệu thành công.")
  }

  // Delete artifact
  const handleDeleteArtifact = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const updated = deleteArtifact(id)
    setArtifacts(updated)
    if (selectedArtifactId === id) {
      setSelectedArtifactId(updated[0]?.id || null)
    }
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

  // Send message & Stream reply
  const handleSendMessage = async (text: string, customContext?: string, attachedDocName?: string) => {
    if (!text.trim() || isStreaming) return

    const startTime = Date.now()
    const userMsgId = `msg-user-${Date.now()}`
    const assistantMsgId = `msg-asst-${Date.now() + 1}`

    const currentSession = getStoredSession()
    const senderName = currentSession?.displayName || currentSession?.name || userName || "Designer"
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

    const activeAssigned = intelligence?.activeAssignedTasks || tasks.slice(0, 6)
    const summaryProjs = (intelligence?.delegatedTasks?.map((d) => d.task) || tasks).slice(0, 3)
    const riskProjs = intelligence?.overdueTasks || []
    const goLive = intelligence?.goLiveTasks || []
    const dominantPhase = intelligence?.dominantPhaseText || "khảo sát nghiệp vụ & định nghĩa đầu bài (Define)"

    const traceData: ChatTraceData = {
      activeTasks: activeAssigned.length > 0 ? activeAssigned : tasks.slice(0, 6),
      summaryProjects: summaryProjs.length > 0 ? summaryProjs : tasks.slice(0, 3),
      riskProjects: riskProjs,
      goLiveTasks: goLive,
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

      let contextStr = ""
      if (customContext) {
        contextStr = customContext
      } else if (intelligence) {
        contextStr = serializeContext(intelligence)
      } else if (tasks && tasks.length > 0) {
        contextStr = `Danh sách bài toán (${tasks.length}):\n` +
          tasks.slice(0, 25).map((t) => `- [${t.priority || "Lv3"}] "${t.nickname || t.title}": ${t.status || "Chờ xử lý"} (Phụ trách: ${t.assigned_designer || (t as any).assignee || "Chưa gán"})`).join("\n")
      } else {
        contextStr = `Người dùng: ${userName}. Vai trò: ${session?.role || "Designer"}.`
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
            onComplete: (fullText, fullReasoning) => {
              clearTimeout(timerStep1)
              clearTimeout(timerStep2)
              accumulated = fullText || accumulated
              accumulatedReasoning = fullReasoning || accumulatedReasoning

              const durationSeconds = Number(Math.max(1, (Date.now() - startTime) / 1000).toFixed(1))
              currentSteps = currentSteps.map((s) => ({ ...s, status: "completed" }))

              const syntheticReasoning = [
                `1. Tiếp nhận & phân tích yêu cầu: "${text}".`,
                `2. Rà soát hệ thống UX MB: Đọc dữ liệu ${tasks?.length || 0} bài toán hiện tại, lịch trình và thời gian Deep Work.`,
                `3. Áp dụng quy chuẩn thiết kế: Kiểm tra tính tuân thủ quy trình 7 khâu UX MBBank, SLA và rào cản PO Pending.`,
                `4. Hoàn thiện câu trả lời: Tổng hợp súc tích, làm nổi bật thông tin trọng tâm và đề xuất giải pháp khả thi.`,
              ].join("\n")

              const finalReasoning = accumulatedReasoning.trim() || syntheticReasoning

              updateAssistantMsg({
                content: accumulated,
                reasoning: finalReasoning,
                processSteps: currentSteps,
                isThinkingComplete: true,
                thinkingDurationSeconds: durationSeconds,
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
        const errMsg = err?.message || "Lỗi kết nối AI gateway."
        updateAssistantMsg({
          content: `⚠️ ${errMsg}`,
          isThinkingComplete: true,
          processSteps: currentSteps.map((s) => ({ ...s, status: "completed" })),
        })
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
        accept=".md,.txt,.json,.csv,.pdf,.ts,.tsx,.js,image/png,image/jpeg,image/webp"
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
                <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground">
                  <span>Tài liệu & Specs ({filteredArtifacts.length})</span>
                </div>

                {filteredArtifacts.map((art) => {
                  const isSelected = selectedArtifactId === art.id
                  return (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArtifactId(art.id)}
                      className={cn(
                        "group relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] cursor-pointer transition-colors text-left",
                        isSelected
                          ? "bg-foreground/10 font-medium text-foreground"
                          : "hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {/* Icon per file type */}
                      {art.fileType === "markdown" ? (
                        <FileText className="size-4 shrink-0 text-blue-500" />
                      ) : art.fileType === "code" || art.fileType === "json" ? (
                        <FileCode className="size-4 shrink-0 text-emerald-500" />
                      ) : art.fileType === "csv" ? (
                        <FileSpreadsheet className="size-4 shrink-0 text-amber-500" />
                      ) : (
                        <FileText className="size-4 shrink-0 text-purple-500" />
                      )}

                      <div className="min-w-0 flex-1 truncate">
                        <span className="block truncate text-xs font-medium text-foreground">{art.name}</span>
                        <span className="block text-[10px] text-muted-foreground font-mono">{art.size} · {art.updatedAt}</span>
                      </div>

                      {/* Delete button on hover */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteArtifact(art.id, e)}
                        className="opacity-0 group-hover:opacity-100 size-5 rounded hover:bg-muted text-muted-foreground hover:text-rose-500 flex items-center justify-center cursor-pointer transition-opacity shrink-0"
                        title="Xóa tài liệu này"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )
                })}

                {filteredArtifacts.length === 0 && (
                  <div className="p-3 text-center text-xs text-muted-foreground space-y-2">
                    <p>Chưa có tài liệu nào.</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline text-xs"
                    >
                      Bấm vào đây để tải lên tệp tin
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Tab Switcher: [ Chats ]  [ Artifacts ] */}
            <div className="p-2 border-t border-border shrink-0 bg-sidebar/80">
              <div className="grid grid-cols-2 p-[3px] bg-foreground/5 rounded-lg text-[13px] font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab("chats")
                    setSearchQuery("")
                  }}
                  className={cn(
                    "py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    sidebarTab === "chats"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="size-3.5" />
                  <span>Chats</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab("artifacts")
                    setSearchQuery("")
                  }}
                  className={cn(
                    "py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    sidebarTab === "artifacts"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="size-3.5" />
                  <span>Artifacts</span>
                </button>
              </div>
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

            {/* Model Selector Dropdown */}
            <div className="w-40 sm:w-44">
              <DropdownMenu
                className="w-full text-xs bg-background border-border h-7.5 rounded-md font-medium text-[0.8rem]"
                value={currentModel}
                onChange={handleModelChange}
                options={POPULAR_AI_MODELS.map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
              />
            </div>

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
        {sidebarTab === "artifacts" ? (
          /* ARTIFACT VIEWER VIEW (Exact match to Echo Chat Artifacts View) */
          selectedArtifact ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
              {/* Artifact Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border text-xs shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono">
                    Cập nhật: {selectedArtifact.updatedAt}
                  </span>
                  {selectedArtifact.tags && (
                    <div className="flex items-center gap-1">
                      {selectedArtifact.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChatWithArtifact(selectedArtifact)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer transition-colors shadow-2xs"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Hỏi AI về tài liệu này</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([selectedArtifact.content], { type: "text/plain" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = selectedArtifact.name
                      a.click()
                      URL.revokeObjectURL(url)
                      toast.success(`Đã tải xuống ${selectedArtifact.name}`)
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-foreground text-xs cursor-pointer transition-colors"
                  >
                    <Download className="size-3.5" />
                    <span>Tải xuống</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedArtifactId(null)}
                    className="size-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                    title="Đóng xem trước"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Artifact Content Canvas */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-10 relative">
                <div
                  className="mx-auto max-w-4xl bg-card border border-border rounded-xl p-8 shadow-xs transition-transform origin-top"
                  style={{ transform: `scale(${artifactZoom / 100})` }}
                >
                  {selectedArtifact.fileType === "code" || selectedArtifact.fileType === "json" ? (
                    <pre className="font-mono text-xs leading-relaxed overflow-x-auto text-foreground p-4 bg-muted/30 rounded-lg border border-border/60">
                      <code>{selectedArtifact.content}</code>
                    </pre>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none text-foreground text-sm sm:text-base leading-relaxed space-y-4">
                      {selectedArtifact.content.split("\n\n").map((block, bIdx) => {
                        if (block.startsWith("# ")) {
                          return <h1 key={bIdx} className="text-2xl font-bold border-b border-border pb-2 pt-1">{block.slice(2)}</h1>
                        }
                        if (block.startsWith("## ")) {
                          return <h2 key={bIdx} className="text-xl font-bold pt-2">{block.slice(3)}</h2>
                        }
                        if (block.startsWith("### ")) {
                          return <h3 key={bIdx} className="text-base font-semibold pt-1 text-primary">{block.slice(4)}</h3>
                        }
                        if (block.startsWith("- ")) {
                          return (
                            <ul key={bIdx} className="list-disc pl-5 space-y-1">
                              {block.split("\n").map((line, lIdx) => (
                                <li key={lIdx}>{line.replace(/^-\s*/, "")}</li>
                              ))}
                            </ul>
                          )
                        }
                        return <p key={bIdx} className="whitespace-pre-wrap">{block}</p>
                      })}
                    </div>
                  )}
                </div>

                {/* Floating Zoom Controls (Bottom Right) */}
                <div className="fixed bottom-6 right-6 flex items-center gap-1 p-1 bg-background/90 backdrop-blur-md rounded-lg border border-border shadow-md z-30 select-none">
                  <button
                    type="button"
                    onClick={() => setArtifactZoom((z) => Math.max(70, z - 10))}
                    className="size-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="text-xs font-mono px-1.5 w-12 text-center text-foreground font-medium">
                    {artifactZoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setArtifactZoom((z) => Math.min(150, z + 10))}
                    className="size-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ARTIFACTS HUB (DRAG & DROP UPLOAD ZONE - EXACT MATCH TO IMAGE COMPRESSOR) */
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center">
              <div className="max-w-4xl w-full text-center space-y-6">
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
                    <IconStackLarge />
                  </div>

                  <div className="space-y-1.5 max-w-lg mx-auto pointer-events-none">
                    <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-foreground tracking-tight">
                      Drag and drop an image, or{" "}
                      <span className="text-[#1057FB] dark:text-blue-400 underline underline-offset-4 font-semibold hover:text-[#1B3A6B] dark:hover:text-blue-300 transition-colors">
                        Browse
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground font-normal">
                      Hỗ trợ PNG, JPG, JPEG, WebP • Dán trực tiếp (Ctrl + V) từ Clipboard • Không giới hạn số lượng ảnh
                    </p>
                  </div>

                  {/* Guidelines Bullets 2 Cột (Chuẩn ReUI Cover Upload Guidelines) */}
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-border/60 w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left text-xs text-slate-500 dark:text-muted-foreground pointer-events-none">
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-muted-foreground/60 shrink-0" />
                        <span>High resolution images (png, jpg, webp)</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-muted-foreground/60 shrink-0" />
                        <span>Tự động nhận diện thẻ <code className="font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-muted px-1 py-0.5 rounded text-[11px]">.priority</code></span>
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-muted-foreground/60 shrink-0" />
                        <span>Nén ảnh hàng loạt & tải ZIP nhanh</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-muted-foreground/60 shrink-0" />
                        <span>100% Offline, bảo mật an toàn MB</span>
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
          )
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
                        onClick={() => setNoticeCollapsed((v) => !v)}
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
                  onSend={handleSendMessage}
                  onStop={handleStopStream}
                  onOpenArtifacts={() => setSidebarTab("artifacts")}
                  onUploadFile={() => fileInputRef.current?.click()}
                  artifacts={artifacts}
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
  const { regularRows, totalRow } = useMemo(() => {
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
 * 2. THẺ HÀNH ĐỘNG XÁC NHẬN / PHÊ DUYỆT (ACTION CONFIRMATION CARD)
 * Khớp hoàn hảo theo Screenshot 3: Icon Calendar, Avatar stack "Will be notified", nút [Not Now] và [Approve]
 */
function EchoActionCard({
  data,
  onApprove,
  onReject,
}: {
  data: EchoActionData
  onApprove?: () => void
  onReject?: () => void
}) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending")

  const handleApprove = () => {
    setStatus("approved")
    onApprove?.()
    toast.success("Đã phê duyệt điều chỉnh thành công!")
  }

  const handleReject = () => {
    setStatus("rejected")
    onReject?.()
    toast.info("Đã tạm hoãn thao tác.")
  }

  const defaultUsers = [
    { name: "Sarah", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face" },
    { name: "Alex", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" },
    { name: "Maya", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" },
  ]
  const users = data.notified?.users && data.notified.users.length > 0 ? data.notified.users : defaultUsers

  return (
    <div className="my-3 rounded-2xl border border-neutral-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 p-4 shadow-xs space-y-3.5 max-w-xl">
      {data.title && (
        <div className="text-[13.5px] font-medium text-foreground">{data.title}</div>
      )}

      {/* Item List */}
      <div className="space-y-2.5">
        {data.items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-[13px] text-foreground">
            <Calendar className="size-4 shrink-0 text-neutral-700 dark:text-neutral-300 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold underline underline-offset-3 decoration-neutral-400 dark:decoration-neutral-600">
                {item.title}
              </span>{" "}
              <span className="text-neutral-700 dark:text-neutral-300">
                {item.action || item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Avatars + Label */}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="flex -space-x-1.5 overflow-hidden">
          {users.map((u, uIdx) => (
            <img
              key={uIdx}
              src={u.avatar}
              alt={u.name}
              className="inline-block size-5.5 rounded-full ring-2 ring-background object-cover"
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {data.notified?.label || "Will be notified"}
        </span>
      </div>

      {/* Confirmation question */}
      <div className="text-[13px] text-foreground font-normal pt-0.5">
        {data.question || "Shall I update your calendar and let them know?"}
      </div>

      {/* Action buttons or status */}
      {status === "pending" ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 py-2 px-3.5 rounded-xl border border-neutral-300 dark:border-border bg-background hover:bg-neutral-100 dark:hover:bg-muted text-xs font-medium text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="size-3.5" />
            <span>{data.rejectText || "Not Now"}</span>
          </button>
          <button
            type="button"
            onClick={handleApprove}
            className="flex-1 py-2 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground text-xs font-medium transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="size-3.5" />
            <span>{data.approveText || "Approve"}</span>
          </button>
        </div>
      ) : status === "approved" ? (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>✓ Đã phê duyệt — Đã cập nhật lịch và thông báo các thành viên liên quan.</span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic px-3 py-1.5 bg-muted/40 rounded-xl">
          Đã tạm hoãn thao tác này.
        </div>
      )}
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
 * 4. TÀI LIỆU THAM CHIẾU (REFERENCED DOCUMENTS FOOTER CHIPS)
 * Khớp hoàn hảo theo Screenshot 4 footer: "2 Documents Read" + các chip release-notes-3.4.md, release-notes-3.3.md
 */
function EchoReferencedDocs({ docs }: { docs: ReferencedDoc[] }) {
  if (!docs || docs.length === 0) return null

  return (
    <div className="mt-3 pt-1">
      <div className="text-xs font-normal text-muted-foreground mb-2">
        {docs.length} Documents Read
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {docs.map((doc, idx) => (
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
                  {it}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <div key={pIdx} className="whitespace-pre-wrap leading-relaxed">
            {trimmed}
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
        referencedDocs = JSON.parse(sourcesMatch[1])
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
          <EchoActionCard data={actionData} />
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
  }, [message.content, message.id, message.attachedArtifactName, isCopied, onCopy, isStreaming, onSendSuggestion])

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
        {(isStreaming || message.traceData || message.reasoning || message.isThinkingComplete || message.processSteps) && (
          <div className="mb-3 rounded-xl border border-neutral-200/80 dark:border-border/70 bg-white/95 dark:bg-card/95 p-3 shadow-2xs overflow-hidden">
            <AgentActivityTrace
              activeTasks={message.traceData?.activeTasks || intelligence?.activeAssignedTasks || tasks?.slice(0, 6) || []}
              summaryProjects={message.traceData?.summaryProjects || (intelligence?.delegatedTasks?.map((d) => d.task) || tasks)?.slice(0, 3) || []}
              riskProjects={message.traceData?.riskProjects || intelligence?.overdueTasks || []}
              goLiveTasks={message.traceData?.goLiveTasks || intelligence?.goLiveTasks || []}
              dominantPhaseText={message.traceData?.dominantPhaseText || intelligence?.dominantPhaseText || "khảo sát nghiệp vụ & định nghĩa đầu bài (Define)"}
              mode={message.isThinkingComplete || (!isStreaming && Boolean(message.content)) ? "inspector" : "live"}
              isRefreshing={isStreaming && !message.isThinkingComplete}
              collapsible={true}
              defaultOpen={isStreaming || !message.content}
              durationSeconds={message.thinkingDurationSeconds}
              reasoning={message.reasoning}
              finalStepLabel="Tổng hợp phản hồi AI"
              finalStepDesc="Đã sẵn sàng câu trả lời cho Designer."
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
}

const AI_COMMAND_LIST = [
  {
    id: "tiendo",
    name: "tiendo",
    title: "Tiến độ bài toán",
    description: "Tổng hợp bài toán ưu tiên Lv1/Lv2 & deadline hôm nay",
    prompt: "Tổng hợp các bài toán ưu tiên Lv1/Lv2 và deadline hôm nay",
    icon: <Sparkles className="size-3.5" />,
  },
  {
    id: "po",
    name: "po",
    title: "Rà soát PO",
    description: "Kiểm tra các bài toán PO Pending quá 24h cần đôn đốc",
    prompt: "Kiểm tra các bài toán đang PO Pending quá 24h cần đôn đốc",
    icon: <Clock className="size-3.5" />,
  },
  {
    id: "deepwork",
    name: "deepwork",
    title: "Năng suất & Họp",
    description: "Hôm nay tôi có bao nhiêu giờ Deep Work và lịch họp thế nào?",
    prompt: "Hôm nay tôi có bao nhiêu giờ Deep Work và lịch họp thế nào?",
    icon: <Activity className="size-3.5" />,
  },
  {
    id: "quychuan",
    name: "quychuan",
    title: "Quy chuẩn bàn giao",
    description: "Tóm tắt checklist chuẩn bị tài liệu bàn giao thiết kế (Ready for Dev)",
    prompt: "Tóm tắt checklist chuẩn bị tài liệu bàn giao thiết kế (Ready for Dev) cho tôi",
    icon: <BookOpen className="size-3.5" />,
  },
  {
    id: "checklist",
    name: "checklist",
    title: "Checklist khâu 7",
    description: "Checklist bàn giao Figma khâu 7 và nghiệm thu UI dev",
    prompt: "Checklist chi tiết bàn giao Figma khâu 7 cho Dev và kiểm thử UAT",
    icon: <CheckCircle2 className="size-3.5" />,
  },
]

const EchoComposerForm = React.memo(function EchoComposerForm({
  isStreaming,
  onSend,
  onStop,
  onOpenArtifacts,
  onUploadFile,
  artifacts = [],
}: EchoComposerFormProps) {
  const [text, setText] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSelectCommand = (cmd: typeof AI_COMMAND_LIST[0]) => {
    onSend(cmd.prompt)
    setText("")
    setShowCommands(false)
  }

  const handleSelectArtifact = (art: UXArtifact) => {
    const newText = text.replace(/@[^@\s]*$/, `@${art.name} `)
    setText(newText)
    setShowMentions(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="relative">
      {/* 1. Slash Command Suggestions Popup (ReUI Minimalist Monochrome Style) */}
      <AnimatePresence>
        {showCommands && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-0 mb-2 w-full sm:w-[420px] bg-background/95 dark:bg-card/95 rounded-xl border border-border shadow-lg overflow-hidden z-50 p-1.5 backdrop-blur-md select-none"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground flex items-center justify-between border-b border-border/50 mb-1">
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <CommandIcon className="size-3.5 text-muted-foreground" />
                Lệnh gợi ý điều hướng
              </span>
              <button
                type="button"
                onClick={() => setShowCommands(false)}
                className="text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div className="space-y-0.5">
              {AI_COMMAND_LIST.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectCommand(item)}
                  className="group w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <div className="size-6 rounded-md bg-muted/60 group-hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        /{item.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground/75 truncate">
                      {item.description}
                    </p>
                  </div>
                  <kbd className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-muted-foreground px-1 py-0.5 rounded bg-muted/80 border border-border shrink-0">
                    ↵
                  </kbd>
                </button>
              ))}
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
            className="absolute bottom-full left-0 mb-2 w-full sm:w-[380px] bg-background/95 dark:bg-card/95 rounded-xl border border-border shadow-lg overflow-hidden z-50 p-1.5 backdrop-blur-md select-none"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground flex items-center justify-between border-b border-border/50 mb-1">
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <AtSign className="size-3.5 text-muted-foreground" />
                Nhắc tài liệu tham chiếu
              </span>
              <button
                type="button"
                onClick={() => setShowMentions(false)}
                className="text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
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
                  className="group w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
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

      {/* Main JolyUI Interactive Container: Exact Match to Task Detail */}
      <div 
        onClick={() => textareaRef.current?.focus()}
        className="relative rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xs transition-all duration-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100/80 cursor-text"
      >
        {/* Dynamic Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => {
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
          placeholder="Nhập nội dung trao đổi... (Gõ / để gọi lệnh, @ để nhắc tên)"
          className="flex min-h-[46px] max-h-52 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none leading-relaxed"
        />

        {/* Actions Toolbar: Exact Match to Task Detail AiPromptBox */}
        <div className="flex items-center justify-between gap-2 p-0 pt-1.5 border-t border-slate-100/80 select-none">
          {/* Left Action Buttons: Send Icon & Clock Icon with divider */}
          <div className="flex items-center gap-0.5 select-none">
            {/* 1. Paperplane / Command Action Button */}
            <button
              type="button"
              onClick={() => {
                setShowCommands((v) => !v)
              }}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all cursor-pointer ${
                showCommands
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6] font-semibold"
                  : "border-transparent bg-transparent text-slate-500 hover:text-purple-600 hover:bg-purple-50/80"
              }`}
              title="Bật/Tắt lệnh điều hướng (/)"
            >
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <Send className={`h-3.5 w-3.5 ${showCommands ? "text-[#8B5CF6]" : "text-inherit"}`} />
              </div>
              <AnimatePresence>
                {showCommands && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="shrink-0 overflow-hidden whitespace-nowrap text-[#8B5CF6] text-xs font-bold"
                  >
                    Lệnh /
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Custom Divider */}
            <div className="h-4 w-[1px] bg-slate-200/80 mx-1" />

            {/* 3. Upload File Button */}
            <button
              type="button"
              onClick={onUploadFile}
              className="flex h-8 items-center gap-1.5 rounded-full border border-transparent bg-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50/80 px-2 py-1 text-xs transition-all cursor-pointer"
              title="Tải lên tài liệu (.md, .pdf, .json, .csv)"
            >
              <Upload className="size-3.5" />
            </button>

            {/* 4. Artifacts Library Button */}
            <button
              type="button"
              onClick={onOpenArtifacts}
              className="flex h-8 items-center gap-1.5 rounded-full border border-transparent bg-transparent text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/80 px-2 py-1 text-xs transition-all cursor-pointer"
              title="Mở thư viện tài liệu Artifacts"
            >
              <FileText className="size-3.5" />
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
