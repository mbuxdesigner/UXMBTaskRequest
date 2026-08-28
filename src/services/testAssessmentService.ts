import * as XLSX from "xlsx"
import { TestExam, Question, QuestionOption, TestSubmission, UserAnswer } from "../types/testAssessment"

const STORAGE_KEY_TESTS = "mbbank_test_exams"
const STORAGE_KEY_SUBMISSIONS = "mbbank_test_submissions"

// Initial Seed Data: Đề thi mẫu chuyên môn UX/UI MBBank
export const INITIAL_SEED_TESTS: TestExam[] = [
  {
    id: "TEST_UX_CORE_01",
    title: "Đánh giá Năng lực UX Core & Design System MB 2026",
    description: "Bài kiểm tra chuyên môn định kỳ dành cho Product Designer về Tư duy sản phẩm số, Heuristic Evaluation, Accessibility (WCAG 2.2) và Design System MB.",
    category: "Chuyên môn UX/UI",
    timeLimitMinutes: 30,
    passingScore: 7,
    totalPoints: 10,
    totalQuestions: 6,
    mcqCount: 4,
    essayCount: 2,
    status: "Active",
    createdAt: "2026-02-15 09:00:00",
    createdBy: "Admin UX Team",
    questions: [
      {
        id: "Q1",
        order: 1,
        type: "trac_nghiem",
        question: "Theo tiêu chuẩn WCAG 2.2 cấp độ AA, tỷ lệ tương phản màu (Color Contrast Ratio) tối thiểu đối với văn bản thông thường (Normal text) là bao nhiêu?",
        options: [
          { key: "A", text: "3.0 : 1" },
          { key: "B", text: "4.5 : 1" },
          { key: "C", text: "7.0 : 1" },
          { key: "D", text: "2.5 : 1" },
        ],
        correctAnswer: "B",
        points: 1.5,
        explanation: "WCAG AA yêu cầu độ tương phản tối thiểu 4.5:1 cho body text và 3:1 cho large text.",
      },
      {
        id: "Q2",
        order: 2,
        type: "trac_nghiem",
        question: "Trong quy trình Handoff thiết kế cho Developer tại MB, trạng thái nào trong Design Tokens bắt buộc phải có để tránh lệch layout trên đa nền tảng (iOS/Android/Web)?",
        options: [
          { key: "A", text: "Chỉ cần export file SVG thuần" },
          { key: "B", text: "Auto-layout spacing token (8-point grid system)" },
          { key: "C", text: "Chụp ảnh màn hình Figma gửi qua Teams" },
          { key: "D", text: "Không cần token nếu dev có inspect tool" },
        ],
        correctAnswer: "B",
        points: 1.5,
        explanation: "Hệ thống Spacing tokens theo 8-point grid giúp UI dev đồng bộ chính xác trên cả Flutter, Native và Web.",
      },
      {
        id: "Q3",
        order: 3,
        type: "trac_nghiem",
        question: "Khi người dùng gặp lỗi giao dịch chuyển tiền gián đoạn (Network Timeout), giải pháp UX xử lý lỗi (Error Recovery) nào sau đây là TỐT NHẤT?",
        options: [
          { key: "A", text: "Hiện alert báo 'Lỗi 500: Server Error' kèm nút Đóng" },
          { key: "B", text: "Tự động trừ tiền và thông báo người dùng gọi tổng đài" },
          { key: "C", text: "Thông báo rõ trạng thái giao dịch, cung cấp nút 'Kiểm tra trạng thái' và 'Thử lại an toàn' không gây trừ tiền 2 lần" },
          { key: "D", text: "Chuyển hướng người dùng về màn hình đăng nhập" },
        ],
        correctAnswer: "C",
        points: 1.5,
        explanation: "Error recovery trong Banking cần giảm lo lắng của user, tránh giao dịch trùng lặp và cung cấp hướng giải quyết rõ ràng.",
      },
      {
        id: "Q4",
        order: 4,
        type: "trac_nghiem",
        question: "Định luật UX nào phát biểu rằng 'Thời gian để đưa ra quyết định tăng theo số lượng và độ phức tạp của các lựa chọn'?",
        options: [
          { key: "A", text: "Fitts's Law" },
          { key: "B", text: "Hick's Law" },
          { key: "C", text: "Jakob's Law" },
          { key: "D", text: "Miller's Law" },
        ],
        correctAnswer: "B",
        points: 1.5,
        explanation: "Hick's Law chứng minh càng nhiều lựa chọn thì người dùng càng mất nhiều thời gian cân nhắc.",
      },
      {
        id: "Q5",
        order: 5,
        type: "tu_luan",
        question: "[Tự luận] Hãy phân tích và đề xuất giải pháp tối ưu trải nghiệm (UX) cho tính năng 'Vay thấu chi nhanh trên App MB' đối với nhóm khách hàng lần đầu tiếp cận sản phẩm tài chính số. Nêu rõ các bước trong luồng (Flow) và điểm chạm giảm thiểu Drop-off.",
        points: 2.0,
        explanation: "Đánh giá khả năng phân tích user journey, giải quyết pain points và xây dựng trust markers cho sản phẩm Lending.",
      },
      {
        id: "Q6",
        order: 6,
        type: "tu_luan",
        question: "[Tự luận] Khi xảy ra mâu thuẫn giữa yêu cầu nghiệp vụ (Business/PO muốn hiển thị rất nhiều thông tin khuyến mãi/banner lên trang chủ) và nguyên lý UX (tinh gọn, tối ưu tốc độ tác vụ chính), bạn sẽ phối hợp giải quyết thế nào?",
        points: 2.0,
        explanation: "Đánh giá kỹ năng Stakeholder Management, Data-driven Design và A/B Testing.",
      },
    ],
  },
]

// Initial Seed Submissions: Kết quả mẫu để hiển thị ngay bảng điểm
export const INITIAL_SEED_SUBMISSIONS: TestSubmission[] = [
  {
    id: "SUB_20260220_001",
    testId: "TEST_UX_CORE_01",
    testTitle: "Đánh giá Năng lực UX Core & Design System MB 2026",
    userEmail: "hoangnam.le@mbbank.com.vn",
    userName: "Lê Hoàng Nam",
    userSquad: "Cards & Digital Payment",
    userRole: "Designer",
    startedAt: "2026-02-20 14:00:00",
    submittedAt: "2026-02-20 14:24:15",
    timeSpentSeconds: 1455,
    scoreMcq: 6.0,
    scoreEssay: 3.5,
    totalScore: 9.5,
    maxScore: 10,
    percentage: 95,
    status: "Đã hoàn thành",
    gradedAt: "2026-02-20 16:30:00",
    gradedBy: "Trưởng nhóm UX MB",
    answers: [
      {
        questionId: "Q1",
        type: "trac_nghiem",
        questionText: "Theo tiêu chuẩn WCAG 2.2 cấp độ AA, tỷ lệ tương phản màu...",
        selectedOption: "B",
        selectedOptionText: "4.5 : 1",
        isCorrect: true,
        earnedPoints: 1.5,
        maxPoints: 1.5,
      },
      {
        questionId: "Q2",
        type: "trac_nghiem",
        questionText: "Trong quy trình Handoff thiết kế cho Developer...",
        selectedOption: "B",
        selectedOptionText: "Auto-layout spacing token (8-point grid system)",
        isCorrect: true,
        earnedPoints: 1.5,
        maxPoints: 1.5,
      },
      {
        questionId: "Q3",
        type: "trac_nghiem",
        questionText: "Khi người dùng gặp lỗi giao dịch chuyển tiền gián đoạn...",
        selectedOption: "C",
        selectedOptionText: "Thông báo rõ trạng thái giao dịch, cung cấp nút kiểm tra...",
        isCorrect: true,
        earnedPoints: 1.5,
        maxPoints: 1.5,
      },
      {
        questionId: "Q4",
        type: "trac_nghiem",
        questionText: "Định luật UX nào phát biểu rằng...",
        selectedOption: "B",
        selectedOptionText: "Hick's Law",
        isCorrect: true,
        earnedPoints: 1.5,
        maxPoints: 1.5,
      },
      {
        questionId: "Q5",
        type: "tu_luan",
        questionText: "[Tự luận] Hãy phân tích và đề xuất giải pháp tối ưu trải nghiệm cho tính năng Vay thấu chi...",
        essayAnswer: "Em đề xuất chia nhỏ thành 3 bước Progressive Disclosure: 1. Ước tính hạn mức & lãi suất minh bạch với thanh trượt trực quan. 2. Xác thực KYC tự động không bắt nhập lại CCCD. 3. Màn hình tóm tắt cam kết rõ ràng trước khi ký số OTP.",
        earnedPoints: 1.8,
        maxPoints: 2.0,
        adminFeedback: "Tư duy luồng rất tốt, đã áp dụng đúng nguyên lý giảm tải nhận thức (Cognitive Load). Cần bổ sung thêm cơ chế preview hợp đồng PDF.",
        gradedBy: "Trưởng nhóm UX MB",
      },
      {
        questionId: "Q6",
        type: "tu_luan",
        questionText: "[Tự luận] Khi xảy ra mâu thuẫn giữa yêu cầu nghiệp vụ và nguyên lý UX...",
        essayAnswer: "Em sẽ sử dụng phương pháp Contextual Promotion (hiển thị banner đúng ngữ cảnh giao dịch của user thay vì nhồi nhét ở Home), kết hợp chạy A/B Testing 14 ngày để so sánh tỷ lệ chuyển đổi và tỷ lệ thoát trang.",
        earnedPoints: 1.7,
        maxPoints: 2.0,
        adminFeedback: "Rất chuyên nghiệp và định hướng data-driven!",
        gradedBy: "Trưởng nhóm UX MB",
      },
    ],
  },
  {
    id: "SUB_20260222_002",
    testId: "TEST_UX_CORE_01",
    testTitle: "Đánh giá Năng lực UX Core & Design System MB 2026",
    userEmail: "nguyenvan.a@mbbank.com.vn",
    userName: "Nguyễn Văn An",
    userSquad: "Lending & Vay vốn",
    userRole: "Designer",
    startedAt: "2026-02-22 10:15:00",
    submittedAt: "2026-02-22 10:42:10",
    timeSpentSeconds: 1630,
    scoreMcq: 4.5,
    scoreEssay: 0,
    totalScore: 4.5,
    maxScore: 10,
    percentage: 45,
    status: "Chờ chấm tự luận",
    answers: [
      {
        questionId: "Q1",
        type: "trac_nghiem",
        questionText: "Theo tiêu chuẩn WCAG 2.2 cấp độ AA...",
        selectedOption: "B",
        selectedOptionText: "4.5 : 1",
        isCorrect: true,
        earnedPoints: 1.5,
        maxPoints: 1.5,
      },
      {
        questionId: "Q2",
        type: "trac_nghiem",
        questionText: "Trong quy trình Handoff thiết kế...",
        selectedOption: "A",
        selectedOptionText: "Chỉ cần export file SVG thuần",
        isCorrect: false,
        earnedPoints: 0,
        maxPoints: 1.5,
      },
      {
        questionId: "Q3",
        type: "trac_nghiem",
        questionText: "Khi người dùng gặp lỗi giao dịch chuyển tiền...",
        selectedOption: "C",
        selectedOptionText: "Thông báo rõ trạng thái giao dịch...",
        isCorrect: true,
        earnedPoints: 1.5,
        maxPoints: 1.5,
      },
      {
        questionId: "Q4",
        type: "trac_nghiem",
        questionText: "Định luật UX nào phát biểu rằng...",
        selectedOption: "B",
        selectedOptionText: "Hick's Law",
        isCorrect: true,
        earnedPoints: 1.5,
        maxPoints: 1.5,
      },
      {
        questionId: "Q5",
        type: "tu_luan",
        questionText: "[Tự luận] Hãy phân tích và đề xuất giải pháp tối ưu...",
        essayAnswer: "Tối ưu bằng cách đặt nút Đăng ký nổi bật ngay trên trang chủ. Bỏ bớt các bước xác minh để người dùng nhận tiền nhanh nhất.",
        earnedPoints: 0,
        maxPoints: 2.0,
      },
      {
        questionId: "Q6",
        type: "tu_luan",
        questionText: "[Tự luận] Khi xảy ra mâu thuẫn giữa yêu cầu nghiệp vụ...",
        essayAnswer: "Thực hiện theo chỉ đạo của PO và Trưởng phòng, sau đó theo dõi phản hồi của khách hàng qua hotline.",
        earnedPoints: 0,
        maxPoints: 2.0,
      },
    ],
  },
]

// ==========================================
// 1. LOCAL STORAGE STORAGE & SYNC API
// ==========================================

export function getStoredTests(): TestExam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TESTS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TESTS, JSON.stringify(INITIAL_SEED_TESTS))
      return INITIAL_SEED_TESTS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SEED_TESTS
  } catch {
    return INITIAL_SEED_TESTS
  }
}

export function saveStoredTests(tests: TestExam[]) {
  try {
    localStorage.setItem(STORAGE_KEY_TESTS, JSON.stringify(tests))
    window.dispatchEvent(new Event("test_exams_updated"))
  } catch (err) {
    console.error("Failed to save tests to localStorage:", err)
  }
}

export function getStoredSubmissions(): TestSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(INITIAL_SEED_SUBMISSIONS))
      return INITIAL_SEED_SUBMISSIONS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SEED_SUBMISSIONS
  } catch {
    return INITIAL_SEED_SUBMISSIONS
  }
}

export function saveStoredSubmissions(submissions: TestSubmission[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions))
    window.dispatchEvent(new Event("test_submissions_updated"))
  } catch (err) {
    console.error("Failed to save submissions to localStorage:", err)
  }
}

// ==========================================
// 2. EXCEL PARSER & TEMPLATE GENERATOR
// ==========================================

/**
 * Phân tích file Excel (.xlsx / .csv) tải lên thành mảng câu hỏi chuẩn
 */
export async function parseTestExcelFile(file: File): Promise<{
  questions: Question[]
  totalPoints: number
  mcqCount: number
  essayCount: number
  warnings: string[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          throw new Error("File Excel không có dữ liệu Sheet nào!")
        }

        const worksheet = workbook.Sheets[firstSheetName]
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

        if (!rows || rows.length === 0) {
          throw new Error("Sheet đầu tiên trong file Excel đang trống!")
        }

        const questions: Question[] = []
        const warnings: string[] = []
        let totalPoints = 0
        let mcqCount = 0
        let essayCount = 0

        rows.forEach((row, index) => {
          const rowNum = index + 2 // Dòng trong Excel (bắt đầu từ 2 do dòng 1 là Header)

          // Chuẩn hóa tên cột
          const rawType = String(row["Type"] || row["Loai_Cau_Hoi"] || row["Loại câu hỏi"] || "").trim().toLowerCase()
          const questionText = String(row["Question"] || row["Cau_Hoi"] || row["Nội dung câu hỏi"] || "").trim()
          const optA = String(row["Option_A"] || row["Dap_An_A"] || row["Lựa chọn A"] || "").trim()
          const optB = String(row["Option_B"] || row["Dap_An_B"] || row["Lựa chọn B"] || "").trim()
          const optC = String(row["Option_C"] || row["Dap_An_C"] || row["Lựa chọn C"] || "").trim()
          const optD = String(row["Option_D"] || row["Dap_An_D"] || row["Lựa chọn D"] || "").trim()
          const rawCorrect = String(row["Correct_Answer"] || row["Dap_An_Dung"] || row["Đáp án đúng"] || "").trim().toUpperCase()
          const rawPoints = parseFloat(row["Points"] || row["Diem"] || row["Điểm"] || "1")
          const explanation = String(row["Explanation"] || row["Giai_Thich"] || row["Giải thích"] || "").trim()

          if (!questionText) {
            warnings.push(`Dòng ${rowNum}: Bỏ qua do nội dung câu hỏi bị trống.`)
            return
          }

          const points = isNaN(rawPoints) || rawPoints <= 0 ? 1 : rawPoints

          // Phân loại: Trắc nghiệm hay Tự luận
          const isMcq = rawType.includes("trac_nghiem") || rawType.includes("mcq") || rawType.includes("trắc nghiệm") || !!optA

          if (isMcq) {
            if (!optA || !optB) {
              warnings.push(`Dòng ${rowNum}: Câu trắc nghiệm phải có ít nhất Lựa chọn A và Lựa chọn B.`)
              return
            }

            const options: QuestionOption[] = [
              { key: "A", text: optA },
              { key: "B", text: optB },
            ]
            if (optC) options.push({ key: "C", text: optC })
            if (optD) options.push({ key: "D", text: optD })

            let correctAnswer: "A" | "B" | "C" | "D" = "A"
            if (["A", "B", "C", "D"].includes(rawCorrect)) {
              correctAnswer = rawCorrect as "A" | "B" | "C" | "D"
            } else {
              warnings.push(`Dòng ${rowNum}: Đáp án đúng không hợp lệ (${rawCorrect}), đã mặc định là A.`)
            }

            questions.push({
              id: `Q${questions.length + 1}`,
              order: questions.length + 1,
              type: "trac_nghiem",
              question: questionText,
              options,
              correctAnswer,
              points,
              explanation,
            })
            mcqCount++
          } else {
            // Tự luận
            questions.push({
              id: `Q${questions.length + 1}`,
              order: questions.length + 1,
              type: "tu_luan",
              question: questionText,
              points,
              explanation,
            })
            essayCount++
          }

          totalPoints += points
        })

        if (questions.length === 0) {
          throw new Error("Không trích xuất được câu hỏi hợp lệ nào từ file Excel!")
        }

        resolve({
          questions,
          totalPoints: Math.round(totalPoints * 10) / 10,
          mcqCount,
          essayCount,
          warnings,
        })
      } catch (err: any) {
        reject(err)
      }
    }

    reader.onerror = () => {
      reject(new Error("Lỗi khi đọc file!"))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Tạo và tải xuống file Excel mẫu chuẩn (.xlsx)
 */
export function downloadExcelTemplate() {
  const templateData = [
    {
      Type: "trac_nghiem",
      Question: "Tiêu chuẩn tỷ lệ tương phản màu (Color Contrast) WCAG 2.2 AA cho body text là bao nhiêu?",
      Option_A: "3.0 : 1",
      Option_B: "4.5 : 1",
      Option_C: "7.0 : 1",
      Option_D: "2.0 : 1",
      Correct_Answer: "B",
      Points: 1.5,
      Explanation: "WCAG AA quy định 4.5:1 cho text thường.",
    },
    {
      Type: "trac_nghiem",
      Question: "Định luật Fitts trong thiết kế UI liên quan đến yếu tố nào sau đây?",
      Option_A: "Thời gian chạm tới đối tượng dựa vào khoảng cách và kích thước nút",
      Option_B: "Số lượng mục người dùng có thể ghi nhớ trong bộ nhớ ngắn hạn",
      Option_C: "Mức độ hài lòng của người dùng khi nhìn thấy màu xanh lá",
      Option_D: "Tốc độ tải trang trên mạng 4G",
      Correct_Answer: "A",
      Points: 1.5,
      Explanation: "Fitts's Law quy định kích thước và khoảng cách tương tác của target.",
    },
    {
      Type: "tu_luan",
      Question: "[Tự luận] Hãy nêu 3 điểm khác biệt chính khi thiết kế trải nghiệm cho sản phẩm B2B Portal so với App B2C dành cho người dùng cá nhân tại MB?",
      Option_A: "",
      Option_B: "",
      Option_C: "",
      Option_D: "",
      Correct_Answer: "",
      Points: 3.5,
      Explanation: "Đánh giá kiến thức phân cấp quyền hạn, luồng phê duyệt đa tầng và mật độ dữ liệu (Data density).",
    },
    {
      Type: "tu_luan",
      Question: "[Tự luận] Đề xuất quy trình phối hợp giữa UX Designer và Frontend Developer để đảm bảo 100% Design QA trước khi release production.",
      Option_A: "",
      Option_B: "",
      Option_C: "",
      Option_D: "",
      Correct_Answer: "",
      Points: 3.5,
      Explanation: "Đánh giá quy trình Handoff, Design QA checklist và phối hợp liên phòng ban.",
    },
  ]

  const ws = XLSX.utils.json_to_sheet(templateData)
  
  // Tùy chỉnh độ rộng cột
  ws["!cols"] = [
    { wch: 15 }, // Type
    { wch: 45 }, // Question
    { wch: 25 }, // Option_A
    { wch: 25 }, // Option_B
    { wch: 25 }, // Option_C
    { wch: 25 }, // Option_D
    { wch: 15 }, // Correct_Answer
    { wch: 10 }, // Points
    { wch: 30 }, // Explanation
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Mau_Cau_Hoi_Test")
  XLSX.writeFile(wb, "Mau_De_Thi_Danh_Gia_UXTeam_MB.xlsx")
}

// ==========================================
// 3. CHẤM BÀI VÀ ĐỒNG BỘ GOOGLE APPS SCRIPT
// ==========================================

export async function submitUserExam(
  test: TestExam,
  user: { email: string; name: string; squad?: string; role?: string },
  answers: { questionId: string; selectedOption?: "A" | "B" | "C" | "D"; essayAnswer?: string }[],
  timeSpentSeconds: number
): Promise<TestSubmission> {
  let scoreMcq = 0
  let earnedTotal = 0

  const userAnswers: UserAnswer[] = test.questions.map((q) => {
    const userAns = answers.find((a) => a.questionId === q.id)

    if (q.type === "trac_nghiem") {
      const selected = userAns?.selectedOption
      const optText = q.options?.find((o) => o.key === selected)?.text || ""
      const isCorrect = !!selected && selected === q.correctAnswer
      const earned = isCorrect ? q.points : 0
      scoreMcq += earned
      earnedTotal += earned

      return {
        questionId: q.id,
        type: "trac_nghiem",
        questionText: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        selectedOption: selected,
        selectedOptionText: optText,
        isCorrect,
        earnedPoints: earned,
        maxPoints: q.points,
      }
    } else {
      // Tự luận (chưa chấm điểm)
      return {
        questionId: q.id,
        type: "tu_luan",
        questionText: q.question,
        essayAnswer: userAns?.essayAnswer || "",
        earnedPoints: 0,
        maxPoints: q.points,
      }
    }
  })

  const hasEssay = test.essayCount > 0
  const submissionStatus = hasEssay ? "Chờ chấm tự luận" : "Đã hoàn thành"
  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19)

  const newSubmission: TestSubmission = {
    id: `SUB_${Date.now()}`,
    testId: test.id,
    testTitle: test.title,
    userEmail: user.email,
    userName: user.name,
    userSquad: user.squad || "Chưa gán",
    userRole: user.role || "Designer",
    startedAt: nowStr,
    submittedAt: nowStr,
    timeSpentSeconds,
    scoreMcq: Math.round(scoreMcq * 10) / 10,
    scoreEssay: 0,
    totalScore: Math.round(scoreMcq * 10) / 10,
    maxScore: test.totalPoints,
    percentage: Math.round((scoreMcq / test.totalPoints) * 100),
    status: submissionStatus,
    answers: userAnswers,
  }

  // Lưu vào LocalStorage
  const existing = getStoredSubmissions()
  saveStoredSubmissions([newSubmission, ...existing])

  // Đồng bộ lên Google Sheets Backend nếu có cấu hình
  try {
    const rawUrl = localStorage.getItem("google_app_script_url") || localStorage.getItem("sync_sheet_url")
    if (rawUrl) {
      fetch(rawUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_test",
          submission: newSubmission,
        }),
      }).catch((e) => console.warn("Background sheet sync submission failed:", e))
    }
  } catch {}

  return newSubmission
}

/**
 * Admin chấm điểm câu tự luận
 */
export function gradeEssaySubmission(
  submissionId: string,
  essayGrades: { questionId: string; earnedPoints: number; feedback?: string }[],
  adminName: string
): TestSubmission | null {
  const submissions = getStoredSubmissions()
  const idx = submissions.findIndex((s) => s.id === submissionId)
  if (idx === -1) return null

  const sub = submissions[idx]
  let totalEssayScore = 0

  const updatedAnswers = sub.answers.map((ans) => {
    if (ans.type === "tu_luan") {
      const grade = essayGrades.find((g) => g.questionId === ans.questionId)
      if (grade) {
        const p = Math.min(Math.max(0, grade.earnedPoints), ans.maxPoints)
        totalEssayScore += p
        return {
          ...ans,
          earnedPoints: p,
          adminFeedback: grade.feedback || "",
          gradedBy: adminName,
        }
      }
    }
    return ans
  })

  const totalScore = Math.round((sub.scoreMcq + totalEssayScore) * 10) / 10
  const percentage = Math.round((totalScore / sub.maxScore) * 100)
  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19)

  const updatedSubmission: TestSubmission = {
    ...sub,
    answers: updatedAnswers,
    scoreEssay: Math.round(totalEssayScore * 10) / 10,
    totalScore,
    percentage,
    status: "Đã hoàn thành",
    gradedAt: nowStr,
    gradedBy: adminName,
  }

  submissions[idx] = updatedSubmission
  saveStoredSubmissions(submissions)

  // Đồng bộ lên Google Sheets
  try {
    const rawUrl = localStorage.getItem("google_app_script_url") || localStorage.getItem("sync_sheet_url")
    if (rawUrl) {
      fetch(rawUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade_essay",
          submissionId,
          updatedSubmission,
        }),
      }).catch((e) => console.warn("Background sheet sync grade failed:", e))
    }
  } catch {}

  return updatedSubmission
}
