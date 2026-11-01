-- Wallet top-up requests are not credited until an authenticated admin verifies receipt.
CREATE TABLE IF NOT EXISTS wallet_topup_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount BETWEEN 10000 AND 50000000),
  currency TEXT NOT NULL DEFAULT 'VND',
  provider TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_user_created
  ON wallet_topup_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_status_created
  ON wallet_topup_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topup_id TEXT UNIQUE,
  entry_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wallet_entries_user_created
  ON wallet_entries(user_id, created_at DESC);

-- Safe starter catalog entries. Prices remain NULL until an admin sets an approved quote.
INSERT OR IGNORE INTO catalog_items(id,module,slug,title,description,unit_price,currency,duration_days,stock,is_active,sort_order) VALUES
('seed-live-account','mini_game_live','live-account-support','Quản lý tài khoản Mini Game Live','Lưu mã tài khoản và gửi yêu cầu hỗ trợ quản lý.',NULL,'VND',NULL,NULL,1,10),
('seed-tool-7d','app_tool','tool-rental-7-days','Thuê Tool 7 ngày','Gói thuê công cụ trong 7 ngày; chờ nhân viên xác nhận.',NULL,'VND',7,NULL,1,10),
('seed-tool-30d','app_tool','tool-rental-30-days','Thuê Tool 30 ngày','Gói thuê công cụ trong 30 ngày; chờ nhân viên xác nhận.',NULL,'VND',30,NULL,1,20),
('seed-code','buy_code','digital-code-request','Yêu cầu mua Code','Chọn loại code cần mua; mã chỉ cấp sau khi xác nhận đơn.',NULL,'VND',NULL,NULL,1,10),
('seed-otp','otp_proxy','otp-service-request','Yêu cầu dịch vụ OTP','Yêu cầu dịch vụ OTP qua kênh hợp pháp; không nhập OTP của tài khoản cá nhân.',NULL,'VND',NULL,NULL,1,10),
('seed-proxy','otp_proxy','proxy-service-request','Yêu cầu dịch vụ Proxy','Yêu cầu gói proxy; cấu hình và giá do nhân viên xác nhận.',NULL,'VND',NULL,NULL,1,20);
