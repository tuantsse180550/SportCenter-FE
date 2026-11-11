import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";

test("Member tuition is per student and preserves the registration snapshot", async (t) => {
  const fixture = createBackendFixture();
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fixture.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { authService, classService, paymentService } = await server.ssrLoadModule("/src/services/index.js");
    await authService.login({ email: "member@test.invalid", password: "test-password" });
    const cls = fixture.state.classes[0];
    cls.courseId.price = 500000;
    const { MemberClassRegistrationPanel } = await server.ssrLoadModule("/src/pages/member/MemberClassDetailPage.jsx");
    const render = (coursePrice, registration) => renderToStaticMarkup(createElement(MemberClassRegistrationPanel, {
      classId: fixture.ids.class, memberId: fixture.ids.member, coursePrice, registration,
      confirmation: { loading: false, error: null, data: [] }, onRegister() {}, onProfile() {}, onSchedule() {},
    }));

    await t.test("old class-type flags do not change the per-student tuition", async () => {
      for (const [classType, expected] of [["GROUP", 500000], ["PERSONAL", 500000], [undefined, 500000]]) {
        cls.classType = classType;
        const detail = await classService.getMemberClassDetail(fixture.ids.class);
        assert.equal(detail.coursePrice, expected);
        const html = render(detail.coursePrice);
        assert.match(html, new RegExp(expected === 500000 ? "500[.]000" : "1[.]500[.]000"));
        assert.doesNotMatch(html, /disabled=""|NaN|Chưa có học phí/);
      }
    });
    await t.test("missing or invalid tuition disables initial signup and re-registration", async () => {
      for (const price of [undefined, null, NaN, Infinity, -1, "500000"]) {
        const html = render(price);
        assert.match(html, /Chưa có học phí từ hệ thống/);
        assert.match(html, /<button[^>]*disabled=""[^>]*>Yêu cầu đăng ký<\/button>/);
        assert.doesNotMatch(html, /NaN|Infinity/);
        assert.match(render(price, { status: "CANCELLED" }), /<button[^>]*disabled=""[^>]*>Đăng ký lại<\/button>/);
      }
      cls.classType = "PERSONAL";
      delete cls.courseId.price;
      cls.courseId.pricing = { personal: 1500000 };
      assert.equal((await classService.getMemberClassDetail(fixture.ids.class)).coursePrice, undefined);
      cls.courseId.price = 0;
      assert.equal((await classService.getMemberClassDetail(fixture.ids.class)).coursePrice, 0);
      assert.match(render(0), /học viên: 0/);
    });
    await t.test("payment uses agreed snapshot even after course price changes or course listing fails", async () => {
      fixture.state.registrations.push({ _id: "registration", classId: fixture.ids.class,
        memberId: fixture.ids.member, status: "PENDING_PAYMENT", priceSnapshot: 450000 });
      cls.courseId.pricing = { group: 750000, personal: 2000000 };
      fixture.options.errors["/api/courses"] = 500;
      const before = fixture.calls.length;
      const result = await paymentService.getRegistrationPayment("registration");
      assert.equal(result.coursePrice, 450000);
      assert.equal(result.registration.status, "PENDING_PAYMENT");
      assert.equal(fixture.calls.slice(before).some(call => call.route === "/api/courses"), false);
      delete fixture.state.registrations[0].priceSnapshot;
      assert.equal((await paymentService.getRegistrationPayment("registration")).coursePrice, undefined);
    });
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});
