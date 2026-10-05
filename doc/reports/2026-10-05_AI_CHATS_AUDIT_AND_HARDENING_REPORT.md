# Báo cáo Audit & Hardening AI Chats — 05/10/2026

> **Nhánh:** `fix/ai-chats-audit`  
> **Phạm vi:** AI Chats, AI Gateway, GAS task/chat APIs, artifact retrieval, rich content, CI và dependency  
> **Kết luận:** Các hạng mục trọng yếu đã được triển khai và kiểm thử; production sign-off còn phụ thuộc cấu hình hạ tầng và UAT bằng tài khoản thật.

## 1. Executive summary

Đợt cải tiến chuyển AI Chats từ một trợ lý UX phạm vi rộng sang công cụ read-only có hai mục tiêu: tra cứu task theo quyền người dùng và tra cứu quy định/quy chuẩn đã được phê duyệt.

| Rủi ro trước cải tiến | Xử lý hiện tại | Trạng thái |
|---|---|---|
| Gateway có thể fail-open khi thiếu cờ auth | Production mặc định yêu cầu session; chỉ local dev được bypass rõ ràng | Đã xử lý |
| Browser lưu/call trực tiếp bằng provider key | Client key bị purge; toàn bộ model đi qua server gateway | Đã xử lý |
| Rate limit bằng bộ nhớ một instance | Production dùng Upstash REST; thiếu store trả 503 | Đã xử lý có điều kiện hạ tầng |

Không sử dụng điểm số tự đánh giá như bằng chứng nghiệm thu. Bằng chứng được lấy từ code, test tự động, build và UAT checklist.

## 2. Thay đổi trải nghiệm Designer

### Trước

- Bốn nhóm OP trộn lẫn quy trình, handoff, SLA và microcopy.
- Câu hỏi mẫu chung chung, chưa ưu tiên dữ liệu Designer cần khi xử lý task.
- Selected pill, heading và recent chat có độ đậm thị giác cao.
- Quota client hiển thị số lượng/key giả định không có nguồn server đáng tin cậy.

### Sau

- Chỉ còn `Thông tin Task` và `Quy định & Quy chuẩn`.
- OP Task yêu cầu rõ mã, trạng thái, khâu, assignee, deadline, rủi ro và cập nhật gần nhất.
- OP Quy định tập trung 7 khâu, Figma/Ready for Dev/token/redline/dev notes, SLA và trạng thái bắt buộc.
- Typography và selected state nhẹ hơn; recent chat không dùng bold quá mức.
- Ẩn quota client khi server chưa cung cấp telemetry chính xác.

## 3. Độ chính xác và hội thoại

| Năng lực | Cải tiến |
|---|---|
| Resolve task | Ưu tiên request ID, nickname và title; không match bừa câu hỏi general |
| Follow-up | Duy trì active task cho câu hỏi dùng đại từ hoặc câu nối tiếp ngắn |
| Ambiguity | Trả tối đa ba ứng viên và hỏi người dùng xác nhận |
| Metrics | Chuẩn hóa ngày Việt Nam/ISO; note gần nhất được sort theo timestamp |
| Grounding | Chặn mã task model tự bịa; dùng nhãn “Nguồn tham chiếu đã nạp” |
| Prompt injection | Tách dữ liệu tham chiếu khỏi system instruction; cấm làm theo chỉ thị nằm trong tài liệu |
| Document trust | Custom document chỉ trở thành quy chuẩn khi được approved |

## 4. Security hardening

### AI Gateway

- Model allowlist, tối đa 40 messages, 120.000 ký tự và 4.096 output tokens.
- Origin không được phép trả 403.
- Session token được xác minh qua POST body, không nằm trong URL.
- Identifier rate limit được SHA-256 trước khi gửi distributed store.
- Chỉ đọc `OPENROUTER_API_KEY` phía server.

### Task data và GAS

- `get_requests` chỉ nhận POST và bắt buộc session hợp lệ.
- Designer chỉ thấy task assigned/owner/viewer; PO/Business chỉ thấy creator/viewer.
- Cache task tách theo danh tính thay vì dùng cache chung.
- Design Owner tạm thời vẫn có quyền rộng vì session record chưa có squad/product scope.

### Cloud chat và upload

- Cloud sync mặc định tắt, chỉ chạy sau opt-in.
- Email định danh lấy từ session; payload email khác session bị từ chối.
- Cloud payload bỏ avatar, email, base64 image, reasoning và trace.
- Thread/message có giới hạn số lượng và độ dài.
- Chat dùng thư mục Drive riêng tư, không fallback sang thư mục shared cũ.
- Upload file/avatar yêu cầu session và CSRF format; giới hạn tên, MIME, extension, dung lượng và folder allowlist.

### Rich content

- Mermaid dùng `securityLevel: "strict"`, tắt HTML labels.
- SVG được lọc `script`, `foreignObject`, iframe/object/embed, event handlers và URL nguy hiểm trước khi render.

## 5. Bằng chứng kiểm thử

| Kiểm tra | Kết quả |
|---|---:|
| `pnpm run test:ai-intelligence` | 15/15 pass |
| `node --experimental-strip-types tests/test-ai-chats-e2e-and-audit.mjs` | 176/176 pass |
| `pnpm run build` | Pass |
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm audit --prod` | Không phát hiện vulnerability đã biết |
| TypeScript trong các file AI/auth thay đổi | Không có lỗi |
| `git diff --check` | Pass |

### Ngoại lệ đã biết

`pnpm test` toàn repository dừng sau các suite đầu vì Node ESM không resolve import extensionless `../data/mockData` trong `googleSheetService.ts`. Import này tồn tại trên `develop`; đây là debt của test runner chung, không phải regression của AI Chats. Cần sửa trước khi nâng full-suite thành merge gate.

## 6. Ma trận nghiệm thu

| Trụ cột | Bằng chứng hiện có | Điều kiện ký production |
|---|---|---|
| Security | Fail-closed, server-only secrets, distributed limiter, private cloud data | Xác nhận đủ env và pentest/UAT môi trường thật |
| Accuracy | 15 conversation tests, grounding, approved-doc filter | Chạy eval set với dữ liệu task thật đã ẩn PII |
| Designer usefulness | OP mới, task fields, regulation retrieval, lighter UI | Designer UAT tối thiểu 5 người |
| Runtime | Abort/retry, bounds, build pass | Soak test gateway và Redis |
| Operations | CI AI test + build, runbook | Thiết lập alert/ownership và xử lý full-suite debt |
| Governance | Read-only, no raw CoT, source labeling | Chốt owner quy trình approve/retire artifact |

## 7. Rủi ro còn lại và khuyến nghị

1. **P0 — Deployment configuration:** Thiếu Upstash hoặc GAS endpoint làm AI trả 503 theo thiết kế. Kiểm tra env trước cutover.
2. **P1 — Design Owner scope:** Bổ sung `allowed_squads`/`allowed_products` vào session hoặc bảng user để lọc server-side chính xác.
3. **P1 — Full test runner:** Chuẩn hóa TypeScript ESM imports hoặc dùng runner hỗ trợ TS, sau đó bật `pnpm test` trong CI.
4. **P1 — Artifact governance:** Xây UI/workflow approve, retire, version và audit owner cho tài liệu quy chuẩn.
5. **P2 — Observability:** Bổ sung log metadata không chứa prompt/PII: request ID, user hash, model, latency, status và token usage.
6. **P2 — Evaluation:** Duy trì bộ câu hỏi vàng gồm task lookup, ambiguity, follow-up, policy lookup, injection và unauthorized access.

## 8. Kết luận

Nhánh đã đạt mức sẵn sàng để triển khai staging có kiểm soát. Chưa nên ghi “production approved” chỉ dựa trên điểm tự đánh giá; việc ký nghiệm thu cần hoàn thành checklist UAT, xác nhận biến môi trường và kiểm thử quyền bằng tài khoản thật.

**Last Updated:** 2026-10-05
