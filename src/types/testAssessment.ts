export type QuestionType = "trac_nghiem" | "tu_luan"

export interface QuestionOption {
  key: "A" | "B" | "C" | "D"
  text: string
}

export interface Question {
  id: string
  order: number
  type: QuestionType
  question: string
  options?: QuestionOption[]
  correctAnswer?: "A" | "B" | "C" | "D" // Chỉ có ở trắc nghiệm
  points: number
  explanation?: string
}

export interface TestExam {
  id: string
  title: string
  description: string
  category?: string
  targetSquads?: string[]
  timeLimitMinutes: number // Thời gian làm bài (phút)
  passingScore?: number // Điểm tối thiểu đạt
  totalPoints: number
  totalQuestions: number
  mcqCount: number
  essayCount: number
  questions: Question[]
  status: "Active" | "Draft" | "Closed"
  createdAt: string
  createdBy: string
}

export interface UserAnswer {
  questionId: string
  type: QuestionType
  questionText: string
  options?: QuestionOption[]
  correctAnswer?: "A" | "B" | "C" | "D"
  explanation?: string
  selectedOption?: "A" | "B" | "C" | "D" // Trắc nghiệm
  selectedOptionText?: string
  essayAnswer?: string // Tự luận
  isCorrect?: boolean // Trắc nghiệm tự chấm
  earnedPoints: number
  maxPoints: number
  adminFeedback?: string // Nhận xét khi chấm tự luận
  gradedBy?: string
}

export interface TestSubmission {
  id: string
  testId: string
  testTitle: string
  userEmail: string
  userName: string
  userSquad?: string
  userRole?: string
  startedAt: string
  submittedAt: string
  timeSpentSeconds: number
  scoreMcq: number // Điểm trắc nghiệm (hệ thống tự chấm)
  scoreEssay: number // Điểm tự luận (Admin chấm)
  totalScore: number // Tổng điểm hiện tại
  maxScore: number // Điểm tối đa của đề thi
  percentage: number // Tỉ lệ %
  status: "Chờ chấm tự luận" | "Đã hoàn thành"
  answers: UserAnswer[]
  gradedAt?: string
  gradedBy?: string
}
