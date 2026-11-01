import { parseTelegramId, randomId, safeText } from "../utils/helpers.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function idempotency(value) {
  const key = String(value || "").trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) fail("Thiếu hoặc sai Idempotency-Key.");
  return key;
}
export async function getWallet(env, userId) {
  const id = parseTelegramId(userId);
  if (!id) fail("Telegram user ID không hợp lệ.");
  const user = await env.DB.prepare("SELECT balance FROM users WHERE id = ?").bind(id).first();
  if (!user) fail("Không tìm thấy người dùng.", 404);
  const [entries, topups] = await Promise.all([
    env.DB.prepare("SELECT id,entry_type,amount,balance_after,description,created_at FROM wallet_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(id).all(),
    env.DB.prepare("SELECT id,amount,currency,provider,payment_reference,status,note,created_at,updated_at FROM wallet_topup_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 30").bind(id).all()
  ]);
  return { balance: Number(user.balance || 0), entries: entries.results || [], topups: topups.results || [], currency: "VND", depositsEnabled: true, automaticCredit: false };
}
export async function createTopup(env, userId, input, idemValue) {
  const id = parseTelegramId(userId);
  if (!id) fail("Telegram user ID không hợp lệ.");
  const key = idempotency(idemValue);
  const amount = Number(input?.amount);
  if (!Number.isSafeInteger(amount) || amount < 10000 || amount > 50000000) fail("Số tiền nạp phải từ 10.000 đến 50.000.000 VND.");
  const old = await env.DB.prepare("SELECT * FROM wallet_topup_requests WHERE user_id = ? AND idempotency_key = ?").bind(id,key).first();
  if (old) {
    if (Number(old.amount) !== amount) fail("Idempotency-Key đã được dùng cho yêu cầu nạp khác.", 409);
    return { topup: old, duplicate: true };
  }
  const topupId = randomId();
  const reference = "HD" + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0,8).toUpperCase();
  await env.DB.prepare(
    "INSERT INTO wallet_topup_requests(id,user_id,amount,payment_reference,idempotency_key,note) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,idempotency_key) DO NOTHING"
  ).bind(topupId,id,amount,reference,key,safeText(input?.note || "",240)).run();
  const saved = await env.DB.prepare("SELECT * FROM wallet_topup_requests WHERE user_id = ? AND idempotency_key = ?").bind(id,key).first();
  if (!saved || Number(saved.amount) !== amount) fail("Không thể tạo yêu cầu nạp tiền.", 409);
  return { topup: saved, duplicate: saved.id !== topupId };
}
export async function listAdminTopups(env, status = "pending") {
  const valid = ["all","pending","confirmed","rejected"];
  if (!valid.includes(status)) fail("Trạng thái nạp tiền không hợp lệ.");
  const result = status === "all"
    ? await env.DB.prepare("SELECT t.*,u.name AS customer_name FROM wallet_topup_requests t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 200").all()
    : await env.DB.prepare("SELECT t.*,u.name AS customer_name FROM wallet_topup_requests t LEFT JOIN users u ON u.id=t.user_id WHERE t.status=? ORDER BY t.created_at DESC LIMIT 200").bind(status).all();
  return result.results || [];
}
export async function reviewTopup(env, topupId, actor, input, idemValue) {
  const key = idempotency(idemValue);
  const action = String(input?.status || "");
  if (!["confirmed","rejected"].includes(action)) fail("Thao tác nạp tiền không hợp lệ.");
  const note = safeText(input?.note || "", 500);
  const actorId = safeText(actor?.id || "admin",80);
  const current = await env.DB.prepare("SELECT * FROM wallet_topup_requests WHERE id=?").bind(topupId).first();
  if (!current) fail("Không tìm thấy yêu cầu nạp tiền.",404);
  if (current.status !== "pending") {
    if (current.status === action && current.reviewed_by === actorId) return { topup: current, duplicate: true };
    fail("Yêu cầu nạp tiền đã được xử lý.",409);
  }
  if (action === "confirmed") {
    await env.DB.batch([
      env.DB.prepare("UPDATE wallet_topup_requests SET status='confirmed',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,note=? WHERE id=? AND status='pending'").bind(actorId,note,topupId),
      env.DB.prepare("UPDATE users SET balance=balance+(SELECT amount FROM wallet_topup_requests WHERE id=? AND status='confirmed' AND changes()=1) WHERE id=? AND changes()=1").bind(topupId,current.user_id),
      env.DB.prepare("INSERT INTO wallet_entries(id,user_id,topup_id,entry_type,amount,balance_after,description) SELECT ?,u.id,?,'topup',t.amount,u.balance,? FROM users u JOIN wallet_topup_requests t ON t.user_id=u.id WHERE t.id=? AND t.status='confirmed' AND changes()=1 ON CONFLICT(topup_id) DO NOTHING").bind(randomId(),topupId,"Nạp tiền đã được admin xác nhận: "+current.payment_reference,topupId)
    ]);
  } else {
    await env.DB.prepare("UPDATE wallet_topup_requests SET status='rejected',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,note=? WHERE id=? AND status='pending'").bind(actorId,note,topupId).run();
  }
  const saved = await env.DB.prepare("SELECT * FROM wallet_topup_requests WHERE id=?").bind(topupId).first();
  if (saved?.status !== action) fail("Yêu cầu vừa được xử lý bởi thao tác khác.",409);
  return { topup: saved, duplicate: false };
}
