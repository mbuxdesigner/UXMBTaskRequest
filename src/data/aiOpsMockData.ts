export interface AiOpsKpiCard {
  id: string
  title: string
  icon: string
  value: string
  unit?: string
  trend: {
    value: string
    isUp: boolean
    variant: "success" | "info" | "warning" | "destructive"
  }
  description: string
  footerLabel: string
  footerValue: string
}

export interface TimelineAssignee {
  id: string
  name: string
  initials: string
  avatar?: string
}

export interface TimelineFeedback {
  priority: "High" | "Medium" | "Low"
  status: "Healthy" | "Watching" | "Blocked"
  surface: string
  title: string
  description: string
  comments: number
  due: string
  assignees: TimelineAssignee[]
  overflowCount: number
}

export interface TimelineItem {
  id: number
  title: string
  status: "completed" | "active" | "pending"
  owner: {
    name: string
    role: string
    avatar: string
  }
  feedback: TimelineFeedback
}

export interface TokenActivityPoint {
  time: string
  input: number
  output: number
  blocked: number
}

export interface RoutingRule {
  id: string
  reference: string
  updated: string
  rule: string
  provider: string
  category: string
  kind: "fallback" | "guardrail" | "primary" | "batch"
  scope: string
  dailyTokens: number
  latency: string
  status: "healthy" | "at_risk" | "paused" | "blocked"
}

export const aiOpsKpiCards: AiOpsKpiCard[] = [
  {
    id: "provider-health",
    title: "Provider Health",
    icon: "database",
    value: "99.94",
    unit: "%",
    trend: {
      value: "+0.41%",
      isUp: true,
      variant: "success",
    },
    description: "4 providers healthy at 09:45.",
    footerLabel: "Failover ready:",
    footerValue: "2 pools",
  },
  {
    id: "token-volume",
    title: "Token Volume",
    icon: "brain",
    value: "48.2",
    unit: "M",
    trend: {
      value: "+12.6%",
      isUp: true,
      variant: "info",
    },
    description: "Support Reply Draft used 2.4M today.",
    footerLabel: "Daily budget:",
    footerValue: "61%",
  },
  {
    id: "safety-drift",
    title: "Safety Drift",
    icon: "shield-check",
    value: "3",
    unit: " policies",
    trend: {
      value: "-18.0%",
      isUp: false,
      variant: "warning",
    },
    description: "PII Redaction review due by 14:00.",
    footerLabel: "Review SLA:",
    footerValue: "6h",
  },
]

export const timelineItems: TimelineItem[] = [
  {
    id: 1,
    title: "Primary Provider",
    status: "completed",
    owner: {
      name: "Leo Grant",
      role: "Platform engineer",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    },
    feedback: {
      priority: "High",
      status: "Healthy",
      surface: "OpenRoute Primary",
      title: "Primary pool serving 78 percent",
      description: "p95 latency held at 910ms through 09:45.",
      comments: 5,
      due: "11:00",
      assignees: [
        {
          id: "leo-grant",
          name: "Leo Grant",
          initials: "LG",
          avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
        },
        {
          id: "kenji-tan",
          name: "Kenji Tan",
          initials: "KT",
          avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=96&h=96&dpr=2&q=80",
        },
      ],
      overflowCount: 1,
    },
  },
  {
    id: 2,
    title: "Fallback Routing",
    status: "active",
    owner: {
      name: "Mira Stone",
      role: "AI product operator",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    },
    feedback: {
      priority: "Medium",
      status: "Watching",
      surface: "Northstar Claude Pool",
      title: "Long context summaries rerouted",
      description: "ROUTE-318 shifted 18 percent at 09:20.",
      comments: 3,
      due: "Today",
      assignees: [
        {
          id: "mira-stone",
          name: "Mira Stone",
          initials: "MS",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
        },
        {
          id: "theo-park",
          name: "Theo Park",
          initials: "TP",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
        },
      ],
      overflowCount: 2,
    },
  },
  {
    id: 3,
    title: "Guardrail Runner",
    status: "pending",
    owner: {
      name: "Nora Vale",
      role: "Safety reviewer",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    },
    feedback: {
      priority: "Low",
      status: "Blocked",
      surface: "Local Guardrail Runner",
      title: "Medical refusal guard pending",
      description: "SAFE-0914 needs 6 examples before 16:00.",
      comments: 2,
      due: "16:00",
      assignees: [
        {
          id: "nora-vale",
          name: "Nora Vale",
          initials: "NV",
          avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
        },
        {
          id: "elijah-morgan",
          name: "Elijah Morgan",
          initials: "EM",
        },
      ],
      overflowCount: 0,
    },
  },
]

export const tokenActivityData: Record<"7d" | "30d" | "90d", TokenActivityPoint[]> = {
  "7d": [
    { time: "Thu", input: 32, output: 14, blocked: 3 },
    { time: "Fri", input: 38, output: 16, blocked: 4 },
    { time: "Sat", input: 29, output: 11, blocked: 2 },
    { time: "Sun", input: 25, output: 10, blocked: 2 },
    { time: "Mon", input: 41, output: 18, blocked: 5 },
    { time: "Tue", input: 46, output: 20, blocked: 6 },
    { time: "Wed", input: 48, output: 22, blocked: 4 },
  ],
  "30d": [
    { time: "May 13", input: 112, output: 48, blocked: 9 },
    { time: "May 18", input: 128, output: 54, blocked: 11 },
    { time: "May 23", input: 146, output: 62, blocked: 13 },
    { time: "May 28", input: 139, output: 58, blocked: 10 },
    { time: "Jun 2", input: 164, output: 71, blocked: 12 },
    { time: "Jun 7", input: 181, output: 79, blocked: 15 },
    { time: "Jun 11", input: 196, output: 84, blocked: 14 },
  ],
  "90d": [
    { time: "Mar", input: 430, output: 184, blocked: 35 },
    { time: "Mar 15", input: 486, output: 206, blocked: 41 },
    { time: "Apr", input: 522, output: 224, blocked: 38 },
    { time: "Apr 15", input: 548, output: 238, blocked: 44 },
    { time: "May", input: 612, output: 264, blocked: 49 },
    { time: "May 15", input: 668, output: 291, blocked: 53 },
    { time: "Jun", input: 721, output: 318, blocked: 58 },
  ],
}

export const routingRules: RoutingRule[] = [
  {
    id: "rule-001",
    reference: "ROUTE-324",
    updated: "Jun 8, 2026",
    rule: "Renewal risk summary",
    provider: "Northstar Claude Pool",
    category: "Long Context",
    kind: "fallback",
    scope: "Support",
    dailyTokens: 3200000,
    latency: "2.1s p95",
    status: "healthy",
  },
  {
    id: "rule-002",
    reference: "ROUTE-323",
    updated: "Jun 9, 2026",
    rule: "Payment action review",
    provider: "Local Guardrail Runner",
    category: "Safety",
    kind: "guardrail",
    scope: "Finance",
    dailyTokens: 1260000,
    latency: "680ms p95",
    status: "blocked",
  },
  {
    id: "rule-003",
    reference: "ROUTE-322",
    updated: "Jun 9, 2026",
    rule: "Nightly account summary",
    provider: "Batch Summarizer Fleet",
    category: "Batch",
    kind: "batch",
    scope: "Platform",
    dailyTokens: 840000,
    latency: "8.4s p95",
    status: "paused",
  },
  {
    id: "rule-004",
    reference: "ROUTE-321",
    updated: "Jun 10, 2026",
    rule: "Invoice variance explainer",
    provider: "VectorEdge Small",
    category: "Finance",
    kind: "primary",
    scope: "Finance",
    dailyTokens: 1830000,
    latency: "740ms p95",
    status: "healthy",
  },
  {
    id: "rule-005",
    reference: "ROUTE-320",
    updated: "Jun 10, 2026",
    rule: "Support reply drafts",
    provider: "OpenRoute Primary",
    category: "Drafting",
    kind: "primary",
    scope: "Support",
    dailyTokens: 2410000,
    latency: "910ms p95",
    status: "healthy",
  },
  {
    id: "rule-006",
    reference: "ROUTE-319",
    updated: "Jun 11, 2026",
    rule: "High risk requests",
    provider: "Local Guardrail Runner",
    category: "Safety",
    kind: "guardrail",
    scope: "Safety",
    dailyTokens: 4200000,
    latency: "620ms p95",
    status: "at_risk",
  },
  {
    id: "rule-007",
    reference: "ROUTE-318",
    updated: "Jun 11, 2026",
    rule: "Long context summaries",
    provider: "Northstar Claude Pool",
    category: "Long Context",
    kind: "fallback",
    scope: "Support",
    dailyTokens: 18400000,
    latency: "1.8s p95",
    status: "healthy",
  },
]
