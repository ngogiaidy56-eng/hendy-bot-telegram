# Hendy Bot Tele — Cloudflare Edition

Monorepo triển khai trên Cloudflare: hai ứng dụng Pages độc lập, một Worker API/Webhook, D1 lưu dữ liệu nghiệp vụ và R2 lưu tệp phát hành.

## Kiến trúc
- apps/web-user: Mini App/người dùng, quản lý mã tài khoản và tải bản phát hành.
- apps/web-admin: quản trị riêng, upload bản phát hành và đồng bộ Telegram webhook.
- backend: một Cloudflare Worker cho REST API và Telegram webhook.
- D1: hồ sơ người dùng và metadata bản phát hành.
- R2: APK/AAB/IPA/EXE/MSI/DMG và các tệp phát hành.
- KV: rate limit mức cơ bản.
- packages/db-schema: migration SQL; packages/shared-types: kiểu dữ liệu chung.

Không cần Render server. Backend dùng Fetch API và Telegram Bot HTTP API, không cần tiến trình bot chạy nền.

## Yêu cầu
Node.js 20+, pnpm 9, tài khoản Cloudflare có quyền Workers, Pages, D1, R2, KV và Telegram bot token.

## Tạo tài nguyên Cloudflare lần đầu
Ở thư mục gốc repository:

    pnpm install
    pnpm exec wrangler login
    pnpm exec wrangler d1 create hendy_bot_db
    pnpm exec wrangler r2 bucket create hendy-bot-assets
    pnpm exec wrangler kv namespace create RATE_LIMITER

Sao chép database_id và KV id vào backend/wrangler.toml, thay REPLACE_WITH_D1_DATABASE_ID và REPLACE_WITH_KV_NAMESPACE_ID bằng ID thật. Không commit token hoặc secret.

Tạo hai Pages project một lần:

    pnpm exec wrangler pages project create hendy-web-user --production-branch main
    pnpm exec wrangler pages project create hendy-web-admin --production-branch main

## Secrets cho Worker
    pnpm exec wrangler secret put BOT_TOKEN --config backend/wrangler.toml
    pnpm exec wrangler secret put WEBHOOK_SECRET_TOKEN --config backend/wrangler.toml
    pnpm exec wrangler secret put WEBHOOK_SETUP_KEY --config backend/wrangler.toml
    pnpm exec wrangler secret put ADMIN_API_TOKEN --config backend/wrangler.toml

BOT_TOKEN: token Telegram.
WEBHOOK_SECRET_TOKEN: chuỗi 1–256 ký tự chữ/số/gạch dưới/gạch ngang, xác minh header Telegram.
WEBHOOK_SETUP_KEY: khóa riêng gọi endpoint đăng ký webhook.
ADMIN_API_TOKEN: bearer token bảng quản trị.
ADMIN_IDS: Worker variable tùy chọn, danh sách Telegram ID quản trị phân tách bằng dấu phẩy.

Worker variables:
- PUBLIC_API_BASE_URL: URL HTTPS public của Worker.
- WEBAPP_URL: URL Pages của web-user.
- ALLOWED_ORIGINS: hai origin Pages, phân cách bằng dấu phẩy.
- ADMIN_IDS: danh sách Telegram ID quản trị, nếu dùng Telegram initData cho admin.

Webhook ở /telegram/webhook xác minh X-Telegram-Bot-Api-Secret-Token; không nhúng secret vào URL path.

## GitHub Actions
Repository secrets:
- CF_API_TOKEN: Cloudflare API token có quyền Workers Scripts:Edit, D1:Edit, R2:Edit, Pages:Edit.
- CF_ACCOUNT_ID: Cloudflare Account ID.

Repository variable:
- VITE_API_BASE_URL: URL HTTPS Worker, không có dấu slash cuối.

Pages project phải được tạo trước, tên hendy-web-user và hendy-web-admin. Workflow backend chạy test, apply D1 migrations rồi deploy Worker.

## Chạy local và kiểm tra
    pnpm install
    pnpm db:migrate:local
    pnpm --filter backend dev

Frontend (terminal riêng):
    pnpm --filter web-user dev
    pnpm --filter web-admin dev

Build và test:
    pnpm build
    pnpm test

Migration 0001 dùng CREATE TABLE IF NOT EXISTS, không xóa dữ liệu hiện hữu. Migration 0002 bổ sung metadata tệp và gỡ thuộc tính mật khẩu cũ khỏi linked_accounts, giữ lại mã tài khoản nếu JSON đúng định dạng. Worker cũng lọc credential legacy khi đọc dữ liệu.

## API
- GET /healthz
- GET /api/v1/health
- GET /api/v1/me — Authorization: tma <Telegram initData>
- GET /api/v1/links — Telegram initData
- POST /api/v1/links — chỉ brand và accountLabel; từ chối password/mk/OTP
- DELETE /api/v1/links/:brand/:index — Telegram initData
- GET /api/v1/releases
- GET /api/v1/releases/:id/download
- POST /api/v1/admin/releases — Bearer ADMIN_API_TOKEN hoặc Telegram admin
- GET /api/v1/admin/stats — Bearer ADMIN_API_TOKEN hoặc Telegram admin
- POST /api/v1/admin/webhook/setup — ADMIN_API_TOKEN và X-Webhook-Setup-Key

Đăng ký webhook:
    curl -X POST "https://YOUR-WORKER-URL/api/v1/admin/webhook/setup" -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" -H "X-Webhook-Setup-Key: YOUR_WEBHOOK_SETUP_KEY"

## Bảo mật
Mini App initData được xác thực bằng HMAC, kiểm tra auth_date. CORS chỉ cho origins trong ALLOWED_ORIGINS. Admin API dùng bearer token hoặc Telegram ID allowlist.

Phiên bản cũ lưu mk/password dạng văn bản trong JSON D1. Phiên bản này không thu thập/lưu mật khẩu, OTP hoặc secret tài khoản bên thứ ba. Migration 0002 loại bỏ các thuộc tính credential cũ. Nếu cần liên kết dịch vụ bên ngoài, chỉ tích hợp OAuth chính thức của nhà cung cấp; không gửi mật khẩu qua bot.

Rate limit KV là best-effort vì KV không có phép tăng nguyên tử. Với lưu lượng lớn, chuyển sang Durable Object rate limiter.

## Backup và TLS
    node scripts/db-backup.js

Script xuất D1 remote và upload SQL vào prefix backups/d1 trong R2. Cloudflare tự quản lý chứng chỉ edge; scripts/cert-renewer.js chỉ kiểm tra HTTPS/TLS, không thay thế quy trình cấp/renew certificate của Cloudflare.

## Giới hạn triển khai
Mã nguồn không thể tự biết database_id, KV namespace ID, Cloudflare token hay quyền tài khoản. Tạo tài nguyên và cài secrets/IDs trước khi chạy GitHub Actions. Không commit .dev.vars hoặc token thật.