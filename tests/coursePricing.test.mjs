import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("Manager course form and API use one tuition per student", async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  const previousFetch = globalThis.fetch;
  let session;
  try {
    const { CourseForm } = await server.ssrLoadModule("/src/components/manager/CourseForm.jsx");
    const props = { subjects: [{ id: "subject", name: "Yoga" }], onCancel() {} };
    await t.test("editing shows one configured price and preserves zero", () => {
      const html = renderToStaticMarkup(createElement(CourseForm, { ...props,
        initial: { id: "course", subjectId: "subject", name: "Yoga", price: 0 } }));
      assert.match(html, /Học phí mỗi học viên \(VNĐ\)/);
      assert.match(html, /type="number"[^>]*value="0"/);
      assert.equal((html.match(/type="number"/g) || []).length, 1);
      assert.doesNotMatch(html, /Học phí nhóm|Học phí cá nhân/);
      assert.doesNotMatch(html, /NaN/);
    });
    await t.test("missing tuition stays blank and legacy group tuition remains readable", () => {
      for (const initial of [{}, { price: null }, { pricing: { personal: 1250000 } }]) {
        const html = renderToStaticMarkup(createElement(CourseForm, { ...props, initial }));
        assert.equal((html.match(/type="number"[^>]*value=""/g) || []).length, 1);
        assert.doesNotMatch(html, /NaN/);
      }
      const legacy = renderToStaticMarkup(createElement(CourseForm, { ...props, initial: { pricing: { group: 500000, personal: 1250000 } } }));
      assert.match(legacy, /type="number"[^>]*value="500000"/);
      assert.doesNotMatch(legacy, /1250000/);
    });
    await t.test("create/update send a single numeric price", async () => {
      const calls = [];
      globalThis.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        calls.push({ url, method: options.method, body });
        return new Response(JSON.stringify({ success: true, data: { id: "course", ...body } }));
      };
      session = (await server.ssrLoadModule("/src/api/session.js")).session;
      session.setToken("course-pricing-test-only");
      const { courseApi } = await server.ssrLoadModule("/src/services/api/resources.js");
      const input = { subjectId: "subject", name: "Yoga", description: "Test",
        price: 500000, status: "ACTIVE", pricing: { group: 1, personal: 999 } };
      const created = await courseApi.create(input);
      const updated = await courseApi.update(created.id, { ...input, price: 0 });
      assert.deepEqual(calls.map(call => call.method), ["POST", "PUT"]);
      assert.equal(calls[0].body.price, 500000);
      assert.equal(calls[1].body.price, 0);
      calls.forEach(call => assert.equal(Object.hasOwn(call.body, "pricing"), false));
      assert.equal(updated.price, 0);
    });
  } finally {
    globalThis.fetch = previousFetch;
    session?.clear();
    await server.close();
  }
});
