# HƯỚNG DẪN CẤU HÌNH CLOUDFLARE PROXY, WAF & BẢO VỆ HẠ TẦNG
## Dành Cho Hệ Thống UXMB Task Request (https://uxmb-task-request.vercel.app)

---

## 1. TỔNG QUAN KIẾN TRÚC HẠ TẦNG & PHÒNG THỦ ĐA LỚP

Hệ thống **UXMB Task Request** là cổng tác vụ nghiệp vụ nội bộ trọng yếu của Ngân hàng Quân Đội (MB), kết nối trực tiếp các chuyên viên Thiết kế UX, Product Owner (PO), Ban Lãnh đạo, và tích hợp đa chiều với:
1. **Frontend Hosting**: Vercel Edge Network (Domain chính: `https://uxmb-task-request.vercel.app`, Custom Domain hoặc CNAME alias).
2. **Backend & Cơ sở dữ liệu**: Google Apps Script Web App Engine (`script.google.com`) kết nối Google Sheets (`RAW_TASKS`, `RAW_SETTINGS`, `USERS`).
3. **Cổng thông báo ngoại vi**: Microsoft Teams Incoming Webhook (`mbbank.webhook.office.com`).

```
+-----------------------------------------------------------------------------------------+
|                                    INTERNET & NGÂN HÀNG MB                              |
|   +--------------------------+                         +----------------------------+   |
|   |   Nhân sự Trụ sở MB      |                         |   Nhân sự Làm việc từ xa   |   |
|   |  (NAT Gateway IP chung)  |                         |    (MB VPN / Mobile Edge)  |   |
|   +------------+-------------+                         +-------------+--------------+   |
+----------------|-----------------------------------------------------|------------------+
                 |                                                     |
                 +--------------------------+--------------------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------------+
|                           CLOUDFLARE EDGE PROXY & WAF LAYER                             |
|  1. DNS Proxy (Orange Cloud): CNAME -> cname.vercel-dns.com                             |
|  2. SSL/TLS: Full (Strict) Mode (End-to-End Encryption, TLS 1.3 only)                   |
|  3. Custom WAF Rules: Bypass Bot Fight Mode for Vercel Previews, APIs, Webhooks         |
|  4. Rate Limiting: Corporate Account-based (Tránh chặn IP NAT văn phòng ngân hàng)      |
|  5. DDoS Mitigation: Managed Challenge, HTTP/2 & HTTP/3 Enabled                         |
+-------------------------------------------+---------------------------------------------+
                                            |
                 +--------------------------+--------------------------+
                 | (Egress Clean Traffic)                              | (Web App API)
                 v                                                     v
+----------------------------------+                 +------------------------------------+
|       VERCEL EDGE NETWORK        |                 |      GOOGLE APPS SCRIPT & DRIVE    |
| - Production: main branch        |                 | - Sheet ID: 1gpe5W7wh...           |
| - Previews: develop branch PRs   |                 | - Backup Trigger: 01:00 AM Daily   |
| - vercel.json Security Headers   |                 | - Rate Limiter: CacheService       |
+----------------------------------+                 +------------------------------------+
```

---

## 2. THIẾT LẬP CLOUDFLARE DNS PROXY (ORANGE CLOUD)

### 2.1. Cấu hình Bản ghi CNAME trỏ về Vercel
Khi ngân hàng triển khai tên miền riêng (ví dụ: `uxportal.mbbank.com.vn` hoặc `tasks.uxmb.vn`) hoặc alias qua Cloudflare:

1. Đăng nhập vào **Cloudflare Dashboard** -> Chọn Zone tên miền tương ứng.
2. Điều hướng tới **DNS** -> **Records** -> Nhấp **Add record**:
   - **Type**: `CNAME`
   - **Name**: `uxportal` (hoặc `@` nếu dùng Apex domain)
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: **Proxied (Đám mây màu cam - Orange Cloud)** *(Bắt buộc bật để định tuyến lưu lượng qua mạng lưới bảo vệ của Cloudflare)*
   - **TTL**: `Auto`
3. Nhấp **Save**.

### 2.2. Đồng bộ Cấu hình trên Vercel Project Settings
1. Truy cập **Vercel Dashboard** -> Chọn project `uxmb-task-request`.
2. Vào **Settings** -> **Domains**.
3. Thêm domain `uxportal.mbbank.com.vn`.
4. Vercel sẽ tự động xác minh CNAME record qua Cloudflare Proxy. Trạng thái hiển thị **Valid Configuration** (màu xanh lá).

---

## 3. CẤU HÌNH MÃ HÓA SSL/TLS: FULL (STRICT) MODE

Trong môi trường ngân hàng, tuyệt đối **KHÔNG** sử dụng chế độ `Flexible` (kết nối giữa Cloudflare và Vercel bị gửi dạng HTTP không mã hóa, dễ bị tấn công Man-in-the-Middle).

### 3.1. Kích hoạt Full (Strict)
1. Trong Cloudflare Dashboard, vào menu **SSL/TLS** -> **Overview**.
2. Chọn chế độ: **Full (strict)**.
   - *Nguyên lý*: Cloudflare mã hóa toàn bộ dữ liệu từ trình duyệt đến Cloudflare, và yêu cầu chứng chỉ SSL hợp lệ (Let's Encrypt do Vercel cấp phát tự động) trên máy chủ nguồn Vercel.

### 3.2. Cấu hình Edge Certificates & TLS 1.3
Vào mục **SSL/TLS** -> **Edge Certificates**:
- **Always Use HTTPS**: **ON** (Tự động chuyển hướng mọi kết nối HTTP sang HTTPS với mã phản hồi 301).
- **Minimum TLS Version**: **TLS 1.2** (Chặn các phiên bản TLS 1.0 và 1.1 cũ đã có lỗ hổng bảo mật).
- **Opportunistic Encryption**: **ON**.
- **TLS 1.3**: **ON** (Tăng tốc độ bắt tay mã hóa 0-RTT và nâng cao độ an toàn).
- **Automatic HTTPS Rewrites**: **ON** (Tự động chuyển đổi các tài nguyên HTTP thành HTTPS để ngăn chặn lỗi Mixed Content).
- **HSTS (HTTP Strict Transport Security)**:
  - *Status*: Enabled
  - *Max-Age*: 12 months (`31536000` seconds)
  - *Include subdomains*: Enabled
  - *Preload*: Enabled

---

## 4. QUY TẮC TƯỜNG LỬA WAF (CUSTOM WAF RULES & BOT FIGHT MODE BYPASS)

### 4.1. Vấn đề Bot Fight Mode với Vercel Preview & Google Apps Script
Khi bật tính năng **Bot Fight Mode** hoặc **Super Bot Fight Mode** trên Cloudflare, các bot bảo vệ có thể gắn cờ nhầm và chặn:
1. Các đường dẫn Vercel Preview tự động sinh ra từ nhánh `develop` (dạng `https://uxmb-task-request-git-develop-*.vercel.app`).
2. Các cuộc gọi Webhook từ Google Apps Script egress tới Teams Webhook hoặc Vercel API Gateway.
3. Các tiến trình tự động hóa kiểm thử tích hợp (CI/CD Automated Health Checks).

### 4.2. Danh sách Quy tắc Bypass Ngoại lệ (Explicit WAF Bypass Rules)

Vào mục **Security** -> **WAF** -> **Custom rules** -> Chọn **Create rule**:

#### Quy tắc 1: Bypass Bot Defense Cho Vercel Preview Deployments
- **Rule Name**: `Bypass_Bot_Fight_Mode_For_Vercel_Previews`
- **Expression**:
  ```text
  (http.host contains "vercel.app" and http.host contains "uxmb-task-request") or
  (http.host wildcard "*.vercel.app")
  ```
- **Action**: **Skip**
- **WAF components to skip**:
  - `Super Bot Fight Mode`
  - `Security Level`
  - `Rate Limiting`

#### Quy tắc 2: Bảo vệ & Ngoại lệ Endpoint Cổng API (`/api/*`)
- **Rule Name**: `Allow_Backend_Proxy_And_Gateway`
- **Expression**:
  ```text
  (http.request.uri.path eq "/api/gateway" or http.request.uri.path startswith "/api/") and
  (http.request.method in {"POST", "GET"})
  ```
- **Action**: **Skip** (Skip Bot Management for verified enterprise origin header `X-MB-Portal-Request: true`).

#### Quy tắc 3: Bảo vệ Webhook Teams & Google Apps Script Egress
- **Rule Name**: `Allow_Google_Apps_Script_Egress`
- **Expression**:
  ```text
  (ip.src.asnum in {15169, 396982} and http.request.uri.path contains "/webhook")
  ```
  *(AS15169 và AS396982 là mạng ASN chính thức của Google Apps Script Servers)*
- **Action**: **Skip** WAF Rules.

---

## 5. CHIẾN LƯỢC CHỐNG SPAM & RATE LIMITING THÍCH ỨNG MẠNG NỘI BỘ NGÂN HÀNG

### 5.1. Rủi ro Chặn Nhầm Mạng Nội Bộ (Corporate NAT IP Gateway Conflict)
Toàn bộ hàng ngàn cán bộ nhân viên Ngân hàng MB tại Hội sở và các Chi nhánh truy cập Internet qua **một cụm IP NAT Gateway văn phòng dùng chung**.
- **Hậu quả nghiêm trọng**: Nếu cấu hình Rate Limiting trên Cloudflare theo tiêu chí `IP Address` (ví dụ: tối đa 50 requests/phút/IP), khi 20 Product Owners và Designers cùng mở portal tải danh sách bài toán đầu giờ sáng, Cloudflare sẽ chặn toàn bộ dải IP trụ sở ngân hàng với mã lỗi **HTTP 429 Too Many Requests**, làm tê liệt hệ thống.

### 5.2. Giải pháp: Rate Limiting Đa Tầng Không Chặn IP NAT
1. **Tầng Cloudflare Edge (Hạ tầng)**:
   - Chỉ áp dụng Rate Limiting bảo vệ chống tấn công DDoS tầng ứng dụng với ngưỡng cực cao:
     - **Path**: `/*`
     - **Threshold**: `2,000 requests per 1 minute per IP`.
     - **Action**: `Managed Challenge` (không dùng Block).
   - **IP Exemption (Whitelist)**: Thêm dải IP văn phòng Hội sở MB vào danh sách **Security** -> **WAF** -> **Tools** -> **IP Access Rules** với quyền `Allow`.

2. **Tầng Backend Google Apps Script (Nghiệp vụ)**:
   - Kiểm soát tần suất theo **Tài khoản / Email người dùng** (Account/Email-based sliding window via `CacheService`):
     - Cooldown 60 giây giữa 2 lần xin mã OTP (`rate_cooldown_` + email).
     - Tối đa 5 lần gửi OTP trong vòng 10 phút (`rate_count_` + email).
     - **Tuyệt đối không kiểm tra hay chặn IP máy khách.**

---

## 6. DANH MỤC THIẾT LẬP DDOS MITIGATION & HTTP PROTOCOLS

1. **HTTP/2 & HTTP/3 (with QUIC)**:
   - Vào **Network** -> Bật **HTTP/2**, **HTTP/3 (with QUIC)**, và **0-RTT Connection Resumption**. Giúp tối ưu hóa tốc độ tải trang trên thiết bị di động trong chi nhánh mạng nội bộ.
2. **WebSockets**:
   - Vào **Network** -> Bật **WebSockets** (Hỗ trợ realtime sync giữa các tab và màn hình giám sát).
3. **Brotli Compression**:
   - Vào **Speed** -> **Optimization** -> Bật **Brotli** để nén tối đa các tệp Javascript/CSS.
4. **DDoS Managed Ruleset**:
   - Vào **Security** -> **DDoS** -> Đặt `HTTP DDoS attack protection` ở mức `High` với action `Managed Challenge`.

---

## 7. BẢNG CHECKLIST KIỂM TRA ĐỊNH KỲ CHO CHUYÊN VIÊN VẬN HÀNH

| Hạng mục kiểm tra | Giá trị chuẩn yêu cầu | Trạng thái đạt |
|---|---|---|
| CNAME Record | Trỏ về `cname.vercel-dns.com` (Proxied - Mây cam) | [x] |
| SSL/TLS Mode | `Full (Strict)` | [x] |
| Minimum TLS Version | `TLS 1.2` hoặc `TLS 1.3` | [x] |
| Always Use HTTPS | `Enabled` (Tự động redirect HTTP -> HTTPS) | [x] |
| HSTS Header | `max-age=31536000; includeSubDomains; preload` | [x] |
| WAF Bot Fight Mode | Đã tạo Rule Bypass cho `*.vercel.app` & `/api/*` | [x] |
| Rate Limit Rule | Ngưỡng bảo vệ DDoS >2,000 req/min, KHÔNG chặn IP NAT MB | [x] |
| IP Whitelist | Dải IP văn phòng Hội sở MB được miễn trừ Challenge | [x] |
| HTTP/3 (QUIC) | `Enabled` | [x] |

---

*Tài liệu này được biên soạn cho Đội ngũ Phát triển MB UX Team và Phòng Quản trị Hạ tầng CNTT Ngân hàng Quân Đội MB.*
