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
