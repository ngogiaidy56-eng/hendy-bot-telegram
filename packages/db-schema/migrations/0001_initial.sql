DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    balance INTEGER DEFAULT 0,
    voucher INTEGER DEFAULT 0,
    linked_accounts TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS app_releases;
CREATE TABLE app_releases (
    id TEXT PRIMARY KEY,
    platform TEXT,
    version TEXT,
    r2_path TEXT,
    release_notes TEXT,
    released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
