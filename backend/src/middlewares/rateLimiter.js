export async function rateLimitMiddleware(kv, ip) {
  if (!kv) return true;
  const current = await kv.get(`rate:${ip}`);
  if (current && parseInt(current) > 30) return false; // Max 30 req/phút
  await kv.put(`rate:${ip}`, (parseInt(current || 0) + 1).toString(), { expirationTtl: 60 });
  return true;
}
