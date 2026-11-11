import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createServer } from "vite";
test("All route components render loading or explicit unsupported states without sync API assumptions", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { AppContext } = await server.ssrLoadModule("/src/store/appContext.js");
    const roles = { public: null, manager: "CENTER_MANAGER", coach: "COACH", member: "MEMBER", receptionist: "RECEPTIONIST" }; let count = 0;
    for (const [folder, role] of Object.entries(roles)) for (const file of await readdir(new URL('../src/pages/' + folder + '/', import.meta.url))) {
      if (!file.endsWith("Page.jsx")) continue;
      const name = file.replace(".jsx", ""); const module = await server.ssrLoadModule('/src/pages/' + folder + '/' + file);
      const user = role ? { id: "user", email: "test@example.invalid", role, memberId: "member", coachId: "coach" } : null;
      const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AppContext.Provider, { value: { user, authLoading: false, setUser() {}, toast() {} } }, createElement(Routes, null, createElement(Route, { path: "*", element: createElement(module[name]) })))));
      assert.ok(html.length > 100, file); assert.doesNotMatch(html, /Reset demo|DEMO LOGIN|123456/); count++;
    }
    assert.ok(count >= 36, "All existing and newly added role pages must render");
    const { RegistrationBadge } = await server.ssrLoadModule('/src/components/common/RegistrationBadge.jsx');
    assert.match(renderToStaticMarkup(createElement(RegistrationBadge, { status: "PENDING_PAYMENT" })), /badge amber/);
    assert.match(renderToStaticMarkup(createElement(RegistrationBadge, { status: "CONFIRMED" })), /badge green/);
    assert.match(renderToStaticMarkup(createElement(RegistrationBadge, { status: "PENDING_PAYMENT" })), /Chờ thanh toán/);
    assert.match(renderToStaticMarkup(createElement(RegistrationBadge, { status: "CONFIRMED" })), /Đã xác nhận/);
    const { ErrorMessage } = await server.ssrLoadModule('/src/components/common/AsyncPanel.jsx');
    const error = Object.freeze({ message: "Internal server error", status: 500 });
    const translatedError = renderToStaticMarkup(createElement(ErrorMessage, { error }));
    assert.doesNotMatch(translatedError, /Internal server error/);
    assert.match(translatedError, /lỗi/);
    assert.equal(error.message, "Internal server error");
  } finally { await server.close(); }
});
