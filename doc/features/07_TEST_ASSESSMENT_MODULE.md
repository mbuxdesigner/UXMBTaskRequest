# 🎓 TÍNH NĂNG 07: PHÂN HỆ KHẢO SÁT & ĐÁNH GIÁ NĂNG LỰC UX (TEST ASSESSMENT MODULE)

> **Mục tiêu tính năng:** Cung cấp bộ công cụ khảo sát và sát hạch chuyên môn UX/UI dành cho đội ngũ nhân sự nội bộ hoặc ứng viên tuyển dụng, bao gồm làm bài trắc nghiệm tính giờ, tự động chấm điểm, phân tích ma trận kỹ năng và hỗ trợ Import/Export bộ đề thi qua file Excel bằng thư viện `XLSX` (SheetJS).

---

## 🎯 1. KHI NÀO CẦN ĐỌC TÀI LIỆU NÀY?

- **Khi làm tính năng mới:**
  - Bổ sung loại câu hỏi mới (ví dụ: Câu hỏi tự luận dán link Figma, Câu hỏi nhiều đáp án đúng Multi-select).
  - Tích hợp thêm báo cáo phân tích năng lực chi tiết (Radar Chart biểu đồ hình nhện đánh giá năng lực UX).
  - Thêm chức năng lưu chứng chỉ hoàn thành bài test dưới dạng file PDF/Hình ảnh.
  - Tích hợp gửi kết quả điểm thi về Email hoặc Teams của Lead.
- **Khi sửa tính năng cũ:**
  - Lỗi khi Import đề thi từ file Excel (bị sai cột, thiếu đáp án hoặc lỗi font tiếng Việt).
  - Bộ đếm thời gian làm bài bị nhảy sai hoặc không tự động nộp bài khi hết giờ.
  - Chấm điểm sai (tính sai % hoặc nhầm đáp án đúng).
  - Xuất kết quả bài thi ra file Excel bị lỗi định dạng.

---

## 🏗️ 2. CẤU TRÚC PHÂN HỆ & CÁC THÀNH PHẦN MÃ NGUỒN

```
src/pages/TestAssessmentPage.tsx (Trang Cha)
│
├── src/types/testAssessment.ts (Định nghĩa kiểu dữ liệu bài test, câu hỏi, kết quả)
│
└── src/components/test-assessment/
    ├── AssessmentDashboard.tsx (Màn hình chính: Danh sách bài test, Lịch sử làm bài, Điểm trung bình)
    ├── QuizSession.tsx (Giao diện làm bài: Câu hỏi hiện tại, Bộ đếm giờ, Thanh tiến trình, Nút chọn đáp án)
    ├── QuestionNavigator.tsx (Lưới các câu hỏi 1, 2, 3... giúp thí sinh nhảy nhanh đến câu muốn làm)
    ├── AssessmentResult.tsx (Bảng điểm tổng kết, Biểu đồ Radar kỹ năng, Chi tiết câu đúng/sai)
    ├── ExcelImportExportModal.tsx (Modal tải đề mẫu, Import đề từ file Excel, Xuất kết quả ra file XLSX)
    └── QuestionBankManager.tsx (Công cụ quản lý ngân hàng câu hỏi dành cho Admin/Lead)
```

---

## 📊 3. CẤU TRÚC FILE EXCEL ĐỀ THI CHUẨN (EXCEL IMPORT SCHEMA)

Thư viện `XLSX` (SheetJS) đọc dữ liệu từ sheet đầu tiên của file Excel theo định dạng bảng sau:

| Cột A | Cột B | Cột C | Cột D | Cột E | Cột F | Cột G | Cột H | Cột I |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **STT** | **Câu hỏi** | **Lĩnh vực** | **Lựa chọn A** | **Lựa chọn B** | **Lựa chọn C** | **Lựa chọn D** | **Đáp án đúng** | **Giải thích** |
| 1 | Luật Fitts trong UX áp dụng cho...? | Usability | Kích thước & Khoảng cách | Màu sắc tương phản | Tốc độ tải trang | Cỡ chữ | `A` | Định luật Fitts phát biểu... |
| 2 | Trong Design System, Token màu gồm...? | UI Kit | Biến tham chiếu CSS | Ảnh chụp màn hình | File SVG | Mã nguồn React | `A` | Token đóng vai trò biến... |

👉 **Quy tắc Import quan trọng:**
- Cột **Đáp án đúng** phải là một trong 4 chữ cái in hoa: `A`, `B`, `C`, hoặc `D`.
- Tiêu đề hàng đầu tiên (Row 1) phải là tên cột; dữ liệu bắt đầu đọc từ Row 2.

---

## 📦 4. CẤU TRÚC DỮ LIỆU BÀI THI (`testAssessment.ts`)

```typescript
export interface AssessmentQuestion {
  id: string                         // ID duy nhất của câu hỏi
  question: string                   // Nội dung câu hỏi
  category: "UX Research" | "UI Design" | "Design System" | "Usability" | "General"
  options: string[]                  // Mảng 4 lựa chọn [A, B, C, D]
  correctAnswer: number              // Chỉ số index đáp án đúng (0, 1, 2, 3)
  explanation?: string               // Lời giải thích sau khi nộp bài
}

export interface AssessmentSubmission {
  candidateName: string              // Tên thí sinh làm bài
  candidateEmail: string             // Email người làm bài
  startedAt: string                  // Thời điểm bắt đầu
  completedAt: string                // Thời điểm kết thúc
  totalScore: number                 // Tổng điểm đạt được
  maxScore: number                   // Điểm tối đa
  percentage: number                 // Tỷ lệ phần trăm hoàn thành (%)
  answers: Record<string, number>    // Map câu hỏi ID -> Lựa chọn của thí sinh
}
```

---

## 🔍 5. MA TRẬN PHÂN TÍCH PHẠM VI ẢNH HƯỞNG (IMPACT ANALYSIS)

| Khi bạn chỉnh sửa... | Các file bị ảnh hưởng | Rủi ro tiềm ẩn & Cách phòng tránh |
| :--- | :--- | :--- |
| **Logic Bộ đếm giờ (`QuizSession.tsx`)** | `src/components/test-assessment/QuizSession.tsx` | - Khi hết giờ, phải tự động kích hoạt hàm nộp bài `handleSubmit()`, không được để bài thi treo vô hạn.<br>- Đồng hồ phải dùng `setInterval` kèm dọn dẹp `clearInterval` khi unmount. |
| **Import / Export Excel (`XLSX`)** | `src/components/test-assessment/ExcelImportExportModal.tsx` | - Cần bắt lỗi `try/catch` khi người dùng tải lên file Excel sai cấu trúc hoặc file bị mã hóa mật khẩu.<br>- File xuất ra phải kèm định dạng ngày giờ chuẩn `DD-MM-YYYY_HH-mm`. |
| **Lưu trữ Kết quả Thi** | `src/pages/TestAssessmentPage.tsx`<br>`localStorage` | - Kết quả thi cần lưu trữ vào `localStorage` key `mbbank_assessment_results` để thí sinh có thể xem lại lịch sử làm bài. |

---

## 🛑 6. CHECKLIST KIỂM THỬ ĐẠT 100 ĐIỂM (TEST CHECKLIST)

- [ ] **Làm bài & Chấm điểm**: Thử làm 1 bài thi 5 câu hỏi -> Chọn đáp án đúng cho 4 câu và sai 1 câu -> Bấm Nộp bài -> Bảng kết quả phải tính chính xác 80% (4/5 câu).
- [ ] **Tự động nộp khi hết giờ**: Chỉnh thời gian làm bài thử nghiệm còn 10 giây -> Không bấm nộp bài -> Chờ hết giờ -> Hệ thống phải tự động thu bài và hiển thị trang kết quả.
- [ ] **Import File Excel**: Tải file mẫu -> Điền thêm 2 câu hỏi mới -> Import vào hệ thống -> Kiểm tra ngân hàng câu hỏi có hiển thị đủ 2 câu mới vừa thêm không.
- [ ] **Export Kết quả Excel**: Bấm Xuất kết quả bài thi -> File Excel tải về mở được bằng Microsoft Excel hoặc Google Sheets mà không bị lỗi font tiếng Việt.
- [ ] **Compile Test**: Chạy `npx tsc --noEmit` đạt 0 lỗi.
