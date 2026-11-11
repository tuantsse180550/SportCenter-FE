import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

test("Manager and Member use the same per-student tuition without class-type choices", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  const previousFetch = globalThis.fetch;
  let session;
  try {
    const { ClassFormModal } = await server.ssrLoadModule("/src/components/manager/ClassFormModal.jsx");
    const { ClassCard } = await server.ssrLoadModule("/src/components/member/MemberUI.jsx");
    const { RegistrationPaymentSummary } = await server.ssrLoadModule("/src/components/common/RegistrationPaymentModal.jsx");
    const course = { id: "course", name: "Yoga cơ bản", subjectId: "yoga", price: 500000 };
    const options = { subjects: [{ id: "yoga", name: "Yoga" }], courses: [course],
      coaches: [{ id: "coach", name: "Coach", subjectIds: ["yoga"] }], classes: [] };
    const initial = { id: "class", name: "Yoga buổi sáng", subjectId: "yoga", courseId: course.id, coachId: "coach", classType: "PERSONAL" };

    await t.test("manager sees one tuition and no class-type selector even for legacy classes", () => {
      const html = renderToStaticMarkup(createElement(ClassFormModal, { title: "Sửa lớp", options, initial }));
      assert.doesNotMatch(html, /Hình thức học|PERSONAL|GROUP|chỉ nhận một hội viên/);
      assert.match(html, /500[.]000/);
    });
    await t.test("class create/update API excludes obsolete classType and client tuition", async () => {
      const calls = [];
      globalThis.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        calls.push({ url, method: options.method, body });
        return new Response(JSON.stringify({ success: true, data: { id: "personal", ...body } }));
      };
      session = (await server.ssrLoadModule("/src/api/session.js")).session;
      session.setToken("class-type-test-only");
      const { classService } = await server.ssrLoadModule("/src/services/api/classApi.js");
      const created = await classService.createClass({ ...initial, price: 1 });
      const updated = await classService.updateClass(created.id, { ...initial, classType: "GROUP", amount: 1 });
      assert.equal(calls[0].body.classType, undefined);
      assert.equal(calls[1].body.classType, undefined);
      assert.equal(created.classType, undefined); assert.equal(updated.classType, undefined);
      calls.forEach(call => { assert.equal(call.body.price, undefined); assert.equal(call.body.amount, undefined); });
    });
    await t.test("member cards show the common fee regardless of legacy class-type flags", () => {
      for (const classType of ["GROUP", "PERSONAL"]) {
        const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ClassCard, {
          item: { id: classType, name: "Yoga buổi sáng", course, classType }, registrationKnown: false,
        })));
        assert.match(html, /Yoga cơ bản/); assert.match(html, /500[.]000/);
        assert.doesNotMatch(html, /NaN|Hình thức|Cá nhân|PERSONAL|GROUP/);
      }
    });
    await t.test("checkout summary identifies the selected course/class and preserves an old snapshot", () => {
      const registration = { id: "registration", classItem: { name: "Yoga buổi sáng", classType: "PERSONAL", course } };
      const html = renderToStaticMarkup(createElement(RegistrationPaymentSummary, {
        registration, coursePrice: 1400000, customerView: true,
      }));
      assert.match(html, /Yoga cơ bản/); assert.match(html, /Yoga buổi sáng/);
      assert.doesNotMatch(html, /Hình thức|Cá nhân/);
      assert.match(html, /1[.]400[.]000/); assert.doesNotMatch(html, /1[.]500[.]000|500[.]000/);
    });
  } finally {
    globalThis.fetch = previousFetch;
    session?.clear();
    await server.close();
  }
});
