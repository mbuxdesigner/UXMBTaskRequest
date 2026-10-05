# AI Chat Security & Deployment Runbook

> **Đối tượng:** DevOps, SecOps, Backend và người trực vận hành  
> **Môi trường:** Vercel Edge/Serverless + Google Apps Script + Upstash Redis  
> **Last Updated:** 2026-10-05

## 1. Biến môi trường bắt buộc

| Biến | Nơi cấu hình | Bắt buộc production | Secret |
|---|---|---:|---:|
| `OPENROUTER_API_KEY` | Vercel server environment | Có | Có |
| `GAS_EXEC_URL` | Vercel server environment | Có | Không, nhưng chỉ dùng endpoint đã kiểm soát |
| `UPSTASH_REDIS_REST_URL` | Vercel server environment | Có | Có tính nhạy cảm |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel server environment | Có | Có |
| `ALLOW_UNAUTHENTICATED_AI_DEV` | Local only | Không; phải unset/false | Không |
| `VITE_APPS_SCRIPT_URL` | Client build | Có thể dùng cho app APIs | Không |

Không tạo biến `VITE_*` chứa provider key. Mọi biến có tiền tố `VITE_` có thể xuất hiện trong client bundle.

## 2. Pre-deploy checklist

- [ ] GAS version mới đã deploy thành Web App và `GAS_EXEC_URL` trỏ đúng deployment.
- [ ] `OPENROUTER_API_KEY` chỉ tồn tại trong server environment.
- [ ] Upstash URL/token đúng môi trường, không dùng chung production với test nếu không có namespace riêng.
- [ ] `ALLOW_UNAUTHENTICATED_AI_DEV` unset hoặc `false` trên preview/production.
- [ ] Origin production nằm trong allowlist gateway.
- [ ] Google Drive script owner có quyền tạo thư mục private chat.
- [ ] Chạy đủ lệnh verify bên dưới.

```powershell
pnpm install --frozen-lockfile
pnpm run test:ai-intelligence
node --experimental-strip-types tests/test-ai-chats-e2e-and-audit.mjs
pnpm run build
pnpm audit --prod
```

## 3. Smoke test sau deploy

| ID | Thao tác | Kỳ vọng |
|---|---|---|
| SEC-01 | Gọi gateway không có Authorization | 401 |
| SEC-02 | Gọi bằng token đúng format nhưng không tồn tại | 401 |
| SEC-03 | Gọi từ Origin không được phép | 403 |
| SEC-04 | Gửi model ngoài allowlist | 400 |
| SEC-05 | Tắt/misconfigure Upstash ở production | 503, không fail-open |
| DATA-01 | Designer A tra task Designer B không được gán | Không trả task B |
| DATA-02 | PO tra task không phải creator/viewer | Không trả task |
| CHAT-01 | Cloud sync chưa opt-in | Không gọi save/load cloud tự động |
| CHAT-02 | Payload yêu cầu lưu dưới email khác session | Bị từ chối |
| FILE-01 | Upload file ngoài allowlist hoặc quá dung lượng | Bị từ chối |

## 4. Quan sát và chẩn đoán

### HTTP 401

Kiểm tra session hết hạn, định dạng `Bearer ST_<16 hex>` và GAS `check_session`. Không log nguyên token.

### HTTP 403

Kiểm tra request Origin và allowlist trong `api/ai-gateway.ts`. Không mở CORS wildcard để chữa nhanh.

### HTTP 429

Đây là rate limit hợp lệ. Kiểm tra user hash/bucket và TTL Upstash; không hạ limit trước khi xác định traffic thật hay abuse.

### HTTP 503

Kiểm tra lần lượt:

1. `OPENROUTER_API_KEY` có tồn tại không.
2. `UPSTASH_REDIS_REST_URL` và token có đúng không.
3. Upstash có trả HTTP thành công không.
4. GAS session endpoint có phản hồi trong timeout không.

Production 503 khi thiếu rate-limit store là fail-closed đúng thiết kế.

## 5. Rotation và sự cố secret

1. Thu hồi provider/Redis token bị nghi lộ.
2. Tạo secret mới và cập nhật trên Vercel, không commit vào Git.
3. Redeploy toàn bộ production functions.
4. Xóa deployment log/artifact có khả năng chứa secret.
5. Rà source và bundle bằng `rg -n "sk-or-|AIza|OPENROUTER_API_KEY" src dist`.
6. Lập incident record gồm khoảng thời gian, phạm vi, request bất thường và biện pháp khắc phục; không chép prompt/PII vào ticket.

## 6. Rollback an toàn

- Rollback frontend và gateway cùng một release để tránh mismatch API.
- Không rollback về phiên bản có client-side provider key hoặc gateway fail-open.
- Nếu GAS phải rollback, giữ các handler mới yêu cầu POST/session cho `get_requests`, chat và upload.
- Khi không thể xác minh session hoặc rate limit, ưu tiên tắt AI tạm thời thay vì mở bypass production.

## 7. Ownership

| Hạng mục | Owner đề xuất |
|---|---|
| Provider key và Vercel env | DevOps |
| Upstash, limit policy, incident | SecOps/Platform |
| GAS deployment và Drive permissions | Backend owner |
| Prompt/scope và approved artifacts | Design Ops |
| UAT và regression | QA + Designer representatives |

### Changelog

- `2026-10-05`: Tạo runbook cho kiến trúc gateway-only, distributed rate limit và private cloud data.
