#!/usr/bin/env python3
"""Execute every D1 migration in order against a disposable SQLite database."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "packages" / "db-schema" / "migrations"

def main() -> None:
    files = sorted(MIGRATIONS.glob("*.sql"))
    if not files:
        raise SystemExit("No SQL migrations found.")

    connection = sqlite3.connect(":memory:")
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        for migration in files:
            try:
                connection.executescript(migration.read_text(encoding="utf-8"))
            except sqlite3.Error as error:
                raise SystemExit(f"Migration failed: {migration.name}: {error}") from error

        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        required = {
            "users", "orders", "order_events", "order_quotes",
            "catalog_items", "vip_tiers", "giftcodes",
            "giftcode_redemptions", "referral_claims",
            "referral_commissions", "support_tickets",
            "support_messages", "wallet_topup_requests", "wallet_entries",
        }
        missing = sorted(required - tables)
        if missing:
            raise SystemExit("Migrations did not create required tables: " + ", ".join(missing))
        print(f"Validated {len(files)} migrations and {len(required)} core tables.")
    finally:
        connection.close()

if __name__ == "__main__":
    main()
