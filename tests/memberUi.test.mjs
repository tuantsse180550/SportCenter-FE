import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
test("Member presentation separates session, registration and payment statuses and hides identifiers", async () => {
 const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
 try {
  const { RegistrationHistory, SessionCard, ClassCard } = await server.ssrLoadModule("/src/components/member/MemberUI.jsx");
  const cls = { id: "333333333333333333333333", name: "Yoga buổi sáng", sport: "Yoga", coach: { name: "Lan" }, schedule: "No sessions scheduled", enrolledCount: 0 };
  const reg = Object.freeze({ id: "aaaaaaaaaaaaaaaaaaaaaaaa", classId: cls.id, status: "PENDING_PAYMENT", classItem: cls });
  const payment = Object.freeze({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", classRegistrationId: reg.id, amount: 100000, status: "FAILED" });
  const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component, props)));
  const history = render(RegistrationHistory, { registrations: [reg], payments: [payment] });
  assert.match(history, /Chờ thanh toán/); assert.match(history, /Thất bại/); assert.match(history, /Yoga buổi sáng/);
  assert.doesNotMatch(history, /aaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbb/);
  assert.equal(reg.status, "PENDING_PAYMENT"); assert.equal(payment.status, "FAILED");
  const session = render(SessionCard, { session: { classItem: cls, coach: cls.coach, startTime: "18:00", endTime: "19:00", status: "SCHEDULED" }, preview: true });
  assert.match(session, /Chưa xác nhận chỗ học/); assert.match(session, /Đã lên lịch/); assert.doesNotMatch(session, /Đã xác nhận/);
  const catalog = render(ClassCard, { item: cls, canRegister: true });
  assert.match(catalog, /Chưa có buổi học được xếp lịch/); assert.match(catalog, />Đăng ký</);
  assert.doesNotMatch(catalog, /No sessions scheduled|disabled/);
 } finally { await server.close(); }
});
