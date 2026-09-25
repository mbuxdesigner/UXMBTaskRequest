# 📐 BỘ QUY CHUẨN SOẠN THẢO TÀI LIỆU ONBOARDING (ONB STANDARD SPECIFICATION)

> **Mã quy chuẩn:** `STD-DOC-ONB-01`  
> **Áp dụng cho:** Toàn bộ tài liệu Onboarding kỹ thuật, Hướng dẫn tiếp nhận dự án, và Tài liệu bàn giao tính năng trong hệ sinh thái MB UX Portal.  
> **Mục tiêu cốt lõi:** Đảm bảo kỹ sư mới tiếp nhận dự án hoặc tiếp nhận một module tính năng có thể **nắm bắt kiến trúc trong 15 phút**, **chạy được môi trường trong 5 phút**, và **thực hiện commit đầu tiên an toàn tuyệt đối (100% Impact Analysis)**.

---

## I. NGUYÊN TẮC VÀNG KHI VIẾT TÀI LIỆU ONBOARDING (5 CORE PRINCIPLES)

1. **Nguyên tắc "Action-Oriented" (Thực hành ngay):**
   * Mọi câu lệnh, biến môi trường, đường dẫn đều phải là mã thực tế, có thể copy-paste chạy được ngay.
   * Không giải thích lý thuyết trừu tượng nếu không đi kèm kịch bản thực tế trong dự án.

2. **Nguyên tắc "Zero-Assumption" (Không đoán mò):**
   * Giả định người đọc là một Senior Developer xuất sắc nhưng **chưa từng nhìn thấy codebase này bao giờ**.
   * Chỉ rõ nơi lưu file cấu hình, cách lấy khóa bí mật (`.env`), tài khoản thử nghiệm và đường link công cụ nội bộ.

3. **Nguyên tắc "Impact-First" (Phân tích phạm vi ảnh hưởng):**
   * Mọi tài liệu ONB tính năng bắt buộc phải có mục **Ma trận ảnh hưởng (Impact Matrix)**: Sửa file A sẽ tác động tới trang nào, component nào, bảng dữ liệu nào.

4. **Nguyên tắc "Scannability" (Dễ quét mắt & Trực quan):**
   * Sử dụng biểu tượng (Icon/Emoji) có quy ước thống nhất để đánh dấu mức độ quan trọng.
   * 100% tài liệu phải có sơ đồ luồng (Mermaid Flowchart / Sequence) hoặc bảng tổng hợp nhanh thay vì các đoạn văn xuôi dài dòng.

5. **Nguyên tắc "Anti-Rot" (Chống lỗi thời):**
   * Không copy toàn bộ các đoạn code dài vào tài liệu (vì code sẽ đổi). Chỉ trích dẫn tên hàm, interface cốt lõi và đường dẫn file tương đối (`src/...`).
   * Cuối tài liệu phải có trường `Last Updated` và `Changelog` các mốc cập nhật kiến trúc.

---

## II. PHÂN LOẠI TÀI LIỆU ONBOARDING TRONG DỰ ÁN

Hệ thống tài liệu Onboarding được chia thành 3 cấp độ rõ ràng:

```
Tài liệu Onboarding
├── 🌟 Cấp 1: Global Onboarding (Toàn dự án) -> 00_OVERVIEW_AND_ONBOARDING.md
│   └── Dành cho: Người mới vào dự án ngày đầu tiên.
│
├── 📦 Cấp 2: Module/Feature Onboarding -> doc/features/XX_[MODULE_NAME].md
│   └── Dành cho: Người bắt đầu sửa hoặc làm một tính năng cụ thể (Auth, Kanban, Admin...).
│
└── 🛠️ Cấp 3: Ops & Workflow Onboarding -> doc/GIT_WORKFLOW_..., CLOUDFLARE_...
    └── Dành cho: Quy trình hạ tầng, deploy, bảo mật, CI/CD và quy tắc Git.
```

---

## III. BẢN KHUNG CHUẨN CỦA MỘT TÀI LIỆU ONBOARDING (STANDARD TEMPLATE)

Mọi tài liệu Onboarding khi được viết mới hoặc cập nhật bắt buộc phải tuân theo cấu trúc **7 Phần chuẩn** sau:

### [Template Bắt Buộc]

```markdown
# 🧭 [MÃ SỐ]_[TÊN MODULE/HỆ THỐNG] — TÀI LIỆU ONBOARDING KỸ THUẬT

> **Module/Phạm vi:** [Tên module, ví dụ: Authentication & Dual Session]  
> **Người sở hữu (Owner/Lead):** [Tên/Email phụ trách]  
> **Thời gian đọc hiểu mục tiêu:** [Ví dụ: 15 phút]  
> **Mục tiêu:** [1-2 câu giải thích module này giải quyết bài toán gì]

---

## 1. 🎯 TỔNG QUAN & BẢN ĐỒ KIẾN TRÚC (ARCHITECTURE & FLOW)
- [Sơ đồ Mermaid mô tả luồng dữ liệu từ User -> UI -> Service -> Backend -> Sheet/DB]
- [Bảng giải thích các thuật ngữ chuyên ngành/nội bộ nếu có]

## 2. 🗂️ BẢN ĐỒ FILE & MÃ NGUỒN (SOURCE CODE COMPASS)
| Tên File / Thư mục | Trách nhiệm chính | Điểm cần chú ý |
| :--- | :--- | :--- |
| `src/services/abcService.ts` | Xử lý logic gọi API | Có cơ chế fallback dữ liệu cũ |
| `src/components/abcModal.tsx` | Giao diện tương tác | Đạt chuẩn responsive mobile & desktop |

## 3. ⚡ LUỒNG DỮ LIỆU & SỰ KIỆN TOÀN CỤC (DATA & EVENT BUS)
- Dữ liệu lưu trữ ở đâu: `localStorage`, `sessionStorage`, `RAW_REQUESTS` hay `RAW_SETTINGS`?
- Các Global Events phát ra hoặc lắng nghe:
  * `tên_event_1`: Ý nghĩa, component bắn, component nhận.

## 4. 🧭 MA TRẬN PHẠM VI ẢNH HƯỞNG (IMPACT ANALYSIS MATRIX)
| Khi bạn sửa hàm / component | Các màn hình bị ảnh hưởng | Cách kiểm thử để không làm hỏng |
| :--- | :--- | :--- |
| [Hàm A] | [Trang X, Trang Y] | [Kịch bản test A -> pass mới an toàn] |

## 5. 🛑 NHỮNG CÁI BẪY "CHẾT NGƯỜI" CẦN TRÁNH (CRITICAL GOTCHAS)
- Liệt kê tối thiểu 3 - 5 lỗi phổ biến mà người mới hay mắc phải (Gotchas).
- Ví dụ: Quên bù margin Sidebar (`md:ml-60`), quên deploy backend GAS version mới, v.v.

## 6. 🧪 KỊCH BẢN KIỂM THỬ MẪU (TESTING CHEATSHEET)
- Kịch bản Happy Path (Luồng chuẩn).
- Kịch bản Edge Cases (Mạng chậm, token hết hạn, dữ liệu cũ thiếu trường).
- Lệnh chạy test tự động: `node test-xyz.mjs` hoặc `npm run build`.

## 7. 🔗 TÀI LIỆU LIÊN QUAN & CONTACT SUPPORT
- Link tới Design Tokens, API spec, hoặc task Jira/Trello liên quan.
- Đầu mối hỗ trợ khi gặp khó khăn.
```

---

## IV. BẢNG TIÊU CHÍ ĐÁNH GIÁ CHẤT LƯỢNG TÀI LIỆU ONBOARDING (RUBRIC)

Một tài liệu ONB chỉ được duyệt (Approved) đưa vào thư mục `doc/` khi đạt điểm tối đa trên bảng tiêu chí này:

| Tiêu chí | Trọng số | Yêu cầu đạt chuẩn | Dấu hiệu vi phạm (Reject) |
| :--- | :---: | :--- | :--- |
| **1. Tính chính xác (Accuracy)** | 30% | File name, biến `.env`, tên hàm trong doc khớp 100% với code thực tế. | Dẫn link sai, chỉ tên file đã bị xóa/đổi tên. |
| **2. Phân tích ảnh hưởng (Impact)** | 25% | Có bảng ma trận ảnh hưởng rõ ràng cho từng file code. | Không nói rõ sửa file này thì màn hình nào khác bị ảnh hưởng. |
| **3. Bẫy kỹ thuật (Gotchas)** | 20% | Nêu bật các lưu ý sống còn để dev mới không làm sập hệ thống. | Toàn nói điều hiển nhiên, không cảnh báo rủi ro thực tế. |
| **4. Trực quan & Sơ đồ (Clarity)** | 15% | Có sơ đồ luồng dữ liệu (Mermaid) và bảng biểu dễ tra cứu. | Viết văn xuôi tràn lan, không có cấu trúc phân mục. |
| **5. Khả năng kiểm chứng (Verifiable)** | 10% | Có kịch bản kiểm thử mẫu và câu lệnh verify cụ thể. | Đọc xong không biết làm sao để biết mình đã làm đúng. |

---

## V. QUY ƯỚC BIỂU TƯỢNG VÀ ĐỊNH DẠNG (FORMATTING CONVENTIONS)

Để toàn bộ tài liệu trong thư mục `doc/` đạt sự đồng nhất cao cấp:
* 🧭 : Định hướng / Bản đồ / Mục lục
* 🎯 : Mục tiêu cốt lõi / Điểm đến
* 🛑 : Cảnh báo nguy hiểm / Rủi ro sập hệ thống (Gotchas)
* ⚡ : Luồng sự kiện / Event Bus / Tốc độ xử lý
* 🗂️ : Bản đồ thư mục & file mã nguồn
* 🧪 : Kiểm thử / Test scripts / Verification
* 🔒 : Bảo mật / Phân quyền / Auth
* 💡 : Mẹo hay / Best practices

---

## VI. QUY TRÌNH DUYỆT & CẬP NHẬT TÀI LIỆU ONBOARDING (LIFECYCLE)

1. **Khi phát triển tính năng mới (New Feature):**
   * Bắt buộc đính kèm 1 file `doc/features/XX_[FEATURE_NAME].md` tuân thủ đúng khung chuẩn ở Mục III.
   * Cập nhật thêm 1 dòng vào Bản đồ tra cứu nhanh tại `00_OVERVIEW_AND_ONBOARDING.md`.

2. **Khi refactor hoặc đổi kiến trúc (Refactoring):**
   * Nghiêm cấm chỉ sửa code mà quên sửa doc. Bắt buộc cập nhật file doc liên quan trước khi merge Pull Request vào nhánh `main`.

3. **Định kỳ rà soát (Quarterly Audit):**
   * Mỗi quý thực hiện chạy thử kịch bản Onboarding với 1 dev mới hoặc dev chéo nhóm để phát hiện những chỗ chưa rõ ràng và cập nhật lại.
