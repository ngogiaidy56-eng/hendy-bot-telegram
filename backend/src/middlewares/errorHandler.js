import { json } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

export function errorHandler(error, requestId = "unknown") {
  const message = error instanceof Error ? error.message : "Internal server error";
  const status = /xác thực|telegram|phiên|quản trị|token|đăng nhập|mật khẩu|không được hỗ trợ|không hợp lệ|không tồn tại|giới hạn/i.test(message) ? 400 : 500;
  logger.error("request_failed", error, { requestId });
  return json({ error: status === 500 ? "Lỗi máy chủ. Vui lòng thử lại sau." : message, requestId }, status);
}