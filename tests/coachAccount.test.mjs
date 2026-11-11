import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const viteOptions = { server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } };

test("manager form collects account and one specialty, without asking for user ID or role", async () => {
  const server = await createServer(viteOptions);
  try {
    const { CreateCoachAccountModal } = await server.ssrLoadModule("/src/components/manager/CreateCoachAccountModal.jsx");
    const render = subjects => renderToStaticMarkup(createElement(CreateCoachAccountModal, { subjects, onClose() {}, onDone() {} }));
    const html = render([{ id: "yoga", name: "Yoga" }]);
    assert.match(html, /Cấp tài khoản huấn luyện viên/);
    assert.match(html, /Email đăng nhập/); assert.match(html, /Số điện thoại/);
    assert.equal((html.match(/type="password"/g) || []).length, 2);
    assert.match(html, /autocomplete="new-password"/i);
    assert.equal((html.match(/<select/g) || []).length, 1);
    assert.doesNotMatch(html, /multiple=""|userId|CENTER_MANAGER/);
    assert.match(render([]), /Chưa có bộ môn/);
    assert.match(render([]), /type="submit" disabled=""/);
  } finally { await server.close(); }
});

test("provisioning API sends full account payload, excludes confirmation and role, and preserves manager session", async () => {
  const server = await createServer(viteOptions);
  const previousFetch = globalThis.fetch;
  let tokenStore;
  const calls = [];
  let responseStatus = 201;
  let data = {
    user: { id: "user", email: "coach@example.com", role: "COACH", status: "ACTIVE" },
    coach: { id: "coach", userId: "user", fullName: "Coach", phone: "0901234567", subjectIds: ["yoga"] },
  };
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, ...options });
      return new Response(JSON.stringify({ success: responseStatus < 400, data, message: "Email already exists" }), { status: responseStatus });
    };
    tokenStore = (await server.ssrLoadModule("/src/api/session.js")).session;
    tokenStore.setToken("offline-manager-session");
    const { coachApi } = await server.ssrLoadModule("/src/services/api/resources.js");
    const input = { email: "coach@example.com", password: "test-password", fullName: "Coach", phone: "0901234567", subjectIds: ["yoga"] };
    const result = await coachApi.createAccount({ ...input, role: "CENTER_MANAGER", confirmPassword: "test-password", userId: "existing" });
    assert.match(calls[0].url, /\/api\/coaches\/accounts$/);
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].headers.Authorization, "Bearer offline-manager-session");
    assert.deepEqual(JSON.parse(calls[0].body), input);
    assert.equal(result.coach.userId, result.user.id);
    assert.deepEqual(result.coach.subjectIds, ["yoga"]);
    assert.equal(tokenStore.getToken(), "offline-manager-session");
    responseStatus = 409;
    await assert.rejects(coachApi.createAccount(input), error => error.status === 409);
    responseStatus = 201;
    data = { user: data.user, coach: { ...data.coach, userId: "wrong-user" } };
    await assert.rejects(coachApi.createAccount(input), error => error.code === "INVALID_RESPONSE");
    assert.equal(calls.length, 3, "No automatic retry of account creation");
  } finally {
    globalThis.fetch = previousFetch;
    tokenStore?.clear();
    await server.close();
  }
});
