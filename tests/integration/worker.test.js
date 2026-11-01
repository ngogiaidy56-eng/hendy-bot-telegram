import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../backend/src/index.js";

test("health endpoint works without storage credentials", async () => {
  const request = new Request("https://worker.example/healthz");
  const response = await worker.fetch(request, {});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.platform, "cloudflare-workers");
});

test("unknown routes return 404", async () => {
  const request = new Request("https://worker.example/not-found");
  const response = await worker.fetch(request, {});
  assert.equal(response.status, 404);
});

test("admin order queue is forbidden without admin credentials", async () => {
  const request = new Request("https://worker.example/api/v1/admin/orders");
  const response = await worker.fetch(request, { DB: {}, STORAGE: {} });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.match(body.error, /quyền quản trị/i);
});

test("Telegram webhook rejects requests without the configured secret header", async () => {
  const request = new Request("https://worker.example/telegram/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "wrong-secret"
    },
    body: JSON.stringify({ update_id: 1 })
  });
  const response = await worker.fetch(request, {
    DB: {},
    STORAGE: {},
    WEBHOOK_SECRET_TOKEN: "expected-secret"
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("Mini App home and order APIs require Telegram initData authentication", async () => {
  for (const path of ["/api/v1/home", "/api/v1/orders"]) {
    const request = new Request("https://worker.example" + path);
    const response = await worker.fetch(request, { DB: {}, STORAGE: {} });
    assert.equal(response.status, 401, path + " must reject requests without Telegram initData");
  }
});
