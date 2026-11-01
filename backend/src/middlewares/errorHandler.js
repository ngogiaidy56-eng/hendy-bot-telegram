import { json } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

export function errorHandler(error, requestId = "unknown") {
  const message = error instanceof Error ? error.message : "Internal server error";
  let status = 500;
  if (/không có quyền quản trị/i.test(message)) status = 403;
  else if (/cần mở ứng dụng|phiên telegram đã hết hạn|không xác thực được phiên|thiếu telegram initdata|không tìm thấy telegram user/i.test(message)) status = 401;
  else if (/không hợp lệ|không được hỗ trợ|không tồn tại|đã đạt giới hạn|thiếu mật khẩu/i.test(message)) status = 400;
  logger.error("request_failed", error, { requestId });
  return json({ error: status >= 500 ? "Lỗi máy chủ. Vui lòng thử lại sau." : message, requestId }, status);
}