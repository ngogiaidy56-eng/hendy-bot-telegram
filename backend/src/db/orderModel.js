import { parseTelegramId, randomId, safeText } from "../utils/helpers.js";

export const ORDER_MODULES = Object.freeze([
  "mini_game_live",
  "app_tool",
  "buy_code",
  "otp_proxy",
  "vip"
]);

const ORDER_STATUSES = new Set(["pending", "confirmed", "processing", "completed", "cancelled"]);

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function normalizeOrderInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Thông tin đơn hàng không hợp lệ.");
  }
  const module = String(input.module || "").trim();
  if (!ORDER_MODULES.includes(module)) throw new Error("Loại đơn hàng chưa được hỗ trợ.");

  const rawTitle = String(input.title ?? "").trim();
  const rawDescription = String(input.description ?? "").trim();
  if (rawTitle.length > 100 || rawDescription.length > 1000) {
    throw new Error("Nội dung đơn hàng vượt quá giới hạn cho phép.");
  }
  const title = safeText(rawTitle, 100);
  const description = safeText(rawDescription, 1000);
  const quantity = input.quantity === undefined ? 1 : Number(input.quantity);
  if (title.length < 3) throw new Error("Tên yêu cầu phải có ít nhất 3 ký tự.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    throw new Error("Số lượng phải nằm trong khoảng 1–50.");
  }
  return { module, title, description, quantity };
}

async function hashRequest(normalized) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalized));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function presentOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    module: row.module,
    title: row.title,
    description: row.description,
    quantity: Number(row.quantity),
    amount: Number(row.total_amount || 0),
    currency: row.currency || "VND",
    pricingStatus: "awaiting_quote",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function createOrder(env, userId, input, idempotencyKey) {
  const safeUserId = parseTelegramId(userId);
  if (!safeUserId) throw new Error("Telegram user ID không hợp lệ.");
  const key = String(idempotencyKey || "").trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    throw new Error("Thiếu hoặc sai Idempotency-Key cho yêu cầu tạo đơn.");
  }

  const normalized = normalizeOrderInput(input);
  const requestHash = await hashRequest(normalized);
  const existing = await env.DB.prepare(
    "SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?"
  ).bind(safeUserId, key).first();

  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw httpError("Idempotency-Key đã được dùng cho nội dung đơn hàng khác.", 409);
    }
    return { order: presentOrder(existing), duplicate: true };
  }

  const id = randomId();
  const orderNumber = "HD" + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0, 6).toUpperCase();
  const insertOrder = env.DB.prepare(
    `INSERT INTO orders
      (id, order_number, user_id, module, title, description, quantity, total_amount, currency, status, idempotency_key, request_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'VND', 'pending', ?, ?)
     ON CONFLICT(user_id, idempotency_key) DO NOTHING`
  ).bind(id, orderNumber, safeUserId, normalized.module, normalized.title, normalized.description, normalized.quantity, key, requestHash);

  const insertCreatedEvent = env.DB.prepare(
    `INSERT INTO order_events
      (id, order_id, actor_user_id, from_status, to_status, event_key, note)
     SELECT ?, id, user_id, NULL, 'pending', 'created', 'Người dùng tạo yêu cầu'
       FROM orders
      WHERE user_id = ? AND idempotency_key = ? AND request_hash = ?
     ON CONFLICT(order_id, event_key) DO NOTHING`
  ).bind(randomId(), safeUserId, key, requestHash);

  // D1 batch executes these statements as one transaction.
  await env.DB.batch([insertOrder, insertCreatedEvent]);

  const saved = await env.DB.prepare(
    "SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?"
  ).bind(safeUserId, key).first();
  if (!saved) throw new Error("Không thể lưu đơn hàng vào D1.");
  if (saved.request_hash !== requestHash) {
    throw httpError("Idempotency-Key đã được dùng cho nội dung đơn hàng khác.", 409);
  }
  return { order: presentOrder(saved), duplicate: saved.id !== id };
}

export async function listOrders(env, userId, options = {}) {
  const safeUserId = parseTelegramId(userId);
  if (!safeUserId) throw new Error("Telegram user ID không hợp lệ.");
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 50);
  const offset = Math.min(Math.max(Number(options.offset) || 0, 0), 1000);
  const status = String(options.status || "").trim();

  let result;
  if (status) {
    if (!ORDER_STATUSES.has(status)) throw new Error("Trạng thái đơn hàng không hợp lệ.");
    result = await env.DB.prepare(
      "SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(safeUserId, status, limit, offset).all();
  } else {
    result = await env.DB.prepare(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(safeUserId, limit, offset).all();
  }
  return (result.results || []).map(presentOrder);
}

export async function getOrderForUser(env, userId, orderId) {
  const safeUserId = parseTelegramId(userId);
  if (!safeUserId) throw new Error("Telegram user ID không hợp lệ.");
  const row = await env.DB.prepare(
    "SELECT * FROM orders WHERE id = ? AND user_id = ?"
  ).bind(orderId, safeUserId).first();
  return presentOrder(row);
}

export async function getOrderStats(env, userId) {
  const safeUserId = parseTelegramId(userId);
  if (!safeUserId) throw new Error("Telegram user ID không hợp lệ.");
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status IN ('confirmed', 'processing') THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
     FROM orders WHERE user_id = ?`
  ).bind(safeUserId).first();
  return {
    total: Number(row?.total || 0),
    pending: Number(row?.pending || 0),
    inProgress: Number(row?.in_progress || 0),
    completed: Number(row?.completed || 0)
  };
}
