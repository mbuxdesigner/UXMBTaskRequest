# 📄 HƯỚNG DẪN QUY CHUẨN ĐỊNH DẠNG TÀI LIỆU MARKDOWN (NOTION-STYLE VIEWER)
## (HỆ THỐNG HIỂN THỊ TÀI LIỆU AI CHAT & KHO UX ARTIFACTS — MBBANK)

> **Mục tiêu tài liệu:** Hướng dẫn quy tắc định dạng nội dung Markdown (.md) để hiển thị trực quan, phân cấp rõ ràng và chuẩn phong cách Notion trên màn hình **AI Chat Copilot** và bộ xem chi tiết tài liệu [EchoArtifactSplitViewer.tsx](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/chat/EchoArtifactSplitViewer.tsx).

---

## 🎯 1. BẢNG TỔNG HỢP QUY TẮC ĐỊNH DẠNG (CHEATSHEET)

| Thành phần hiển thị | Cú pháp viết trong file Markdown | Kết quả hiển thị trên Viewer |
| :--- | :--- | :--- |
| **Tiêu đề chính (H1)** | `# Tên tiêu đề lớn` | Font 28px đậm, kèm biểu tượng kéo thả Notion `+ ⋮⋮` |
| **Tiêu đề mục (H2)** | `## Tên mục lớn` | Font 22px đậm, khoảng cách thoáng |
| **Tiêu đề mục con số** | Viết số thứ tự trực tiếp:<br>`1.1. Tên mục con`<br>`1.2. Tên mục con` | **Tự động nhận diện thành Subheading** font 18px đậm, có khoảng đệm trên dưới đẹp mắt |
| **Đầu dòng cấp 1** | `- Nội dung` (hoặc `• Nội dung`) | Chấm tròn đặc màu đen `•` |
| **Đầu dòng cấp 2** | Thụt lề **2 khoảng trắng**:<br>`  - Nội dung` (hoặc `  ◦ Nội dung`) | Chấm tròn rỗng viền đen nền trắng `◦` |
| **Đầu dòng cấp 3** | Thụt lề **4 khoảng trắng**:<br>`    - Nội dung` (hoặc `    ▪ Nội dung`) | Ô vuông đặc màu đen `▪` |
| **Tự động in đậm nhãn** | Viết dạng `Nhãn: Nội dung` | **Tự động in đậm tiền tố trước dấu hai chấm** mà không cần gõ `**` |
| **Badge mã / Lệnh** | Bọc trong dấu \` (backtick):<br>\`npm run dev\` hoặc \`/sentopo\` | Badge nền xám nhạt bo góc, chữ đỏ/hồng Notion |
| **Đường kẻ phân cách** | Dòng riêng gồm 3 dấu gạch: `---` | Đường kẻ mảnh xám nhạt ngăn cách các phân đoạn |
| **Khối ghi chú (Callout)** | Dòng bắt đầu bằng `> Nội dung` | Khối bo góc xám nhạt với icon bóng đèn `💡` |
| **Bảng dữ liệu** | Cú pháp bảng chuẩn: `\| Cột 1 \| Cột 2 \|` | Bảng bo góc, header xám nhạt, viền phân cách tinh tế |
| **Khối mã nguồn** | \`\`\`bash ... \`\`\` | Hộp mã nền xám kèm nút **Copy** tiện dụng góc phải |

---

## 📐 2. CHI TIẾT CÁC QUY TẮC HIỂN THỊ

### 2.1. Phân cấp Danh sách 3 tầng (Nested Bullet Lists)
Hệ thống [EchoArtifactSplitViewer.tsx](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/chat/EchoArtifactSplitViewer.tsx) được lập trình để tự động biến đổi bullet point theo độ thụt dòng:
- **Tầng 1 (Indentation = 0):** Hiển thị chấm tròn đặc `•`
- **Tầng 2 (Indentation = 2 spaces):** Tự động chuyển thành chấm tròn rỗng `◦`
- **Tầng 3 (Indentation = 4 spaces):** Tự động chuyển thành khối vuông `▪`

```markdown
- Cấp 1: Định vị sản phẩm cốt lõi
  ◦ Cấp 2: Thông số kỹ thuật
    ▪ Cấp 3: Chi tiết vận hành 24/7
    ▪ Cấp 3: Cơ chế tính lãi tự động
```

> **Lưu ý:** Bạn có thể dùng dấu gạch ngang thông thường (`-`) kèm thụt lề 2 spaces / 4 spaces, hoặc gõ trực tiếp các ký tự Unicode `•`, `◦`, `▪`.

---

### 2.2. Cơ chế Tự động In đậm Tiền tố (Auto-bold Key-Value Prefix)
Khi bạn viết một dòng có dấu hai chấm `:` phân tách (độ dài nhãn từ 2 đến 30 ký tự), hệ thống tự động nhận diện và in đậm phần nhãn này:

```markdown
- Định vị UX: Sản phẩm tiền gửi sinh lời ngắn ngày.
  ◦ Lãi suất: 5%/năm tính theo ngày thực tế.
  ◦ Hạn mức: Tối thiểu từ 20.000.000 VNĐ.
```

👉 Bạn **không cần** phải gõ `**Định vị UX:**` một cách thủ công, hệ thống sẽ tự render đậm phần nhãn và để phần mô tả ở font chữ thường thanh lịch.

---

### 2.3. Đề mục con dạng số (Numbered Subheadings)
Để tạo các mục như `1.1.`, `1.2.`, `2.1.`, bạn chỉ cần xuống dòng và viết trực tiếp số thứ tự kèm tên mục:

```markdown
1.1. TK Siêu Lãi Ngày

- Nội dung mục 1.1...

1.2. Chứng chỉ tiền gửi

- Nội dung mục 1.2...
```

Viewer tự động nhận diện mẫu Regex `^(\d+\.\d+(?:\.\d+)*\.?)\s+(.+)$` và render thành heading con trang trọng.

---

### 2.4. Inline Code Tag (Màu sắc Notion)
Khi bọc từ khoá hoặc lệnh trong cặp dấu backtick `` ` ``, hệ thống sẽ áp dụng class:
- Màu chữ: Hồng đỏ `#EB5757`
- Nền: `bg-[rgba(135,131,120,0.15)]`
- Bo góc: `rounded-[4px]`

Ví dụ:
```markdown
- Lệnh chạy thử: `npm run dev`
- Nhánh làm việc: `develop`
- Cú pháp lệnh nhanh: `/sentopo`
```

---

### 2.5. Callout & Ghi chú quan trọng
Sử dụng ký tự `>` ở đầu dòng:
```markdown
> Lưu ý: Cần kiểm tra kỹ các thông số trước khi chuyển giao UAT.
```
Sẽ tự động được render thành một thẻ Callout mềm mại có biểu tượng bóng đèn `💡` ở đầu.

---

## 📋 3. KHUNG MẪU HOÀN CHỈNH (TEMPLATE CHUẨN SẴN DÙNG)

Sao chép đoạn dưới đây khi tạo file tài liệu mới vào hệ thống:

```markdown
# NHÓM SẢN PHẨM: TÊN SẢN PHẨM (Code Name)

Đoạn văn mở đầu mô tả khái quát mục tiêu, đối tượng sử dụng và phạm vi áp dụng của tài liệu này...

1.1. Đặc tả tính năng cốt lõi

- Định vị UX: Mô tả ngắn gọn về giải pháp trải nghiệm người dùng.
- Thông số cốt lõi:
  ◦ Tiêu chí A: Giá trị hoặc yêu cầu cụ thể.
  ◦ Tiêu chí B: Thông tin chi tiết liên quan.
- Quy chuẩn hiển thị:
  ◦ Thông tin chính:
    ▪ Yêu cầu 1: Nội dung chi tiết tầng sâu nhất.
    ▪ Yêu cầu 2: Nội dung chi tiết tầng sâu nhất.
    ▪ Yêu cầu 3: Tuân thủ quy chuẩn thiết kế MBBank Design System.

---

1.2. Hướng dẫn kỹ thuật & Thao tác

- Nhánh làm việc: `develop`
- Lệnh khởi động: `npm run dev`

> Khuyến nghị: Đối soát kỹ checklist bàn giao trước khi gửi PO phê duyệt.
```

---

## 📂 4. LIÊN HỆ & THAM CHIẾU HỆ THỐNG
- **Component Render:** [EchoArtifactSplitViewer.tsx](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/components/chat/EchoArtifactSplitViewer.tsx)
- **Dữ liệu hạt nhân mẫu (Seed Data):** [aiArtifactsService.ts](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/src/services/aiArtifactsService.ts)
- **Tài liệu tính năng AI Copilot:** [14_AI_CHATS_AND_INTELLIGENT_COPILOT.md](file:///d:/AI%20dev/MBBank/UXMBTaskRequest-main/UXMBTaskRequest-main/doc/features/14_AI_CHATS_AND_INTELLIGENT_COPILOT.md)
