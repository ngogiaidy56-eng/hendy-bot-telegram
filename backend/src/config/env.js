export function envValidator(env) {
  const required = ['BOT_TOKEN', 'WEBHOOK_SECRET', 'ADMIN_ID'];
  const missing = required.filter(key => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(', ')}`);
  }
}
