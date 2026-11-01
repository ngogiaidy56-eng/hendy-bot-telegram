import { constantTimeEqual, hmacSha256, toHex } from "./cryptoService.js";

const encoder = new TextEncoder();

export async function verifyTelegramInitData(initData, botToken, maxAgeSeconds = 3600) {
  if (!initData || !botToken) throw new Error("Thiếu Telegram initData hoặc bot token.");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!receivedHash || !Number.isFinite(authDate)) throw new Error("Telegram initData không hợp lệ.");
  const now = Math.floor(Date.now() / 1000);
  if (authDate > now + 60 || now - authDate > maxAgeSeconds) throw new Error("Phiên Telegram đã hết hạn. Hãy mở lại Mini App.");

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => key + "=" + value)
    .join("\n");

  const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken);
  const calculatedHash = toHex(await hmacSha256(secretKey, dataCheckString));
  if (!constantTimeEqual(calculatedHash, receivedHash)) throw new Error("Không xác thực được phiên Telegram.");

  let user;
  try { user = JSON.parse(params.get("user") || "null"); }
  catch { throw new Error("Thông tin người dùng Telegram không hợp lệ."); }
  if (!user || !user.id) throw new Error("Không tìm thấy Telegram user ID.");
  return { user, authDate };
}

export async function authenticateTelegramRequest(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("tma ")) throw new Error("Cần mở ứng dụng từ Telegram để xác thực.");
  const verified = await verifyTelegramInitData(authorization.slice(4), env.BOT_TOKEN);
  return verified.user;
}